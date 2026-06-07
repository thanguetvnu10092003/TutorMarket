'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SUBJECT_LABELS, type Subject } from '@/types';
import { getCountryOptions } from '@/lib/intl-data';
import { X } from '@/components/ui/icons';

interface TutorFilterBarProps {
  filters: {
    subject: string;
    minPrice: number | '';
    maxPrice: number | '';
    language: string;
    country: string;
    availability: string;
    nativeSpeaker: boolean;
    category: string;
    sortBy: string;
    search: string;
  };
  onFilterChange: (key: string, value: any) => void;
  onResetFilters: () => void;
  totalResults: number;
}

/* ─── Static data ─────────────────────────────────────── */

const subjects = [
  { value: '', label: 'All Subjects', icon: null },
  { value: 'GMAT',      label: 'GMAT',       icon: '📊' },
  { value: 'GRE',       label: 'GRE',        icon: '📝' },
  { value: 'CFA_LEVEL_1', label: 'CFA I',    icon: '📈' },
  { value: 'CFA_LEVEL_2', label: 'CFA II',   icon: '📈' },
  { value: 'CFA_LEVEL_3', label: 'CFA III',  icon: '📈' },
];

const priceOptions = [
  { value: '',     label: 'Any price' },
  { value: '0-20', label: 'Under $20' },
  { value: '20-40', label: '$20 – $40' },
  { value: '40-60', label: '$40 – $60' },
  { value: '60+',  label: '$60+' },
];

const availabilityOptions = [
  { value: '',            label: 'Any time' },
  { value: 'NEXT_7_DAYS', label: 'Next 7 days' },
  { value: 'MORNING',    label: 'Morning' },
  { value: 'AFTERNOON',  label: 'Afternoon' },
  { value: 'EVENING',    label: 'Evening' },
];

const languageOptions = [
  'Arabic','Bengali','Cantonese','Czech','Danish','Dutch','English','Finnish',
  'French','German','Greek','Hebrew','Hindi','Hungarian','Indonesian','Italian',
  'Japanese','Korean','Malay','Mandarin','Norwegian','Polish','Portuguese',
  'Romanian','Russian','Spanish','Swahili','Swedish','Tagalog','Thai',
  'Turkish','Urdu','Vietnamese',
];

const countryOptions = getCountryOptions();

function getPriceFilterValue(minPrice: number | '', maxPrice: number | '') {
  if (minPrice === '' && maxPrice === '') return '';
  if (minPrice === 60 && maxPrice === '') return '60+';
  return `${minPrice || 0}-${maxPrice || ''}`;
}

/* ─── Sub-components ─────────────────────────────────── */

