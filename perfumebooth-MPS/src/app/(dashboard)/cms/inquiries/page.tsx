'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Mail, 
  Search, 
  Download, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  Clock, 
  Archive, 
  Eye, 
  X, 
  Phone, 
  Send,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { apiFetch, apiDownload } from '@/lib/api';

interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'pending' | 'read' | 'replied' | 'archived';
  ip_address: string | null;
  created_at: string;
  updated_at: string;
}

interface InquiriesResponse {
  inquiries: ContactInquiry[];
  total: number;
  counts: {
    all: number;
    pending: number;
    read: number;
    replied: number;
    archived: number;
  };
}

export default function ContactInquiriesPage() {
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, pending: 0, read: 0, replied: 0, archived: 0 });
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiry | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter !== 'all') q.set('status', statusFilter);
      if (searchQuery.trim()) q.set('search', searchQuery.trim());

      const res = await apiFetch<InquiriesResponse>(`/cms/inquiries/?${q.toString()}`);
      setInquiries(res.inquiries || []);
      setTotal(res.total || 0);
      setCounts(res.counts || { all: 0, pending: 0, read: 0, replied: 0, archived: 0 });
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await apiFetch(`/cms/inquiries/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      setInquiries(prev => prev.map(item => item.id === id ? { ...item, status: newStatus as any } : item));
      if (selectedInquiry && selectedInquiry.id === id) {
        setSelectedInquiry(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
      fetchInquiries();
    } catch (err: any) {
      alert(err.message || 'Could not update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this customer inquiry?')) return;
    try {
      await apiFetch(`/cms/inquiries/${id}/`, { method: 'DELETE' });
      setInquiries(prev => prev.filter(item => item.id !== id));
      if (selectedInquiry?.id === id) setSelectedInquiry(null);
      fetchInquiries();
    } catch (err: any) {
      alert(err.message || 'Could not delete inquiry');
    }
  };

  const handleExportExcel = async () => {
    setDownloading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter !== 'all') q.set('status', statusFilter);
      const blob = await apiDownload(`/cms/inquiries/export/?${q.toString()}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `perfumebooth_inquiries_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Could not export Excel file');
    } finally {
      setDownloading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/15 text-amber-800 border border-amber-500/30">Pending</span>;
      case 'read':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-500/15 text-blue-800 border border-blue-500/30">Read</span>;
      case 'replied':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-800 border border-emerald-500/30">Replied</span>;
      case 'archived':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-neutral-500/15 text-neutral-800 border border-neutral-500/30">Archived</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-muted text-muted-foreground">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto py-2">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card neu-extruded p-6 rounded-3xl border border-border/10">
        <div>
          <div className="flex items-center gap-2 text-primary font-extrabold text-xs uppercase tracking-wider mb-1">
            <MessageSquare className="w-4 h-4" />
            <span>Storefront Customer Communications</span>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Contact Inquiries & Leads</h1>
          <p className="text-muted-foreground text-xs font-bold mt-1">
            Review customer messages submitted via the Contact Us form, update resolution status, and download records in Excel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            disabled={downloading}
            className="flex items-center gap-2 px-5 py-2.5 neu-btn-primary font-black rounded-2xl text-xs transition duration-200 cursor-pointer disabled:opacity-50 text-primary"
            title="Download formatted Excel (.xlsx) file"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{downloading ? 'Generating Excel…' : 'Download Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-card neu-extruded p-4 rounded-3xl border border-border/10">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
          {[
            { id: 'all', label: 'All Inquiries', count: counts.all },
            { id: 'pending', label: 'Pending', count: counts.pending },
            { id: 'read', label: 'Read', count: counts.read },
            { id: 'replied', label: 'Replied', count: counts.replied },
            { id: 'archived', label: 'Archived', count: counts.archived },
          ].map(tab => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-extrabold transition-all duration-200 shrink-0 cursor-pointer ${
                  active 
                    ? 'neu-inset text-primary border border-primary/25' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, subject..."
            className="w-full pl-9 pr-4 py-2 text-xs neu-input rounded-2xl font-bold"
          />
        </div>
      </div>

      {/* Inquiries Table Card */}
      <div className="bg-card neu-extruded rounded-3xl border border-border/10 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-primary gap-3">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xs font-bold text-muted-foreground">Loading contact inquiries…</span>
          </div>
        ) : inquiries.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center p-8 gap-3">
            <div className="w-16 h-16 rounded-2xl neu-inset-sm flex items-center justify-center text-muted-foreground">
              <Mail className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="text-base font-black text-foreground">No customer inquiries found</h3>
            <p className="text-xs font-bold text-muted-foreground max-w-sm">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try clearing the search query or status filter to see other submissions.' 
                : 'Customer inquiries submitted via the store contact form will automatically appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/20 bg-muted/20 text-muted-foreground font-black text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-5">Date</th>
                  <th className="py-3.5 px-5">Customer</th>
                  <th className="py-3.5 px-5">Subject</th>
                  <th className="py-3.5 px-5">Message Preview</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10 font-medium">
                {inquiries.map((inq) => {
                  const dateStr = inq.created_at ? new Date(inq.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '—';

                  return (
                    <tr 
                      key={inq.id} 
                      className="hover:bg-muted/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedInquiry(inq)}
                    >
                      <td className="py-3.5 px-5 whitespace-nowrap text-muted-foreground text-[11px] font-bold">
                        {dateStr}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-foreground">{inq.name}</span>
                          <span className="text-[11px] text-muted-foreground font-bold">{inq.email}</span>
                          {inq.phone && (
                            <span className="text-[10px] text-primary font-bold flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" />
                              {inq.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="font-extrabold text-foreground truncate max-w-xs block">
                          {inq.subject || 'General Inquiry'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <p className="text-muted-foreground line-clamp-1 max-w-md font-normal text-xs">
                          {inq.message}
                        </p>
                      </td>
                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        {getStatusBadge(inq.status)}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedInquiry(inq)}
                            className="p-1.5 rounded-xl hover:bg-primary/10 text-primary transition"
                            title="View Full Inquiry"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(inq.id)}
                            className="p-1.5 rounded-xl hover:bg-red-500/10 text-red-500 transition"
                            title="Delete Inquiry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal / Drawer */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card neu-extruded max-w-2xl w-full rounded-3xl border border-border/20 p-6 flex flex-col gap-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-border/20">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Customer Inquiry Details</span>
                <h3 className="text-xl font-black text-foreground mt-0.5">{selectedInquiry.subject || 'General Inquiry'}</h3>
                <p className="text-xs font-bold text-muted-foreground mt-0.5">
                  Submitted {new Date(selectedInquiry.created_at).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Details Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-muted/20 border border-border/20">
              <div>
                <span className="text-[10px] font-black uppercase text-muted-foreground block">Customer Name</span>
                <span className="text-sm font-extrabold text-foreground">{selectedInquiry.name}</span>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-muted-foreground block">Email Address</span>
                <a href={`mailto:${selectedInquiry.email}`} className="text-sm font-extrabold text-primary hover:underline">
                  {selectedInquiry.email}
                </a>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-muted-foreground block">Phone</span>
                <span className="text-xs font-extrabold text-foreground">{selectedInquiry.phone || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-muted-foreground block">Client IP Address</span>
                <span className="text-xs font-mono font-bold text-muted-foreground">{selectedInquiry.ip_address || '—'}</span>
              </div>
            </div>

            {/* Full Message Body */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Message Content</span>
              <div className="p-4 rounded-2xl bg-card neu-inset text-foreground text-xs font-medium leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                {selectedInquiry.message}
              </div>
            </div>

            {/* Status Changer & Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/20">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-muted-foreground">Change Status:</span>
                <select
                  value={selectedInquiry.status}
                  disabled={updatingId === selectedInquiry.id}
                  onChange={(e) => handleUpdateStatus(selectedInquiry.id, e.target.value)}
                  className="px-3 py-1.5 neu-input rounded-xl text-xs font-extrabold cursor-pointer text-foreground"
                >
                  <option value="pending">Pending</option>
                  <option value="read">Read</option>
                  <option value="replied">Replied</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`mailto:${selectedInquiry.email}?subject=Re: ${encodeURIComponent(selectedInquiry.subject || 'Inquiry')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 neu-btn-primary font-black rounded-xl text-xs text-primary transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Reply via Email</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedInquiry(null)}
                  className="px-4 py-2 neu-btn font-extrabold rounded-xl text-xs text-foreground cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
