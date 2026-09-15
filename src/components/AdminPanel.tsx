import React, { useEffect, useState } from 'react';
import { db, collection, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc } from '../firebase';
import { Campaign, UserProfile } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { CheckCircle2, XCircle, Clock, Users, BarChart3, Package, Eye, Calendar, Target, ExternalLink, ArrowRight, MessageSquare, Trash2, ShieldCheck, Database, RefreshCw, Copy, Check, Server, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../firebase';
import { BottleVisualizer } from './BottleVisualizer';
import { supabase, checkSupabaseHealth, syncCampaignToSupabase, syncProfileToSupabase, SUPABASE_URL, SupabaseHealthStatus } from '../lib/supabase';
import { useAuth, isAdminEmail } from '../AuthContext';
import { getLocalCampaigns, updateLocalCampaignStatus, deleteLocalCampaign, getLocalUsers } from '../lib/localData';

interface AdminPanelProps {
  onNavigate?: (tab: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onNavigate }) => {
  const { user, isAdmin } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => getLocalCampaigns());
  const [users, setUsers] = useState<UserProfile[]>(() => getLocalUsers());
  const [loading, setLoading] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<'campaigns' | 'users' | 'supabase'>('campaigns');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Supabase management state
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseHealthStatus | null>(null);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  
  // Password protection state
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  // Auto-authorize logged-in admins (jmisagor079@gmail.com and tonmoyletar@gmail.com)
  useEffect(() => {
    if (isAdmin || isAdminEmail(user?.email)) {
      setIsAuthorized(true);
    }
  }, [isAdmin, user]);

  const runSupabaseTest = async () => {
    setTestingSupabase(true);
    try {
      const status = await checkSupabaseHealth();
      setSupabaseStatus(status);
    } catch (err: any) {
      setSupabaseStatus({
        connected: false,
        url: SUPABASE_URL,
        tables: { profiles: false, campaigns: false, messages: false },
        error: err?.message || 'Check failed',
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setTestingSupabase(false);
    }
  };

  const syncAllDataToSupabase = async () => {
    setSyncingSupabase(true);
    setSyncSummary(null);
    let campaignsSynced = 0;
    let profilesSynced = 0;

    try {
      // Sync profiles
      for (const u of users) {
        await syncProfileToSupabase(u);
        profilesSynced++;
      }

      // Sync campaigns
      for (const c of campaigns) {
        await syncCampaignToSupabase({
          id: c.id,
          userId: c.userId,
          campaignName: c.campaignName || 'Campaign',
          companyName: c.companyName || 'Company',
          bottles: c.bottles || 100,
          sides: c.sides || 1,
          area: c.area || 'General',
          targetAudience: c.targetAudience || 'General',
          startDate: c.startDate || new Date().toISOString().split('T')[0],
          endDate: c.endDate || new Date().toISOString().split('T')[0],
          designUrl: c.designUrl || '',
          totalPrice: c.totalPrice || 0,
          status: c.status || 'pending',
          createdAt: c.createdAt,
        });
        campaignsSynced++;
      }

      setSyncSummary(`Successfully pushed ${profilesSynced} client profiles and ${campaignsSynced} campaigns to Supabase.`);
      await runSupabaseTest();
    } catch (err: any) {
      setSyncSummary(`Sync encountered an issue: ${err?.message || 'Check console for details'}`);
    } finally {
      setSyncingSupabase(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;

    const qCampaigns = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));

    const unsubCampaigns = onSnapshot(qCampaigns, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
      const local = getLocalCampaigns();
      const mergedMap = new Map<string, Campaign>();
      data.forEach(c => mergedMap.set(c.id, c));
      local.forEach(c => {
        if (!mergedMap.has(c.id)) mergedMap.set(c.id, c);
      });
      setCampaigns(Array.from(mergedMap.values()));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'campaigns');
      setLoading(false);
    });

    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      const localUsers = getLocalUsers();
      const mergedMap = new Map<string, UserProfile>();
      data.forEach(u => mergedMap.set(u.uid, u));
      localUsers.forEach(u => {
        if (!mergedMap.has(u.uid)) mergedMap.set(u.uid, u);
      });
      setUsers(Array.from(mergedMap.values()));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    return () => {
      unsubCampaigns();
      unsubUsers();
    };
  }, [isAuthorized]);

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    // Immediately apply locally
    updateLocalCampaignStatus(id, status);
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    if (selectedCampaign?.id === id) {
      setSelectedCampaign(prev => prev ? { ...prev, status } : null);
    }

    try {
      await updateDoc(doc(db, 'campaigns', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `campaigns/${id}`);
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) return;
    
    // Immediately apply locally
    deleteLocalCampaign(id);
    setCampaigns(prev => prev.filter(c => c.id !== id));
    if (selectedCampaign?.id === id) {
      setSelectedCampaign(null);
    }

    try {
      await deleteDoc(doc(db, 'campaigns', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `campaigns/${id}`);
    }
  };

  const toggleUserRole = async (uid: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change user role to ${newRole}?`)) return;
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const exportToCSV = () => {
    const headers = ['Campaign Name', 'Company', 'Area', 'Bottles', 'Sides', 'Target Audience', 'Start Date', 'End Date', 'Revenue', 'Status'];
    const rows = filteredCampaigns.map(c => [
      c.campaignName || 'Untitled',
      c.companyName,
      c.area,
      c.bottles,
      c.sides,
      c.targetAudience,
      c.startDate,
      c.endDate,
      c.totalPrice,
      c.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `aquaads_campaigns_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'J121213') {
      setIsAuthorized(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 w-full max-w-md"
        >
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Admin Access</h2>
            <p className="text-slate-500 text-sm mt-1">Please enter the administrative password</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className={`w-full px-5 py-4 rounded-2xl border ${
                  passwordError ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                autoFocus
              />
              {passwordError && (
                <p className="text-red-500 text-xs mt-2 ml-1">Incorrect password. Please try again.</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              Unlock Panel
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const stats = {
    totalRevenue: campaigns.reduce((acc, c) => acc + c.totalPrice, 0),
    totalBottles: campaigns.reduce((acc, c) => acc + c.bottles, 0),
    activeCampaigns: campaigns.filter(c => c.status === 'approved').length,
    pending: campaigns.filter(c => c.status === 'pending').length,
    totalClients: users.length,
  };

  const filteredCampaigns = campaigns.filter(c => 
    c.campaignName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.area?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.uid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500 font-medium">Loading admin data...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Control Center</h1>
          <p className="text-slate-500">Manage all advertising campaigns, registered clients, and client communications.</p>
        </div>

        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate('messages')}
              className="px-4 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors border border-blue-200"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Live Messages Hub</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
            <BarChart3 className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalRevenue)}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-4">
            <Package className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Total Bottles</p>
          <p className="text-2xl font-bold text-slate-900">{stats.totalBottles.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Active Campaigns</p>
          <p className="text-2xl font-bold text-slate-900">{stats.activeCampaigns}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Pending Approval</p>
          <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
        </div>
      </div>

      {/* Admin Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => { setActiveAdminTab('campaigns'); setSearchTerm(''); }}
            className={cn(
              "pb-4 px-2 text-sm font-bold transition-all border-b-2",
              activeAdminTab === 'campaigns' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            Campaigns & Orders ({campaigns.length})
          </button>
          <button
            onClick={() => { setActiveAdminTab('users'); setSearchTerm(''); }}
            className={cn(
              "pb-4 px-2 text-sm font-bold transition-all border-b-2",
              activeAdminTab === 'users' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            Registered Clients ({users.length})
          </button>
          <button
            onClick={() => { setActiveAdminTab('supabase'); setSearchTerm(''); runSupabaseTest(); }}
            className={cn(
              "pb-4 px-2 text-sm font-bold transition-all border-b-2 flex items-center gap-1.5",
              activeAdminTab === 'supabase' ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <Database className="w-4 h-4" />
            <span>Supabase Database</span>
          </button>
        </div>

        <div className="pb-4">
          <div className="relative">
            <input
              type="text"
              placeholder={`Search ${activeAdminTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
            />
            <Eye className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Content Area */}
      {activeAdminTab === 'campaigns' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">Campaign Management</h2>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" /> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Campaign & Client</th>
                  <th className="px-6 py-4">Configuration</th>
                  <th className="px-6 py-4">Timeline</th>
                  <th className="px-6 py-4">Revenue</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No campaigns found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredCampaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{campaign.campaignName || 'Untitled Campaign'}</p>
                          <p className="text-xs text-slate-500">{campaign.companyName} • {campaign.area}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-700 font-medium">{campaign.bottles.toLocaleString()} Bottles</p>
                        <p className="text-xs text-slate-500">{campaign.sides} Side{campaign.sides > 1 ? 's' : ''} • {campaign.targetAudience}</p>
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
                          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedCampaign(campaign)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {campaign.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateStatus(campaign.id, 'approved')}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => updateStatus(campaign.id, 'rejected')}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => deleteCampaign(campaign.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Campaign"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeAdminTab === 'users' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Client Directory</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Client Info</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4">Total Campaigns</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No clients found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((client) => (
                    <tr key={client.uid} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold">
                            {client.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{client.email}</p>
                            <p className="text-xs text-slate-500">UID: {client.uid}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleUserRole(client.uid, client.role)}
                          className={cn(
                            "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors",
                            client.role === 'admin' ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          )}
                        >
                          {client.role}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(client.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-900">
                          {campaigns.filter(c => c.userId === client.uid).length}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {onNavigate && (
                          <button
                            onClick={() => onNavigate('messages')}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                            title="Message Client"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span>Chat</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supabase Database Tab */}
      {activeAdminTab === 'supabase' && (
        <div className="space-y-6">
          {/* Status & Sync Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Connection Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Supabase Endpoint</h3>
                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{SUPABASE_URL}</p>
                  </div>
                </div>
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1",
                  supabaseStatus?.connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                )}>
                  <span className={cn("w-2 h-2 rounded-full", supabaseStatus?.connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse")} />
                  {supabaseStatus?.connected ? "Connected" : "Configured"}
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Profiles Table:</span>
                  <span className={cn("font-bold", supabaseStatus?.tables.profiles ? "text-emerald-600" : "text-slate-400")}>
                    {supabaseStatus?.tables.profiles ? "Active ✓" : "Pending Schema"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Campaigns Table:</span>
                  <span className={cn("font-bold", supabaseStatus?.tables.campaigns ? "text-emerald-600" : "text-slate-400")}>
                    {supabaseStatus?.tables.campaigns ? "Active ✓" : "Pending Schema"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Messages Table:</span>
                  <span className={cn("font-bold", supabaseStatus?.tables.messages ? "text-emerald-600" : "text-slate-400")}>
                    {supabaseStatus?.tables.messages ? "Active ✓" : "Pending Schema"}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={runSupabaseTest}
                  disabled={testingSupabase}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", testingSupabase && "animate-spin")} />
                  {testingSupabase ? "Testing Connection..." : "Run Health Check"}
                </button>
              </div>
            </div>

            {/* Sync Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 lg:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Server className="w-5 h-5 text-blue-600" />
                    <span>Dual Database Synchronization</span>
                  </h3>
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-semibold">
                    Real-time Mirroring
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  New campaign orders, client profiles, and live messages automatically mirror to both your primary storage and your Supabase PostgreSQL cluster. You can also manually push all existing records below.
                </p>

                {syncSummary && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{syncSummary}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={syncAllDataToSupabase}
                  disabled={syncingSupabase}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-200 flex items-center gap-2"
                >
                  <RefreshCw className={cn("w-4 h-4", syncingSupabase && "animate-spin")} />
                  {syncingSupabase ? "Synchronizing to Supabase..." : `Push All Data (${campaigns.length} Campaigns & ${users.length} Clients)`}
                </button>
                <p className="text-[11px] text-slate-400">
                  Idempotent upserts safe to run anytime.
                </p>
              </div>
            </div>
          </div>

          {/* Supabase SQL Instructions & Schema Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  <span>Supabase SQL Initialization & Migration Schema</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Run this in your Supabase Dashboard SQL Editor (<span className="font-mono text-slate-700">https://supabase.com/dashboard/project/rjdsqktrwehxvtxhbhum/sql</span>) to create tables, RLS policies, and triggers.
                </p>
              </div>

              <button
                onClick={() => {
                  const sqlScript = `-- AquaAds Supabase SQL Schema
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    company_name TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    bottles INTEGER NOT NULL CHECK (bottles > 0),
    sides INTEGER NOT NULL CHECK (sides BETWEEN 1 AND 4),
    area TEXT NOT NULL,
    target_audience TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    design_url TEXT NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_email TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    text TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow all write profiles" ON public.profiles FOR ALL USING (true);

CREATE POLICY "Allow all read campaigns" ON public.campaigns FOR SELECT USING (true);
CREATE POLICY "Allow all write campaigns" ON public.campaigns FOR ALL USING (true);

CREATE POLICY "Allow all read messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Allow all write messages" ON public.messages FOR ALL USING (true);
`;
                  navigator.clipboard.writeText(sqlScript);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2500);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                {copiedSql ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSql ? "Copied to Clipboard!" : "Copy Full SQL Script"}</span>
              </button>
            </div>

            <div className="p-6 bg-slate-900 font-mono text-xs text-slate-300 overflow-x-auto max-h-96 leading-relaxed">
              <pre className="text-emerald-400 font-semibold mb-2">-- Step 1: Open Supabase SQL Editor</pre>
              <pre className="text-slate-400 mb-4">-- https://supabase.com/dashboard/project/rjdsqktrwehxvtxhbhum/sql</pre>
              <pre className="text-blue-300">{`CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  company_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  bottles INTEGER NOT NULL,
  sides INTEGER NOT NULL,
  area TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  design_url TEXT NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  sender_email TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);`}</pre>
            </div>
          </div>
        </div>
      )}
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
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{selectedCampaign.companyName}</p>
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
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Total Revenue</p>
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

                <div className="flex items-center justify-between gap-4">
                  {selectedCampaign.status === 'pending' ? (
                    <div className="flex gap-4 flex-1">
                      <button
                        onClick={() => updateStatus(selectedCampaign.id, 'approved')}
                        className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Approve Campaign
                      </button>
                      <button
                        onClick={() => updateStatus(selectedCampaign.id, 'rejected')}
                        className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-5 h-5" /> Reject Campaign
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs text-slate-500">
                        Campaign is currently <strong className="text-slate-800">{selectedCampaign.status}</strong>.
                      </span>
                      {onNavigate && (
                        <button
                          onClick={() => {
                            setSelectedCampaign(null);
                            onNavigate('messages');
                          }}
                          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Message Client
                        </button>
                      )}
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
