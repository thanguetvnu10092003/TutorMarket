'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getCountryOptions } from '@/lib/intl-data';

const COUNTRIES = [
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
];

const LANGUAGES = [
  'English', 'Vietnamese', 'Mandarin Chinese', 'Spanish', 'French',
  'German', 'Japanese', 'Korean', 'Portuguese', 'Arabic', 'Hindi',
  'Russian', 'Italian', 'Dutch', 'Thai', 'Indonesian', 'Malay',
];

const PROFICIENCIES = [
  { value: 'NATIVE', label: 'Native' },
  { value: 'FLUENT', label: 'Fluent' },
  { value: 'CONVERSATIONAL', label: 'Conversational' },
  { value: 'BASIC', label: 'Basic' },
];

const SUBJECTS = [
  { value: 'CFA_LEVEL_1', label: 'CFA Level 1' },
  { value: 'CFA_LEVEL_2', label: 'CFA Level 2' },
  { value: 'CFA_LEVEL_3', label: 'CFA Level 3' },
  { value: 'GMAT', label: 'GMAT' },
  { value: 'GRE', label: 'GRE' },
];

interface Props { onNext: () => void; }

export default function Step1About({ onNext }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryList, setShowCountryList] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    countryOfBirth: '',
    countryFlag: '',
    subjects: [] as string[],
    languages: [{ language: 'English', proficiency: 'NATIVE' }] as { language: string; proficiency: string }[],
    phoneNumber: '',
    confirmed: false,
  });

  useEffect(() => {
    fetch('/api/onboarding/step/1')
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          const c = COUNTRIES.find(c => c.name === d.data.countryOfBirth);
          setForm(f => ({
            ...f,
            ...d.data,
            countryFlag: c?.flag || '',
            languages: d.data.languages?.length > 0 ? d.data.languages : [{ language: 'English', proficiency: 'NATIVE' }],
          }));
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const toggleSubject = (value: string) => {
    setForm(f => ({
      ...f,
      subjects: f.subjects.includes(value)
        ? f.subjects.filter(s => s !== value)
        : [...f.subjects, value],
    }));
  };

  const updateLanguage = (index: number, field: string, value: string) => {
    setForm(f => {
      const langs = [...f.languages];
      langs[index] = { ...langs[index], [field]: value };
      return { ...f, languages: langs };
    });
  };

  const addLanguage = () => {
    if (form.languages.length >= 5) return;
    setForm(f => ({ ...f, languages: [...f.languages, { language: 'Spanish', proficiency: 'CONVERSATIONAL' }] }));
  };

  const removeLanguage = (index: number) => {
    if (form.languages.length <= 1) return;
    setForm(f => ({ ...f, languages: f.languages.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim()) return toast.error('First name is required');
    if (!form.lastName.trim()) return toast.error('Last name is required');
    if (!form.countryOfBirth) return toast.error('Country of birth is required');
    if (form.subjects.length === 0) return toast.error('Select at least one subject');
    if (form.languages.length === 0) return toast.error('Add at least one language');
    if (!form.phoneNumber.trim()) return toast.error('Phone number is required');
    if (!form.confirmed) return toast.error('Please confirm the information is accurate');

    setIsSaving(true);
    try {
      const res = await fetch('/api/onboarding/step/1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          countryOfBirth: form.countryOfBirth,
          subjects: form.subjects,
          languages: form.languages,
          phoneNumber: form.phoneNumber,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Step 1 saved!');
      onNext();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="glass-card p-8 text-center text-navy-400">Loading...</div>;

  return (
    <div className="glass-card p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">About You</h2>
        <p className="text-navy-400 dark:text-cream-400/60 mt-1">Tell us the basics about yourself to get started.</p>
      </div>

      {/* Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-bold text-navy-500 dark:text-cream-300">First Name <span className="text-red-400">*</span></label>
          <input className="input-field w-full" placeholder="e.g. Alex" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-bold text-navy-500 dark:text-cream-300">Last Name <span className="text-red-400">*</span></label>
          <input className="input-field w-full" placeholder="e.g. Johnson" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <label className="block text-sm font-bold text-navy-500 dark:text-cream-300">Email Address</label>
        <input className="input-field w-full opacity-60 cursor-not-allowed" value={form.email} readOnly />
        <p className="text-xs text-navy-300 dark:text-cream-400/40">Your email cannot be changed here.</p>
      </div>

      {/* Country of Birth */}
      <div className="space-y-2 relative">
        <label className="block text-sm font-bold text-navy-500 dark:text-cream-300">Country of Birth <span className="text-red-400">*</span></label>
        <div className="relative">
          <button
            type="button"
            className="input-field w-full text-left flex items-center gap-3"
            onClick={() => setShowCountryList(!showCountryList)}
          >
            <span className="text-xl">{form.countryFlag || '🌍'}</span>
            <span className={form.countryOfBirth ? '' : 'text-navy-300 dark:text-cream-400/30'}>
              {form.countryOfBirth || 'Select country...'}
            </span>
          </button>
          {showCountryList && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-navy-600 border border-navy-100 dark:border-navy-400/30 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-3 border-b border-navy-100 dark:border-navy-500">
                <input
                  className="input-field w-full text-sm"
                  placeholder="Search country..."
                  value={countrySearch}
                  onChange={e => setCountrySearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="max-h-52 overflow-y-auto">
                {filteredCountries.map(c => (
                  <button
                    key={c.code}
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cream-100 dark:hover:bg-navy-500 text-left transition-colors"
                    onClick={() => {
                      setForm(f => ({ ...f, countryOfBirth: c.name, countryFlag: c.flag }));
                      setShowCountryList(false);
                      setCountrySearch('');
                    }}
                  >
                    <span className="text-xl">{c.flag}</span>
                    <span className="text-navy-600 dark:text-cream-200">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subjects */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-navy-500 dark:text-cream-300">Subjects You Teach <span className="text-red-400">*</span></label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {SUBJECTS.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => toggleSubject(s.value)}
              className={`p-3 rounded-2xl border-2 font-bold text-sm transition-all duration-200 ${
                form.subjects.includes(s.value)
                  ? 'border-gold-400 bg-gold-400/10 text-gold-500 dark:text-gold-300'
                  : 'border-navy-100 dark:border-navy-400/30 text-navy-400 dark:text-cream-400/60 hover:border-gold-300'
              }`}
            >
              {form.subjects.includes(s.value) && <span className="mr-1">✓</span>}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-navy-500 dark:text-cream-300">Languages You Speak <span className="text-red-400">*</span></label>
        <div className="space-y-3">
          {form.languages.map((lang, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <select
                className="input-field flex-1"
                value={lang.language}
                onChange={e => updateLanguage(idx, 'language', e.target.value)}
              >
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select
                className="input-field w-44"
                value={lang.proficiency}
                onChange={e => updateLanguage(idx, 'proficiency', e.target.value)}
              >
                {PROFICIENCIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              {form.languages.length > 1 && (
                <button type="button" onClick={() => removeLanguage(idx)} className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/20 text-red-500 flex items-center justify-center hover:bg-red-200 transition-colors flex-shrink-0">×</button>
              )}
            </div>
          ))}
        </div>
        {form.languages.length < 5 && (
          <button type="button" onClick={addLanguage} className="text-sm font-bold text-gold-500 hover:text-gold-400 transition-colors flex items-center gap-1">
            <span className="text-lg">+</span> Add another language
          </button>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <label className="block text-sm font-bold text-navy-500 dark:text-cream-300">Phone Number <span className="text-red-400">*</span></label>
        <input className="input-field w-full" placeholder="+84 xxx xxx xxx" value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} />
      </div>

      {/* Confirm */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <div
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
            form.confirmed ? 'bg-sage-500 border-sage-500' : 'border-navy-200 dark:border-navy-400'
          }`}
          onClick={() => setForm(f => ({ ...f, confirmed: !f.confirmed }))}
        >
          {form.confirmed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
        </div>
        <span className="text-sm text-navy-500 dark:text-cream-300 group-hover:text-navy-600 dark:group-hover:text-cream-200 transition-colors">
          I confirm that the information above is accurate and up to date.
        </span>
      </label>

      {/* Actions */}
      <div className="flex justify-end pt-4 border-t border-navy-100 dark:border-navy-400/20">
        <button onClick={handleSubmit} disabled={isSaving} className="btn-primary px-8 py-3 rounded-2xl font-bold flex items-center gap-2">
          {isSaving ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Saving...</>
          ) : (
            <>Save and continue <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg></>
          )}
        </button>
      </div>
    </div>
  );
}
