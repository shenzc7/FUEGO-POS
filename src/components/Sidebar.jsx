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
  Moon,
  LogOut,
  PieChart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const SidebarItem = ({ icon: Icon, label, active, onClick, className }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center p-3 md:p-4 w-full transition-all duration-300 gap-1 group relative",
      active 
        ? "text-fuego-orange bg-fuego-orange/5" 
        : "text-[var(--fuego-text-muted)] hover:text-[var(--fuego-text)] hover:bg-white/5",
      className
    )}
    title={label}
  >
    {active && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[2px] md:w-[3px] h-3/5 bg-fuego-orange rounded-l-full shadow-[0_0_10px_rgba(234,88,12,0.5)]" />}
    <Icon size={20} className={cn("transition-transform group-hover:scale-110", active && "scale-110 md:scale-110", "md:w-5 md:h-5 w-6 h-6")} />
    <span className="text-[9px] font-black uppercase tracking-[0.15em] hidden md:block">{label}</span>
  </button>
);

export const Sidebar = () => {
  const { activeView, setActiveView, theme, toggleTheme } = usePOS();
  const { logout, user } = useAuth();

  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin';

  return (
    <aside className="w-16 md:w-24 bg-[var(--fuego-sidebar)] border-r border-[var(--fuego-border)] flex flex-col items-center py-6 md:py-8 h-screen sticky top-0 no-print transition-all duration-300 z-50 shrink-0">
      <div className="mb-8 md:mb-10 text-fuego-orange font-logo text-2xl md:text-3xl italic font-black">F</div>
      
      <div className="flex-1 w-full space-y-1 md:space-y-2 px-0">
        {!isOwner && (
          <>
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
          </>
        )}
        
        {(isOwner || isAdmin) && (
          <SidebarItem 
            icon={PieChart} 
            label="Insights" 
            active={activeView === 'Insights'} 
            onClick={() => setActiveView('Insights')} 
          />
        )}
      </div>

      <div className="mt-auto flex flex-col items-center w-full gap-2 px-0 pb-4">
        <div className="w-8 md:w-12 h-[1px] bg-[var(--fuego-border)] mb-4" />
        
        <button 
          onClick={toggleTheme}
          className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl text-[var(--fuego-text-muted)] hover:text-fuego-orange hover:bg-fuego-orange/10 transition-all active:scale-95 group"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={18} className="md:size-5" /> : <Moon size={18} className="md:size-5" />}
        </button>

        <SidebarItem 
          icon={Settings} 
          label="Settings" 
          active={activeView === 'Settings'} 
          onClick={() => setActiveView('Settings')} 
        />

        <button 
          onClick={() => {
            if (window.confirm('Are you sure you want to log out?')) {
              logout();
            }
          }}
          className="w-full py-4 flex items-center justify-center text-red-500/50 hover:text-red-500 hover:bg-red-500/5 transition-all active:scale-95 group"
          title="Log Out"
        >
          <LogOut size={20} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </aside>
  );
};
