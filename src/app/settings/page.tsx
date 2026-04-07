'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getInitials } from '@/lib/utils';
import PasswordInput from '@/components/ui/PasswordInput';
import { CURRENCY_META } from '@/lib/currency';
import VideoUploader from '@/components/profile/VideoUploader';

const tabs = [
  { id: 'profile', label: 'Profile', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  )},
  { id: 'account', label: 'Account', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  )},
  { id: 'notifications', label: 'Notifications', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  )},
  { id: 'security', label: 'Security', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  )},
];

const notificationOptions = [
  { type: 'SESSION_UPDATES', title: 'Session Updates', desc: 'Get notified about session bookings, rescheduling, and cancellations.' },
  { type: 'MESSAGES', title: 'Messages', desc: 'Receive alerts when you get a new message.' },
  { type: 'MARKETING', title: 'Marketing', desc: 'News about feature updates and platform promotions.' },
  { type: 'PAYMENT_ALERTS', title: 'Payment Alerts', desc: 'Confirmations and receipts for your transactions.' },
];

const DEGREE_TYPES = [
  { value: 'BACHELORS', label: "Bachelor's Degree" },
  { value: 'MASTERS', label: "Master's Degree" },
  { value: 'MBA', label: "MBA" },
  { value: 'PHD', label: "PhD / Doctorate" },
  { value: 'OTHER', label: "Other" },
];

const CFA_LEVELS = ['CFA_LEVEL_1', 'CFA_LEVEL_2', 'CFA_LEVEL_3'];
function cfaLabel(value: string) { return value.replace(/_/g, ' ').replace('CFA LEVEL', 'CFA Level'); }

const ADMIN_MANAGED_CERTIFICATION_STATUSES = new Set([
  'PENDING_VERIFICATION',
  'VERIFIED',
  'REJECTED',
  'RESUBMITTED',
]);

function getCertificationKey(type: string, levelOrVariant?: string | null) {
  return `${type}:${levelOrVariant || ''}`;
}

function isAdminManagedCertificationStatus(status?: string | null) {
  return Boolean(status && ADMIN_MANAGED_CERTIFICATION_STATUSES.has(status));
}

function getCertificationLockLabel(status?: string | null) {
  switch (status) {
    case 'VERIFIED':
      return 'Verified by admin - locked';
    case 'PENDING_VERIFICATION':
      return 'Under review - locked';
    case 'RESUBMITTED':
      return 'Resubmitted - locked';
    case 'REJECTED':
      return 'Rejected - resubmit from Get Verified';
    default:
      return null;
  }
}

const defaultNotificationPreferences = notificationOptions.reduce<Record<string, { emailEnabled: boolean; inAppEnabled: boolean }>>(
  (acc, option) => { acc[option.type] = { emailEnabled: true, inAppEnabled: true }; return acc; },
  {}
);

function emptyGmat() {
  return { totalScore: '', totalPercentile: '', quantScore: '', quantPercentile: '', verbalScore: '', verbalPercentile: '', dataInsightsScore: '', dataInsightsPercentile: '', testDate: '' };
}

function emptyGre() {
  return { verbalScore: '', verbalPercentile: '', quantScore: '', quantPercentile: '', writingScore: '', writingPercentile: '', testDate: '' };
}

function emptyCfa() {
  return { year: '', score: '' };
}

