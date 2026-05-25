'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const typeColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  bug:      { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   text: '#f87171', dot: '#ef4444' },
  feature:  { bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.25)',  text: '#c084fc', dot: '#8b5cf6' },
  business: { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)',  text: '#60a5fa', dot: '#3b82f6' },
  alert:    { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  text: '#fbbf24', dot: '#f59e0b' },
  tip:      { bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.25)',  text: '#4ade80', dot: '#22c55e' },
};

interface Insight {
  id: string;
  type: string;
  priority: string;
  title: string;
  description: string;
  icon: string;
  action: string | null;
}

interface AIData {
  insights: Insight[];
  summary: string;
  score: number;
  generatedAt: string;
  dataSnapshot: {
    todayOrders: number;
    todayRevenue: number;
    lowStockCount: number;
    activeSessions: number;
    tableUtilization: number;
  };
}

function ScoreRing({ score }: { score: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const pct = (score / 100) * circ;
  const color = score >= 70 ? '#4ade80' : score >= 40 ? '#fbbf24' : '#f87171';
  return (
    <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
      <motion.circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ - pct }}
        transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }} />
      <text x="36" y="36" textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="14" fontWeight="800"
        style={{ transform: 'rotate(90deg)', transformOrigin: '36px 36px' }}>{score}</text>
    </svg>
  );
}

