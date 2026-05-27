'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Lock, Store, Utensils, Pill, Database, Loader2 } from 'lucide-react';

const ICONS = {
  Restaurant: Utensils,
  Kirana: Store,
  Medical: Pill
};

const COLORS = {
  Restaurant: '#fc8019',
  Kirana: '#0070f3',
  Medical: '#4ade80'
};

export default function LoginPage() {
  const { login } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');

  const [isRegistering, setIsRegistering] = useState(false);
  const [regForm, setRegForm] = useState({
    email: '', name: '', businessName: '', businessType: 'Restaurant', location: '', password: ''
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSeed = async () => {
    try {
      setSeeding(true);
      setError('');
      const res = await fetch('/api/seed');
      const data = await res.json();
      if (res.ok) {
        await fetchUsers(); // Re-fetch inserted users
      } else {
        setError(data.error || 'Failed to seed database');
      }
    } catch (err: any) {
      setError(err.message || 'Network error during seeding');
    } finally {
      setSeeding(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    try {
      setError('');
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser._id, password: pin })
      });
      
      const data = await res.json();
      if (res.ok) {
        login(data);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network Error during login');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm)
      });
      
      const data = await res.json();
      if (res.ok) {
        setIsRegistering(false);
        await fetchUsers(); // Refresh store list immediately
      } else {
        setError(data.error || 'Failed to create business profile');
      }
    } catch (err: any) {
      setError(err.message || 'Network error during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 50%, #111 0%, #000 100%)',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100vw',
      zIndex: 1000
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(0,112,243,0.15) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(252,128,25,0.1) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(40px)' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-dark" 
        style={{ width: '100%', maxWidth: '440px', padding: '40px', position: 'relative', zIndex: 10, overflow: 'hidden' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            background: 'var(--accent)', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '1.5rem',
            fontWeight: '800',
            boxShadow: '0 0 20px var(--accent-glow)'
          }}>R</div>
          <h1 className="text-gradient pulse" style={{ fontSize: '2rem', marginBottom: '8px' }}>Restrofy</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
            {isRegistering ? 'Register your business on Restrofy' : 'Select your business account to continue'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(248, 113, 113, 0.1)', color: '#f87171', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {isRegistering ? (
            <motion.form 
              key="register"
              initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }}
              onSubmit={handleRegister} 
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div>
                <input type="email" placeholder="Email Address" required value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} style={{ width: '100%', padding: '14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input type="text" placeholder="Owner Name" required value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} style={{ width: '100%', padding: '14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }} />
                <input type="text" placeholder="Business Name" required value={regForm.businessName} onChange={e => setRegForm({...regForm, businessName: e.target.value})} style={{ width: '100%', padding: '14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }} />
              </div>
              <div>
                <select value={regForm.businessType} onChange={e => setRegForm({...regForm, businessType: e.target.value as any})} style={{ width: '100%', padding: '14px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Kirana">Kirana / Grocery</option>
                  <option value="Medical">Medical / Pharmacy</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input type="text" placeholder="Location City" value={regForm.location} onChange={e => setRegForm({...regForm, location: e.target.value})} style={{ width: '100%', padding: '14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }} />
                <input type="password" placeholder="Create PIN (4 Digits)" required value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} style={{ width: '100%', padding: '14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }} />
              </div>

              <button 
                type="submit"
                disabled={loading}
                style={{ 
                  marginTop: '12px', padding: '16px', background: 'var(--accent)', color: 'white',
                  border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer'
                }}
              >
                {loading ? 'Creating Store...' : 'Register Business'}
              </button>
              
              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginTop: '8px', cursor: 'pointer' }} onClick={() => setIsRegistering(false)}>
                Already have a store? Sign in
              </p>
            </motion.form>
          ) : loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <Loader2 className="pulse" size={32} color="var(--accent)" />
            </motion.div>
          ) : users.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '20px' }}>
              <p style={{ marginBottom: '20px', color: 'rgba(255,255,255,0.7)' }}>No businesses found in MongoDB.</p>
              <button 
                onClick={handleSeed}
                disabled={seeding}
                style={{ width: '100%', padding: '16px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {seeding ? <Loader2 size={18} className="pulse" /> : <Database size={18} />}
                {seeding ? 'Seeding Database...' : 'Seed Initial Data'}
              </button>
              <p style={{ marginTop: '20px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => setIsRegistering(true)}>
                Or manually Register a new Store
              </p>
            </motion.div>
          ) : (
            <motion.form key="login" initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 50, opacity: 0 }} onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto' }}>
                {users.map(user => {
                  const Icon = ICONS[user.businessType as keyof typeof ICONS] || Store;
                  const color = COLORS[user.businessType as keyof typeof COLORS] || '#fff';
                  return (
                    <div 
                      key={user._id}
                      onClick={() => setSelectedUser({...user, color})}
                      style={{
                        padding: '16px', borderRadius: '16px',
                        border: `1px solid ${selectedUser?._id === user._id ? color : 'rgba(255,255,255,0.1)'}`,
                        background: selectedUser?._id === user._id ? `${color}15` : 'rgba(255,255,255,0.02)',
                        display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{user.name}</h3>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{user.businessType}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <AnimatePresence>
                {selectedUser && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <div style={{ position: 'relative', marginTop: '12px' }}>
                      <Lock size={16} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '16px', top: '16px' }} />
                      <input 
                        type="password" placeholder="Enter PIN" value={pin} onChange={(e) => setPin(e.target.value)} required
                        style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 14px 14px 44px', borderRadius: '12px', color: 'white', fontSize: '1rem' }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                type="submit" disabled={!selectedUser}
                style={{ 
                  marginTop: '12px', padding: '16px', background: selectedUser ? selectedUser.color : 'rgba(255,255,255,0.1)',
                  color: selectedUser ? '#fff' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: '600', cursor: selectedUser ? 'pointer' : 'not-allowed', boxShadow: selectedUser ? `0 0 20px ${selectedUser.color}40` : 'none'
                }}
              >
                Sign In to Dashboard
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginTop: '8px', cursor: 'pointer' }} onClick={() => setIsRegistering(true)}>
                Need another store? Register Business
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
