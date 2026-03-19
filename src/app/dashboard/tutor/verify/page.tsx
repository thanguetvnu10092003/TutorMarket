'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function TutorVerifyPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selection, setSelection] = useState('');
  const [mbaEmail, setMbaEmail] = useState('');
  const [mbaPassword, setMbaPassword] = useState('');
  const [mbaConsent, setMbaConsent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const credentialMap: Record<string, { subject: string | null, type: string }> = {
    'CFA Level 1 Certificate': { subject: 'CFA_LEVEL_1', type: 'CERTIFICATE' },
    'CFA Level 2 Certificate': { subject: 'CFA_LEVEL_2', type: 'CERTIFICATE' },
    'CFA Level 3 Certificate': { subject: 'CFA_LEVEL_3', type: 'CERTIFICATE' },
    'GMAT Score Report': { subject: 'GMAT', type: 'SCORE_REPORT' },
    'GRE Score Report': { subject: 'GRE', type: 'SCORE_REPORT' },
    'Academic Transcript': { subject: null, type: 'TRANSCRIPT' },
    'Other Document': { subject: null, type: 'OTHER' }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selection) {
      toast.error('Please select a certificate type');
      return;
    }
    
    if (files.length === 0) {
      toast.error('Please upload at least one document');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const mapping = credentialMap[selection];

      // 1. Upload the files to the actual server storage
      const uploadFormData = new FormData();
      files.forEach(file => {
        uploadFormData.append('files', file);
      });

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload files to server');
      }

      const { files: uploadedFiles } = await uploadResponse.json();

      // 2. Submit the verification request with the permanent URLs
      const response = await fetch('/api/tutor/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: mapping.subject,
          credentialType: mapping.type,
          files: uploadedFiles,
          mbaEmail,
          mbaPassword,
          mbaConsent
        }),
      });

      if (response.ok) {
        toast.success('Credentials submitted for review!');
        setFiles([]);
        setSelection('');
        setTimeout(() => {
          router.push('/dashboard/tutor');
        }, 1500);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to submit verification');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error instanceof Error ? error.message : 'Something went wrong during submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Link href="/dashboard/tutor" className="flex items-center gap-2 text-xs font-bold text-gold-500 hover:text-gold-600 mb-8 transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        BACK TO DASHBOARD
      </Link>

      <div className="glass-card p-8 md:p-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gold-400 flex items-center justify-center text-navy-600 shadow-gold">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Get Verified</h1>
            <p className="text-sm text-navy-300 dark:text-cream-400/60">Upload your credentials to start teaching on TutorMarket.</p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200 uppercase tracking-widest flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-gold-400 text-navy-600 flex items-center justify-center text-[10px]">1</span>
                Select Certificate Type
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {Object.keys(credentialMap).map((type) => (
                  <label key={type} className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                    selection === type 
                      ? 'border-gold-400 bg-gold-400/5 dark:bg-gold-400/10' 
                      : 'border-navy-100 dark:border-navy-400 hover:bg-navy-50 dark:hover:bg-navy-500/30'
                  }`}>
                    <input 
                      type="radio" 
                      name="credType" 
                      checked={selection === type}
                      onChange={() => setSelection(type)}
                      className="w-4 h-4 accent-gold-400" 
                    />
                    <span className="text-sm font-semibold text-navy-600 dark:text-cream-200">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200 uppercase tracking-widest flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-gold-400 text-navy-600 flex items-center justify-center text-[10px]">2</span>
                Upload Documents
              </h3>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
              />
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer group ${
                  isDragging 
                    ? 'border-gold-400 bg-gold-400/5' 
                    : 'border-navy-100 dark:border-navy-400 hover:border-gold-400'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-navy-50 dark:bg-navy-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-navy-300"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                </div>
                <p className="text-sm font-bold text-navy-600 dark:text-cream-200">Click to upload or drag & drop</p>
                <p className="text-xs text-navy-300 dark:text-cream-400/60 mt-1">PDF, JPG, or PNG (Max. 10MB)</p>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-2 mt-4">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-navy-500 border border-navy-100 dark:border-navy-400 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-gold-400/10 flex items-center justify-center text-gold-500 flex-shrink-0">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-navy-600 dark:text-cream-200 truncate">{file.name}</p>
                          <p className="text-[10px] text-navy-300 dark:text-cream-400/60">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="p-1.5 text-navy-300 hover:text-red-500 transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* GMAT Credentials Section */}
              {selection === 'GMAT Score Report' && (
                <div className="mt-8 space-y-6 p-6 rounded-2xl bg-gold-400/5 border border-gold-200 animate-in fade-in zoom-in duration-500">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gold-400 flex items-center justify-center text-navy-600">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <h4 className="text-sm font-bold text-navy-600 dark:text-cream-200 uppercase tracking-wider font-display">MBA.com Verification</h4>
                  </div>
                  
                  <p className="text-xs text-navy-400 dark:text-cream-400/70 leading-relaxed">
                    To expedite GMAT verification, please provide your MBA.com login details. An admin will use these to verify your score directly on the official portal.
                  </p>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-navy-400">MBA Email</label>
                      <input 
                        type="email" 
                        value={mbaEmail}
                        onChange={(e) => setMbaEmail(e.target.value)}
                        placeholder="your-email@example.com"
                        className="w-full bg-white dark:bg-navy-800 border border-navy-100 dark:border-navy-500 rounded-xl px-4 py-3 text-sm focus:border-gold-400 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-navy-400">MBA Password</label>
                      <input 
                        type="password" 
                        value={mbaPassword}
                        onChange={(e) => setMbaPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white dark:bg-navy-800 border border-navy-100 dark:border-navy-500 rounded-xl px-4 py-3 text-sm focus:border-gold-400 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={mbaConsent}
                      onChange={(e) => setMbaConsent(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gold-400 text-gold-600 focus:ring-gold-400 accent-gold-400" 
                    />
                    <span className="text-[11px] text-navy-400 dark:text-cream-400/70 group-hover:text-navy-600 transition-colors">
                      I authorize TutorMarket admins to use these credentials solely for the purpose of verifying my GMAT score on MBA.com. My credentials will be encrypted.
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-navy-50 dark:bg-navy-700/30 border border-navy-100/50 dark:border-navy-400/30">
            <div className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0 mt-0.5 font-bold text-[10px]">!</div>
              <p className="text-xs leading-relaxed text-navy-400 dark:text-cream-400/80">
                <span className="font-bold">Verification Process:</span> Our team manually reviews every credential. This typically takes 24-48 hours. Once approved, you will receive a verification badge on your profile and appear in searches.
              </p>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || files.length === 0} 
            className="btn-primary w-full py-4 rounded-xl text-lg font-bold shadow-gold-lg disabled:opacity-50 disabled:shadow-none transition-all"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Submitting...
              </div>
            ) : 'Submit for Review'}
          </button>
        </form>
      </div>
    </>
  );
}
