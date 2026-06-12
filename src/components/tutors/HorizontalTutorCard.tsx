'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { SUBJECT_LABELS, type Subject } from '@/types';
import { formatCurrency, getInitials } from '@/lib/utils';
import { Star, Clock, Check, Heart, Globe, TrendingUp, BookOpen } from '@/components/ui/icons';
import { useCurrency } from '@/contexts/CurrencyContext';

interface HorizontalTutorCardProps {
  tutor: any;
  onBookTrial: (tutorId: string) => void;
  onSendMessage: (tutorId: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (tutorId: string) => void;
}

function formatNextAvailable(nextDate: Date | null | string | undefined): string {
  if (!nextDate) return 'No upcoming slots';
  const date = typeof nextDate === 'string' ? new Date(nextDate) : nextDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.getTime() <= today.getTime()) return 'Available today';
  if (date.getTime() <= tomorrow.getTime()) return 'Available tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getPricingSummary(tutor: any) {
  if (!Array.isArray(tutor.pricingOptions) || tutor.pricingOptions.length === 0) {
    return tutor.primaryPrice?.formatted || 'Contact for pricing';
  }

  return tutor.pricingOptions
    .slice(0, 3)
    .map((option: any) => `${option.durationMinutes}m ${option.priceDisplay?.formatted || ''}`.trim())
    .join(' • ');
}

