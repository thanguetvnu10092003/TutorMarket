'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

const emptyGmatDetails = {
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
};

const emptyGreDetails = {
  verbalScore: '',
  verbalPercentile: '',
  quantScore: '',
  quantPercentile: '',
  writingScore: '',
  writingPercentile: '',
  testDate: '',
};

function asString(value: unknown) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value);
}

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

export default function TutorVerifyPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selection, setSelection] = useState('');
  const [cfaDetails, setCfaDetails] = useState<Record<string, { year: string; score: string }>>({});
  const [gmatDetails, setGmatDetails] = useState(emptyGmatDetails);
  const [greDetails, setGreDetails] = useState(emptyGreDetails);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const credentialMap: Record<string, { subject: string | null; type: string }> = {
    'CFA Level 1 Certificate': { subject: 'CFA_LEVEL_1', type: 'CERTIFICATE' },
    'CFA Level 2 Certificate': { subject: 'CFA_LEVEL_2', type: 'CERTIFICATE' },
    'CFA Level 3 Certificate': { subject: 'CFA_LEVEL_3', type: 'CERTIFICATE' },
    'GMAT Score Report': { subject: 'GMAT', type: 'SCORE_REPORT' },
    'GRE Score Report': { subject: 'GRE', type: 'SCORE_REPORT' },
    'Academic Transcript': { subject: null, type: 'TRANSCRIPT' },
    'Other Document': { subject: null, type: 'OTHER' },
  };

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const response = await fetch('/api/tutor/profile', { cache: 'no-store' });
        const json = await response.json().catch(() => ({}));

        if (!response.ok || !isMounted) {
          return;
        }

        for (const certification of json.certifications || []) {
          if (certification.type === 'CFA' && certification.levelOrVariant) {
            setCfaDetails((previous) => ({
              ...previous,
              [certification.levelOrVariant]: {
                year: certification.testDate ? new Date(certification.testDate).getFullYear().toString() : '',
                score: asString(certification.score),
              },
            }));
          }

          if (certification.type === 'GMAT') {
            const percentiles = certification.percentiles || {};
            setGmatDetails((previous) => ({
              ...previous,
              totalScore: asString(certification.score),
              totalPercentile: asString(percentiles.totalPercentile ?? percentiles.totalPct ?? percentiles.total),
              quantScore: asString(percentiles.quantScore),
              quantPercentile: asString(percentiles.quantPercentile ?? percentiles.quant),
              verbalScore: asString(percentiles.verbalScore),
              verbalPercentile: asString(percentiles.verbalPercentile ?? percentiles.verbal),
              dataInsightsScore: asString(percentiles.dataInsightsScore),
              dataInsightsPercentile: asString(percentiles.dataInsightsPercentile ?? percentiles.dataInsights),
              testDate: certification.testDate ? String(certification.testDate).slice(0, 10) : '',
            }));
          }

          if (certification.type === 'GRE') {
            const percentiles = certification.percentiles || {};
            setGreDetails({
              verbalScore: asString(percentiles.verbal ?? percentiles.verbalScore),
              verbalPercentile: asString(percentiles.verbalPercentile ?? percentiles.verbalPct),
              quantScore: asString(percentiles.quant ?? percentiles.quantScore),
              quantPercentile: asString(percentiles.quantPercentile ?? percentiles.quantPct),
              writingScore: asString(percentiles.writing ?? percentiles.writingScore),
              writingPercentile: asString(percentiles.writingPercentile ?? percentiles.writingPct),
              testDate: certification.testDate ? String(certification.testDate).slice(0, 10) : '',
            });
          }
        }
      } catch (error) {
        console.error('Failed to prefill certification details', error);
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const getSelectedCertificationData = () => {
    const mapping = credentialMap[selection];

    if (!mapping?.subject) {
      return null;
    }

    if (mapping.subject.startsWith('CFA')) {
      const details = cfaDetails[mapping.subject] || { year: '', score: '' };
      return {
        year: details.year,
        score: details.score,
      };
    }

    if (mapping.subject === 'GMAT') {
      return {
        score: gmatDetails.totalScore,
        totalPercentile: gmatDetails.totalPercentile,
        quantScore: gmatDetails.quantScore,
        quantPercentile: gmatDetails.quantPercentile,
        verbalScore: gmatDetails.verbalScore,
        verbalPercentile: gmatDetails.verbalPercentile,
        dataInsightsScore: gmatDetails.dataInsightsScore,
        dataInsightsPercentile: gmatDetails.dataInsightsPercentile,
        testDate: gmatDetails.testDate,
      };
    }

    if (mapping.subject === 'GRE') {
      return {
        verbalScore: greDetails.verbalScore,
        verbalPercentile: greDetails.verbalPercentile,
        quantScore: greDetails.quantScore,
        quantPercentile: greDetails.quantPercentile,
        writingScore: greDetails.writingScore,
        writingPercentile: greDetails.writingPercentile,
        testDate: greDetails.testDate,
      };
    }

    return null;
  };

  const validateSelection = () => {
    const mapping = credentialMap[selection];

    if (!mapping?.subject) {
      return null;
    }

    if (mapping.subject.startsWith('CFA')) {
      const details = cfaDetails[mapping.subject] || { year: '', score: '' };

      if (!hasValue(details.score)) {
        return 'Please enter the CFA score before submitting this certificate.';
      }

      if (Number.isNaN(Number(details.score))) {
        return 'CFA score must be numeric.';
      }

      if (hasValue(details.year) && Number.isNaN(Number(details.year))) {
        return 'CFA year must be numeric.';
      }
    }

    if (mapping.subject === 'GMAT') {
      const requiredValues = [
        gmatDetails.totalScore,
        gmatDetails.totalPercentile,
        gmatDetails.quantScore,
        gmatDetails.quantPercentile,
        gmatDetails.verbalScore,
        gmatDetails.verbalPercentile,
        gmatDetails.dataInsightsScore,
        gmatDetails.dataInsightsPercentile,
      ];

      if (requiredValues.some((value) => !hasValue(value))) {
        return 'Please fill in the full GMAT score breakdown before submitting.';
      }

      if (
        (hasValue(gmatDetails.mbaEmail) || hasValue(gmatDetails.mbaPassword)) &&
        (!hasValue(gmatDetails.mbaEmail) || !hasValue(gmatDetails.mbaPassword))
      ) {
        return 'Please provide both your MBA.com email and password.';
      }

      if ((hasValue(gmatDetails.mbaEmail) || hasValue(gmatDetails.mbaPassword)) && !gmatDetails.authorized) {
        return 'Please authorize MBA.com verification before submitting.';
      }
    }

    if (mapping.subject === 'GRE') {
      const requiredValues = [
        greDetails.verbalScore,
        greDetails.verbalPercentile,
        greDetails.quantScore,
        greDetails.quantPercentile,
        greDetails.writingScore,
        greDetails.writingPercentile,
      ];

      if (requiredValues.some((value) => !hasValue(value))) {
        return 'Please fill in the full GRE score breakdown before submitting.';
      }
    }

    return null;
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

    const validationError = validateSelection();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const mapping = credentialMap[selection];
      const uploadFormData = new FormData();
      files.forEach((file) => {
        uploadFormData.append('files', file);
      });

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload files to server');
      }

      const { files: uploadedFiles } = await uploadResponse.json();

      const response = await fetch('/api/tutor/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: mapping.subject,
          credentialType: mapping.type,
          files: uploadedFiles,
          mbaEmail: mapping.subject === 'GMAT' ? gmatDetails.mbaEmail : '',
          mbaPassword: mapping.subject === 'GMAT' ? gmatDetails.mbaPassword : '',
          mbaConsent: mapping.subject === 'GMAT' ? gmatDetails.authorized : false,
          certificationData: getSelectedCertificationData(),
        }),
      });

      if (response.ok) {
        toast.success('Credentials submitted for review');
        setFiles([]);
        setSelection('');
        setGmatDetails((previous) => ({
          ...previous,
          mbaEmail: '',
          mbaPassword: '',
          authorized: false,
        }));
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

  const renderScoreDetails = () => {
    const mapping = credentialMap[selection];

    if (!selection) {
      return (
        <div className="rounded-2xl border border-dashed border-navy-200 bg-white/60 p-6 text-sm text-navy-400 dark:border-navy-500 dark:bg-navy-700/20 dark:text-cream-400/70">
          Select a document type first. If this is a CFA, GMAT, or GRE score report, the detailed score fields will appear here for admin review.
        </div>
      );
    }

    if (!mapping?.subject) {
      return (
        <div className="rounded-2xl border border-navy-100 bg-white/70 p-6 text-sm text-navy-400 dark:border-navy-500 dark:bg-navy-700/20 dark:text-cream-400/70">
          No score details are needed for this document type. Only the uploaded file will be submitted to admin.
        </div>
      );
    }

    if (isBootstrapping) {
      return (
        <div className="flex items-center gap-3 rounded-2xl border border-gold-200 bg-gold-400/5 p-6 text-sm text-navy-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" />
          Loading your saved certification details...
        </div>
      );
    }

    if (mapping.subject.startsWith('CFA')) {
      const details = cfaDetails[mapping.subject] || { year: '', score: '' };
      return (
        <div className="space-y-4 rounded-2xl border border-navy-100 bg-white/70 p-6 dark:border-navy-500 dark:bg-navy-700/20">
          <p className="text-xs leading-relaxed text-navy-400 dark:text-cream-400/70">
            Admin reviews the certificate against the score and year you provide here.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-navy-400">Year Passed</label>
              <input
                type="number"
                value={details.year}
                onChange={(event) =>
                  setCfaDetails((previous) => ({
                    ...previous,
                    [mapping.subject as string]: {
                      ...(previous[mapping.subject as string] || { year: '', score: '' }),
                      year: event.target.value,
                    },
                  }))
                }
                placeholder="2024"
                className="w-full rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-gold-400 dark:border-navy-500 dark:bg-navy-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-navy-400">CFA Score</label>
              <input
                type="text"
                value={details.score}
                onChange={(event) =>
                  setCfaDetails((previous) => ({
                    ...previous,
                    [mapping.subject as string]: {
                      ...(previous[mapping.subject as string] || { year: '', score: '' }),
                      score: event.target.value,
                    },
                  }))
                }
                placeholder="Enter your CFA score"
                className="w-full rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-gold-400 dark:border-navy-500 dark:bg-navy-800"
              />
            </div>
          </div>
        </div>
      );
    }

    if (mapping.subject === 'GMAT') {
      return (
        <div className="space-y-6 rounded-2xl border border-navy-100 bg-white/70 p-6 dark:border-navy-500 dark:bg-navy-700/20">
          <p className="text-xs leading-relaxed text-navy-400 dark:text-cream-400/70">
            These values are stored with your GMAT certification so admin can compare your claimed scores, uploaded report, and MBA.com results side by side.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <ScoreField label="Total Score" value={gmatDetails.totalScore} onChange={(value) => setGmatDetails((previous) => ({ ...previous, totalScore: value }))} />
            <ScoreField label="Total Percentile" value={gmatDetails.totalPercentile} onChange={(value) => setGmatDetails((previous) => ({ ...previous, totalPercentile: value }))} />
            <ScoreField label="Quant Score" value={gmatDetails.quantScore} onChange={(value) => setGmatDetails((previous) => ({ ...previous, quantScore: value }))} />
            <ScoreField label="Quant Percentile" value={gmatDetails.quantPercentile} onChange={(value) => setGmatDetails((previous) => ({ ...previous, quantPercentile: value }))} />
            <ScoreField label="Verbal Score" value={gmatDetails.verbalScore} onChange={(value) => setGmatDetails((previous) => ({ ...previous, verbalScore: value }))} />
            <ScoreField label="Verbal Percentile" value={gmatDetails.verbalPercentile} onChange={(value) => setGmatDetails((previous) => ({ ...previous, verbalPercentile: value }))} />
            <ScoreField label="Data Insights Score" value={gmatDetails.dataInsightsScore} onChange={(value) => setGmatDetails((previous) => ({ ...previous, dataInsightsScore: value }))} />
            <ScoreField label="Data Insights Percentile" value={gmatDetails.dataInsightsPercentile} onChange={(value) => setGmatDetails((previous) => ({ ...previous, dataInsightsPercentile: value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-navy-400">Test Date</label>
            <input
              type="date"
              value={gmatDetails.testDate}
              onChange={(event) => setGmatDetails((previous) => ({ ...previous, testDate: event.target.value }))}
              className="w-full max-w-sm rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-gold-400 dark:border-navy-500 dark:bg-navy-800"
            />
          </div>
          <div className="rounded-2xl border border-gold-200 bg-gold-400/5 p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-gold-700">MBA.com Credentials</div>
            <p className="mt-2 text-xs leading-relaxed text-navy-400 dark:text-cream-400/70">
              If you provide MBA.com credentials here, the admin GMAT review tab will show them separately from the document review.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-navy-400">MBA Email</label>
                <input
                  type="email"
                  value={gmatDetails.mbaEmail}
                  onChange={(event) => setGmatDetails((previous) => ({ ...previous, mbaEmail: event.target.value }))}
                  placeholder="your-email@example.com"
                  className="w-full rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-gold-400 dark:border-navy-500 dark:bg-navy-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-navy-400">MBA Password</label>
                <input
                  type="password"
                  value={gmatDetails.mbaPassword}
                  onChange={(event) => setGmatDetails((previous) => ({ ...previous, mbaPassword: event.target.value }))}
                  placeholder="Enter your MBA.com password"
                  className="w-full rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-gold-400 dark:border-navy-500 dark:bg-navy-800"
                />
              </div>
            </div>
            <label className="mt-4 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={gmatDetails.authorized}
                onChange={(event) => setGmatDetails((previous) => ({ ...previous, authorized: event.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-gold-400 accent-gold-400"
              />
              <span className="text-[11px] leading-relaxed text-navy-400 dark:text-cream-400/70">
                I authorize TutorMarket admins to use these credentials only to verify my GMAT score on MBA.com.
              </span>
            </label>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 rounded-2xl border border-navy-100 bg-white/70 p-6 dark:border-navy-500 dark:bg-navy-700/20">
        <p className="text-xs leading-relaxed text-navy-400 dark:text-cream-400/70">
          These GRE section scores are stored with your submission so admin can compare your claims with the uploaded score report.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <ScoreField label="Verbal Score" value={greDetails.verbalScore} onChange={(value) => setGreDetails((previous) => ({ ...previous, verbalScore: value }))} />
          <ScoreField label="Verbal Percentile" value={greDetails.verbalPercentile} onChange={(value) => setGreDetails((previous) => ({ ...previous, verbalPercentile: value }))} />
          <ScoreField label="Quant Score" value={greDetails.quantScore} onChange={(value) => setGreDetails((previous) => ({ ...previous, quantScore: value }))} />
          <ScoreField label="Quant Percentile" value={greDetails.quantPercentile} onChange={(value) => setGreDetails((previous) => ({ ...previous, quantPercentile: value }))} />
          <ScoreField label="Analytical Writing Score" value={greDetails.writingScore} onChange={(value) => setGreDetails((previous) => ({ ...previous, writingScore: value }))} />
          <ScoreField label="Analytical Writing Percentile" value={greDetails.writingPercentile} onChange={(value) => setGreDetails((previous) => ({ ...previous, writingPercentile: value }))} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-navy-400">Test Date</label>
          <input
            type="date"
            value={greDetails.testDate}
            onChange={(event) => setGreDetails((previous) => ({ ...previous, testDate: event.target.value }))}
            className="w-full max-w-sm rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-gold-400 dark:border-navy-500 dark:bg-navy-800"
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <Link href="/dashboard/tutor" className="mb-8 flex items-center gap-2 text-xs font-bold text-gold-500 transition-colors hover:text-gold-600">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        BACK TO DASHBOARD
      </Link>

      <div className="glass-card p-8 md:p-12">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400 text-navy-600 shadow-gold">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Get Verified</h1>
            <p className="text-sm text-navy-300 dark:text-cream-400/60">Upload your documents and resubmit the exact score details admin should compare during verification.</p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="space-y-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-6">
              <h3 className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-navy-600 dark:text-cream-200">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-400 text-[10px] text-navy-600">1</span>
                Select Certificate Type
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {Object.keys(credentialMap).map((type) => (
                  <label
                    key={type}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all ${
                      selection === type
                        ? 'border-gold-400 bg-gold-400/5 dark:bg-gold-400/10'
                        : 'border-navy-100 hover:bg-navy-50 dark:border-navy-400 dark:hover:bg-navy-500/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="credType"
                      checked={selection === type}
                      onChange={() => setSelection(type)}
                      className="h-4 w-4 accent-gold-400"
                    />
                    <span className="text-sm font-semibold text-navy-600 dark:text-cream-200">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-6">
                <h3 className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-navy-600 dark:text-cream-200">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-400 text-[10px] text-navy-600">2</span>
                  Enter Score Details
                </h3>
                {renderScoreDetails()}
              </div>

              <div className="space-y-6">
                <h3 className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-navy-600 dark:text-cream-200">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-400 text-[10px] text-navy-600">3</span>
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
                  className={`group cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                    isDragging
                      ? 'border-gold-400 bg-gold-400/5'
                      : 'border-navy-100 hover:border-gold-400 dark:border-navy-400'
                  }`}
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 transition-transform group-hover:scale-110 dark:bg-navy-500">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-navy-300"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                  </div>
                  <p className="text-sm font-bold text-navy-600 dark:text-cream-200">Click to upload or drag and drop</p>
                  <p className="mt-1 text-xs text-navy-300 dark:text-cream-400/60">PDF, JPG, or PNG (Max. 10MB)</p>
                </div>

                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="animate-in fade-in slide-in-from-top-2 flex items-center justify-between rounded-xl border border-navy-100 bg-white p-3 shadow-sm duration-300 dark:border-navy-400 dark:bg-navy-500">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gold-400/10 text-gold-500">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                          </div>
                          <div className="truncate">
                            <p className="truncate text-xs font-bold text-navy-600 dark:text-cream-200">{file.name}</p>
                            <p className="text-[10px] text-navy-300 dark:text-cream-400/60">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeFile(index);
                          }}
                          className="p-1.5 text-navy-300 transition-colors hover:text-red-500"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-navy-100/50 bg-navy-50 p-6 dark:border-navy-400/30 dark:bg-navy-700/30">
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">!</div>
              <p className="text-xs leading-relaxed text-navy-400 dark:text-cream-400/80">
                <span className="font-bold">Verification Process:</span> Admin now receives both your uploaded file and the detailed score data you enter above. GMAT submissions with MBA.com credentials will also appear in the separate GMAT requests queue for portal review.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || files.length === 0}
            className="btn-primary w-full rounded-xl py-4 text-lg font-bold shadow-gold-lg transition-all disabled:opacity-50 disabled:shadow-none"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Submitting...
              </div>
            ) : 'Submit for Review'}
          </button>
        </form>
      </div>
    </>
  );
}

function ScoreField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-navy-400">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-gold-400 dark:border-navy-500 dark:bg-navy-800"
      />
    </div>
  );
}
