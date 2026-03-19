'use client';

import { useState, useMemo, useEffect } from 'react';
import { formatDate, getInitials } from '@/lib/utils';
import { toast } from 'react-hot-toast';

function Badge({ value }: { value: string }) {
  const tone =
    value === 'APPROVED' || value === 'VERIFIED'
      ? 'bg-sage-50 text-sage-700 border-sage-200'
      : value === 'REJECTED' || value === 'FRAUD'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-gold-50 text-gold-700 border-gold-200';

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${tone}`}>
      {value.replaceAll('_', ' ')}
    </span>
  );
}

export function Verifications({ data, onRefresh }: { data: any; onRefresh: () => Promise<void> }) {
  const [activeTab, setActiveTab] = useState<'queue' | 'gmat'>('queue');
  const [selectedId, setSelectedId] = useState<string | null>(data.queue[0]?.id || null);
  const [selectedGmatId, setSelectedGmatId] = useState<string | null>(null);
  const [selectedCertId, setSelectedCertId] = useState<string | null>(null);
  const [gmatCreds, setGmatCreds] = useState<any>(null);
  const [checklist, setChecklist] = useState<Record<string, any>>({});
  const [certChecklist, setCertChecklist] = useState<Record<string, Record<string, boolean>>>({});

  const selected = useMemo(
    () => data.queue.find((a: any) => a.id === selectedId) ?? null,
    [data.queue, selectedId]
  );

  const selectedGmat = useMemo(
    () => data.gmatRequests.find((r: any) => r.id === selectedGmatId) ?? null,
    [data.gmatRequests, selectedGmatId]
  );

  const selectedCert = useMemo(
    () => selected?.certifications?.find((c: any) => c.id === selectedCertId) ?? null,
    [selected, selectedCertId]
  );

  const selectedCertGmatReview = selectedCert?.gmatVerification ?? null;
  const selectedGmatPortalVerified = Boolean(selectedGmat?.portalVerifiedAt);
  const selectedGmatDocumentReviewed = Boolean(selectedGmat?.documentReviewedAt);

  const fetchGmatCreds = async (requestId: string) => {
    try {
      const resp = await fetch(`/api/admin/gmat/${requestId}`);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error);
      setGmatCreds(json.credentials);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const updateCertification = async (certId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      const remarks = status === 'REJECTED' ? window.prompt('Reason for rejection:') : '';
      if (status === 'REJECTED' && remarks === null) return;
      
      const resp = await fetch(`/api/admin/certifications/${certId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, remarks })
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error);
      
      toast.success(json.message || `Certification ${status.toLowerCase()}!`);
      await onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const fetchGmatCredsForCert = async (certId: string) => {
    // This is optional if we want to show creds inline in the queue
    try {
      const resp = await fetch(`/api/admin/gmat/${certId}?byCertificationId=true`);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error);
      alert(`MBA.com Credentials:\nEmail: ${json.credentials.email}\nPassword: ${json.credentials.password}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  useEffect(() => {
    if (selectedGmatId) fetchGmatCreds(selectedGmatId);
    else setGmatCreds(null);
  }, [selectedGmatId]);

  const approveGmat = async (id: string) => {
    try {
      const resp = await fetch(`/api/admin/gmat/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Failed');
      toast.success(json.message || 'GMAT verification updated.');
      await onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const rejectGmat = async (id: string) => {
    const remarks = window.prompt('Reason for rejecting this GMAT verification:');
    if (!remarks) return;

    try {
      const resp = await fetch(`/api/admin/gmat/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', remarks }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Failed');
      toast.success(json.message || 'GMAT rejected.');
      await onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const approve = async () => {
    if (!selected) return;
    try {
      const resp = await fetch(`/api/admin/verifications/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'APPROVE', checklist }),
      });
      if (!resp.ok) throw new Error('Failed');
      toast.success('Approved.');
      await onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const reject = async () => {
    if (!selected) return;
    const reason = window.prompt('Rejection Reason');
    if (!reason) return;
    try {
      const resp = await fetch(`/api/admin/verifications/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'REJECT', notes: reason, checklist }),
      });
      if (!resp.ok) throw new Error('Failed');
      toast.success('Rejected.');
      await onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAppClick = (id: string) => {
    setSelectedId(id);
    setSelectedCertId(null);
  };

  const handleCertClick = (certId: string) => {
    setSelectedCertId(certId);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button 
          onClick={() => setActiveTab('queue')}
          className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${activeTab === 'queue' ? 'bg-gold-400 text-navy-600' : 'bg-white/70 text-navy-500'}`}
        >
          Application Queue
        </button>
        <button 
          onClick={() => setActiveTab('gmat')}
          className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${activeTab === 'gmat' ? 'bg-gold-400 text-navy-600' : 'bg-white/70 text-navy-500'}`}
        >
          GMAT Requests
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="glass-card p-6">
          <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">
            {activeTab === 'queue' ? 'Application queue' : 'GMAT requests'}
          </h2>
          <div className="mt-6 space-y-3">
            {activeTab === 'queue' ? (
              data.queue.map((app: any) => (
                <button
                  key={app.id}
                  onClick={() => handleAppClick(app.id)}
                  className={`w-full rounded-3xl border p-4 text-left transition-all ${
                    selectedId === app.id
                      ? 'border-gold-400 bg-gold-400/10'
                      : 'border-navy-100 bg-white/70 hover:bg-white dark:border-navy-500/40 dark:bg-navy-600/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-navy-100 text-xs font-black text-navy-500">
                      {getInitials(app.name)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{app.name}</div>
                      <div className="text-[10px] text-navy-300 uppercase tracking-widest">{app.subjects.join(', ')}</div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              data.gmatRequests.map((req: any) => (
                <button
                  key={req.id}
                  onClick={() => setSelectedGmatId(req.id)}
                  className={`w-full rounded-3xl border p-4 text-left transition-all ${
                    selectedGmatId === req.id
                      ? 'border-gold-400 bg-gold-400/10'
                      : 'border-navy-100 bg-white/70 hover:bg-white dark:border-navy-500/40 dark:bg-navy-600/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-navy-100 text-xs font-black text-navy-500">
                      G
                    </div>
                    <div>
                      <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{req.tutorName}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge value={req.status} />
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                          req.documentReviewedAt ? 'bg-sage-50 text-sage-700' : 'bg-navy-100 text-navy-400'
                        }`}>
                          Doc {req.documentReviewedAt ? 'done' : 'pending'}
                        </span>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                          req.portalVerifiedAt ? 'bg-sage-50 text-sage-700' : 'bg-navy-100 text-navy-400'
                        }`}>
                          MBA {req.portalVerifiedAt ? 'done' : 'pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
            {((activeTab === 'queue' && data.queue.length === 0) || (activeTab === 'gmat' && data.gmatRequests.length === 0)) && (
              <div className="py-10 text-center text-sm text-navy-300">Queue is empty.</div>
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          {activeTab === 'queue' ? (
            selected ? (
              <div className="space-y-8">
                <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Reviewing {selected.name}</h2>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-navy-400">Certifications</h3>
                    {selected.certifications?.map((cert: any) => (
                      <button 
                        key={cert.id} 
                        onClick={() => handleCertClick(cert.id)}
                        className={`w-full text-left rounded-3xl p-4 transition-all ${selectedCertId === cert.id ? 'bg-gold-400/10 border-2 border-gold-400' : 'bg-navy-50/80 dark:bg-navy-700/20 border-2 border-transparent'}`}
                      >
                        <div className="flex justify-between">
                          <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{cert.type}</div>
                          <Badge value={cert.status} />
                        </div>
                        <div className="mt-2 text-xs text-navy-400">Score: {cert.score} | Date: {formatDate(cert.testDate)}</div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-6">
                    {selectedCert ? (
                      <div className="space-y-4 p-6 rounded-3xl bg-gold-400/5 border border-gold-400">
                        <div className="flex justify-between items-center">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-700">Reviewing: {selectedCert.type}</h3>
                          <button onClick={() => setSelectedCertId(null)} className="text-[10px] font-bold text-navy-400 hover:text-navy-600">CLOSE</button>
                        </div>
                        
                        <div className="flex gap-4 p-4 rounded-2xl bg-white/50 border border-gold-100">
                          {selectedCert.fileUrl ? (
                            <a href={selectedCert.fileUrl} target="_blank" rel="noreferrer" className="btn-outline py-2 px-4 text-[10px] font-black flex items-center gap-2">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                              View Document
                            </a>
                          ) : selectedCert.type === 'GMAT' ? (
                            <button onClick={() => fetchGmatCredsForCert(selectedCert.id)} className="btn-outline border-blue-200 text-blue-700 py-2 px-4 text-[10px] font-black flex items-center gap-2">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                              MBA.com Credentials
                            </button>
                          ) : (
                            <span className="text-xs italic text-navy-300">No document/credentials</span>
                          )}
                        </div>

                        <div className="space-y-3">
                          {['Document Authentic', 'Score Matches Claims', 'Date In Range'].map((check) => (
                            <label key={check} className="flex items-center gap-3 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={certChecklist[selectedCert.id]?.[check] || false}
                                onChange={(e) => setCertChecklist(p => ({
                                  ...p,
                                  [selectedCert.id]: { ...(p[selectedCert.id] || {}), [check]: e.target.checked }
                                }))}
                                className="h-5 w-5 rounded-md border-gold-400 text-gold-600" 
                              />
                              <span className="text-sm font-bold text-navy-600 dark:text-cream-200">{check}</span>
                            </label>
                          ))}
                        </div>

                        {selectedCert.type === 'GMAT' && (
                          <div className="rounded-2xl border border-gold-200 bg-white/70 p-4 text-xs text-navy-500">
                            <div className="flex flex-wrap gap-2">
                              <span className={`rounded-full px-2 py-1 font-black uppercase tracking-[0.16em] ${
                                selectedCertGmatReview?.documentReviewedAt ? 'bg-sage-50 text-sage-700' : 'bg-navy-100 text-navy-400'
                              }`}>
                                Document {selectedCertGmatReview?.documentReviewedAt ? 'verified' : 'pending'}
                              </span>
                              <span className={`rounded-full px-2 py-1 font-black uppercase tracking-[0.16em] ${
                                selectedCertGmatReview?.portalVerifiedAt ? 'bg-sage-50 text-sage-700' : 'bg-navy-100 text-navy-400'
                              }`}>
                                MBA.com {selectedCertGmatReview?.portalVerifiedAt ? 'verified' : 'pending'}
                              </span>
                            </div>
                            <p className="mt-3 leading-relaxed">
                              GMAT only becomes fully verified after both the uploaded document review and the MBA.com credential review are completed.
                            </p>
                          </div>
                        )}

                        <div className="pt-4 flex gap-2">
                          <button 
                            onClick={() => updateCertification(selectedCert.id, 'VERIFIED')}
                            disabled={!certChecklist[selectedCert.id]?.['Document Authentic']}
                            className="flex-1 rounded-2xl bg-navy-600 py-3 text-sm font-bold text-white disabled:opacity-50"
                          >
                            {selectedCert.type === 'GMAT'
                              ? selectedCertGmatReview?.portalVerifiedAt
                                ? 'Complete GMAT Verification'
                                : 'Verify GMAT Document'
                              : `Verify ${selectedCert.type}`}
                          </button>
                          <button 
                            onClick={() => updateCertification(selectedCert.id, 'REJECTED')}
                            className="flex-1 rounded-2xl border-2 border-red-500 py-3 text-sm font-bold text-red-500"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 p-6 rounded-3xl bg-gold-400/5 border border-gold-200">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-700">Tutor Verification</h3>
                        <div className="p-4 rounded-2xl bg-white/50 border border-gold-100 text-xs text-navy-400 leading-relaxed">
                          Click an individual certification on the left to review its documents and verify it separately. Approve the overall profile only after verifying key credentials.
                        </div>
                        <div className="pt-4 flex gap-2">
                          <button onClick={approve} className="flex-1 rounded-2xl bg-navy-600 py-3 text-sm font-bold text-white">Approve Profile</button>
                          <button onClick={reject} className="flex-1 rounded-2xl border-2 border-red-500 py-3 text-sm font-bold text-red-500">Reject Profile</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-sm text-navy-300 italic">Select an application from the queue to start review.</div>
            )
          ) : (
            selectedGmat ? (
              <div className="space-y-8">
                <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">GMAT Verification: {selectedGmat.tutorName}</h2>
                <div className="rounded-[28px] bg-navy-900 p-8 text-cream-200">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-400">Decrypted Credentials</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                      selectedGmatDocumentReviewed ? 'bg-sage-50 text-sage-700' : 'bg-white/10 text-cream-300'
                    }`}>
                      Document {selectedGmatDocumentReviewed ? 'verified' : 'pending'}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                      selectedGmatPortalVerified ? 'bg-sage-50 text-sage-700' : 'bg-white/10 text-cream-300'
                    }`}>
                      MBA.com {selectedGmatPortalVerified ? 'verified' : 'pending'}
                    </span>
                  </div>
                  {gmatCreds ? (
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                      <div className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-5">
                        <div className="text-xs text-navy-300">GMAT Username / Email</div>
                        <div className="mt-2 break-all font-mono text-sm font-bold leading-6 text-cream-100 sm:text-base">
                          {gmatCreds.email}
                        </div>
                      </div>
                      <div className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-5">
                        <div className="text-xs text-navy-300">GMAT Password</div>
                        <div className="mt-2 break-all font-mono text-sm font-bold leading-6 text-cream-100 sm:text-base">
                          {gmatCreds.password}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 flex items-center gap-3 text-gold-400">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" />
                      Decrypting credentials...
                    </div>
                  )}
                </div>

                <div className="glass-card p-6 border-gold-200 bg-gold-400/5">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gold-700">Verification Steps</h3>
                  <p className="mt-2 text-sm text-navy-400">Login to the official GMAT portal using the credentials above and verify the score reported in the profile certifications. This is only one half of the process; the uploaded GMAT document must also be reviewed in the application queue.</p>
                  <div className="mt-4 rounded-2xl border border-gold-200 bg-white/70 p-4 text-xs text-navy-500">
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-2 py-1 font-black uppercase tracking-[0.16em] ${
                        selectedGmatDocumentReviewed ? 'bg-sage-50 text-sage-700' : 'bg-navy-100 text-navy-400'
                      }`}>
                        Document {selectedGmatDocumentReviewed ? 'done' : 'pending'}
                      </span>
                      <span className={`rounded-full px-2 py-1 font-black uppercase tracking-[0.16em] ${
                        selectedGmatPortalVerified ? 'bg-sage-50 text-sage-700' : 'bg-navy-100 text-navy-400'
                      }`}>
                        MBA.com {selectedGmatPortalVerified ? 'done' : 'pending'}
                      </span>
                    </div>
                    <p className="mt-3 leading-relaxed">
                      GMAT becomes fully verified only when both badges above are completed.
                    </p>
                  </div>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button 
                      onClick={() => approveGmat(selectedGmat.id)}
                      className="flex-1 rounded-2xl bg-navy-600 py-4 text-sm font-bold text-white shadow-lg shadow-navy-600/20"
                    >
                      {selectedGmatDocumentReviewed ? 'Complete GMAT Verification' : 'Verify MBA.com Only'}
                    </button>
                    <button
                      onClick={() => rejectGmat(selectedGmat.id)}
                      className="flex-1 rounded-2xl border-2 border-red-500 py-4 text-sm font-bold text-red-500"
                    >
                      Fraud / Reject GMAT
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-sm text-navy-300 italic">Select a GMAT request to view encrypted credentials.</div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
