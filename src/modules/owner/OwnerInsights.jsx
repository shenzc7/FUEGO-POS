import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Calendar as CalendarIcon, 
  Wallet, 
  Smartphone, 
  BarChart3,
  Flame,
  LogOut,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { buildFinancialSummary } from '../../utils/finance';

const formatCurrency = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
};

const getLocalYYYYMMDD = (d) => {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const yr = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const da = String(date.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
};

export const OwnerInsights = () => {
  const { orders } = usePOS();
  const { logout } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getLocalYYYYMMDD(new Date()));

  const summary = useMemo(() => {
    // Stress test: Filter using local timezone comparison instead of UTC string prefix
    const dayOrders = (orders || []).filter(o => o.timestamp && getLocalYYYYMMDD(o.timestamp) === selectedDate);
    const financial = buildFinancialSummary(dayOrders, []);
    
    return {
      orderCount: dayOrders.length,
      total: dayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      cashTotal: financial.cashTotal,
      upiTotal: financial.upiTotal,
    };
  }, [orders, selectedDate]);

  const changeDate = (days) => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + days);
    setSelectedDate(getLocalYYYYMMDD(d));
  };

  const displayDate = useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 pb-12 overflow-y-auto font-sans selection:bg-fuego-orange/30">
      <div className="max-w-md mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-fuego-orange rounded-xl flex items-center justify-center shadow-lg shadow-fuego-orange/20">
                <Flame size={24} className="text-white" />
             </div>
             <div>
                <h1 className="text-2xl font-black tracking-tight">DASHBOARD</h1>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-fuego-orange/60">Owner Analytics</p>
             </div>
          </div>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (window.confirm('Are you sure you want to log out?')) {
                logout();
              }
            }}
            className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500"
            title="Log Out"
          >
            <LogOut size={18} />
          </motion.button>
        </header>

        {/* Date Selector */}
        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-2 mb-8 flex items-center justify-between">
          <button 
            onClick={() => changeDate(-1)}
            className="w-12 h-12 rounded-2xl hover:bg-white/5 flex items-center justify-center text-white/40 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex flex-col items-center flex-1 relative">
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer z-20"
            />
            <div className="flex items-center gap-2 text-fuego-orange mb-0.5">
               <CalendarIcon size={12} />
               <span className="text-[9px] font-black uppercase tracking-widest">Select Date</span>
            </div>
            <span className="text-sm font-bold tracking-tight">{displayDate}</span>
          </div>

          <button 
            onClick={() => changeDate(1)}
            className="w-12 h-12 rounded-2xl hover:bg-white/5 flex items-center justify-center text-white/40 transition-colors"
          >
            <ArrowRight size={20} />
          </button>
        </div>

        {/* Main Summary Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.05, y: -10 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-fuego-orange/20 blur-[100px] rounded-full opacity-30" />
            
            <div className="relative bg-[#141414] border border-white/10 rounded-[3rem] p-10 shadow-2xl overflow-hidden">
               {/* Background stats icon */}
               <BarChart3 size={180} className="absolute -right-12 -bottom-12 text-white/[0.02] -rotate-12 pointer-events-none" />

               <div className="text-center mb-10">
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-3">Total Revenue</p>
                 <h2 className="text-6xl font-black font-mono tracking-tighter text-white">
                   {formatCurrency(summary.total)}
                 </h2>
                 <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/5 rounded-full mt-6">
                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", summary.orderCount > 0 ? "bg-fuego-orange" : "bg-white/20")} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                      {summary.orderCount > 0 ? `${summary.orderCount} Orders Finalized` : 'No Sales Recorded'}
                    </span>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                       <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                          <Wallet size={16} />
                       </div>
                       <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Cash</span>
                    </div>
                    <p className="text-xl font-bold font-mono text-white">{formatCurrency(summary.cashTotal)}</p>
                  </div>

                  <div className="bg-white/5 border border-white/5 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                       <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                          <Smartphone size={16} />
                       </div>
                       <span className="text-[9px] font-black uppercase tracking-widest text-white/40">UPI</span>
                    </div>
                    <p className="text-xl font-bold font-mono text-white">{formatCurrency(summary.upiTotal)}</p>
                  </div>
               </div>
            </div>
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
};
