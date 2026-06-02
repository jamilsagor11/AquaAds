import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { LogOut, LayoutDashboard, PlusCircle, ShieldCheck, Droplets, MessageCircle } from 'lucide-react';
import { SupportForm } from './SupportForm';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, logout, isAdmin } = useAuth();
  const [showSupport, setShowSupport] = useState(false);

  if (!user) return <>{children}</>;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'campaign', label: 'New Campaign', icon: PlusCircle },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin Panel', icon: ShieldCheck });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className="p-6 flex items-center gap-2 text-blue-600 hover:opacity-80 transition-opacity w-full text-left focus:outline-none"
        >
          <Droplets className="w-8 h-8" />
          <span className="text-xl font-bold tracking-tight">AquaAds</span>
        </button>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
          <button
            onClick={() => setShowSupport(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Contact Support
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user.email}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 p-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <Droplets className="w-5 h-5" />
              <span className="text-sm font-bold tracking-tight">© 2026 AquaAds</span>
            </button>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setShowSupport(true)}
                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Contact Management
              </button>
              <div className="text-xs text-slate-400">
                Eco-friendly Advertising Platform
              </div>
              <div className="text-[10px] text-slate-300 font-medium">
                ( Made by Jamil 01307541441 )
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Support Modal */}
      <AnimatePresence>
        {showSupport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSupport(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden"
            >
              <SupportForm onClose={() => setShowSupport(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
