import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, EmptyState, LoadingScreen } from '../../components/ui/UI';
import styles from './Admin.module.css';
import cam from './CameraFeed.module.css';

const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── helpers ────────────────────────────────────────────────
function fmtSize(b) {
  if (!b) return '';
  return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB';
}
function fmtDur(s) {
  if (!s) return '';
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function CameraFeed() {
  const { api, token } = useAuth();

  // deliveries & modules
  const [deliveries, setDeliveries]   = useState([]);
  const [selectedDel, setSelectedDel] = useState(null);
  const [loading, setLoading]         = useState(true);

  // live feed
  const [frameSrc, setFrameSrc]       = useState(null);
  const [camStatus, setCamStatus]     = useState({}); // { [imid]: { state, recording } }

  // recording state per imid
  const [recState, setRecState]       = useState({}); // { [imid]: 'idle'|'recording'|'uploading' }

  // media
  const [recordings, setRecordings]   = useState([]);
  const [snapshots, setSnapshots]     = useState([]);
  const [mediaTab, setMediaTab]       = useState('recordings');
  const [mediaLoading, setMediaLoading] = useState(false);

  // modal
  const [modal, setModal]             = useState(null); // { type: 'video'|'image', url }

  // events log
  const [events, setEvents]           = useState([]);

  const socketRef = useRef(null);

  // ── Socket.io ─────────────────────────────────────────────
  useEffect(() => {
    const socket = io(VITE_API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('cam_frame', ({ imid, data }) => {
      if (selectedDel?.imid === imid) {
        setFrameSrc('data:image/jpeg;base64,' + data);
      }
    });

    socket.on('cam_status', ({ imid, state, recording }) => {
      setCamStatus(prev => ({ ...prev, [imid]: { state, recording } }));
      if (recording) {
        setRecState(prev => ({ ...prev, [imid]: 'recording' }));
      } else if (state === 'offline') {
        setRecState(prev => ({ ...prev, [imid]: 'idle' }));
      }
    });

    socket.on('cam_recording_started', ({ imid }) => {
      setRecState(prev => ({ ...prev, [imid]: 'recording' }));
      addEvent({ imid, event: 'recording_started', detail: 'Recording started' });
    });

    socket.on('cam_recording_stopped', ({ imid, duration }) => {
      setRecState(prev => ({ ...prev, [imid]: 'uploading' }));
      addEvent({ imid, event: 'recording_stopped', detail: `Recording stopped (${duration}s)` });
    });

    socket.on('cam_uploading', ({ imid }) => {
      setRecState(prev => ({ ...prev, [imid]: 'uploading' }));
    });

    socket.on('cam_recording_ready', rec => {
      setRecState(prev => ({ ...prev, [rec.imid]: 'idle' }));
      setRecordings(prev => [rec, ...prev]);
      addEvent({ imid: rec.imid, event: 'recording_saved', detail: `Saved (${fmtDur(rec.duration)})` });
    });

    socket.on('cam_snapshot_ready', snap => {
      setSnapshots(prev => [{
        ...snap,
        filename: snap.publicId.split('/').pop() + '.jpg',
      }, ...prev]);
      addEvent({ imid: snap.imid, event: 'snapshot_taken', detail: 'Snapshot saved to Cloudinary' });
    });

    socket.on('cam_upload_failed', ({ imid, error }) => {
      setRecState(prev => ({ ...prev, [imid]: 'idle' }));
      addEvent({ imid, event: 'upload_failed', detail: error });
    });

    socket.on('cam_event', evt => addEvent(evt));

    return () => socket.disconnect();
  }, [token, selectedDel?.imid]);

  function addEvent(evt) {
    setEvents(prev => [{ ...evt, ts: Date.now(), id: Math.random() }, ...prev].slice(0, 100));
  }

  // ── Load deliveries ───────────────────────────────────────
  useEffect(() => {
    api.get('/api/deliveries')
      .then(r => {
        const active = (r.data || []).filter(d => d.Status !== 'Complete');
        setDeliveries(active);
        if (active.length > 0) selectDelivery(active[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectDelivery = useCallback(async (del) => {
    // Get IoT module info for this delivery
    const imid = del.DelIMID?.IMID || null;
    setSelectedDel({ ...del, imid });
    setFrameSrc(null);
    if (imid) loadMedia(imid);
  }, []);

  const loadMedia = async (imid) => {
    setMediaLoading(true);
    try {
      const res = await api.get(`/api/camera/${imid}/recordings`);
      setRecordings(res.data.recordings || []);
      setSnapshots(res.data.snapshots || []);
    } catch {}
    setMediaLoading(false);
  };

  // ── Commands ──────────────────────────────────────────────
  const sendCommand = async (command) => {
    if (!selectedDel?.imid) return;
    try {
      await api.post('/api/camera/command', { imid: selectedDel.imid, command });
    } catch (err) {
      console.error('Command failed:', err.message);
    }
  };

  const handleDelete = async (publicId, type) => {
    if (!confirm(`Delete this ${type}?`)) return;
    await api.delete(`/api/camera/recording/${encodeURIComponent(publicId)}`);
    if (type === 'video') setRecordings(prev => prev.filter(r => r.publicId !== publicId));
    else setSnapshots(prev => prev.filter(s => s.publicId !== publicId));
  };

  // ── Derived state ─────────────────────────────────────────
  const imid       = selectedDel?.imid;
  const status     = imid ? (camStatus[imid]?.state || 'unknown') : 'unknown';
  const isRec      = recState[imid] === 'recording';
  const isUploading = recState[imid] === 'uploading';
  const isOffline  = status === 'offline';

  if (loading) return <LoadingScreen />;

  return (
    <div className={styles.page}>
      <PageHeader title="Camera Feed" subtitle="Live cargo monitoring & recording" />

      {deliveries.length === 0 ? (
        <EmptyState icon="◫" message="No active deliveries" />
      ) : (
        <div className={cam.root}>

          {/* ── Left column ─────────────────────────────── */}
          <div className={cam.leftCol}>

            {/* Delivery selector */}
            <div className={cam.selectorBar}>
              {deliveries.map(del => {
                const dImid = del.DelIMID?.IMID;
                const dStatus = dImid ? camStatus[dImid]?.state : null;
                return (
                  <button
                    key={del._id}
                    className={`${cam.selectorBtn} ${selectedDel?._id === del._id ? cam.selectorBtnActive : ''}`}
                    onClick={() => selectDelivery(del)}
                  >
                    <span className={cam.selectorTruck}>
                      {del.DelTruckID?.TruckID || del.DelID}
                    </span>
                    <span className={`${cam.selectorDot} ${
                      dStatus === 'recording' ? cam.dotRec :
                      dStatus === 'online'    ? cam.dotOnline :
                      dStatus === 'offline'   ? cam.dotOffline : cam.dotUnknown
                    }`} />
                  </button>
                );
              })}
            </div>

            {/* Feed card */}
            <div className={cam.feedCard}>
              <div className={cam.feedHeader}>
                <div className={cam.feedTitle}>
                  <span className={cam.feedTitleText}>
                    {selectedDel?.DelTruckID?.TruckID || selectedDel?.DelID || '—'}
                  </span>
                  <span className={cam.feedImid}>{imid || '—'}</span>
                </div>
                <div className={cam.feedBadges}>
                  {isRec && (
                    <span className={cam.recBadge}>
                      <span className={cam.recDot} /> REC
                    </span>
                  )}
                  {isUploading && (
                    <span className={cam.uploadBadge}>Uploading…</span>
                  )}
                  <span className={`${cam.statusBadge} ${
                    status === 'recording' ? cam.statusRec :
                    status === 'online'    ? cam.statusOnline :
                    status === 'offline'   ? cam.statusOffline : cam.statusUnknown
                  }`}>
                    {status === 'unknown' ? 'Waiting' : status}
                  </span>
                </div>
              </div>

              {/* Live feed */}
              <div className={cam.feedWrap}>
                {frameSrc ? (
                  <img src={frameSrc} className={cam.feedImg} alt="Live feed" />
                ) : (
                  <div className={cam.feedPlaceholder}>
                    <span className={cam.feedPlaceholderIcon}>◫</span>
                    <span className={cam.feedPlaceholderText}>
                      {isOffline ? 'Camera offline' : 'Waiting for stream…'}
                    </span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className={cam.controls}>
                <button
                  className={`${cam.ctrlBtn} ${cam.ctrlBtnOn}`}
                  onClick={() => sendCommand('cam_on')}
                  disabled={isRec || isOffline || !imid}
                >
                  ▶ Camera On
                </button>
                <button
                  className={`${cam.ctrlBtn} ${cam.ctrlBtnOff}`}
                  onClick={() => sendCommand('cam_off')}
                  disabled={!isRec || !imid}
                >
                  ■ Camera Off
                </button>
                <button
                  className={`${cam.ctrlBtn} ${cam.ctrlBtnSnap}`}
                  onClick={() => sendCommand('snapshot')}
                  disabled={isOffline || !imid}
                >
                  Snapshot
                </button>
                <button
                  className={`${cam.ctrlBtn} ${cam.ctrlBtnReboot}`}
                  onClick={() => sendCommand('reboot')}
                  disabled={!imid}
                >
                  ↺ Reboot
                </button>
              </div>

              {/* Delivery info strip */}
              <div className={cam.deliveryStrip}>
                <div className={cam.stripItem}>
                  <span className={cam.stripLabel}>Destination</span>
                  <span className={cam.stripValue}>{selectedDel?.DelRetID?.RetName || '—'}</span>
                </div>
                <div className={cam.stripItem}>
                  <span className={cam.stripLabel}>Storage</span>
                  <span className={cam.stripValue}>{selectedDel?.StorageType || '—'}</span>
                </div>
                <div className={cam.stripItem}>
                  <span className={cam.stripLabel}>Status</span>
                  <span className={cam.stripValue}>{selectedDel?.Status || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right column ─────────────────────────────── */}
          <div className={cam.rightCol}>

            {/* Event log */}
            <div className={cam.eventsCard}>
              <div className={cam.eventsTitle}>Event Log</div>
              <div className={cam.eventsList}>
                {events.length === 0 ? (
                  <div className={cam.eventsEmpty}>No events yet</div>
                ) : events.map(evt => (
                  <div key={evt.id} className={`${cam.eventItem} ${cam[`evt_${evt.event}`] || ''}`}>
                    <span className={cam.eventIcon}>
                      {evt.event === 'recording_started' ? '●' :
                       evt.event === 'recording_stopped' ? '■' :
                       evt.event === 'recording_saved'   ? '✓' :
                       evt.event === 'snapshot_taken'    ? '◎' :
                       evt.event === 'upload_failed'     ? '!' : '·'}
                    </span>
                    <div className={cam.eventBody}>
                      <span className={cam.eventName}>
                        {evt.event.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                      {evt.detail && <span className={cam.eventDetail}>{evt.detail}</span>}
                      <span className={cam.eventMeta}>{evt.imid} · {fmtTime(evt.ts)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Media tabs */}
            <div className={cam.mediaCard}>
              <div className={cam.mediaTabs}>
                <button
                  className={`${cam.mediaTab} ${mediaTab === 'recordings' ? cam.mediaTabActive : ''}`}
                  onClick={() => setMediaTab('recordings')}
                >
                  Recordings {recordings.length > 0 && <span className={cam.mediaCount}>{recordings.length}</span>}
                </button>
                <button
                  className={`${cam.mediaTab} ${mediaTab === 'snapshots' ? cam.mediaTabActive : ''}`}
                  onClick={() => setMediaTab('snapshots')}
                >
                  Snapshots {snapshots.length > 0 && <span className={cam.mediaCount}>{snapshots.length}</span>}
                </button>
              </div>

              <div className={cam.mediaGrid}>
                {mediaLoading ? (
                  <div className={cam.mediaEmpty}>Loading…</div>
                ) : (mediaTab === 'recordings' ? recordings : snapshots).length === 0 ? (
                  <div className={cam.mediaEmpty}>
                    {mediaTab === 'recordings' ? 'No recordings yet — press Camera On' : 'No snapshots yet'}
                  </div>
                ) : (mediaTab === 'recordings' ? recordings : snapshots).map(item => (
                  <div key={item.publicId} className={cam.mediaItem}>
                    {mediaTab === 'recordings' ? (
                      <div className={cam.mediaThumbVideo} onClick={() => setModal({ type: 'video', url: item.url })}>
                        ▶
                      </div>
                    ) : (
                      <img
                        src={item.url.replace('/upload/', '/upload/w_400,h_200,c_fill/')}
                        className={cam.mediaThumb}
                        alt="snapshot"
                        onClick={() => setModal({ type: 'image', url: item.url })}
                        loading="lazy"
                      />
                    )}
                    <div className={cam.mediaInfo}>
                      <div className={cam.mediaFilename}>{item.filename}</div>
                      <div className={cam.mediaMeta}>
                        {fmtSize(item.size)}
                        {item.duration ? ` · ${fmtDur(item.duration)}` : ''}
                        {item.created ? ` · ${new Date(item.created).toLocaleDateString('en-MY')}` : ''}
                      </div>
                      <div className={cam.mediaBtns}>
                        <button
                          className={cam.mediaBtnPlay}
                          onClick={() => setModal({ type: mediaTab === 'recordings' ? 'video' : 'image', url: item.url })}
                        >
                          {mediaTab === 'recordings' ? '▶ Play' : 'View'}
                        </button>
                        <a className={cam.mediaBtnLink} href={item.url} target="_blank" rel="noreferrer">↗</a>
                        <button
                          className={cam.mediaBtnDel}
                          onClick={() => handleDelete(item.publicId, mediaTab === 'recordings' ? 'video' : 'image')}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className={cam.modal} onClick={() => setModal(null)}>
          <button className={cam.modalClose} onClick={() => setModal(null)}>✕</button>
          <div onClick={e => e.stopPropagation()}>
            {modal.type === 'video' ? (
              <video src={modal.url} className={cam.modalMedia} controls autoPlay />
            ) : (
              <img src={modal.url} className={cam.modalMedia} alt="snapshot" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}