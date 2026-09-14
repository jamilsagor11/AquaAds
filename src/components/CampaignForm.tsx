import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { db, collection, addDoc, handleFirestoreError } from '../firebase';
import { OperationType } from '../types';
import { BottleVisualizer } from './BottleVisualizer';
import { formatCurrency } from '../lib/utils';
import { syncCampaignToSupabase } from '../lib/supabase';
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
  ShieldCheck,
  Droplets,
  Sparkles,
  Copy,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const AREAS = ['Dhaka North', 'Dhaka South', 'Chittagong', 'Sylhet', 'Rajshahi'];
const AUDIENCES = ['General', 'Students', 'Professionals', 'Families', 'Health Enthusiasts'];
const PRICE_PER_SIDE = 2.5;

const SIDE_INFO: Record<number, { title: string; label: string; hint: string }> = {
  1: {
    title: 'Side 1 (Front Face)',
    label: 'Primary Brand Logo & Display',
    hint: 'Main storefront display face seen directly by consumers.',
  },
  2: {
    title: 'Side 2 (Right Face)',
    label: 'QR Code & Special Offer',
    hint: 'Ideal for scan-to-win, digital coupon, or direct web traffic.',
  },
  3: {
    title: 'Side 3 (Back Face)',
    label: 'Brand Story & Social Handles',
    hint: 'Great for company mission, social handles, or origin story.',
  },
  4: {
    title: 'Side 4 (Left Face)',
    label: '360° Continuous Wrap',
    hint: 'Full bottle coverage with complete 4-sided visibility.',
  },
};

