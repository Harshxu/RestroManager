'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Plus, Filter, MessageCircle, CheckCircle, Phone, Trash2, TrendingUp, TrendingDown, BarChart2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const PLATFORMS = ['Zomato', 'Swiggy', 'Google', 'Direct'];
const PLATFORM_CONFIG: Record<string, { color: string; bg: string; emoji: string; gradient: string }> = {
  Zomato:  { color: '#e23744', bg: 'rgba(226,55,68,0.1)',  emoji: '🍽️', gradient: 'linear-gradient(135deg,#e23744,#ff6b78)' },
  Swiggy:  { color: '#fc8019', bg: 'rgba(252,128,25,0.1)', emoji: '🛵', gradient: 'linear-gradient(135deg,#fc8019,#ffa654)' },
  Google:  { color: '#4285f4', bg: 'rgba(66,133,244,0.1)', emoji: '⭐', gradient: 'linear-gradient(135deg,#4285f4,#74a9ff)' },
  Direct:  { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', emoji: '💬', gradient: 'linear-gradient(135deg,#8b5cf6,#a78bfa)' },
};

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ fontSize: size, color: s <= rating ? '#fbbf24' : 'rgba(255,255,255,0.12)', lineHeight: 1 }}>★</span>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{
      padding: '20px', borderRadius: '18px',
      background: `${color}08`, border: `1px solid ${color}20`,
      display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ fontSize: '2rem', fontWeight: '800', color, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{sub}</p>}
    </div>
  );
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState('All');
  const [filterRating, setFilterRating] = useState('All');
  const [contactModal, setContactModal] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [noteInput, setNoteInput] = useState('');

  // New review form
  const [form, setForm] = useState({
    platform: 'Zomato',
    customerName: '',
    customerPhone: '',
    rating: 5,
    comment: '',
  });

  const fetchReviews = async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?userId=${user._id}`);
      if (res.ok) setReviews(await res.json());
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, [user?._id]);

  const addReview = async () => {
    if (!form.customerName || !form.rating) return;
    setSaving(true);
    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, userId: user?._id }),
      });
      setForm({ platform: 'Zomato', customerName: '', customerPhone: '', rating: 5, comment: '' });
      setIsAddOpen(false);
      fetchReviews();
    } catch (e) {}
    setSaving(false);
  };

  const markContacted = async (review: any) => {
    setSaving(true);
    await fetch('/api/reviews', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: review._id, isContacted: true, contactNote: noteInput, alertDismissed: true }),
    });
    setContactModal(null);
    setNoteInput('');
    setSaving(false);
    fetchReviews();
  };

  const markResolved = async (id: string) => {
    await fetch('/api/reviews', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id, isResolved: true, alertDismissed: true }),
    });
    fetchReviews();
  };

  const deleteReview = async (id: string) => {
    if (!confirm('Delete this review?')) return;
    await fetch(`/api/reviews?id=${id}`, { method: 'DELETE' });
    fetchReviews();
  };

  const openWhatsApp = (review: any) => {
    const phone = review.customerPhone?.replace(/\D/g, '');
    const finalPhone = phone?.length === 10 ? `91${phone}` : phone;
    const msg = `Namaste ${review.customerName} ji! 🙏\n\nWe noticed you gave us ${review.rating} star${review.rating > 1 ? 's' : ''} on ${review.platform}. We're sorry your experience wasn't perfect.\n\nCould you tell us what we can do better? Your feedback is very important to us. 💚\n\n— ${user?.businessName || 'The Dhaba'}`;
    window.open(`https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Analytics
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—';
  const lowRatings = reviews.filter(r => r.rating <= 2);
  const unresolved = lowRatings.filter(r => !r.isResolved);
  const contacted = lowRatings.filter(r => r.isContacted);

  // Platform distribution
  const platformData = PLATFORMS.map(p => ({
    name: p,
    value: reviews.filter(r => r.platform === p).length,
    color: PLATFORM_CONFIG[p].color,
  })).filter(d => d.value > 0);

  // Rating distribution (1–5)
  const ratingDist = [1, 2, 3, 4, 5].map(n => ({
    rating: `${n}★`,
    count: reviews.filter(r => r.rating === n).length,
    color: n <= 2 ? '#ef4444' : n === 3 ? '#fbbf24' : '#4ade80',
  }));

  // Filtered reviews
  const filtered = reviews.filter(r => {
    if (filterPlatform !== 'All' && r.platform !== filterPlatform) return false;
    if (filterRating === 'Low' && r.rating > 2) return false;
    if (filterRating === 'High' && r.rating < 4) return false;
    return true;
  });

  const getRatingColor = (r: number) => r <= 2 ? '#ef4444' : r === 3 ? '#fbbf24' : '#4ade80';

  return (
    <div style={{ padding: '32px', maxWidth: '1300px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Star size={32} />Review Intelligence
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '6px', fontSize: '0.9rem' }}>
            Track ratings from Zomato, Swiggy, Google · Recover unhappy customers
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchReviews} className="glass-dark" style={{ padding: '10px 16px', borderRadius: '12px', color: 'white', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={16} />
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setIsAddOpen(true)}
            style={{
              padding: '12px 20px', borderRadius: '14px', border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', fontWeight: '700', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem',
              boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
            }}
          >
            <Plus size={18} /> Log Review
          </motion.button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard label="Avg Rating" value={avgRating} sub={`From ${reviews.length} reviews`} color="#fbbf24" />
        <StatCard label="Low Ratings" value={lowRatings.length} sub="1–2 star reviews" color="#ef4444" />
        <StatCard label="Unresolved" value={unresolved.length} sub="Need attention" color="#f87171" />
        <StatCard label="Recovered" value={contacted.length} sub="Customers contacted" color="#4ade80" />
      </div>

      {/* Charts row */}
      {reviews.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
          {/* Rating distribution */}
          <div className="glass-dark" style={{ padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={16} /> Rating Distribution
            </h3>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={ratingDist} barSize={28}>
                <XAxis dataKey="rating" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#0a0a14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {ratingDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Platform split */}
          <div className="glass-dark" style={{ padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} /> Platform Split
            </h3>
            {platformData.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <PieChart width={130} height={130}>
                  <Pie data={platformData} cx={60} cy={60} innerRadius={36} outerRadius={60} dataKey="value" paddingAngle={3}>
                    {platformData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {platformData.map(p => (
                    <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>{PLATFORM_CONFIG[p.name].emoji} {p.name}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: p.color, marginLeft: 'auto' }}>{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '32px 0', fontSize: '0.85rem' }}>No data yet</p>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['All', ...PLATFORMS].map(p => (
          <button key={p}
            onClick={() => setFilterPlatform(p)}
            style={{
              padding: '7px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
              background: filterPlatform === p ? (PLATFORM_CONFIG[p]?.color || 'var(--accent)') : 'rgba(255,255,255,0.05)',
              border: filterPlatform === p ? 'none' : '1px solid rgba(255,255,255,0.08)',
              color: filterPlatform === p ? 'white' : 'rgba(255,255,255,0.5)',
              transition: 'all 0.2s',
            }}>
            {p !== 'All' && PLATFORM_CONFIG[p]?.emoji + ' '}{p}
          </button>
        ))}
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
        {[['All', 'All'], ['Low ⬇', 'Low'], ['High ⬆', 'High']].map(([label, val]) => (
          <button key={val}
            onClick={() => setFilterRating(val)}
            style={{
              padding: '7px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
              background: filterRating === val ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
              border: filterRating === val ? 'none' : '1px solid rgba(255,255,255,0.08)',
              color: filterRating === val ? 'white' : 'rgba(255,255,255,0.5)',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Reviews list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.3)' }}>
          <div className="pulse">Loading reviews...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Star size={48} style={{ opacity: 0.1, marginBottom: '16px', display: 'block', margin: '0 auto 16px' }} />
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.95rem' }}>No reviews yet. Log your first one!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((review, idx) => {
            const plat = PLATFORM_CONFIG[review.platform] || PLATFORM_CONFIG.Direct;
            const isLow = review.rating <= 2;
            return (
              <motion.div
                key={review._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                style={{
                  padding: '20px 24px',
                  borderRadius: '18px',
                  background: isLow ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isLow ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  display: 'grid',
                  gridTemplateColumns: '48px 1fr auto',
                  gap: '16px',
                  alignItems: 'center',
                  transition: 'all 0.2s',
                }}
              >
                {/* Platform icon */}
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: plat.bg, border: `1px solid ${plat.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px', flexShrink: 0,
                }}>
                  {plat.emoji}
                </div>

                {/* Content */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '5px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '800', color: 'white', fontSize: '1rem' }}>{review.customerName}</span>
                    <span style={{ fontSize: '0.7rem', color: plat.color, fontWeight: '700', background: plat.bg, padding: '2px 8px', borderRadius: '20px', border: `1px solid ${plat.color}30` }}>{review.platform}</span>
                    {review.isContacted && <span style={{ fontSize: '0.68rem', color: '#60a5fa', fontWeight: '700' }}>📞 Contacted</span>}
                    {review.isResolved && <span style={{ fontSize: '0.68rem', color: '#4ade80', fontWeight: '700' }}>✓ Resolved</span>}
                  </div>
                  <StarRow rating={review.rating} size={14} />
                  {review.comment && (
                    <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', marginTop: '6px', fontStyle: 'italic', lineHeight: '1.5' }}>
                      "{review.comment}"
                    </p>
                  )}
                  {review.contactNote && (
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                      Note: {review.contactNote}
                    </p>
                  )}
                  <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', marginTop: '6px' }}>
                    {new Date(review.createdAt).toLocaleString()}
                    {review.customerPhone && ` · ${review.customerPhone}`}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {!review.isContacted && (
                    <button
                      onClick={() => { setContactModal(review); setNoteInput(''); }}
                      title="Contact customer"
                      style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <MessageCircle size={16} />
                    </button>
                  )}
                  {review.customerPhone && (
                    <button
                      onClick={() => openWhatsApp(review)}
                      title="Send WhatsApp"
                      style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)', color: '#25d366', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}
                    >
                      <Phone size={16} />
                    </button>
                  )}
                  {!review.isResolved && review.isContacted && (
                    <button
                      onClick={() => markResolved(review._id)}
                      title="Mark resolved"
                      style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteReview(review._id)}
                    title="Delete"
                    style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Review Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-dark"
              style={{ padding: '36px', borderRadius: '28px', width: '100%', maxWidth: '500px', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <h2 style={{ marginBottom: '8px', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Star size={24} style={{ color: '#fbbf24' }} /> Log a Review
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '24px' }}>Copy the review from Zomato / Swiggy / Google and paste details here.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Platform selector */}
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Platform</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                    {PLATFORMS.map(p => {
                      const conf = PLATFORM_CONFIG[p];
                      const sel = form.platform === p;
                      return (
                        <button key={p} onClick={() => setForm(f => ({ ...f, platform: p }))}
                          style={{
                            padding: '12px 8px', borderRadius: '12px', cursor: 'pointer',
                            background: sel ? conf.bg : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${sel ? conf.color + '60' : 'rgba(255,255,255,0.08)'}`,
                            color: sel ? conf.color : 'rgba(255,255,255,0.4)',
                            fontWeight: '700', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                          }}>
                          <span style={{ fontSize: '20px' }}>{conf.emoji}</span>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Customer Name *</label>
                    <input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                      placeholder="e.g. Rahul Sharma"
                      style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '0.9rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Phone (for WhatsApp)</label>
                    <input value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                      placeholder="9876543210"
                      style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '0.9rem' }} />
                  </div>
                </div>

                {/* Star rating selector */}
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontWeight: '600', display: 'block', marginBottom: '10px' }}>Rating *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setForm(f => ({ ...f, rating: n }))}
                        style={{
                          flex: 1, padding: '12px 0', borderRadius: '12px', cursor: 'pointer', fontSize: '24px',
                          background: form.rating >= n ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${form.rating >= n ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          transition: 'all 0.15s',
                        }}>
                        ★
                      </button>
                    ))}
                  </div>
                  <p style={{ textAlign: 'center', fontSize: '0.8rem', color: form.rating <= 2 ? '#f87171' : form.rating === 3 ? '#fbbf24' : '#4ade80', marginTop: '8px', fontWeight: '700' }}>
                    {form.rating === 1 ? '😡 Very Bad' : form.rating === 2 ? '😞 Bad' : form.rating === 3 ? '😐 Average' : form.rating === 4 ? '😊 Good' : '🤩 Excellent'}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Review Comment</label>
                  <textarea value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                    placeholder="Paste the customer's review text here..."
                    rows={3}
                    style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '0.9rem', resize: 'vertical' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button onClick={() => setIsAddOpen(false)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button onClick={addReview} disabled={saving || !form.customerName}
                  style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}>
                  {saving ? 'Saving...' : 'Log Review'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contact modal */}
      <AnimatePresence>
        {contactModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-dark"
              style={{ padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '420px', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <h2 style={{ marginBottom: '6px', fontSize: '1.3rem' }}>📞 Contact Recovery</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '20px' }}>
                Reaching out to <strong style={{ color: 'white' }}>{contactModal.customerName}</strong> who gave {contactModal.rating}★ on {contactModal.platform}
              </p>
              {contactModal.customerPhone && (
                <button onClick={() => openWhatsApp(contactModal)}
                  style={{ width: '100%', padding: '12px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '12px', color: '#25d366', cursor: 'pointer', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  📱 Send WhatsApp Message
                </button>
              )}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Add a note (what did you do?)</label>
                <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)}
                  placeholder="e.g. Called and apologized, offered 20% discount on next visit..."
                  rows={3}
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '0.85rem', resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button onClick={() => setContactModal(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => markContacted(contactModal)} disabled={saving}
                  style={{ flex: 1, padding: '12px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '10px', color: '#a5b4fc', cursor: 'pointer', fontWeight: '700' }}>
                  {saving ? '...' : '✓ Mark as Contacted'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
