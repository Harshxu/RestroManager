'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

const PLATFORM_CONFIG: Record<string, { color: string; bg: string; emoji: string }> = {
  Zomato:  { color: '#e23744', bg: 'rgba(226,55,68,0.12)',  emoji: '🍽️' },
  Swiggy:  { color: '#fc8019', bg: 'rgba(252,128,25,0.12)', emoji: '🛵' },
  Google:  { color: '#4285f4', bg: 'rgba(66,133,244,0.12)', emoji: '⭐' },
  Direct:  { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', emoji: '💬' },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{
          fontSize: '14px',
          color: s <= rating ? '#fbbf24' : 'rgba(255,255,255,0.1)',
          lineHeight: 1,
        }}>★</span>
      ))}
    </div>
  );
}

interface Review {
  _id: string;
  platform: string;
  customerName: string;
  customerPhone: string;
  rating: number;
  comment: string;
  isContacted: boolean;
  isResolved: boolean;
  createdAt: string;
}

interface AlertCard {
  review: Review;
  id: string;
}

export default function ReviewAlerts() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [alerts, setAlerts] = useState<AlertCard[]>([]);
  const [contactNote, setContactNote] = useState<Record<string, string>>({});
  const [marking, setMarking] = useState<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!user?._id || pathname === '/login') return;
    try {
      const res = await fetch(`/api/reviews?userId=${user._id}&unalerted=true`);
      if (!res.ok) return;
      const data: Review[] = await res.json();
      // Only show reviews we haven't seen yet in this session
      const newAlerts = data.filter(r => !seenIds.current.has(r._id));
      if (newAlerts.length > 0) {
        newAlerts.forEach(r => seenIds.current.add(r._id));
        setAlerts(prev => [
          ...newAlerts.map(r => ({ review: r, id: r._id })),
          ...prev,
        ].slice(0, 5)); // max 5 at once
      }
    } catch (e) {
      // silently fail
    }
  }, [user?._id, pathname]);

  // Poll every 60 seconds for new low-rating alerts
  useEffect(() => {
    if (!user?._id) return;
    fetchAlerts();
    pollRef.current = setInterval(fetchAlerts, 60_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user?._id, fetchAlerts]);

  const dismissAlert = async (alertId: string, reviewId: string) => {
    // Mark alert as dismissed in DB
    await fetch('/api/reviews', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: reviewId, alertDismissed: true }),
    }).catch(() => {});
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const markContacted = async (alertId: string, review: Review) => {
    setMarking(alertId);
    const note = contactNote[alertId] || '';
    await fetch('/api/reviews', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        _id: review._id,
        isContacted: true,
        contactNote: note,
        alertDismissed: true,
      }),
    }).catch(() => {});
    setMarking(null);
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const openWhatsApp = (phone: string, name: string, rating: number, platform: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const emoji = PLATFORM_CONFIG[platform]?.emoji || '⭐';
    const msg = `Namaste ${name} ji! 🙏\n\nWe noticed you gave us ${rating} star${rating > 1 ? 's' : ''} on ${platform} ${emoji}. We're sorry your experience wasn't perfect.\n\nCould you share what we can improve? Your feedback means everything to us and helps us serve you better. 💚\n\n— ${user?.businessName || 'The Dhaba'}`;
    window.open(`https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (alerts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '24px',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '380px',
      pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {alerts.map((alert, idx) => {
          const { review } = alert;
          const platform = PLATFORM_CONFIG[review.platform] || PLATFORM_CONFIG.Direct;
          const isLow = review.rating <= 2;

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.92 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260, delay: idx * 0.07 }}
              style={{ pointerEvents: 'all' }}
            >
              <div style={{
                background: 'rgba(8,8,16,0.97)',
                backdropFilter: 'blur(40px)',
                border: `1px solid ${isLow ? 'rgba(239,68,68,0.4)' : 'rgba(251,191,36,0.3)'}`,
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: isLow
                  ? '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(239,68,68,0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
                  : '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}>
                {/* Alert stripe */}
                <div style={{
                  height: '3px',
                  background: isLow
                    ? 'linear-gradient(90deg, #ef4444, #f87171)'
                    : 'linear-gradient(90deg, #fbbf24, #fde68a)',
                }} />

                <div style={{ padding: '16px 18px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                    {/* Platform badge */}
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '12px',
                      background: platform.bg,
                      border: `1px solid ${platform.color}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px', flexShrink: 0,
                    }}>
                      {platform.emoji}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: '800', letterSpacing: '0.07em',
                          color: platform.color,
                          textTransform: 'uppercase',
                        }}>
                          {review.platform}
                        </span>
                        <span style={{
                          fontSize: '0.62rem',
                          color: isLow ? '#f87171' : '#fbbf24',
                          fontWeight: '700',
                          background: isLow ? 'rgba(239,68,68,0.12)' : 'rgba(251,191,36,0.12)',
                          padding: '1px 6px',
                          borderRadius: '20px',
                          border: `1px solid ${isLow ? 'rgba(239,68,68,0.25)' : 'rgba(251,191,36,0.25)'}`,
                        }}>
                          {isLow ? '🚨 LOW RATING' : '⚠ REVIEW'}
                        </span>
                      </div>
                      <p style={{ fontWeight: '800', color: 'white', fontSize: '0.95rem', marginBottom: '3px' }}>
                        {review.customerName}
                      </p>
                      <StarRating rating={review.rating} />
                    </div>

                    <button
                      onClick={() => dismissAlert(alert.id, review._id)}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none', color: 'rgba(255,255,255,0.4)',
                        width: '28px', height: '28px', borderRadius: '8px',
                        cursor: 'pointer', fontSize: '14px', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >✕</button>
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <div style={{
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      marginBottom: '12px',
                    }}>
                      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', lineHeight: '1.5', fontStyle: 'italic' }}>
                        "{review.comment}"
                      </p>
                    </div>
                  )}

                  {/* Contact note */}
                  <input
                    type="text"
                    placeholder="Add a note before contacting..."
                    value={contactNote[alert.id] || ''}
                    onChange={e => setContactNote(prev => ({ ...prev, [alert.id]: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.78rem',
                      marginBottom: '10px',
                    }}
                  />

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {review.customerPhone && (
                      <button
                        onClick={() => openWhatsApp(review.customerPhone, review.customerName, review.rating, review.platform)}
                        style={{
                          flex: 1, padding: '8px 10px',
                          background: 'rgba(37,211,102,0.15)',
                          border: '1px solid rgba(37,211,102,0.35)',
                          borderRadius: '10px',
                          color: '#25d366',
                          fontSize: '0.75rem', fontWeight: '700',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                        }}
                      >
                        📱 WhatsApp
                      </button>
                    )}
                    <button
                      onClick={() => markContacted(alert.id, review)}
                      disabled={marking === alert.id}
                      style={{
                        flex: 1, padding: '8px 10px',
                        background: 'rgba(99,102,241,0.15)',
                        border: '1px solid rgba(99,102,241,0.35)',
                        borderRadius: '10px',
                        color: '#a5b4fc',
                        fontSize: '0.75rem', fontWeight: '700',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                      }}
                    >
                      {marking === alert.id ? '...' : '✓ Mark Contacted'}
                    </button>
                  </div>

                  {/* Time */}
                  <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', marginTop: '8px', textAlign: 'right' }}>
                    {new Date(review.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
