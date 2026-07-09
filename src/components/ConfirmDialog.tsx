import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-primary w-full max-w-sm rounded-2xl p-6 shadow-xl"
          >
            <h3 className="text-lg font-bold text-primary mb-2">{title}</h3>
            <p className="text-sm text-secondary mb-6">{message}</p>
            <div className="flex gap-3">
              <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-secondary text-primary font-medium active:bg-gray-200">
                取消
              </button>
              <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-danger text-white font-medium active:bg-red-600">
                确认删除
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
