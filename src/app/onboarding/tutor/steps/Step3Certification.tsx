'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Props { onNext: () => void; onBack: () => void; }

const CFA_LEVELS = ['CFA_LEVEL_1', 'CFA_LEVEL_2', 'CFA_LEVEL_3'];
const CFA_YEARS = Array.from({ length: new Date().getFullYear() - 1999 }, (_, i) => new Date().getFullYear() - i);
const CFA_SCORES = ['Pass', 'Band 10', 'Band 9', 'Band 8', 'Band 7', 'Band 6', 'Band 5', 'Band 4', 'Band 3', 'Band 2', 'Band 1'];

function cfaLabel(v: string) { return v.replace(/_/g,' ').replace('CFA LEVEL', 'CFA Level'); }

export default function Step3Certification({ onNext, onBack }: Props) {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [noCerts, setNoCerts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // CFA state: per level
  const [cfaData, setCfaData] = useState<Record<string, { year: string; score: string; fileUrl: string; file?: File }>>({});
  // GMAT state
  const [gmat, setGmat] = useState({ total: '', totalPct: '', quant: '', verbal: '', dataInsights: '', testDate: '', mbaEmail: '', mbaPassword: '', authorized: false });
  // GRE state
  const [gre, setGre] = useState<{ verbal: string; verbalPct: string; quant: string; quantPct: string; writing: string; writingPct: string; testDate: string; fileUrl: string; file?: File }>({ verbal: '', verbalPct: '', quant: '', quantPct: '', writing: '', writingPct: '', testDate: '', fileUrl: '' });
  
  // File upload helper
  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('files', file);
    try {
      const up = await fetch('/api/upload', { method: 'POST', body: formData });
      if (up.ok) {
        const { files } = await up.json();
        return files[0].url;
      }
    } catch (e) {
      console.error('File upload failed', e);
    }
    return null;
  };

  useEffect(() => {
    fetch('/api/onboarding/step/3')
      .then(r => r.json())
      .then(d => {
        setSubjects(d.data?.subjects || []);
        if (d.data?.noCertifications) setNoCerts(true);
        // Pre-fill existing
        if (d.data?.certifications?.length > 0) {
          for (const c of d.data.certifications) {
            if (c.type === 'CFA') {
              setCfaData(prev => ({
                ...prev,
                [c.levelOrVariant]: { year: c.testDate ? new Date(c.testDate).getFullYear().toString() : '', score: c.score?.toString() || '', fileUrl: c.fileUrl || '' }
              }));
            }
          }
        }
      });
  }, []);

  const hasCFA = subjects.some(s => CFA_LEVELS.includes(s));
  const hasGMAT = subjects.includes('GMAT');
  const hasGRE = subjects.includes('GRE');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const certifications: any[] = [];

      if (!noCerts) {
        // Build CFA entries
        for (const level of CFA_LEVELS) {
          if (subjects.includes(level)) {
            const d = cfaData[level] || {};
            let fileUrl = d.fileUrl;

            // Upload if new file
            if (d.file) {
              const uploadedUrl = await uploadFile(d.file);
              if (uploadedUrl) fileUrl = uploadedUrl;
            }

            certifications.push({
              type: 'CFA',
              levelOrVariant: level,
              testDate: d.year ? `${d.year}-01-01` : null,
              score: d.score,
              fileUrl: fileUrl || null,
            });
          }
        }
        // GMAT
        if (hasGMAT) {
          if (!gmat.authorized && gmat.mbaEmail) {
            toast.error('Please check the authorization checkbox for GMAT credentials');
            setIsSaving(false);
            return;
          }
          certifications.push({
            type: 'GMAT',
            levelOrVariant: 'GMAT',
            score: gmat.total ? parseFloat(gmat.total) : null,
            percentiles: {
              total: gmat.totalPct,
              quant: gmat.quant,
              verbal: gmat.verbal,
              dataInsights: gmat.dataInsights,
            },
            testDate: gmat.testDate || null,
            mbaEmail: gmat.mbaEmail || null,
            mbaPassword: gmat.mbaPassword || null,
          });
        }
        // GRE
        if (hasGRE) {
          let fileUrl = gre.fileUrl;
          if (gre.file) {
            const uploadedUrl = await uploadFile(gre.file);
            if (uploadedUrl) fileUrl = uploadedUrl;
          }

          certifications.push({
            type: 'GRE',
            levelOrVariant: 'GRE',
            percentiles: {
              verbal: gre.verbal,
              verbalPct: gre.verbalPct,
              quant: gre.quant,
              quantPct: gre.quantPct,
              writing: gre.writing,
              writingPct: gre.writingPct,
            },
            testDate: gre.testDate || null,
            fileUrl: fileUrl || null,
          });
        }
      }

      await fetch('/api/onboarding/step/3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certifications, noCertifications: noCerts }),
      });
      toast.success('Certifications saved!');
      onNext();
    } catch (e: any) {
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-card p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Certifications & Scores</h2>
        <p className="text-navy-400 dark:text-cream-400/60 mt-1">Verify your credentials to earn the <span className="text-gold-500 font-bold">Verified</span> badge.</p>
      </div>

      {/* Certification choice */}
      <div className="space-y-4">
        <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${!noCerts ? 'border-sage-400 bg-sage-50/50 dark:bg-sage-900/10' : 'border-navy-100 dark:border-navy-400/20 hover:border-navy-300'}`}>
          <input type="radio" name="hasCerts" checked={!noCerts} onChange={() => setNoCerts(false)} className="mt-1 w-5 h-5 accent-sage-500" />
          <div>
            <span className="font-bold text-lg text-navy-600 dark:text-cream-200">Yes, I have certifications to verify</span>
            <p className="text-sm text-navy-400 dark:text-cream-400/60 mt-0.5">Earn the Verified badge to stand out to students.</p>
          </div>
        </label>

        <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${noCerts ? 'border-navy-400 bg-navy-50 dark:bg-navy-500/30' : 'border-navy-100 dark:border-navy-400/20 hover:border-navy-300'}`}>
          <input type="radio" name="hasCerts" checked={noCerts} onChange={() => setNoCerts(true)} className="mt-1 w-5 h-5 accent-navy-500" />
          <div>
            <span className="font-bold text-lg text-navy-600 dark:text-cream-200">I don&apos;t have certifications right now</span>
            <p className="text-sm text-navy-400 dark:text-cream-400/60 mt-0.5">You can skip this step and add them later from your dashboard.</p>
          </div>
        </label>
      </div>

      {!noCerts && (
        <div className="space-y-6">
          {/* ── CFA ── */}
          {hasCFA && CFA_LEVELS.filter(l => subjects.includes(l)).map(level => (
            <div key={level} className="p-6 rounded-2xl bg-cream-50 dark:bg-navy-600/30 border border-navy-100 dark:border-navy-400/20 space-y-4">
              <h3 className="font-bold text-navy-600 dark:text-cream-200">{cfaLabel(level)}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Year Passed</label>
                  <select className="input-field w-full" value={cfaData[level]?.year || ''} onChange={e => setCfaData(p => ({ ...p, [level]: { ...p[level], year: e.target.value } }))}>
                    <option value="">Select year</option>
                    {CFA_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Score / Band</label>
                  <select className="input-field w-full" value={cfaData[level]?.score || ''} onChange={e => setCfaData(p => ({ ...p, [level]: { ...p[level], score: e.target.value } }))}>
                    <option value="">Select result</option>
                    {CFA_SCORES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Certificate File (optional)</label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="input-field w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-navy-100 file:text-navy-700 hover:file:bg-navy-200 cursor-pointer"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error('File must be under 5MB');
                        return;
                      }
                      setCfaData(p => ({ ...p, [level]: { ...p[level], file, fileUrl: URL.createObjectURL(file) } }));
                    }
                  }}
                />
                {cfaData[level]?.file ? (
                  <p className="text-xs text-sage-600 dark:text-sage-400 font-bold flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> File attached</p>
                ) : cfaData[level]?.fileUrl ? (
                  <p className="text-xs text-navy-400">Current file saved.</p>
                ) : null}
                <p className="text-xs text-navy-300 dark:text-cream-400/40">With certificate → Pending Verification badge. Without → Self-Reported badge. PDF, JPG, PNG under 5MB.</p>
              </div>
            </div>
          ))}

          {/* ── GMAT ── */}
          {hasGMAT && (
            <div className="p-6 rounded-2xl bg-cream-50 dark:bg-navy-600/30 border border-navy-100 dark:border-navy-400/20 space-y-4">
              <h3 className="font-bold text-navy-600 dark:text-cream-200">GMAT</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { key: 'total', label: 'Total Score (205–805)' },
                  { key: 'totalPct', label: 'Total Percentile %' },
                  { key: 'quant', label: 'Quant Percentile %' },
                  { key: 'verbal', label: 'Verbal Percentile %' },
                  { key: 'dataInsights', label: 'Data Insights %' },
                ].map(f => (
                  <div key={f.key} className="space-y-1">
                    <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">{f.label}</label>
                    <input type="number" className="input-field w-full" value={(gmat as any)[f.key]} onChange={e => setGmat(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Test Date</label>
                  <input type="date" className="input-field w-full" value={gmat.testDate} onChange={e => setGmat(p => ({ ...p, testDate: e.target.value }))} />
                </div>
              </div>
              {/* MBA.com credentials box */}
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 space-y-3">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                  To verify your GMAT score, you may optionally provide your MBA.com credentials. Our admin team will use them once to confirm your score — credentials are never stored persistently and are deleted after verification.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="input-field w-full text-sm" placeholder="MBA.com email" value={gmat.mbaEmail} onChange={e => setGmat(p => ({ ...p, mbaEmail: e.target.value }))} />
                  <input type="password" className="input-field w-full text-sm" placeholder="MBA.com password" value={gmat.mbaPassword} onChange={e => setGmat(p => ({ ...p, mbaPassword: e.target.value }))} />
                </div>
                {(gmat.mbaEmail || gmat.mbaPassword) && (
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={gmat.authorized} onChange={e => setGmat(p => ({ ...p, authorized: e.target.checked }))} className="mt-0.5 accent-blue-500" />
                    <span className="text-xs text-blue-700 dark:text-blue-300">I authorize the use of these credentials solely for score verification</span>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* ── GRE ── */}
          {hasGRE && (
            <div className="p-6 rounded-2xl bg-cream-50 dark:bg-navy-600/30 border border-navy-100 dark:border-navy-400/20 space-y-4">
              <h3 className="font-bold text-navy-600 dark:text-cream-200">GRE</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { key: 'verbal', pKey: 'verbalPct', label: 'Verbal Reasoning', pLabel: 'Percentile %' },
                  { key: 'quant', pKey: 'quantPct', label: 'Quant Reasoning', pLabel: 'Percentile %' },
                  { key: 'writing', pKey: 'writingPct', label: 'Analytical Writing', pLabel: 'Percentile %' },
                ].map(f => (
                  <div key={f.key} className="space-y-1">
                    <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">{f.label}</label>
                    <div className="flex gap-2">
                      <input type="number" className="input-field w-full" placeholder="Score" value={(gre as any)[f.key]} onChange={e => setGre(p => ({ ...p, [f.key]: e.target.value }))} />
                      <input type="number" className="input-field w-20" placeholder="%" value={(gre as any)[f.pKey]} onChange={e => setGre(p => ({ ...p, [f.pKey]: e.target.value }))} />
                    </div>
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Test Date</label>
                  <input type="date" className="input-field w-full" value={gre.testDate} onChange={e => setGre(p => ({ ...p, testDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1 mt-4">
                <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">ETS Score Report File (optional)</label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="input-field w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-navy-100 file:text-navy-700 hover:file:bg-navy-200 cursor-pointer"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error('File must be under 5MB');
                        return;
                      }
                      setGre(p => ({ ...p, file, fileUrl: URL.createObjectURL(file) }));
                    }
                  }}
                />
                {gre.file ? (
                  <p className="text-xs text-sage-600 dark:text-sage-400 font-bold flex items-center gap-1 mt-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> File attached</p>
                ) : gre.fileUrl ? (
                  <p className="text-xs text-navy-400 mt-1">Current file saved.</p>
                ) : null}
                <p className="text-xs text-navy-300 dark:text-cream-400/40 mt-1">Upload a PDF, JPG, or PNG under 5MB.</p>
              </div>
            </div>
          )}

          {!hasCFA && !hasGMAT && !hasGRE && (
            <div className="p-6 rounded-2xl bg-cream-50 dark:bg-navy-600/30 border border-navy-100 dark:border-navy-400/20 text-center text-navy-400">
              Go back to Step 1 to select the subjects you teach, then certifications will appear here.
            </div>
          )}
        </div>
      )}

      {noCerts && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
          You can add certifications anytime from your dashboard to upgrade to Verified status.
        </div>
      )}

      {/* Actions */}
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
