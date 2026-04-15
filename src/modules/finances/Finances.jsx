import React, { useMemo, useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { cn } from '../../utils/cn';
import { buildFinancialSummary } from '../../utils/finance';
import {
  Wallet,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  Download,
  TrendingUp,
  PlusCircle,
  Trash2,
  X,
  Plus,
  Minus,
  Smartphone,
  ArrowRightLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportToCSV } from '../../utils/exportUtils';
import { CustomSelect } from '../../components/CustomSelect';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(value || 0);

const INITIAL_ADJUSTMENT = {
  account: 'Cash',
  toAccount: 'UPI',
  type: 'Outflow',
  amount: '',
  source: '',
  note: '',
};

const AccountCard = ({ title, balance, icon: Icon, color, onClick, isActive }) => {
  const colorMap = {
    amber: {
      bg: 'bg-amber-500/10',
      activeBg: 'bg-amber-500/20',
      border: 'border-amber-500/50',
      shadow: 'shadow-amber-500/10',
      text: 'text-amber-400',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      activeBg: 'bg-emerald-500/20',
      border: 'border-emerald-500/50',
      shadow: 'shadow-emerald-500/10',
      text: 'text-emerald-400',
    },
    blue: {
      bg: 'bg-blue-500/10',
      activeBg: 'bg-blue-500/20',
      border: 'border-blue-500/50',
      shadow: 'shadow-blue-500/10',
      text: 'text-blue-400',
    },
  };

  const colors = colorMap[color] || colorMap.amber;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden p-8 rounded-[2rem] border cursor-pointer transition-all duration-500',
        isActive
          ? `${colors.bg} ${colors.border} shadow-2xl ${colors.shadow} border-fuego-orange/20`
          : 'bg-[var(--fuego-card)] border-[var(--fuego-border)] hover:border-fuego-orange/20',
      )}
    >
      <div className={`p-3 rounded-2xl ${colors.activeBg} ${colors.text} w-fit mb-4`}>
        <Icon size={24} />
      </div>
      <h3 className="text-[var(--fuego-text-muted)] text-[10px] font-black uppercase tracking-[0.3em] leading-none mb-4">{title}</h3>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold font-mono text-[var(--fuego-text)] tracking-tighter tabular-nums">
          {formatCurrency(balance).replace('₹', '₹ ')}
        </span>
      </div>

      <div className="absolute -right-4 -bottom-4 opacity-10 text-white transform rotate-12">
        <Icon size={120} />
      </div>
    </motion.div>
  );
};

