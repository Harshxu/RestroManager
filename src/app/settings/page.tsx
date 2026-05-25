'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  LayoutGrid,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const SECTION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Main Hall':   { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)',  text: '#60a5fa' },
  'AC Room':     { bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.25)',  text: '#c084fc' },
  'Rooftop':     { bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)',  text: '#fbbf24' },
  'Garden':      { bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.25)',  text: '#4ade80' },
  'Outdoor':     { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)',  text: '#fb923c' },
  'VIP':         { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   text: '#f87171' },
  'Default':     { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)',  text: 'rgba(255,255,255,0.6)' },
};

function getSectionColor(section: string) {
  return SECTION_COLORS[section] || SECTION_COLORS['Default'];
}

const integrations = [
  { name: 'Swiggy', status: 'Connected', icon: ExternalLink, color: '#fc8019' },
  { name: 'Zomato', status: 'Pending',   icon: ExternalLink, color: '#cb202d' },
  { name: 'Blinkit', status: 'Disconnected', icon: ExternalLink, color: '#f8c01c' },
  { name: 'Zepto',  status: 'Connected', icon: ExternalLink, color: '#9c27b0' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const isRestaurant = user?.businessType === 'Restaurant';

  // ── Tables state ──
  const [tables, setTables] = useState<any[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ number: '', section: '', seatingCapacity: 4 });
  const [savingId, setSavingId] = useState<string | null>(null);

  // Add section modal
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSection, setNewSection] = useState('');
  const [newSectionCount, setNewSectionCount] = useState(4);
  const [newSectionCapacity, setNewSectionCapacity] = useState(4);
  const [addingSection, setAddingSection] = useState(false);

  const fetchTables = async () => {
    if (!user?._id) return;
    setTablesLoading(true);
    try {
      const res = await fetch(`/api/tables?userId=${user._id}`);
      if (res.ok) setTables(await res.json());
    } catch (e) {}
    setTablesLoading(false);
  };

  useEffect(() => { if (user?._id) fetchTables(); }, [user?._id]);

  // Group tables by section
  const sections = tables.reduce<Record<string, any[]>>((acc, t) => {
    const s = t.section || 'Main Hall';
    if (!acc[s]) acc[s] = [];
    acc[s].push(t);
    return acc;
  }, {});

  const startEdit = (table: any) => {
    setEditingId(table._id);
    setEditForm({ number: table.number, section: table.section || 'Main Hall', seatingCapacity: table.seatingCapacity || 4 });
  };

  const saveEdit = async (tableId: string) => {
    setSavingId(tableId);
    await fetch('/api/tables', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: tableId, ...editForm }),
    });
    setEditingId(null);
    setSavingId(null);
    fetchTables();
  };

  const deleteTable = async (tableId: string, tableNum: string) => {
    if (!confirm(`Delete Table ${tableNum}? This will remove it from the floor plan.`)) return;
    await fetch(`/api/tables?id=${tableId}`, { method: 'DELETE' });
    fetchTables();
  };

  const addSection = async () => {
    if (!newSection.trim() || newSectionCount < 1) return;
    setAddingSection(true);
    const existingNums = tables.map(t => {
      const m = t.number.match(/\d+/);
      return m ? parseInt(m[0]) : 0;
    });
    let maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
    for (let i = 0; i < newSectionCount; i++) {
      maxNum++;
      await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?._id,
          number: String(maxNum),
          section: newSection.trim(),
          seatingCapacity: newSectionCapacity,
          status: 'free',
        }),
      });
    }
    setShowAddSection(false);
    setNewSection('');
    setNewSectionCount(4);
    setNewSectionCapacity(4);
    setAddingSection(false);
    fetchTables();
  };

  const deleteSection = async (sectionName: string) => {
    const sectionTables = sections[sectionName] || [];
    const busy = sectionTables.filter((t: any) => t.status === 'occupied');
    if (busy.length > 0) {
      alert(`${busy.length} table(s) in "${sectionName}" are occupied. Clear them first.`);
      return;
    }
    if (!confirm(`Delete all ${sectionTables.length} tables in "${sectionName}"?`)) return;
    for (const t of sectionTables) {
      await fetch(`/api/tables?id=${t._id}`, { method: 'DELETE' });
    }
    fetchTables();
  };

  return (
    <div style={{ maxWidth: '860px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Settings</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Configure your business and manage third-party integrations.</p>
      </header>

      {/* ── Table Layout — restaurant only ── */}
      {isRestaurant && (
        <section className="glass-dark" style={{ padding: '32px', borderRadius: '24px', marginBottom: '32px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <LayoutGrid size={20} style={{ color: 'var(--accent)' }} /> Table Layout
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>
                {tables.length} tables · {Object.keys(sections).length} sections
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowAddSection(true)}
              style={{
                padding: '10px 18px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white', fontWeight: '700', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.85rem',
                boxShadow: '0 6px 20px rgba(99,102,241,0.35)',
              }}
            >
              <Plus size={16} /> Add Section
            </motion.button>
          </div>

          {tablesLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>
              <div className="pulse">Loading tables...</div>
            </div>
          ) : tables.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.2)' }}>
              <LayoutGrid size={40} style={{ marginBottom: '12px', opacity: 0.15 }} />
              <p style={{ fontSize: '0.95rem' }}>No tables set up yet.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '6px' }}>Click "Add Section" to create your floor plan.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {Object.entries(sections).map(([sectionName, sectionTables]) => {
                const col = getSectionColor(sectionName);
                const occupiedCount = sectionTables.filter((t: any) => t.status === 'occupied').length;
                return (
                  <div key={sectionName}>
                    {/* Section header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: col.text, boxShadow: `0 0 8px ${col.text}` }} />
                        <span style={{ fontWeight: '700', fontSize: '0.95rem', color: col.text }}>{sectionName}</span>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>
                          {sectionTables.length} tables · {occupiedCount} occupied
                        </span>
                      </div>
                      <button
                        onClick={() => deleteSection(sectionName)}
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Trash2 size={12} /> Remove Section
                      </button>
                    </div>

                    {/* Tables grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                      {sectionTables.map((table: any) => {
                        const isEditing = editingId === table._id;
                        const isSaving = savingId === table._id;
                        const isOccupied = table.status === 'occupied';

                        return (
                          <motion.div
                            key={table._id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{
                              padding: '14px 16px',
                              borderRadius: '14px',
                              background: isOccupied ? 'rgba(74,222,128,0.04)' : col.bg,
                              border: `1px solid ${isOccupied ? 'rgba(74,222,128,0.2)' : col.border}`,
                              transition: 'all 0.2s',
                            }}
                          >
                            {isEditing ? (
                              /* Edit mode */
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div>
                                  <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: '3px', fontWeight: '600', textTransform: 'uppercase' }}>Table #</label>
                                  <input
                                    value={editForm.number}
                                    onChange={e => setEditForm(f => ({ ...f, number: e.target.value }))}
                                    style={{ width: '100%', padding: '6px 8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '7px', color: 'white', fontSize: '0.85rem' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: '3px', fontWeight: '600', textTransform: 'uppercase' }}>Section</label>
                                  <input
                                    value={editForm.section}
                                    onChange={e => setEditForm(f => ({ ...f, section: e.target.value }))}
                                    style={{ width: '100%', padding: '6px 8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '7px', color: 'white', fontSize: '0.85rem' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: '3px', fontWeight: '600', textTransform: 'uppercase' }}>Seats</label>
                                  <input
                                    type="number" min={1} max={20}
                                    value={editForm.seatingCapacity}
                                    onChange={e => setEditForm(f => ({ ...f, seatingCapacity: Number(e.target.value) }))}
                                    style={{ width: '100%', padding: '6px 8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '7px', color: 'white', fontSize: '0.85rem' }}
                                  />
                                </div>
                                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                  <button onClick={() => saveEdit(table._id)} disabled={isSaving}
                                    style={{ flex: 1, padding: '7px', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', color: '#4ade80', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                    <Check size={13} /> {isSaving ? '...' : 'Save'}
                                  </button>
                                  <button onClick={() => setEditingId(null)}
                                    style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={13} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* View mode */
                              <div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                                  <div>
                                    <p style={{ fontWeight: '800', fontSize: '1.1rem', color: 'white', lineHeight: 1 }}>
                                      Table {table.number}
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                                      <Users size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
                                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>{table.seatingCapacity || 4} seats</span>
                                    </div>
                                  </div>
                                  <span style={{
                                    fontSize: '0.65rem', fontWeight: '700', padding: '3px 8px', borderRadius: '20px',
                                    background: isOccupied ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)',
                                    color: isOccupied ? '#4ade80' : 'rgba(255,255,255,0.25)',
                                    border: `1px solid ${isOccupied ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.08)'}`,
                                  }}>
                                    {isOccupied ? '● Busy' : '○ Free'}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    onClick={() => startEdit(table)}
                                    disabled={isOccupied}
                                    title={isOccupied ? 'Table is occupied' : 'Edit table'}
                                    style={{ flex: 1, padding: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', color: isOccupied ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)', cursor: isOccupied ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: '600' }}>
                                    <Edit2 size={11} /> Edit
                                  </button>
                                  <button
                                    onClick={() => deleteTable(table._id, table.number)}
                                    disabled={isOccupied}
                                    title={isOccupied ? 'Table is occupied' : 'Delete table'}
                                    style={{ padding: '6px 8px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '7px', color: isOccupied ? 'rgba(239,68,68,0.2)' : '#f87171', cursor: isOccupied ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Delivery Integrations ── */}
      <section className="glass-dark" style={{ padding: '32px', borderRadius: '24px', marginBottom: '32px' }}>
        <h3 style={{ marginBottom: '24px' }}>Delivery Integrations</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
          {integrations.map(app => (
            <div key={app.name} style={{ background: 'rgba(255,255,255,0.02)', padding: '24px 20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = app.color; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}>
              <div style={{ width: '48px', height: '48px', background: app.color, borderRadius: '12px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: `0 4px 15px ${app.color}40` }}>
                <app.icon size={24} />
              </div>
              <h4 style={{ marginBottom: '6px', fontSize: '1.1rem' }}>{app.name}</h4>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: app.status === 'Connected' ? '#4ade80' : app.status === 'Pending' ? '#facc15' : 'rgba(255,255,255,0.3)' }}>{app.status}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Business Profile ── */}
      <section className="glass-dark" style={{ padding: '32px', borderRadius: '24px' }}>
        <h3 style={{ marginBottom: '24px' }}>Business Profile</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px' }}>Store Name</label>
              <input type="text" defaultValue={user?.businessName || ''} style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px', color: 'white', outline: 'none', transition: 'border 0.2s', fontSize: '1rem' }} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px' }}>Business Type</label>
              <select defaultValue={user?.businessType} style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px', color: 'white', outline: 'none', fontSize: '1rem', appearance: 'none' }} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}>
                <option value="Restaurant">Restaurant</option>
                <option value="Kirana">Kirana</option>
                <option value="Medical">Medical</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px' }}>UPI ID for Payments</label>
            <input type="text" placeholder="harsh@upi" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px', color: 'white', outline: 'none', transition: 'border 0.2s', fontSize: '1rem' }} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
          </div>
          <button style={{ marginTop: '8px', background: 'var(--accent)', color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 8px 25px rgba(var(--accent-rgb), 0.4)', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
            Save Changes
          </button>
        </div>
      </section>

      {/* ── Add Section Modal ── */}
      <AnimatePresence>
        {showAddSection && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-dark"
              style={{ padding: '36px', borderRadius: '28px', width: '100%', maxWidth: '440px', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <h2 style={{ marginBottom: '6px', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <LayoutGrid size={22} style={{ color: 'var(--accent)' }} /> Add Section
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', marginBottom: '28px' }}>
                e.g. "Rooftop", "AC Room", "Garden"
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Quick section name presets based on existing sections only */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                    {Object.keys(sections).length > 0 ? 'Select Existing Section' : 'Section Name'}
                  </label>
                  
                  {Object.keys(sections).length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '12px' }}>
                      {Object.keys(sections).map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setNewSection(preset)}
                          style={{
                            padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600',
                            background: newSection === preset ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                            border: newSection === preset ? 'none' : '1px solid rgba(255,255,255,0.08)',
                            color: newSection === preset ? 'white' : 'rgba(255,255,255,0.5)',
                            transition: 'all 0.15s',
                          }}>
                          {preset}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginBottom: '12px' }}>
                      No sections exist yet. Enter a name below to create your first section.
                    </p>
                  )}

                  <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                      {Object.keys(sections).length > 0 ? 'Or Add a New Section' : 'New Section Name'}
                    </label>
                    <input
                      type="text"
                      placeholder="Type a new section name (e.g. AC Room, Rooftop)..."
                      value={newSection}
                      onChange={e => setNewSection(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Number of Tables</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button onClick={() => setNewSectionCount(c => Math.max(1, c - 1))}
                        style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                      <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'white', minWidth: '40px', textAlign: 'center' }}>{newSectionCount}</span>
                      <button onClick={() => setNewSectionCount(c => Math.min(20, c + 1))}
                        style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Seats per Table</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button onClick={() => setNewSectionCapacity(c => Math.max(1, c - 1))}
                        style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                      <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'white', minWidth: '40px', textAlign: 'center' }}>{newSectionCapacity}</span>
                      <button onClick={() => setNewSectionCapacity(c => Math.min(20, c + 1))}
                        style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {newSection && (
                  <div style={{ padding: '12px 14px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '0.78rem', color: '#a5b4fc' }}>
                      Will create <strong>{newSectionCount}</strong> table{newSectionCount > 1 ? 's' : ''} in <strong>"{newSection}"</strong> with <strong>{newSectionCapacity}</strong> seats each
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
                <button onClick={() => setShowAddSection(false)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button
                  onClick={addSection}
                  disabled={addingSection || !newSection.trim()}
                  style={{ flex: 2, padding: '14px', background: newSection.trim() ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: newSection.trim() ? 'white' : 'rgba(255,255,255,0.2)', cursor: newSection.trim() ? 'pointer' : 'not-allowed', fontWeight: '700', fontSize: '0.95rem', boxShadow: newSection.trim() ? '0 8px 24px rgba(99,102,241,0.35)' : 'none' }}>
                  {addingSection ? `Creating ${newSectionCount} tables...` : `Create ${newSectionCount} Table${newSectionCount > 1 ? 's' : ''}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