/** Floating-label select wrapper */
function FilterSelect({
  label,
  value,
  onChange,
  children,
  icon,
  highlighted,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  highlighted?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || value !== '';

  return (
    <div
      className={`relative group transition-all duration-200 ${
        highlighted ? '' : ''
      }`}
    >
      {/* Icon */}
      {icon && (
        <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none transition-colors duration-200
          ${active || highlighted ? 'text-gold-500' : 'text-navy-300 dark:text-cream-400/30 group-hover:text-navy-400'}`}>
          {icon}
        </div>
      )}

      {/* Floating label */}
      <label
        className={`absolute z-10 font-bold pointer-events-none transition-all duration-200 select-none
          ${icon ? 'left-10' : 'left-3.5'}
          ${active
            ? 'top-2 text-[10px] tracking-widest uppercase text-gold-500/80'
            : 'top-1/2 -translate-y-1/2 text-sm text-navy-300 dark:text-cream-400/40 group-hover:text-navy-400'
          }`}
      >
        {label}
      </label>

      {/* Select */}
      <select
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`w-full appearance-none cursor-pointer rounded-2xl
          ${active ? 'pt-6 pb-2' : 'py-4'}
          ${icon ? 'pl-10' : 'pl-3.5'} pr-9
          text-sm font-bold
          text-navy-600 dark:text-cream-200
          outline-none
          border-2 transition-all duration-200
          ${focused
            ? 'border-gold-400 shadow-[0_0_0_3px_rgba(201,168,76,0.15)] bg-white dark:bg-navy-600'
            : highlighted
              ? 'border-gold-300/60 dark:border-gold-500/20 bg-gold-50/60 dark:bg-navy-700/80 hover:border-gold-400/70 hover:bg-gold-50 dark:hover:bg-navy-700'
              : 'border-navy-100/70 dark:border-navy-500/25 bg-white dark:bg-navy-700 hover:border-navy-200 dark:hover:border-navy-400/40 hover:bg-navy-50/30'
          }`}
      >
        {children}
      </select>

      {/* Caret */}
      <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200
        ${focused ? 'text-gold-400 rotate-180' : 'text-navy-300/50 dark:text-cream-400/30'}`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
    </div>
  );
}

/** Active filter chip */
function FilterChip({
  label,
  onRemove,
  index,
}: {
  label: string;
  onRemove: () => void;
  index: number;
}) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = () => {
    setRemoving(true);
    setTimeout(onRemove, 200);
  };

  return (
    <button
      onClick={handleRemove}
      aria-label={`Remove ${label} filter`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
        bg-gold-50 dark:bg-gold-900/25
        border border-gold-200/60 dark:border-gold-500/20
        text-gold-700 dark:text-gold-300
        text-xs font-semibold
        hover:bg-gold-100 dark:hover:bg-gold-900/40
        hover:border-gold-300 dark:hover:border-gold-400/40
        hover:shadow-[0_2px_8px_rgba(201,168,76,0.15)]
        active:scale-95
        transition-all duration-200 group"
      style={{
        opacity: removing ? 0 : 1,
        transform: removing ? 'scale(0.8)' : `scale(1)`,
        transition: `opacity 0.2s ease, transform 0.2s ease, opacity 0.4s ease ${index * 0.04}s`,
        animation: `fadeChipIn 0.3s cubic-bezier(0.4,0,0.2,1) ${index * 0.04}s both`,
      }}
    >
      <span>{label}</span>
      <span className="w-3.5 h-3.5 rounded-full bg-gold-200/60 dark:bg-gold-500/20 flex items-center justify-center
        group-hover:bg-gold-300/60 dark:group-hover:bg-gold-400/30 transition-colors duration-150">
        <X size={8} />
      </span>
    </button>
  );
}

/* ─── Main Component ─────────────────────────────────── */

export default function TutorFilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  totalResults,
}: TutorFilterBarProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const hasActiveFilters =
    filters.subject !== '' ||
    filters.minPrice !== '' ||
    filters.maxPrice !== '' ||
    filters.language !== '' ||
    filters.country !== '' ||
    filters.availability !== '' ||
    filters.nativeSpeaker ||
    filters.category !== '' ||
    filters.search !== '';

  const priceValue = getPriceFilterValue(filters.minPrice, filters.maxPrice);

  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (filters.subject) activeChips.push({
    label: subjects.find(s => s.value === filters.subject)?.label || filters.subject,
    onRemove: () => onFilterChange('subject', ''),
  });
  if (filters.minPrice !== '' || filters.maxPrice !== '') activeChips.push({
    label: priceOptions.find(p => p.value === priceValue)?.label || priceValue,
    onRemove: () => { onFilterChange('minPrice', ''); onFilterChange('maxPrice', ''); },
  });
  if (filters.language) activeChips.push({
    label: filters.language,
    onRemove: () => onFilterChange('language', ''),
  });
  if (filters.country) activeChips.push({
    label: countryOptions.find(c => c.code === filters.country)?.name || filters.country,
    onRemove: () => onFilterChange('country', ''),
  });
  if (filters.availability) activeChips.push({
    label: availabilityOptions.find(a => a.value === filters.availability)?.label || filters.availability,
    onRemove: () => onFilterChange('availability', ''),
  });
  if (filters.nativeSpeaker) activeChips.push({
    label: 'Native speaker',
    onRemove: () => onFilterChange('nativeSpeaker', false),
  });
  if (filters.search) activeChips.push({
    label: `"${filters.search}"`,
    onRemove: () => onFilterChange('search', ''),
  });

  return (
    <>
      {/* Chip animation keyframe (injected once) */}
      <style>{`
        @keyframes fadeChipIn {
          from { opacity: 0; transform: scale(0.75) translateY(4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div
        className="w-full space-y-3 mb-8"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(-12px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        {/* ── Glass filter panel ── */}
        <div className="relative rounded-2xl border border-navy-100/60 dark:border-navy-500/25
          bg-white/90 dark:bg-navy-700/80
          backdrop-blur-md
          shadow-[0_4px_24px_rgba(10,22,40,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]
          overflow-hidden
          transition-shadow duration-300
          hover:shadow-[0_8px_32px_rgba(10,22,40,0.09)] dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]">

          {/* Subtle top gold accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" />

          <div className="p-4">
            {/* ── Row 1: Main dropdowns ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

              {/* Subject */}
              <FilterSelect
                label="I want to learn"
                value={filters.subject}
                onChange={e => onFilterChange('subject', e.target.value)}
                highlighted
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                }
              >
                {subjects.map(s => (
                  <option key={s.value} value={s.value}>{s.icon ? `${s.icon} ${s.label}` : s.label}</option>
                ))}
              </FilterSelect>

              {/* Price */}
              <FilterSelect
                label="Price per session"
                value={priceValue}
                onChange={e => {
                  if (e.target.value === '60+') {
                    onFilterChange('minPrice', 60);
                    onFilterChange('maxPrice', '');
                    return;
                  }
                  const [min, max] = e.target.value.split('-');
                  onFilterChange('minPrice', min ? Number(min) : '');
                  onFilterChange('maxPrice', max ? Number(max) : '');
                }}
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                }
              >
                {priceOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </FilterSelect>

              {/* Country */}
              <FilterSelect
                label="Country"
                value={filters.country}
                onChange={e => onFilterChange('country', e.target.value)}
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                }
              >
                <option value="">Any country</option>
                {countryOptions.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </FilterSelect>

              {/* Availability */}
              <FilterSelect
                label="I'm available"
                value={filters.availability}
                onChange={e => onFilterChange('availability', e.target.value)}
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                }
              >
                {availabilityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </FilterSelect>
            </div>

            {/* ── Divider ── */}
            <div className="my-3 h-px bg-gradient-to-r from-transparent via-navy-100/60 dark:via-navy-500/20 to-transparent" />

            {/* ── Row 2: Secondary filters + search + sort ── */}
            <div className="flex flex-wrap items-center gap-2.5">

              {/* Language pill-select */}
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-navy-300/60 dark:text-cream-400/30 group-hover:text-navy-400 transition-colors duration-200">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20"/>
                  </svg>
                </div>
                <select
                  value={filters.language}
                  onChange={e => onFilterChange('language', e.target.value)}
                  className={`appearance-none cursor-pointer rounded-xl py-2 pl-8 pr-7
                    text-xs font-bold outline-none
                    border-2 transition-all duration-200
                    ${filters.language
                      ? 'bg-gold-50 dark:bg-gold-900/20 border-gold-300/60 dark:border-gold-500/20 text-gold-700 dark:text-gold-300'
                      : 'bg-white dark:bg-navy-700 border-navy-100/70 dark:border-navy-500/25 text-navy-400 dark:text-cream-400/60 hover:border-navy-200 dark:hover:border-navy-400/40'
                    }
                    focus:border-gold-400 focus:shadow-[0_0_0_3px_rgba(201,168,76,0.12)]`}
                >
                  <option value="">Language</option>
                  {languageOptions.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <div className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none
                  ${filters.language ? 'text-gold-400' : 'text-navy-300/40 dark:text-cream-400/25'}`}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
              </div>

              {/* Native speaker toggle */}
              <button
                onClick={() => onFilterChange('nativeSpeaker', !filters.nativeSpeaker)}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold
                  border-2 transition-all duration-250 select-none
                  ${filters.nativeSpeaker
                    ? 'bg-navy-600 border-navy-600 text-white shadow-[0_2px_10px_rgba(10,22,40,0.25)] scale-[1.02]'
                    : 'bg-white dark:bg-navy-700 border-navy-100/70 dark:border-navy-500/25 text-navy-400 dark:text-cream-400/60 hover:border-navy-300 dark:hover:border-navy-400/40 hover:text-navy-600 dark:hover:text-cream-200'
                  }
                  active:scale-95`}
              >
                {/* Toggle dot */}
                <span className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 flex-shrink-0
                  ${filters.nativeSpeaker
                    ? 'bg-gold-400 border-gold-300 shadow-[0_0_6px_rgba(201,168,76,0.5)]'
                    : 'bg-transparent border-navy-200 dark:border-navy-400'
                  }`}
                />
                Native speaker
              </button>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Sort */}
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-navy-300/50 dark:text-cream-400/30 group-hover:text-navy-400 transition-colors duration-200">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"/>
                    <line x1="8" y1="12" x2="21" y2="12"/>
                    <line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="6" x2="3.01" y2="6"/>
                    <line x1="3" y1="12" x2="3.01" y2="12"/>
                    <line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                </div>
                <select
                  value={filters.sortBy}
                  onChange={e => onFilterChange('sortBy', e.target.value)}
                  className="appearance-none cursor-pointer rounded-xl py-2 pl-8 pr-8
                    text-xs font-bold outline-none
                    bg-white dark:bg-navy-700
                    border-2 border-navy-100/70 dark:border-navy-500/25
                    text-navy-600 dark:text-cream-200
                    hover:border-navy-200 dark:hover:border-navy-400/40
                    focus:border-gold-400 focus:shadow-[0_0_0_3px_rgba(201,168,76,0.12)]
                    transition-all duration-200"
                >
                  <option value="default">Top picks</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="experience">Most Experienced</option>
                  <option value="sessions">Most Lessons</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-navy-300/40 dark:text-cream-400/25">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
              </div>

              {/* Search */}
              <div className={`relative transition-all duration-300 ${searchFocused ? 'w-72' : 'w-56'}`}>
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200
                  ${searchFocused || filters.search ? 'text-gold-500' : 'text-navy-300/50 dark:text-cream-400/30'}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <input
                  ref={searchRef}
                  type="text"
                  value={filters.search}
                  onChange={e => onFilterChange('search', e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Search tutors…"
                  className={`w-full rounded-xl py-2 pl-9 pr-8 text-xs font-bold outline-none
                    bg-white dark:bg-navy-700
                    border-2 transition-all duration-200
                    text-navy-600 dark:text-cream-200 placeholder:text-navy-200 dark:placeholder:text-cream-400/30
                    ${searchFocused
                      ? 'border-gold-400 shadow-[0_0_0_3px_rgba(201,168,76,0.12)]'
                      : 'border-navy-100/70 dark:border-navy-500/25 hover:border-navy-200 dark:hover:border-navy-400/40'
                    }`}
                />
                {filters.search && (
                  <button
                    onClick={() => { onFilterChange('search', ''); searchRef.current?.focus(); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full
                      bg-navy-100 dark:bg-navy-500 hover:bg-navy-200 dark:hover:bg-navy-400
                      flex items-center justify-center text-navy-400 dark:text-cream-400/60
                      transition-all duration-150 hover:scale-110"
                    aria-label="Clear search"
                  >
                    <X size={8} />
                  </button>
                )}
              </div>

              {/* Clear button */}
              {hasActiveFilters && (
                <button
                  onClick={onResetFilters}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                    text-red-400 dark:text-red-400/80
                    border-2 border-red-100 dark:border-red-500/20
                    bg-white dark:bg-navy-700
                    hover:bg-red-50 dark:hover:bg-red-500/10
                    hover:border-red-200 dark:hover:border-red-400/30
                    hover:text-red-500
                    active:scale-95
                    transition-all duration-200"
                  style={{ animation: 'fadeChipIn 0.25s ease both' }}
                >
                  <X size={11} />
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Active chips row ── */}
        {hasActiveFilters && (
          <div
            className="flex flex-wrap items-center gap-2 px-1"
            style={{ animation: 'fadeChipIn 0.3s ease both' }}
          >
            <span className="label-xs text-navy-300 dark:text-cream-400/35 self-center flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              Filters:
            </span>

            {activeChips.map((chip, i) => (
              <FilterChip key={chip.label} label={chip.label} onRemove={chip.onRemove} index={i} />
            ))}

            <button
              onClick={onResetFilters}
              className="ml-auto label-xs text-navy-300 dark:text-cream-400/40
                hover:text-red-400 dark:hover:text-red-400/80
                transition-colors duration-200"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Results headline ── */}
        <div className="flex items-center gap-3 px-1 pt-1">
          <h2 className="text-2xl font-display font-black text-navy-600 dark:text-cream-200">
            <span
              className="text-gold-500 tabular-nums"
              style={{ transition: 'color 0.3s ease' }}
            >
              {totalResults.toLocaleString()}
            </span>
            {' '}
            {filters.subject
              ? SUBJECT_LABELS[filters.subject as Subject]
              : 'Tutors'} available
          </h2>

          {/* Live indicator */}
          <span className="flex items-center gap-1.5 text-xs text-navy-300/60 dark:text-cream-400/35 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-pulse-soft" />
            Live
          </span>
        </div>
      </div>
    </>
  );
}