function labelInput({ label, value, onChange, type = 'text', min, max, placeholder, isPrimary, disabled = false }: any) {
  return (
    <div className={`space-y-2 ${isPrimary ? 'md:col-span-2' : ''}`}>
      <label className="text-[10px] font-black text-navy-400 dark:text-cream-400/40 uppercase tracking-[0.2em] ml-1">{label}</label>
      <div className="relative group">
        <input
          type={type}
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-5 py-4 rounded-2xl bg-cream-50 dark:bg-navy-700/50 border-2 border-transparent focus:border-gold-400 dark:focus:border-gold-500 transition-all outline-none font-bold text-navy-600 dark:text-cream-200 ${
            isPrimary ? 'text-xl md:text-2xl py-5' : 'text-sm'
          } ${
            disabled ? 'cursor-not-allowed opacity-70 focus:border-transparent dark:focus:border-transparent' : ''
          }`}
        />
        <div className="absolute inset-0 rounded-2xl bg-gold-400/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
      </div>
    </div>
  );
}

function ScoreRow({ title, scoreKey, pctKey, data, setData, isPrimary, color = 'blue', disabled = false }: any) {
  const colorClasses: any = {
    blue: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    emerald: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    amber: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  };

  return (
    <div className={`flex flex-col gap-4 p-5 rounded-[24px] border border-navy-50 dark:border-navy-700/50 hover:bg-navy-50/30 dark:hover:bg-navy-800/10 transition-colors ${isPrimary ? 'md:col-span-2 bg-gradient-to-r from-transparent to-navy-50/20 dark:to-navy-800/20' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${colorClasses[color]}`}>
          {title}
        </div>
        <div className="h-px flex-1 bg-navy-100 dark:bg-navy-700/50" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {labelInput({ 
          label: 'Score', 
          value: data[scoreKey], 
          isPrimary,
          disabled,
          placeholder: '---',
          onChange: (e: any) => setData((p: any) => ({ ...p, [scoreKey]: e.target.value })) 
        })}
        {labelInput({ 
          label: 'Percentile (%)', 
          type: 'number',
          value: data[pctKey], 
          min: 0, 
          max: 99, 
          disabled,
          placeholder: '0-99',
          onChange: (e: any) => setData((p: any) => ({ ...p, [pctKey]: e.target.value })) 
        })}
      </div>
    </div>
  );
}

function SettingsPageInner() {
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const [notificationPreferences, setNotificationPreferences] = useState(defaultNotificationPreferences);
  const [savingNotificationType, setSavingNotificationType] = useState<string | null>(null);

  // ── Basic profile fields ──
  const [profileData, setProfileData] = useState({
    name: session?.user?.name || '',
    headline: '',
    bio: '',
    location: '',
    languages: 'English',
    education: [] as any[],
    videoUrl: '',
  });

  const [showAddEdu, setShowAddEdu] = useState(false);
  const [newEdu, setNewEdu] = useState({ degree: 'BACHELORS', fieldOfStudy: '', institution: '', graduationYear: new Date().getFullYear() });

  // ── Certification state ──
  const [gmat, setGmat] = useState(emptyGmat());
  const [hasGmat, setHasGmat] = useState(false);
  const [gre, setGre] = useState(emptyGre());
  const [hasGre, setHasGre] = useState(false);
  // CFA – one sub-form per level
  const [cfaData, setCfaData] = useState<Record<string, { year: string; score: string }>>({});
  const [activeCfaLevels, setActiveCfaLevels] = useState<string[]>([]);
  const [certificationStatusMap, setCertificationStatusMap] = useState<Record<string, { status: string; notes?: string | null; verifiedAt?: string | null }>>({});

  // ── Student preferences ──
  const [studentPreferences, setStudentPreferences] = useState({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, preferredCurrency: 'USD' });
  const [savingStudentPreferences, setSavingStudentPreferences] = useState(false);
  const gmatCertificationState = certificationStatusMap[getCertificationKey('GMAT', 'GMAT')];
  const greCertificationState = certificationStatusMap[getCertificationKey('GRE', 'GRE')];
  const lockedGmat = isAdminManagedCertificationStatus(gmatCertificationState?.status);
  const lockedGre = isAdminManagedCertificationStatus(greCertificationState?.status);
  const lockedCfaLevels = new Set(
    CFA_LEVELS.filter((level) =>
      isAdminManagedCertificationStatus(certificationStatusMap[getCertificationKey('CFA', level)]?.status)
    )
  );

  // ── Fetch tutor profile on mount ──
  useEffect(() => {
    if (session?.user?.role !== 'TUTOR') return;
    fetch('/api/tutor/profile')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return;
        setProfileData(prev => ({
          ...prev,
          headline: data.headline || '',
          bio: data.about || '',
          languages: data.languages?.join(', ') || 'English',
          education: data.education || [],
          videoUrl: data.videoUrl || '',
        }));

        // Hydrate certifications
        const certs: any[] = data.certifications || [];
        const nextStatusMap: Record<string, { status: string; notes?: string | null; verifiedAt?: string | null }> = {};
        certs.forEach((cert: any) => {
          nextStatusMap[getCertificationKey(cert.type, cert.levelOrVariant)] = {
            status: cert.status,
            notes: cert.notes || cert.rejectionReason || null,
            verifiedAt: cert.verifiedAt || null,
          };
        });
        setCertificationStatusMap(nextStatusMap);
        const gmatCert = certs.find((c: any) => c.type === 'GMAT');
        if (gmatCert) {
          const p = gmatCert.percentiles || {};
          setHasGmat(true);
          setGmat({
            totalScore: gmatCert.score != null ? String(gmatCert.score) : '',
            totalPercentile: String(p.totalPercentile ?? ''),
            quantScore: String(p.quantScore ?? ''),
            quantPercentile: String(p.quantPercentile ?? ''),
            verbalScore: String(p.verbalScore ?? ''),
            verbalPercentile: String(p.verbalPercentile ?? ''),
            dataInsightsScore: String(p.dataInsightsScore ?? ''),
            dataInsightsPercentile: String(p.dataInsightsPercentile ?? ''),
            testDate: gmatCert.testDate ? new Date(gmatCert.testDate).toISOString().slice(0, 10) : '',
          });
        }

        const greCert = certs.find((c: any) => c.type === 'GRE');
        if (greCert) {
          const p = greCert.percentiles || {};
          setHasGre(true);
          setGre({
            verbalScore: String(p.verbal ?? p.verbalScore ?? ''),
            verbalPercentile: String(p.verbalPercentile ?? ''),
            quantScore: String(p.quant ?? p.quantScore ?? ''),
            quantPercentile: String(p.quantPercentile ?? ''),
            writingScore: String(p.writing ?? p.writingScore ?? ''),
            writingPercentile: String(p.writingPercentile ?? ''),
            testDate: greCert.testDate ? new Date(greCert.testDate).toISOString().slice(0, 10) : '',
          });
        }

        const cfaFound = certs.filter((c: any) => c.type === 'CFA');
        if (cfaFound.length > 0) {
          const levels = cfaFound.map((c: any) => c.levelOrVariant);
          setActiveCfaLevels(levels);
          const cfaMap: Record<string, { year: string; score: string }> = {};
          cfaFound.forEach((c: any) => {
            cfaMap[c.levelOrVariant] = {
              year: c.testDate ? String(new Date(c.testDate).getFullYear()) : '',
              score: c.score != null ? String(c.score) : '',
            };
          });
          setCfaData(cfaMap);
        }
      })
      .catch(console.error);
  }, [session]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (requestedTab && tabs.some(t => t.id === requestedTab)) setActiveTab(requestedTab);
  }, [searchParams]);

  useEffect(() => {
    if (!session?.user) return;
    let ignore = false;
    fetch('/api/student/notifications/preferences', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json || ignore) return;
        const next = { ...defaultNotificationPreferences };
        for (const pref of json.data || []) next[pref.notificationType] = { emailEnabled: pref.emailEnabled, inAppEnabled: pref.inAppEnabled };
        setNotificationPreferences(next);
      });
    return () => { ignore = true; };
  }, [session]);

  useEffect(() => {
    if (session?.user?.role !== 'STUDENT') return;
    let ignore = false;
    fetch('/api/student/preferences', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json || ignore) return;
        setStudentPreferences({ timezone: json?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, preferredCurrency: json?.preferredCurrency || 'USD' });
      });
    return () => { ignore = true; };
  }, [session?.user?.role]);

  // ── Build certification payload ──
  function buildCertifications() {
    const certs: any[] = [];

    if (hasGmat && !lockedGmat) {
      certs.push({
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
      });
    }

    if (hasGre && !lockedGre) {
      certs.push({
        type: 'GRE',
        levelOrVariant: 'GRE',
        score: null,
        percentiles: {
          verbal: gre.verbalScore || null,
          verbalPercentile: gre.verbalPercentile || null,
          quant: gre.quantScore || null,
          quantPercentile: gre.quantPercentile || null,
          writing: gre.writingScore || null,
          writingPercentile: gre.writingPercentile || null,
        },
        testDate: gre.testDate || null,
      });
    }

    for (const level of activeCfaLevels) {
      if (lockedCfaLevels.has(level)) {
        continue;
      }
      const d = cfaData[level] || emptyCfa();
      certs.push({
        type: 'CFA',
        levelOrVariant: level,
        score: d.score || null,
        percentiles: null,
        testDate: d.year ? `${d.year}-01-01` : null,
      });
    }

    return certs;
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (session?.user?.role === 'TUTOR') {
        const res = await fetch('/api/tutor/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            headline: profileData.headline,
            about: profileData.bio,
            languages: profileData.languages.split(',').map(l => l.trim()).filter(Boolean),
            education: profileData.education,
            certifications: buildCertifications(),
            videoUrl: profileData.videoUrl,
          }),
        });
        if (!res.ok) throw new Error('Failed to update tutor profile');
      }
      toast.success('Profile updated successfully!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Education helpers ──
  const addEducation = () => {
    if (!newEdu.institution || !newEdu.fieldOfStudy) { toast.error('Please fill in institution and field of study'); return; }
    setProfileData(prev => ({ ...prev, education: [...prev.education, { ...newEdu, id: `temp-${Date.now()}` }] }));
    setNewEdu({ degree: 'BACHELORS', fieldOfStudy: '', institution: '', graduationYear: new Date().getFullYear() });
    setShowAddEdu(false);
  };
  const removeEducation = (id: string) => setProfileData(prev => ({ ...prev, education: prev.education.filter((e: any) => e.id !== id) }));

  // ── CFA level toggle ──
  const toggleCfaLevel = (level: string) => {
    if (lockedCfaLevels.has(level)) {
      return;
    }

    setActiveCfaLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const handleNotificationToggle = async (notificationType: string, nextValue: boolean) => {
    setSavingNotificationType(notificationType);
    try {
      const response = await fetch('/api/student/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationType, emailEnabled: nextValue, inAppEnabled: nextValue }),
      });
      if (!response.ok) throw new Error();
      setNotificationPreferences(cur => ({ ...cur, [notificationType]: { emailEnabled: nextValue, inAppEnabled: nextValue } }));
    } catch {
      toast.error('Failed to update notification preference');
    } finally {
      setSavingNotificationType(null);
    }
  };

  const handleSaveStudentPreferences = async () => {
    setSavingStudentPreferences(true);
    try {
      const response = await fetch('/api/student/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentPreferences),
      });
      if (!response.ok) throw new Error();
      toast.success('Student preferences updated');
    } catch {
      toast.error('Failed to update student preferences');
    } finally {
      setSavingStudentPreferences(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('File must be under 2MB'); return; }
    
    setUploadingPhoto(true);
    try {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const userId = session?.user?.id || `temp_${Date.now()}`;
        const fileName = `${userId}-${Date.now()}.${fileExt}`;

        // Dynamic import supabase since it's a client component, or just use normal import at top.
        // I will need to make sure supabase is imported at the top.
        const { supabase } = await import('@/lib/supabase');

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { 
            upsert: true,
            contentType: file.type
          });

        if (uploadError) throw new Error(uploadError.message);

        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

        const res = await fetch('/api/user/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: publicUrl }),
        });
        if (!res.ok) throw new Error('Failed to update user profile');

        await update({ picture: publicUrl });
        toast.success('Photo updated successfully');
    } catch (err: any) {
        toast.error(err.message || 'Error uploading photo');
    } finally {
        setUploadingPhoto(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-200 dark:bg-navy-600 pt-24 md:pt-28 pb-16">
      <div className="page-container max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-navy-600 dark:text-cream-200">Settings</h1>
          <p className="text-navy-300 dark:text-cream-400/60 mt-1">Manage your account settings and preferences</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-64 space-y-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-gold-400 text-navy-600 shadow-gold' : 'text-navy-400 dark:text-cream-400 hover:bg-navy-50 dark:hover:bg-navy-500'}`}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </aside>

          <main className="flex-1">
            <div className="glass-card p-8">

              {/* ── PROFILE TAB ── */}
              {activeTab === 'profile' && (
                <form onSubmit={handleProfileUpdate} className="space-y-8">
                  <h2 className="text-xl font-bold text-navy-600 dark:text-cream-200 mb-6">
                    Public Profile {session?.user?.role === 'TUTOR' && '(Tutor)'}
                  </h2>

                  {/* Avatar */}
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-2xl bg-gold-400 flex items-center justify-center text-navy-600 text-3xl font-bold shadow-gold border-4 border-white dark:border-navy-500 overflow-hidden">
                      {session?.user?.image ? <img src={session.user.image} alt="" className="w-full h-full object-cover" /> : getInitials(session?.user?.name || '')}
                    </div>
                    <div className="space-y-2">
                      <input type="file" ref={photoInputRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} />
                      <button type="button" disabled={uploadingPhoto} onClick={() => photoInputRef.current?.click()} className="btn-primary py-2 px-4 text-xs">
                        {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
                      </button>
                      <p className="text-[11px] text-navy-300 dark:text-cream-400/60">JPG, GIF or PNG. Max size of 2MB.</p>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-navy-600 dark:text-cream-200">Display Name</label>
                    <input type="text" value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-cream-100 dark:bg-navy-500 border border-navy-100 dark:border-navy-400 text-navy-600 dark:text-cream-200 text-sm focus:ring-2 focus:ring-gold-400 outline-none" />
                  </div>

                  {session?.user?.role === 'TUTOR' && (
                    <>
                      {/* Headline */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-navy-600 dark:text-cream-200">Headline</label>
                        <input type="text" placeholder="e.g. Expert GMAT & GRE Tutor with 10+ years experience" value={profileData.headline}
                          onChange={e => setProfileData({ ...profileData, headline: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-cream-100 dark:bg-navy-500 border border-navy-100 dark:border-navy-400 text-navy-600 dark:text-cream-200 text-sm focus:ring-2 focus:ring-gold-400 outline-none" />
                      </div>

                      {/* Languages */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-navy-600 dark:text-cream-200">Languages (comma separated)</label>
                        <input type="text" value={profileData.languages} onChange={e => setProfileData({ ...profileData, languages: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-cream-100 dark:bg-navy-500 border border-navy-100 dark:border-navy-400 text-navy-600 dark:text-cream-200 text-sm focus:ring-2 focus:ring-gold-400 outline-none" />
                      </div>
                    </>
                  )}

                  {/* Bio */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-navy-600 dark:text-cream-200">Bio / About Me</label>
                    <textarea rows={4} value={profileData.bio} onChange={e => setProfileData({ ...profileData, bio: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-cream-100 dark:bg-navy-500 border border-navy-100 dark:border-navy-400 text-navy-600 dark:text-cream-200 text-sm focus:ring-2 focus:ring-gold-400 outline-none resize-none" />
                    <p className="text-xs text-navy-300 dark:text-cream-400/60">Professional summary shown on your public profile.</p>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-navy-600 dark:text-cream-200">Location</label>
                    <input type="text" value={profileData.location} onChange={e => setProfileData({ ...profileData, location: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-cream-100 dark:bg-navy-500 border border-navy-100 dark:border-navy-400 text-navy-600 dark:text-cream-200 text-sm focus:ring-2 focus:ring-gold-400 outline-none" />
                  </div>

                  {session?.user?.role === 'TUTOR' && (
                    <div className="space-y-4 pt-4 border-t border-navy-100 dark:border-navy-400/20">
                      <div>
                        <label className="text-[15px] font-bold text-navy-600 dark:text-cream-200">Intro Video</label>
                        <p className="text-[13px] text-navy-400 dark:text-cream-400/60 mt-1">Help students connect with you by sharing a short video introduction.</p>
                      </div>
                      <VideoUploader 
                        value={profileData.videoUrl || ''} 
                        onChange={(url) => setProfileData({ ...profileData, videoUrl: url })} 
                      />
                    </div>
                  )}

                  {/* ── EDUCATION (Tutor only) ── */}
                  {session?.user?.role === 'TUTOR' && (
                    <div className="space-y-4 pt-4 border-t border-navy-100 dark:border-navy-400/20">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-navy-600 dark:text-cream-200">Education</h3>
                        {!showAddEdu && (
                          <button type="button" onClick={() => setShowAddEdu(true)} className="text-xs font-bold text-gold-600 hover:text-gold-500 uppercase tracking-widest">+ Add Education</button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {profileData.education.map((edu: any) => (
                          <div key={edu.id} className="p-4 rounded-2xl bg-navy-50 dark:bg-navy-800/40 border border-navy-100 dark:border-navy-700 flex justify-between items-start">
                            <div>
                              <p className="font-bold text-navy-600 dark:text-cream-200">{edu.institution}</p>
                              <p className="text-sm text-navy-400 dark:text-cream-400/60">{edu.degree} in {edu.fieldOfStudy} • {edu.graduationYear}</p>
                            </div>
                            <button type="button" onClick={() => removeEducation(edu.id)} className="p-2 text-navy-300 hover:text-red-500 transition-colors">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      {showAddEdu && (
                        <div className="p-5 rounded-2xl border-2 border-dashed border-gold-400/30 bg-gold-50/5 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-navy-400 uppercase tracking-widest">Degree</label>
                              <select value={newEdu.degree} onChange={e => setNewEdu({ ...newEdu, degree: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-navy-700 border border-navy-100 dark:border-navy-600 text-sm">
                                {DEGREE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-navy-400 uppercase tracking-widest">Graduation Year</label>
                              <input type="number" value={newEdu.graduationYear} onChange={e => setNewEdu({ ...newEdu, graduationYear: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-navy-700 border border-navy-100 dark:border-navy-600 text-sm" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-navy-400 uppercase tracking-widest">Institution</label>
                            <input type="text" placeholder="e.g. Harvard University" value={newEdu.institution} onChange={e => setNewEdu({ ...newEdu, institution: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-navy-700 border border-navy-100 dark:border-navy-600 text-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-navy-400 uppercase tracking-widest">Field of Study</label>
                            <input type="text" placeholder="e.g. Economics" value={newEdu.fieldOfStudy} onChange={e => setNewEdu({ ...newEdu, fieldOfStudy: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-navy-700 border border-navy-100 dark:border-navy-600 text-sm" />
                          </div>
                          <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setShowAddEdu(false)} className="px-4 py-2 text-xs font-bold text-navy-400">Cancel</button>
                            <button type="button" onClick={addEducation} className="btn-primary py-2 px-6 text-xs">Add to List</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── CERTIFICATIONS & SCORES (Tutor only) ── */}
                  {session?.user?.role === 'TUTOR' && (
                    <div className="space-y-8 pt-8 border-t border-navy-100 dark:border-navy-400/20">
                      <div>
                        <h3 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">Certifications & Scores</h3>
                        <p className="text-sm text-navy-300 dark:text-cream-400/60 mt-1">Add your standardized test scores to boost your profile visibility.</p>
                        <p className="mt-3 rounded-2xl border border-gold-200 bg-gold-50/60 px-4 py-3 text-xs font-bold leading-relaxed text-gold-700 dark:border-gold-500/20 dark:bg-gold-500/10 dark:text-gold-300">
                          Certifications that are already submitted to admin or already verified are locked here to keep tutor settings from overwriting reviewed data. Use `Get Verified` on the tutor dashboard if you need to resubmit documents.
                        </p>
                      </div>

                      {/* ── GMAT Card ── */}
                      <div className="group rounded-[24px] border border-navy-100 dark:border-navy-400/10 bg-white dark:bg-navy-800/20 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                        <div
                          className={`px-6 py-5 flex items-center justify-between transition-colors ${
                            hasGmat ? 'bg-blue-600' : 'bg-blue-50 dark:bg-blue-900/10'
                          } ${lockedGmat ? 'cursor-not-allowed' : 'cursor-pointer'} ${!hasGmat && !lockedGmat ? 'hover:bg-blue-100/50' : ''}`}
                          onClick={() => {
                            if (!lockedGmat) setHasGmat(p => !p);
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${hasGmat ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600'}`}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                            </div>
                            <div>
                              <p className={`font-black text-sm uppercase tracking-widest ${hasGmat ? 'text-white' : 'text-navy-600 dark:text-cream-200'}`}>GMAT Exam</p>
                              <p className={`text-[10px] font-bold ${hasGmat ? 'text-blue-100' : 'text-navy-400'}`}>
                                {getCertificationLockLabel(gmatCertificationState?.status) || 'Full score & percentile breakdown'}
                              </p>
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${hasGmat ? 'bg-white border-white' : 'border-navy-200'}`}>
                            {hasGmat && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#2563eb" strokeWidth="3"><polyline points="2.5 6 5 8.5 9.5 3.5"/></svg>}
                          </div>
                        </div>

                        {hasGmat && (
                          <div className="p-8 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                              <ScoreRow title="Total" scoreKey="totalScore" pctKey="totalPercentile" data={gmat} setData={setGmat} isPrimary disabled={lockedGmat} />
                              <ScoreRow title="Quant" scoreKey="quantScore" pctKey="quantPercentile" data={gmat} setData={setGmat} disabled={lockedGmat} />
                              <ScoreRow title="Verbal" scoreKey="verbalScore" pctKey="verbalPercentile" data={gmat} setData={setGmat} disabled={lockedGmat} />
                              <ScoreRow title="Data Insights" scoreKey="dataInsightsScore" pctKey="dataInsightsPercentile" data={gmat} setData={setGmat} disabled={lockedGmat} />
                            </div>
                            <div className="pt-6 border-t border-navy-50 dark:border-navy-700/50">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black text-navy-400 uppercase tracking-[0.2em]">Test Date</label>
                                  <input type="date" value={gmat.testDate} onChange={e => setGmat(p => ({ ...p, testDate: e.target.value }))} disabled={lockedGmat}
                                    className={`block px-4 py-2.5 rounded-xl bg-navy-50 dark:bg-navy-700 border-none text-sm font-bold text-navy-600 dark:text-cream-200 outline-none w-full sm:w-48 ${lockedGmat ? 'cursor-not-allowed opacity-70' : 'focus:ring-2 focus:ring-blue-500'}`} />
                                </div>
                                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                  <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
                                    {lockedGmat ? 'This GMAT record is now managed by the verification workflow.' : 'Detailed scores help students find the best match'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── GRE Card ── */}
                      <div className="group rounded-[24px] border border-navy-100 dark:border-navy-400/10 bg-white dark:bg-navy-800/20 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                        <div
                          className={`px-6 py-5 flex items-center justify-between transition-colors ${
                            hasGre ? 'bg-emerald-600' : 'bg-emerald-50 dark:bg-emerald-900/10'
                          } ${lockedGre ? 'cursor-not-allowed' : 'cursor-pointer'} ${!hasGre && !lockedGre ? 'hover:bg-emerald-100/50' : ''}`}
                          onClick={() => {
                            if (!lockedGre) setHasGre(p => !p);
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${hasGre ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600'}`}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                            </div>
                            <div>
                              <p className={`font-black text-sm uppercase tracking-widest ${hasGre ? 'text-white' : 'text-navy-600 dark:text-cream-200'}`}>GRE General</p>
                              <p className={`text-[10px] font-bold ${hasGre ? 'text-emerald-100' : 'text-navy-400'}`}>
                                {getCertificationLockLabel(greCertificationState?.status) || 'Verbal, Quant & Analytical Writing'}
                              </p>
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${hasGre ? 'bg-white border-white' : 'border-navy-200'}`}>
                            {hasGre && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#059669" strokeWidth="3"><polyline points="2.5 6 5 8.5 9.5 3.5"/></svg>}
                          </div>
                        </div>

                        {hasGre && (
                          <div className="p-8 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                              <ScoreRow title="Verbal" scoreKey="verbalScore" pctKey="verbalPercentile" data={gre} setData={setGre} color="emerald" disabled={lockedGre} />
                              <ScoreRow title="Quant" scoreKey="quantScore" pctKey="quantPercentile" data={gre} setData={setGre} color="emerald" disabled={lockedGre} />
                              <ScoreRow title="Analytical Writing" scoreKey="writingScore" pctKey="writingPercentile" data={gre} setData={setGre} color="emerald" disabled={lockedGre} />
                            </div>
                            <div className="pt-6 border-t border-navy-50 dark:border-navy-700/50">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black text-navy-400 uppercase tracking-[0.2em]">Test Date</label>
                                  <input type="date" value={gre.testDate} onChange={e => setGre(p => ({ ...p, testDate: e.target.value }))} disabled={lockedGre}
                                    className={`block px-4 py-2.5 rounded-xl bg-navy-50 dark:bg-navy-700 border-none text-sm font-bold text-navy-600 dark:text-cream-200 outline-none w-full sm:w-48 ${lockedGre ? 'cursor-not-allowed opacity-70' : 'focus:ring-2 focus:ring-emerald-500'}`} />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── CFA Card ── */}
                      <div className="group rounded-[24px] border border-navy-100 dark:border-navy-400/10 bg-white dark:bg-navy-800/20 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="px-6 py-5 bg-amber-500 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
                            </div>
                            <div>
                              <p className="font-black text-sm uppercase tracking-widest text-white">CFA Program</p>
                              <p className="text-[10px] font-bold text-amber-100">
                                {lockedCfaLevels.size > 0 ? 'Verified or reviewed levels are locked here' : 'Select levels you have passed'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-8 space-y-8">
                          <div className="flex flex-wrap gap-4">
                            {CFA_LEVELS.map(level => (
                              <button key={level} type="button" onClick={() => toggleCfaLevel(level)} disabled={lockedCfaLevels.has(level)}
                                className={`px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all border-2 ${activeCfaLevels.includes(level)
                                  ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20 scale-105'
                                  : 'bg-white dark:bg-navy-700 border-navy-100 dark:border-navy-600 text-navy-400 hover:border-amber-400 dark:hover:border-amber-500'} ${lockedCfaLevels.has(level) ? 'cursor-not-allowed opacity-70 hover:border-navy-100 dark:hover:border-navy-600' : ''}`}>
                                {cfaLabel(level)}
                              </button>
                            ))}
                          </div>

                          <div className="space-y-6">
                            {activeCfaLevels.map(level => (
                              <div key={level} className="p-6 rounded-2xl bg-amber-50/50 dark:bg-amber-900/5 border border-amber-100 dark:border-amber-800/30 animate-in zoom-in-95 duration-200">
                                <p className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-4">{cfaLabel(level)} Details</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-navy-400 uppercase tracking-widest">Year Passed</label>
                                    <input type="number" placeholder="2024" value={cfaData[level]?.year || ''}
                                      onChange={e => setCfaData(p => ({ ...p, [level]: { ...p[level], year: e.target.value } }))}
                                      disabled={lockedCfaLevels.has(level)}
                                      className={`w-full px-4 py-2.5 rounded-xl bg-white dark:bg-navy-700 border border-navy-100 dark:border-navy-600 text-sm font-bold text-navy-600 dark:text-cream-200 outline-none ${lockedCfaLevels.has(level) ? 'cursor-not-allowed opacity-70' : 'focus:ring-2 focus:ring-amber-500'}`} />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-navy-400 uppercase tracking-widest">Score (Optional)</label>
                                    <input type="text" placeholder="e.g. Pass (>70%)" value={cfaData[level]?.score || ''}
                                      onChange={e => setCfaData(p => ({ ...p, [level]: { ...p[level], score: e.target.value } }))}
                                      disabled={lockedCfaLevels.has(level)}
                                      className={`w-full px-4 py-2.5 rounded-xl bg-white dark:bg-navy-700 border border-navy-100 dark:border-navy-600 text-sm font-bold text-navy-600 dark:text-cream-200 outline-none ${lockedCfaLevels.has(level) ? 'cursor-not-allowed opacity-70' : 'focus:ring-2 focus:ring-amber-500'}`} />
                                  </div>
                                </div>
                                {lockedCfaLevels.has(level) && (
                                  <p className="mt-4 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                                    {getCertificationLockLabel(certificationStatusMap[getCertificationKey('CFA', level)]?.status)}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-8 border-t border-navy-100 dark:border-navy-400/30 flex justify-end">
                    <button type="submit" disabled={isSaving} className="btn-primary py-3.5 px-10 disabled:opacity-50 flex items-center gap-3 text-sm font-black uppercase tracking-[0.15em] shadow-lg hover:scale-105 active:scale-95 transition-all">
                      {isSaving ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v13a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* ── ACCOUNT TAB ── */}
              {activeTab === 'account' && (
                <div className="space-y-8">
                  <h2 className="text-xl font-bold text-navy-600 dark:text-cream-200 mb-6">Account Settings</h2>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-navy-600 dark:text-cream-200">Email Address</label>
                      <div className="flex gap-3">
                        <input type="email" readOnly value={session?.user?.email || ''} className="flex-1 px-4 py-3 rounded-xl bg-navy-50 dark:bg-navy-600 border border-navy-100 dark:border-navy-400 text-navy-400 dark:text-cream-400/60 text-sm outline-none cursor-not-allowed" />
                        <button type="button" className="btn-outline py-2 px-4 whitespace-nowrap text-xs">Verify Email</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-navy-600 dark:text-cream-200">Account Role</label>
                      <div className="p-4 rounded-xl border border-gold-400/30 bg-gold-50/10 dark:bg-gold-900/10">
                        <p className="text-sm font-bold text-navy-600 dark:text-cream-200 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-gold-400" />{session?.user?.role || 'STUDENT'}
                        </p>
                      </div>
                    </div>
                    {session?.user?.role === 'STUDENT' && (
                      <div className="space-y-5 rounded-2xl border border-navy-100 dark:border-navy-400/20 p-5">
                        <div>
                          <label className="text-sm font-bold text-navy-600 dark:text-cream-200">Display Currency</label>
                          <p className="mt-1 text-xs text-navy-300 dark:text-cream-400/60">Tutor prices will be shown in this currency when conversion is available. Converted amounts are marked with `~`.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-navy-300 dark:text-cream-400/60">Currency</label>
                            <select value={studentPreferences.preferredCurrency}
                              onChange={e => setStudentPreferences(cur => ({ ...cur, preferredCurrency: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-cream-100 dark:bg-navy-500 border border-navy-100 dark:border-navy-400 text-navy-600 dark:text-cream-200 text-sm focus:ring-2 focus:ring-gold-400 outline-none">
                              {Object.keys(CURRENCY_META).map(code => <option key={code} value={code}>{code}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-navy-300 dark:text-cream-400/60">Timezone</label>
                            <input readOnly value={studentPreferences.timezone} className="w-full px-4 py-3 rounded-xl bg-navy-50 dark:bg-navy-600 border border-navy-100 dark:border-navy-400 text-navy-400 dark:text-cream-400/60 text-sm outline-none cursor-not-allowed" />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button type="button" onClick={() => void handleSaveStudentPreferences()} disabled={savingStudentPreferences} className="btn-primary py-2.5 px-6 disabled:opacity-50">
                            {savingStudentPreferences ? 'Saving...' : 'Save Currency Preference'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-8 border-t border-red-100 dark:border-red-900/30">
                    <h3 className="text-sm font-bold text-red-500 mb-2">Danger Zone</h3>
                    <p className="text-xs text-navy-300 dark:text-cream-400/60 mb-4">Permanently delete your account and all your data. This action cannot be undone.</p>
                    <button type="button" className="btn-outline border-red-200 text-red-500 hover:bg-red-50 dark:border-red-500/30 hover:text-red-600">Delete Account</button>
                  </div>
                </div>
              )}

              {/* ── NOTIFICATIONS TAB ── */}
              {activeTab === 'notifications' && (
                <div className="space-y-8">
                  <h2 className="text-xl font-bold text-navy-600 dark:text-cream-200 mb-6">Notification Preferences</h2>
                  <div className="space-y-6">
                    {notificationOptions.map(item => (
                      <div key={item.type} className="flex items-center justify-between gap-4 py-4 border-b border-navy-100 dark:border-navy-400/20 last:border-0">
                        <div>
                          <p className="text-sm font-bold text-navy-600 dark:text-cream-200">{item.title}</p>
                          <p className="text-xs text-navy-300 dark:text-cream-400/60 mt-0.5">{item.desc}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gold-600 mt-2">Email + in-app</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {savingNotificationType === item.type && <span className="text-[10px] font-bold uppercase tracking-widest text-navy-300 dark:text-cream-400/60">Saving</span>}
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={notificationPreferences[item.type]?.inAppEnabled ?? true}
                              onChange={e => handleNotificationToggle(item.type, e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-navy-200 peer-focus:outline-none dark:bg-navy-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gold-400"></div>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SECURITY TAB ── */}
              {activeTab === 'security' && (
                <div className="space-y-8">
                  <h2 className="text-xl font-bold text-navy-600 dark:text-cream-200 mb-6">Security & Password</h2>
                  <form className="space-y-6 max-w-md">
                    <PasswordInput label="Current Password" placeholder="••••••••" />
                    <PasswordInput label="New Password" placeholder="••••••••" />
                    <PasswordInput label="Confirm New Password" placeholder="••••••••" />
                    <button type="submit" className="btn-primary py-2.5 px-6">Update Password</button>
                  </form>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsPageInner />
    </Suspense>
  );
}
