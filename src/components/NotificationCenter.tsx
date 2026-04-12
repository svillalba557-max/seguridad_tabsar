import React, { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot, doc, updateDoc, orderBy, limit, auth } from '../lib/firebase';
import { UserProfile, Notification } from '../types';
import { Bell, X, AlertTriangle, Shield, ClipboardList, Info, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificationCenterProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ user, isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user || !auth.currentUser) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(newNotifications);
    }, (err) => {
      console.warn('Notifications snapshot error:', err);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    const promises = unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true }));
    await Promise.all(promises);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'incident': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'patrol': return <Shield className="h-5 w-5 text-blue-500" />;
      case 'alert': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default: return <Info className="h-5 w-5 text-slate-500" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-sm bg-white shadow-2xl"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-slate-900" />
                  <h2 className="text-lg font-bold text-slate-900">Notificaciones</h2>
                </div>
                <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {notifications.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                    <Bell className="mb-4 h-12 w-12 opacity-20" />
                    <p className="font-medium">No hay notificaciones</p>
                    <p className="text-xs">Te avisaremos cuando ocurra algo importante.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button 
                      onClick={markAllAsRead}
                      className="mb-2 w-full text-right text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      Marcar todas como leídas
                    </button>
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`relative rounded-2xl border p-4 transition-all ${
                          notification.read ? 'bg-white border-slate-100' : 'bg-blue-50/50 border-blue-100'
                        }`}
                      >
                        {!notification.read && (
                          <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-blue-500" />
                        )}
                        <div className="flex gap-4">
                          <div className={`rounded-xl p-2 h-fit ${
                            notification.type === 'incident' ? 'bg-red-50' : 
                            notification.type === 'patrol' ? 'bg-blue-50' : 'bg-slate-50'
                          }`}>
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-bold text-slate-900">{notification.title}</p>
                            <p className="text-xs text-slate-500 leading-relaxed">{notification.message}</p>
                            <div className="flex items-center justify-between pt-2">
                              <p className="text-[10px] font-medium text-slate-400">
                                {notification.timestamp?.toDate ? 
                                  formatDistanceToNow(notification.timestamp.toDate(), { addSuffix: true, locale: es }) : 
                                  'Recién ahora'}
                              </p>
                              {!notification.read && (
                                <button 
                                  onClick={() => markAsRead(notification.id)}
                                  className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase tracking-wider"
                                >
                                  <Check className="h-3 w-3" />
                                  Leído
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
