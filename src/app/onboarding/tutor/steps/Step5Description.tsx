'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Props { onNext: () => void; onBack: () => void; }

export default function Step5Description({ onNext, onBack }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [about, setAbout] = useState('');
  const [highlight, setHighlight] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/onboarding/step/5').then(r => r.json()),
      fetch('/api/onboarding/step/1').then(r => r.json()),
    ]).then(([d5, d1]) => {
      if (d5.data?.about) setAbout(d5.data.about);
      if (d5.data?.experienceHighlight) setHighlight(d5.data.experienceHighlight);
      if (d1.data?.subjects) setSubjects(d1.data.subjects);
    }).finally(() => setIsLoading(false));
  }, []);

  const subjectList = subjects.map(s => s.replace(/_/g,' ').replace('CFA LEVEL', 'CFA Level')).join(', ');

  const handleSave = async () => {
    if (about.trim().length < 100) {
      toast.error('Introduction must be at least 100 characters');
      return;
    }
    setIsSaving(true);
    try {
      await fetch('/api/onboarding/step/5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ about, experienceHighlight: highlight }),
      });
      toast.success('Description saved!');
      onNext();
    } catch {
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const renderPreview = (text: string) => text.split('\n').map((line, i) => <p key={i} className={line === '' ? 'mb-2' : 'mb-1'}>{line}</p>);

  if (isLoading) return <div className="glass-card p-8 text-center text-navy-400">Loading...</div>;

  return (
    <div className="glass-card p-8 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Description</h2>
          <p className="text-navy-400 dark:text-cream-400/60 mt-1">Help students understand who you are and why you&apos;re the right tutor.</p>
        </div>
        <button onClick={() => setShowPreview(!showPreview)} className="text-xs font-bold text-gold-500 border border-gold-300 rounded-xl px-3 py-1.5 hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-colors">
          {showPreview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {showPreview ? (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-cream-50 dark:bg-navy-600/30 border border-navy-100 dark:border-navy-400/20 space-y-4">
            <h3 className="font-bold text-navy-600 dark:text-cream-200 text-sm uppercase tracking-wider">Introduction</h3>
            <div className="text-navy-500 dark:text-cream-300/80 leading-relaxed">
              {about ? renderPreview(about) : <em className="text-navy-300">Nothing written yet...</em>}
            </div>
          </div>
          {highlight && (
            <div className="p-6 rounded-2xl bg-cream-50 dark:bg-navy-600/30 border border-navy-100 dark:border-navy-400/20 space-y-4">
              <h3 className="font-bold text-navy-600 dark:text-cream-200 text-sm uppercase tracking-wider">Certification & Experience Highlights</h3>
              <div className="text-navy-500 dark:text-cream-300/80 leading-relaxed">
                {renderPreview(highlight)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* About */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-navy-500 dark:text-cream-300">
                Introduce yourself <span className="text-red-400">*</span>
              </label>
              <span className={`text-xs font-bold ${about.length < 100 ? 'text-red-400' : about.length > 1400 ? 'text-amber-500' : 'text-sage-500'}`}>
                {about.length}/1500
              </span>
            </div>
            <textarea
              rows={8}
              className="input-field w-full resize-none leading-relaxed"
              placeholder={`Tell students about your background, teaching style, and why you&apos;re passionate about ${subjectList || 'your subjects'}...`}
              value={about}
              onChange={e => setAbout(e.target.value.slice(0, 1500))}
            />
            {about.length < 100 && about.length > 0 && (
              <p className="text-xs text-red-400">Needs {100 - about.length} more characters</p>
            )}
          </div>

          {/* Highlights */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-navy-500 dark:text-cream-300">Certification & experience highlights <span className="text-navy-300">(optional)</span></label>
              <span className={`text-xs font-bold ${highlight.length > 700 ? 'text-amber-500' : 'text-navy-300'}`}>
                {highlight.length}/800
              </span>
            </div>
            <textarea
              rows={4}
              className="input-field w-full resize-none leading-relaxed"
              placeholder="Describe your exam experience, scores, and preparation strategies that worked for you..."
              value={highlight}
              onChange={e => setHighlight(e.target.value.slice(0, 800))}
            />
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-navy-100 dark:border-navy-400/20">
        <button onClick={onBack} className="btn-outline px-6 py-3 rounded-2xl font-bold flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <button onClick={handleSave} disabled={isSaving} className="btn-primary px-8 py-3 rounded-2xl font-bold flex items-center gap-2">
          {isSaving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Saving...</> : <>Save and continue <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg></>}
        </button>
      </div>
    </div>
  );
}
