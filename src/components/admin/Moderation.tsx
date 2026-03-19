'use client';

import { useState, useMemo } from 'react';
import { formatDate, formatRelativeTime, getInitials } from '@/lib/utils';
import { toast } from 'react-hot-toast';

function Badge({ value }: { value: string }) {
  const tone =
    value === 'ACTIVE' || value === 'APPROVED' || value === 'VERIFIED' || value === 'STUDENT' || value === 'VERIFIED_TUTOR'
      ? 'bg-sage-50 text-sage-700 border-sage-200'
      : value === 'PENDING' || value === 'OPEN' || value === 'UNDER_REVIEW' || value === 'UNVERIFIED_TUTOR'
        ? 'bg-gold-50 text-gold-700 border-gold-200'
        : value === 'DISMISSED' || value === 'RESOLVED'
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-red-50 text-red-700 border-red-200';

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${tone}`}>
      {value.replaceAll('_', ' ')}
    </span>
  );
}

export function Moderation({ data, onRefresh }: { data: any; onRefresh: () => Promise<void> }) {
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(data.users[0]?.id || null);

  const filteredUsers = useMemo(() => {
    return data.users.filter((item: any) => {
      const matchesRole = roleFilter === 'ALL' || item.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const query = `${item.name} ${item.email}`.toLowerCase();
      const matchesSearch = !search || query.includes(search.toLowerCase());
      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [data.users, roleFilter, search, statusFilter]);

  const selectedUser = useMemo(
    () => data.users.find((item: any) => item.id === selectedUserId) ?? null,
    [data.users, selectedUserId]
  );

  const runAction = async (path: string, body: any, success: string) => {
    try {
      const resp = await fetch(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error('Action failed');
      toast.success(success);
      await onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const warnUser = (userId: string) => {
    const reason = window.prompt('Enter warning reason');
    if (!reason) return;
    void runAction(`/api/admin/users/${userId}`, { action: 'SEND_WARNING', reason }, 'Warning recorded.');
  };

  const suspendUser = (userId: string) => {
    const suggested = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    const until = window.prompt('Suspend until (YYYY-MM-DDTHH:mm)', suggested);
    if (!until) return;
    const reason = window.prompt('Reason') || 'Admin suspension';
    void runAction(`/api/admin/users/${userId}`, { action: 'SUSPEND', suspendedUntil: until, reason }, 'User suspended.');
  };

  const banUser = (userId: string) => {
    const reason = window.prompt('Permanent ban reason');
    if (!reason) return;
    void runAction(`/api/admin/users/${userId}`, { action: 'PERMANENT_BAN', reason }, 'User banned.');
  };

  const unbanUser = (userId: string) => {
    if (!window.confirm('Restore this user account?')) return;
    void runAction(`/api/admin/users/${userId}`, { action: 'SUSPEND', suspendedUntil: null, reason: 'Admin unban' }, 'User restored.');
  };

  const deleteUser = async (userId: string) => {
    if (!window.confirm('CRITICAL: Are you sure you want to PERMANENTLY DELETE this user? This action cannot be undone.')) return;
    try {
      const resp = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error('Delete failed');
      toast.success('User deleted.');
      setSelectedUserId(null);
      await onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const flagAction = (flagId: string, action: string) => {
    const note = window.prompt('Admin note') || '';
    void runAction(`/api/admin/flags/${flagId}`, { action, note }, 'Flag processed.');
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="glass-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">User list</h2>
            <div className="flex flex-wrap gap-2">
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-xl border border-navy-100 bg-white px-3 py-2 text-xs font-bold dark:border-navy-500/40 dark:bg-navy-600/30">
                <option value="ALL">All Roles</option>
                <option value="STUDENT">Student</option>
                <option value="TUTOR">Tutor</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-navy-100 bg-white px-3 py-2 text-xs font-bold dark:border-navy-500/40 dark:bg-navy-600/30">
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="BANNED">Banned</option>
              </select>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="rounded-xl border border-navy-100 bg-white px-3 py-2 text-xs dark:border-navy-500/40 dark:bg-navy-600/30" />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-navy-100 text-[10px] font-black uppercase tracking-[0.16em] text-navy-300 dark:border-navy-500/40">
                  <th className="px-3 py-3 text-left">User</th>
                  <th className="px-3 py-3 text-left">Role</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-left">Strikes</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user: any) => (
                  <tr key={user.id} className={`border-b border-navy-100/70 last:border-0 dark:border-navy-500/20 ${selectedUserId === user.id ? 'bg-gold-400/10' : ''}`}>
                    <td className="px-3 py-4">
                      <button onClick={() => setSelectedUserId(user.id)} className="flex items-center gap-3 text-left">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-navy-100 text-xs font-black text-navy-500 dark:bg-navy-500/40 dark:text-cream-200">
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{user.name}</div>
                          <div className="text-[11px] text-navy-300 dark:text-cream-400/40">{user.email}</div>
                        </div>
                      </button>
                    </td>
                    <td className="px-3 py-4">
                      <Badge 
                        value={
                          user.role === 'STUDENT' 
                            ? 'STUDENT' 
                            : user.tutorProfile?.verificationStatus === 'APPROVED' 
                              ? 'VERIFIED_TUTOR' 
                              : 'UNVERIFIED_TUTOR'
                        } 
                      />
                    </td>
                    <td className="px-3 py-4"><Badge value={user.status} /></td>
                    <td className="px-3 py-4 text-xs font-bold text-navy-400">{user.strikeCount || 0}/3</td>
                    <td className="px-3 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => warnUser(user.id)} className="rounded-lg border border-gold-300 px-2 py-1 text-[10px] font-black text-gold-700">Warn</button>
                        {user.status === 'SUSPENDED' ? (
                          <button onClick={() => unbanUser(user.id)} className="rounded-lg bg-sage-500 px-2 py-1 text-[10px] font-black text-white">Unsuspend</button>
                        ) : (
                          <button onClick={() => suspendUser(user.id)} className="rounded-lg bg-blue-500 px-2 py-1 text-[10px] font-black text-white">Suspend</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">User details</h2>
          {selectedUser ? (
            <div className="mt-6 space-y-6">
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300 dark:text-cream-400/40">Moderation History</div>
                <div className="space-y-2">
                  {(selectedUser.strikes || []).map((strike: any) => (
                    <div key={strike.id} className="rounded-xl bg-navy-50/80 p-3 text-xs dark:bg-navy-700/20">
                      <div className="font-bold text-navy-600 dark:text-cream-200">{strike.actionType}</div>
                      <div className="mt-1 text-navy-400 dark:text-cream-300/70">{strike.reason}</div>
                      <div className="mt-1 text-[10px] text-navy-300">{formatRelativeTime(strike.createdAt)}</div>
                    </div>
                  ))}
                  {(!selectedUser.strikes || selectedUser.strikes.length === 0) && (
                    <div className="text-xs text-navy-300">No strikes or warnings recorded.</div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-navy-100 dark:border-navy-500/40 space-y-3">
                {selectedUser.status === 'BANNED' ? (
                  <button 
                    onClick={() => unbanUser(selectedUser.id)}
                    className="w-full rounded-2xl bg-sage-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-sage-600/20 hover:bg-sage-700 transition-colors"
                  >
                    Unban User
                  </button>
                ) : (
                  <button 
                    onClick={() => banUser(selectedUser.id)}
                    className="w-full rounded-2xl border-2 border-red-500 px-4 py-3 text-sm font-black text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                  >
                    Permanently Ban User
                  </button>
                )}
                
                <div className="p-4 rounded-2xl bg-red-50 border border-red-100">
                  <div className="text-[10px] font-black text-red-700 uppercase tracking-widest">Danger Zone</div>
                  <p className="mt-1 text-[10px] text-red-600 leading-relaxed">Deleting an account is permanent and removes all records. Use "Ban" if you just want to block access but keep history.</p>
                  <button 
                    onClick={() => deleteUser(selectedUser.id)}
                    className="mt-3 w-full rounded-xl bg-red-600 py-2 text-xs font-black text-white hover:bg-red-700 transition-colors"
                  >
                    Delete Account Permanently
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-10 text-center text-sm text-navy-300">Select a user to view history and take major actions.</div>
          )}
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">Content flags</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.contentFlags.map((flag: any) => (
            <div key={flag.id} className="rounded-3xl border border-navy-100 bg-white/70 p-5 dark:border-navy-500/40 dark:bg-navy-600/30">
              <div className="flex items-center gap-2">
                <Badge value={flag.contentType} />
                <Badge value={flag.status} />
              </div>
              <div className="mt-4 text-sm font-bold text-navy-600 dark:text-cream-200">Flagged by {flag.reporter.name}</div>
              <div className="mt-2 text-xs text-navy-400 dark:text-cream-300/80 line-clamp-3">{flag.reason}</div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => flagAction(flag.id, 'DISMISS')} className="flex-1 rounded-xl bg-navy-100 py-2 text-[10px] font-black dark:bg-navy-500/40">Dismiss</button>
                <button onClick={() => flagAction(flag.id, 'REMOVE_CONTENT')} className="flex-1 rounded-xl bg-red-500 py-2 text-[10px] font-black text-white">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
