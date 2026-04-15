import React from 'react';
import { usePOS } from '../context/POSContext';
import { 
  BarChart2, 
  ShoppingCart, 
  History, 
  Settings, 
  Utensils,
  Landmark,
  Users,
  Sun,
  Moon
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center p-4 w-full transition-all duration-300 gap-1 group",
      active 
        ? "text-fuego-orange bg-fuego-orange/10 border-r-[3px] border-fuego-orange shadow-[inset_-10px_0_15px_-10px_rgba(234,88,12,0.1)]" 
        : "text-[var(--fuego-text-muted)] hover:text-[var(--fuego-text)] hover:bg-[var(--fuego-bg)]"
    )}
  >
    <Icon size={22} className={cn("transition-transform group-hover:scale-110", active && "scale-110")} />
    <span className="text-[9px] font-black uppercase tracking-[0.15em]">{label}</span>
  </button>
);

export const Sidebar = () => {
  const { activeView, setActiveView, theme, toggleTheme } = usePOS();

  return (
    <aside className="w-24 bg-[var(--fuego-sidebar)] border-r border-[var(--fuego-border)] flex flex-col items-center py-6 h-screen sticky top-0 no-print transition-colors duration-300">
      <div className="mb-10 text-fuego-orange font-logo text-2xl italic font-bold">F</div>
      
      <div className="flex-1 w-full space-y-2">
        <SidebarItem 
          icon={ShoppingCart} 
          label="Terminal" 
          active={activeView === 'POS'} 
          onClick={() => setActiveView('POS')} 
        />
        <SidebarItem 
          icon={BarChart2} 
          label="Analytics" 
          active={activeView === 'Dashboard'} 
          onClick={() => setActiveView('Dashboard')} 
        />
        <SidebarItem 
          icon={History} 
          label="History" 
          active={activeView === 'History'} 
          onClick={() => setActiveView('History')} 
        />
        <SidebarItem 
          icon={Utensils} 
          label="Menu" 
          active={activeView === 'Menu'} 
          onClick={() => setActiveView('Menu')} 
        />
        <SidebarItem 
          icon={Users} 
          label="Customers" 
          active={activeView === 'Customers'} 
          onClick={() => setActiveView('Customers')} 
        />
        <SidebarItem 
          icon={Landmark} 
          label="Finances" 
          active={activeView === 'Accounts'} 
          onClick={() => setActiveView('Accounts')} 
        />
      </div>

      <div className="mt-auto flex flex-col items-center w-full gap-4">
        <button 
          onClick={toggleTheme}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-fuego-orange/10 text-fuego-orange hover:bg-fuego-orange/20 transition-all active:scale-95"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <SidebarItem 
          icon={Settings} 
          label="Settings" 
          active={activeView === 'Settings'} 
          onClick={() => setActiveView('Settings')} 
        />
      </div>
    </aside>
  );
};