// ──────────────────────────────────────────────
// Setup Screen shown when no API key is saved
// ──────────────────────────────────────────────
function SetupScreen({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [keyInput, setKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saveError, setSaveError] = useState('');

  const saveKey = async () => {
    if (!keyInput.trim() || !keyInput.startsWith('AIza')) {
      setSaveError('Key looks invalid. It should start with "AIza..."');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/ai-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, geminiApiKey: keyInput.trim() }),
      });
      if (res.ok) {
        onDone();
      } else {
        setSaveError('Failed to save. Try again.');
      }
    } catch {
      setSaveError('Network error.');
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Icon + title */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '20px', margin: '0 auto 16px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '32px', boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
        }}>✦</div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white', marginBottom: '8px' }}>
          Connect AI Analyst
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', lineHeight: '1.6' }}>
          Your personal Gemini AI key powers the analyst. It's stored securely in your own database — never shared.
        </p>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[
          { step: '1', text: 'Open Google AI Studio', link: 'https://aistudio.google.com/app/apikey', linkText: 'aistudio.google.com →' },
          { step: '2', text: 'Click "Create API Key" (it\'s free)' },
          { step: '3', text: 'Copy and paste the key below' },
        ].map(s => (
          <div key={s.step} style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px',
            padding: '12px 14px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.72rem', fontWeight: '800', color: 'white',
            }}>{s.step}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>{s.text}</p>
              {s.link && (
                <a href={s.link} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.75rem', color: '#a5b4fc', textDecoration: 'none', fontWeight: '700' }}>
                  {s.linkText}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Key input */}
      <div>
        <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          Your Gemini API Key
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={keyInput}
            onChange={e => { setKeyInput(e.target.value); setSaveError(''); }}
            placeholder="AIzaSy..."
            style={{
              width: '100%', padding: '12px 44px 12px 14px',
              background: 'rgba(0,0,0,0.4)', border: `1px solid ${saveError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '10px', color: 'white', fontSize: '0.9rem',
              fontFamily: showKey ? 'monospace' : 'inherit', letterSpacing: showKey ? '0.03em' : 'normal',
            }}
          />
          <button
            onClick={() => setShowKey(v => !v)}
            style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '16px',
            }}
          >{showKey ? '🙈' : '👁'}</button>
        </div>
        {saveError && <p style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '6px' }}>⚠ {saveError}</p>}
      </div>

      <button
        onClick={saveKey}
        disabled={saving || !keyInput.trim()}
        style={{
          padding: '14px', border: 'none', borderRadius: '12px',
          background: keyInput.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)',
          color: keyInput.trim() ? 'white' : 'rgba(255,255,255,0.2)',
          fontWeight: '700', fontSize: '0.95rem', cursor: keyInput.trim() ? 'pointer' : 'not-allowed',
          boxShadow: keyInput.trim() ? '0 8px 24px rgba(99,102,241,0.35)' : 'none',
          transition: 'all 0.2s',
        }}
      >
        {saving ? '⟳ Saving...' : '✦ Activate AI Analyst'}
      </button>

      <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: '1.5' }}>
        🔒 Key is stored in your own MongoDB. Never sent to any third-party server except Google's Gemini API.
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main AI Assistant
// ──────────────────────────────────────────────
export default function AIAssistant() {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [aiData, setAiData] = useState<AIData | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNewInsights, setHasNewInsights] = useState(false);
  const [activeInsight, setActiveInsight] = useState<string | null>(null);
  const [typedSummary, setTypedSummary] = useState('');
  const summaryRef = useRef('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!user?._id || loading) return;
    setLoading(true);
    setError(null);
    setTypedSummary('');
    summaryRef.current = '';

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      });

      const data = await res.json();

      if (res.status === 402 && data.setup_required) {
        setSetupRequired(true);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(data.error || 'AI analysis failed');

      setSetupRequired(false);
      setAiData(data);
      setHasNewInsights(true);

      let i = 0;
      const full = data.summary || '';
      const timer = setInterval(() => {
        if (i < full.length) {
          summaryRef.current += full[i];
          setTypedSummary(summaryRef.current);
          i++;
        } else clearInterval(timer);
      }, 22);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id) return;
    const t = setTimeout(fetchInsights, 3000);
    return () => clearTimeout(t);
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id) return;
    intervalRef.current = setInterval(fetchInsights, 8 * 60 * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [user?._id, fetchInsights]);

  const highPriorityCount = aiData?.insights.filter(i => i.priority === 'high').length || 0;

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => { setIsOpen(true); setHasNewInsights(false); }}
        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.96 }}
        style={{
          position: 'fixed', bottom: '28px', right: '28px',
          width: '62px', height: '62px', borderRadius: '50%',
          border: 'none', cursor: 'pointer', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '26px',
          background: setupRequired
            ? 'linear-gradient(135deg, #374151, #4b5563)'
            : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #3b82f6 100%)',
          boxShadow: setupRequired
            ? '0 4px 20px rgba(0,0,0,0.4)'
            : loading
            ? '0 0 0 4px rgba(99,102,241,0.3), 0 8px 30px rgba(99,102,241,0.5)'
            : '0 4px 20px rgba(99,102,241,0.4)',
        }}
        animate={loading ? { rotate: [0, 360] } : hasNewInsights ? { scale: [1, 1.12, 1] } : {}}
        transition={loading ? { repeat: Infinity, duration: 2, ease: 'linear' } : { repeat: Infinity, repeatDelay: 2, duration: 0.6 }}
        title={setupRequired ? 'Set up AI Analyst' : 'AI Business Analyst'}
      >
        {loading ? '⟳' : setupRequired ? '🔑' : '✦'}
        {highPriorityCount > 0 && !isOpen && !setupRequired && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{
            position: 'absolute', top: '-4px', right: '-4px',
            width: '22px', height: '22px', borderRadius: '50%',
            background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: '800', color: 'white', border: '2px solid #050505',
          }}>{highPriorityCount}</motion.div>
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 9998 }} />

            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.97 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              style={{
                position: 'fixed', right: '24px', bottom: '104px',
                width: '420px', maxHeight: '88vh', zIndex: 9999,
                display: 'flex', flexDirection: 'column',
                background: 'rgba(8,8,16,0.97)', backdropFilter: 'blur(40px)',
                border: '1px solid rgba(99,102,241,0.25)', borderRadius: '24px',
                boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
                overflow: 'hidden',
              }}
            >
              {/* Header — always visible */}
              <div style={{
                padding: '18px 22px 14px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.08) 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                    }}>✦</div>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.95rem', color: 'white' }}>AI Business Analyst</div>
                      <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>
                        {setupRequired ? 'Setup required' : 'Autonomous · Runs every 8 min'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {aiData && !setupRequired && <ScoreRing score={aiData.score} />}
                    <button onClick={() => setIsOpen(false)}
                      style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.5)', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                </div>

                {/* Data chips — only when running */}
                {aiData && !setupRequired && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Today', value: `₹${aiData.dataSnapshot.todayRevenue.toFixed(0)}`, color: '#4ade80' },
                      { label: 'Orders', value: aiData.dataSnapshot.todayOrders, color: '#60a5fa' },
                      { label: 'Tables', value: `${aiData.dataSnapshot.tableUtilization}%`, color: '#c084fc' },
                      { label: 'Low Stock', value: aiData.dataSnapshot.lowStockCount, color: aiData.dataSnapshot.lowStockCount > 0 ? '#fbbf24' : '#4ade80' },
                    ].map(chip => (
                      <div key={chip.label} style={{ padding: '3px 9px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>{chip.label}</span>
                        <span style={{ color: chip.color, fontWeight: '700' }}>{chip.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Summary typewriter */}
                {typedSummary && !setupRequired && (
                  <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', padding: '9px 11px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {typedSummary}<span style={{ opacity: 0.4, animation: 'blink 1s infinite' }}>|</span>
                  </div>
                )}
              </div>

              {/* Scrollable content */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {/* ── Setup screen ── */}
                {setupRequired && (
                  <SetupScreen userId={user!._id} onDone={() => { setSetupRequired(false); fetchInsights(); }} />
                )}

                {/* ── Loading ── */}
                {!setupRequired && loading && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '48px 0' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} style={{ fontSize: '36px' }}>⟳</motion.div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textAlign: 'center' }}>
                      Analyzing your dhaba's data...<br />
                      <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Reading orders, inventory, table status</span>
                    </p>
                  </div>
                )}

                {/* ── Error ── */}
                {!setupRequired && !loading && error && (
                  <div style={{ margin: '16px', padding: '18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '12px' }}>⚠ {error}</p>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={fetchInsights}
                        style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>
                        ⟳ Retry
                      </button>
                      <button onClick={() => { setSetupRequired(true); setError(null); }}
                        style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.8rem' }}>
                        Change Key
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Insights ── */}
                {!setupRequired && !loading && !error && aiData && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}>
                    {aiData.insights.map((insight, idx) => {
                      const style = typeColors[insight.type] || typeColors.tip;
                      const isExpanded = activeInsight === insight.id;
                      return (
                        <motion.div key={insight.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
                          onClick={() => setActiveInsight(isExpanded ? null : insight.id)}
                          style={{ padding: '13px 15px', borderRadius: '14px', background: style.bg, border: `1px solid ${style.border}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ fontSize: '20px', flexShrink: 0, lineHeight: 1 }}>{insight.icon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.08em', color: style.text, padding: '2px 6px', borderRadius: '20px', background: `${style.dot}22`, border: `1px solid ${style.border}`, textTransform: 'uppercase' }}>{insight.type}</span>
                                <span style={{ fontSize: '0.58rem', fontWeight: '700', color: insight.priority === 'high' ? '#f87171' : insight.priority === 'medium' ? '#fbbf24' : 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
                                  {insight.priority === 'high' ? '🔴 HIGH' : insight.priority === 'medium' ? '🟡 MED' : 'LOW'}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'white', marginBottom: isExpanded ? '8px' : 0, lineHeight: '1.3' }}>{insight.title}</p>
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                    <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', lineHeight: '1.6', marginBottom: insight.action ? '10px' : 0 }}>{insight.description}</p>
                                    {insight.action && (
                                      <button style={{ padding: '5px 12px', background: `${style.dot}22`, border: `1px solid ${style.border}`, borderRadius: '8px', color: style.text, fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}>{insight.action}</button>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', flexShrink: 0, marginTop: '2px' }}>{isExpanded ? '▲' : '▼'}</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {!setupRequired && !loading && !error && !aiData && (
                  <div style={{ textAlign: 'center', padding: '48px 0' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>✦</div>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>AI is warming up...</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {!setupRequired && (
                <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <button onClick={() => { setSetupRequired(true); setAiData(null); setTypedSummary(''); }}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🔑 Change Key
                  </button>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)' }}>
                    {aiData ? `Updated ${new Date(aiData.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Gemini AI'}
                  </span>
                  <button onClick={fetchInsights} disabled={loading}
                    style={{ padding: '5px 12px', background: loading ? 'rgba(255,255,255,0.03)' : 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: loading ? 'rgba(255,255,255,0.2)' : '#a5b4fc', fontSize: '0.72rem', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}>
                    {loading ? '⟳...' : '⟳ Refresh'}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </>
  );
}
