'use client';

import React from 'react';
import { SUBJECT_LABELS, type Subject } from '@/types';
import { getCountryOptions } from '@/lib/intl-data';

interface TutorFilterBarProps {
  filters: {
    subject: string;
    minPrice: number | '';
    maxPrice: number | '';
    language: string;
    country: string;
    availability: string;
    specialty: string;
    nativeSpeaker: boolean;
    category: string;
    sortBy: string;
    search: string;
  };
  onFilterChange: (key: string, value: any) => void;
  onResetFilters: () => void;
  totalResults: number;
}

const subjects = [
  { value: '', label: 'All Subjects' },
  { value: 'GMAT', label: 'GMAT' },
  { value: 'GRE', label: 'GRE' },
  { value: 'CFA_LEVEL_1', label: 'CFA Level I' },
  { value: 'CFA_LEVEL_2', label: 'CFA Level II' },
  { value: 'CFA_LEVEL_3', label: 'CFA Level III' },
];

const priceOptions = [
  { value: '', label: 'Any price' },
  { value: '0-20', label: '$0 - $20' },
  { value: '20-40', label: '$20 - $40' },
  { value: '40-60', label: '$40 - $60' },
  { value: '60+', label: '$60+' },
];

const availabilityOptions = [
  { value: '', label: 'Any time' },
  { value: 'NEXT_7_DAYS', label: 'Next 7 days' },
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'EVENING', label: 'Evening' },
];

const specialtyOptions = [
  'Test Strategy',
  'Quantitative Reasoning',
  'Verbal Reasoning',
  'Essay Coaching',
  'Integrated Reasoning',
  'Ethics',
  'Portfolio Management',
  'Mock Interviews',
];

const languageOptions = [
  'English',
  'Vietnamese',
  'Mandarin',
  'Cantonese',
  'Korean',
  'Japanese',
  'Thai',
  'Hindi',
  'French',
  'German',
  'Spanish',
];

const countryOptions = getCountryOptions();

function getPriceFilterValue(minPrice: number | '', maxPrice: number | '') {
  if (minPrice === '' && maxPrice === '') {
    return '';
  }

  if (minPrice === 60 && maxPrice === '') {
    return '60+';
  }

  return `${minPrice || 0}-${maxPrice || ''}`;
}

