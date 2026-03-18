'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Props { onNext: () => void; onBack: () => void; }

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes('loom.com')) {
      const parts = u.pathname.split('/');
      const id = parts[parts.length - 1];
      return `https://www.loom.com/embed/${id}`;
    }
    return null;
  } catch { return null; }
}

export default function Step6Video({ onNext, onBack }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/onboarding/step/6').then(r => r.json()).then(d => {
      if (d.data?.videoUrl) {
        setVideoUrl(d.data.videoUrl);
        setEmbedUrl(getEmbedUrl(d.data.videoUrl));
      }
    });
  }, []);

  const handleUrlChange = (v: string) => {
    setVideoUrl(v);
    setEmbedUrl(v ? getEmbedUrl(v) : null);
  };

  const handleSave = async (skip = false) => {
    if (!skip && videoUrl && !embedUrl) {
      toast.error('Please enter a valid YouTube or Loom URL');
      return;
    }
    setIsSaving(true);
    try {
      await fetch('/api/onboarding/step/6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: skip ? '' : videoUrl }),
      });
      if (!skip) toast.success('Video saved!');
      onNext();
    } catch {
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-card p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Intro Video</h2>
        <p className="text-navy-400 dark:text-cream-400/60 mt-1">A short video helps students connect with you instantly. This step is optional.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-navy-500 dark:text-cream-300">YouTube or Loom URL</label>
          <input
            className="input-field w-full"
            placeholder="https://www.youtube.com/watch?v=..."
            value={videoUrl}
            onChange={e => handleUrlChange(e.target.value)}
          />
        </div>

        {/* Video embed preview */}
        {embedUrl && (
          <div className="rounded-2xl overflow-hidden border border-navy-100 dark:border-navy-400/20 aspect-video">
            <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Video preview" />
          </div>
        )}

        {videoUrl && !embedUrl && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
            Could not parse this URL. Please use a YouTube (youtube.com/watch?v=... or youtu.be/...) or Loom (loom.com/share/...) link.
          </div>
        )}
      </div>

      {/* Guidelines */}
      <div className="p-6 rounded-2xl bg-cream-50 dark:bg-navy-600/30 border border-navy-100 dark:border-navy-400/20 space-y-3">
        <h3 className="text-sm font-bold text-navy-500 dark:text-cream-300 uppercase tracking-wider">Tips for a great intro video</h3>
        {[
          'Keep it under 2 minutes',
          'Speak clearly, in a quiet environment',
          'Introduce your background and teaching style',
          'Explain why you love teaching CFA / GMAT / GRE',
          'Look into the camera and smile!',
          'Good lighting makes a big difference',
        ].map((tip, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" />
            <p className="text-sm text-navy-500 dark:text-cream-300/80">{tip}</p>
          </div>
        ))}
      </div>

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
