import React, { useState, useEffect } from 'react';
import { usePOS } from './context/POSContext';
import { Sidebar } from './components/Sidebar';
import { POSScreen } from './modules/pos/POSScreen';
import { Dashboard } from './modules/dashboard/Dashboard';
import { History } from './modules/history/History';
import { MenuManager } from './modules/menu/MenuManager';
import { Settings } from './modules/settings/Settings';
import { Finances } from './modules/finances/Finances';
import { Customers } from './modules/customers/Customers';
import { ThermalReceipt } from './components/ThermalReceipt';
import { PaymentModal } from './components/PaymentModal';

import { FinancesLock } from './components/FinancesLock';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { OwnerInsights } from './modules/owner/OwnerInsights';

function App() {
  const { isAuthenticated, user } = useAuth();
  const { 
    activeView, 
    printingData, 
    printingType,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    theme,
    settings,
  } = usePOS();

  const [isFinancesUnlocked, setIsFinancesUnlocked] = useState(false);
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false);

  // Reset lock when leaving finances or settings
  useEffect(() => {
    if (activeView !== 'Accounts') {
      setIsFinancesUnlocked(false);
    }
    if (activeView !== 'Settings') {
      setIsSettingsUnlocked(false);
    }
  }, [activeView]);

  const renderView = () => {
    const isLockActive = settings?.pincodeEnabled && settings?.pincode?.length === 4;

    // If owner is logged in, prioritize insights and bypass their own locks
    if (user?.role === 'owner') {
      if (activeView === 'Settings') return <Settings />;
      return <OwnerInsights />;
    }

    if (activeView === 'Accounts' && isLockActive && !isFinancesUnlocked) {
      return (
        <FinancesLock 
          pincode={settings.pincode} 
          onUnlock={() => setIsFinancesUnlocked(true)} 
          message="Authentication required to access financial manifests."
        />
      );
    }

    if (activeView === 'Settings' && !isSettingsUnlocked) {
      return (
        <FinancesLock 
          pincode={settings?.settings_pin || "2713"} 
          onUnlock={() => setIsSettingsUnlocked(true)} 
          message="Administrator privileges required for system configuration."
        />
      );
    }

    switch (activeView) {
      case 'POS': return <POSScreen />;
      case 'Dashboard': return <Dashboard />;
      case 'History': return <History />;
      case 'Menu': return <MenuManager />;
      case 'Settings': return <Settings />;
      case 'Accounts': return <Finances />;
      case 'Customers': return <Customers />;
      case 'Insights': return <OwnerInsights />;
      default: return <POSScreen />;
    }
  };

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <>
      <div className="flex bg-fuego-dark min-h-screen text-[var(--fuego-text)] no-print" data-theme={theme}>
        {user?.role !== 'owner' && <Sidebar />}
        <main className="flex-1 overflow-hidden relative">
          {renderView()}
        </main>
      </div>
      
      {/* Hidden layout for printing */}
      <ThermalReceipt data={printingData} type={printingType} />
      
      {isPaymentModalOpen && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
        />
      )}
    </>
  );
}

export default App;
