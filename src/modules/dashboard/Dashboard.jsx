import React, { useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { 
  BarChart3, 
  Wallet, 
  Smartphone, 
  AlertCircle, 
  TrendingUp,
  Package,
  Calendar,
  ChevronRight,
  Landmark,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { buildFinancialSummary } from '../../utils/finance';

const formatValue = (val, isCurrency = true) => {
  const num = Number(val);
  if (!Number.isFinite(num)) {
    return isCurrency ? '0.00' : '0';
  }
  
  if (num >= 100000) {
    return (num / 100000).toFixed(2) + ' L';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + ' K';
  }
  return isCurrency ? num.toFixed(2) : num.toString();
};

const StatCard = ({ label, value, icon: Icon, colorClass, trend, onClick }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -5 }}
    onClick={onClick}
    className={cn(
      "stat-card-base p-6 group relative flex flex-col justify-between min-h-[140px] cursor-pointer active:scale-95 overflow-hidden",
      onClick && "ring-2 ring-fuego-orange/0 hover:ring-fuego-orange/20 transition-all"
    )}
  >
    <div className="relative z-10 flex justify-between items-start">
      <div className={cn("p-4 rounded-2xl bg-[var(--fuego-card)] border-2 border-[var(--fuego-border)] shadow-sm group-hover:border-fuego-orange transition-all", colorClass)}>
        <Icon size={24} strokeWidth={2.5} />
      </div>
      {trend && (
        <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border-2 border-emerald-500/20 shadow-sm">
          <TrendingUp size={12} />
          {trend}%
        </div>
      )}
    </div>
    
    <div className="mt-6 relative z-10">
      <p className="text-[var(--fuego-text-muted)] text-[9px] font-black uppercase tracking-[0.35em] mb-2 opacity-60">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-black text-[var(--fuego-text-muted)] tracking-tighter italic opacity-40">₹</span>
        <h3 className="text-4xl font-black font-mono text-[var(--fuego-text)] tracking-tighter tabular-nums leading-none">
          {formatValue(value)}
        </h3>
      </div>
    </div>

    {/* Background Decorative Element */}
    <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-[var(--fuego-text)] transform rotate-12 group-hover:opacity-[0.06] transition-all duration-700 pointer-events-none">
       <Icon size={140} strokeWidth={1} />
    </div>
  </motion.div>
);

