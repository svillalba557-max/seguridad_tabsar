import React, { useState, useEffect, Suspense, lazy } from 'react';
import { auth, onAuthStateChanged, signInWithPopup, googleProvider, db, doc, getDoc, setDoc, signInAnonymously, getDocs, collection, query, where, updateDoc, onSnapshot } from './lib/firebase';
import { UserProfile } from './types';
import { Shield, Scan, ClipboardList, QrCode, User, LogIn, Loader2, ShieldCheck, Bell, Lock, Hash, Eye, EyeOff, MapPin, Activity, BarChart3, Check, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './components/ui/Logo';
import ConfirmationModal from './components/ui/ConfirmationModal';
import { RONDINES, SUPERVISORES } from './constants';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import { useDeviceDetection } from './hooks/useDeviceDetection';

import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import IncidentReport from './components/IncidentReport';
import QRGenerator from './components/QRGenerator';
import Profile from './components/Profile';
import NotificationCenter from './components/NotificationCenter';
import IncidentHistory from './components/IncidentHistory';
import ShiftReportView from './components/ShiftReportView';
import SettingsView from './components/SettingsView';
import ReviewReport from './components/ReviewReport';
import ActivityCenter from './components/ActivityCenter';
import AdminControlPanel from './components/AdminControlPanel';
import ExecutiveDashboard from './components/ExecutiveDashboard';

type View = 'dashboard' | 'scanner' | 'reports' | 'qr' | 'profile' | 'history' | 'shift-report' | 'settings' | 'activity-center' | 'reviews' | 'users' | 'admin-panel' | 'executive-dashboard';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [legajo, setLegajo] = useState(localStorage.getItem('tabsar_legajo') || '');
  const [dni, setDni] = useState(localStorage.getItem('tabsar_dni') || '');
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailInit, setShowEmailInit] = useState(false);
  const [initEmail, setInitEmail] = useState('');
  const [pendingUser, setPendingUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);
  const { deviceType, os, isIOS, isAndroid } = useDeviceDetection();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If no prompt, maybe it's iOS or already handled
      if (isIOS) {
        setError('Para instalar en iOS: Toca el botón "Compartir" y selecciona "Añadir a la pantalla de inicio".');
      } else {
        setError('Busque la opción "Instalar aplicación" en el menú de su navegador.');
      }
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  // Browser exit confirmation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (user) {
        e.preventDefault();
        e.returnValue = '¿Está seguro de que desea salir?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  // Initialize Auth and Auto-login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Try to fetch existing profile for auto-login
        try {
          // If anonymous, check localStorage for legajo
          let currentLegajo = '';
          if (firebaseUser.isAnonymous) {
            currentLegajo = localStorage.getItem('tabsar_legajo') || '';
          }

          if (currentLegajo) {
            const q = query(collection(db, 'users'), where('legajo', '==', currentLegajo));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const userData = querySnapshot.docs[0].data() as UserProfile;
              if (userData.active) {
                setUser(userData);
                if (userData.theme) setTheme(userData.theme);
                if (['ceo', 'jefe-seguridad', 'supervisor', 'admin'].includes(userData.role)) setCurrentView('executive-dashboard');
              }
            }
          } else if (!firebaseUser.isAnonymous) {
            // Legacy Google login support or fallback
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data() as UserProfile;
              if (userData.active) {
                setUser(userData);
                if (userData.theme) setTheme(userData.theme);
                if (['ceo', 'jefe-seguridad', 'supervisor', 'admin'].includes(userData.role)) setCurrentView('executive-dashboard');
              }
            }
          }
        } catch (err) {
          console.error("Auto-login error:", err);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [setTheme]);

  // Listen for unread notifications
  useEffect(() => {
    if (!user || !auth.currentUser) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (err) => {
      console.warn("Notification listener failed:", err);
    });

    return () => unsubscribe();
  }, [user]);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      // After Google login, we still need to check if they have a legajo assigned
      // We'll look for a user with this UID
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        if (userData.active) {
          setUser(userData);
          if (userData.theme) setTheme(userData.theme);
          if (['ceo', 'jefe-seguridad', 'supervisor', 'admin'].includes(userData.role)) setCurrentView('executive-dashboard');
          return;
        }
      }
      
      // If not found by UID, try to find by email
      const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data() as UserProfile;
        if (userData.active) {
          // Link UID
          await updateDoc(doc(db, 'users', querySnapshot.docs[0].id), { uid: firebaseUser.uid });
          setUser({ ...userData, uid: firebaseUser.uid });
          if (userData.theme) setTheme(userData.theme);
          if (['ceo', 'jefe-seguridad', 'supervisor', 'admin'].includes(userData.role)) setCurrentView('executive-dashboard');
          return;
        }
      }

      setError('Su cuenta de Google no está vinculada a ningún Legajo registrado.');
      await auth.signOut();
    } catch (err: any) {
      console.error('Google login error:', err);
      setError('Error al iniciar sesión con Google.');
    } finally {
      setLoading(false);
    }
  };

  const performLogin = async (targetLegajo: string, targetDni: string) => {
    setError(null);
    setLoading(true);

    const staff = [...SUPERVISORES, ...RONDINES].find(s => s.legajo === targetLegajo);

    if (staff && staff.dni !== targetDni) {
      setError('Credenciales incorrectas. Verifique su DNI o Legajo.');
      setLoading(false);
      setIsAutoLoggingIn(false);
      return;
    }

    let localDeviceId = localStorage.getItem('tabsar_device_id');
    const isNewDeviceLocally = !localDeviceId;
    if (!localDeviceId) {
      localDeviceId = crypto.randomUUID();
      localStorage.setItem('tabsar_device_id', localDeviceId);
    }

    // ⚡ INSTANT FAST-TRACK LOGIN FOR KNOWN STAFF (Zero Latency) - Skip if new device
    if ((staff || targetLegajo === '528') && !isNewDeviceLocally) {
      const role = staff?.role || 'supervisor';
      const isExec = ['ceo', 'jefe-seguridad', 'supervisor', 'admin'].includes(role);
      
      const localData: UserProfile = {
        uid: auth.currentUser?.uid || `local-${targetLegajo}`,
        name: staff?.name || 'Claudia Luchini',
        email: targetLegajo === '528' ? 'claudia.luchini@seguridad.local' : `${targetLegajo}@seguridad.local`,
        role: role as any,
        dni: staff?.dni || '27239211',
        legajo: targetLegajo,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${staff?.name || 'Claudia Luchini'}`,
        active: true,
        completedRounds: 0,
        pendingAlerts: 0,
        status: 'active',
      };

      // 1. Instantly enter the app UI visually
      localStorage.setItem('tabsar_legajo', targetLegajo);
      localStorage.setItem('tabsar_dni', targetDni);
      setUser(localData);
      setCurrentView(isExec ? 'executive-dashboard' : 'dashboard');
      setLoading(false);
      setIsAutoLoggingIn(false);

      // 2. Perform Firebase Auth & Sync in completely detached background thread
      (async () => {
        try {
          let firebaseUser = auth.currentUser;
          if (!firebaseUser) {
            try {
              const result = await signInAnonymously(auth);
              firebaseUser = result.user;
            } catch (authErr) {
              console.warn('Silent Auth Fallback:', authErr);
            }
          }

          const activeUid = firebaseUser ? firebaseUser.uid : localData.uid;
          
          const q = query(collection(db, 'users'), where('legajo', '==', targetLegajo));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const serverData = querySnapshot.docs[0].data() as UserProfile;
            if (!serverData.active) {
              // Immediately kick out if account was disabled server-side
              setUser(null);
              localStorage.removeItem('tabsar_legajo');
              localStorage.removeItem('tabsar_dni');
              setError('Cuenta inactiva permanentemente.');
              return;
            }

            // Device Binding Verification
            const isExecutive = ['528', '541', '553'].includes(serverData.legajo);
            if (!isExecutive && serverData.deviceId && serverData.deviceId !== localDeviceId) {
              setUser(null);
              localStorage.removeItem('tabsar_legajo');
              localStorage.removeItem('tabsar_dni');
              setError('Dispositivo no autorizado. Contacte a la administración para habilitar este equipo.');
              return;
            }

            if (!serverData.deviceId) {
              serverData.deviceId = localDeviceId;
            }

            // Update UI seamlessly with their real server profile configs
            if (serverData.uid !== activeUid || !serverData.deviceId) {
              serverData.uid = activeUid;
              await setDoc(doc(db, 'users', activeUid), serverData).catch(() => {});
            }
            setUser(serverData);
            if (serverData.theme) setTheme(serverData.theme);
          } else {
            // First time ever: Upload the default localData to Firebase gracefully
            localData.uid = activeUid;
            localData.deviceId = localDeviceId;
            await setDoc(doc(db, 'users', activeUid), localData).catch(() => {});
            setUser(localData);
          }
        } catch (syncErr) {
          console.warn('Background sync failed offline. Visual session continued cleanly.', syncErr);
        }
      })();
      return;
    }

    // SLOW PATH: Unknown Legajo logic (If new user was created in Settings but not in constants)
    try {
      let firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        const result = await signInAnonymously(auth);
        firebaseUser = result.user;
      }
      
      const q = query(collection(db, 'users'), where('legajo', '==', targetLegajo));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data() as UserProfile;
        
        if (userData.dni && userData.dni !== targetDni) {
          setError('Credenciales incorrectas. Verifique su DNI y Legajo.');
          setLoading(false);
          setIsAutoLoggingIn(false);
          return;
        }

        if (!userData.active) {
          setError('Cuenta inactiva. Contacte a la administración.');
          setLoading(false);
          return;
        }

        // Device Binding Verification (Slow Path)
        const isExecutive = ['528', '541', '553'].includes(userData.legajo);
        if (!isExecutive && userData.deviceId && userData.deviceId !== localDeviceId) {
          setError('Dispositivo no autorizado. Contacte a la administración para habilitar este equipo.');
          setLoading(false);
          setIsAutoLoggingIn(false);
          return;
        }

        if (!userData.deviceId) {
          userData.deviceId = localDeviceId;
          await updateDoc(doc(db, 'users', querySnapshot.docs[0].id), { deviceId: localDeviceId });
        }
        
        localStorage.setItem('tabsar_legajo', targetLegajo);
        localStorage.setItem('tabsar_dni', targetDni);
        setUser(userData);
        if (userData.theme) setTheme(userData.theme);
        setCurrentView(['ceo', 'jefe-seguridad', 'supervisor', 'admin'].includes(userData.role) ? 'executive-dashboard' : 'dashboard');
      } else {
        setError('Legajo no reconocido en el sistema.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Error verificando la identidad. Por favor intente nuevamente.');
    } finally {
      setIsAutoLoggingIn(false);
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(legajo, dni);
  };

  // Check for URL parameter legajo or localStorage for auto-login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLegajo = params.get('legajo');
    const savedLegajo = localStorage.getItem('tabsar_legajo');
    const savedDni = localStorage.getItem('tabsar_dni');
    const targetLegajo = urlLegajo || savedLegajo;

    // Use saved DNI for auto-login
    if (targetLegajo && savedDni && !user && !isAutoLoggingIn) {
      setIsAutoLoggingIn(true);
      setLegajo(targetLegajo);
      setDni(savedDni);
      performLogin(targetLegajo, savedDni);
    }
  }, [user, isAutoLoggingIn]);

  const handleInitializeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser || !initEmail) return;
    setLoading(true);
    try {
      const updatedUser = { ...pendingUser, email: initEmail };
      await setDoc(doc(db, 'users', pendingUser.uid), updatedUser);
      localStorage.setItem('tabsar_legajo', pendingUser.legajo);
      setUser(updatedUser);
      setShowEmailInit(false);
      if (updatedUser.role === 'ceo' || updatedUser.role === 'jefe-seguridad' || updatedUser.role === 'supervisor') {
        setCurrentView('executive-dashboard');
      }
    } catch (err) {
      console.error('Init email error:', err);
      setError('Error al inicializar email.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-celeste-warm border-t-transparent shadow-xl shadow-celeste-dark/20" />
          </div>
          <h2 className="text-xl font-bold text-white uppercase tracking-widest">Iniciando Sesión...</h2>
          <p className="mt-2 text-xs text-slate-400 uppercase tracking-wider">Validando credenciales de seguridad</p>
          {isAutoLoggingIn && (
            <button 
              onClick={() => {
                setIsAutoLoggingIn(false);
                setLoading(false);
              }}
              className="mt-8 text-[10px] font-bold text-celeste-warm underline uppercase tracking-widest"
            >
              Cancelar ingreso automático
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(51,65,85,0.05),transparent)] pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md space-y-8 relative z-10"
        >
          <div className="flex justify-center">
            <div className="relative h-40 w-40 overflow-hidden rounded-[40px] shadow-2xl ring-4 ring-white/30 bg-white flex items-center justify-center p-2">
              <Logo />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Rondas de Seguridad</h1>
            <p className="text-slate-700 text-sm font-medium">Sistema de Vigilancia y Control Industrial</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 pt-4">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-red-50 p-4 border border-red-100 flex items-start gap-3 text-left"
              >
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-red-900 uppercase tracking-widest">Error de Acceso</p>
                  <p className="text-[10px] text-red-700 mt-1 leading-relaxed">{error}</p>
                  {error.includes('SAFARI') && (
                    <div className="mt-3 p-2 bg-white rounded-lg border border-red-200">
                      <p className="text-[9px] font-bold text-slate-600">Para abrir en Safari:</p>
                      <p className="text-[9px] text-slate-500 mt-1">Toque el icono de la brújula 🧭 o el botón "Abrir en Safari" en la esquina de su pantalla.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {showEmailInit ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="rounded-2xl bg-blue-50 p-4 border border-blue-100 text-left">
                  <p className="text-xs font-bold text-blue-900">Inicialización de Administrador</p>
                  <p className="text-[10px] text-blue-700 mt-1">Claudia, por favor ingrese su correo electrónico para validar su acceso y gestionar al personal.</p>
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={initEmail}
                    onChange={(e) => setInitEmail(e.target.value)}
                    placeholder="claudia@gmail.com"
                    className="w-full rounded-2xl bg-white/60 backdrop-blur-md py-4 px-6 text-slate-900 focus:outline-none focus:ring-2 focus:ring-celeste-dark/30 border border-white/40 shadow-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleInitializeEmail}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary-gradient px-6 py-5 font-bold text-white shadow-lg shadow-celeste-dark/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                  Validar Mi Cuenta
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailInit(false)}
                  className="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                >
                  Volver
                </button>
              </motion.div>
            ) : (
              <>
                <div className="space-y-4 text-left">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Su DNI</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        required
                        value={dni}
                        onChange={(e) => setDni(e.target.value)}
                        placeholder="Sin puntos ni espacios"
                        className="w-full rounded-2xl bg-white/60 backdrop-blur-md py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 placeholder:text-xs placeholder:font-bold placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-celeste-dark/30 transition-all text-lg font-bold border border-white/40 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Número de Legajo</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input 
                        type={showPassword ? "text" : "password"}
                        required
                        value={legajo}
                        onChange={(e) => setLegajo(e.target.value)}
                        placeholder="Ingrese su Legajo"
                        className="w-full rounded-2xl bg-white/60 backdrop-blur-md py-4 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 placeholder:text-xs placeholder:font-bold placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-celeste-dark/30 transition-all text-center text-lg tracking-[0.3em] font-bold border border-white/40 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-bold text-red-600 bg-red-100 py-3 rounded-xl border border-red-200"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary-gradient px-6 py-5 font-bold text-white shadow-lg shadow-celeste-dark/30 transition-all hover:shadow-xl hover:bg-primary-gradient-hover active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
                  Ingrese a la "APP"
                </button>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-celeste-dark transition-colors"
                  >
                    ¿Problemas con el Legajo? Iniciar con Google
                  </button>
                </div>
              </>
            )}
          </form>

          <div className="pt-8">
            <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">
              §€B∆ DEVELOPMENT
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard user={user!} setView={setCurrentView} />;
      case 'scanner': return <Scanner user={user!} setView={setCurrentView} />;
      case 'reports': return <IncidentReport user={user!} setView={setCurrentView} />;
      case 'qr': return <QRGenerator user={user!} setView={setCurrentView} />;
      case 'profile': return <Profile user={user!} setView={setCurrentView} onLogout={() => setShowLogoutConfirm(true)} />;
      case 'history': return <IncidentHistory user={user!} setView={setCurrentView} />;
      case 'shift-report': return <ShiftReportView user={user!} setView={setCurrentView} />;
      case 'settings': return <SettingsView user={user!} setView={setCurrentView} />;
      case 'users': return <SettingsView user={user!} setView={setCurrentView} initialTab="users" />;
      case 'activity-center': return <ActivityCenter user={user!} setView={setCurrentView} />;
      case 'reviews': return <ReviewReport user={user!} setView={setCurrentView} />;
      case 'admin-panel': return <AdminControlPanel user={user!} setView={setCurrentView} />;
      case 'executive-dashboard': return <ExecutiveDashboard user={user!} setView={setCurrentView} />;
      default: return (['ceo', 'jefe-seguridad', 'supervisor', 'admin'].includes(user!.role)) ? <ExecutiveDashboard user={user!} setView={setCurrentView} /> : <Dashboard user={user!} setView={setCurrentView} />;
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300 overflow-hidden">
      <div className="mx-auto flex h-full w-full custom-app-container flex-col bg-[var(--bg-card)] shadow-2xl relative md:border-x border-[var(--border-main)]">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between bg-[var(--bg-card)] px-6 shadow-[0_1px_10px_rgba(0,0,0,0.02)] border-b border-[var(--border-main)] z-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-xl bg-[var(--bg-card)] p-1 shadow-sm border border-[var(--border-main)]">
              <Logo className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-black text-[var(--text-main)] tracking-tight uppercase">Rondas de Seguridad</h1>
              <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Industrial Monitoring</p>
            </div>
          </div>
          <div className="relative">
            <button 
              onClick={() => setIsNotificationsOpen(true)}
              className="rounded-xl p-2.5 text-[var(--text-muted)] hover:bg-[var(--bg-main)] transition-all active:scale-90 border border-[var(--border-main)]"
            >
              {unreadCount > 0 && (
                <div className="absolute right-2 top-2 flex h-2 w-2 items-center justify-center rounded-full bg-red-500 ring-2 ring-white">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                </div>
              )}
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20 bg-[var(--bg-main)] scroll-smooth custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Notification Center */}
        <NotificationCenter 
          user={user} 
          isOpen={isNotificationsOpen} 
          onClose={() => setIsNotificationsOpen(false)} 
        />

        {/* Logout Confirmation */}
        <ConfirmationModal
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={() => {
            auth.signOut();
            localStorage.removeItem('tabsar_legajo');
            setUser(null);
            setCurrentView('dashboard');
          }}
          title="Cerrar Sesión"
          message="¿Está seguro de que desea salir del sistema? Se perderá cualquier progreso no guardado."
          confirmText="Cerrar Sesión"
          cancelText="Permanecer"
          type="danger"
        />

        {/* PWA Install Banner */}
        <AnimatePresence>
          {showInstallBanner && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-24 left-4 right-4 z-[150] rounded-3xl bg-slate-900 p-5 text-white shadow-2xl border border-white/10"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-500 p-2">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">Instalar Aplicación</p>
                    <p className="text-[10px] text-slate-400">Acceso rápido y mejor rendimiento en su {deviceType}.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowInstallBanner(false)}
                    className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase"
                  >
                    Ahora no
                  </button>
                  <button
                    onClick={handleInstallClick}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20"
                  >
                    Instalar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Navigation */}
        <nav className="shrink-0 bg-celeste-gradient px-2 pb-2 pb-safe pt-1 shadow-[0_-8px_30px_rgba(37,99,235,0.15)] border-t border-white/10">
          <div className="mx-auto flex items-center justify-around gap-0.5">
            <NavButton
              active={currentView === 'dashboard'}
              onClick={() => setCurrentView('dashboard')}
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="MAPA"
            />
            <NavButton
              active={currentView === 'reports'}
              onClick={() => setCurrentView('reports')}
              icon={<ClipboardList className="h-3.5 w-3.5" />}
              label="NOVEDADES"
            />

            <NavButton
              active={currentView === 'reviews'}
              onClick={() => setCurrentView('reviews')}
              icon={<Eye className="h-3.5 w-3.5" />}
              label="REVISIONES"
            />
            
            {/* Main Action Button - Kept same size as requested, adjusted margin for smaller bar */}
            {!['ceo', 'jefe-seguridad', 'supervisor', 'admin'].includes(user.role) && (
              <div className="-mt-10 flex flex-col items-center">
                <button
                  onClick={() => setCurrentView('scanner')}
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-2xl transition-all active:scale-90 ${
                    currentView === 'scanner' 
                    ? 'bg-white text-blue-700 shadow-white/40' 
                    : 'bg-white text-blue-500 shadow-white/20'
                  }`}
                >
                  <Scan className="h-6 w-6" />
                </button>
                <span className={`mt-1 text-[7px] font-black uppercase tracking-widest ${currentView === 'scanner' ? 'text-white' : 'text-white/70'}`}>
                  ESCANEO
                </span>
              </div>
            )}

            {(['ceo', 'jefe-seguridad', 'supervisor', 'admin'].includes(user.role)) && (
              <NavButton
                active={currentView === 'executive-dashboard'}
                onClick={() => setCurrentView('executive-dashboard')}
                icon={<BarChart3 className="h-3.5 w-3.5" />}
                label="RESUMEN"
              />
            )}

            {(user.role === 'admin' || user.role === 'supervisor' || user.role === 'ceo' || user.role === 'jefe-seguridad') && (
              <NavButton
                active={currentView === 'activity-center'}
                onClick={() => setCurrentView('activity-center')}
                icon={<Activity className="h-3.5 w-3.5" />}
                label="CENTRO"
              />
            )}
            
            <NavButton
              active={currentView === 'profile'}
              onClick={() => setCurrentView('profile')}
              icon={<User className="h-3.5 w-3.5" />}
              label="PERFIL"
            />
          </div>
        </nav>
        <div className="bg-[var(--bg-card)] py-1 text-center border-t border-[var(--border-main)]">
          <p className="text-[6px] font-black text-[var(--text-muted)] tracking-[0.3em] uppercase">
            §€B∆ DEVELOPMENT
          </p>
        </div>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-1 py-0.5 transition-all ${
        active ? 'text-white' : 'text-white/60'
      }`}
    >
      <div className={`rounded-lg p-1 transition-colors ${active ? 'bg-white/20' : ''}`}>
        {icon}
      </div>
      <span className="text-[7px] font-black tracking-widest uppercase">{label}</span>
    </button>
  );
}
