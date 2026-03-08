'use strict';

// ============================================================
//  ColdWire — Camera Module
//  Handles per-IoT-module MJPEG stream ingestion,
//  recording state, and Cloudinary upload.
//  Integrated with ColdWire MQTT topics and MongoDB.
// ============================================================

const fs         = require('fs');
const path       = require('path');
const fetch      = require('node-fetch');
const cloudinary = require('cloudinary').v2;
const IoTModule  = require('../models/IoTModule');
const CameraFeed = require('../models/CameraFeed');
const Delivery   = require('../models/Delivery');
const generateId = require('../utils/generateId');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const TMP_DIR = path.join(__dirname, '../tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// Per-module recording state  { [imid]: { writeStream, filePath, startTime } }
const recState = {};

// Socket.io instance (set on init)
let _io = null;

// ─────────────────────────────────────────────
//  INIT — called from server.js after io is created
//  Starts stream ingestion for all active IoT modules
// ─────────────────────────────────────────────
async function init(io) {
  _io = io;

  // Dashboard → camera commands via Socket.io
  io.on('connection', socket => {
    socket.on('cam_command', ({ imid, command }) => {
      // Re-exported so MQTT module can call sendCommand too
      handleDashboardCommand(imid, command);
    });
  });

  // Start streams for all active modules that have a CamIP
  try {
    const modules = await IoTModule.find({ IsActive: true, CamIP: { $exists: true, $ne: '' } });
    for (const mod of modules) {
      ingestStream(mod.IMID, `http://${mod.CamIP}/stream`);
    }
    console.log(`[CAM] Ingesting streams for ${modules.length} active module(s)`);
  } catch (err) {
    console.error('[CAM] Failed to load modules on init:', err.message);
  }
}

// ─────────────────────────────────────────────
//  STREAM INGEST
// ─────────────────────────────────────────────
async function ingestStream(imid, url) {
  console.log(`[CAM:${imid}] Connecting → ${url}`);
  try {
    const res = await fetch(url, { timeout: 12000 });
    let buf = Buffer.alloc(0);

    res.body.on('data', chunk => {
      buf = Buffer.concat([buf, chunk]);
      let start, end;
      while (
        (start = buf.indexOf(Buffer.from([0xff, 0xd8]))) !== -1 &&
        (end   = buf.indexOf(Buffer.from([0xff, 0xd9]), start)) !== -1
      ) {
        const frame = buf.slice(start, end + 2);
        buf = buf.slice(end + 2);

        // Write to recording file if active
        const r = recState[imid];
        if (r?.writeStream) r.writeStream.write(frame);

        // Push live frame to dashboard via Socket.io
        if (_io) _io.emit('cam_frame', { imid, data: frame.toString('base64') });
      }
    });

    const retry = (label, err) => {
      if (err) console.error(`[CAM:${imid}] ${label}:`, err.message);
      else     console.log(`[CAM:${imid}] ${label} — retrying in 5s`);
      setTimeout(() => ingestStream(imid, url), 5000);
    };

    res.body.on('error', err => retry('stream error', err));
    res.body.on('end',   ()  => retry('stream ended'));

  } catch (err) {
    console.error(`[CAM:${imid}] Cannot reach ESP32:`, err.message);
    setTimeout(() => ingestStream(imid, url), 5000);
  }
}

// ─────────────────────────────────────────────
//  RECORDING
// ─────────────────────────────────────────────
function startRecording(imid) {
  if (!recState[imid]) recState[imid] = {};
  const r = recState[imid];
  if (r.writeStream) return; // already recording

  const filename  = `${imid}_${Date.now()}.mjpeg`;
  r.filePath      = path.join(TMP_DIR, filename);
  r.writeStream   = fs.createWriteStream(r.filePath);
  r.startTime     = Date.now();

  console.log(`[CAM:${imid}] Recording started → ${filename}`);
  if (_io) _io.emit('cam_recording_started', { imid, ts: Date.now() });
}

function stopRecording(imid) {
  const r = recState[imid];
  if (!r?.writeStream) return;

  const filePath = r.filePath;
  const duration = Math.round((Date.now() - r.startTime) / 1000);
  r.writeStream.end(() => {
    r.writeStream = null;
    r.filePath    = null;
    r.startTime   = null;
    console.log(`[CAM:${imid}] Recording stopped (${duration}s) — uploading`);
    if (_io) _io.emit('cam_recording_stopped', { imid, duration, ts: Date.now() });
    uploadRecording(imid, filePath, duration);
  });
}

// ─────────────────────────────────────────────
//  CLOUDINARY UPLOADS
// ─────────────────────────────────────────────
function uploadRecording(imid, mjpegPath, duration) {
  const publicId = path.basename(mjpegPath, '.mjpeg');
  if (_io) _io.emit('cam_uploading', { imid, ts: Date.now() });

  const uploadStream = cloudinary.uploader.upload_stream(
    {
      resource_type: 'video',
      folder:        `coldwire/${imid}/recordings`,
      public_id:     publicId,
      eager:         [{ format: 'mp4', quality: 'auto' }],
      eager_async:   false,
    },
    async (error, result) => {
      try { fs.unlinkSync(mjpegPath); } catch {}

      if (error) {
        console.error(`[CAM:${imid}] Upload failed:`, error.message);
        if (_io) _io.emit('cam_upload_failed', { imid, error: error.message });
        return;
      }

      const mp4Url = result.eager?.[0]?.secure_url || result.secure_url;
      console.log(`[CAM:${imid}] Recording saved → ${mp4Url}`);

      // Update CameraFeed record in MongoDB
      await updateCameraFeedRecord(imid, { CamFeedURL: mp4Url, LastCapture: new Date() });

      if (_io) _io.emit('cam_recording_ready', {
        imid,
        url:      mp4Url,
        publicId: result.public_id,
        duration,
        filename: publicId + '.mp4',
        ts:       Date.now(),
      });
    }
  );

  fs.createReadStream(mjpegPath).pipe(uploadStream);
}

function uploadSnapshot(imid, imageBuffer) {
  const publicId = `snap_${Date.now()}`;
  const uploadStream = cloudinary.uploader.upload_stream(
    {
      resource_type: 'image',
      folder:        `coldwire/${imid}/snapshots`,
      public_id:     publicId,
    },
    async (error, result) => {
      if (error) {
        console.error(`[CAM:${imid}] Snapshot failed:`, error.message);
        return;
      }
      console.log(`[CAM:${imid}] Snapshot saved → ${result.secure_url}`);

      // Update LastCapture on CameraFeed record
      await updateCameraFeedRecord(imid, { LastCapture: new Date() });

      if (_io) _io.emit('cam_snapshot_ready', {
        imid,
        url:      result.secure_url,
        publicId: result.public_id,
        ts:       Date.now(),
      });
    }
  );
  uploadStream.end(imageBuffer);
}

// ─────────────────────────────────────────────
//  MONGODB HELPER — upsert CameraFeed for active delivery
// ─────────────────────────────────────────────
async function updateCameraFeedRecord(imid, fields) {
  try {
    const module   = await IoTModule.findOne({ IMID: imid });
    if (!module) return;

    const delivery = await Delivery.findOne({
      DelIMID:  module._id,
      Status:   { $ne: 'Complete' },
    });
    if (!delivery) return;

    let feed = await CameraFeed.findOne({ CIMID: module._id, CDelID: delivery._id });
    if (!feed) {
      const CLogID = await generateId('CameraFeed', 'CLOG');
      feed = new CameraFeed({
        CLogID,
        CDelID: delivery._id,
        CIMID:  module._id,
        ...fields,
      });
    } else {
      Object.assign(feed, fields);
    }
    await feed.save();
  } catch (err) {
    console.error('[CAM] updateCameraFeedRecord error:', err.message);
  }
}

// ─────────────────────────────────────────────
//  DASHBOARD COMMAND HANDLER
//  Called by Socket.io listener and cameraController
// ─────────────────────────────────────────────
function handleDashboardCommand(imid, command) {
  // The actual MQTT publish is done by the MQTT module
  // This handles recording state on the backend
  if (command === 'cam_on')  startRecording(imid);
  if (command === 'cam_off') stopRecording(imid);
}

// ─────────────────────────────────────────────
//  MQTT INTEGRATION HOOKS
//  Called from mqtt/index.js on camera MQTT messages
// ─────────────────────────────────────────────
function onCameraEvent(imid, data) {
  if (data.event === 'recording_started') startRecording(imid);
  if (data.event === 'recording_stopped') stopRecording(imid);

  // Forward event to dashboard
  if (_io) _io.emit('cam_event', { imid, ...data, ts: Date.now() });
}

function onCameraSnapshot(imid, payload) {
  uploadSnapshot(imid, payload);
}

function onCameraStatus(imid, data) {
  if (data.state === 'offline') stopRecording(imid);
  if (_io) _io.emit('cam_status', { imid, ...data });
}

// ─────────────────────────────────────────────
//  CLOUDINARY LIST HELPERS (used by cameraController)
// ─────────────────────────────────────────────
async function listRecordings(imid) {
  const result = await cloudinary.api.resources({
    resource_type: 'video',
    type:          'upload',
    prefix:        `coldwire/${imid}/recordings`,
    max_results:   100,
  });
  return result.resources.map(r => ({
    publicId: r.public_id,
    url:      r.secure_url,
    filename: r.public_id.split('/').pop() + '.mp4',
    size:     r.bytes,
    created:  r.created_at,
    duration: r.duration,
  }));
}

async function listSnapshots(imid) {
  const result = await cloudinary.api.resources({
    resource_type: 'image',
    type:          'upload',
    prefix:        `coldwire/${imid}/snapshots`,
    max_results:   100,
  });
  return result.resources.map(r => ({
    publicId: r.public_id,
    url:      r.secure_url,
    filename: r.public_id.split('/').pop() + '.jpg',
    size:     r.bytes,
    created:  r.created_at,
  }));
}

async function deleteMedia(publicId) {
  let result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
  if (result.result !== 'ok') {
    result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  }
  return result.result === 'ok';
}

module.exports = {
  init,
  ingestStream,
  startRecording,
  stopRecording,
  handleDashboardCommand,
  onCameraEvent,
  onCameraSnapshot,
  onCameraStatus,
  listRecordings,
  listSnapshots,
  deleteMedia,
};