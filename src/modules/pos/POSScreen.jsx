import React, { useState, useRef, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import { Search, Plus, Minus, X, Receipt, CreditCard, Trash2, ShoppingCart, Tag, User, Hash, Phone, Printer, Pause, Play, ChevronLeft, ChevronRight } from 'lucide-react';

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
    parkedOrders, parkCurrentOrder, resumeOrder, deleteParkedOrder,
    categories
  } = usePOS();

  
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isParkedModalOpen, setIsParkedModalOpen] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const scrollRef = useRef(null);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories]);


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
        <div className="flex items-center justify-between mb-6">
          <div className="group relative w-full max-w-lg">
            <input 
              type="text" 
              placeholder="COLLECTION SEARCH..."
              className="premium-input !pl-14"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search 
              className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--fuego-text-muted)] group-focus-within:text-fuego-orange transition-all duration-300 transform group-focus-within:scale-110 z-10" 
              size={18} 
              strokeWidth={3} 
            />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-30 group-focus-within:opacity-60 transition-opacity z-10">
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

        {/* Categories Navigation Wrapper */}
        <div className="relative group/nav mb-8">
          {/* Scroll Navigation Buttons */}
          <div 
            className={cn(
              "absolute left-0 top-0 bottom-4 w-16 bg-gradient-to-r from-[var(--fuego-bg)] to-transparent z-10 pointer-events-none transition-opacity duration-300",
              showLeftArrow ? "opacity-100" : "opacity-0"
            )}
          />
          <div 
            className={cn(
              "absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-[var(--fuego-bg)] to-transparent z-10 pointer-events-none transition-opacity duration-300",
              showRightArrow ? "opacity-100" : "opacity-0"
            )}
          />
          
          {showLeftArrow && (
            <button 
              onClick={() => {
                scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
              }}
              className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-[var(--fuego-card)] border border-[var(--fuego-border)] text-[var(--fuego-text)] hover:text-fuego-orange hover:border-fuego-orange/50 shadow-xl transition-all hover:scale-110"
            >
              <ChevronLeft size={20} strokeWidth={3} />
            </button>
          )}

          {showRightArrow && (
            <button 
              onClick={() => {
                scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
              }}
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-[var(--fuego-card)] border border-[var(--fuego-border)] text-[var(--fuego-text)] hover:text-fuego-orange hover:border-fuego-orange/50 shadow-xl transition-all hover:scale-110"
            >
              <ChevronRight size={20} strokeWidth={3} />
            </button>
          )}

          <div 
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex gap-3 overflow-x-auto pb-4 px-8 scroll-smooth"
          >
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={cn(
                "px-6 py-2.5 mx-1 rounded-xl border whitespace-nowrap transition-all uppercase font-bold text-[9px] tracking-[0.2em] shadow-sm shrink-0",
                selectedCategory === "ALL" 
                  ? "bg-gradient-to-br from-fuego-orange to-[#c2410c] border-white/20 text-white shadow-lg shadow-fuego-orange/20 scale-105" 
                  : "bg-white/5 border-white/10 text-[var(--fuego-text-muted)] hover:bg-white/10 hover:text-white"
              )}
            >
              ALL
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-6 py-2.5 mx-1 rounded-xl border whitespace-nowrap transition-all uppercase font-bold text-[9px] tracking-[0.2em] shadow-sm shrink-0",
                  selectedCategory === cat 
                    ? "bg-gradient-to-br from-fuego-orange to-[#c2410c] border-white/20 text-white shadow-lg shadow-fuego-orange/20 scale-105" 
                    : "bg-white/5 border-white/10 text-[var(--fuego-text-muted)] hover:bg-white/10 hover:text-white"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>


        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 content-start">
          <AnimatePresence>
            {filteredItems.map((item) => (
              <Motion.button
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.2 } }}
                transition={{ 
                  type: "spring", 
                  damping: 25, 
                  stiffness: 350,
                  layout: { duration: 0.3 }
                }}
                whileTap={{ scale: 0.96 }}
                onClick={() => addToCart(item)}
                className="group relative flex flex-col justify-between h-36 bg-[var(--fuego-card)] border-2 border-[var(--fuego-border)] rounded-2xl p-4 text-left hover:border-fuego-orange hover:shadow-[0_20px_40px_rgba(234,88,12,0.1)] transition-[border-color,box-shadow] duration-300 overflow-hidden"
              >
                <div className="relative z-10 flex flex-col gap-1.5">
                  <h3 className="font-black text-[13px] text-[var(--fuego-text)] line-clamp-2 uppercase tracking-wide leading-tight group-hover:text-fuego-orange transition-colors italic min-h-[2.2em]">
                    {item.name}
                  </h3>
                  <div>
                    <span className="inline-block text-[7px] bg-fuego-orange/10 px-2.5 py-1 rounded-full text-fuego-orange font-black uppercase tracking-[0.2em] border border-fuego-orange/20 group-hover:bg-fuego-orange group-hover:text-white transition-all whitespace-nowrap">
                      {item.category}
                    </span>
                  </div>
                </div>
                <p className="text-fuego-orange text-xl font-black font-mono mt-2 relative z-10 tracking-tighter">₹{item.price.toFixed(0)}</p>

                
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  <div className="bg-fuego-orange p-1.5 rounded-xl shadow-xl">
                    <Plus size={18} strokeWidth={3} className="text-white" />
                  </div>
                </div>

                
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-[var(--fuego-text)] font-black text-6xl italic transform rotate-12 select-none group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                  POS
                </div>
              </Motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Order Summary Sidebar */}
      <div className="w-80 lg:w-96 bg-[var(--fuego-sidebar)] border-l border-[var(--fuego-border)] flex flex-col transition-colors duration-300 shadow-2xl relative z-20">
        <div className="p-4 border-b border-[var(--fuego-border)] flex items-center justify-between bg-[var(--fuego-bg)]/20">

          <h2 className="text-lg font-bold font-logo text-fuego-orange tracking-tight">Current Order</h2>
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
        <div className="px-4 py-4 bg-[var(--fuego-card)] border-b border-[var(--fuego-border)] grid grid-cols-1 gap-2.5 transition-all">


          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fuego-text-muted)] opacity-50" size={14} />
            <input 
              type="text" 
              placeholder="GUEST NAME"
              className="premium-input pl-10"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fuego-text-muted)] opacity-50" size={14} />
              <input 
                type="text" 
                placeholder="PHONE"
                className="premium-input pl-10 !py-3 !text-[11px]"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fuego-text-muted)] opacity-50" size={14} />
              <input 
                type="text" 
                placeholder="TABLE"
                className="premium-input pl-10 !py-3 !text-[11px]"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              />
            </div>
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
                  className="bg-[var(--fuego-card)] rounded-2xl p-3 flex items-center border border-[var(--fuego-border)] hover:border-fuego-orange/30 transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-fuego-orange/0 to-fuego-orange/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  {/* Name and Price Section */}
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-[var(--fuego-text)] text-[11px] truncate uppercase tracking-tight">{item.name}</h4>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 text-[var(--fuego-text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-[10px] font-black text-fuego-orange font-mono">₹{item.price.toFixed(0)}</p>
                        <input 
                          type="text" 
                          placeholder="Note..."
                          className="text-[9px] bg-transparent border-none text-[var(--fuego-text-muted)] focus:text-fuego-orange outline-none flex-1 truncate italic"
                          value={item.note || ''}
                          onChange={(e) => updateItemNote(item.id, e.target.value)}
                        />
                    </div>
                  </div>
                  
                  {/* Controls Section */}
                  <div className="flex items-center gap-3 shrink-0 border-l border-[var(--fuego-border)] pl-3">
                    <div className="flex items-center bg-[var(--fuego-bg)]/20 rounded-xl p-0.5 border border-[var(--fuego-border)]">

                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center text-[var(--fuego-text-muted)] hover:text-fuego-orange transition-colors"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="w-5 text-center text-[10px] font-black font-mono text-[var(--fuego-text)]">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-6 h-6 flex items-center justify-center text-[var(--fuego-text-muted)] hover:text-fuego-orange transition-colors"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                    
                    <div className="text-right min-w-[65px]">
                      <p className="font-black text-[13px] text-[var(--fuego-text)] font-mono whitespace-nowrap">₹{(item.price * item.quantity).toFixed(0)}</p>
                    </div>
                  </div>
                </Motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Totals & Actions */}
        <div className="p-4 bg-[var(--fuego-card)] border-t border-[var(--fuego-border)] space-y-4">
          <div className="space-y-2.5 text-[9px] text-[var(--fuego-text-muted)] font-black uppercase tracking-[0.2em]">
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
            
            <div className="flex justify-between items-end pt-4 border-t border-[var(--fuego-border)] mt-1.5">
              <span className="text-sm font-black text-[var(--fuego-text)] tracking-tighter">GRAND TOTAL</span>
              <span className="text-2xl font-black text-fuego-orange font-mono leading-none">₹{total.toFixed(0)}</span>
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
              className="premium-button-secondary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={cart.length === 0}
            >
              <Receipt size={16} />
              KOT
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
              className="premium-button-secondary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={cart.length === 0}
            >
              <Printer size={16} />
              BILL
            </button>
            <button 
              onClick={() => setIsPaymentModalOpen(true)}
              className="col-span-2 premium-button flex items-center justify-center gap-3 py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={cart.length === 0}
            >
              <CreditCard size={18} />
              COMPLETE PAYMENT
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
