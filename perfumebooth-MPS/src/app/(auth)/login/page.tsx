'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { apiFetch } from '@/lib/api';
import { Lock, Mail, Loader2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Prime the CSRF cookie on load
    apiFetch('/auth/csrf/').catch((err) => 
      console.warn('CSRF priming skipped (offline or not needed yet):', err) 
    );
  }, []);

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userData = await apiFetch('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const isAdmin = userData.roles.some((role: string) => 
        ['Super Admin', 'Admin', 'Content Manager', 'E-commerce Executive'].includes(role)
      );

      if (!isAdmin) {
        useAuthStore.getState().clearAuth();
        setError('Access denied: You do not have merchant permissions.');
        setLoading(false);
        return;
      }

      setAuth({
        id: userData.id,
        email: userData.email,
        fullName: userData.full_name,
        roles: userData.roles,
      });

      router.push('/');
    } catch (err: any) {
      useAuthStore.getState().clearAuth();
      setError(err.message || 'Invalid email or password.');
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full filter blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full filter blur-[100px] animate-pulse delay-1000"></div>

      <div className="w-full max-w-md bg-card neu-extruded p-8 sm:p-10 rounded-3xl relative z-10 border-0">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-card neu-inset-sm flex items-center justify-center text-primary shadow-xs">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight text-center">
            PerfumeBooth Management Portal
          </h1>
          <p className="text-xs text-muted-foreground font-medium">Sign in to manage your e-commerce store</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@perfumebooth.com"
                className="w-full pl-11 pr-4 py-3 neu-input rounded-2xl text-sm font-medium"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-11 py-3 neu-input rounded-2xl text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none flex items-center justify-center p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 neu-btn-primary font-bold rounded-2xl mt-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In to Dashboard</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
