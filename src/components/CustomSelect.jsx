import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const CustomSelect = ({ options, value, onChange, label, className, name, placeholder = "Select option..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  
  const selectedOption = options.find(opt => opt.id === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-black text-[var(--fuego-text-muted)] uppercase tracking-[0.25em] mb-2.5 ml-1 opacity-80">
          {label}
        </label>
      )}
      
      <input type="hidden" name={name} value={value} />

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "group w-full bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-2xl py-4 px-6 flex items-center justify-between text-sm font-semibold transition-all duration-300 shadow-sm backdrop-blur-md",
          isOpen 
            ? "border-fuego-orange/50 ring-4 ring-fuego-orange/10 bg-[var(--fuego-bg)]" 
            : "hover:border-fuego-orange/30 hover:bg-[var(--fuego-bg)]/50"
        )}

      >
        <span className={cn(
          "truncate tracking-tight",
          selectedOption ? "text-[var(--fuego-text)]" : "text-[var(--fuego-text-muted)] opacity-50"
        )}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500",
          isOpen ? "bg-fuego-orange text-white rotate-180 shadow-lg shadow-fuego-orange/20" : "bg-[var(--fuego-bg)] text-[var(--fuego-text-muted)] group-hover:bg-fuego-orange/10 group-hover:text-fuego-orange"
        )}>
          <ChevronDown size={14} strokeWidth={3} />
        </div>

      </button>


      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for focus */}
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[90] bg-transparent"
               onClick={() => setIsOpen(false)}
            />
            
            <motion.ul
              initial={{ opacity: 0, scale: 0.95, y: -10, filter: 'blur(20px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, y: -10, filter: 'blur(20px)' }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="absolute z-[100] left-0 right-0 mt-3 p-2 deep-glass overflow-hidden"
            >
              <div className="max-h-[240px] overflow-y-auto no-scrollbar space-y-1">
                {options.map((option, idx) => (
                  <motion.li 
                    key={option.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onChange(option.id);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full px-4 py-3.5 flex items-center gap-3 rounded-xl transition-all duration-200 group/item",
                        value === option.id 
                          ? "bg-fuego-orange text-white shadow-lg shadow-fuego-orange/20" 
                          : "text-[var(--fuego-text-muted)] hover:bg-[var(--fuego-bg)] hover:text-[var(--fuego-text)]"
                      )}

                    >
                      <div className="flex-1 text-left">
                        <span className={cn(
                          "text-xs font-bold uppercase tracking-wider transition-all",
                          value === option.id ? "text-white" : "text-[var(--fuego-text)] group-hover/item:translate-x-1"
                        )}>
                          {option.name}
                        </span>
                      </div>


                      {value === option.id && (
                        <motion.div 
                          layoutId="check-icon"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          <Check size={16} strokeWidth={3} />
                        </motion.div>
                      )}
                    </button>
                  </motion.li>
                ))}
              </div>
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
