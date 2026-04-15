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
  Printer,
  TrendingUp,
  PlusCircle,
  Trash2,
  X,
  Plus,
  Minus,
  Smartphone,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { exportToCSV } from '../../utils/exportUtils';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(value || 0);

const INITIAL_ADJUSTMENT = {
  account: 'Cash',
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

  const handlePDFExport = () => {
    exportReport('FINANCIAL STATEMENT', filteredLedger, reportHeaders);
  };

  const updateAdjustmentForm = (field, value) => {
    setAdjustmentForm((previousForm) => ({
      ...previousForm,
      [field]: value,
    }));
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
      <div className="p-10 pb-6">
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
              onClick={handlePDFExport}
              className="flex items-center gap-3 bg-[var(--fuego-card)] hover:bg-[var(--fuego-bg)] border border-[var(--fuego-border)] px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-[var(--fuego-text-muted)] hover:text-fuego-orange shadow-sm"
              title="Export PDF"
            >
              <Printer size={16} />
              PDF
            </button>
            <button
              onClick={() => setIsAdjustmentOpen((previousValue) => !previousValue)}
              className={cn(
                'flex items-center gap-3 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl',
                isAdjustmentOpen
                  ? 'bg-red-500 text-white shadow-red-500/20'
                  : 'bg-fuego-orange text-white shadow-fuego-orange/20 hover:brightness-110',
              )}
            >
              {isAdjustmentOpen ? <X size={16} /> : <PlusCircle size={16} />}
              {isAdjustmentOpen ? 'Close Entry' : 'Manual Entry'}
            </button>
          </div>
        </div>

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

        <div className="flex items-center gap-6 mb-8 bg-[var(--fuego-card)] border border-[var(--fuego-border)] p-4 rounded-2xl shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fuego-text-muted)]" size={18} />
            <input
              type="text"
              placeholder="Filter by reference, source, note, or amount..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full bg-transparent border-none focus:ring-0 pl-12 pr-4 text-xs font-bold uppercase tracking-widest text-[var(--fuego-text)] placeholder:text-[var(--fuego-text-muted)]/50"
            />
          </div>
          <div className="h-8 w-px bg-[var(--fuego-border)]" />
          <div className="flex gap-2 p-1 bg-[var(--fuego-bg)] rounded-xl">
            {['All', 'Cash', 'UPI', 'Bank'].map((option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                className={cn(
                  'px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                  filter === option ? 'bg-fuego-orange text-white shadow-lg' : 'text-[var(--fuego-text-muted)] hover:text-[var(--fuego-text)]',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {isAdjustmentOpen && (
          <div className="mb-8 bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--fuego-text)]">Manual Ledger Adjustment</h2>
                <p className="text-[10px] text-[var(--fuego-text-muted)] font-black uppercase tracking-[0.3em] mt-2">
                  Record cash drawer top-ups, withdrawals, or bank corrections
                </p>
              </div>
              <button
                onClick={closeAdjustmentForm}
                className="p-2 text-[var(--fuego-text-muted)] hover:text-red-400 transition-colors"
                title="Close manual entry"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Row 1: +/- type toggle + account selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--fuego-text-muted)] mb-3">
                    Adjustment Type
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => updateAdjustmentForm('type', 'Inflow')}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-bold transition-all border text-sm',
                        adjustmentForm.type === 'Inflow'
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                          : 'bg-[var(--fuego-bg)] border-[var(--fuego-border)] text-[var(--fuego-text-muted)] hover:border-emerald-500/50 hover:text-emerald-400',
                      )}
                    >
                      <Plus size={16} strokeWidth={3} />
                      Add Money
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAdjustmentForm('type', 'Outflow')}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-bold transition-all border text-sm',
                        adjustmentForm.type === 'Outflow'
                          ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20'
                          : 'bg-[var(--fuego-bg)] border-[var(--fuego-border)] text-[var(--fuego-text-muted)] hover:border-red-500/50 hover:text-red-400',
                      )}
                    >
                      <Minus size={16} strokeWidth={3} />
                      Remove Money
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--fuego-text-muted)] mb-3">
                    Account
                  </label>
                    <div className="flex gap-3">
                      {['Cash', 'UPI', 'Bank'].map((acct) => (
                        <button
                          key={acct}
                          type="button"
                          onClick={() => updateAdjustmentForm('account', acct)}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-bold transition-all border text-sm',
                            adjustmentForm.account === acct
                              ? 'bg-fuego-orange text-white border-fuego-orange shadow-lg shadow-fuego-orange/20'
                              : 'bg-[var(--fuego-bg)] border-[var(--fuego-border)] text-[var(--fuego-text-muted)] hover:border-fuego-orange/40 hover:text-[var(--fuego-text)]',
                          )}
                        >
                          {acct === 'Cash' ? <Wallet size={15} /> : acct === 'UPI' ? <Smartphone size={15} /> : <Landmark size={15} />}
                          {acct}
                        </button>
                      ))}
                    </div>
                </div>
              </div>

              {/* Row 2: Amount, Description, Note */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--fuego-text-muted)] mb-3">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={adjustmentForm.amount}
                    onChange={(event) => updateAdjustmentForm('amount', event.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-2xl px-5 py-4 text-[var(--fuego-text)] focus:border-fuego-orange outline-none transition-all font-bold font-mono text-lg"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--fuego-text-muted)] mb-3">
                    Description
                  </label>
                  <input
                    type="text"
                    value={adjustmentForm.source}
                    onChange={(event) => updateAdjustmentForm('source', event.target.value)}
                    placeholder={adjustmentForm.type === 'Inflow' ? 'e.g. Cash top-up, loan received' : 'e.g. Supplier payment, expense'}
                    className="w-full bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-2xl px-5 py-4 text-[var(--fuego-text)] focus:border-fuego-orange outline-none transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--fuego-text-muted)] mb-3">
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    value={adjustmentForm.note}
                    onChange={(event) => updateAdjustmentForm('note', event.target.value)}
                    placeholder="Additional details"
                    className="w-full bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-2xl px-5 py-4 text-[var(--fuego-text)] focus:border-fuego-orange outline-none transition-all font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeAdjustmentForm}
                className="px-5 py-3 border border-[var(--fuego-border)] rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-[var(--fuego-text-muted)] hover:text-red-400 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustmentSave}
                className="px-5 py-3 bg-fuego-orange text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-fuego-orange/20 hover:brightness-110 transition-all"
              >
                Save Adjustment
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
        <div className="bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-[2.5rem] overflow-hidden shadow-2xl">
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
                      className={`mx-auto w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${
                        item.type === 'Inflow'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}
                    >
                      {item.type === 'Inflow' ? <ArrowUpRight size={18} strokeWidth={3} /> : <ArrowDownRight size={18} strokeWidth={3} />}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[var(--fuego-text)] group-hover:text-fuego-orange transition-colors">{item.source}</span>
                        <span className="text-[10px] text-[var(--fuego-text-muted)] font-black uppercase tracking-widest mt-1">Ref ID: {item.id}</span>
                        {item.note && (
                          <span className="text-[11px] text-[var(--fuego-text-muted)] mt-3 italic leading-relaxed">{item.note}</span>
                        )}
                      </div>
                      {item.kind === 'adjustment' && (
                        <button
                          onClick={() => handleAdjustmentDelete(item)}
                          className="p-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
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
                          'text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-widest border',
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
                        <span className="text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-widest border bg-fuego-orange/10 text-fuego-orange border-fuego-orange/20">
                          Manual
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-6 text-[10px] text-[var(--fuego-text-muted)] font-black uppercase tracking-widest">
                    {new Date(item.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                    <span className="ml-3 font-mono opacity-50">
                      {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="p-6 text-right pr-10">
                    <span
                      className={cn(
                        'text-lg font-bold font-mono tabular-nums',
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
                  <td colSpan="5" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-stone-600">
                      <Filter size={48} className="opacity-20" />
                      <p className="italic text-lg">No financial entries found for this selection.</p>
                      <button
                        onClick={() => {
                          setFilter('All');
                          setSearchQuery('');
                        }}
                        className="text-fuego-orange text-sm font-bold hover:underline"
                      >
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