export default function HorizontalTutorCard({
  tutor,
  onBookTrial,
  onSendMessage,
  isFavorite = false,
  onToggleFavorite,
}: HorizontalTutorCardProps) {
  const router = useRouter();
  const { format } = useCurrency();

  const handleFavoriteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onToggleFavorite?.(tutor.id);
  };

  const handleProfileClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    router.push(`/tutors/${tutor.id}`);
  };

  const languagesText =
    tutor.languages && tutor.languages.length > 0
      ? `Speaks ${tutor.languages.join(', ')}`
      : 'Speaks English';

  const verifiedResults = tutor.verifiedResults || [];
  const primarySubject =
    tutor.verifiedCertifications?.[0] || tutor.specializations?.[0] || 'Tutor';
  const priceLabel = tutor.primaryPrice?.formatted || (tutor.primaryPrice?.amount != null ? format(tutor.primaryPrice.amount) : 'Contact for pricing');
  const pricingSummary = getPricingSummary(tutor);

  return (
    <div className="group relative glass-card bg-white dark:bg-navy-700/50 p-6 hover:shadow-2xl transition-all duration-500 border border-navy-100/50 dark:border-navy-500/10 rounded-[32px] overflow-hidden flex flex-col lg:flex-row gap-8">
      <div className="relative flex-shrink-0 cursor-pointer" onClick={handleProfileClick}>
        <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-[24px] overflow-hidden bg-gold-50 dark:bg-navy-600 ring-4 ring-white dark:ring-navy-800 shadow-lg group-hover:scale-105 transition-transform duration-500">
          {tutor.user?.avatarUrl ? (
            <img src={tutor.user.avatarUrl} alt={tutor.user.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-black text-navy-400">
              {getInitials(tutor.user?.name || '')}
            </div>
          )}
        </div>
        {tutor.nextAvailableDate != null && (
          <div className="absolute -bottom-1 -right-1 px-2.5 py-1 rounded-full bg-green-500 border-4 border-white dark:border-navy-800 shadow-md z-10 label-xs text-white">
            Open
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h3
            className="text-xl lg:text-2xl font-body font-black text-navy-600 dark:text-cream-200 tracking-tight cursor-pointer hover:text-gold-500 transition-colors line-clamp-1 break-words"
            onClick={handleProfileClick}
          >
            {tutor.user?.name}
          </h3>

          {tutor.verificationStatus === 'APPROVED' && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 dark:bg-blue-400/10 rounded-full border border-blue-500/20">
              <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                <Check size={8} color="white" strokeWidth={4} />
              </div>
              <span className="label-xs text-blue-600 dark:text-blue-400">
                Verified tutor
              </span>
            </div>
          )}

          {tutor.countryFlag && (
            <span className="text-lg" title={tutor.country}>
              {tutor.countryFlag}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mb-4 text-xs font-bold">
          <div className="flex items-center gap-2 text-navy-400 dark:text-cream-400/40">
            <BookOpen size={14} strokeWidth={2.5} />
            <span>{SUBJECT_LABELS[primarySubject as Subject] || primarySubject}</span>
          </div>
          <div className="flex items-center gap-2 text-navy-400 dark:text-cream-400/40 min-w-0">
            <Globe size={14} strokeWidth={2.5} className="flex-shrink-0" />
            <span className="truncate break-words">{languagesText}</span>
          </div>
        </div>

        {verifiedResults.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {verifiedResults.slice(0, 3).map((result: any) => (
              <div
                key={result.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
                  result.isVerified
                    ? 'bg-sage-50 dark:bg-sage-500/10 border-sage-200/70 dark:border-sage-500/20'
                    : 'bg-blue-50 dark:bg-blue-400/10 border-blue-200/70 dark:border-blue-400/20'
                }`}
              >
                <span className={`label-xs ${
                  result.isVerified ? 'text-sage-700 dark:text-sage-300' : 'text-blue-700 dark:text-blue-300'
                }`}>
                  {result.scoreText}
                </span>
                {result.detailText && (
                  <span className={`text-[10px] font-bold ${
                    result.isVerified ? 'text-sage-600/80 dark:text-sage-200/70' : 'text-blue-600/80 dark:text-blue-400/70'
                  }`}>
                    {result.detailText}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-navy-400 dark:text-cream-400/60 leading-relaxed mb-4 line-clamp-3 break-words">
          {tutor.bio || tutor.about || 'No introduction provided.'}
          <button onClick={handleProfileClick} className="ml-2 text-gold-500 font-black hover:underline focus:outline-none">
            Learn more
          </button>
        </p>

        <div className="mt-auto flex items-center gap-3 label-xs text-navy-300 dark:text-cream-400/40">
          <TrendingUp size={14} strokeWidth={3} />
          <span>
            {(tutor.totalSessions || 0) > 50 ? 'Highly experienced' : 'Building experience'} • Booked {tutor.totalSessions || 0} times{tutor.totalHoursTaught ? ` • ${tutor.totalHoursTaught}h taught` : ''}
          </span>
        </div>
      </div>

      <div className="w-full lg:w-60 flex flex-col border-t lg:border-t-0 lg:border-l border-navy-100/50 dark:border-navy-500/10 pt-6 lg:pt-0 lg:pl-8">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div className="min-w-0">
            <div className="text-3xl font-display font-black text-navy-600 dark:text-cream-200 leading-none break-words">
              {priceLabel}
            </div>
            <div className="label-xs text-navy-300 dark:text-cream-400/40 mt-2">
              {tutor.primaryPrice?.usesConversion ? tutor.primaryPrice.originalFormatted : pricingSummary}
            </div>
            {tutor.primaryPrice?.usesConversion && (
              <div className="text-[10px] font-bold text-navy-400 dark:text-cream-400/50 mt-1">
                Original: {tutor.primaryPrice.originalFormatted}
              </div>
            )}
          </div>
          <button
            onClick={handleFavoriteClick}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm group/heart ${
              isFavorite ? 'bg-red-50 text-red-500' : 'bg-navy-50 dark:bg-navy-800 text-navy-300 hover:text-red-500'
            }`}
          >
            <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={2.5} className="group-hover/heart:fill-red-500 transition-all" />
          </button>
        </div>

        <div className="mb-6 rounded-2xl bg-navy-50/50 dark:bg-navy-800/50 border border-navy-100/60 dark:border-navy-500/20 p-5">
          <p className="label-xs text-navy-300 dark:text-cream-400/40 mb-3">
            Lesson Options
          </p>
          <div className="flex flex-wrap gap-2.5">
            {(tutor.pricingOptions || tutor.pricing)?.filter((p: any) => p.isEnabled !== false).sort((a: any, b: any) => a.durationMinutes - b.durationMinutes).map((p: any) => (
              <div
                key={p.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-navy-700 border border-navy-100 dark:border-navy-500/20 rounded-xl transition-all hover:border-gold-400 hover:shadow-lg group/price"
              >
                <div className="w-6 h-6 rounded-lg bg-gold-50 dark:bg-gold-500/10 flex items-center justify-center text-gold-600 group-hover/price:bg-gold-400 group-hover/price:text-navy-600 transition-colors">
                  <Clock size={12} strokeWidth={3} />
                </div>
                <div className="flex flex-col -space-y-0.5">
                  <span className="label-xs text-navy-600 dark:text-cream-200">{p.durationMinutes}m</span>
                  <span className="text-xs font-black text-gold-600 dark:text-gold-400">{p.priceDisplay?.formatted || (p.price != null ? format(p.price) : formatCurrency(p.price, p.currency || 'USD'))}</span>
                </div>
              </div>
            ))}
            {(!(tutor.pricingOptions || tutor.pricing) || (tutor.pricingOptions || tutor.pricing).filter((p: any) => p.isEnabled !== false).length === 0) && (
              <p className="text-xs text-navy-300 dark:text-cream-400/60 font-medium">Standard rates apply.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 lg:grid-cols-1 gap-4 mb-8">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm font-black text-navy-600 dark:text-cream-200">
                {tutor.rating?.toFixed(1) || '0.0'}
              </span>
              <Star size={12} fill="currentColor" className="text-gold-400" />
            </div>
            <span className="label-xs text-navy-300 dark:text-cream-400/40">
              {tutor.totalReviews || 0} reviews
            </span>
          </div>
          <div className="flex flex-col">
            <div className="text-sm font-black text-navy-600 dark:text-cream-200 mb-1">
              {tutor.totalStudents || 0}
            </div>
            <span className="label-xs text-navy-300 dark:text-cream-400/40">
              students
            </span>
          </div>
          <div className="flex flex-col">
            <div className="text-[10px] font-black text-navy-600 dark:text-cream-200 mb-1 truncate leading-tight">
              {formatNextAvailable(tutor.nextAvailableDate)}
            </div>
            <span className="label-xs text-navy-300 dark:text-cream-400/40">
              next available
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-auto">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onBookTrial(tutor.id);
            }}
            className="w-full py-4 rounded-2xl label-sm transition-all bg-gold-400 hover:bg-gold-500 text-navy-600 shadow-gold hover:translate-y-[-2px] active:translate-y-0"
          >
            Book lesson options
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onSendMessage(tutor.id);
            }}
            className="w-full bg-white dark:bg-navy-800 border-2 border-navy-100 dark:border-navy-500/20 text-navy-600 dark:text-cream-200 py-4 rounded-2xl label-sm transition-all hover:bg-navy-50 dark:hover:bg-navy-700"
          >
            Send message
          </button>
        </div>
      </div>
    </div>
  );
}
