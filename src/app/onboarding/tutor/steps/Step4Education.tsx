'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Props { onNext: () => void; onBack: () => void; }

const DEGREES = [
  { value: 'BACHELORS', label: "Bachelor's" },
  { value: 'MASTERS', label: "Master's" },
  { value: 'MBA', label: 'MBA' },
  { value: 'PHD', label: 'PhD' },
  { value: 'OTHER', label: 'Other' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 60 }, (_, i) => CURRENT_YEAR - i);

const POPULAR_UNIVERSITIES = [
  'Harvard University', 'Stanford University', 'MIT', 'Oxford University',
  'Cambridge University', 'National University of Singapore (NUS)',
  'HCMC University of Economics', 'Hanoi University', 'Vietnam National University',
  'Nanyang Technological University', 'University of Melbourne', 'CFA Institute',
];

interface EducationEntry {
  degree: string;
  fieldOfStudy: string;
  institution: string;
  graduationYear: string;
}

export default function Step4Education({ onNext, onBack }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [entries, setEntries] = useState<EducationEntry[]>([
    { degree: 'BACHELORS', fieldOfStudy: '', institution: '', graduationYear: '' }
  ]);

  useEffect(() => {
    fetch('/api/onboarding/step/4')
      .then(r => r.json())
      .then(d => {
        if (d.data?.education?.length > 0) {
          setEntries(d.data.education.map((e: any) => ({
            degree: e.degree,
            fieldOfStudy: e.fieldOfStudy,
            institution: e.institution,
            graduationYear: e.graduationYear?.toString() || '',
          })));
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const update = (index: number, field: keyof EducationEntry, value: string) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const addEntry = () => {
    if (entries.length >= 5) return;
    setEntries(prev => [...prev, { degree: 'BACHELORS', fieldOfStudy: '', institution: '', graduationYear: '' }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length <= 1) return;
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    for (const e of entries) {
      if (!e.fieldOfStudy.trim() || !e.institution.trim()) {
        toast.error('Please fill in field of study and institution for all entries');
        return;
      }
    }
    setIsSaving(true);
    try {
      await fetch('/api/onboarding/step/4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ education: entries }),
      });
      toast.success('Education saved!');
      onNext();
    } catch {
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="glass-card p-8 text-center text-navy-400">Loading...</div>;

  return (
    <div className="glass-card p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Education</h2>
        <p className="text-navy-400 dark:text-cream-400/60 mt-1">Tell students about your academic background.</p>
      </div>

      <div className="space-y-6">
        {entries.map((entry, index) => (
          <div key={index} className="p-6 rounded-2xl bg-cream-50 dark:bg-navy-600/30 border border-navy-100 dark:border-navy-400/20 space-y-4 relative">
            {entries.length > 1 && (
              <button
                onClick={() => removeEntry(index)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/20 text-red-500 flex items-center justify-center hover:bg-red-200 text-lg transition-colors"
              >×</button>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Degree *</label>
                <select className="input-field w-full" value={entry.degree} onChange={e => update(index, 'degree', e.target.value)}>
                  {DEGREES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Graduation Year</label>
                <select className="input-field w-full" value={entry.graduationYear} onChange={e => update(index, 'graduationYear', e.target.value)}>
                  <option value="">Select year</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Field of Study *</label>
                <input className="input-field w-full" placeholder="e.g. Finance, Economics" value={entry.fieldOfStudy} onChange={e => update(index, 'fieldOfStudy', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">University / Institution *</label>
                <input
                  className="input-field w-full"
                  type="text"
                  placeholder="e.g. Harvard University"
                  value={entry.institution}
                  onChange={e => update(index, 'institution', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {entries.length < 5 && (
        <button onClick={addEntry} className="text-sm font-bold text-gold-500 hover:text-gold-400 transition-colors flex items-center gap-1.5">
          <span className="text-lg">+</span> Add another education
        </button>
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
