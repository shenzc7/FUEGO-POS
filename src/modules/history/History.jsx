import React, { useState, useMemo, useRef } from 'react';
import { usePOS } from '../../context/POSContext';
import { Search, Printer, Eye, ChevronRight, FileText, Calendar, Receipt, Edit, Trash2, X, Check, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportToCSV } from '../../utils/exportUtils';

export const History = () => {
  const { orders, printOrder, updateOrder, deleteOrder, exportReport } = usePOS();
  const [searchTerm, setSearchTerm] = useState('');
  
  const formatTime12h = (date) => {
    return new Date(date).toLocaleString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true,
        day: '2-digit',
        month: 'short'
    });
  };

  // Header configuration for reports
  const reportHeaders = [
    { key: 'id', label: 'Order ID' },
    { key: 'timestamp', label: 'Date', format: (v) => formatTime12h(v) },
    { key: 'customerName', label: 'Customer' },
    { key: 'customerPhone', label: 'Phone' },
    { key: 'tableNumber', label: 'Table' },
    { key: 'total', label: 'Total Amount', format: (v) => `₹${v.toFixed(2)}` },
    { key: 'payment', label: 'Method', format: (v) => v?.method === 'Split' ? `Split (${(v.splits || []).map(s => s.method).join(' + ')})` : v?.method },
    { key: 'status', label: 'Status', format: (_, row) => row.payment?.status }
  ];

  const handleExcelExport = () => {
    const exportData = filteredOrders.map(o => ({
      ID: o.id,
      Date: formatTime12h(o.timestamp),
      Customer: o.customerName || 'N/A',
      Phone: o.customerPhone || 'N/A',
      Table: o.tableNumber || 'N/A',
      Total: o.total.toFixed(2),
      Method: o.payment?.method || 'N/A',
      Status: o.payment?.status || 'N/A'
    }));
    exportToCSV(exportData, `transactions_${new Date().toISOString().split('T')[0]}`);
  };

  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => 
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.customerPhone && o.customerPhone.includes(searchTerm))
    );
  }, [orders, searchTerm]);

  // Virtualization state
  const scrollContainerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const ITEM_HEIGHT = 104; // Matches the padding + content height
  const VIEWPORT_HEIGHT = 800; // Estimated height of sidebar list
  
  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 3);
  const endIndex = Math.min(filteredOrders.length, startIndex + Math.ceil(VIEWPORT_HEIGHT/ITEM_HEIGHT) + 6);
  const visibleOrders = filteredOrders.slice(startIndex, endIndex);
  const totalHeight = filteredOrders.length * ITEM_HEIGHT;
  const offsetY = startIndex * ITEM_HEIGHT;

  const handleDelete = (id) => {
    setOrderToDelete(id);
  };

  const confirmDelete = () => {
    if (orderToDelete) {
      deleteOrder(orderToDelete);
      setSelectedOrder(null);
      setOrderToDelete(null);
    }
  };

  const handleEditOpen = () => {
    setEditFormData({
        tableNumber: selectedOrder.tableNumber || '',
        customerName: selectedOrder.customerName || '',
        customerPhone: selectedOrder.customerPhone || '',
        paymentMethod: selectedOrder.payment?.method || 'Cash',
        paymentStatus: selectedOrder.payment?.status || 'Paid'
    });
    setIsEditModalOpen(true);
  };

  const handleEditSave = () => {
    const updatedPayment = {
        ...selectedOrder.payment,
        method: editFormData.paymentMethod,
        status: editFormData.paymentStatus,
        due: editFormData.paymentStatus === 'Paid' ? 0 : selectedOrder.total,
        amountPaid: editFormData.paymentStatus === 'Paid' ? selectedOrder.total : 0
    };

    updateOrder(selectedOrder.id, {
        tableNumber: editFormData.tableNumber,
        customerName: editFormData.customerName,
        customerPhone: editFormData.customerPhone,
        payment: updatedPayment
    });

    setSelectedOrder({
        ...selectedOrder,
        tableNumber: editFormData.tableNumber,
        customerName: editFormData.customerName,
        customerPhone: editFormData.customerPhone,
        payment: updatedPayment
    });

    setIsEditModalOpen(false);
  };

  return (
    <div className="h-screen flex bg-[var(--fuego-bg)] transition-colors duration-300">
      <div className="w-[450px] border-r border-[var(--fuego-border)] flex flex-col h-full bg-[var(--fuego-card)]/30">
        <div className="p-8 border-b border-[var(--fuego-border)] bg-[var(--fuego-bg)]/50">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold font-logo text-[var(--fuego-text)]">Archives</h1>
            <div className="flex gap-2">
              <button 
                onClick={handleExcelExport}
                className="p-3 bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-xl text-[var(--fuego-text-muted)] hover:text-emerald-500 hover:border-emerald-500/30 transition-all shadow-sm"
                title="Export Excel"
              >
                <Download size={18} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fuego-text-muted)]" size={18} />
            <input 
              type="text" 
              placeholder="Search ID, Customer or Relation..."
              className="w-full bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-fuego-orange text-[var(--fuego-text)] transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto" 
          onScroll={handleScroll}
        >
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-[var(--fuego-text-muted)] italic font-medium">No historical records found.</div>
          ) : (
            <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
              <div style={{ transform: `translateY(${offsetY}px)`, position: 'absolute', width: '100%', left: 0, top: 0 }}>
                {visibleOrders.map(order => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    style={{ height: `${ITEM_HEIGHT}px` }}
                    className={`w-full p-6 flex items-center gap-5 transition-all border-b border-[var(--fuego-border)] ${
                      selectedOrder?.id === order.id ? 'bg-fuego-orange/10 border-r-4 border-r-fuego-orange' : 'hover:bg-[var(--fuego-bg)]/50'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-fuego-orange/10 flex items-center justify-center text-fuego-orange shrink-0 border border-fuego-orange/20">
                      <FileText size={24} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-mono font-bold text-[var(--fuego-text)] truncate">{order.id}</span>
                        <span className="text-sm font-bold text-fuego-orange font-mono tabular-nums shrink-0 ml-4">₹{order.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[var(--fuego-text-muted)] font-black uppercase tracking-widest">{formatTime12h(order.timestamp).split(',')[1]}</span>
                        <span className={`text-[9px] font-black uppercase rounded-full px-2.5 py-1 border ${
                          order.payment?.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {order.payment?.status}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-[var(--fuego-text-muted)] opacity-30" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-12 bg-[var(--fuego-bg)]">
        <AnimatePresence mode='wait'>
          {selectedOrder ? (
            <motion.div
              key={selectedOrder.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto pb-24"
            >
              <div className="flex items-center justify-between mb-10 pb-10 border-b border-[var(--fuego-border)]">
                <div>
                  <h2 className="text-4xl font-bold font-logo text-[var(--fuego-text)]">Archive Record</h2>
                  <p className="text-fuego-orange mt-2 font-mono font-bold text-lg">{selectedOrder.id}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-2 mr-4">
                    <button 
                      onClick={() => handleDelete(selectedOrder.id)}
                      className="p-3 border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                      title="Purge Record"
                    >
                      <Trash2 size={22} />
                    </button>
                    <button 
                      onClick={handleEditOpen}
                      className="p-3 border border-[var(--fuego-border)] text-[var(--fuego-text-muted)] hover:text-fuego-orange hover:bg-fuego-orange/5 rounded-2xl transition-all"
                      title="Modify Metadata"
                    >
                      <Edit size={22} />
                    </button>
                  </div>
                  <div className="w-px h-12 bg-[var(--fuego-border)]" />
                  <div className="flex gap-3 ml-4">
                    <button 
                      onClick={() => printOrder(selectedOrder, 'KOT')}
                      className="flex items-center gap-3 px-6 py-3 border border-[var(--fuego-border)] rounded-2xl hover:bg-[var(--fuego-card)] transition-all text-[10px] font-black uppercase tracking-[0.2em] text-fuego-orange"
                    >
                      <Receipt size={18} />
                      Ticket
                    </button>
                    <button 
                      onClick={() => printOrder(selectedOrder, 'INVOICE')}
                      className="flex items-center gap-3 px-8 py-3 bg-fuego-orange text-white rounded-2xl hover:brightness-110 transition-all text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-fuego-orange/20"
                    >
                      <Printer size={18} />
                      Invoice
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-10 mb-12">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-[var(--fuego-text-muted)] uppercase tracking-[0.3em]">Customer Data</h3>
                  <div className="bg-[var(--fuego-card)] p-8 rounded-[2rem] space-y-4 border border-[var(--fuego-border)] shadow-sm">
                    {selectedOrder.tableNumber && <p className="text-[10px] uppercase tracking-widest text-[var(--fuego-text-muted)]">Unit Assignment: <span className="font-bold text-fuego-orange text-xl font-mono ml-4">{selectedOrder.tableNumber}</span></p>}
                    {selectedOrder.customerName && <p className="text-[10px] uppercase tracking-widest text-[var(--fuego-text-muted)]">Subject Identity: <span className="font-bold text-[var(--fuego-text)] uppercase ml-4 text-base">{selectedOrder.customerName}</span></p>}
                    {selectedOrder.customerPhone && <p className="text-[10px] uppercase tracking-widest text-[var(--fuego-text-muted)]">Secure Contact: <span className="font-bold text-[var(--fuego-text)] ml-4 font-mono text-base">{selectedOrder.customerPhone}</span></p>}
                    <div className="pt-4 border-t border-[var(--fuego-border)] mt-4">
                        <p className="text-[10px] text-[var(--fuego-text-muted)] italic leading-relaxed">System Notes: {selectedOrder.note || 'None recorded'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-[var(--fuego-text-muted)] uppercase tracking-[0.3em]">Financial Matrix</h3>
                  <div className="bg-[var(--fuego-card)] p-8 rounded-[2rem] space-y-4 border border-[var(--fuego-border)] shadow-sm">
                    <p className="text-[10px] uppercase tracking-widest text-[var(--fuego-text-muted)]">
                      Payment Method:{' '}
                      <span className="font-bold text-[var(--fuego-text)] ml-4 text-base">
                        {selectedOrder.payment?.method === 'Split'
                          ? `Split (${(selectedOrder.payment.splits || []).map((s) => s.method).join(' + ')})`
                          : selectedOrder.payment?.method}
                      </span>
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-[var(--fuego-text-muted)]">
                      Status:{' '}
                      <span className={`font-bold ml-4 text-base ${selectedOrder.payment?.status === 'Paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {selectedOrder.payment?.status}
                      </span>
                    </p>
                    <div className="pt-4 border-t border-[var(--fuego-border)] mt-4">
                        <p className="text-[10px] text-[var(--fuego-text-muted)] uppercase font-black tracking-widest">Entry Date: {formatTime12h(selectedOrder.timestamp)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--fuego-card)] rounded-[2.5rem] overflow-hidden border border-[var(--fuego-border)] mb-12 shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-[var(--fuego-bg)]/50 text-[10px] text-[var(--fuego-text-muted)] uppercase font-black tracking-[0.3em]">
                    <tr>
                      <th className="p-8">Inventory Manifest</th>
                      <th className="p-8 text-center">Qty</th>
                      <th className="p-8 text-right">Unit Price</th>
                      <th className="p-8 text-right">Magnitude</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--fuego-border)] text-[var(--fuego-text)]">
                    {selectedOrder.items.map((item, idx) => (
                      <tr key={idx} className="text-sm hover:bg-[var(--fuego-bg)]/50 transition-colors">
                        <td className="p-8">
                            <div className="font-bold uppercase tracking-wide">{item.name}</div>
                            {item.note && <div className="text-[10px] italic text-[var(--fuego-text-muted)] mt-1.5 opacity-70">Ref: {item.note}</div>}
                        </td>
                        <td className="p-8 text-center font-mono font-bold text-[var(--fuego-text-muted)]">{item.quantity}</td>
                        <td className="p-8 text-right font-mono text-[var(--fuego-text-muted)] text-xs">₹{item.price.toFixed(2)}</td>
                        <td className="p-8 text-right font-mono font-bold text-fuego-orange">₹{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ml-auto w-full max-w-sm p-10 bg-fuego-orange/5 rounded-[3rem] border border-fuego-orange/10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-fuego-orange/10 blur-[60px] rounded-full -mr-16 -mt-16" />
                
                <div className="space-y-4 relative z-10">
                    <div className="flex justify-between text-[var(--fuego-text-muted)] text-[10px] font-black uppercase tracking-[0.2em]">
                        <span>Subtotal Value</span>
                        <span className="font-mono tabular-nums text-[var(--fuego-text)]">₹{selectedOrder.subtotal.toFixed(2)}</span>
                    </div>
                    {selectedOrder.discount > 0 && (
                        <div className="flex justify-between text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em]">
                            <span>Incentive Correction</span>
                            <span className="font-mono tabular-nums leading-none">-₹{selectedOrder.discount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-[var(--fuego-text-muted)] text-[10px] font-black uppercase tracking-[0.2em]">
                        <span>Fiscal Duty ({selectedOrder.gstRate || 5}%)</span>
                        <span className="font-mono tabular-nums text-[var(--fuego-text)]">₹{selectedOrder.gst.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between pt-8 border-t border-fuego-orange/20">
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-fuego-orange/50 self-center">Final Ledger</span>
                        <span className="text-4xl font-bold text-fuego-orange font-mono tracking-tighter tabular-nums">₹{selectedOrder.total.toFixed(2)}</span>
                    </div>
                    
                    <div className="pt-6 space-y-2">
                        {/* For split payments show each method individually */}
                        {selectedOrder.payment?.method === 'Split' && Array.isArray(selectedOrder.payment?.splits) ? (
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest block mb-2">Split Received</span>
                            {selectedOrder.payment.splits.map((s, i) => (
                              <div key={i} className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                <span className={s.method === 'Cash' ? 'text-emerald-400' : s.method === 'UPI' ? 'text-blue-400' : 'text-purple-400'}>
                                  {s.method}
                                </span>
                                <span className="font-mono tabular-nums text-[var(--fuego-text)]">₹{Number(s.amount).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex justify-between text-[9px] font-black text-emerald-500/80 uppercase tracking-widest">
                            <span>Amount Received</span>
                            <span className="font-mono tabular-nums">₹{Number(selectedOrder.payment?.amountPaid || 0).toFixed(2)}</span>
                          </div>
                        )}
                        {selectedOrder.payment?.due > 0 && (
                            <div className="flex justify-between text-[9px] font-black text-amber-500/80 uppercase tracking-widest bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                                <span>Outstanding Balance</span>
                                <span className="font-mono tabular-nums">₹{selectedOrder.payment?.due.toFixed(2)}</span>
                            </div>
                        )}
                        {selectedOrder.payment?.change > 0 && (
                            <div className="flex justify-between text-[9px] font-black text-stone-500 uppercase tracking-widest">
                                <span>Change Returned</span>
                                <span className="font-mono tabular-nums">₹{selectedOrder.payment?.change.toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[var(--fuego-text-muted)] transition-opacity duration-1000">
              <Eye size={80} className="mb-6 opacity-5" />
              <p className="text-[10px] font-black uppercase tracking-[0.6em] opacity-20">Select entry to audit</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl"
            >
               <div className="p-10 border-b border-[var(--fuego-border)] flex items-center justify-between bg-[var(--fuego-bg)]/50">
                  <h3 className="font-black text-[10px] uppercase tracking-[0.4em] text-fuego-orange">Operational Adjustment</h3>
                  <button onClick={() => setIsEditModalOpen(false)} className="text-[var(--fuego-text-muted)] hover:text-fuego-orange transition-colors"><X size={24} /></button>
               </div>
               <div className="p-10 space-y-8">
                   <div className="space-y-6">
                      <div>
                         <label className="text-[10px] font-black text-[var(--fuego-text-muted)] uppercase tracking-[0.2em] mb-3 block">Unit Tag</label>
                         <input 
                            type="text"
                            className="w-full bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-2xl py-4 px-6 font-bold focus:border-fuego-orange outline-none text-[var(--fuego-text)] font-mono text-lg"
                            value={editFormData?.tableNumber || ''}
                            onChange={(e) => setEditFormData({...editFormData, tableNumber: e.target.value})}
                         />
                      </div>
                      <div className="grid grid-cols-1 gap-6">
                         <div>
                            <label className="text-[10px] font-black text-[var(--fuego-text-muted)] uppercase tracking-[0.2em] mb-3 block">Subject Identity</label>
                            <input 
                               type="text"
                               className="w-full bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-2xl py-4 px-6 font-bold uppercase focus:border-fuego-orange outline-none text-[var(--fuego-text)]"
                               value={editFormData?.customerName || ''}
                               onChange={(e) => setEditFormData({...editFormData, customerName: e.target.value})}
                            />
                         </div>
                         <div>
                            <label className="text-[10px] font-black text-[var(--fuego-text-muted)] uppercase tracking-[0.2em] mb-3 block">Contact Protocol</label>
                            <input 
                               type="text"
                               className="w-full bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-2xl py-4 px-6 font-bold focus:border-fuego-orange outline-none text-[var(--fuego-text)] font-mono"
                               value={editFormData?.customerPhone || ''}
                               onChange={(e) => setEditFormData({...editFormData, customerPhone: e.target.value})}
                            />
                         </div>
                      </div>
                   </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div>
                         <label className="text-[10px] font-black text-[var(--fuego-text-muted)] uppercase tracking-[0.2em] mb-3 block">Settlement Method</label>
                         <div className="grid grid-cols-1 gap-2">
                            {['Cash', 'UPI', 'Bank'].map(m => (
                               <button 
                                  key={m}
                                  onClick={() => setEditFormData({...editFormData, paymentMethod: m})}
                                  className={`py-3 rounded-xl border-2 font-black text-[10px] tracking-widest uppercase transition-all ${editFormData?.paymentMethod === m ? 'border-fuego-orange bg-fuego-orange/10 text-fuego-orange' : 'border-[var(--fuego-border)] text-[var(--fuego-text-muted)]'}`}
                               >
                                  {m}
                               </button>
                            ))}
                         </div>
                    </div>
                    <div>
                         <label className="text-[10px] font-black text-[var(--fuego-text-muted)] uppercase tracking-[0.2em] mb-3 block">Execution Status</label>
                         <div className="grid grid-cols-1 gap-2">
                            {['Paid', 'Pending'].map(s => (
                               <button 
                                  key={s}
                                  onClick={() => setEditFormData({...editFormData, paymentStatus: s})}
                                  className={`py-3 rounded-xl border-2 font-black text-[10px] tracking-widest uppercase transition-all ${editFormData?.paymentStatus === s ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-[var(--fuego-border)] text-[var(--fuego-text-muted)]'}`}
                               >
                                  {s}
                               </button>
                            ))}
                         </div>
                    </div>
                  </div>
               </div>
               <div className="p-10 bg-[var(--fuego-bg)]/50 border-t border-[var(--fuego-border)] flex gap-4">
                  <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-5 font-black text-[10px] tracking-widest text-[var(--fuego-text-muted)] hover:text-[var(--fuego-text)] transition-colors uppercase">Abort</button>
                  <button 
                    onClick={handleEditSave}
                    className="flex-1 py-5 bg-emerald-600 text-white font-black text-[10px] tracking-[0.3em] rounded-2xl shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all uppercase"
                  >
                    Commit Change
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {orderToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-[4rem] max-w-md w-full p-12 text-center relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-600" />
              <div className="w-24 h-24 bg-red-600/10 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-red-600/20 border border-red-600/20">
                <Trash2 size={40} />
              </div>
              
              <h2 className="text-3xl font-bold text-[var(--fuego-text)] mb-4">Critical Deletion</h2>
              <p className="text-[var(--fuego-text-muted)] text-sm mb-12 leading-relaxed font-medium">
                You are about to purge <span className="text-red-500 font-mono font-bold">#{orderToDelete.split('-').pop()}</span> from the central archives. This protocol is irreversible. Continue?
              </p>

              <div className="flex gap-4">
                <button 
                  onClick={() => setOrderToDelete(null)}
                  className="flex-1 py-5 bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-2xl text-[10px] font-black uppercase tracking-widest text-[var(--fuego-text-muted)] hover:text-[var(--fuego-text)] transition-all"
                >
                  Abort
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-5 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/20 hover:brightness-110 active:scale-95 transition-all"
                >
                  Confirm Purge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
