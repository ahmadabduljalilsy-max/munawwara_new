import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-surface w-full max-w-md rounded-2xl shadow-2xl border border-border p-6 overflow-hidden"
            dir="rtl"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-text-main mb-1">{title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  {message} {itemName && <span className="font-black text-red-600">({itemName})</span>}
                </p>
                <div className="mt-2 p-3 bg-red-50/50 rounded-xl border border-red-100/50">
                  <p className="text-[11px] text-red-700 font-bold">هذا الإجراء لا يمكن التراجع عنه وسيتم حذف البيانات نهائياً من قاعدة البيانات.</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1 hover:bg-background rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-2.5 rounded-xl transition-all shadow-lg shadow-red-200 active:scale-95"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-background hover:bg-slate-50 text-text-main font-bold py-2.5 rounded-xl border border-border transition-all active:scale-95"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
