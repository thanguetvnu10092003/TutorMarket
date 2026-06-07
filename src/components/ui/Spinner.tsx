'use client';

import { Loader2 } from '@/components/ui/icons';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  return <Loader2 className={[sizeClass, 'animate-spin', className].filter(Boolean).join(' ')} />;
}
