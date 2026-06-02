/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { CampaignForm } from './components/CampaignForm';
import { AdminPanel } from './components/AdminPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Droplets, ArrowRight, ShieldCheck, BarChart3, Globe } from 'lucide-react';
import { motion } from 'motion/react';

const LandingPage: React.FC = () => {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <nav className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
        <div className="flex items-center gap-2 text-blue-600">
          <Droplets className="w-8 h-8" />
          <span className="text-2xl font-black tracking-tight">AquaAds</span>
        </div>
        <button
          onClick={login}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          Get Started
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-12 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-6xl md:text-7xl font-black text-slate-900 leading-[1.1] mb-8">
            Advertise on <span className="text-blue-600">Every Sip.</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-lg leading-relaxed">
            The world's first square-shaped paper water bottle advertising platform. 
            Reach thousands of customers with eco-friendly, high-impact branding.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={login}
              className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center gap-2 group"
            >
              Launch Your Campaign <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <div className="mt-12 flex items-center gap-8">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map(i => (
                <img
                  key={i}
                  src={`https://picsum.photos/seed/user${i}/100/100`}
                  alt="User"
                  className="w-12 h-12 rounded-full border-4 border-white shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
            <p className="text-sm font-medium text-slate-500">
              Joined by <span className="text-slate-900 font-bold">500+</span> companies
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative"
        >
          <div className="absolute -inset-4 bg-blue-100 rounded-[4rem] rotate-6 blur-3xl opacity-30"></div>
          <div className="relative bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100">
            <img
              src="https://picsum.photos/seed/bottle-ad/800/1000"
              alt="Bottle Preview"
              className="rounded-2xl shadow-lg"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-8 -left-8 bg-white p-6 rounded-3xl shadow-xl border border-slate-50 max-w-[200px]">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Eco-Friendly</span>
              </div>
              <p className="text-sm font-bold text-slate-900">100% Recyclable Paper Bottles</p>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Features Section */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Why AquaAds?</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">We combine sustainability with high-visibility advertising to help your brand stand out.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Globe, title: 'Targeted Reach', desc: 'Select specific areas in major cities to reach your ideal demographic.' },
              { icon: BarChart3, title: 'Real-time Analytics', desc: 'Track your campaign performance and ROI directly from your dashboard.' },
              { icon: Droplets, title: 'Sustainable Impact', desc: 'Promote your brand while supporting plastic-free alternatives.' }
            ].map((f, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                  <f.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 text-blue-600">
            <Droplets className="w-6 h-6" />
            <span className="text-xl font-black tracking-tight">AquaAds</span>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-2">
            <p className="text-slate-500 text-sm">© 2026 AquaAds. All rights reserved.</p>
            <div className="text-[10px] text-slate-300 font-medium tracking-wider uppercase">
              ( Made by Jamil 01307541441 )
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-blue-600"
        >
          <Droplets className="w-12 h-12" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <ErrorBoundary>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'campaign' && <CampaignForm />}
        {activeTab === 'admin' && <AdminPanel />}
      </Layout>
    </ErrorBoundary>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
