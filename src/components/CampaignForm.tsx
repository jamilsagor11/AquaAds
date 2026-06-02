import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { db, collection, addDoc, handleFirestoreError } from '../firebase';
import { OperationType } from '../types';
import { BottleVisualizer } from './BottleVisualizer';
import { formatCurrency } from '../lib/utils';
import { 
  Calculator, 
  MapPin, 
  Package, 
  Layers, 
  Image as ImageIcon, 
  CheckCircle2, 
  Calendar, 
  Users, 
  Tag, 
  ArrowRight, 
  ArrowLeft, 
  CreditCard,
  Upload,
  Info,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const AREAS = ['Dhaka North', 'Dhaka South', 'Chittagong', 'Sylhet', 'Rajshahi'];
const AUDIENCES = ['General', 'Students', 'Professionals', 'Families', 'Health Enthusiasts'];
const PRICE_PER_SIDE = 2.5;

export const CampaignForm: React.FC = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  
  // Step 1: Details
  const [campaignName, setCampaignName] = useState('');
  const [area, setArea] = useState(AREAS[0]);
  const [targetAudience, setTargetAudience] = useState(AUDIENCES[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Step 2: Configuration
  const [bottles, setBottles] = useState(100);
  const [sides, setSides] = useState(1);
  
  // Step 3: Creative
  const [designUrl, setDesignUrl] = useState('');
  const [isMockUploading, setIsMockUploading] = useState(false);
  
  // Step 4: Review & Payment
  const [showPayment, setShowPayment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const totalPrice = bottles * sides * PRICE_PER_SIDE;

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleMockUpload = () => {
    setIsMockUploading(true);
    setTimeout(() => {
      setDesignUrl('https://picsum.photos/seed/ad-design/400/600');
      setIsMockUploading(false);
    }, 1500);
  };

  const confirmPayment = async (method: string) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const path = 'campaigns';
      await addDoc(collection(db, path), {
        userId: user.uid,
        campaignName,
        companyName: user.companyName || user.email.split('@')[0],
        area,
        targetAudience,
        startDate,
        endDate,
        bottles,
        sides,
        designUrl,
        totalPrice,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setShowPayment(false);
        setStep(1);
        // Reset form
        setCampaignName('');
        setBottles(100);
        setSides(1);
        setDesignUrl('');
        setStartDate('');
        setEndDate('');
      }, 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'campaigns');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: 'Details', icon: Tag },
    { id: 2, title: 'Configure', icon: Package },
    { id: 3, title: 'Creative', icon: ImageIcon },
    { id: 4, title: 'Review', icon: CheckCircle2 },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-12">
        <div className="flex justify-between items-center relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-blue-600 -translate-y-1/2 z-0 transition-all duration-500" 
            style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
          />
          {steps.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                step >= s.id ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white text-slate-400 border-2 border-slate-100"
              )}>
                <s.icon className="w-5 h-5" />
              </div>
              <span className={cn(
                "absolute -bottom-7 text-xs font-bold whitespace-nowrap",
                step >= s.id ? "text-blue-600" : "text-slate-400"
              )}>{s.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Form Section */}
        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-100 border border-slate-100">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-500" /> Campaign Name
                  </label>
                  <input
                    type="text"
                    placeholder="Summer Refresh 2024"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" /> Target Area
                    </label>
                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" /> Audience
                    </label>
                    <select
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" /> Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" /> End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-500" /> Number of Bottles
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="100"
                      max="10000"
                      step="100"
                      value={bottles}
                      onChange={(e) => setBottles(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <span className="w-20 text-right font-bold text-slate-900">{bottles.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-500" /> Sides per Bottle
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSides(s)}
                        className={cn(
                          "py-3 rounded-xl border-2 font-bold transition-all",
                          sides === s ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Selecting more sides increases your brand's visibility from different angles. 
                    4 sides gives you exclusive branding on the entire bottle.
                  </p>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div 
                    onClick={handleMockUpload}
                    className={cn(
                      "group relative h-48 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-3 cursor-pointer transition-all",
                      designUrl ? "border-green-200 bg-green-50" : "border-slate-200 hover:border-blue-400 hover:bg-blue-50"
                    )}
                  >
                    {isMockUploading ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    ) : designUrl ? (
                      <>
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                        <span className="text-sm font-bold text-green-700">Design Uploaded!</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDesignUrl(''); }}
                          className="absolute top-4 right-4 text-xs font-bold text-slate-400 hover:text-red-500"
                        >Remove</button>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-slate-900">Upload Your Design</p>
                          <p className="text-xs text-slate-500">PNG, JPG or SVG (Max 5MB)</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-100"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold text-slate-400">
                      <span className="bg-white px-4">Or use URL</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="url"
                      placeholder="https://example.com/your-design.png"
                      value={designUrl}
                      onChange={(e) => setDesignUrl(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-slate-50 rounded-3xl p-6 space-y-4 border border-slate-100">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500" /> Campaign Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <span className="text-slate-500">Campaign</span>
                    <span className="text-right font-bold text-slate-900">{campaignName || 'Unnamed'}</span>
                    <span className="text-slate-500">Area</span>
                    <span className="text-right font-bold text-slate-900">{area}</span>
                    <span className="text-slate-500">Audience</span>
                    <span className="text-right font-bold text-slate-900">{targetAudience}</span>
                    <span className="text-slate-500">Duration</span>
                    <span className="text-right font-bold text-slate-900">
                      {startDate ? new Date(startDate).toLocaleDateString() : 'TBD'} - {endDate ? new Date(endDate).toLocaleDateString() : 'TBD'}
                    </span>
                    <span className="text-slate-500">Quantity</span>
                    <span className="text-right font-bold text-slate-900">{bottles.toLocaleString()} Bottles</span>
                    <span className="text-slate-500">Branding</span>
                    <span className="text-right font-bold text-slate-900">{sides} Side{sides > 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="p-6 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-blue-100 text-sm font-medium">Total Investment</span>
                    <span className="text-3xl font-black">{formatCurrency(totalPrice)}</span>
                  </div>
                  <p className="text-xs text-blue-200">Includes printing, distribution, and real-time analytics.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 flex gap-4">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
              >
                <ArrowLeft className="w-5 h-5" /> Back
              </button>
            )}
            <button
              onClick={() => step === 4 ? setShowPayment(true) : handleNext()}
              disabled={step === 1 && !campaignName}
              className={cn(
                "flex-[2] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
                step === 1 && !campaignName ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100"
              )}
            >
              {step === 4 ? (
                <>Checkout <CreditCard className="w-5 h-5" /></>
              ) : (
                <>Continue <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </div>
        </div>

        {/* Preview Section */}
        <div className="sticky top-8 space-y-8">
          <div className="bg-white p-12 rounded-[3rem] shadow-2xl shadow-slate-100 border border-slate-100 flex flex-col items-center">
            <div className="text-center mb-10">
              <h3 className="text-2xl font-black text-slate-900 mb-2">Live Preview</h3>
              <p className="text-slate-500 text-sm">See your brand come to life on our square bottles</p>
            </div>
            
            <BottleVisualizer selectedSides={sides} designUrl={designUrl} />

            <div className="mt-12 grid grid-cols-2 gap-4 w-full">
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Impact</p>
                <p className="text-lg font-bold text-slate-900">High Visibility</p>
              </div>
              <div className="bg-green-50 p-5 rounded-3xl border border-green-100 text-center">
                <p className="text-[10px] text-green-600 font-black uppercase tracking-widest mb-1">Est. Reach</p>
                <p className="text-lg font-bold text-slate-900">~{(bottles * 5).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 blur-[80px] opacity-40" />
            <div className="relative z-10">
              <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-400" /> ROI Projection
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-slate-400 text-sm">Impressions</span>
                  <span className="text-xl font-bold">{(bottles * 12).toLocaleString()}+</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '75%' }}
                    className="h-full bg-blue-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Based on average consumption time of 45 minutes per bottle</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setShowPayment(false)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              {success ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-8"
                  >
                    <CheckCircle2 className="w-12 h-12" />
                  </motion.div>
                  <h3 className="text-3xl font-black text-slate-900 mb-3">Campaign Launched!</h3>
                  <p className="text-slate-500 leading-relaxed">
                    Your campaign <span className="font-bold text-slate-900">"{campaignName}"</span> has been submitted. 
                    Our team will review the design and get back to you within 24 hours.
                  </p>
                </div>
              ) : (
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black text-slate-900">Finalize Order</h3>
                    <button 
                      onClick={() => setShowPayment(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-600"
                    >×</button>
                  </div>

                  <div className="space-y-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total Investment</span>
                      <span className="font-black text-slate-900 text-xl">{formatCurrency(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Payment Gateway Fee</span>
                      <span className="font-bold text-slate-900">Included</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Secure Payment Methods</p>
                    {['bKash', 'Nagad', 'SSLCommerz'].map((method) => (
                      <button
                        key={method}
                        disabled={isSubmitting}
                        onClick={() => confirmPayment(method)}
                        className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl border border-slate-100 flex items-center justify-center font-black text-xs text-slate-400 group-hover:text-blue-600">
                            {method[0]}
                          </div>
                          <span className="font-bold text-slate-700 group-hover:text-blue-600">{method}</span>
                        </div>
                        {isSubmitting ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                        ) : (
                          <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                        )}
                      </button>
                    ))}
                  </div>
                  
                  <p className="mt-8 text-center text-[10px] text-slate-400 flex items-center justify-center gap-2">
                    <ShieldCheck className="w-3 h-3" /> Encrypted & Secure Payment Processing
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
