import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { LogOut, LayoutDashboard, PlusCircle, ShieldCheck, Droplets, MessageSquare, Menu, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, collection, query, where, onSnapshot } from '../firebase';
import { getLocalMessages } from '../lib/localData';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, logout, isAdmin } = useAuth();
  const [unreadCount, setUnreadCount] = useState(() => {
    if (!user) return 0;
    const all = getLocalMessages();
    if (isAdmin) {
      return all.filter(m => m.senderRole === 'user' && !m.read).length;
    } else {
      return all.filter(m => m.conversationId === user.uid && m.senderRole === 'admin' && !m.read).length;
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync with local messages updates
  useEffect(() => {
    if (!user) return;
    const calcLocalUnread = () => {
      const all = getLocalMessages();
      if (isAdmin) {
        setUnreadCount(all.filter(m => m.senderRole === 'user' && !m.read).length);
      } else {
        setUnreadCount(all.filter(m => m.conversationId === user.uid && m.senderRole === 'admin' && !m.read).length);
      }
    };

    calcLocalUnread();
    window.addEventListener('aquaads_messages_updated', calcLocalUnread);
    return () => {
      window.removeEventListener('aquaads_messages_updated', calcLocalUnread);
    };
  }, [user, isAdmin]);

  // Subscribe to unread messages in Firestore if authenticated
  useEffect(() => {
    if (!user || !auth.currentUser) return;

    let unsubscribe = () => {};
    try {
      if (isAdmin) {
        // Admin sees unread messages sent by users
        const q = query(
          collection(db, 'messages'),
          where('senderRole', '==', 'user'),
          where('read', '==', false)
        );
        unsubscribe = onSnapshot(q, (snapshot) => {
          setUnreadCount(snapshot.size);
        }, () => {});
      } else {
        // User sees unread messages sent to their conversation by admin
        const q = query(
          collection(db, 'messages'),
          where('conversationId', '==', user.uid),
          where('senderRole', '==', 'admin'),
          where('read', '==', false)
        );
        unsubscribe = onSnapshot(q, (snapshot) => {
          setUnreadCount(snapshot.size);
        }, () => {});
      }
    } catch {}

    return () => unsubscribe();
  }, [user, isAdmin]);

  // Close mobile drawer when active tab changes
  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  if (!user) return <>{children}</>;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'campaign', label: 'New Campaign', icon: PlusCircle },
    { id: 'messages', label: isAdmin ? 'Live Messages' : 'Messages', icon: MessageSquare, badge: unreadCount },
  ];

  if (isAdmin) {
    navItems.push(
      { id: 'admin', label: 'Admin Panel', icon: ShieldCheck }
    );
  }

  const currentTabObj = navItems.find((n) => n.id === activeTab);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Header (Phone view) */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-2xs">
        <button
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center gap-2 text-blue-600 focus:outline-none"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Droplets className="w-5 h-5" />
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900">AquaAds</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Active section tag on mobile */}
          <span className="hidden xs:inline-flex px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold capitalize">
            {currentTabObj?.label || activeTab}
          </span>

          {/* Quick Messages with unread badge */}
          <button
            onClick={() => handleNavClick('messages')}
            className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            title="Messages"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-blue-600 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Mobile Menu Drawer Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay & Sheet */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Slide-out Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between p-6 z-10"
            >
              <div>
                {/* Brand & Close */}
                <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <Droplets className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xl font-black tracking-tight text-slate-900 block leading-tight">AquaAds</span>
                      <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Promotional Water</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* User Profile Card */}
                <div className="my-5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-blue-200">
                    {user.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{user.email}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 font-bold capitalize mt-0.5">
                      {isAdmin && <ShieldCheck className="w-3 h-3" />}
                      {user.role} Account
                    </span>
                  </div>
                </div>

                {/* Nav Links */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Navigation</p>
                  {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const hasBadge = item.badge !== undefined && item.badge > 0;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                          isActive
                            ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                            : "text-slate-700 hover:bg-slate-100"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasBadge && (
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-black",
                              isActive ? "bg-white text-blue-600" : "bg-blue-600 text-white animate-pulse"
                            )}>
                              {item.badge}
                            </span>
                          )}
                          <ChevronRight className={cn("w-4 h-4 opacity-50", isActive && "text-white")} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Drawer Actions */}
              <div className="pt-6 border-t border-slate-100">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of AquaAds</span>
                </button>
                <p className="text-[10px] text-center text-slate-400 mt-4">
                  ( Made by Jamil 01307541441 )
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar (Persists on md: and above) */}
      <aside className="hidden md:flex md:w-64 bg-white border-r border-slate-200 flex-col min-h-screen sticky top-0 h-screen">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className="p-6 flex items-center gap-2 text-blue-600 hover:opacity-80 transition-opacity w-full text-left focus:outline-none"
        >
          <Droplets className="w-8 h-8" />
          <div>
            <span className="text-xl font-bold tracking-tight text-slate-900 block leading-none">AquaAds</span>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Promotional Water</span>
          </div>
        </button>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const hasBadge = item.badge !== undefined && item.badge > 0;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                  isActive
                    ? "bg-blue-50 text-blue-600 shadow-xs font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
                {hasBadge && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-black animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{user.email}</p>
              <p className="text-[10px] text-slate-500 font-medium capitalize flex items-center gap-1">
                {isAdmin && <ShieldCheck className="w-3 h-3 text-blue-600" />}
                {user.role} Account
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Adjusted padding on mobile: pb-28 to allow space above the bottom tab bar */}
        <main className="flex-1 p-4 md:p-8 pb-28 md:pb-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>

        {/* Desktop Footer (hidden on small phone view, or compact) */}
        <footer className="hidden md:block bg-white border-t border-slate-200 p-6">
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
                onClick={() => setActiveTab('messages')}
                className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Live Messaging Desk
              </button>
              <div className="text-[10px] text-slate-300 font-medium">
                ( Made by Jamil 01307541441 )
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Phone Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const hasBadge = item.badge !== undefined && item.badge > 0;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all duration-200 min-h-[48px]",
                isActive ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800 font-medium"
              )}
            >
              <div className="relative">
                <item.icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110 text-blue-600")} />
                {hasBadge && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[9px] font-black animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] mt-0.5 tracking-tight truncate max-w-[70px]",
                isActive ? "font-bold text-blue-600" : "text-slate-500"
              )}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activePhoneTabIndicator"
                  className="absolute bottom-0.5 w-6 h-0.5 bg-blue-600 rounded-full"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