const SAMPLE_DESIGNS: Record<number, string> = {
  1: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
  2: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&auto=format&fit=crop&q=80',
  3: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
  4: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
};

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
  
  // Step 3: Creative (supports 1, 2, 3, or 4 pictures based on selected sides)
  const [designUrls, setDesignUrls] = useState<string[]>(['', '', '', '']);
  const [activeSideTab, setActiveSideTab] = useState<number>(1);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Step 4: Review & Payment
  const [showPayment, setShowPayment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const totalPrice = bottles * sides * PRICE_PER_SIDE;

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const updateSideUrl = (sideIndex: number, url: string) => {
    setDesignUrls(prev => {
      const next = [...prev];
      next[sideIndex - 1] = url;
      return next;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, sideIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateSideUrl(sideIndex, reader.result);
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDropFile = (e: React.DragEvent<HTMLDivElement>, sideIndex: number) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateSideUrl(sideIndex, reader.result);
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleApplySample = (sideIndex: number) => {
    updateSideUrl(sideIndex, SAMPLE_DESIGNS[sideIndex] || SAMPLE_DESIGNS[1]);
  };

  const handleCopyImageToAllSides = (fromSideIndex: number) => {
    const sourceImg = designUrls[fromSideIndex - 1];
    if (!sourceImg) return;
    setDesignUrls(prev => {
      const next = [...prev];
      for (let i = 0; i < sides; i++) {
        next[i] = sourceImg;
      }
      return next;
    });
  };

  const handleRemoveSideImage = (sideIndex: number) => {
    updateSideUrl(sideIndex, '');
  };

  const confirmPayment = async (method: string) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const path = 'campaigns';
      const activeDesignList = designUrls.slice(0, sides);
      const primaryDesign = activeDesignList[0] || activeDesignList.find(u => !!u) || '';

      const campaignPayload = {
        userId: user.uid,
        campaignName,
        companyName: user.companyName || user.email.split('@')[0],
        area,
        targetAudience,
        startDate,
        endDate,
        bottles,
        sides,
        designUrl: primaryDesign,
        designUrls: activeDesignList,
        totalPrice,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };
      
      const docRef = await addDoc(collection(db, path), campaignPayload);
      syncCampaignToSupabase({ id: docRef.id, ...campaignPayload });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setShowPayment(false);
        setStep(1);
        // Reset form
        setCampaignName('');
        setBottles(100);
        setSides(1);
        setDesignUrls(['', '', '', '']);
        setActiveSideTab(1);
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
                        onClick={() => {
                          setSides(s);
                          if (activeSideTab > s) {
                            setActiveSideTab(1);
                          }
                        }}
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
                    Selecting {sides} side{sides > 1 ? 's' : ''} allows you to upload {sides} {sides === 1 ? 'picture' : 'pictures'} in Step 3 to customize each face of your square bottle.
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
                {/* Hidden File Input for Image Selection */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, activeSideTab)}
                />

                {/* Header & Side Count Banner */}
                <div className="bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 p-5 rounded-3xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                      Bottle Artwork ({sides} {sides === 1 ? 'Side' : 'Sides'} Selected)
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {sides === 1
                        ? 'Upload 1 picture for your primary front display label.'
                        : `Upload ${sides} pictures — one distinct design for each of the ${sides} selected sides.`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-xs rounded-full border border-blue-200 text-xs font-bold text-blue-700 self-start sm:self-auto shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      {designUrls.slice(0, sides).filter(Boolean).length} of {sides} uploaded
                    </span>
                  </div>
                </div>

                {/* Side Switcher Tabs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                    <span>Select side to configure:</span>
                    <span className="text-blue-600">3D bottle rotates to selected side</span>
                  </div>
                  <div className={cn("grid gap-2", sides === 1 ? "grid-cols-1" : sides === 2 ? "grid-cols-2" : sides === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
                    {Array.from({ length: sides }).map((_, i) => {
                      const sideNum = i + 1;
                      const isUploaded = !!designUrls[i];
                      const isActive = activeSideTab === sideNum;
                      return (
                        <button
                          key={sideNum}
                          type="button"
                          onClick={() => setActiveSideTab(sideNum)}
                          className={cn(
                            "p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between relative",
                            isActive
                              ? "border-blue-600 bg-blue-50/50 shadow-md shadow-blue-100/50"
                              : "border-slate-100 hover:border-slate-200 bg-white"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1 w-full mb-1">
                            <span className={cn(
                              "text-xs font-black",
                              isActive ? "text-blue-700" : "text-slate-800"
                            )}>
                              Side {sideNum}
                            </span>
                            {isUploaded ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400">Empty</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 font-medium">
                            {SIDE_INFO[sideNum]?.label || `Side ${sideNum}`}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Side Upload Card */}
                <div className="p-6 bg-white rounded-3xl border-2 border-slate-100 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-black mb-1">
                        <Droplets className="w-3.5 h-3.5 text-blue-600" />
                        {SIDE_INFO[activeSideTab]?.title}
                      </div>
                      <h5 className="text-base font-bold text-slate-900">
                        {SIDE_INFO[activeSideTab]?.label}
                      </h5>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {SIDE_INFO[activeSideTab]?.hint}
                      </p>
                    </div>

                    {/* Action Shortcuts */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplySample(activeSideTab)}
                        className="px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                        title="Load sample advertisement design"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                        <span>Sample Design</span>
                      </button>
                      {sides > 1 && designUrls[activeSideTab - 1] && (
                        <button
                          type="button"
                          onClick={() => handleCopyImageToAllSides(activeSideTab)}
                          className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                          title="Apply this picture to all sides"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-600" />
                          <span>Copy to all</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Main Drag & Drop / Click Target */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropFile(e, activeSideTab)}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "group relative min-h-48 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center p-6 cursor-pointer transition-all",
                      designUrls[activeSideTab - 1]
                        ? "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70"
                        : "border-slate-200 hover:border-blue-400 hover:bg-blue-50/40"
                    )}
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                        <p className="text-xs font-bold text-slate-600">Processing image...</p>
                      </div>
                    ) : designUrls[activeSideTab - 1] ? (
                      <div className="w-full flex flex-col items-center gap-3">
                        <div className="relative group/img max-h-40 rounded-xl overflow-hidden border border-emerald-200 shadow-sm bg-white p-1">
                          <img
                            src={designUrls[activeSideTab - 1]}
                            alt={`Side ${activeSideTab}`}
                            className="max-h-36 object-contain rounded-lg"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="text-center">
                          <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Picture Uploaded for Side {activeSideTab}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">Click to choose a different file or drag new picture</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSideImage(activeSideTab);
                          }}
                          className="px-3 py-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove Picture
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            Upload Picture for Side {activeSideTab}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Drag & drop or click to browse (PNG, JPG, SVG up to 5MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Alternative URL Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">
                      Or paste direct image URL for Side {activeSideTab}:
                    </label>
                    <input
                      type="url"
                      placeholder={`https://example.com/side-${activeSideTab}-design.png`}
                      value={designUrls[activeSideTab - 1] || ''}
                      onChange={(e) => updateSideUrl(activeSideTab, e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    />
                  </div>
                </div>

                {/* Multi-Side Gallery Bar (when 2, 3, or 4 sides are selected) */}
                {sides > 1 && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                    <p className="text-xs font-bold text-slate-700">All {sides} Selected Bottle Faces:</p>
                    <div className={cn("grid gap-2", sides === 2 ? "grid-cols-2" : sides === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
                      {Array.from({ length: sides }).map((_, i) => {
                        const sideNum = i + 1;
                        const img = designUrls[i];
                        const isTab = activeSideTab === sideNum;
                        return (
                          <div
                            key={sideNum}
                            onClick={() => setActiveSideTab(sideNum)}
                            className={cn(
                              "p-2 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center",
                              isTab ? "bg-blue-50 border-blue-500 ring-1 ring-blue-400" : "bg-white border-slate-200 hover:border-slate-300"
                            )}
                          >
                            <div className="w-full h-14 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden mb-1 border border-slate-100">
                              {img ? (
                                <img src={img} alt={`Side ${sideNum}`} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-[9px] text-slate-400 font-medium">No Image</span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-800">Side {sideNum}</p>
                            <span className={cn(
                              "text-[9px] font-semibold",
                              img ? "text-emerald-600" : "text-amber-600"
                            )}>
                              {img ? "Ready" : "Needed"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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
                    <span className="text-right font-bold text-slate-900">{sides} Side{sides > 1 ? 's' : ''} per Bottle</span>
                  </div>

                  {/* Artwork Breakdown for Review */}
                  <div className="pt-3 border-t border-slate-200/80">
                    <p className="text-xs font-bold text-slate-700 mb-2">
                      Bottle Artwork ({designUrls.slice(0, sides).filter(Boolean).length} of {sides} Pictures Attached):
                    </p>
                    <div className={cn("grid gap-2", sides === 1 ? "grid-cols-1" : sides === 2 ? "grid-cols-2" : sides === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
                      {Array.from({ length: sides }).map((_, i) => {
                        const sideNum = i + 1;
                        const img = designUrls[i];
                        return (
                          <div key={sideNum} className="p-2 bg-white rounded-xl border border-slate-200 flex flex-col items-center text-center">
                            <div className="w-full h-16 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden mb-1 border border-slate-100">
                              {img ? (
                                <img src={img} alt={`Side ${sideNum}`} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-[10px] text-slate-400">Spring Water Standard</span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-800">Side {sideNum}</p>
                            <p className="text-[9px] text-slate-500 truncate max-w-full">{SIDE_INFO[sideNum]?.label}</p>
                          </div>
                        );
                      })}
                    </div>
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
          <div className="bg-white p-8 sm:p-10 rounded-[3rem] shadow-2xl shadow-slate-100 border border-slate-100 flex flex-col items-center">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold mb-2">
                <Droplets className="w-3.5 h-3.5 text-blue-600" />
                Square Water Bottle 3D
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-1">Live Preview</h3>
              <p className="text-slate-500 text-xs">Interactive 3D rotating square water bottle preview</p>
            </div>
            
            <BottleVisualizer
              selectedSides={sides}
              designUrls={designUrls.slice(0, sides)}
              designUrl={designUrls[0] || ''}
              focusedSide={step === 3 ? activeSideTab : null}
            />

            <div className="mt-8 grid grid-cols-2 gap-4 w-full">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Format</p>
                <p className="text-base font-bold text-slate-900">500ml Square Bottle</p>
              </div>
              <div className="bg-green-50 p-4 rounded-2xl border border-green-100 text-center">
                <p className="text-[10px] text-green-600 font-black uppercase tracking-widest mb-1">Est. Reach</p>
                <p className="text-base font-bold text-slate-900">~{(bottles * 5).toLocaleString()}</p>
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
