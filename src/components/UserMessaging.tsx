import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { db, auth, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc } from '../firebase';
import { ChatMessage, Campaign } from '../types';
import { handleFirestoreError, OperationType } from '../firebase';
import { syncMessageToSupabase } from '../lib/supabase';
import { getLocalMessages, saveLocalMessage, getLocalCampaigns } from '../lib/localData';
import { Send, Droplets, ShieldCheck, Sparkles, Package, Clock, CheckCheck, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface UserMessagingProps {
  initialCampaignId?: string;
}

export const UserMessaging: React.FC<UserMessagingProps> = ({ initialCampaignId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (!user) return [];
    return getLocalMessages().filter((m) => m.conversationId === user.uid);
  });
  const [userCampaigns, setUserCampaigns] = useState<Campaign[]>(() => {
    if (!user) return [];
    return getLocalCampaigns().filter((c) => c.userId === user.uid || c.userId === 'demo_user_1');
  });
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(initialCampaignId || '');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Sync with local data updates
  useEffect(() => {
    if (!user) return;
    const syncLocal = () => {
      const localMsgs = getLocalMessages().filter((m) => m.conversationId === user.uid);
      setMessages(prev => {
        const merged = new Map<string, ChatMessage>();
        localMsgs.forEach(m => merged.set(m.id, m));
        prev.forEach(m => {
          if (!merged.has(m.id)) merged.set(m.id, m);
        });
        return Array.from(merged.values());
      });

      const localCamps = getLocalCampaigns().filter((c) => c.userId === user.uid || c.userId === 'demo_user_1');
      setUserCampaigns(localCamps);
    };

    window.addEventListener('aquaads_messages_updated', syncLocal);
    window.addEventListener('aquaads_campaigns_updated', syncLocal);

    return () => {
      window.removeEventListener('aquaads_messages_updated', syncLocal);
      window.removeEventListener('aquaads_campaigns_updated', syncLocal);
    };
  }, [user]);

  // Fetch User's Campaigns from Firestore if authenticated
  useEffect(() => {
    if (!user || !auth.currentUser) return;
    let unsub = () => {};
    try {
      const q = query(
        collection(db, 'campaigns'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Campaign));
          setUserCampaigns(prev => {
            const merged = new Map<string, Campaign>();
            prev.forEach(c => merged.set(c.id, c));
            data.forEach(c => merged.set(c.id, c));
            return Array.from(merged.values());
          });
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'campaigns');
        }
      );
    } catch {}
    return () => unsub();
  }, [user]);

  // Subscribe to real-time conversation between this User and Admin if authenticated
  useEffect(() => {
    if (!user || !auth.currentUser) return;

    let unsub = () => {};
    try {
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', user.uid),
        orderBy('createdAt', 'asc')
      );

      unsub = onSnapshot(
        q,
        (snapshot) => {
          const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
          setMessages(prev => {
            const merged = new Map<string, ChatMessage>();
            prev.forEach(m => merged.set(m.id, m));
            msgs.forEach(m => merged.set(m.id, m));
            return Array.from(merged.values());
          });
          setLoading(false);

          // Mark incoming admin messages as read
          snapshot.docs.forEach((d) => {
            const data = d.data() as ChatMessage;
            if (data.senderRole === 'admin' && !data.read) {
              updateDoc(doc(db, 'messages', d.id), { read: true }).catch(() => {});
            }
          });
        },
        (error) => {
          setLoading(false);
          handleFirestoreError(error, OperationType.LIST, 'messages');
        }
      );
    } catch {
      setLoading(false);
    }

    return () => unsub();
  }, [user]);

  // Strictly deduplicate messages by ID to prevent duplicate React keys
  const displayMessages = React.useMemo(() => {
    const seen = new Set<string>();
    const list: ChatMessage[] = [];
    for (const m of messages) {
      if (m.id && !seen.has(m.id)) {
        seen.add(m.id);
        list.push(m);
      }
    }
    return list;
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !newMessage.trim() || sending) return;

    setSending(true);
    const selectedCampaign = userCampaigns.find((c) => c.id === selectedCampaignId);
    const nowIso = new Date().toISOString();
    const tempId = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

    const messagePayload: ChatMessage = {
      id: tempId,
      senderId: user.uid,
      senderEmail: user.email,
      senderRole: 'user',
      senderName: user.companyName || user.email.split('@')[0],
      recipientId: 'admin',
      recipientEmail: 'jmisagor079@gmail.com',
      conversationId: user.uid,
      message: newMessage.trim(),
      campaignId: selectedCampaign ? selectedCampaign.id : undefined,
      campaignName: selectedCampaign ? selectedCampaign.campaignName : undefined,
      createdAt: nowIso,
      read: false,
    };

    // Save locally immediately (dispatches aquaads_messages_updated to sync state)
    saveLocalMessage(messagePayload);
    setMessages(prev => {
      if (prev.some(m => m.id === messagePayload.id)) return prev;
      return [...prev, messagePayload];
    });
    setNewMessage('');

    syncMessageToSupabase({
      id: tempId,
      conversationId: user.uid,
      senderId: user.uid,
      senderEmail: user.email,
      senderRole: 'user',
      text: messagePayload.message,
      read: false,
      createdAt: messagePayload.createdAt,
    });

    if (auth.currentUser) {
      try {
        const cleanData = Object.fromEntries(
          Object.entries(messagePayload).filter(([k, v]) => k !== 'id' && v !== undefined)
        );
        await addDoc(collection(db, 'messages'), cleanData);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'messages');
      }
    }
    setSending(false);
  };

  const handleQuickPrompt = (promptText: string) => {
    setNewMessage(promptText);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Droplets className="w-7 h-7" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">AquaAds Executive & Direct Messaging Desk</h2>
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-600" />
                Verified Admin Team
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Direct line to production managers, artwork proof specialists, and campaign dispatchers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Responses • Avg &lt; 15 mins
          </span>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[640px]">
        {/* Context Bar / Attached Campaign Selector */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Package className="w-4 h-4 text-blue-600" />
            <span className="font-semibold">Reference a Campaign:</span>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">General Inquiry / Quote Request</option>
              {userCampaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.campaignName} ({c.bottles.toLocaleString()} bottles • {c.area})
                </option>
              ))}
            </select>
          </div>

          <span className="text-slate-400 font-mono text-[11px]">
            Encrypted Client Thread • ID: {user?.uid.slice(0, 8)}
          </span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/40">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-xs font-medium">Connecting to secure chat channel...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mb-4 shadow-sm">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Start a Conversation with Admin</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-6">
                Have questions about your square paper bottle print proofs, distribution zones, or volume pricing? Message us directly below.
              </p>

              {/* Quick suggestion prompt chips */}
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {[
                  'Can I review the print proof for my design?',
                  'I need a custom quote for 50,000+ bottles',
                  'What are the upcoming distribution dates?',
                  'Can we target a custom event location?',
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickPrompt(chip)}
                    className="text-xs bg-white hover:bg-blue-50 hover:text-blue-600 text-slate-700 px-3.5 py-2 rounded-xl border border-slate-200 font-medium transition-all shadow-2xs text-left"
                  >
                    "{chip}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Security banner */}
              <div className="text-center my-2">
                <span className="px-3 py-1 bg-slate-200/60 text-slate-600 rounded-full text-[10px] font-semibold">
                  Direct Line with AquaAds Production & Billing Admin
                </span>
              </div>

              {displayMessages.map((msg) => {
                const isMe = msg.senderId === user?.uid;
                const date = new Date(msg.createdAt);
                const timeString = isNaN(date.getTime())
                  ? ''
                  : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn('flex flex-col max-w-[80%] md:max-w-[70%]', isMe ? 'ml-auto items-end' : 'mr-auto items-start')}
                  >
                    {/* Attached campaign badge if any */}
                    {msg.campaignName && (
                      <div className="mb-1 flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                        <Package className="w-3 h-3" />
                        <span>Campaign: {msg.campaignName}</span>
                      </div>
                    )}

                    <div className="flex items-end gap-2">
                      {!isMe && (
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                          AD
                        </div>
                      )}

                      <div
                        className={cn(
                          'p-4 rounded-3xl text-sm leading-relaxed shadow-sm',
                          isMe
                            ? 'bg-blue-600 text-white rounded-br-xs'
                            : 'bg-white text-slate-900 border border-slate-200 rounded-bl-xs'
                        )}
                      >
                        {!isMe && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[11px] font-black text-blue-600 uppercase tracking-wider">
                              AquaAds Admin ({msg.senderName || 'Team'})
                            </span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>

                      {isMe && (
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {user?.email[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 px-2 text-[10px] text-slate-400 font-medium">
                      <span>{timeString}</span>
                      {isMe && (
                        <span>
                          {msg.read ? (
                            <span className="text-blue-500 font-semibold flex items-center gap-0.5">
                              <CheckCheck className="w-3 h-3" /> Read
                            </span>
                          ) : (
                            <span>• Sent</span>
                          )}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message to AquaAds Admin..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className={cn(
                'px-6 py-3.5 rounded-2xl font-bold text-sm text-white flex items-center gap-2 transition-all shadow-md',
                !newMessage.trim() || sending
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 active:scale-95'
              )}
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
