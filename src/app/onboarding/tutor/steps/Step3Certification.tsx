'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const CFA_LEVELS = ['CFA_LEVEL_1', 'CFA_LEVEL_2', 'CFA_LEVEL_3'];

function cfaLabel(value: string) {
  return value.replace(/_/g, ' ').replace('CFA LEVEL', 'CFA Level');
}

function asString(value: unknown) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value);
}

export default function Step3Certification({ onNext, onBack }: Props) {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [noCerts, setNoCerts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cfaData, setCfaData] = useState<Record<string, { year: string; score: string; fileUrl: string; file?: File }>>({});
  const [gmat, setGmat] = useState({
    totalScore: '',
    totalPercentile: '',
    quantScore: '',
    quantPercentile: '',
    verbalScore: '',
    verbalPercentile: '',
    dataInsightsScore: '',
    dataInsightsPercentile: '',
    testDate: '',
    mbaEmail: '',
    mbaPassword: '',
    authorized: false,
  });
  const [gre, setGre] = useState({
    verbalScore: '',
    verbalPercentile: '',
    quantScore: '',
    quantPercentile: '',
    writingScore: '',
    writingPercentile: '',
    testDate: '',
    fileUrl: '',
    file: undefined as File | undefined,
  });

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('files', file);

    try {
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { files } = await response.json();
      return files?.[0]?.url || null;
    } catch (error) {
      console.error('File upload failed', error);
      return null;
    }
  };

  useEffect(() => {
    fetch('/api/onboarding/step/3')
      .then((response) => response.json())
      .then((data) => {
        setSubjects(data.data?.subjects || []);
        setNoCerts(Boolean(data.data?.noCertifications));

        for (const certification of data.data?.certifications || []) {
          if (certification.type === 'CFA') {
            setCfaData((previous) => ({
              ...previous,
              [certification.levelOrVariant]: {
                year: certification.testDate ? new Date(certification.testDate).getFullYear().toString() : '',
                score: asString(certification.score),
                fileUrl: certification.fileUrl || '',
              },
            }));
          }

          if (certification.type === 'GMAT') {
            const percentiles = certification.percentiles || {};
            setGmat({
              totalScore: asString(certification.score),
              totalPercentile: asString(percentiles.totalPercentile ?? percentiles.totalPct ?? percentiles.total),
              quantScore: asString(percentiles.quantScore),
              quantPercentile: asString(percentiles.quantPercentile ?? percentiles.quant),
              verbalScore: asString(percentiles.verbalScore),
              verbalPercentile: asString(percentiles.verbalPercentile ?? percentiles.verbal),
              dataInsightsScore: asString(percentiles.dataInsightsScore),
              dataInsightsPercentile: asString(percentiles.dataInsightsPercentile ?? percentiles.dataInsights),
              testDate: certification.testDate ? certification.testDate.toString().slice(0, 10) : '',
              mbaEmail: '',
              mbaPassword: '',
              authorized: false,
            });
          }

          if (certification.type === 'GRE') {
            const percentiles = certification.percentiles || {};
            setGre({
              verbalScore: asString(percentiles.verbal ?? percentiles.verbalScore),
              verbalPercentile: asString(percentiles.verbalPercentile ?? percentiles.verbalPct),
              quantScore: asString(percentiles.quant ?? percentiles.quantScore),
              quantPercentile: asString(percentiles.quantPercentile ?? percentiles.quantPct),
              writingScore: asString(percentiles.writing ?? percentiles.writingScore),
              writingPercentile: asString(percentiles.writingPercentile ?? percentiles.writingPct),
              testDate: certification.testDate ? certification.testDate.toString().slice(0, 10) : '',
              fileUrl: certification.fileUrl || '',
              file: undefined,
            });
          }
        }
      });
  }, []);

  const hasCFA = subjects.some((subject) => CFA_LEVELS.includes(subject));
  const hasGMAT = subjects.includes('GMAT');
  const hasGRE = subjects.includes('GRE');

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const certifications: any[] = [];

      if (!noCerts) {
        for (const level of CFA_LEVELS) {
          if (!subjects.includes(level)) {
            continue;
          }

          const data = cfaData[level] || { year: '', score: '', fileUrl: '' };
          let fileUrl = data.fileUrl;

          if (data.file) {
            const uploadedUrl = await uploadFile(data.file);
            if (uploadedUrl) {
              fileUrl = uploadedUrl;
            }
          }

          if (data.score && Number.isNaN(Number(data.score))) {
            toast.error(`${cfaLabel(level)} score must be numeric`);
            setIsSaving(false);
            return;
          }

          certifications.push({
            type: 'CFA',
            levelOrVariant: level,
            testDate: data.year ? `${data.year}-01-01` : null,
            score: data.score || null,
            fileUrl: fileUrl || null,
          });
        }

        if (hasGMAT) {
          if ((gmat.mbaEmail || gmat.mbaPassword) && !gmat.authorized) {
            toast.error('Please authorize GMAT credential verification before saving.');
            setIsSaving(false);
            return;
          }

          certifications.push({
            type: 'GMAT',
            levelOrVariant: 'GMAT',
            score: gmat.totalScore || null,
            percentiles: {
              totalPercentile: gmat.totalPercentile || null,
              quantScore: gmat.quantScore || null,
              quantPercentile: gmat.quantPercentile || null,
              verbalScore: gmat.verbalScore || null,
              verbalPercentile: gmat.verbalPercentile || null,
              dataInsightsScore: gmat.dataInsightsScore || null,
              dataInsightsPercentile: gmat.dataInsightsPercentile || null,
            },
            testDate: gmat.testDate || null,
            mbaEmail: gmat.mbaEmail || null,
            mbaPassword: gmat.mbaPassword || null,
          });
        }

        if (hasGRE) {
          let fileUrl = gre.fileUrl;
          if (gre.file) {
            const uploadedUrl = await uploadFile(gre.file);
            if (uploadedUrl) {
              fileUrl = uploadedUrl;
            }
          }

          certifications.push({
            type: 'GRE',
            levelOrVariant: 'GRE',
            percentiles: {
              verbal: gre.verbalScore || null,
              verbalPercentile: gre.verbalPercentile || null,
              quant: gre.quantScore || null,
              quantPercentile: gre.quantPercentile || null,
              writing: gre.writingScore || null,
              writingPercentile: gre.writingPercentile || null,
            },
            testDate: gre.testDate || null,
            fileUrl: fileUrl || null,
          });
        }
      }

      const response = await fetch('/api/onboarding/step/3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certifications, noCertifications: noCerts }),
      });

      if (!response.ok) {
        throw new Error('Failed to save certifications');
      }

      toast.success('Certifications saved');
      onNext();
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-card p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Certifications & Scores</h2>
        <p className="text-navy-400 dark:text-cream-400/60 mt-1">Add your exam results and upload supporting files for verification.</p>
      </div>

      <div className="space-y-4">
        <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${!noCerts ? 'border-sage-400 bg-sage-50/50 dark:bg-sage-900/10' : 'border-navy-100 dark:border-navy-400/20 hover:border-navy-300'}`}>
          <input type="radio" name="hasCerts" checked={!noCerts} onChange={() => setNoCerts(false)} className="mt-1 w-5 h-5 accent-sage-500" />
          <div>
            <span className="font-bold text-lg text-navy-600 dark:text-cream-200">Yes, I have certifications to verify</span>
            <p className="text-sm text-navy-400 dark:text-cream-400/60 mt-0.5">Verified scores appear publicly after admin approval.</p>
          </div>
        </label>

        <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${noCerts ? 'border-navy-400 bg-navy-50 dark:bg-navy-500/30' : 'border-navy-100 dark:border-navy-400/20 hover:border-navy-300'}`}>
          <input type="radio" name="hasCerts" checked={noCerts} onChange={() => setNoCerts(true)} className="mt-1 w-5 h-5 accent-navy-500" />
          <div>
            <span className="font-bold text-lg text-navy-600 dark:text-cream-200">I do not want to submit certifications now</span>
            <p className="text-sm text-navy-400 dark:text-cream-400/60 mt-0.5">You can add them later from the tutor dashboard.</p>
          </div>
        </label>
      </div>

      {!noCerts && (
        <div className="space-y-6">
          {hasCFA && CFA_LEVELS.filter((level) => subjects.includes(level)).map((level) => (
            <div key={level} className="p-6 rounded-2xl bg-cream-50 dark:bg-navy-600/30 border border-navy-100 dark:border-navy-400/20 space-y-4">
              <h3 className="font-bold text-navy-600 dark:text-cream-200">{cfaLabel(level)}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Year Passed</label>
                  <input
                    type="number"
                    className="input-field w-full"
                    placeholder="2024"
                    value={cfaData[level]?.year || ''}
                    onChange={(event) => setCfaData((previous) => ({ ...previous, [level]: { ...previous[level], year: event.target.value } }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">CFA Score</label>
                  <input
                    type="text"
                    className="input-field w-full"
                    placeholder="Enter your CFA score"
                    value={cfaData[level]?.score || ''}
                    onChange={(event) => setCfaData((previous) => ({ ...previous, [level]: { ...previous[level], score: event.target.value } }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Certificate File (optional)</label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="input-field w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-navy-100 file:text-navy-700 hover:file:bg-navy-200 cursor-pointer"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    if (file.size > 5 * 1024 * 1024) {
                      toast.error('File must be under 5MB');
                      return;
                    }

                    setCfaData((previous) => ({
                      ...previous,
                      [level]: { ...previous[level], file, fileUrl: URL.createObjectURL(file) },
                    }));
                  }}
                />
                {cfaData[level]?.fileUrl && <p className="text-xs text-navy-400">Certificate file attached.</p>}
              </div>
            </div>
          ))}

          {hasGMAT && (
            <div className="p-6 rounded-2xl bg-cream-50 dark:bg-navy-600/30 border border-navy-100 dark:border-navy-400/20 space-y-4">
              <h3 className="font-bold text-navy-600 dark:text-cream-200">GMAT</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Total Score</label>
                  <input type="number" className="input-field w-full" value={gmat.totalScore} onChange={(event) => setGmat((previous) => ({ ...previous, totalScore: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Total Percentile</label>
                  <input type="number" min="0" max="99" className="input-field w-full" value={gmat.totalPercentile} onChange={(event) => setGmat((previous) => ({ ...previous, totalPercentile: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Quant Score</label>
                  <input type="number" className="input-field w-full" value={gmat.quantScore} onChange={(event) => setGmat((previous) => ({ ...previous, quantScore: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Quant Percentile</label>
                  <input type="number" min="0" max="99" className="input-field w-full" value={gmat.quantPercentile} onChange={(event) => setGmat((previous) => ({ ...previous, quantPercentile: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Verbal Score</label>
                  <input type="number" className="input-field w-full" value={gmat.verbalScore} onChange={(event) => setGmat((previous) => ({ ...previous, verbalScore: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Verbal Percentile</label>
                  <input type="number" min="0" max="99" className="input-field w-full" value={gmat.verbalPercentile} onChange={(event) => setGmat((previous) => ({ ...previous, verbalPercentile: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Data Insights Score</label>
                  <input type="number" className="input-field w-full" value={gmat.dataInsightsScore} onChange={(event) => setGmat((previous) => ({ ...previous, dataInsightsScore: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Data Insights Percentile</label>
                  <input type="number" min="0" max="99" className="input-field w-full" value={gmat.dataInsightsPercentile} onChange={(event) => setGmat((previous) => ({ ...previous, dataInsightsPercentile: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Test Date</label>
                <input type="date" className="input-field w-full max-w-sm" value={gmat.testDate} onChange={(event) => setGmat((previous) => ({ ...previous, testDate: event.target.value }))} />
              </div>
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 space-y-3">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                  If you want admin to verify your GMAT directly against MBA.com, add your MBA.com login below.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="input-field w-full text-sm" placeholder="MBA.com email" value={gmat.mbaEmail} onChange={(event) => setGmat((previous) => ({ ...previous, mbaEmail: event.target.value }))} />
                  <input type="password" className="input-field w-full text-sm" placeholder="MBA.com password" value={gmat.mbaPassword} onChange={(event) => setGmat((previous) => ({ ...previous, mbaPassword: event.target.value }))} />
                </div>
                {(gmat.mbaEmail || gmat.mbaPassword) && (
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={gmat.authorized} onChange={(event) => setGmat((previous) => ({ ...previous, authorized: event.target.checked }))} className="mt-0.5 accent-blue-500" />
                    <span className="text-xs text-blue-700 dark:text-blue-300">I authorize these credentials to be used once for GMAT verification only.</span>
                  </label>
                )}
              </div>
            </div>
          )}

          {hasGRE && (
            <div className="p-6 rounded-2xl bg-cream-50 dark:bg-navy-600/30 border border-navy-100 dark:border-navy-400/20 space-y-4">
              <h3 className="font-bold text-navy-600 dark:text-cream-200">GRE</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Verbal Score</label>
                  <input type="number" className="input-field w-full" value={gre.verbalScore} onChange={(event) => setGre((previous) => ({ ...previous, verbalScore: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Verbal Percentile</label>
                  <input type="number" min="0" max="99" className="input-field w-full" value={gre.verbalPercentile} onChange={(event) => setGre((previous) => ({ ...previous, verbalPercentile: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Quant Score</label>
                  <input type="number" className="input-field w-full" value={gre.quantScore} onChange={(event) => setGre((previous) => ({ ...previous, quantScore: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Quant Percentile</label>
                  <input type="number" min="0" max="99" className="input-field w-full" value={gre.quantPercentile} onChange={(event) => setGre((previous) => ({ ...previous, quantPercentile: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Analytical Writing Score</label>
                  <input type="number" className="input-field w-full" value={gre.writingScore} onChange={(event) => setGre((previous) => ({ ...previous, writingScore: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Analytical Writing Percentile</label>
                  <input type="number" min="0" max="99" className="input-field w-full" value={gre.writingPercentile} onChange={(event) => setGre((previous) => ({ ...previous, writingPercentile: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">Test Date</label>
                <input type="date" className="input-field w-full max-w-sm" value={gre.testDate} onChange={(event) => setGre((previous) => ({ ...previous, testDate: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-navy-400 uppercase tracking-wider">ETS Score Report File (optional)</label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="input-field w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-navy-100 file:text-navy-700 hover:file:bg-navy-200 cursor-pointer"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    if (file.size > 5 * 1024 * 1024) {
                      toast.error('File must be under 5MB');
                      return;
                    }

                    setGre((previous) => ({ ...previous, file, fileUrl: URL.createObjectURL(file) }));
                  }}
                />
                {gre.fileUrl && <p className="text-xs text-navy-400">Score report attached.</p>}
              </div>
            </div>
          )}

          {!hasCFA && !hasGMAT && !hasGRE && (
            <div className="p-6 rounded-2xl bg-cream-50 dark:bg-navy-600/30 border border-navy-100 dark:border-navy-400/20 text-center text-navy-400">
              Go back to Step 1 to select subjects first. Certification fields appear based on what you teach.
            </div>
          )}
        </div>
      )}

      {noCerts && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
          You can skip this step now and add certifications later from your dashboard.
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-navy-100 dark:border-navy-400/20">
        <button onClick={onBack} className="btn-outline px-6 py-3 rounded-2xl font-bold flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <button onClick={handleSave} disabled={isSaving} className="btn-primary px-8 py-3 rounded-2xl font-bold flex items-center gap-2">
          {isSaving ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...
            </>
          ) : (
            <>
              Save and continue
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
