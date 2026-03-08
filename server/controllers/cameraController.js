const CameraFeed  = require('../models/CameraFeed');
const IoTModule   = require('../models/IoTModule');
const Delivery    = require('../models/Delivery');
const mqttModule  = require('../mqtt');
const camModule   = require('../camera');

// ─────────────────────────────────────────────
//  GET /api/camera/:deliveryId
//  Latest camera feed record for a delivery
// ─────────────────────────────────────────────
const getCameraFeed = async (req, res) => {
  try {
    const feed = await CameraFeed.findOne({ CDelID: req.params.deliveryId })
      .sort({ LastCapture: -1 })
      .populate('CIMID', 'IMID CamIP IsActive');
    if (!feed) return res.status(404).json({ message: 'No camera feed found.' });
    res.json(feed);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  GET /api/camera/:deliveryId/tamper
//  All tamper events for a delivery
// ─────────────────────────────────────────────
const getTamperEvents = async (req, res) => {
  try {
    const events = await CameraFeed.find({
      CDelID: req.params.deliveryId,
      TamperDetection: true,
    });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  POST /api/camera/command
//  Send cam_on / cam_off / snapshot / reboot to ESP32-CAM via MQTT
//  Body: { imid: "IM-001", command: "cam_on" }
// ─────────────────────────────────────────────
const sendCommand = async (req, res) => {
  const { imid, command } = req.body;
  const valid = ['cam_on', 'cam_off', 'snapshot', 'reboot'];

  if (!imid || !command) {
    return res.status(400).json({ message: 'imid and command are required.' });
  }
  if (!valid.includes(command)) {
    return res.status(400).json({ message: `Unknown command. Valid: ${valid.join(', ')}` });
  }

  try {
    // Find the module to get the manufacturer ID for the topic
    const module = await IoTModule.findOne({ IMID: imid });
    if (!module) return res.status(404).json({ message: 'IoT module not found.' });

    // Get active delivery to find manuId for MQTT topic
    const delivery = await Delivery.findOne({
      DelIMID: module._id,
      Status:  { $ne: 'Complete' },
    }).populate('DelManuID', 'ManuID');

    if (!delivery) return res.status(404).json({ message: 'No active delivery for this module.' });

    const manuId = delivery.DelManuID?.ManuID || 'MANU-00001';
    const topic  = `coldwire/${manuId}/${imid}/camera_control`;

    // Publish MQTT command
    mqttModule.publishCommand(topic, command);

    // Handle recording state on backend
    camModule.handleDashboardCommand(imid, command);

    res.json({ sent: true, topic, command });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  GET /api/camera/:imid/recordings
//  List recordings from Cloudinary for a module
// ─────────────────────────────────────────────
const getRecordings = async (req, res) => {
  try {
    const [recordings, snapshots] = await Promise.all([
      camModule.listRecordings(req.params.imid),
      camModule.listSnapshots(req.params.imid),
    ]);
    res.json({ recordings, snapshots });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  DELETE /api/camera/recording/:publicId(*)
//  Delete a recording or snapshot from Cloudinary
// ─────────────────────────────────────────────
const deleteRecording = async (req, res) => {
  try {
    const ok = await camModule.deleteMedia(req.params[0] || req.params.publicId);
    if (!ok) return res.status(404).json({ message: 'Not found or already deleted.' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  PATCH /api/camera/:imid/ip
//  Update CamIP on IoTModule (admin only)
//  Body: { ip: "192.168.1.16" }
// ─────────────────────────────────────────────
const updateCamIP = async (req, res) => {
  try {
    const module = await IoTModule.findOne({ IMID: req.params.imid });
    if (!module) return res.status(404).json({ message: 'IoT module not found.' });

    module.CamIP = req.body.ip;
    await module.save();

    // Restart stream ingestion with new IP
    camModule.ingestStream(module.IMID, `http://${module.CamIP}/stream`);

    res.json({ updated: true, CamIP: module.CamIP });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getCameraFeed,
  getTamperEvents,
  sendCommand,
  getRecordings,
  deleteRecording,
  updateCamIP,
};