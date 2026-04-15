import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import { PAYMENT_ACCOUNTS } from '../data/mockData';
import { X, CheckCircle2, Smartphone, Banknote, Split as SplitIcon, Plus, ChevronRight, CreditCard, Wallet } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { CustomSelect } from './CustomSelect';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const defaultAccountForMethod = (method) => {
  if (method === 'Cash') return 'cash';
  if (method === 'UPI') return 'upi_digital';
  return 'cash';
};

const accountsForMethod = (method) => {
  if (method === 'Cash') return PAYMENT_ACCOUNTS.filter((a) => a.type === 'Cash');
  if (method === 'UPI') return PAYMENT_ACCOUNTS.filter((a) => a.type === 'UPI');
  return PAYMENT_ACCOUNTS;
};

const makeSplitRow = (method, amount) => ({
  method,
  account: defaultAccountForMethod(method),
  amount: amount != null ? Number(amount.toFixed(2)) : 0,
});

export const PaymentModal = ({ isOpen, onClose }) => {
  const { total, completeOrder, settlementOrder, setSettlementOrder, settleOrder } = usePOS();
  const displayTotal = settlementOrder ? (settlementOrder.payment?.due || 0) : total;

  const [method, setMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState(displayTotal);
  const [isFullPayment, setIsFullPayment] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(PAYMENT_ACCOUNTS[0].id);
  const [isSuccess, setIsSuccess] = useState(false);
  const [wasSettlement, setWasSettlement] = useState(Boolean(settlementOrder));
  const [isProcessing, setIsProcessing] = useState(false);

  const [splitRows, setSplitRows] = useState(() => [
    makeSplitRow('Cash', displayTotal),
    makeSplitRow('UPI', 0),
  ]);

  const splitTotal = useMemo(
    () => splitRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0),
    [splitRows],
  );
  const splitRemaining = +(displayTotal - splitTotal).toFixed(2);
  const splitIsBalanced = Math.abs(splitRemaining) < 0.02;

  const canSubmit = useMemo(() => {
    if (method === 'Split') {
      return splitRows.some((r) => parseFloat(r.amount) > 0);
    }
    return parseFloat(amountPaid) > 0;
  }, [method, splitRows, amountPaid]);

  const availableAccounts = PAYMENT_ACCOUNTS.filter((a) => a.type === method);
  const resolvedSelectedAccount = availableAccounts.some((a) => a.id === selectedAccount)
    ? selectedAccount
    : availableAccounts[0]?.id || selectedAccount;

  if (!isOpen && !isSuccess) return null;

  const updateSplitField = (idx, field, value) => {
    setSplitRows((prev) => {
      const next = prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r));
      if (field === 'method') {
        next[idx].account = defaultAccountForMethod(value);
      }
      return next;
    });
  };

  const addSplitRow = () => {
    setSplitRows((prev) => [...prev, makeSplitRow('UPI', 0)]);
  };

  const removeSplitRow = (idx) => {
    setSplitRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePayment = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      let finalPaymentDetails;
      const settlingExistingOrder = Boolean(settlementOrder);

      if (method === 'Split') {
        if (!splitIsBalanced) {
          const confirmed = window.confirm(
            `Split total ₹${splitTotal.toFixed(2)} doesn't match total ₹${displayTotal.toFixed(2)}. Continue as partial?`,
          );
          if (!confirmed) return;
        }

        finalPaymentDetails = {
          method: 'Split',
          splits: splitRows
            .filter((r) => parseFloat(r.amount) > 0)
            .map((r) => ({
              method: r.method,
              account: r.account,
              amount: parseFloat(r.amount),
            })),
          amountPaid: splitTotal,
          status: splitIsBalanced ? 'Paid' : 'Pending',
          due: Math.max(0, displayTotal - splitTotal),
        };
      } else {
        const paid = parseFloat(amountPaid || 0);
        const appliedAmount = Math.min(displayTotal, paid);
        finalPaymentDetails = {
          method,
          amountPaid: appliedAmount,
          tenderedAmount: paid,
          status: appliedAmount >= displayTotal ? 'Paid' : 'Pending',
          account: resolvedSelectedAccount,
          due: Math.max(0, displayTotal - appliedAmount),
          change: Math.max(0, paid - displayTotal),
        };
      }

      let didSucceed = false;
      if (settlingExistingOrder) {
        didSucceed = Boolean(await settleOrder(settlementOrder.id, finalPaymentDetails));
        if (didSucceed) setSettlementOrder(null);
      } else {
        didSucceed = Boolean(await completeOrder(finalPaymentDetails));
      }

      if (!didSucceed) return;

      setWasSettlement(settlingExistingOrder);
      setIsSuccess(true);
      window.setTimeout(() => {
        setIsSuccess(false);
        setSettlementOrder(null);
        onClose();
      }, 2500);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dynamic Animated Background Overlay */}
      <Motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-stone-950/80 backdrop-blur-3xl"
        onClick={onClose}
      />

      {/* Signature Fuego Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuego-orange/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />

      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <Motion.div
            key="payment-form"
            initial={{ opacity: 0, scale: 0.95, y: 30, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, y: 20, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-[var(--fuego-bg)] dark:bg-stone-900/60 border border-[var(--fuego-border)] rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[600px] max-h-[90vh]"
          >
            {/* Left Column: Summary & Status */}
            <div className="w-full md:w-5/12 bg-[var(--fuego-card)] dark:bg-black/40 p-10 flex flex-col justify-start border-b md:border-b-0 md:border-r border-[var(--fuego-border)]">
              <div className="space-y-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-fuego-orange/20 flex items-center justify-center text-fuego-orange">
                    <CreditCard size={20} />
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-[0.2em] text-[var(--fuego-text-muted)]">Payment</h2>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-[var(--fuego-text-muted)] uppercase tracking-[0.25em]">Total Amount Due</p>
                  <p className="text-4xl lg:text-5xl font-black font-logo text-[var(--fuego-text)] leading-tight break-words">
                    <span className="text-xl text-fuego-orange mr-2">₹</span>
                    {displayTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {method === 'Split' && (
                  <Motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 pt-4"
                  >
                    <div className="h-1.5 w-full bg-[var(--fuego-border)] rounded-full overflow-hidden">
                      <Motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (splitTotal / displayTotal) * 100)}%` }}
                        className={cn(
                          "h-full transition-all duration-500",
                          splitRemaining > 0 ? "bg-fuego-orange" : "bg-emerald-500"
                        )}
                      />
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[9px] font-black text-[var(--fuego-text-muted)] uppercase tracking-widest">Received</p>
                        <p className="text-lg font-bold text-emerald-500">₹{splitTotal.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-[var(--fuego-text-muted)] uppercase tracking-widest">Remaining</p>
                        <p className={cn("text-lg font-bold", splitRemaining > 0 ? "text-fuego-orange" : "text-[var(--fuego-text-muted)]")}>
                          ₹{Math.max(0, splitRemaining).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </Motion.div>
                )}
              </div>
            </div>

            {/* Right Column: Interaction */}
            <div className="flex-1 flex flex-col h-full bg-transparent">
              {/* Tabs / Method Selection */}
              <div className="p-8 pb-4 grid grid-cols-3 gap-3 shrink-0">
                {[
                  { id: 'Cash', icon: Banknote, label: 'Cash' },
                  { id: 'UPI', icon: Smartphone, label: 'UPI' },
                  { id: 'Split', icon: SplitIcon, label: 'Split' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "group flex flex-col items-center gap-3 p-4 rounded-3xl transition-all duration-300 border",
                      method === m.id 
                        ? "bg-fuego-orange border-fuego-orange text-white shadow-lg shadow-fuego-orange/20" 
                        : "bg-[var(--fuego-card)] border-[var(--fuego-border)] text-[var(--fuego-text-muted)] hover:border-fuego-orange/40 hover:text-[var(--fuego-text)]"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                      method === m.id ? "bg-white/20" : "bg-[var(--fuego-bg)] group-hover:scale-110"
                    )}>
                      <m.icon size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-8 pt-4 no-scrollbar">
                {method === 'Split' ? (
                  <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                      {splitRows.map((row, idx) => (
                        <Motion.div 
                          key={idx}
                          layout
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-[2rem] p-5 space-y-4 relative group shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              {['Cash', 'UPI'].map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => updateSplitField(idx, 'method', m)}
                                  className={cn(
                                    'px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border',
                                    row.method === m
                                      ? 'bg-fuego-orange/10 border-fuego-orange text-fuego-orange'
                                      : 'bg-[var(--fuego-bg)] border-[var(--fuego-border)] text-[var(--fuego-text-muted)] hover:text-[var(--fuego-text)]',
                                  )}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                            {splitRows.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeSplitRow(idx)} 
                                className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                          
                          <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--fuego-text-muted)] font-bold text-xl font-mono">₹</span>
                            <input
                              type="number"
                              value={row.amount}
                              onChange={(e) => updateSplitField(idx, 'amount', e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-2xl py-4 pl-12 pr-6 text-2xl font-bold font-mono focus:outline-none focus:border-fuego-orange text-[var(--fuego-text)] transition-all placeholder:opacity-20"
                            />
                          </div>
                        </Motion.div>
                      ))}
                    </AnimatePresence>

                    <button
                      type="button"
                      onClick={addSplitRow}
                      className="w-full py-6 border-2 border-dashed border-[var(--fuego-border)] rounded-[2rem] flex flex-col items-center justify-center gap-2 text-[var(--fuego-text-muted)] hover:text-fuego-orange hover:border-fuego-orange/50 hover:bg-fuego-orange/5 transition-all group mt-2"
                    >
                      <Plus size={20} className="group-hover:scale-125 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Add Payment Source</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {availableAccounts.length > 1 && (
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-[var(--fuego-text-muted)] uppercase tracking-widest ml-1">Receiving Account</label>
                        <CustomSelect
                          options={availableAccounts.map((acc) => ({ id: acc.id, name: acc.name }))}
                          value={resolvedSelectedAccount}
                          onChange={(val) => setSelectedAccount(val)}
                        />
                      </div>
                    )}

                    <div 
                      onClick={() => {
                        setIsFullPayment(!isFullPayment);
                        if (!isFullPayment) setAmountPaid(displayTotal);
                      }}
                      className={cn(
                        "group p-8 rounded-[2.5rem] border-2 transition-all duration-500 cursor-pointer flex flex-col items-center gap-4 text-center shadow-sm",
                        isFullPayment 
                          ? "bg-fuego-orange/5 border-fuego-orange/30 shadow-inner" 
                          : "bg-[var(--fuego-card)] border-[var(--fuego-border)] hover:border-fuego-orange/20"
                      )}
                    >
                      <div className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all duration-500",
                        isFullPayment ? "bg-fuego-orange text-white scale-110 shadow-lg shadow-fuego-orange/20" : "bg-[var(--fuego-bg)] text-[var(--fuego-text-muted)]"
                      )}>
                        <CheckCircle2 size={32} />
                      </div>
                      <div>
                        <h3 className={cn("text-lg font-black transition-colors uppercase tracking-tight", isFullPayment ? "text-fuego-orange" : "text-[var(--fuego-text)]")}>
                          Full Amount Received
                        </h3>
                        <p className="text-xs text-[var(--fuego-text-muted)] font-medium mt-1">Collecting exactly ₹{displayTotal.toFixed(2)}</p>
                      </div>
                    </div>

                    <AnimatePresence>
                      {!isFullPayment && (
                        <Motion.div 
                          initial={{ opacity: 0, height: 0, scale: 0.95 }}
                          animate={{ opacity: 1, height: 'auto', scale: 1 }}
                          exit={{ opacity: 0, height: 0, scale: 0.95 }}
                          className="space-y-6 pt-2"
                        >
                          <div className="relative">
                            <p className="text-[10px] font-black text-[var(--fuego-text-muted)] uppercase tracking-widest mb-3 ml-1">Manual Amount Entry</p>
                            <div className="relative">
                              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--fuego-text-muted)] font-black text-2xl font-mono">₹</span>
                              <input
                                type="number"
                                value={amountPaid}
                                onChange={(e) => setAmountPaid(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-[2rem] py-8 pl-14 pr-8 text-5xl font-black font-mono focus:outline-none focus:border-fuego-orange text-[var(--fuego-text)] transition-all placeholder:opacity-10 shadow-inner"
                                autoFocus
                              />
                            </div>
                          </div>

                          {method === 'Cash' && (
                            <div className="flex flex-wrap gap-2">
                              {[
                                Math.ceil(displayTotal / 10) * 10,
                                Math.ceil(displayTotal / 50) * 50,
                                Math.ceil(displayTotal / 100) * 100,
                              ].map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setAmountPaid(val)}
                                  className="flex-1 min-w-[80px] py-4 bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-2xl text-[10px] font-black text-[var(--fuego-text-muted)] hover:bg-fuego-orange/10 hover:border-fuego-orange/20 hover:text-fuego-orange transition-all uppercase tracking-widest shadow-sm"
                                >
                                  ₹{val}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between p-6 bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-[2rem] shadow-sm">
                            <span className="text-[9px] font-black text-[var(--fuego-text-muted)] uppercase tracking-[0.2em]">
                              {parseFloat(amountPaid) >= displayTotal ? 'Change to Return' : 'Balance Remaining'}
                            </span>
                            <span className={cn(
                              'text-2xl font-black font-mono', 
                              parseFloat(amountPaid) >= displayTotal ? 'text-emerald-500' : 'text-amber-500'
                            )}>
                              ₹{Math.abs(displayTotal - parseFloat(amountPaid || 0)).toFixed(2)}
                            </span>
                          </div>
                        </Motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="p-8 pt-4 pb-10">
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={isProcessing || !canSubmit}
                  className={cn(
                    "group relative w-full py-6 rounded-3xl font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-3 overflow-hidden shadow-xl",
                    method === 'Split' && !splitIsBalanced 
                      ? "bg-[var(--fuego-border)] text-[var(--fuego-text-muted)] cursor-not-allowed" 
                      : "bg-fuego-orange text-white hover:brightness-110 active:scale-95 shadow-fuego-orange/20"
                  )}
                >
                  <Motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                  />
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>
                        {method === 'Split' && !splitIsBalanced 
                          ? `Pay Partial (₹${splitTotal.toFixed(2)})` 
                          : 'Finalize Payment'}
                      </span>
                      <ChevronRight size={18} className="translate-y-px group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center bg-[var(--fuego-bg)]/50 text-[var(--fuego-text-muted)] hover:bg-[var(--fuego-bg)] hover:text-[var(--fuego-text)] transition-all backdrop-blur-md border border-[var(--fuego-border)] z-50"
            >
              <X size={20} />
            </button>
          </Motion.div>
        ) : (
          <Motion.div
            key="success-screen"
            initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            className="relative bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-[3rem] p-16 flex flex-col items-center justify-center text-center shadow-3xl overflow-hidden"
          >
             <div className="absolute inset-0 bg-emerald-500/5 backdrop-blur-3xl" />
            
            <div className="relative mb-8">
              <Motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 bg-emerald-500 rounded-full"
              />
              <div className="relative w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-500/40">
                <CheckCircle2 size={48} />
              </div>
            </div>
            
            <h2 className="text-4xl font-black text-[var(--fuego-text)] mb-4 uppercase tracking-tighter">Transaction Complete</h2>
            <p className="text-[var(--fuego-text-muted)] max-w-xs mx-auto leading-relaxed text-sm font-medium">
              {wasSettlement 
                ? 'The outstanding balance has been cleared and recorded.' 
                : 'The order has been successfully processed and added to history.'}
            </p>
            
            <div className="mt-12 flex gap-3">
              <div className="h-2 w-16 bg-emerald-500/10 rounded-full overflow-hidden border border-emerald-500/10">
                <Motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '0%' }}
                  transition={{ duration: 2.5 }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