export default function TutorFilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  totalResults,
}: TutorFilterBarProps) {
  const hasActiveFilters =
    filters.subject !== '' ||
    filters.minPrice !== '' ||
    filters.maxPrice !== '' ||
    filters.language !== '' ||
    filters.country !== '' ||
    filters.availability !== '' ||
    filters.specialty !== '' ||
    filters.nativeSpeaker ||
    filters.search !== '';

  const priceValue = getPriceFilterValue(filters.minPrice, filters.maxPrice);

  return (
    <div className="w-full space-y-4 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative group">
          <label className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40 absolute left-10 top-2 z-10">
            I want to learn
          </label>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gold-500 z-10 pointer-events-none">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <select
            value={filters.subject}
            onChange={(event) => onFilterChange('subject', event.target.value)}
            className="w-full bg-gold-50/50 dark:bg-navy-800 border-2 border-gold-200/50 dark:border-gold-500/10 rounded-2xl pt-6 pb-2 pl-12 pr-4 text-sm font-black text-navy-600 dark:text-cream-200 outline-none focus:border-gold-400 transition-all appearance-none cursor-pointer shadow-sm group-hover:bg-gold-50 dark:group-hover:bg-navy-700"
          >
            {subjects.map((subject) => (
              <option key={subject.value} value={subject.value}>
                {subject.label}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        <div className="relative">
          <label className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40 absolute left-4 top-2 z-10">
            Price per lesson
          </label>
          <select
            value={priceValue}
            onChange={(event) => {
              if (event.target.value === '60+') {
                onFilterChange('minPrice', 60);
                onFilterChange('maxPrice', '');
                return;
              }

              const [min, max] = event.target.value.split('-');
              onFilterChange('minPrice', min ? Number(min) : '');
              onFilterChange('maxPrice', max ? Number(max) : '');
            }}
            className="w-full bg-white dark:bg-navy-700 border border-navy-100 dark:border-navy-500/20 rounded-2xl pt-6 pb-2 px-4 text-sm font-bold text-navy-600 dark:text-cream-200 outline-none focus:border-gold-400 transition-all appearance-none cursor-pointer shadow-sm"
          >
            {priceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        <div className="relative">
          <label className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40 absolute left-4 top-2 z-10">
            Country
          </label>
          <select
            value={filters.country}
            onChange={(event) => onFilterChange('country', event.target.value)}
            className="w-full bg-white dark:bg-navy-700 border border-navy-100 dark:border-navy-500/20 rounded-2xl pt-6 pb-2 px-4 text-sm font-bold text-navy-600 dark:text-cream-200 outline-none focus:border-gold-400 transition-all appearance-none cursor-pointer shadow-sm"
          >
            <option value="">Any country</option>
            {countryOptions.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        <div className="relative">
          <label className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40 absolute left-4 top-2 z-10">
            I&apos;m available
          </label>
          <select
            value={filters.availability}
            onChange={(event) => onFilterChange('availability', event.target.value)}
            className="w-full bg-white dark:bg-navy-700 border border-navy-100 dark:border-navy-500/20 rounded-2xl pt-6 pb-2 px-4 text-sm font-bold text-navy-600 dark:text-cream-200 outline-none focus:border-gold-400 transition-all appearance-none cursor-pointer shadow-sm"
          >
            {availabilityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={filters.specialty}
              onChange={(event) => onFilterChange('specialty', event.target.value)}
              className="bg-white dark:bg-navy-700 border border-navy-100 dark:border-navy-500/20 rounded-xl py-2 pl-4 pr-8 text-[10px] font-black uppercase tracking-widest text-navy-400 hover:border-navy-200 transition-all appearance-none cursor-pointer shadow-sm"
            >
              <option value="">Specialties</option>
              {specialtyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>

          <div className="relative">
            <select
              value={filters.language}
              onChange={(event) => onFilterChange('language', event.target.value)}
              className="bg-white dark:bg-navy-700 border border-navy-100 dark:border-navy-500/20 rounded-xl py-2 pl-4 pr-8 text-[10px] font-black uppercase tracking-widest text-navy-400 hover:border-navy-200 transition-all appearance-none cursor-pointer shadow-sm"
            >
              <option value="">Also speaks</option>
              {languageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>

          <button
            onClick={() => onFilterChange('nativeSpeaker', !filters.nativeSpeaker)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
              filters.nativeSpeaker
                ? 'bg-navy-600 border-navy-600 text-white'
                : 'bg-white dark:bg-navy-700 border-navy-100 dark:border-navy-500/20 text-navy-400 hover:border-navy-200'
            }`}
          >
            Native speaker
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
          <div className="relative">
            <select
              value={filters.sortBy}
              onChange={(event) => onFilterChange('sortBy', event.target.value)}
              className="bg-white dark:bg-navy-700 border border-navy-100 dark:border-navy-500/20 rounded-xl py-2 pl-4 pr-10 text-[10px] font-black uppercase tracking-widest text-navy-600 dark:text-cream-200 hover:border-navy-200 transition-all appearance-none cursor-pointer shadow-sm"
            >
              <option value="default">Sort by: Our top picks</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="experience">Most Experienced</option>
              <option value="sessions">Most Lessons</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>

          <div className="relative w-64">
            <input
              type="text"
              value={filters.search}
              onChange={(event) => onFilterChange('search', event.target.value)}
              placeholder="Search by name or keyword"
              className="w-full bg-white dark:bg-navy-700 border border-navy-100 dark:border-navy-500/20 rounded-xl py-2 pl-10 pr-4 text-[10px] font-bold text-navy-600 dark:text-cream-200 outline-none focus:border-gold-400 transition-all shadow-sm"
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-30">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all border border-red-100 dark:border-red-500/20"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Clear all filters
          </button>
        )}
      </div>

      <div className="pt-4">
        <h2 className="text-2xl font-display font-black text-navy-600 dark:text-cream-200">
          <span className="text-gold-500">{totalResults.toLocaleString()}</span>{' '}
          {filters.subject ? SUBJECT_LABELS[filters.subject as Subject] : 'Tutors'} available
        </h2>
      </div>
    </div>
  );
}
