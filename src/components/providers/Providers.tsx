'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './ThemeProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: '16px',
              background: '#0A1628',
              color: '#F5F0E8',
              border: '1px solid rgba(30,58,110,0.4)',
              boxShadow: '0 8px 32px rgba(10,22,40,0.3)',
              fontSize: '14px',
              fontWeight: '500',
            },
            success: {
              iconTheme: { primary: '#C9A84C', secondary: '#0A1628' },
              style: {
                border: '1px solid rgba(201,168,76,0.3)',
              },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#0A1628' },
              style: {
                border: '1px solid rgba(239,68,68,0.3)',
              },
            },
          }}
        />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
