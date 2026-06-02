import React, { useState } from 'react';
import { db, collection, addDoc, auth } from '../firebase';
import { SupportRequest } from '../types';
import { Send, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../firebase';

interface SupportFormProps {
  onClose: () => void;
}

export const SupportForm: React.FC<SupportFormProps> = ({ onClose }) => {
  const [email, setEmail] = useState(auth.currentUser?.email || '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;

    setSubmitting(true);
    try {
      const requestData: Omit<SupportRequest, 'id'> = {
        userId: auth.currentUser?.uid,
        userEmail: email,
        message,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'support_requests'), requestData);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'support_requests');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Contact Management</h2>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <X className="w-6 h-6 text-slate-400" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Request Sent!</h3>
            <p className="text-slate-500">Our management team will contact you shortly.</p>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <p className="text-slate-600 leading-relaxed">
              If you want to change something or use specifically modified pictures or texts, 
              please send us a message. Our team will get in touch to handle your personal request.
            </p>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Your Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">How can we help?</label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-32 resize-none"
                placeholder="Describe your request (e.g., custom design, text changes...)"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? 'Sending...' : (
                <>
                  <Send className="w-5 h-5" /> Send Request
                </>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};
