import React, { useEffect, useState } from 'react';
import { db, collection, query, orderBy, onSnapshot, updateDoc, doc } from '../firebase';
import { Campaign, UserProfile, SupportRequest } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { CheckCircle2, XCircle, Clock, Users, BarChart3, Package, Eye, Calendar, Target, ExternalLink, ArrowRight, MessageSquare, Trash2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../firebase';

export const AdminPanel: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAdminTab, setActiveAdminTab] = useState<'campaigns' | 'users' | 'support'>('campaigns');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedSupportRequest, setSelectedSupportRequest] = useState<SupportRequest | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Password protection state
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    if (!isAuthorized) return;

    const qCampaigns = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const qSupport = query(collection(db, 'support_requests'), orderBy('createdAt', 'desc'));

    const unsubCampaigns = onSnapshot(qCampaigns, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
      setCampaigns(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'campaigns');
    });

    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    const unsubSupport = onSnapshot(qSupport, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportRequest));
      setSupportRequests(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'support_requests');
    });

    return () => {
      unsubCampaigns();
      unsubUsers();
      unsubSupport();
    };
  }, []);

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'campaigns', id), { status });
      if (selectedCampaign?.id === id) {
        setSelectedCampaign(prev => prev ? { ...prev, status } : null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `campaigns/${id}`);
    }
  };

  const resolveSupportRequest = async (id: string) => {
    try {
      await updateDoc(doc(db, 'support_requests', id), { status: 'resolved' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `support_requests/${id}`);
    }
  };

  const sendReply = async (id: string) => {
    if (!replyText.trim()) return;
    try {
      await updateDoc(doc(db, 'support_requests', id), { 
        adminReply: replyText,
        repliedAt: new Date().toISOString(),
        status: 'resolved'
      });
      setReplyText('');
      setSelectedSupportRequest(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `support_requests/${id}`);
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) return;
    try {
      // Note: In a real app, you'd use a deleteDoc tool or similar. 
      // For now, we'll assume the user has the delete_file tool if they want to delete files, 
      // but for Firestore we use deleteDoc.
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'campaigns', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `campaigns/${id}`);
    }
  };

  const deleteSupportRequest = async (id: string) => {
    if (!window.confirm('Delete this support request?')) return;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'support_requests', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `support_requests/${id}`);
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
    pendingSupport: supportRequests.filter(r => r.status === 'pending').length,
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

  const filteredSupport = supportRequests.filter(s => 
    s.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Loading admin data...</div>;

  const selectedCampaignUser = selectedCampaign ? users.find(u => u.uid === selectedCampaign.userId) : null;
  const selectedCampaignUserMessages = selectedCampaign 
    ? supportRequests.filter(s => s.userId === selectedCampaign.userId || s.userEmail.toLowerCase() === selectedCampaignUser?.email.toLowerCase())
    : [];

  const selectedSupportRequestUser = selectedSupportRequest
    ? users.find(u => u.uid === selectedSupportRequest.userId || u.email.toLowerCase() === selectedSupportRequest.userEmail.toLowerCase())
    : null;
  const selectedSupportRequestUserCampaigns = selectedSupportRequest
    ? campaigns.filter(c => c.userId === selectedSupportRequest.userId || (selectedSupportRequestUser && c.userId === selectedSupportRequestUser.uid))
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Admin Control Center</h1>
        <p className="text-slate-500">Manage all advertising campaigns and platform activity.</p>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <Users className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Active Campaigns</p>
          <p className="text-2xl font-bold text-slate-900">{stats.activeCampaigns}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-4">
            <MessageSquare className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Support Requests</p>
          <p className="text-2xl font-bold text-slate-900">{stats.pendingSupport}</p>
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
            Campaigns & Orders
          </button>
          <button
            onClick={() => { setActiveAdminTab('users'); setSearchTerm(''); }}
            className={cn(
              "pb-4 px-2 text-sm font-bold transition-all border-b-2",
              activeAdminTab === 'users' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            Registered Clients
          </button>
          <button
            onClick={() => { setActiveAdminTab('support'); setSearchTerm(''); }}
            className={cn(
              "pb-4 px-2 text-sm font-bold transition-all border-b-2",
              activeAdminTab === 'support' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            Support Requests
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => window.alert(`Direct messaging to ${client.email} is coming soon.`)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Message Client"
                          >
                            <MessageSquare className="w-5 h-5" />
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

      {activeAdminTab === 'support' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Support & Custom Requests</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Client Email</th>
                  <th className="px-6 py-4">Message</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSupport.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No support requests found.
                    </td>
                  </tr>
                ) : (
                  filteredSupport.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{request.userEmail}</p>
                        <p className="text-[10px] text-slate-500">UID: {request.userId || 'Guest'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 line-clamp-2 max-w-md">{request.message}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          request.status === 'resolved' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        )}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedSupportRequest(request)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Message"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {request.status === 'pending' && (
                            <button
                              onClick={() => resolveSupportRequest(request.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Mark as Resolved"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteSupportRequest(request.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Request"
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
                    <p className="text-slate-500 font-medium">{selectedCampaign.companyName}</p>
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
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Total Revenue</p>
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(selectedCampaign.totalPrice)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl mb-8">
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-600" /> Creative Asset
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

                {/* Linked Customer Messages */}
                {selectedCampaignUserMessages.length > 0 && (
                  <div className="bg-slate-50 p-6 rounded-3xl mb-8">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-purple-600" />
                      Client Messages ({selectedCampaignUserMessages.length})
                    </h3>
                    <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                      {selectedCampaignUserMessages.map((msg) => (
                        <div key={msg.id} className="flex justify-between items-start bg-white p-4 rounded-2xl border border-slate-200 text-xs">
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                                msg.status === 'resolved' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                              )}>
                                {msg.status}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {new Date(msg.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-slate-600 italic line-clamp-2">"{msg.message}"</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedSupportRequest(msg);
                              setSelectedCampaign(null);
                            }}
                            className="text-blue-600 hover:text-blue-700 font-bold hover:underline self-center whitespace-nowrap"
                          >
                            Open & Reply
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCampaign.status === 'pending' && (
                  <div className="flex gap-4">
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
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Support Request Details Modal */}
      <AnimatePresence>
        {selectedSupportRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSupportRequest(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3",
                      selectedSupportRequest.status === 'resolved' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {selectedSupportRequest.status.toUpperCase()}
                    </span>
                    <h2 className="text-2xl font-bold text-slate-900">Support Message</h2>
                    <p className="text-slate-500 text-sm">From: {selectedSupportRequest.userEmail}</p>
                  </div>
                  <button
                    onClick={() => setSelectedSupportRequest(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl mb-6">
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedSupportRequest.message}
                  </p>
                </div>

                {/* Linked Client's Orders / Campaigns */}
                {selectedSupportRequestUserCampaigns.length > 0 && (
                  <div className="bg-slate-50 p-6 rounded-3xl mb-6">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      Client Campaigns / Orders ({selectedSupportRequestUserCampaigns.length})
                    </h3>
                    <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                      {selectedSupportRequestUserCampaigns.map((camp) => (
                        <div key={camp.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 text-xs">
                          <div className="flex-1 min-w-0 mr-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold mr-2 uppercase tracking-wide",
                              camp.status === 'approved' ? "bg-green-100 text-green-700" :
                              camp.status === 'rejected' ? "bg-red-100 text-red-700" :
                              "bg-amber-100 text-amber-700"
                            )}>
                              {camp.status}
                            </span>
                            <span className="font-bold text-slate-800">
                              {camp.campaignName || 'Untitled Campaign'}
                            </span>
                            <span className="text-slate-400 mx-2">|</span>
                            <span className="text-slate-500">{camp.bottles.toLocaleString()} bottles</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-blue-600 font-bold">
                              {formatCurrency(camp.totalPrice)}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedCampaign(camp);
                                setSelectedSupportRequest(null);
                              }}
                              className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSupportRequest.adminReply && (
                  <div className="bg-blue-50 p-6 rounded-2xl mb-8 border border-blue-100">
                    <p className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-2">Previous Admin Reply</p>
                    <p className="text-blue-700 leading-relaxed whitespace-pre-wrap italic">
                      {selectedSupportRequest.adminReply}
                    </p>
                    <p className="text-[10px] text-blue-300 mt-2">
                      Replied on {new Date(selectedSupportRequest.repliedAt!).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {selectedSupportRequest.status === 'pending' && (
                  <div className="mb-8">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                      Send a Reply
                    </label>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply to the customer..."
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[120px] text-sm"
                    />
                  </div>
                )}

                <div className="flex gap-4">
                  {selectedSupportRequest.status === 'pending' && (
                    <button
                      onClick={() => sendReply(selectedSupportRequest.id)}
                      disabled={!replyText.trim()}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <MessageSquare className="w-5 h-5" /> Send Reply & Resolve
                    </button>
                  )}
                  <button
                    onClick={() => {
                      deleteSupportRequest(selectedSupportRequest.id);
                      setSelectedSupportRequest(null);
                    }}
                    className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" /> Delete Request
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
