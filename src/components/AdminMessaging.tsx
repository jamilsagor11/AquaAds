import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { db, collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc } from '../firebase';
import { ChatMessage, UserProfile, Campaign } from '../types';
import { handleFirestoreError, OperationType } from '../firebase';
import { syncMessageToSupabase } from '../lib/supabase';
import { Send, Search, CheckCheck, MessageSquare, Package, ShieldCheck, User, Sparkles, RefreshCw, Filter, ExternalLink, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const AdminMessaging: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnread, setFilterUnread] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all users for metadata
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const uList = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
        setUsers(uList);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );
    return () => unsubscribe();
  }, []);

  // Fetch all campaigns for reference
  useEffect(() => {
    const q = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const cList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Campaign));
        setCampaigns(cList);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'campaigns')
    );
    return () => unsubscribe();
  }, []);

  // Subscribe to all messages in real time
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allMsgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
        setMessages(allMsgs);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'messages');
      }
    );
    return () => unsubscribe();
  }, []);

  // Build list of unique conversations
  interface ConversationSummary {
    userId: string;
    userEmail: string;
    userName?: string;
    companyName?: string;
    lastMessage: string;
    lastTimestamp: string;
    unreadCount: number;
    totalMessages: number;
  }

  const conversationsMap: Record<string, ConversationSummary> = {};

  messages.forEach((msg) => {
    const convId = msg.conversationId;
    if (!convId) return;

    const userProfile = users.find((u) => u.uid === convId);
    const clientEmail = msg.senderRole === 'user' ? msg.senderEmail : msg.recipientEmail || userProfile?.email || 'Customer';
    const clientName = msg.senderRole === 'user' ? msg.senderName : userProfile?.companyName;

    if (!conversationsMap[convId]) {
      conversationsMap[convId] = {
        userId: convId,
        userEmail: userProfile?.email || clientEmail,
        userName: clientName || userProfile?.companyName,
        companyName: userProfile?.companyName,
        lastMessage: msg.message,
        lastTimestamp: msg.createdAt,
        unreadCount: 0,
        totalMessages: 0,
      };
    }

    conversationsMap[convId].lastMessage = msg.message;
    conversationsMap[convId].lastTimestamp = msg.createdAt;
    conversationsMap[convId].totalMessages += 1;

    if (msg.senderRole === 'user' && !msg.read) {
      conversationsMap[convId].unreadCount += 1;
    }
  });

  // Also include users who haven't messaged yet if searched
  users.forEach((u) => {
    if (u.role !== 'admin' && !conversationsMap[u.uid]) {
      conversationsMap[u.uid] = {
        userId: u.uid,
        userEmail: u.email,
        userName: u.companyName || u.email.split('@')[0],
        companyName: u.companyName,
        lastMessage: 'No messages yet (New Client)',
        lastTimestamp: u.createdAt,
        unreadCount: 0,
        totalMessages: 0,
      };
    }
  });

  const conversationsList = Object.values(conversationsMap).sort((a, b) => {
    return new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime();
  });

  // Filter conversations
  const filteredConversations = conversationsList.filter((conv) => {
    const matchesSearch =
      conv.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.companyName && conv.companyName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesUnread = filterUnread ? conv.unreadCount > 0 : true;
    return matchesSearch && matchesUnread;
  });

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!selectedUserId && filteredConversations.length > 0) {
      setSelectedUserId(filteredConversations[0].userId);
    }
  }, [filteredConversations, selectedUserId]);

  // Messages for currently selected conversation
  const selectedMessages = messages.filter((m) => m.conversationId === selectedUserId);
  const selectedUser = users.find((u) => u.uid === selectedUserId);
  const selectedUserCampaigns = campaigns.filter((c) => c.userId === selectedUserId);

  // Mark messages in active thread as read
  useEffect(() => {
    if (!selectedUserId) return;
    const unreadMsgs = selectedMessages.filter((m) => m.senderRole === 'user' && !m.read);
    unreadMsgs.forEach((m) => {
      updateDoc(doc(db, 'messages', m.id), { read: true }).catch(() => {});
    });
  }, [selectedUserId, selectedMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedMessages]);

  const handleSendAdminReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentAdmin || !selectedUserId || !replyText.trim() || sending) return;

    setSending(true);
    try {
      const recipientEmail = selectedUser?.email || conversationsMap[selectedUserId]?.userEmail || '';

      const messagePayload: Omit<ChatMessage, 'id'> = {
        senderId: currentAdmin.uid,
        senderEmail: currentAdmin.email,
        senderRole: 'admin',
        senderName: 'AquaAds Operations Desk',
        recipientId: selectedUserId,
        recipientEmail,
        conversationId: selectedUserId,
        message: replyText.trim(),
        createdAt: new Date().toISOString(),
        read: false,
      };

      const cleanData = Object.fromEntries(
        Object.entries(messagePayload).filter(([_, v]) => v !== undefined)
      );

      const docRef = await addDoc(collection(db, 'messages'), cleanData);
      syncMessageToSupabase({
        id: docRef.id,
        conversationId: selectedUserId,
        senderId: currentAdmin.uid,
        senderEmail: currentAdmin.email,
        senderRole: 'admin',
        text: replyText.trim(),
        read: false,
        createdAt: messagePayload.createdAt,
      });

      setReplyText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    } finally {
      setSending(false);
    }
  };

  const quickReplies = [
    'Your square bottle artwork proof is approved and sent to our sustainable print line!',
    'We reviewed your custom volume request. A special rate has been configured for your account.',
    'Could you please supply a square 1:1 format asset (or 300dpi vector) for crisp square bottle label printing?',
    'Distribution is scheduled for this upcoming Monday morning across the selected metro zone.',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Live Client Communications Hub</h2>
            <p className="text-xs text-slate-500">
              Direct two-way messaging and real-time support with all AquaAds advertisers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilterUnread(!filterUnread)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all',
              filterUnread
                ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Unread Only</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Chat Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[580px] md:min-h-[650px]">
        {/* Left Column: Conversations List */}
        <div className={cn(
          "lg:col-span-4 border-r border-slate-200 flex flex-col h-[580px] md:h-[650px] bg-slate-50/50",
          selectedUserId ? "hidden lg:flex" : "flex"
        )}>
          {/* Search bar */}
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search clients or companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active conversations matching criteria.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedUserId === conv.userId;
                return (
                  <button
                    key={conv.userId}
                    onClick={() => setSelectedUserId(conv.userId)}
                    className={cn(
                      'w-full p-4 text-left flex items-start gap-3 transition-all relative',
                      isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-100/60'
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs flex-shrink-0">
                      {conv.userEmail[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {conv.companyName || conv.userEmail.split('@')[0]}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-black">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{conv.userEmail}</p>
                      <p className="text-[11px] text-slate-400 truncate mt-1 italic">
                        "{conv.lastMessage}"
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation */}
        <div className={cn(
          "lg:col-span-8 flex flex-col h-[580px] md:h-[650px] bg-white",
          !selectedUserId ? "hidden lg:flex" : "flex"
        )}>
          {selectedUserId ? (
            <>
              {/* Client Info Header */}
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setSelectedUserId(null)}
                    className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors flex-shrink-0"
                    title="Back to all conversations"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {selectedUser?.email ? selectedUser.email[0].toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 truncate">
                      <span className="truncate">{selectedUser?.companyName || selectedUser?.email}</span>
                      <span className="hidden sm:inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-semibold flex-shrink-0">
                        ID: {selectedUserId.slice(0, 6)}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 truncate">{selectedUser?.email}</p>
                  </div>
                </div>

                {/* Campaign count badge */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-100 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{selectedUserCampaigns.length} Campaign{selectedUserCampaigns.length !== 1 ? 's' : ''}</span>
                    <span className="sm:hidden">{selectedUserCampaigns.length}</span>
                  </span>
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
                {selectedMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                    <MessageSquare className="w-8 h-8 mb-2 text-slate-300" />
                    <span>No messages exchanged with this user yet. Send an opening message below!</span>
                  </div>
                ) : (
                  selectedMessages.map((msg) => {
                    const isAdminMsg = msg.senderRole === 'admin';
                    const date = new Date(msg.createdAt);
                    const timeStr = isNaN(date.getTime())
                      ? ''
                      : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          'flex flex-col max-w-[80%]',
                          isAdminMsg ? 'ml-auto items-end' : 'mr-auto items-start'
                        )}
                      >
                        {msg.campaignName && (
                          <div className="mb-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            <span>Referenced Campaign: {msg.campaignName}</span>
                          </div>
                        )}

                        <div className="flex items-end gap-2">
                          {!isAdminMsg && (
                            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                              {msg.senderEmail[0].toUpperCase()}
                            </div>
                          )}

                          <div
                            className={cn(
                              'p-4 rounded-2xl text-sm leading-relaxed shadow-sm',
                              isAdminMsg
                                ? 'bg-slate-900 text-white rounded-br-xs'
                                : 'bg-white text-slate-900 border border-slate-200 rounded-bl-xs'
                            )}
                          >
                            <div className="text-[10px] font-bold opacity-75 mb-1">
                              {isAdminMsg ? 'Admin Response (You)' : msg.senderEmail}
                            </div>
                            <p className="whitespace-pre-wrap">{msg.message}</p>
                          </div>

                          {isAdminMsg && (
                            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                              AD
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-400">
                          <span>{timeStr}</span>
                          {isAdminMsg && msg.read && (
                            <span className="text-blue-600 font-bold flex items-center gap-0.5">
                              <CheckCheck className="w-3 h-3" /> Seen by client
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply Presets */}
              <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] font-bold text-slate-500 uppercase flex-shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-600" /> Fast Templates:
                </span>
                {quickReplies.map((qr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setReplyText(qr)}
                    className="text-[11px] bg-white hover:bg-blue-50 text-slate-700 px-3 py-1 rounded-lg border border-slate-200 whitespace-nowrap transition-colors"
                  >
                    {qr.slice(0, 32)}...
                  </button>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendAdminReply} className="p-4 bg-white border-t border-slate-200">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to ${selectedUser?.email || 'client'} as Admin...`}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || sending}
                    className={cn(
                      'px-6 py-3 rounded-2xl font-bold text-sm text-white flex items-center gap-2 transition-all shadow-md',
                      !replyText.trim() || sending
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-slate-900 hover:bg-slate-800 shadow-slate-300'
                    )}
                  >
                    {sending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Reply</span>
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
              <MessageSquare className="w-12 h-12 mb-2 text-slate-300" />
              <span>Select a client from the left to view conversation and reply</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
