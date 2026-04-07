'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface Props { onNext: () => void; onBack: () => void; }

export default function Step2Photo({ onNext, onBack }: Props) {
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [profileInfo, setProfileInfo] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/onboarding/step/2')
      .then(r => r.json())
      .then(d => {
        if (d.data?.avatarUrl) setPreview(d.data.avatarUrl);
      });
    // Also load name / subjects from step 1 for the preview card
    fetch('/api/onboarding/step/1')
      .then(r => r.json())
      .then(d => setProfileInfo(d.data));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5MB');
      return;
    }
    
    // Create an object URL for instant preview, instead of heavy Base64
    setPreview(URL.createObjectURL(file));
    setSelectedFile(file);
  };

  const handleSave = async (skip = false) => {
    setIsSaving(true);
    let finalAvatarUrl = preview;

    try {
      if (!skip && selectedFile) {
        toast.loading('Uploading photo to cloud...', { id: 'upload-toast' });
        const fileExt = selectedFile.name.split('.').pop() || 'jpg';
        const userId = (session?.user as any)?.id || `temp_${Date.now()}`;
        const fileName = `${userId}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, selectedFile, { 
            upsert: true,
            contentType: selectedFile.type
          });

        if (uploadError) {
          throw new Error('Supabase error: ' + uploadError.message);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        finalAvatarUrl = publicUrl;
        toast.dismiss('upload-toast');
      }

      await fetch('/api/onboarding/step/2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: skip ? null : (finalAvatarUrl || null) }),
      });
      if (!skip) toast.success('Photo saved!');
      onNext();
    } catch (e: any) {
      toast.dismiss('upload-toast');
      console.error(e);
      toast.error(e.message || 'Failed to save photo');
    } finally {
      setIsSaving(false);
    }
  };

  const subjectLabel = profileInfo?.subjects?.[0]?.replace(/_/g, ' ').replace('CFA LEVEL', 'CFA L') || 'Finance';
  const languageLabel = profileInfo?.languages?.[0]?.language || 'English';
  const displayName = profileInfo ? `${profileInfo.firstName} ${profileInfo.lastName}` : ((session?.user as any)?.name || 'Your Name');

  return (
    <div className="glass-card p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Profile Photo</h2>
        <p className="text-navy-400 dark:text-cream-400/60 mt-1">Choose a photo that will help learners get to know you.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Upload section */}
        <div className="space-y-6">
          {/* Preview card */}
          <div className="bg-white dark:bg-navy-600/40 rounded-2xl p-5 border border-navy-100 dark:border-navy-400/20 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-gold-300 to-gold-500 flex items-center justify-center flex-shrink-0 ring-2 ring-gold-400/30">
              {preview ? (
                <img src={preview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">{displayName.charAt(0)}</span>
              )}
            </div>
            <div>
              <p className="font-bold text-navy-600 dark:text-cream-200">{displayName}</p>
              <p className="text-xs text-navy-300 dark:text-cream-400/50">Teaches {subjectLabel}</p>
              <p className="text-xs text-navy-300 dark:text-cream-400/50">Speaks {languageLabel}</p>
            </div>
          </div>

          {/* Upload button */}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
          <button
            type="button"
            className="w-full py-3 rounded-2xl border-2 border-navy-200 dark:border-navy-400/40 font-bold text-navy-500 dark:text-cream-300 hover:border-gold-400 hover:text-gold-500 transition-all flex items-center justify-center gap-2"
            onClick={() => fileRef.current?.click()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            {preview ? 'Change photo' : 'Upload new photo'}
          </button>
          <p className="text-xs text-center text-navy-300 dark:text-cream-400/40">JPG or PNG • Max 5MB</p>
        </div>

        {/* Right: Guidelines */}
        <div className="space-y-4">
          <h3 className="font-bold text-navy-600 dark:text-cream-200 text-sm uppercase tracking-wider">What your photo needs</h3>
          <div className="space-y-2">
            {[
              'You should be facing forward',
              'Frame your head and shoulders',
              'You should be centered and upright',
              'Your face and eyes should be visible (except for religious reasons)',
              'You should be the only person in the photo',
              'Use a color photo with high resolution and no filters',
              'Avoid logos or contact information',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-sage-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4A7C6F" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-sm text-navy-500 dark:text-cream-300/80">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-navy-100 dark:border-navy-400/20">
        <button onClick={onBack} className="btn-outline px-6 py-3 rounded-2xl font-bold flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => handleSave(true)} className="text-sm text-navy-400 hover:text-navy-600 dark:hover:text-cream-200 font-bold transition-colors">
            Skip for now
          </button>
          <button onClick={() => handleSave(false)} disabled={isSaving} className="btn-primary px-8 py-3 rounded-2xl font-bold flex items-center gap-2">
            {isSaving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Saving...</> : <>Save and continue <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg></>}
          </button>
        </div>
      </div>
    </div>
  );
}
