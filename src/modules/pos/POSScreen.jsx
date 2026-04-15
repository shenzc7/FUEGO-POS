import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { MENU_CATEGORIES } from '../../data/mockData';
import { Search, Plus, Minus, X, Receipt, CreditCard, Trash2, ShoppingCart, Tag, User, Hash, Phone, Printer, Pause, Play } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const POSScreen = () => {
  const { 
    menuItems, 
    cart, addToCart, removeFromCart, updateQuantity, updateItemNote, clearCart,
    tableNumber, setTableNumber,
    customerName, setCustomerName,
    customerPhone, setCustomerPhone,
    currentOrderId,
    subtotal, discountAmount, gst, total,
    discount, setDiscount,
    settings,
    printOrder,
    setIsPaymentModalOpen,
    parkedOrders, parkCurrentOrder, resumeOrder, deleteParkedOrder
  } = usePOS();
  
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isParkedModalOpen, setIsParkedModalOpen] = useState(false);

  const filteredItems = (menuItems || []).filter(item => 
    item.active &&
    (selectedCategory === "ALL" || item.category === selectedCategory) && 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden transition-colors duration-300">
      {/* Main Billing Area */}
      <div className="flex-1 flex flex-col bg-[var(--fuego-bg)] p-6 overflow-hidden">
        {/* Header & Search */}
        <div className="flex items-center justify-between mb-8">
          <div className="group relative w-[520px]">
            <Search 
              className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--fuego-text-muted)] group-focus-within:text-fuego-orange transition-all duration-300 transform group-focus-within:scale-110" 
              size={18} 
              strokeWidth={3} 
            />
            <input 
              type="text" 
              placeholder="COLLECTION SEARCH..."
              className="search-bar-premium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-30 group-focus-within:opacity-60 transition-opacity">
              <span className="text-[10px] font-black border border-[var(--fuego-text-muted)] rounded-md px-1.5 py-0.5">⌘</span>
              <span className="text-[10px] font-black border border-[var(--fuego-text-muted)] rounded-md px-1.5 py-0.5">K</span>
            </div>
          </div>
          
          {parkedOrders.length > 0 && (
            <button 
              onClick={() => setIsParkedModalOpen(true)}
              className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl text-amber-500 hover:bg-amber-500/20 transition-all font-bold text-xs"
            >
              <Pause size={16} />
              {parkedOrders.length} PARKED BILLS
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="flex gap-4 mb-10 overflow-x-auto pb-4 no-scrollbar">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={cn(
              "px-7 py-3.5 rounded-2xl border-2 whitespace-nowrap transition-all uppercase font-black text-[10px] tracking-[0.2em] shadow-sm",
              selectedCategory === "ALL" 
                ? "bg-fuego-orange border-fuego-orange text-white shadow-lg shadow-fuego-orange/20 scale-105" 
                : "bg-[var(--fuego-card)] border-[var(--fuego-border)] text-[var(--fuego-text-muted)] hover:border-fuego-orange/40 hover:text-fuego-orange"
            )}
          >
            ALL
          </button>
          {MENU_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-7 py-3.5 rounded-2xl border-2 whitespace-nowrap transition-all uppercase font-black text-[10px] tracking-[0.2em] shadow-sm",
                selectedCategory === cat 
                  ? "bg-fuego-orange border-fuego-orange text-white shadow-lg shadow-fuego-orange/20 scale-105" 
                  : "bg-[var(--fuego-card)] border-[var(--fuego-border)] text-[var(--fuego-text-muted)] hover:border-fuego-orange/40 hover:text-fuego-orange"
              )}
            >
              {cat}
            </button>
          ))}
        </div>


        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
          <AnimatePresence mode='popLayout'>
            {filteredItems.map((item, idx) => (
              <Motion.button
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ delay: idx * 0.02, type: "spring", damping: 20 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => addToCart(item)}
                className="group relative flex flex-col justify-between h-44 bg-[var(--fuego-card)] border-2 border-[var(--fuego-border)] rounded-[2rem] p-7 text-left hover:border-fuego-orange hover:shadow-[0_20px_40px_rgba(234,88,12,0.1)] transition-all duration-500 overflow-hidden"
              >
                <div className="relative z-10">
                  <h3 className="font-black text-[15px] text-[var(--fuego-text)] mb-2 line-clamp-2 uppercase tracking-wide leading-tight group-hover:text-fuego-orange transition-colors italic">{item.name}</h3>
                  <span className="text-[8px] bg-fuego-orange/10 px-3 py-1 rounded-full text-fuego-orange font-black uppercase tracking-[0.2em] border border-fuego-orange/20 group-hover:bg-fuego-orange group-hover:text-white transition-all">{item.category}</span>
                </div>
                <p className="text-fuego-orange text-2xl font-black font-mono mt-auto relative z-10 tracking-tighter">₹{item.price.toFixed(0)}</p>
                
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                  <div className="bg-fuego-orange p-2 rounded-2xl shadow-xl">
                    <Plus size={24} strokeWidth={3} className="text-white" />
                  </div>
                </div>
                
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-[var(--fuego-text)] font-black text-6xl italic transform rotate-12 select-none group-hover:opacity-[0.05] transition-opacity">
                  POS
                </div>
              </Motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Order Summary Sidebar */}
      <div className="w-[400px] bg-[var(--fuego-sidebar)] border-l border-[var(--fuego-border)] flex flex-col transition-colors duration-300 shadow-2xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold font-logo text-fuego-orange">Current Order</h2>
          <div className="flex gap-1">
            <button 
              onClick={parkCurrentOrder}
              disabled={cart.length === 0}
              className="p-2 text-stone-500 hover:text-amber-500 transition-colors disabled:opacity-30"
              title="Hold Bill"
            >
              <Pause size={20} />
            </button>
            <button 
              onClick={clearCart}
              className="p-2 text-stone-500 hover:text-red-400 transition-colors"
              title="Clear Cart"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        {/* Customer Info (Optional) */}
        <div className="px-6 py-6 bg-[var(--fuego-card)] border-b border-[var(--fuego-border)] grid grid-cols-3 gap-4 transition-all shadow-inner">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fuego-text-muted)] opacity-50" size={14} />
            <input 
              type="text" 
              placeholder="GUEST"
              className="w-full bg-[var(--fuego-bg)] border-2 border-[var(--fuego-border)] rounded-xl py-3 pl-10 pr-4 text-[10px] focus:outline-none focus:border-fuego-orange transition-all uppercase font-black tracking-widest text-[var(--fuego-text)] shadow-sm placeholder:opacity-30"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fuego-text-muted)] opacity-50" size={14} />
            <input 
              type="text" 
              placeholder="PHONE"
              className="w-full bg-[var(--fuego-bg)] border-2 border-[var(--fuego-border)] rounded-xl py-3 pl-10 pr-4 text-[10px] focus:outline-none focus:border-fuego-orange transition-all font-mono font-bold text-[var(--fuego-text)] shadow-sm placeholder:opacity-30"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
          <div className="relative">
            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fuego-text-muted)] opacity-50" size={14} />
            <input 
              type="text" 
              placeholder="TABLE"
              className="w-full bg-[var(--fuego-bg)] border-2 border-[var(--fuego-border)] rounded-xl py-3 pl-10 pr-4 text-[10px] focus:outline-none focus:border-fuego-orange transition-all font-mono font-bold text-[var(--fuego-text)] shadow-sm placeholder:opacity-30"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
            />
          </div>
        </div>

        {/* Cart Items List */}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--fuego-text-muted)] opacity-50">
              <ShoppingCart size={48} className="mb-4" />
              <p className="text-[10px] uppercase font-black tracking-widest">Cart Manifest Empty</p>
            </div>
          ) : (
            <AnimatePresence>
              {cart.map(item => (
                <Motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-[var(--fuego-card)] rounded-xl p-3 flex items-center border border-[var(--fuego-border)] shadow-sm hover:border-fuego-orange/30 transition-all group"
                >
                  {/* Name and Price Section */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-[var(--fuego-text)] text-[11px] truncate uppercase tracking-tight">{item.name}</h4>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 text-[var(--fuego-text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[9px] font-black text-fuego-orange/60 font-mono">₹{item.price.toFixed(2)}</p>
                        <input 
                          type="text" 
                          placeholder="Add note..."
                          className="text-[9px] bg-transparent border-none text-[var(--fuego-text-muted)] focus:text-fuego-orange outline-none flex-1 truncate italic"
                          value={item.note || ''}
                          onChange={(e) => updateItemNote(item.id, e.target.value)}
                        />
                    </div>
                  </div>
                  
                  {/* Controls Section */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center bg-[var(--fuego-bg)] rounded-lg p-0.5 border border-[var(--fuego-border)]">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-7 h-7 flex items-center justify-center text-[var(--fuego-text-muted)] hover:text-fuego-orange transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center text-[11px] font-black font-mono text-[var(--fuego-text)]">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-7 h-7 flex items-center justify-center text-[var(--fuego-text-muted)] hover:text-fuego-orange transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    
                    <div className="text-right min-w-[75px]">
                      <p className="font-black text-sm text-[var(--fuego-text)] font-mono whitespace-nowrap">₹{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                </Motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Totals & Actions */}
        <div className="p-6 bg-[var(--fuego-card)] border-t border-[var(--fuego-border)] space-y-5">
          <div className="space-y-3 text-[10px] text-[var(--fuego-text-muted)] font-black uppercase tracking-[0.2em]">
            <div className="flex justify-between items-center px-1">
              <span>Gross Total</span>
              <span className="text-[var(--fuego-text)] font-mono text-sm">₹{subtotal.toFixed(2)}</span>
            </div>
            
            <button 
              onClick={() => setIsDiscountModalOpen(true)}
              className="flex justify-between items-center w-full hover:text-fuego-orange transition-colors px-1"
            >
              <span className="flex items-center gap-1.5"><Tag size={12} /> Mark Down</span>
              <span className="text-emerald-500 font-mono text-sm">-₹{discountAmount.toFixed(2)}</span>
            </button>

            {settings.gstEnabled && (
              <div className="flex justify-between items-center px-1">
                <span>Tax (5.0%)</span>
                <span className="text-[var(--fuego-text)] font-mono text-sm">₹{gst.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-end pt-5 border-t border-[var(--fuego-border)] mt-2">
              <span className="text-base font-black text-[var(--fuego-text)] tracking-tighter">GRAND TOTAL</span>
              <span className="text-3xl font-black text-fuego-orange font-mono leading-none">₹{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button 
              onClick={() => printOrder({ 
                items: cart, 
                id: currentOrderId,
                tableNumber,
                customerName,
                customerPhone,
                timestamp: new Date().toISOString() 
              }, 'KOT')}
              className="flex items-center justify-center gap-2 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition-all active:scale-95 text-sm font-medium disabled:opacity-50"
              disabled={cart.length === 0}
            >
              <Receipt size={18} />
              PRINT KOT
            </button>
            <button 
              onClick={() => printOrder({ 
                items: cart, 
                id: currentOrderId,
                tableNumber,
                customerName,
                customerPhone,
                subtotal,
                discount: discountAmount,
                gst,
                total,
                timestamp: new Date().toISOString() 
              }, 'ESTIMATE')}
              className="flex items-center justify-center gap-2 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition-all active:scale-95 text-sm font-medium disabled:opacity-50"
              disabled={cart.length === 0}
            >
              <Printer size={18} />
              PRINT BILL
            </button>
            <button 
              onClick={() => setIsPaymentModalOpen(true)}
              className="col-span-2 flex items-center justify-center gap-2 py-4 bg-fuego-orange text-white rounded-xl hover:brightness-110 shadow-lg shadow-fuego-orange/20 transition-all active:scale-95 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={cart.length === 0}
            >
              <CreditCard size={18} />
              PAYMENT
            </button>
          </div>
        </div>
      </div>

      {/* Discount Modal */}
      <AnimatePresence>
        {isDiscountModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-2xl w-full max-w-sm overflow-hidden p-6 relative"
            >
               <button 
                 onClick={() => setIsDiscountModalOpen(false)}
                 className="absolute top-4 right-4 text-[var(--fuego-text-muted)] hover:text-fuego-orange transition-colors"
               >
                 <X size={20} />
               </button>
               <h3 className="text-lg font-bold mb-4 text-[var(--fuego-text)]">Apply Discount</h3>
               <div className="flex bg-[var(--fuego-bg)] rounded-xl p-1 mb-4 border border-[var(--fuego-border)]">
                  <button 
                    onClick={() => setDiscount({ ...discount, type: 'percentage' })}
                    className={cn("flex-1 py-1 px-3 rounded-lg text-xs font-bold transition-all", discount.type === 'percentage' ? 'bg-fuego-orange text-white' : 'text-[var(--fuego-text-muted)]')}
                  >PERCENTAGE</button>
                  <button 
                    onClick={() => setDiscount({ ...discount, type: 'fixed' })}
                    className={cn("flex-1 py-1 px-3 rounded-lg text-xs font-bold transition-all", discount.type === 'fixed' ? 'bg-fuego-orange text-white' : 'text-[var(--fuego-text-muted)]')}
                  >AMOUNT</button>
               </div>
               <div className="relative mb-6">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fuego-text-muted)] font-bold">{discount.type === 'percentage' ? '%' : '₹'}</span>
                  <input 
                    type="number"
                    value={discount.value}
                    onChange={(e) => setDiscount({ ...discount, value: parseFloat(e.target.value) || 0 })}
                    onWheel={(e) => e.target.blur()}
                    className="w-full bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-xl py-3 pl-8 pr-4 text-xl font-bold font-mono focus:border-fuego-orange outline-none text-[var(--fuego-text)]"
                    autoFocus
                  />
               </div>
               <button 
                onClick={() => setIsDiscountModalOpen(false)}
                className="w-full py-3 bg-fuego-orange text-white font-bold rounded-xl shadow-lg shadow-fuego-orange/20"
               >APPLY DISCOUNT</button>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Parked Orders Modal */}
      <AnimatePresence>
        {isParkedModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <Motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-3xl w-full max-w-2xl overflow-hidden"
            >
               <div className="p-6 border-b border-[var(--fuego-border)] flex items-center justify-between bg-[var(--fuego-bg)]/50">
                 <div className="flex items-center gap-3">
                    <Pause className="text-amber-500" />
                    <h2 className="text-xl font-bold text-[var(--fuego-text)]">Parked Bills</h2>
                 </div>
                 <button onClick={() => setIsParkedModalOpen(false)} className="text-[var(--fuego-text-muted)] hover:text-white transition-colors">
                   <X size={24} />
                 </button>
               </div>
               
               <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                  {parkedOrders.length === 0 ? (
                    <div className="text-center py-20 text-[var(--fuego-text-muted)] italic">No parked bills found.</div>
                  ) : (
                    parkedOrders.map((order) => (
                      <div key={order.id} className="bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-2xl p-5 hover:border-amber-500/40 transition-all group shadow-sm">
                         <div className="flex justify-between items-start mb-4">
                            <div>
                               <h3 className="text-lg font-bold text-[var(--fuego-text)] flex items-center gap-2">
                                  {order.customerName || 'Walk-in Guest'}
                                  {order.tableNumber && <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded uppercase">Table {order.tableNumber}</span>}
                               </h3>
                               <p className="text-xs text-[var(--fuego-text-muted)] font-mono mt-1">
                                  {new Date(order.timestamp).toLocaleTimeString()} • {order.cart.length} items
                               </p>
                            </div>
                            <div className="text-right">
                               <p className="text-xl font-bold text-fuego-orange font-mono">₹{order.total.toFixed(2)}</p>
                            </div>
                         </div>
                         
                         <div className="flex gap-2">
                             <button 
                               onClick={() => {
                                 resumeOrder(order.id);
                                 setIsParkedModalOpen(false);
                               }}
                               className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 text-stone-950 font-black text-xs uppercase rounded-xl hover:brightness-110 active:scale-95 transition-all"
                             >
                               <Play size={16} fill="currentColor" />
                               RESUME THIS BILL
                             </button>
                             <button 
                               onClick={() => deleteParkedOrder(order.id)}
                               className="px-4 py-3 bg-[var(--fuego-bg)] border border-[var(--fuego-border)] text-[var(--fuego-text-muted)] hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                             >
                               <Trash2 size={18} />
                             </button>
                         </div>
                      </div>
                    ))
                  )}
               </div>
               <div className="p-6 bg-[var(--fuego-bg)]/80 border-t border-[var(--fuego-border)] text-center">
                  <p className="text-[10px] text-[var(--fuego-text-muted)] font-bold uppercase tracking-widest">Resuming a bill will replace your current cart items.</p>
               </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
