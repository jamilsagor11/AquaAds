import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { db, collection, query, where, orderBy, onSnapshot } from '../firebase';
import { Campaign } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Clock, CheckCircle2, XCircle, TrendingUp, Wallet, Package, Eye, Calendar, Target, ExternalLink, ArrowRight, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../firebase';
import { BottleVisualizer } from './BottleVisualizer';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    if (!user) return;

    const qCampaigns = query(
      collection(db, 'campaigns'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubCampaigns = onSnapshot(qCampaigns, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
      setCampaigns(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'campaigns');
      setLoading(false);
    });

    return () => {
      unsubCampaigns();
    };
  }, [user]);

  const stats = {
    totalSpent: campaigns.reduce((acc, c) => acc + c.totalPrice, 0),
    totalBottles: campaigns.reduce((acc, c) => acc + (c.bottles || 0), 0),
    active: campaigns.filter(c => c.status === 'approved').length,
    pending: campaigns.filter(c => c.status === 'pending').length,
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500 font-medium">Loading your dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back!</h1>
          <p className="text-slate-500">Here's what's happening with your promotional water campaigns.</p>
        </div>
        {onNavigate && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('messages')}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-blue-600" />
              Live Messages Desk
            </button>
            <button
              onClick={() => onNavigate('campaign')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              + Create Campaign
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
            <Wallet className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Total Spending</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalSpent)}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-4">
            <Package className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Total Bottles</p>
          <p className="text-2xl font-bold text-slate-900">{stats.totalBottles.toLocaleString()}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 mb-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Active Campaigns</p>
          <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Pending Review</p>
          <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
        </motion.div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Your Campaigns</h2>
            <p className="text-xs text-slate-500 mt-0.5">Track production status, delivery timeline, and square bottle proofs.</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-full">
            {campaigns.length} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Campaign Info</th>
                <th className="px-6 py-4">Configuration</th>
                <th className="px-6 py-4">Timeline</th>
                <th className="px-6 py-4">Total Cost</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No campaigns found. Start your first one today!
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{campaign.campaignName || 'Untitled Campaign'}</p>
                          <p className="text-xs text-slate-500">{campaign.area}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-700">{campaign.bottles.toLocaleString()} Bottles</p>
                      <p className="text-xs text-slate-500">{campaign.sides} Side{campaign.sides > 1 ? 's' : ''}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(campaign.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <ArrowRight className="w-3 h-3" />
                        <span>{new Date(campaign.endDate).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-blue-600">{formatCurrency(campaign.totalPrice)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold",
                        campaign.status === 'approved' ? "bg-green-100 text-green-700" :
                        campaign.status === 'rejected' ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      )}>
                        {campaign.status === 'approved' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                         campaign.status === 'rejected' ? <XCircle className="w-3.5 h-3.5" /> :
                         <Clock className="w-3.5 h-3.5" />}
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedCampaign(campaign)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Details Modal */}
      <AnimatePresence>
        {selectedCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCampaign(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-5 sm:p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2",
                      selectedCampaign.status === 'approved' ? "bg-green-100 text-green-700" :
                      selectedCampaign.status === 'rejected' ? "bg-red-100 text-red-700" :
                      "bg-amber-100 text-amber-700"
                    )}>
                      {selectedCampaign.status.toUpperCase()}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {selectedCampaign.campaignName || 'Campaign Details'}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Order ID: {selectedCampaign.id}</p>
                  </div>
                  <button
                    onClick={() => setSelectedCampaign(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Target Audience</p>
                        <p className="text-sm font-bold text-slate-900">{selectedCampaign.targetAudience}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 flex-shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Inventory</p>
                        <p className="text-sm font-bold text-slate-900">{selectedCampaign.bottles.toLocaleString()} Bottles</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Timeline</p>
                        <p className="text-sm font-bold text-slate-900">
                          {new Date(selectedCampaign.startDate).toLocaleDateString()} - {new Date(selectedCampaign.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 flex-shrink-0">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Total Paid</p>
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(selectedCampaign.totalPrice)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl mb-6">
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-blue-600" /> Square Bottle 3D Preview
                    </span>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                      {selectedCampaign.sides} Side{selectedCampaign.sides > 1 ? 's' : ''} Branded
                    </span>
                  </h3>
                  
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 mb-4">
                    <BottleVisualizer
                      selectedSides={selectedCampaign.sides}
                      designUrls={selectedCampaign.designUrls || (selectedCampaign.designUrl ? [selectedCampaign.designUrl] : [])}
                      designUrl={selectedCampaign.designUrl}
                    />
                  </div>

                  {selectedCampaign.designUrls && selectedCampaign.designUrls.length > 1 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-700">Artwork for {selectedCampaign.sides} Sides ({selectedCampaign.designUrls.length} Files):</p>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedCampaign.designUrls.map((url, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <img src={url} alt={`Side ${idx + 1}`} className="w-8 h-8 object-contain rounded bg-slate-50 border border-slate-100" referrerPolicy="no-referrer" />
                              <span className="text-xs font-bold text-slate-800 truncate">Side {idx + 1}</span>
                            </div>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold shrink-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Design File</p>
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">{selectedCampaign.designUrl}</p>
                        </div>
                      </div>
                      <a
                        href={selectedCampaign.designUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
                      >
                        <span>Open Link</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      {selectedCampaign.status === 'approved' 
                        ? 'Campaign is active in production and distribution.' 
                        : selectedCampaign.status === 'rejected'
                        ? 'Campaign was rejected. Message our team for adjustments.'
                        : 'Our team is reviewing your artwork. You can send updates in Live Messages.'}
                    </p>
                  </div>
                  {onNavigate && (
                    <button
                      onClick={() => {
                        setSelectedCampaign(null);
                        onNavigate('messages');
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      Message Team
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