export const Finances = () => {
  const { orders, ledgerAdjustments, addLedgerAdjustment, deleteLedgerAdjustment, exportReport, financeServerSummary } = usePOS();
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState(INITIAL_ADJUSTMENT);

  // Client-side ledger (recent orders + all adjustments) — used for the transaction table.
  const financialData = useMemo(
    () => buildFinancialSummary(orders, ledgerAdjustments),
    [orders, ledgerAdjustments],
  );

  // Server-side totals cover ALL historical records, even those not loaded into memory.
  const displayTotals = financeServerSummary || {
    cashTotal: financialData.cashTotal || 0,
    upiTotal: financialData.upiTotal || 0,
    bankTotal: financialData.bankTotal || 0,
    combinedTotal: financialData.combinedTotal || 0,
  };

  const filteredLedger = useMemo(
    () =>
      financialData.ledger.filter((entry) => {
        const matchesFilter = filter === 'All' || entry.account === filter;
        const normalizedQuery = searchQuery.trim().toLowerCase();
        const matchesSearch =
          normalizedQuery.length === 0 ||
          entry.source.toLowerCase().includes(normalizedQuery) ||
          entry.id.toLowerCase().includes(normalizedQuery) ||
          entry.note.toLowerCase().includes(normalizedQuery) ||
          entry.amount.toString().includes(normalizedQuery);

        return matchesFilter && matchesSearch;
      }),
    [financialData.ledger, filter, searchQuery],
  );

  const reportHeaders = [
    { key: 'id', label: 'Reference' },
    { key: 'date', label: 'Date', format: (value) => new Date(value).toLocaleString() },
    { key: 'account', label: 'Account' },
    { key: 'source', label: 'Origin' },
    { key: 'note', label: 'Note' },
    { key: 'type', label: 'Type' },
    {
      key: 'signedAmount',
      label: 'Amount',
      format: (value) => `${value >= 0 ? '+' : '-'}₹${Math.abs(value).toFixed(2)}`,
    },
  ];

  const handleExcelExport = () => {
    const exportData = filteredLedger.map((entry) => ({
      Reference: entry.id,
      Date: new Date(entry.date).toLocaleString(),
      Account: entry.account,
      Origin: entry.source,
      Note: entry.note,
      Type: entry.type,
      Amount: entry.signedAmount.toFixed(2),
    }));

    exportToCSV(exportData, `finances_${new Date().toISOString().split('T')[0]}`);
  };


  const updateAdjustmentForm = (field, value) => {
    setAdjustmentForm((previousForm) => {
      const nextForm = {
        ...previousForm,
        [field]: value,
      };

      // Ensure that switching to/from Transfer correctly defaults a unique destination
      if (nextForm.type === 'Transfer' && nextForm.account === nextForm.toAccount) {
        const options = ['Cash', 'UPI', 'Bank'];
        nextForm.toAccount = options.find((opt) => opt !== nextForm.account) || 'Cash';
      }

      return nextForm;
    });
  };

  const closeAdjustmentForm = () => {
    setAdjustmentForm(INITIAL_ADJUSTMENT);
    setIsAdjustmentOpen(false);
  };

  const handleAdjustmentSave = async () => {
    const amount = Number(adjustmentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert('Enter a valid adjustment amount greater than zero.');
      return;
    }

    const savedAdjustment = await addLedgerAdjustment({
      ...adjustmentForm,
      amount,
      source: adjustmentForm.source.trim(),
      note: adjustmentForm.note.trim(),
    });

    if (savedAdjustment) {
      closeAdjustmentForm();
    }
  };

  const handleAdjustmentDelete = async (entry) => {
    if (!window.confirm(`Delete manual adjustment "${entry.source}"?`)) {
      return;
    }

    await deleteLedgerAdjustment(entry.id);
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--fuego-bg)] overflow-hidden transition-colors duration-300">
      {/* Header Section */}
      <div className="p-10 pb-6 shrink-0">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold font-logo text-[var(--fuego-text)]">Capital Ledger</h1>
            <p className="text-[10px] text-fuego-orange font-black uppercase tracking-[0.5em] mt-2">Fiscal Oversight & Audit</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExcelExport}
              className="flex items-center gap-3 bg-[var(--fuego-card)] hover:bg-[var(--fuego-bg)] border border-[var(--fuego-border)] px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-[var(--fuego-text-muted)] hover:text-emerald-500 shadow-sm"
              title="Export Excel"
            >
              <Download size={16} />
              XLSX
            </button>
            <button
              onClick={() => setIsAdjustmentOpen(true)}
              className="flex items-center gap-3 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl bg-fuego-orange text-white shadow-fuego-orange/20 hover:brightness-110"
            >
              <PlusCircle size={16} strokeWidth={3} />
              Manual Entry
            </button>
          </div>
        </div>

        {/* Global Totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AccountCard
            title="Combined Balance"
            balance={displayTotals.combinedTotal}
            icon={TrendingUp}
            color="amber"
            isActive={filter === 'All'}
            onClick={() => setFilter('All')}
          />
          <AccountCard
            title="Cash In Hand"
            balance={displayTotals.cashTotal}
            icon={Wallet}
            color="emerald"
            isActive={filter === 'Cash'}
            onClick={() => setFilter('Cash')}
          />
          <AccountCard
            title="UPI Balance"
            balance={displayTotals.upiTotal}
            icon={Smartphone}
            color="blue"
            isActive={filter === 'UPI'}
            onClick={() => setFilter('UPI')}
          />
          <AccountCard
            title="Other / Bank"
            balance={displayTotals.bankTotal || 0}
            icon={Landmark}
            color="blue"
            isActive={filter === 'Bank'}
            onClick={() => setFilter('Bank')}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-6 bg-[var(--fuego-card)] border border-[var(--fuego-border)] p-4 rounded-[1.5rem] shadow-sm backdrop-blur-md">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fuego-text-muted)] group-focus-within:text-fuego-orange transition-colors" size={18} />
            <input
              type="text"
              placeholder="Filter by reference, source, note, or amount..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full bg-transparent border-none focus:ring-0 pl-12 pr-4 text-xs font-bold uppercase tracking-widest text-[var(--fuego-text)] placeholder:text-[var(--fuego-text-muted)]/50"
            />
          </div>
          <div className="h-8 w-px bg-[var(--fuego-border)]" />
          <div className="flex gap-2 p-1 bg-[var(--fuego-bg)] rounded-xl border border-[var(--fuego-border)]">
            {['All', 'Cash', 'UPI', 'Bank'].map((option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                className={cn(
                  'px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                  filter === option ? 'bg-fuego-orange text-white shadow-lg' : 'text-[var(--fuego-text-muted)] hover:text-[var(--fuego-text)] hover:bg-[var(--fuego-text)]/5',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Ledger Table - Scrollable Section */}
      <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
        <div className="bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl">
          <table className="w-full text-left">
            <thead className="bg-[var(--fuego-bg)]/50 text-[10px] text-[var(--fuego-text-muted)] uppercase font-black tracking-[0.3em] border-b border-[var(--fuego-border)]">
              <tr>
                <th className="p-6 pl-10 text-center w-24 text-[var(--fuego-text-muted)]/50 italic">#</th>
                <th className="p-6">Origin Manifest</th>
                <th className="p-6">Allocation</th>
                <th className="p-6 font-mono opacity-50">Timestamp</th>
                <th className="p-6 text-right pr-10">Magnitude</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--fuego-border)]">
              {filteredLedger.map((item, index) => (
                <motion.tr
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  key={`${item.id}-${index}`}
                  className="group hover:bg-[var(--fuego-bg)]/20 transition-all"
                >
                  <td className="p-6 pl-10 text-center">
                    <div
                      className={cn(
                        "mx-auto w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12",
                        item.type === 'Inflow'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-500 border-red-500/20'
                      )}
                    >
                      {item.type === 'Inflow' ? <ArrowUpRight size={18} strokeWidth={3} /> : <ArrowDownRight size={18} strokeWidth={3} />}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-[var(--fuego-text)] group-hover:text-fuego-orange transition-colors uppercase tracking-tight">{item.source}</span>
                        <span className="text-[10px] text-[var(--fuego-text-muted)] font-black uppercase tracking-widest mt-1 opacity-50 font-mono">Ref: {item.id}</span>
                        {item.note && (
                          <span className="text-[11px] text-[var(--fuego-text-muted)] mt-3 italic leading-relaxed border-l-2 border-fuego-orange/20 pl-3">{item.note}</span>
                        )}
                      </div>
                      {item.kind === 'adjustment' && (
                        <button
                          onClick={() => handleAdjustmentDelete(item)}
                          className="p-2.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
                          title="Delete manual adjustment"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          'text-[9px] font-black uppercase px-3 py-1.5 rounded-full tracking-widest border-2',
                          item.account === 'Cash'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : item.account === 'UPI'
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                        )}
                      >
                        {item.account} Protocol
                      </span>
                      {item.kind === 'adjustment' && (
                        <span className="text-[9px] font-black uppercase px-3 py-1.5 rounded-full tracking-widest border-2 bg-fuego-orange/10 text-fuego-orange border-fuego-orange/20">
                          Manual Override
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-6 text-[10px] text-[var(--fuego-text-muted)] font-black uppercase tracking-widest">
                    {new Date(item.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                    <div className="mt-1 font-mono opacity-50 text-[11px]">
                      {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="p-6 text-right pr-10">
                    <span
                      className={cn(
                        'text-xl font-black font-mono tabular-nums tracking-tighter',
                        item.signedAmount >= 0 ? 'text-emerald-400' : 'text-red-400',
                      )}
                    >
                      {item.signedAmount >= 0 ? '+' : '-'} ₹{Math.abs(item.signedAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </motion.tr>
              ))}
              {filteredLedger.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-24 text-center">
                    <div className="flex flex-col items-center gap-6">
                      <div className="p-8 rounded-full bg-[var(--fuego-bg)] border-2 border-[var(--fuego-border)] text-[var(--fuego-text-muted)] opacity-20">
                         <Filter size={64} />
                      </div>
                      <div className="space-y-2">
                        <p className="font-black text-xl uppercase tracking-widest text-[var(--fuego-text-muted)]">No Records Found</p>
                        <p className="text-sm italic text-[var(--fuego-text-muted)]/60">The current filter parameters returned zero entries.</p>
                      </div>
                      <button
                        onClick={() => {
                          setFilter('All');
                          setSearchQuery('');
                        }}
                        className="mt-4 px-8 py-3 rounded-xl border-2 border-fuego-orange/20 text-fuego-orange font-black text-[10px] uppercase tracking-widest hover:bg-fuego-orange hover:text-white transition-all shadow-xl shadow-fuego-orange/5"
                      >
                        Reset Ledger Audit
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Adjustment Modal - Professional Refined Design */}
      <AnimatePresence>
        {isAdjustmentOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[var(--fuego-card)] border-2 border-[var(--fuego-border)] rounded-[2rem] w-full max-w-lg shadow-[0_50px_100px_rgba(0,0,0,0.6)]"
            >
              <div className="p-8 border-b border-[var(--fuego-border)] flex items-center justify-between bg-[var(--fuego-bg)]/50">
                <div>
                  <h2 className="text-xl font-black text-[var(--fuego-text)] flex items-center gap-3">
                    Manual Cash Adjustment
                    <div className="h-1 w-8 bg-fuego-orange rounded-full" />
                  </h2>
                  <p className="text-[9px] text-fuego-orange font-black uppercase tracking-[0.4em] mt-2">
                    Official Ledger Correction
                  </p>
                </div>
                <button
                  onClick={closeAdjustmentForm}
                  className="w-10 h-10 rounded-xl bg-[var(--fuego-bg)] border-2 border-[var(--fuego-border)] flex items-center justify-center text-[var(--fuego-text-muted)] hover:text-fuego-orange hover:border-fuego-orange transition-all active:scale-95"
                >
                  <X size={16} strokeWidth={3} />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                {/* Type Selection Tiles */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[var(--fuego-text-muted)] mb-5 ml-1 opacity-60">
                    Transaction Type
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'Inflow', label: 'Inflow', icon: Plus, color: 'emerald' },
                      { id: 'Outflow', label: 'Outflow', icon: Minus, color: 'red' },
                      { id: 'Transfer', label: 'Transfer', icon: ArrowRightLeft, color: 'amber' },
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => updateAdjustmentForm('type', type.id)}
                        className={cn(
                          'group flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all duration-500 relative overflow-hidden',
                          adjustmentForm.type === type.id
                            ? type.id === 'Inflow' 
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                : type.id === 'Outflow'
                                  ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20'
                                  : 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20'
                            : 'bg-[var(--fuego-bg)] border-[var(--fuego-border)] text-[var(--fuego-text-muted)] hover:border-[var(--fuego-text-muted)]/40 hover:translate-y-[-1px]'
                        )}
                      >
                        <type.icon size={20} strokeWidth={3} className={cn("transition-transform duration-500", adjustmentForm.type === type.id ? "scale-110" : "group-hover:rotate-12")} />
                        <span className="text-[9px] font-black uppercase tracking-widest">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={cn("grid gap-6 transition-all duration-500", adjustmentForm.type === 'Transfer' ? "grid-cols-2" : "grid-cols-1")}>
                  {/* Account Selection */}
                  <div>
                    <CustomSelect
                      label={adjustmentForm.type === 'Transfer' ? 'Send From' : 'Target Account'}
                      options={['Cash', 'UPI', 'Bank'].map(opt => ({ id: opt, name: opt }))}
                      value={adjustmentForm.account}
                      onChange={(val) => updateAdjustmentForm('account', val)}
                    />
                  </div>

                  {/* Destination (Only for Transfer) */}
                  {adjustmentForm.type === 'Transfer' && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }} 
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <CustomSelect
                        label="Send To"
                        options={['Cash', 'UPI', 'Bank']
                          .filter(opt => opt !== adjustmentForm.account)
                          .map(opt => ({ id: opt, name: opt }))}
                        value={adjustmentForm.toAccount}
                        onChange={(val) => updateAdjustmentForm('toAccount', val)}
                      />
                    </motion.div>
                  )}
                </div>

                {/* Magnitude / Input Area */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[var(--fuego-text-muted)] mb-3 ml-1 opacity-60">
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={adjustmentForm.amount}
                      onChange={(event) => updateAdjustmentForm('amount', event.target.value)}
                      onWheel={(e) => e.target.blur()}
                      placeholder="0.00"
                      className="premium-input font-mono text-xl tracking-tighter py-3 px-5 rounded-2xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[var(--fuego-text-muted)] mb-3 ml-1 opacity-60">
                      Description
                    </label>
                    <input
                      type="text"
                      value={adjustmentForm.source}
                      onChange={(event) => updateAdjustmentForm('source', event.target.value)}
                      placeholder="e.g. Supplier Payment, Petty Cash..."
                      className="premium-input text-sm italic py-3 px-5 rounded-2xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[var(--fuego-text-muted)] mb-3 ml-1 opacity-60">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={adjustmentForm.note}
                    onChange={(event) => updateAdjustmentForm('note', event.target.value)}
                    placeholder="Enter context or audit notes for this transaction..."
                    className="premium-input text-xs resize-none py-3 px-5 rounded-2xl"
                  />
                </div>
              </div>

              <div className="p-8 bg-[var(--fuego-bg)]/80 border-t border-[var(--fuego-border)] flex gap-4">
                <button
                  onClick={closeAdjustmentForm}
                  className="flex-1 py-4 border-2 border-[var(--fuego-border)] rounded-2xl text-[9px] font-black uppercase tracking-[0.4em] text-[var(--fuego-text-muted)] hover:bg-stone-500 hover:text-white transition-all active:scale-95 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjustmentSave}
                  className="flex-1 py-4 bg-fuego-orange text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.4em] shadow-[0_15px_30_rgba(234,88,12,0.3)] hover:brightness-110 transition-all active:scale-95"
                >
                  Save Adjustment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
