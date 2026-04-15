import React, { useState, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import { 
  Camera, 
  Save, 
  Info, 
  Building2, 
  Receipt, 
  Cpu, 
  Trash2, 
  Lock, 
  Globe, 
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const INITIAL_SETTINGS = {
  restaurantName: 'FUEGO',
  gstEnabled: false,
  gstNumber: '',
  gstRate: 5,
  logo: null,
  address: '123 Oven Street, Crust City',
  phone: '+91 9876543210',
  printerModel: 'RP326',
  paperWidth: '80mm (3")',
  pincode: '',
  pincodeEnabled: false,
};

const SettingCard = ({ title, subtitle, icon: Icon, children, variant = 'default' }) => (
  <motion.section 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`p-8 rounded-[2.5rem] border transition-all duration-300 ${
      variant === 'danger' 
        ? 'bg-red-500/5 border-red-500/20 shadow-sm' 
        : 'bg-[var(--fuego-card)] border-[var(--fuego-border)] shadow-sm hover:shadow-md'
    }`}
  >
    <div className="flex items-center gap-4 mb-8">
      <div className={`p-3 rounded-2xl ${
        variant === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-fuego-orange/10 text-fuego-orange'
      }`}>
        <Icon size={24} />
      </div>
      <div>
        <h2 className={`text-xl font-bold ${variant === 'danger' ? 'text-red-500' : 'text-[var(--fuego-text)]'}`}>
          {title}
        </h2>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--fuego-text-muted)] mt-1">
          {subtitle}
        </p>
      </div>
    </div>
    {children}
  </motion.section>
);

const FormField = ({ label, children, hint }) => (
  <div className="space-y-2">
    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[var(--fuego-text-muted)] ml-1">
      {label}
    </label>
    {children}
    {hint && (
      <p className="text-[10px] text-[var(--fuego-text-muted)] italic mt-2 ml-1 flex items-center gap-2">
        <Info size={12} className="text-fuego-orange" />
        {hint}
      </p>
    )}
  </div>
);

