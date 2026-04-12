import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Sector } from '../types';
import { Flashlight, ZoomIn, X, CheckCircle2, Scan, Camera, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, query, where, getDocs, sendNotification, logActivity, onSnapshot } from '../lib/firebase';
import { Html5Qrcode } from 'html5-qrcode';
import { History, Clock, MapPin } from 'lucide-react';

interface ScanRecord {
  id: string;
  sectorId: string;
  timestamp: string;
}

interface ScannerProps {
  user: UserProfile;
  setView: (view: any) => void;
}

export default function Scanner({ user, setView }: ScannerProps) {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [scanned, setScanned] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "reader";

  // Load history and sectors
  useEffect(() => {
    const savedHistory = localStorage.getItem(`scan_history_${user.uid}`);
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    const unsubscribe = onSnapshot(collection(db, 'sectors'), (snapshot) => {
      const sectorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sector[];
      setSectors(sectorsData);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const saveToHistory = (sectorId: string) => {
    const newRecord: ScanRecord = {
      id: Math.random().toString(36).substr(2, 9),
      sectorId,
      timestamp: new Date().toISOString(),
    };
    const updatedHistory = [newRecord, ...history].slice(0, 20); // Keep last 20
    setHistory(updatedHistory);
    localStorage.setItem(`scan_history_${user.uid}`, JSON.stringify(updatedHistory));
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        setIsCameraActive(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const startScanner = async () => {
    if (user.status !== 'active') {
      setError("No puede realizar escaneos mientras está en licencia.");
      return;
    }
    setError(null);
    try {
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;
      
      setIsCameraActive(true);

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Ignore frequent errors like "QR code not found"
        }
      );
    } catch (err) {
      console.error("Camera error:", err);
      setError("No se pudo acceder a la cámara. Asegúrese de dar permisos.");
      setIsCameraActive(false);
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    // Only process if it matches our format
    if (!decodedText.startsWith('TABSAR_SEC_')) {
      console.warn("Invalid QR Code format");
      setError("Código QR no válido o no autorizado.");
      return;
    }

    const sectorId = decodedText.replace('TABSAR_SEC_', '');
    const sector = sectors.find(s => s.id === sectorId);
    
    if (!sector) {
      setError("Sector no reconocido en la base de datos.");
      return;
    }

    setScannedData(sectorId);
    setScanned(true);
    saveToHistory(sectorId);
    
    // Stop scanner immediately on success
    await stopScanner();

    try {
      // Log Activity
      await logActivity({
        userId: user.uid,
        userName: user.name,
        type: 'scan',
        sectorId: sectorId,
        sectorName: sector?.name || sectorId,
        details: `Escaneo de sector ${sector?.name || sectorId}`
      });

      // Notify Supervisors
      const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'supervisor']));
      const supervisorDocs = await getDocs(q);
      
      const notificationPromises = supervisorDocs.docs.map(doc => 
        sendNotification(
          doc.id, 
          'Punto Escaneado', 
          `${user.name} ha escaneado el sector ${sectorId}.`,
          'patrol'
        )
      );
      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Error sending scan notification:', error);
    }

    setTimeout(() => {
      setView('dashboard');
    }, 2500);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="flex h-full flex-col bg-steel-900 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-white/10 relative z-50 bg-steel-900/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-md">
            <Scan className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">Escáner QR</h2>
            <p className="text-[8px] font-bold text-steel-400 uppercase tracking-widest">Validación de Punto de Control</p>
          </div>
        </div>
        <button 
          onClick={() => {
            stopScanner();
            setView('dashboard');
          }}
          className="rounded-full bg-white/10 p-2 transition-all hover:bg-white/20 active:scale-90"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Camera Viewport */}
      <div className="relative flex-1 bg-black flex flex-col items-center justify-center">
        <div id={containerId} className="w-full h-full" />
        
        {!isCameraActive && !scanned && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-6 z-10">
            <div className="rounded-[2.5rem] bg-white/5 p-12 backdrop-blur-xl border border-white/10 shadow-2xl">
              <Camera className="h-16 w-16 text-steel-400 mx-auto mb-6 opacity-50" />
              <h3 className="text-xl font-black uppercase tracking-tight">Cámara Inactiva</h3>
              <p className="text-xs text-steel-400 mt-2 max-w-[200px] mx-auto font-medium">Inicie el escáner para validar su posición en el sector.</p>
            </div>
            <button 
              onClick={startScanner}
              className="flex items-center gap-3 rounded-2xl bg-celeste-gradient px-10 py-5 text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Scan className="h-5 w-5" />
              ACTIVAR ESCÁNER
            </button>
          </div>
        )}

        {/* Scanning Overlay */}
        {isCameraActive && !scanned && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute inset-0 border-[40px] border-black/60" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-2xl" />
              <motion.div 
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-0.5 bg-blue-400/50 shadow-[0_0_15px_rgba(96,165,250,0.8)]" 
              />
            </div>
            <p className="mt-12 text-xs font-black text-white text-center px-8 drop-shadow-lg uppercase tracking-widest animate-pulse">
              Alinee el código QR del sector
            </p>
          </div>
        )}
      </div>

      {/* Controls Area */}
      <div className="bg-[var(--bg-main)] p-8 pb-12 pb-safe rounded-t-[3rem] -mt-12 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-red-500/10 p-4 text-red-600 border border-red-500/20">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-[10px] font-bold uppercase">{error}</p>
          </div>
        )}

        <div className="flex flex-col items-center gap-6 w-full">
          {!isCameraActive && !scanned ? (
            <button 
              onClick={startScanner}
              className="flex w-full items-center justify-center gap-4 rounded-3xl bg-celeste-gradient py-8 text-xl font-black text-white shadow-xl shadow-blue-500/20 transition-all hover:shadow-2xl active:scale-95"
            >
              <Scan className="h-8 w-8" />
              ACTIVAR ESCÁNER
            </button>
          ) : !scanned ? (
            <button 
              onClick={stopScanner}
              className="flex w-full items-center justify-center gap-4 rounded-3xl bg-steel-800 py-8 text-xl font-black text-white shadow-xl shadow-steel-900/20 transition-all active:scale-95"
            >
              <X className="h-8 w-8" />
              CANCELAR
            </button>
          ) : (
            <div className="w-full py-6 text-center">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-green-500 mb-4 shadow-lg shadow-green-500/20">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <p className="text-[var(--text-main)] text-lg font-black uppercase tracking-tight">¡Escaneo Exitoso!</p>
            </div>
          )}
          
          <div className="flex gap-4">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-all active:scale-90 ${
                showHistory ? 'bg-[var(--text-main)] text-[var(--bg-card)] border-[var(--text-main)]' : 'bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-muted)]'
              }`}
            >
              <History className="h-5 w-5" />
            </button>
            <button onClick={() => setError('La linterna (Flashlight) no está soportada en el navegador actual o requiere permisos avanzados de hardware.')} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] hover:bg-slate-100/10 text-[var(--text-muted)] opacity-80 transition-all">
              <Flashlight className="h-5 w-5" />
            </button>
            <button onClick={() => setError('El Zoom óptico es controlado automáticamente por la cámara del dispositivo móvil.')} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] hover:bg-slate-100/10 text-[var(--text-muted)] opacity-80 transition-all">
              <ZoomIn className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Local History Panel */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-8 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Historial Reciente</h3>
                <button 
                  onClick={() => {
                    localStorage.removeItem(`scan_history_${user.uid}`);
                    setHistory([]);
                  }}
                  className="text-[10px] font-bold text-red-500 uppercase"
                >
                  Limpiar
                </button>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="text-center py-8 rounded-2xl bg-[var(--bg-card)] border border-dashed border-[var(--border-main)]">
                    <p className="text-xs font-bold text-[var(--text-muted)]">No hay escaneos previos</p>
                  </div>
                ) : (
                  history.map((record) => (
                    <div key={record.id} className="flex items-center justify-between rounded-2xl bg-[var(--bg-card)] p-3 border border-[var(--border-main)]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-celeste-dark text-white">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--text-main)]">{record.sectorId}</p>
                          <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)] font-medium">
                            <Clock className="h-3 w-3" />
                            {new Date(record.timestamp).toLocaleString('es-AR', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {scanned && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 40, opacity: 1 }}
            className="absolute left-6 right-6 top-0 z-[100] flex items-center justify-between rounded-2xl bg-green-500 p-4 text-white shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6" />
              <div>
                <p className="font-bold">Sector Registrado</p>
                <p className="text-xs opacity-90 uppercase font-mono">ID: {scannedData}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
