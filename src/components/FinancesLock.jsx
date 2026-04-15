import React, { useState, useEffect } from 'react';
import { Lock, Delete, X, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const FinancesLock = ({ onUnlock, pincode }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (input.length === 4) {
      if (input === pincode) {
        onUnlock();
      } else {
        setError(true);
        // Haptic-like vibration or shake effect
        setTimeout(() => {
          setInput('');
          setError(false);
        }, 600);
      }
    }
  }, [input, pincode, onUnlock]);

  const handleNumberClick = (num) => {
    if (input.length < 4) {
      setInput(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setInput(prev => prev.slice(0, -1));
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
      {/* Dynamic Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-fuego-dark/60 backdrop-blur-md" 
      />

      {/* Modal Box */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-[340px] bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-[2.5rem] shadow-2xl p-8 overflow-hidden transition-colors duration-300"
      >
        {/* Subtle Background Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-fuego-orange/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative space-y-8">
          <div className="text-center space-y-3">
            <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${
              error ? 'bg-red-500/10 text-red-500 shadow-lg shadow-red-500/20' : 'bg-fuego-orange/10 text-fuego-orange shadow-lg shadow-fuego-orange/10'
            }`}>
              <AnimatePresence mode="wait">
                {error ? (
                  <motion.div key="error" initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0.5 }}>
                    <AlertCircle size={28} />
                  </motion.div>
                ) : (
                  <motion.div key="lock" initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0.5 }}>
                    <Lock size={28} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--fuego-text)] tracking-tight">Access Control</h2>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--fuego-text-muted)] mt-1">
                {error ? 'Signature Mismatch' : 'Authentication Required'}
              </p>
            </div>
          </div>

          {/* PIN Indicators */}
          <div className="flex justify-center gap-4 py-2">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                animate={error ? { x: [0, -4, 4, -4, 4, 0] } : {}}
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
                  i < input.length
                    ? 'bg-fuego-orange border-fuego-orange shadow-[0_0_12px_rgba(234,88,12,0.4)]'
                    : 'border-[var(--fuego-border)]'
                } ${error ? 'border-red-500 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]' : ''}`}
              />
            ))}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num.toString())}
                className="h-14 rounded-2xl bg-[var(--fuego-bg)] border border-[var(--fuego-border)] text-lg font-bold text-[var(--fuego-text)] hover:border-fuego-orange/30 hover:bg-fuego-orange/5 transition-all active:scale-[0.85] active:bg-fuego-orange active:text-white group"
              >
                <span className="group-active:scale-125 transition-transform inline-block">{num}</span>
              </button>
            ))}
            <div className="flex items-center justify-center">
              <ShieldCheck size={20} className="text-[var(--fuego-text-muted)] opacity-20" />
            </div>
            <button
              onClick={() => handleNumberClick('0')}
              className="h-14 rounded-2xl bg-[var(--fuego-bg)] border border-[var(--fuego-border)] text-lg font-bold text-[var(--fuego-text)] hover:border-fuego-orange/30 hover:bg-fuego-orange/5 transition-all active:scale-[0.85] active:bg-fuego-orange active:text-white group"
            >
              <span className="group-active:scale-125 transition-transform inline-block">0</span>
            </button>
            <button
              onClick={handleDelete}
              className="h-14 rounded-2xl bg-[var(--fuego-bg)] border border-[var(--fuego-border)] flex items-center justify-center text-[var(--fuego-text-muted)] hover:text-red-500 hover:bg-red-500/5 transition-all active:scale-[0.85] active:bg-red-500 active:text-white"
              title="Backspace"
            >
              <Delete size={20} />
            </button>
          </div>

          <div className="pt-2 text-center">
            <p className="text-[10px] text-[var(--fuego-text-muted)] italic opacity-60">
              Only authorized staff can access financial manifests.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
