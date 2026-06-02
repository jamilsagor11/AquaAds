import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { db, collection, query, where, orderBy, onSnapshot } from '../firebase';
import { Campaign, SupportRequest } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Clock, CheckCircle2, XCircle, TrendingUp, Wallet, Package, Eye, Calendar, Target, ExternalLink, ArrowRight, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../firebase';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'support'>('campaigns');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);

  useEffect(() => {
    if (!user) return;

    const qCampaigns = query(
      collection(db, 'campaigns'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const qSupport = query(
      collection(db, 'support_requests'),
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

    const unsubSupport = onSnapshot(qSupport, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportRequest));
      setSupportRequests(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'support_requests');
    });

    return () => {
      unsubCampaigns();
      unsubSupport();
    };
  }, [user]);

  const stats = {
    totalSpent: campaigns.reduce((acc, c) => acc + c.totalPrice, 0),
    active: campaigns.filter(c => c.status === 'approved').length,
    pending: campaigns.filter(c => c.status === 'pending').length,
    unreadReplies: supportRequests.filter(r => r.adminReply && r.status === 'resolved').length,
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Loading your dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome back!</h1>
          <p className="text-slate-500">Here's what's happening with your account.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
            <Wallet className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Total Spending</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalSpent)}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 mb-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Active Campaigns</p>
          <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Pending Approval</p>
          <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-4">
            <MessageSquare className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">My Requests</p>
          <p className="text-2xl font-bold text-slate-900">{supportRequests.length}</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={cn(
            "pb-4 text-sm font-bold transition-all border-b-2",
            activeTab === 'campaigns' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          My Campaigns
        </button>
        <button
          onClick={() => setActiveTab('support')}
          className={cn(
            "pb-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2",
            activeTab === 'support' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Personal Requests
          {stats.unreadReplies > 0 && (
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'campaigns' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Recent Campaigns</h2>
            <span className="text-sm text-slate-500">{campaigns.length} total</span>
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
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Personal Requests</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {supportRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No requests found. Use the "Contact Management" button in the footer to send a message.
              </div>
            ) : (
              supportRequests.map((request) => (
                <div key={request.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        request.status === 'resolved' ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                      )}>
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Request from {new Date(request.createdAt).toLocaleDateString()}</p>
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1",
                          request.status === 'resolved' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        )}>
                          {request.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                    >
                      View Details
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2 italic">"{request.message}"</p>
                  {request.adminReply && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <p className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-1">Management Reply</p>
                      <p className="text-sm text-blue-700 font-medium">{request.adminReply}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
              className="relative bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3",
                      selectedCampaign.status === 'approved' ? "bg-green-100 text-green-700" :
                      selectedCampaign.status === 'rejected' ? "bg-red-100 text-red-700" :
                      "bg-amber-100 text-amber-700"
                    )}>
                      {selectedCampaign.status.toUpperCase()}
                    </span>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                      {selectedCampaign.campaignName || 'Campaign Details'}
                    </h2>
                    <p className="text-slate-500 font-medium">Order ID: {selectedCampaign.id}</p>
                  </div>
                  <button
                    onClick={() => setSelectedCampaign(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Target Audience</p>
                        <p className="text-sm font-bold text-slate-900">{selectedCampaign.targetAudience}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
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
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
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
                      <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Total Paid</p>
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(selectedCampaign.totalPrice)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl mb-8">
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-600" /> Your Creative
                  </h3>
                  <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                        <Package className="w-6 h-6" />
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
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Our team is currently reviewing your campaign. You will receive an update here once it's approved and scheduled for production.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Request Details Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRequest(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3",
                      selectedRequest.status === 'resolved' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {selectedRequest.status.toUpperCase()}
                    </span>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Request Details</h2>
                    <p className="text-slate-500 text-sm">Sent on {new Date(selectedRequest.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">Your Message</p>
                    <div className="bg-slate-50 p-6 rounded-2xl">
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedRequest.message}</p>
                    </div>
                  </div>

                  {selectedRequest.adminReply && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-2">Management Reply</p>
                      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <p className="text-blue-700 leading-relaxed whitespace-pre-wrap font-medium">{selectedRequest.adminReply}</p>
                        <p className="text-[10px] text-blue-300 mt-3">Replied on {new Date(selectedRequest.repliedAt!).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}

                  {!selectedRequest.adminReply && selectedRequest.status === 'pending' && (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <Clock className="w-5 h-5 text-amber-600" />
                      <p className="text-xs text-amber-700 leading-relaxed">
                        Our management team has received your request and will reply shortly.
                      </p>
                    </div>
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
