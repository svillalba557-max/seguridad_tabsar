import React, { useState, useEffect } from 'react';
import { MapPin, ArrowRight, AlertTriangle, Scan, CheckCircle2, Info, Play, Square, Clock, Loader2, LayoutGrid, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SECTORES as DEFAULT_SECTORES } from '../constants';
import { UserProfile, Sector } from '../types';
import MapComponent from './MapComponent';
import LiveTrackingMap from './LiveTrackingMap';
import { logActivity, db, collection, onSnapshot, auth, addDoc, serverTimestamp } from '../lib/firebase';

interface DashboardProps {
  user: UserProfile;
  setView: (view: any) => void;
}

export default function Dashboard({ user, setView }: DashboardProps) {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [isPatrolActive, setIsPatrolActive] = useState(() => localStorage.getItem(`patrol_active_${user.uid}`) === 'true');
  const [startTime, setStartTime] = useState<Date | null>(() => {
    const st = localStorage.getItem(`patrol_start_${user.uid}`);
    return st ? new Date(st) : null;
  });
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      setSectors(DEFAULT_SECTORES as Sector[]);
      return;
    }

    const unsubscribe = onSnapshot(collection(db, 'sectors'), (snapshot) => {
      const sectorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sector[];
      
      if (sectorsData.length > 0) {
        setSectors(sectorsData);
      } else {
        setSectors(DEFAULT_SECTORES as Sector[]);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Sectors snapshot error:', err);
      setSectors(DEFAULT_SECTORES as Sector[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isPatrolActive && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - startTime.getTime();
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPatrolActive, startTime]);

  useEffect(() => {
    if (!isPatrolActive) {
      setCurrentStep(0);
      return;
    }

    // Load scan history for today to determine progress
    const historyKey = `scan_history_${user.uid}`;
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    // Filter history for today and unique sectors
    const today = new Date().toDateString();
    const uniqueTodayScans = new Set(
      history
        .filter((h: any) => new Date(h.timestamp).toDateString() === today)
        .map((h: any) => h.sectorId)
    );
    
    setCurrentStep(uniqueTodayScans.size);
  }, [isPatrolActive, user.uid]);

  const applyKalmanFilter = (points: any[]) => {
    if (points.length < 2) return points;
    let smoothed = [];
    let q = 0.00001; // process noise
    let r = 0.001; // measurement noise
    let x_est_lat = points[0].lat; let p_est_lat = 1;
    let x_est_lng = points[0].lng; let p_est_lng = 1;
    for (let pt of points) {
      let p_pred_lat = p_est_lat + q;
      let p_pred_lng = p_est_lng + q;
      let k_lat = p_pred_lat / (p_pred_lat + r);
      let k_lng = p_pred_lng / (p_pred_lng + r);
      x_est_lat = x_est_lat + k_lat * (pt.lat - x_est_lat);
      p_est_lat = (1 - k_lat) * p_pred_lat;
      x_est_lng = x_est_lng + k_lng * (pt.lng - x_est_lng);
      p_est_lng = (1 - k_lng) * p_pred_lng;
      smoothed.push({...pt, lat: x_est_lat, lng: x_est_lng});
    }
    return smoothed;
  };

  const processAndUploadGPSBuffer = async () => {
    try {
      const bufferStr = localStorage.getItem(`gps_buffer_${user.uid}`);
      if (!bufferStr) return;
      const points = JSON.parse(bufferStr);
      if (points.length === 0) return;
      
      const smoothedPath = applyKalmanFilter(points);
      
      const siteName = localStorage.getItem(`patrol_site_${user.uid}`) || "[PLANTA] Planta Principal";
      await addDoc(collection(db, 'patrol_tracks'), {
        userId: user.uid,
        userName: user.name || 'Personal',
        shiftDate: new Date().toDateString(),
        siteName: siteName,
        originalPath: points,
        smoothedPath: smoothedPath,
        timestamp: serverTimestamp()
      });
      localStorage.removeItem(`gps_buffer_${user.uid}`);
    } catch (e) {
      console.error('Error uploading GPS tracking buffer:', e);
    }
  };

  const handleStartPatrol = async () => {
    const now = new Date();
    setIsPatrolActive(true);
    setStartTime(now);
    localStorage.setItem(`patrol_active_${user.uid}`, 'true');
    localStorage.setItem(`patrol_start_${user.uid}`, now.toISOString());
    localStorage.removeItem(`gps_buffer_${user.uid}`); // reset buffer

    // GPS Auto-detect Branch / Geofencing
    if (navigator.geolocation && navigator.onLine) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        let finalSiteName = "[PLANTA] Planta Principal";
        
        try {
          // Ingeniería Inversa de Coordenadas
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const road = (data.address?.road || '').toLowerCase();
          const houseNumber = data.address?.house_number || '';

          if (road.includes('campichuelo')) {
            finalSiteName = '[DEPÓSITO] Sede Campichuelo';
          } else if (road.includes('zeballos') || (road.includes('zeballos') && houseNumber.includes('35'))) {
            finalSiteName = '[ADMINISTRACIÓN] Sede Zeballos 3501';
          } else if (latitude >= -34.6800 && latitude <= -34.6400 && longitude >= -58.3800 && longitude <= -58.3400) {
            finalSiteName = '[PLANTA] Planta Principal (Avellaneda)';
          } else {
            finalSiteName = `[EXTERNA] ${data.address?.road || data.display_name?.split(',')[0]}`;
          }
        } catch(e) {
          finalSiteName = "[PLANTA] Planta Principal"; // Fallback offline
        }
        
        localStorage.setItem(`patrol_site_${user.uid}`, finalSiteName);
        await logActivity({
          userId: user.uid,
          userName: user.name,
          type: 'patrol-start',
          details: `Inicio de Rondas en: ${finalSiteName}`,
          locationName: finalSiteName
        });
      }, async () => {
        localStorage.setItem(`patrol_site_${user.uid}`, "[PLANTA] Planta Principal");
        await logActivity({ userId: user.uid, userName: user.name, type: 'patrol-start', details: `Inicio: [PLANTA] Planta Principal` });
      });
    } else {
      localStorage.setItem(`patrol_site_${user.uid}`, "[PLANTA] Planta Principal (Offline)");
      await logActivity({ userId: user.uid, userName: user.name, type: 'patrol-start', details: `Inicio: [PLANTA] Planta Principal` });
    }
  };

  const handleEndPatrol = async () => {
    setIsPatrolActive(false);
    
    // Batch Upload Buffered Data and apply Kalman logic
    await processAndUploadGPSBuffer();

    localStorage.removeItem(`patrol_active_${user.uid}`);
    localStorage.removeItem(`patrol_start_${user.uid}`);

    await logActivity({
      userId: user.uid,
      userName: user.name,
      type: 'patrol-end',
      details: 'Finalización de recorrido general',
      duration: elapsedTime
    });
    setStartTime(null);
    setElapsedTime('00:00');
  };

  return (
    <div className="space-y-6 p-6 bg-[var(--bg-main)] min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase">Panel de Control</h2>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Sistema de Rondas Industriales</p>
        </div>
        <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-black border ${isPatrolActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-main)]'}`}>
          <div className={`h-1.5 w-1.5 rounded-full ${isPatrolActive ? 'bg-green-500 animate-pulse' : 'bg-[var(--text-muted)]'}`} />
          {isPatrolActive ? 'OPERATIVO' : 'STANDBY'}
        </div>
      </div>

      {/* Admin Panel Button for Claudia, Ricardo and Damian */}
      {(user.legajo === '528' || user.legajo === '553' || user.legajo === '541' || user.name?.toLowerCase().includes('claudia') || user.name?.toLowerCase().includes('ricardo') || user.name?.toLowerCase().includes('damian')) && (
        <button 
          onClick={() => setView('admin-panel')}
          className="flex w-full items-center justify-between rounded-3xl bg-slate-900 p-6 shadow-lg shadow-slate-900/20 transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/10 p-3 text-white">
              <LayoutGrid className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gestión Administrativa</p>
              <h3 className="text-xl font-bold text-white mt-1">Panel de Control</h3>
            </div>
          </div>
          <ArrowRight className="h-6 w-6 text-white/50" />
        </button>
      )}

      {/* Patrol Progress Card */}
      <div className="rounded-3xl bg-[var(--bg-card)] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[var(--border-main)]">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Progreso de Ronda</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-4xl font-black text-[var(--text-main)]">{currentStep}</span>
              <span className="text-lg font-bold text-[var(--text-muted)]">/ {sectors.length}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Cronómetro</p>
            <p className="text-2xl font-black text-[var(--text-main)] font-mono">{elapsedTime}</p>
          </div>
        </div>

        <div className="h-1.5 w-full rounded-full bg-[var(--bg-main)] overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / (sectors.length || 1)) * 100}%` }}
            className="h-full bg-celeste-gradient" 
          />
        </div>

        <div className="mt-6 flex gap-3">
          {!isPatrolActive ? (
            <button 
              onClick={handleStartPatrol}
              disabled={user.status !== 'active'}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-celeste-gradient py-4 text-xs font-black text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:grayscale"
            >
              <Play className="h-4 w-4 fill-current" />
              {user.status === 'active' ? 'INICIAR TURNO' : 'USUARIO EN LICENCIA'}
            </button>
          ) : (
            <button 
              onClick={handleEndPatrol}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-steel-800 py-4 text-xs font-black text-white shadow-lg shadow-steel-900/20 transition-all hover:bg-steel-900 active:scale-95"
            >
              <Square className="h-4 w-4 fill-current" />
              FINALIZAR TURNO
            </button>
          )}
        </div>
      </div>

      {/* Main Scan Button - Professional Medium Size */}
      <div className="flex justify-center">
        <motion.button 
          whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setView('scanner')}
          disabled={user.status !== 'active'}
          className="flex w-full items-center justify-between gap-4 rounded-3xl bg-[var(--bg-card)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-[var(--border-main)] transition-all hover:border-celeste-dark group disabled:opacity-50"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-celeste-gradient p-4 text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
              <Scan className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-black text-[var(--text-main)] leading-tight">
                {user.status === 'active' ? 'ESCANEAR PUNTO' : 'ESCÁNER DESACTIVADO'}
              </h3>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                {user.status === 'active' ? 'Validación de sector QR' : `En licencia (${user.status})`}
              </p>
            </div>
          </div>
          <div className="rounded-full bg-[var(--bg-main)] p-2 text-[var(--text-muted)] group-hover:text-celeste-dark transition-colors">
            <ArrowRight className="h-5 w-5" />
          </div>
        </motion.button>
      </div>

      {/* Interactive Map */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mapa de Ruta</p>
          <div className="flex items-center gap-1 rounded-full bg-celeste-light px-2 py-0.5 text-[8px] font-bold text-celeste-dark">
            <MapPin className="h-2 w-2" />
            GPS ACTIVO
          </div>
        </div>
        <div className="h-64 relative">
          {loading ? (
            <div className="flex h-full items-center justify-center bg-steel-100 rounded-3xl">
              <Loader2 className="h-8 w-8 animate-spin text-steel-400" />
            </div>
          ) : (
            <MapComponent 
              sectors={sectors}
              onSectorClick={(sector) => setSelectedSector(sector)} 
              currentStep={currentStep} 
              user={user}
            />
          )}
          
          <AnimatePresence>
            {selectedSector && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-4 left-4 right-4 z-[1000] rounded-2xl bg-white p-4 shadow-xl border border-slate-100"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="rounded-xl bg-celeste-dark p-3 text-white">
                      <Scan className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{selectedSector.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{selectedSector.type}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedSector(null)}
                    className="rounded-full p-1 hover:bg-slate-100"
                  >
                    <ArrowRight className="h-4 w-4 rotate-90 text-slate-400" />
                  </button>
                </div>
                <div className="mt-4 flex gap-2">
                  <button 
                    onClick={() => setView('scanner')}
                    className="flex-1 rounded-xl bg-primary-gradient py-3 text-xs font-bold text-white shadow-md shadow-celeste-dark/20 transition-all hover:shadow-lg active:scale-95"
                  >
                    Iniciar Escaneo
                  </button>
                  <button className="rounded-xl bg-celeste-light px-4 py-3 text-celeste-dark transition-all active:scale-95">
                    <Info className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Real-time Heatmap / Tracking */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-2 mt-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plano Dinámico de Recorrido</p>
          <div className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[8px] font-bold text-orange-600 border border-orange-200">
            <Activity className="h-2 w-2" />
            <span className="animate-pulse">MAPEO EN VIVO</span>
          </div>
        </div>
        <div className="h-64 relative rounded-3xl overflow-hidden border border-[var(--border-main)] shadow-inner">
          <LiveTrackingMap user={user} isPatrolActive={isPatrolActive} />
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid gap-4">
        <button 
          onClick={() => setView('reports')}
          className="flex items-center justify-between rounded-2xl bg-[var(--bg-card)] p-6 shadow-sm border border-[var(--border-main)] transition-transform active:scale-[0.98]"
        >
          <div className="text-left">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Novedades</p>
            <h3 className="text-2xl font-bold text-[var(--text-main)] mt-1">Reportar Novedad</h3>
          </div>
          <div className="rounded-xl bg-red-50 p-4">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
        </button>
      </div>

      {/* Location Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[var(--bg-card)] p-4 shadow-sm border border-[var(--border-main)]">
          <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Ubicación Actual</p>
          <p className="text-sm font-bold text-[var(--text-main)] truncate mt-1">
            {currentStep > 0 && sectors.length > 0 ? sectors[currentStep - 1].name : 'Sin iniciar'}
          </p>
        </div>

        <div className="rounded-2xl bg-celeste-light p-4 flex flex-col justify-between shadow-sm border border-celeste-warm">
          <div>
            <p className="text-[8px] font-bold text-celeste-dark uppercase tracking-wider">Próximo Punto</p>
            <p className="text-sm font-bold text-[var(--text-main)] mt-1 truncate">
              {currentStep < sectors.length ? sectors[currentStep].name : 'Finalizado'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
