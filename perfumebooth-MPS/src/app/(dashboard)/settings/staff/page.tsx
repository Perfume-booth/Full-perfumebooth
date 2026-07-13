'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  UserPlus, 
  Trash2, 
  Loader2, 
  X,
  Mail,
  User,
  Key,
  ShieldCheck,
  History,
  Users,
  Lock,
  Pencil
} from 'lucide-react';

interface StaffUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  is_active: boolean;
  date_joined: string;
}

interface AuditLog {
  id: string;
  staff_name: string;
  action: string;
  ip_address: string;
  created_at: string;
}

export default function StaffSettingsPage() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'logs' | 'security'>('accounts');
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Admin');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  // Self Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changeSelfLoading, setChangeSelfLoading] = useState(false);
  const [changeSelfSuccess, setChangeSelfSuccess] = useState('');
  const [changeSelfError, setChangeSelfError] = useState('');

  // Reset Staff Password State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetStaffLoading, setResetStaffLoading] = useState(false);
  const [resetStaffError, setResetStaffError] = useState('');

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/auth/staff/');
      setStaff(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/auth/staff/logs/');
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'accounts') {
      fetchStaff();
    } else if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  const handleChangeSelfPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeSelfLoading(true);
    setChangeSelfError('');
    setChangeSelfSuccess('');

    try {
      await apiFetch('/auth/change-password-self/', {
        method: 'POST',
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        })
      });
      setChangeSelfSuccess('Your password has been changed successfully.');
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      setChangeSelfError(err.message || 'Failed to change password.');
    } finally {
      setChangeSelfLoading(false);
    }
  };

  const handleOpenResetPassword = (user: StaffUser) => {
    setSelectedStaff(user);
    setResetPassword('');
    setResetStaffError('');
    setResetModalOpen(true);
  };

  const handleResetStaffPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setResetStaffLoading(true);
    setResetStaffError('');

    try {
      await apiFetch('/auth/reset-staff-password/', {
        method: 'POST',
        body: JSON.stringify({
          user_id: selectedStaff.id,
          new_password: resetPassword,
        })
      });
      setResetModalOpen(false);
      alert(`Password for ${selectedStaff.email} has been reset successfully.`);
    } catch (err: any) {
      setResetStaffError(err.message || 'Failed to reset password.');
    } finally {
      setResetStaffLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setRole('Admin');
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (user: StaffUser) => {
    setEditingStaff(user);
    setFirstName(user.first_name);
    setLastName(user.last_name);
    setEmail(user.email);
    setPassword('');
    setRole(user.roles?.[0] || 'Admin');
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');

    try {
      if (editingStaff) {
        await apiFetch(`/auth/staff/${editingStaff.id}/`, {
          method: 'PUT',
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            role
          })
        });
      } else {
        await apiFetch('/auth/staff/', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            first_name: firstName,
            last_name: lastName,
            role
          })
        });
      }
      setModalOpen(false);
      fetchStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to save staff member.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string, staffEmail: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${staffEmail}?`)) return;
    try {
      await apiFetch(`/auth/staff/${id}/`, {
        method: 'DELETE'
      });
      fetchStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to delete staff member.');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage merchant user accounts, audit logging records, and console permissions</p>
        </div>
        {activeTab === 'accounts' && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition duration-200 cursor-pointer text-sm"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add Staff Member</span>
          </button>
        )}
      </div>

      {/* Tabs bar */}
      <div className="flex border-b border-border gap-4">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition duration-200 cursor-pointer ${
            activeTab === 'accounts' 
              ? 'border-primary text-foreground' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Accounts</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition duration-200 cursor-pointer ${
            activeTab === 'logs' 
              ? 'border-primary text-foreground' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Activity Log</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition duration-200 cursor-pointer ${
            activeTab === 'security' 
              ? 'border-primary text-foreground' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Security Settings</span>
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="h-60 flex items-center justify-center text-primary">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : activeTab === 'accounts' ? (
        /* Staff accounts tab */
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold">
                  <th className="p-5">Name</th>
                  <th className="p-5">Email Address</th>
                  <th className="p-5">Role Assigned</th>
                  <th className="p-5">Date Invited</th>
                  <th className="p-5 text-right">Access Controls</th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-muted-foreground">
                      No additional staff accounts created. Invite other managers to this dashboard.
                    </td>
                  </tr>
                ) : (
                  staff.map((user) => (
                    <tr key={user.id} className="border-b border-border/50 hover:bg-muted/10 transition duration-150">
                      <td className="p-5 font-semibold text-foreground">
                        {user.first_name} {user.last_name || ''}
                      </td>
                      <td className="p-5 text-muted-foreground">{user.email}</td>
                      <td className="p-5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          user.roles.includes('Admin') ? 'bg-indigo-500/10 text-indigo-400' :
                          user.roles.includes('Content Manager') ? 'bg-purple-500/10 text-purple-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>
                          {user.roles?.[0] || 'N/A'}
                        </span>
                      </td>
                      <td className="p-5 text-muted-foreground">
                        {new Date(user.date_joined).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-5 text-right flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition duration-200 cursor-pointer"
                          title="Edit Profile & Role"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenResetPassword(user)}
                          className="p-2 text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition duration-200 cursor-pointer"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.email)}
                          className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition duration-200 cursor-pointer"
                          title="Revoke dashboard access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'logs' ? (
        /* Activity logs tab */
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold">
                  <th className="p-5">Staff Name</th>
                  <th className="p-5">Action Performed</th>
                  <th className="p-5">Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-10 text-center text-muted-foreground">
                      No merchant modifications logged yet. Logs will generate as products, orders, and CMS sections are edited.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-muted/10 transition duration-150">
                      <td className="p-5 font-semibold text-foreground">
                        {log.staff_name}
                      </td>
                      <td className="p-5 text-muted-foreground">
                        {log.action}
                      </td>
                      <td className="p-5 text-muted-foreground">
                        {new Date(log.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Security Settings tab */
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Change Password</h2>
            <p className="text-muted-foreground text-sm mt-1">Update your Super Admin merchant credentials</p>
          </div>

          {changeSelfSuccess && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
              {changeSelfSuccess}
            </div>
          )}

          {changeSelfError && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {changeSelfError}
            </div>
          )}

          <form onSubmit={handleChangeSelfPassword} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">New Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={changeSelfLoading}
              className="mt-2 flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition duration-200 cursor-pointer text-sm disabled:opacity-50"
            >
              {changeSelfLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Invite Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-card border border-border p-8 rounded-2xl shadow-2xl flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">
                {editingStaff ? 'Edit Staff Profile' : 'Add Staff Member'}
              </h2>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-2 hover:bg-muted rounded-full transition duration-200 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* First & Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. John"
                      className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Doe"
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    disabled={!!editingStaff}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@perfumebooth.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              {!editingStaff && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Password</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Role dropdown */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Dashboard Role</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm text-foreground cursor-pointer"
                  >
                    <option value="Admin">Admin (Full Dashboard, No User Edit)</option>
                    <option value="Content Manager">Content Manager (CMS Layouts only)</option>
                    <option value="E-commerce Executive">E-commerce Executive (Products & Orders only)</option>
                  </select>
                </div>
              </div>

              {/* Submit buttons */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 border border-border text-foreground font-semibold rounded-xl hover:bg-muted transition duration-200 cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition duration-200 cursor-pointer text-sm disabled:opacity-50"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingStaff ? 'Save Changes' : 'Create User'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Staff Password Modal */}
      {resetModalOpen && selectedStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-card border border-border p-8 rounded-2xl shadow-2xl flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">
                Reset Password
              </h2>
              <button 
                onClick={() => setResetModalOpen(false)}
                className="p-2 hover:bg-muted rounded-full transition duration-200 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              You are resetting the password for <strong className="text-foreground">{selectedStaff.email}</strong> ({selectedStaff.first_name} {selectedStaff.last_name || ''}).
            </p>

            {resetStaffError && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {resetStaffError}
              </div>
            )}

            <form onSubmit={handleResetStaffPassword} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">New Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-4 py-2.5 border border-border text-foreground font-semibold rounded-xl hover:bg-muted transition duration-200 cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetStaffLoading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition duration-200 cursor-pointer text-sm disabled:opacity-50"
                >
                  {resetStaffLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Resetting...</span>
                    </>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

