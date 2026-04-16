import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { Search, Download, User, Phone, ShoppingBag, Calendar } from 'lucide-react';
import { exportToCSV } from '../../utils/exportUtils';
import { motion } from 'framer-motion';

export const Customers = () => {
  const { customers: customerList } = usePOS();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customerList.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const handleExport = () => {
    const exportData = filteredCustomers.map(c => ({
      'Customer Name': c.name,
      'Phone Number': c.phone,
      'Total Orders': c.orderCount,
      'Total Spent (₹)': c.totalSpent.toFixed(2),
      'First Order': new Date(c.firstOrderDate).toLocaleDateString(),
      'Last Order': new Date(c.lastOrderDate).toLocaleDateString()
    }));
    exportToCSV(exportData, `customer_database_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--fuego-bg)] p-8 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-logo text-[var(--fuego-text)]">Customer Database</h1>
          <p className="text-[var(--fuego-text-muted)] mt-1">Manage and export your customer information</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:brightness-110 active:scale-95 transition-all"
        >
          <Download size={18} />
          EXPORT CUSTOMER LIST
        </button>
      </div>

      <div className="flex gap-4 mb-8">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fuego-text-muted)] group-focus-within:text-fuego-orange transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search by name or phone..."
            className="w-full bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-2xl py-3.5 pl-12 pr-4 text-[var(--fuego-text)] focus:outline-none focus:border-fuego-orange focus:ring-4 focus:ring-fuego-orange/10 transition-all font-medium shadow-sm placeholder:text-[var(--fuego-text-muted)]/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-8 px-8 bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-2xl shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-[var(--fuego-text-muted)] uppercase tracking-[0.2em]">Total Customers</span>
            <span className="text-2xl font-bold text-fuego-orange leading-tight">{customerList.length}</span>
          </div>
          <div className="w-px h-10 bg-[var(--fuego-border)]" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-[var(--fuego-text-muted)] uppercase tracking-[0.2em]">Average Spent</span>
            <span className="text-2xl font-bold text-[var(--fuego-text)] leading-tight">
              ₹{(customerList.reduce((acc, c) => acc + c.totalSpent, 0) / (customerList.length || 1)).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-2xl flex flex-col shadow-sm">
        <div className="overflow-y-auto overflow-x-auto flex-1 scrollbar-hide">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[var(--fuego-card)]/90 backdrop-blur-md text-[10px] text-[var(--fuego-text-muted)] uppercase font-black tracking-[0.2em] border-b border-[var(--fuego-border)] z-10">
              <tr>
                <th className="p-5">Customer Details</th>
                <th className="p-5 text-center">Orders</th>
                <th className="p-5 text-right">Total Revenue</th>
                <th className="p-5">First Order</th>
                <th className="p-5">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--fuego-border)] h-full">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-20 text-center text-[var(--fuego-text-muted)] italic">
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer, idx) => (
                  <motion.tr 
                    key={customer.phone + idx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="group hover:bg-[var(--fuego-text-muted)]/5 transition-colors"
                  >
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[var(--fuego-text-muted)]/10 flex items-center justify-center text-fuego-orange group-hover:bg-fuego-orange group-hover:text-white transition-all">
                          <User size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-[var(--fuego-text)] uppercase text-sm tracking-wide">{customer.name}</div>
                          <div className="text-xs text-[var(--fuego-text-muted)] flex items-center gap-1 mt-0.5 font-mono">
                            <Phone size={10} /> {customer.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <div className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-xs font-bold">
                        <ShoppingBag size={12} /> {customer.orderCount}
                      </div>
                    </td>
                    <td className="p-5 text-right">
                      <div className="font-bold text-[var(--fuego-text)] font-mono">₹{customer.totalSpent.toFixed(2)}</div>
                    </td>
                    <td className="p-5">
                      <div className="text-xs text-[var(--fuego-text-muted)] flex items-center gap-2">
                        <Calendar size={12} className="opacity-50" />
                        {new Date(customer.firstOrderDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-5 text-[var(--fuego-text-muted)] text-xs">
                       <div className="text-[var(--fuego-text)] font-bold">{new Date(customer.lastOrderDate).toLocaleDateString()}</div>
                       <div className="text-[10px] opacity-60 uppercase tracking-tighter mt-0.5">
                         {new Date(customer.lastOrderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