export const Settings = () => {
  const { settings, saveSettings, resetDatabase } = usePOS();
  const [draftSettings, setDraftSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    if (showSaveToast) {
      const timer = setTimeout(() => setShowSaveToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSaveToast]);

  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setDraftSettings(prev => ({ ...prev, logo: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (field, value) => {
    setDraftSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const persistedSettings = await saveSettings(draftSettings);
      setDraftSettings(persistedSettings);
      setShowSaveToast(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDatabase = async () => {
    const didReset = await resetDatabase();
    if (didReset) setDraftSettings(INITIAL_SETTINGS);
  };

  return (
    <div className="min-h-screen bg-[var(--fuego-bg)] transition-colors duration-300">
      <div className="max-w-7xl mx-auto p-12 lg:px-16">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div>
            <div className="flex items-center gap-3 text-fuego-orange mb-4">
              <div className="w-8 h-1 bg-fuego-orange rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-[0.5em]">System Configuration</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-[var(--fuego-text)]">
              Operations Center
            </h1>
            <p className="text-[var(--fuego-text-muted)] text-lg mt-4 max-w-xl leading-relaxed">
              Global control for your restaurant's digital infrastructure, fiscal compliance, and terminal protocols.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <AnimatePresence>
              {showSaveToast && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-sm"
                >
                  <CheckCircle2 size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Settings Synced</span>
                </motion.div>
              )}
            </AnimatePresence>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="group relative px-10 py-5 bg-fuego-orange text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-3 transition-all active:scale-95 shadow-2xl shadow-fuego-orange/30 hover:brightness-110 disabled:opacity-50"
            >
              <Save size={18} className={isSaving ? 'animate-spin' : ''} />
              {isSaving ? 'Syncing...' : 'Commit Changes'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-8">
            <SettingCard 
              title="Store Identity" 
              subtitle="Brand manifest & localization" 
              icon={Building2}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                  <FormField label="Brand Name">
                    <input
                      type="text"
                      value={draftSettings.restaurantName || ''}
                      onChange={e => handleInputChange('restaurantName', e.target.value)}
                      className="w-full bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-2xl px-6 py-4 text-[var(--fuego-text)] focus:border-fuego-orange outline-none transition-all font-bold text-xl shadow-inner-sm"
                    />
                  </FormField>
                </div>

                <div className="md:col-span-2">
                  <FormField label="Visual Identifier">
                    <div className="flex items-center gap-10 p-6 bg-[var(--fuego-bg)]/40 rounded-3xl border border-[var(--fuego-border)]">
                      <div className="relative group">
                        <div className="w-32 h-32 rounded-3xl border-2 border-dashed border-[var(--fuego-border)] overflow-hidden bg-[var(--fuego-bg)] flex items-center justify-center transition-all group-hover:border-fuego-orange/50">
                          {draftSettings.logo ? (
                            <img src={draftSettings.logo} alt="Logo" className="w-full h-full object-contain p-4" />
                          ) : (
                            <Camera className="text-[var(--fuego-text-muted)] opacity-20" size={40} />
                          )}
                          <input type="file" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-4">
                        <h4 className="text-[var(--fuego-text)] font-bold text-sm">System Asset</h4>
                        <p className="text-[11px] text-[var(--fuego-text-muted)] leading-relaxed">
                          Used on thermal receipts and digital invoices. High-contrast PNG or SVG works best.
                        </p>
                        <label className="inline-block px-6 py-2 bg-fuego-orange/10 border border-fuego-orange/30 text-fuego-orange rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-fuego-orange hover:text-white transition-all">
                          Upload New Asset
                          <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                        </label>
                      </div>
                    </div>
                  </FormField>
                </div>

                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField label="Corporate Address">
                      <textarea
                        value={draftSettings.address || ''}
                        onChange={e => handleInputChange('address', e.target.value)}
                        className="w-full bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-2xl px-6 py-4 text-[var(--fuego-text)] focus:border-fuego-orange outline-none transition-all font-medium text-xs leading-relaxed min-h-[120px]"
                      />
                    </FormField>
                    <div className="space-y-8">
                      <FormField label="System Hotline">
                        <input
                          type="text"
                          value={draftSettings.phone || ''}
                          onChange={e => handleInputChange('phone', e.target.value)}
                          className="w-full bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-2xl px-6 py-4 text-[var(--fuego-text)] focus:border-fuego-orange outline-none transition-all font-mono font-bold"
                        />
                      </FormField>
                      <FormField label="Terminal Zone">
                        <div className="flex items-center gap-3 px-6 py-4 bg-[var(--fuego-bg)] rounded-2xl border border-[var(--fuego-border)] text-xs font-bold text-[var(--fuego-text-muted)]">
                          <Globe size={16} className="text-fuego-orange" />
                          UTC+05:30 (IST)
                        </div>
                      </FormField>
                    </div>
                  </div>
                </div>
              </div>
            </SettingCard>

            <SettingCard 
              title="Security Protocol" 
              subtitle="Data protection & access control" 
              icon={Lock}
            >
              <div className="space-y-8">
                <div className={`p-6 rounded-3xl border transition-all duration-500 ${
                  draftSettings.pincodeEnabled 
                    ? 'bg-fuego-orange/5 border-fuego-orange/30' 
                    : 'bg-[var(--fuego-bg)] border-[var(--fuego-border)]'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-[var(--fuego-text)]">Lock Finances Section</h3>
                      <p className="text-[10px] text-[var(--fuego-text-muted)] uppercase font-black tracking-widest mt-1">
                        Require PIN to access sensitive data
                      </p>
                    </div>
                    <button
                      onClick={() => handleInputChange('pincodeEnabled', !draftSettings.pincodeEnabled)}
                      className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${
                        draftSettings.pincodeEnabled ? 'bg-fuego-orange shadow-lg shadow-fuego-orange/20' : 'bg-[var(--fuego-border)]'
                      }`}
                    >
                      <motion.div
                        layout
                        className="w-6 h-6 bg-white rounded-full shadow-sm"
                        animate={{ x: draftSettings.pincodeEnabled ? 24 : 0 }}
                      />
                    </button>
                  </div>

                  {draftSettings.pincodeEnabled && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-8 space-y-6 pt-6 border-t border-fuego-orange/20"
                    >
                      <FormField 
                        label="Set 4-Digit Security PIN"
                        hint="This code will be required when clicking the Finance tab."
                      >
                        <div className="relative group">
                          <input
                            type={showPin ? "text" : "password"}
                            maxLength={4}
                            placeholder="SET PIN CODE"
                            value={draftSettings.pincode || ''}
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                              handleInputChange('pincode', val);
                            }}
                            className="w-full bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-2xl px-6 py-5 text-[var(--fuego-text)] focus:border-fuego-orange outline-none transition-all font-mono font-bold tracking-[0.5em] text-xl text-center shadow-inner-sm"
                          />
                          <button
                            onClick={() => setShowPin(!showPin)}
                            className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--fuego-text-muted)] hover:text-fuego-orange transition-colors"
                          >
                            {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                          {draftSettings.pincode && (
                            <button
                              onClick={() => handleInputChange('pincode', '')}
                              className="absolute right-6 top-1/2 -translate-y-1/2 text-red-500/50 hover:text-red-500 transition-colors text-[9px] font-black uppercase tracking-widest"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </FormField>

                      <div className="p-4 bg-fuego-orange/10 border border-fuego-orange/20 rounded-2xl flex items-start gap-3">
                        <AlertCircle size={16} className="text-fuego-orange shrink-0 mt-0.5" />
                        <p className="text-[10px] text-fuego-orange/80 font-black uppercase tracking-widest leading-relaxed">
                          Remember to click "Commit Changes" above to apply your security settings.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </SettingCard>
          </div>

          <div className="lg:col-span-5 space-y-8">
            <SettingCard 
              title="Fiscal Policy" 
              subtitle="Taxation & global compliance" 
              icon={Receipt}
            >
              <div className="space-y-8">
                <div className={`p-6 rounded-3xl border transition-all duration-500 ${
                  draftSettings.gstEnabled 
                    ? 'bg-fuego-orange/5 border-fuego-orange/30' 
                    : 'bg-[var(--fuego-bg)] border-[var(--fuego-border)]'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-[var(--fuego-text)] text-sm">Goods & Services Tax</h3>
                      <p className="text-[10px] text-[var(--fuego-text-muted)] font-black uppercase tracking-widest mt-1">Automatic levy calculation</p>
                    </div>
                    <button
                      onClick={() => handleInputChange('gstEnabled', !draftSettings.gstEnabled)}
                      className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${
                        draftSettings.gstEnabled ? 'bg-fuego-orange shadow-lg' : 'bg-[var(--fuego-border)]'
                      }`}
                    >
                      <motion.div
                        layout
                        className="w-6 h-6 bg-white rounded-full shadow-sm"
                        animate={{ x: draftSettings.gstEnabled ? 24 : 0 }}
                      />
                    </button>
                  </div>

                  {draftSettings.gstEnabled && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-8 space-y-6 pt-6 border-t border-fuego-orange/20"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Rate %">
                          <input
                            type="number"
                            value={draftSettings.gstRate || 0}
                            onChange={e => handleInputChange('gstRate', Number(e.target.value))}
                            className="w-full bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-xl px-4 py-3 text-[var(--fuego-text)] focus:border-fuego-orange outline-none font-bold font-mono"
                          />
                        </FormField>
                        <FormField label="GSTIN">
                          <input
                            type="text"
                            value={draftSettings.gstNumber || ''}
                            onChange={e => handleInputChange('gstNumber', e.target.value.toUpperCase())}
                            placeholder="IN27..."
                            className="w-full bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-xl px-4 py-3 text-[var(--fuego-text)] focus:border-fuego-orange outline-none font-bold font-mono uppercase"
                          />
                        </FormField>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </SettingCard>

            <SettingCard 
              title="Hardware Protocol" 
              subtitle="Device I/O & peripherals" 
              icon={Cpu}
            >
              <div className="grid grid-cols-1 gap-6">
                <FormField label="Thermal Engine">
                  <div className="relative">
                    <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-fuego-orange" />
                    <select
                      value={draftSettings.printerModel || 'RP326'}
                      onChange={e => handleInputChange('printerModel', e.target.value)}
                      className="w-full bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-2xl pl-12 pr-6 py-4 text-[var(--fuego-text)] focus:border-fuego-orange outline-none transition-all font-bold appearance-none"
                    >
                      <option value="RP326">Rugtek RP326 Evolution</option>
                      <option value="Generic80">Legacy 80mm Driver</option>
                      <option value="Generic58">Compact 58mm Driver</option>
                    </select>
                  </div>
                </FormField>

                <FormField label="Sheet Geometry">
                  <select
                    value={draftSettings.paperWidth || '80mm (3")'}
                    onChange={e => handleInputChange('paperWidth', e.target.value)}
                    className="w-full bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-2xl px-6 py-4 text-[var(--fuego-text)] focus:border-fuego-orange outline-none transition-all font-bold appearance-none"
                  >
                    <option value='80mm (3")'>80mm Professional Standard</option>
                    <option value='58mm (2")'>58mm Compact Feed</option>
                  </select>
                </FormField>
              </div>
            </SettingCard>

            <SettingCard 
              title="Factory Reset" 
              subtitle="Critical system recovery" 
              icon={Trash2}
              variant="danger"
            >
              <p className="text-[11px] text-red-500/70 mb-8 italic leading-relaxed">
                Purges all local records including orders, menu architecture, and encrypted settings. This action is irreversible.
              </p>
              <button
                onClick={handleResetDatabase}
                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-[0.98] shadow-lg shadow-red-500/20 flex items-center justify-center gap-3"
              >
                <Trash2 size={16} />
                Initialize Factory Purge
              </button>
            </SettingCard>
          </div>
        </div>
        
        <footer className="mt-20 pt-8 border-t border-[var(--fuego-border)] flex items-center justify-between text-[var(--fuego-text-muted)]">
          <p className="text-[10px] font-black uppercase tracking-widest">Fuego Terminal OS v3.1.0-alpha</p>
          <p className="text-[10px] font-black uppercase tracking-widest italic opacity-50">Local Database: sqlite3-v5.1</p>
        </footer>
      </div>
    </div>
  );
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};
