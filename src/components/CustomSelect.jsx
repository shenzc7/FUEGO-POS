import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const CustomSelect = ({ options, value, onChange, label, className, name }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  
  const selectedOption = options.find(opt => opt.id === value) || options[0];

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
      {label && <label className="block text-[10px] font-black text-[var(--fuego-text-muted)] uppercase tracking-widest mb-1.5 ml-1">{label}</label>}
      
      <input type="hidden" name={name} value={value} />

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-xl py-3 px-4 flex items-center justify-between text-sm font-bold text-[var(--fuego-text)] hover:border-fuego-orange transition-all duration-300 shadow-sm"
      >
        <span className="truncate">{selectedOption.name}</span>
        <ChevronDown 
          size={16} 
          className={cn("text-[var(--fuego-text-muted)] transition-transform duration-300", isOpen && "rotate-180")} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-[100] w-full mt-2 bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-xl shadow-2xl overflow-hidden py-1 backdrop-blur-xl"
          >
            {options.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full px-4 py-3 flex items-center justify-between text-sm transition-all",
                    value === option.id 
                      ? "bg-fuego-orange text-white" 
                      : "text-[var(--fuego-text-muted)] hover:bg-[var(--fuego-text)]/5 hover:text-[var(--fuego-text)]"
                  )}
                >
                  <span className="font-bold">{option.name}</span>
                  {value === option.id && <Check size={14} />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};
