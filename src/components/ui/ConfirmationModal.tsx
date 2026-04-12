import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'info'
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-6 top-6 rounded-full p-2 text-slate-400 hover:bg-slate-100 transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-3xl ${
                type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-celeste-light text-celeste-dark'
              }`}>
                <AlertTriangle className="h-10 w-10" />
              </div>

              <h3 className="mb-2 text-2xl font-black text-slate-900 uppercase tracking-tight">
                {title}
              </h3>
              <p className="mb-8 text-sm font-medium text-slate-500 leading-relaxed">
                {message}
              </p>

              <div className="flex w-full flex-col gap-3">
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`w-full rounded-2xl py-4 font-bold text-white shadow-lg transition-all active:scale-95 ${
                    type === 'danger' 
                      ? 'bg-red-500 shadow-red-200 hover:bg-red-600' 
                      : 'bg-primary-gradient shadow-celeste-dark/20'
                  }`}
                >
                  {confirmText}
                </button>
                <button
                  onClick={onClose}
                  className="w-full rounded-2xl bg-slate-100 py-4 font-bold text-slate-500 transition-all hover:bg-slate-200 active:scale-95"
                >
                  {cancelText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
