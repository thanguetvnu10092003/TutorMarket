'use client';

import Link from 'next/link';

interface Certification {
  id: string;
  type: string;
  levelOrVariant: string | null;
  status: 'NONE' | 'SELF_REPORTED' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  verifiedAt?: string;
  notes?: string;
}

export default function CertificationStatus({ certifications }: { certifications: Certification[] }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sage-500/10 text-sage-600 text-[10px] font-bold border border-sage-500/20">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
            Verified
          </span>
        );
      case 'PENDING_VERIFICATION':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-400/10 text-gold-600 text-[10px] font-bold border border-gold-400/20">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Under Review
          </span>
        );
      case 'REJECTED':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 text-[10px] font-bold border border-red-500/20">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Rejected
          </span>
        );
      case 'SELF_REPORTED':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy-100 dark:bg-navy-500 text-navy-400 dark:text-cream-400/60 text-[10px] font-bold border border-navy-200 dark:border-navy-400/20">
            Self-reported
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy-50 dark:bg-navy-700 text-navy-300 text-[10px] font-bold">
            Not added
          </span>
        );
    }
  };

  const allTypes = ['CFA', 'GMAT', 'GRE'];

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200 mb-6 uppercase tracking-wider">Certification Status</h3>
      
      <div className="space-y-4">
        {allTypes.map(type => {
          const cert = certifications.find(c => c.type === type);
          const status = cert?.status || 'NONE';
          
          return (
            <div key={type} className="group">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-navy-600/50 border border-navy-100 dark:border-navy-400/10 hover:border-gold-400/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                    status === 'VERIFIED' ? 'bg-sage-500 text-white' : 'bg-navy-50 dark:bg-navy-700 text-navy-300'
                  }`}>
                    {type[0]}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-navy-600 dark:text-cream-200">{type}</h4>
                    {cert?.levelOrVariant && <p className="text-[10px] text-navy-300 font-medium">{cert.levelOrVariant}</p>}
                    {status === 'VERIFIED' && cert?.verifiedAt && (
                        <p className="text-[9px] text-sage-600 font-bold mt-0.5 tracking-tighter uppercase">Verified on {new Date(cert.verifiedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(status)}
                  {status === 'SELF_REPORTED' && (
                    <Link href="/dashboard/tutor/verify" className="text-[9px] font-black text-gold-500 hover:text-gold-600 uppercase tracking-widest underline decoration-2 underline-offset-4">
                      Upload Proof
                    </Link>
                  )}
                  {status === 'REJECTED' && (
                    <Link href="/dashboard/tutor/verify" className="text-[9px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest underline decoration-2 underline-offset-4">
                      Re-submit
                    </Link>
                  )}
                  {status === 'NONE' && (
                    <Link href="/dashboard/tutor/verify" className="text-[9px] font-black text-navy-300 hover:text-gold-400 uppercase tracking-widest underline decoration-2 underline-offset-4">
                      Add Certification
                    </Link>
                  )}
                </div>
              </div>
              
              {status === 'REJECTED' && cert?.notes && (
                <div className="mt-2 ml-4 p-3 rounded-xl bg-red-500/5 border-l-2 border-red-500">
                  <p className="text-[10px] text-red-600 font-black uppercase tracking-tighter mb-0.5">Note from Admin:</p>
                  <p className="text-xs text-navy-500 dark:text-cream-400/70 italic">&quot;{cert.notes}&quot;</p>
                </div>
              )}
            </div>
          );
        })}


      </div>

      <div className="mt-6 pt-6 border-t border-navy-100 dark:border-navy-500/50 flex flex-col items-center">
        <p className="text-[10px] text-navy-400 dark:text-cream-400/60 font-medium mb-3 text-center">
          Have other relevant certifications like TESOL or IELTS?
        </p>
        <Link href="/dashboard/tutor/verify" className="flex items-center justify-center gap-2 text-[10px] font-bold text-gold-500 hover:text-gold-600 transition-colors uppercase tracking-widest bg-gold-400/10 hover:bg-gold-400/20 px-6 py-2.5 rounded-full border border-gold-400/20">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Upload Other Documents
        </Link>
      </div>
    </div>
  );
}
