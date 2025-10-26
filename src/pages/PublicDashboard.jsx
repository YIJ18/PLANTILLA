import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { usePublicDisplay } from '@/contexts/PublicDisplayContext';
import Header from '@/components/Header';
import FlightSelectorPublic from '@/components/FlightSelectorPublic';
import StatusPanel from '@/components/StatusPanel';
import ChartsGrid from '@/components/ChartsGrid';
import MapSection from '@/components/MapSection';
import GyroscopeViewer from '@/components/GyroscopeViewer';
import MissionControl from '@/components/MissionControl';
import io from 'socket.io-client';
import { loadFlightData, getSavedFlights } from '@/lib/dbUnified';
import { calculateSpeedsAndDistance } from '@/utils/calculations';

// PublicDashboard: single, clean implementation.
export default function PublicDashboard() {
  const [currentFlight, setCurrentFlight] = useState(null);
  const [flightData, setFlightData] = useState(null);
  const [savedFlights, setSavedFlights] = useState([]);
  const [modelUrl, setModelUrl] = useState('/cansat.obj');
  const [missionData, setMissionData] = useState({ flightTime: 0, verticalSpeed: 0, horizontalSpeed: 0, distance: 0, events: [], checklist: { transmission: false, sensors: false, gps: false, recording: false } });
  const [canSatStatus, setCanSatStatus] = useState({ isActive: false, battery: 100, lastUpdate: null, walkieChannel: 0 });

  const toastHook = useToast();
  const toast = toastHook?.toast || (() => {});

  const {
    publicDisplayState,
    getDisplayMode,
    getCurrentFlight,
    isLiveMode: isPublicLiveMode,
    getLiveData,
    getLiveUpdateCount,
    startPublicLive,
    setPublicFlight,
    updateLiveData,
  } = usePublicDisplay();

  const socketRef = useRef(null);
  const pollRef = useRef({ intervalId: null, currentFlightId: null });
  const [isLiveLocal, setIsLiveLocal] = useState(false);
  const lastTelemetryTsRef = useRef(null);

  // Normalize incoming telemetry rows into array-shaped fields the UI expects
  const transformTelemetryData = (rows) => {
    const base = { timestamps: [], temperature: [], humidity: [], altitude: [], pressure: [], walkieChannel: [], accelerometer: [], gyroscope: [], coordinates: [] };
    if (!Array.isArray(rows) || rows.length === 0) return base;
    return rows.reduce((acc, r) => {
      const tsVal = r.timestamp ?? r.ts ?? r.time ?? null;
      let ts = Date.now();
      if (typeof tsVal === 'number') ts = tsVal;
      else if (typeof tsVal === 'string') {
        const p = Date.parse(tsVal);
        if (!Number.isNaN(p)) ts = p;
      }
      acc.timestamps.push(ts);
      acc.temperature.push(r.temperature ?? r.temp ?? null);
      acc.humidity.push(r.humidity ?? r.hum ?? null);
      acc.altitude.push(r.altitude ?? r.alt ?? null);
      acc.pressure.push(r.pressure ?? r.pres ?? null);
      acc.walkieChannel.push(r.walkie_channel ?? r.walkieChannel ?? 0);
      acc.accelerometer.push({ x: r.acc_x ?? r.accX ?? null, y: r.acc_y ?? r.accY ?? null, z: r.acc_z ?? r.accZ ?? null });
      acc.gyroscope.push({ x: r.gyro_x ?? r.gyroX ?? null, y: r.gyro_y ?? r.gyroY ?? null, z: r.gyro_z ?? r.gyroZ ?? null });
      acc.coordinates.push({ lat: r.lat ?? r.latitude ?? null, lng: r.lng ?? r.longitude ?? r.long ?? null });
      return acc;
    }, base);
  };

  const mergeTelemetryPoint = useCallback((point) => {
    if (!point) return;
    try {
      const t = transformTelemetryData([point]);
      setFlightData(prev => {
        const cap = 2000;
        if (!prev) return t;
        const join = (k) => (Array.isArray(prev[k]) ? prev[k].concat(t[k]) : t[k]).slice(-cap);
        const updated = {
          timestamps: join('timestamps'),
          temperature: join('temperature'),
          humidity: join('humidity'),
          altitude: join('altitude'),
          pressure: join('pressure'),
          walkieChannel: join('walkieChannel'),
          accelerometer: join('accelerometer'),
          gyroscope: join('gyroscope'),
          coordinates: join('coordinates'),
        };
        // update mission metrics if possible
        try {
          if (Array.isArray(updated.coordinates) && updated.coordinates.length > 1 && Array.isArray(updated.timestamps) && updated.timestamps.length > 1) {
            const speeds = calculateSpeedsAndDistance({ coordinates: updated.coordinates, altitude: updated.altitude, timestamps: updated.timestamps });
            setMissionData(md => ({ ...md, verticalSpeed: speeds.verticalSpeed, horizontalSpeed: speeds.horizontalSpeed, distance: speeds.distance }));
          }
        } catch (e) {
          // non-fatal
        }
        return updated;
      });
      // Basic status update
      setCanSatStatus(prev => ({ ...prev, isActive: true, lastUpdate: new Date().toLocaleTimeString() }));
      // Update mission timing, checklist and more detailed status using point timestamp
      try {
        const ts = (t.timestamps && t.timestamps[0]) ? Number(t.timestamps[0]) : Date.now();
        setMissionData(md => {
          const last = lastTelemetryTsRef.current;
          let extra = 0;
          if (last && ts > last) extra = Math.max(0, (ts - last) / 1000);
          lastTelemetryTsRef.current = ts;
          return {
            ...md,
            flightTime: (md.flightTime || 0) + extra,
            checklist: { ...(md.checklist || {}), transmission: true }
          };
        });
        setCanSatStatus(prev => ({ ...prev, walkieChannel: (point.walkie_channel ?? point.walkieChannel ?? prev.walkieChannel), battery: Math.max(0, (prev.battery || 100) - 0.02) }));
      } catch (e) {
        // non-fatal
      }
      if (typeof updateLiveData === 'function') updateLiveData(point);
    } catch (e) {
      console.warn('mergeTelemetryPoint error', e);
    }
  }, [updateLiveData]);

  const fetchLatestAndMerge = useCallback(async (flightId) => {
    if (!flightId) return;
    try {
      const resp = await fetch(`/api/telemetry/latest?flightId=${flightId}&limit=1`);
      if (!resp.ok) return;
      const rows = await resp.json();
      if (!Array.isArray(rows) || rows.length === 0) return;
      mergeTelemetryPoint(rows[0]);
    } catch (e) {
      // silent
    }
  }, [mergeTelemetryPoint]);

  // Socket + polling lifecycle
  useEffect(() => {
  // Connect to socket using a reliable backend origin in dev.
  // In some dev setups the page origin isn't the Vite dev server (e.g. served on :3000),
  // which makes websocket proxying unsuccessful. Prefer explicit backend URL in dev.
  const isLocalhost = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
  const base = (isLocalhost && process.env.NODE_ENV !== 'production') ? 'http://localhost:5000' : ((typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : 'http://localhost:5000');
  console.info('[PublicDashboard] connecting socket to', base);
  const socket = io(base, { path: '/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current = socket;

  const telemetryHandler = (d) => { try { console.debug('[PublicDashboard] telemetry-update received', d); mergeTelemetryPoint(d); } catch (e) { console.warn('[PublicDashboard] telemetry handler error', e); } };

    const handleStart = async (payload) => {
      if (!payload) return;
      if (payload.mode === 'live') {
        if (typeof startPublicLive === 'function') startPublicLive(payload.flightName || payload.flight || null, payload.data || null);
        let flightId = payload.flightId || null;
        if (!flightId) {
          try { const r = await fetch('/api/flights'); if (r.ok) { const fl = await r.json(); if (Array.isArray(fl) && fl.length) flightId = fl[0].id || null; } } catch (e) {}
        }
          if (!flightId) {
            console.info('[PublicDashboard] handleStart: no flightId in payload, will not join room');
            return;
          }

          // Ensure socket is connected and join the room with ack/retry handling
          const ensureJoin = () => new Promise((resolve) => {
            const tryJoin = () => {
              try {
                console.info('[PublicDashboard] emitting join-flight-room for', flightId, ' socket.connected=', socket.connected);
                socket.emit('join-flight-room', flightId);
              } catch (e) { console.warn('[PublicDashboard] emit join-flight-room failed', e); }
            };

            // Listen for server ack once
            const ackHandler = (ack) => {
              try { console.info('[PublicDashboard] joined-flight-room ack', ack); } catch (e) {}
              cleanup();
              resolve(true);
            };

            const cleanup = () => {
              try { socket.off('joined-flight-room', ackHandler); } catch (e) {}
              try { clearTimeout(retryTimer); } catch (e) {}
            };

            // If socket is not connected yet, wait for connect
            if (!socket.connected) {
              const onConnect = () => { tryJoin(); socket.off('connect', onConnect); };
              try { socket.on('connect', onConnect); } catch (e) { tryJoin(); }
            } else {
              tryJoin();
            }

            // attach ack handler
            try { socket.on('joined-flight-room', ackHandler); } catch (e) {}

            // Retry join after 1.5s if no ack
            const retryTimer = setTimeout(() => {
              try {
                console.warn('[PublicDashboard] No joined-flight-room ack received; retrying join for', flightId);
                tryJoin();
              } catch (e) {}
            }, 1500);
          });

          await ensureJoin();

          // Mark local live mode active to prefer socket streaming
          setIsLiveLocal(true);

          // Listen for telemetry updates (room-scoped emits will reach this socket once joined)
          try { socket.on('telemetry-update', telemetryHandler); } catch (e) { console.warn('Failed to attach telemetry handler', e); }

          // Stop any existing polling and also fetch latest DB row once to seed the UI
          if (pollRef.current.intervalId) clearInterval(pollRef.current.intervalId);
          pollRef.current.currentFlightId = flightId;
          fetchLatestAndMerge(flightId);
          pollRef.current.intervalId = setInterval(() => fetchLatestAndMerge(flightId), 1000);
      } else if (payload.mode === 'flight') {
        const id = payload.flightId || null; const name = payload.flightName || payload.flight || null;
        if (typeof setPublicFlight === 'function') setPublicFlight({ id, name });
        if (id) {
          try { socket.emit('join-flight-room', id); } catch (e) {}
          socket.on('telemetry-update', telemetryHandler);
          try { const d = await loadFlightData(name); if (d) setFlightData(d); } catch (e) {}
        }
      }
    };

    const handleStop = () => {
      if (pollRef.current.intervalId) { clearInterval(pollRef.current.intervalId); pollRef.current.intervalId = null; pollRef.current.currentFlightId = null; }
      try { socket.off('telemetry-update', telemetryHandler); } catch (e) {}
      if (typeof startPublicLive === 'function') startPublicLive(null, null);
    };

    socket.on('public-projection-start', handleStart);
    socket.on('public-projection-stop', handleStop);
  socket.on('connect', () => console.info('[PublicDashboard] socket connected', socket.id));
  socket.on('connect_error', (err) => console.error('[PublicDashboard] socket connect_error', err));
  socket.on('public-projection-start', (p) => console.info('[PublicDashboard] received public-projection-start event', p));

    return () => {
      try {
        socket.off('public-projection-start', handleStart);
        socket.off('public-projection-stop', handleStop);
        socket.off('telemetry-update', telemetryHandler);
        socket.disconnect();
      } catch (e) {}
      if (pollRef.current.intervalId) { clearInterval(pollRef.current.intervalId); pollRef.current.intervalId = null; }
    };
  }, [fetchLatestAndMerge, mergeTelemetryPoint, setPublicFlight, startPublicLive]);

  // If admin already set a projected flight id, join and poll
  useEffect(() => {
    const fid = publicDisplayState?.currentFlightId || null;
    const socket = socketRef.current;
    if (!fid || !socket) return;
    try {
      socket.emit('join-flight-room', fid);
      socket.on('telemetry-update', (d) => mergeTelemetryPoint(d));
      if (pollRef.current.intervalId) clearInterval(pollRef.current.intervalId);
      pollRef.current.currentFlightId = fid;
      fetchLatestAndMerge(fid);
      pollRef.current.intervalId = setInterval(() => fetchLatestAndMerge(fid), 1000);
    } catch (e) {}
  }, [publicDisplayState?.currentFlightId, fetchLatestAndMerge, mergeTelemetryPoint]);

  // load saved flights on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try { const flights = await getSavedFlights(); if (mounted) setSavedFlights(flights || []); } catch (e) {}
    })();
    return () => { mounted = false; };
  }, []);

  const addEvent = useCallback((message) => { setMissionData(prev => ({ ...prev, events: [{ time: new Date().toLocaleTimeString(), message }, ...(prev.events || []).slice(0, 99)] })); }, []);

  const handleFlightSelect = async (flightArg) => {
    const name = typeof flightArg === 'string' ? flightArg : (flightArg?.name || null);
    const id = typeof flightArg === 'object' ? flightArg.id : null;
    try {
      // Cleanup any previous polling/socket handlers
      try {
        if (pollRef.current.intervalId) { clearInterval(pollRef.current.intervalId); pollRef.current.intervalId = null; }
        // remove previous telemetry handler if present
        const prevHandler = pollRef.current.telemetryHandler;
        const prevFlight = pollRef.current.currentFlightId;
        if (socketRef.current && prevHandler && typeof socketRef.current.off === 'function') {
          try { socketRef.current.off('telemetry-update', prevHandler); } catch(e) {}
          try { if (prevFlight) socketRef.current.emit('leave-flight-room', prevFlight); } catch(e) {}
        }
      } catch (cleanupErr) {
        console.warn('Error cleaning previous public flight handlers:', cleanupErr);
      }

      // Load historical flight data from Node API (SQLite)
      const data = await loadFlightData(flightArg);
      if (data) {
        setCurrentFlight(name);
        setFlightData(data);
        try { const s = calculateSpeedsAndDistance(data); setMissionData(md => ({ ...md, verticalSpeed: s.verticalSpeed, horizontalSpeed: s.horizontalSpeed, distance: s.distance })); } catch (e) {}
        setCanSatStatus(prev => ({ ...prev, isActive: true, lastUpdate: new Date().toLocaleTimeString(), walkieChannel: (data.walkieChannel?.slice?.(-1)[0] ?? prev.walkieChannel) }));
        addEvent(`Vuelo cargado: ${name}`);
        try { if (typeof setPublicFlight === 'function') setPublicFlight({ id, name }); } catch (e) {}

        // Join socket room for live telemetry (if socket available and flight id present)
        try {
          const socket = socketRef.current;
          const telemetryHandlerLocal = (d) => { try { console.debug('[PublicDashboard] telemetry-update (selected flight) received', d); mergeTelemetryPoint(d); } catch (e) { console.warn('telemetry handler local error', e); } };
          // store handler so we can remove it when switching flights
          pollRef.current.telemetryHandler = telemetryHandlerLocal;
          if (socket && id) {
            try { socket.emit('join-flight-room', id); } catch (e) { console.warn('join-flight-room emit failed', e); }
            try { socket.on('telemetry-update', telemetryHandlerLocal); } catch (e) { console.warn('socket.on telemetry-update failed', e); }
          }

          // Start polling fallback every 1s to fetch latest DB telemetry and merge
          pollRef.current.currentFlightId = id;
          // fetch once to seed
          if (id) fetchLatestAndMerge(id);
          // Start interval
          pollRef.current.intervalId = setInterval(() => {
            if (pollRef.current.currentFlightId) fetchLatestAndMerge(pollRef.current.currentFlightId);
          }, 1000);
        } catch (e) {
          console.warn('Failed to attach live handlers for selected flight:', e);
        }
      }
    } catch (e) { console.warn('handleFlightSelect error', e); }
  };

  return (
    <>
      <Helmet>
        <title>Astra CanSat Dashboard - Vista Pública</title>
      </Helmet>
      <div className="min-h-screen bg-gray-900 retro-grid">
        <Header />
        <main className="container mx-auto px-4 py-8 space-y-8">
          {getDisplayMode() !== 'hidden' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <FlightSelectorPublic onFlightSelect={handleFlightSelect} currentFlight={currentFlight} savedFlights={savedFlights} />
            </motion.div>
          )}

          {flightData && getDisplayMode() !== 'hidden' ? (
            <>
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2"><StatusPanel status={canSatStatus} isLiveMode={isPublicLiveMode()} /></div>
                <div><MissionControl missionData={missionData} /></div>
              </div>
              <ChartsGrid data={flightData} />
              <div className="grid lg:grid-cols-2 gap-8">
                <MapSection coordinates={flightData.coordinates} />
                <GyroscopeViewer gyroData={(flightData.gyroscope?.slice?.(-1)[0]) || { x: 0, y: 0, z: 0 }} modelUrl={modelUrl} onModelUpload={setModelUrl} currentFlight={currentFlight} isReadOnly />
              </div>
            </>
          ) : getDisplayMode() !== 'hidden' ? (
            <div className="text-center py-16"><div className="glass-card rounded-xl p-8 max-w-md mx-auto"><div className="text-6xl mb-4">🛰️</div><h2 className="text-2xl font-bold text-white mb-4">Esperando Datos</h2><p className="text-gray-300">Esperando que el administrador proyecte un vuelo o inicie transmisión en vivo.</p></div></div>
          ) : (
            <div className="text-center py-16">Vista pública oculta</div>
          )}
        </main>
        <Toaster />
      </div>
    </>
  );
}

  // Saved: refresh marker to help editor/TS server pick up latest content