export const Dashboard = () => {
  const { orders, ledgerAdjustments, setSettlementOrder, setIsPaymentModalOpen, financeServerSummary } = usePOS();
  const [salesView, setSalesView] = React.useState('today'); // 'today' | 'monthly' | 'yearly'

  // Stats Logic
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const thisMonthStr = now.toISOString().substring(0, 7);
  const thisYearStr = now.toISOString().substring(0, 4);

  const stats = useMemo(() => {
    const todayOrders = (orders || []).filter(o => o.timestamp && o.timestamp.startsWith(todayStr));
    const monthlyOrders = (orders || []).filter(o => o.timestamp && o.timestamp.startsWith(thisMonthStr));
    const yearlyOrders = (orders || []).filter(o => o.timestamp && o.timestamp.startsWith(thisYearStr));
    const todayFinancials = buildFinancialSummary(todayOrders, []);
    const lifetimeFinancials = buildFinancialSummary(orders || [], ledgerAdjustments || []);

    const totalSalesToday = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const totalSalesMonthly = monthlyOrders.reduce((sum, o) => sum + o.total, 0);
    const totalSalesYearly = yearlyOrders.reduce((sum, o) => sum + o.total, 0);

    const cashCollected = todayFinancials.cashTotal;
    const upiCollected = todayFinancials.upiTotal;
    const pendingDues = (orders || []).reduce((sum, o) => sum + (o.payment?.due || 0), 0);

    const lifetimeStats = financeServerSummary ?? {
      cashTotal: lifetimeFinancials.cashTotal,
      upiTotal: lifetimeFinancials.upiTotal,
    };

    return { 
      totalSalesToday, 
      totalSalesMonthly, 
      totalSalesYearly,
      cashCollected, 
      upiCollected,
      pendingDues, 
      cashInHand: lifetimeStats.cashTotal,
      upiBalance: lifetimeStats.upiTotal,
      orderCount: todayOrders.length 
    };
  }, [orders, ledgerAdjustments, todayStr, thisMonthStr, thisYearStr]);

  const topItems = useMemo(() => {
    const todayOrders = (orders || []).filter(o => o.timestamp && o.timestamp.startsWith(todayStr));
    const counts = {};
    todayOrders.forEach(order => {
      order.items.forEach(item => {
        counts[item.name] = (counts[item.name] || 0) + item.quantity;
      });
    });
    
    const totalItemsSold = Object.values(counts).reduce((a, b) => a + b, 0);
    
    return Object.entries(counts)
      .map(([name, count]) => ({ 
        name, 
        count, 
        percentage: totalItemsSold > 0 ? Math.round((count / totalItemsSold) * 100) : 0 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [orders, todayStr]);
  
  const topCustomers = useMemo(() => {
    const customers = {};
    orders.forEach(order => {
      if (order.customerName || order.customerPhone) {
        const key = order.customerPhone || order.customerName;
        if (!customers[key]) {
          customers[key] = { 
            name: order.customerName || 'Anonymous', 
            phone: order.customerPhone || 'N/A',
            totalSpent: 0, 
            orderCount: 0 
          };
        }
        customers[key].totalSpent += order.total;
        customers[key].orderCount += 1;
      }
    });
    
    return Object.values(customers)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 3);
  }, [orders]);

  const scrollToSettlements = () => {
    const el = document.getElementById('pending-settlements');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const { setActiveView } = usePOS();

  const toggleSalesView = () => {
    const views = ['today', 'monthly', 'yearly'];
    const nextView = views[(views.indexOf(salesView) + 1) % views.length];
    setSalesView(nextView);
  };

  const currentSalesValue = salesView === 'today' ? stats.totalSalesToday : salesView === 'monthly' ? stats.totalSalesMonthly : stats.totalSalesYearly;
  const currentSalesLabel = salesView === 'today' ? "Daily Sales" : salesView === 'monthly' ? "Monthly Sales" : "Annual Sales";

  const todayOrders = (orders || []).filter(o => o.timestamp && o.timestamp.startsWith(todayStr));

  const hourlySales = useMemo(() => {
    // Build a full 24-slot map and populate from actual orders.
    const map = Array.from({ length: 24 }, (_, i) => ({ hour: i, total: 0 }));
    todayOrders.forEach((o) => {
      const hour = new Date(o.timestamp).getHours();
      if (hour >= 0 && hour < 24) map[hour].total += o.total;
    });

    // Show only the window where there is (or could be) activity.
    // Default: 8 AM – 11 PM. If orders exist outside this range, widen.
    const activeHours = map.filter((h) => h.total > 0).map((h) => h.hour);
    const earliest = activeHours.length > 0 ? Math.min(...activeHours) : 8;
    const latest   = activeHours.length > 0 ? Math.max(...activeHours) : 22;
    const start = Math.min(earliest, 8);
    const end   = Math.max(latest, 22);

    return map.slice(start, end + 1);
  }, [todayOrders]);

  const maxHourlySale = Math.max(...hourlySales.map(h => Number(h.total) || 0), 1);

  return (
    <div className="h-screen overflow-y-auto bg-[var(--fuego-bg)] p-6 transition-colors duration-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-fuego-orange mb-2">Internal Analytics</h2>
          <h1 className="text-4xl font-bold font-logo text-[var(--fuego-text)]">Sales Overview</h1>
        </div>
        <div className="flex items-center gap-3 bg-[var(--fuego-card)] rounded-2xl px-5 py-2.5 border border-[var(--fuego-border)] shadow-sm">
          <Calendar size={16} className="text-fuego-orange" />
          <span className="font-bold text-xs tracking-tight text-[var(--fuego-text)]">
            {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          label={currentSalesLabel} 
          value={currentSalesValue} 
          icon={BarChart3} 
          colorClass="text-fuego-orange" 
          trend={salesView === 'today' ? 12 : null} 
          onClick={toggleSalesView}
        />
        <StatCard label="Cash On-Hand" value={stats.cashCollected} icon={Wallet} colorClass="text-emerald-500" />
        <StatCard label="UPI Transactions" value={stats.upiCollected} icon={Smartphone} colorClass="text-blue-500" />
        <StatCard 
          label="Unpaid Dues" 
          value={stats.pendingDues} 
          icon={AlertCircle} 
          colorClass="text-red-500" 
          onClick={scrollToSettlements}
        />
      </div>      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
        <motion.div 
          onClick={() => setActiveView('Accounts')}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 group relative overflow-hidden bg-gradient-to-br from-fuego-orange/15 to-[var(--fuego-card)] border border-fuego-orange/20 rounded-3xl p-8 cursor-pointer hover:border-fuego-orange/50 transition-all shadow-2xl"
        >
           <div className="flex justify-between items-start mb-10 relative z-10">
              <div className="p-5 rounded-3xl bg-[var(--fuego-bg)] border border-fuego-orange/20 text-fuego-orange shadow-lg">
                <Landmark size={32} />
              </div>
              <div className="flex items-center gap-2 text-[11px] font-black text-fuego-orange uppercase tracking-[0.25em] bg-fuego-orange/10 px-4 py-2 rounded-full border border-fuego-orange/20 group-hover:bg-fuego-orange group-hover:text-white transition-all">
                Finances <ChevronRight size={14} />
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-16 relative z-10">
              <div>
                <p className="text-[var(--fuego-text-muted)] text-[11px] font-black uppercase tracking-[0.3em] mb-3">Cash Balance</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-fuego-orange/60 font-mono italic">₹</span>
                  <h3 className="text-5xl font-bold font-mono text-[var(--fuego-text)] tracking-tighter tabular-nums leading-none">{formatValue(stats.cashInHand)}</h3>
                </div>
              </div>
              <div>
                <p className="text-[var(--fuego-text-muted)] text-[11px] font-black uppercase tracking-[0.3em] mb-3">UPI Balance</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-blue-500/60 font-mono italic">₹</span>
                  <h3 className="text-5xl font-bold font-mono text-[var(--fuego-text)] tracking-tighter tabular-nums leading-none">{formatValue(stats.upiBalance)}</h3>
                </div>
              </div>
           </div>
           <div className="absolute right-0 bottom-0 opacity-10 text-fuego-orange translate-x-1/4 translate-y-1/4 group-hover:scale-110 transition-transform duration-1000">
              <Landmark size={400} />
           </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="stat-card-base p-8 flex flex-col justify-between relative overflow-hidden group border border-fuego-orange/10"
        >
           <div className="absolute top-0 left-0 w-2 h-full bg-fuego-orange/40" />
           <div>
             <p className="text-[var(--fuego-text-muted)] text-[11px] font-black uppercase tracking-[0.3em] mb-4">Sales Trend</p>
             <h3 className="text-2xl font-bold text-[var(--fuego-text)] mb-6 flex items-center gap-3">
               Today&apos;s Velocity
             </h3>
           </div>
           
           <div className="flex-1 flex items-end gap-2 h-32 mb-4">
              {hourlySales.map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group/bar">
                  <div className="relative w-full flex flex-col justify-end h-24">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${(item.total / maxHourlySale) * 100}%` }}
                      className="w-full bg-fuego-orange/10 rounded-t-lg group-hover/bar:bg-fuego-orange/30 transition-colors relative border-t border-x border-fuego-orange/20"
                    >
                      {item.total > 0 && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-fuego-orange opacity-0 group-hover/bar:opacity-100 transition-opacity">
                          ₹{Math.round(item.total)}
                        </div>
                      )}
                    </motion.div>
                  </div>
                  <span className="text-[8px] font-black text-[var(--fuego-text-muted)] uppercase">
                    {item.hour === 0 ? '12AM' : item.hour === 12 ? '12PM' : item.hour > 12 ? `${item.hour - 12}PM` : `${item.hour}AM`}
                  </span>
                </div>
              ))}
           </div>

           <div className="pt-6 border-t border-[var(--fuego-border)]">
              <div className="flex justify-between items-center text-[10px] font-black text-fuego-orange uppercase tracking-widest">
                <span>Peak Volume</span>
                <span>{stats.orderCount} orders today</span>
              </div>
           </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 stat-card-base overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[var(--fuego-border)] flex items-center justify-between bg-[var(--fuego-bg)]/30 backdrop-blur-md">
            <h2 className="text-xl font-bold text-[var(--fuego-text)] flex items-center gap-4">
               Recent Sales
               <div className="h-1 w-12 bg-fuego-orange/20 rounded-full" />
            </h2>
            <span className="text-[10px] bg-fuego-orange/10 text-fuego-orange border border-fuego-orange/20 px-5 py-2 rounded-full font-black uppercase tracking-[0.3em] font-mono">{formatValue(stats.orderCount, false)} Orders Today</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--fuego-card)] text-[10px] text-[var(--fuego-text-muted)] uppercase font-black tracking-[0.2em] border-b border-[var(--fuego-border)]">
                  <th className="p-6">Order ID</th>
                  <th className="p-6">Status</th>
                  <th className="p-6">Method</th>
                  <th className="p-6 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--fuego-border)]">
                {todayOrders.slice(0, 5).map(o => (
                  <tr key={o.id} className="hover:bg-[var(--fuego-card)] transition-colors group">
                    <td className="p-6 text-xs font-mono text-[var(--fuego-text)]">#{o.id ? String(o.id).split('-').pop() : 'N/A'}</td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          o.payment?.status === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500'
                        )} />
                        <span className="text-[10px] font-black uppercase text-[var(--fuego-text)]">{o.payment?.status}</span>
                      </div>
                    </td>
                    <td className="p-6">
                       <span className="text-[11px] font-bold text-[var(--fuego-text-muted)]">
                         {o.payment?.method === 'Split' 
                           ? `Split (${(o.payment.splits || []).map(s => s.method).join(' + ')})`
                           : o.payment?.method || 'N/A'}
                       </span>
                    </td>
                    <td className="p-6 text-right text-sm font-bold font-mono text-[var(--fuego-text)]">₹{o.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {/* Most Sold Items Summary */}
          <div className="stat-card-base p-8">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-[var(--fuego-text-muted)] mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp size={16} className="text-fuego-orange" />
                Top Selling Items
              </div>
              <span className="text-[9px] opacity-50">Top Moving</span>
            </h2>
            <div className="space-y-8">
              {topItems.map((item) => (
                <div key={item.name} className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-black uppercase tracking-widest text-[var(--fuego-text)]">{item.name}</span>
                    <span className="text-[11px] font-mono font-bold text-fuego-orange">{item.percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--fuego-bg)] rounded-full overflow-hidden border border-[var(--fuego-border)]">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ duration: 1.5, ease: "circOut" }}
                      className="h-full bg-gradient-to-r from-fuego-orange to-fuego-orange/60 rounded-full"
                    />
                  </div>
                </div>
              ))}
              {topItems.length === 0 && <p className="text-center text-[10px] text-[var(--fuego-text-muted)] uppercase font-black py-8">Awaiting sales data...</p>}
            </div>
          </div>

          {/* Top Customers Summary - Fixed gaps */}
          <div className="stat-card-base p-8 flex flex-col">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--fuego-text-muted)] mb-8 flex items-center gap-2">
              <Users size={16} className="text-fuego-orange" />
              Top Customers
            </h2>
            <div className="space-y-6">
              {topCustomers.map((customer, idx) => (
                <div key={idx} className="flex items-center justify-between p-5 bg-[var(--fuego-bg)]/50 rounded-3xl border border-[var(--fuego-border)] hover:border-fuego-orange/30 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-fuego-orange text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-fuego-orange/20 rotate-3 group-hover:rotate-0 transition-transform">
                      {customer.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-black text-[var(--fuego-text)] uppercase tracking-wider">{customer.name}</p>
                      <p className="text-[10px] text-[var(--fuego-text-muted)] font-mono font-medium mt-0.5">{customer.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono text-[var(--fuego-text)] tabular-nums">₹{customer.totalSpent.toFixed(0)}</p>
                    <p className="text-[9px] text-fuego-orange uppercase font-black tracking-widest mt-1">{customer.orderCount} Orders</p>
                  </div>
                </div>
              ))}
              {topCustomers.length === 0 && <p className="text-center text-[10px] text-[var(--fuego-text-muted)] uppercase font-black py-8 italic opacity-50">High-value clientele pending.</p>}
            </div>
          </div>
        </div>
      </div>

      <div id="pending-settlements" className="mt-12 stat-card-base overflow-hidden border border-red-500/10 shadow-2xl">
        <div className="p-8 border-b border-[var(--fuego-border)] flex items-center justify-between bg-gradient-to-r from-red-500/5 to-transparent">
          <div>
            <h2 className="text-xl font-bold text-[var(--fuego-text)]">Unpaid Orders</h2>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-red-500/70 mt-2 font-mono">Awaiting Payments</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm">
              {orders.filter(o => o.payment?.status === 'Pending').length} Pending
            </span>
            <p className="text-[9px] text-[var(--fuego-text-muted)] font-black uppercase tracking-widest">Settlement Required</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--fuego-card)] text-[10px] text-[var(--fuego-text-muted)] uppercase font-black tracking-[0.2em] border-b border-[var(--fuego-border)]">
                <th className="p-8">Order #</th>
                <th className="p-8">Items</th>
                <th className="p-8 text-right">Balance Due</th>
                <th className="p-8 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--fuego-border)]">
              {orders.filter(o => o.payment?.status === 'Pending').map(o => (
                <tr key={o.id} className="group hover:bg-[var(--fuego-card)] transition-colors">
                  <td className="p-8">
                    <span className="text-xs font-mono font-bold text-[var(--fuego-text)]">#{o.id.split('-').pop()}</span>
                  </td>
                  <td className="p-8">
                    <span className="text-[10px] font-black uppercase text-[var(--fuego-text-muted)]">{o.items.length} units • Liquidation pending</span>
                  </td>
                  <td className="p-8 text-right">
                    <span className="text-sm font-bold text-red-500 font-mono">₹{o.payment?.due?.toFixed(2)}</span>
                  </td>
                  <td className="p-8 text-right">
                    <button 
                       onClick={() => {
                         setSettlementOrder(o);
                         setIsPaymentModalOpen(true);
                       }}
                       className="px-8 py-3 bg-red-500 text-white text-[10px] font-black uppercase rounded-2xl hover:brightness-110 shadow-xl shadow-red-500/20 transition-all active:scale-95 tracking-widest"
                    >
                      Receive Payment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.filter(o => o.payment?.status === 'Pending').length === 0 && (
            <div className="p-20 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--fuego-text-muted)]">Clear Balance Sheet: All entries finalized.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
