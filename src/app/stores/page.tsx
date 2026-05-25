'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, 
  MapPin, 
  Phone,
  Utensils, 
  Pill,
  Plus,
  Loader2,
  TrendingUp,
  Mail
} from 'lucide-react';
import { useRouter } from 'next/navigation';

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

export default function StoresPage() {
  const router = useRouter();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/auth/users');
        if (res.ok) {
          const data = await res.json();
          setStores(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Store Management</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Manage all active branches and business accounts.</p>
        </div>
        <button 
          onClick={() => {
             // Forcing logout essentially to go back to unified login/register hub. 
             // Ideally we would build a dedicated register modal here, but reusing login works!
             localStorage.removeItem('user');
             router.push('/login');
          }}
          style={{ 
            background: 'var(--accent)', 
            color: 'white', 
            border: 'none', 
            padding: '12px 24px', 
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 0 20px var(--accent-glow)'
          }}
        >
          <Plus size={20} /> Register New Store
        </button>
      </header>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
          <Loader2 className="pulse" size={48} color="var(--accent)" />
        </div>
      ) : stores.length === 0 ? (
        <div style={{ padding: '80px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
           <Store size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
           <p>No stores registered. Please create one.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          <AnimatePresence>
            {stores.map((store, index) => {
              const Icon = ICONS[store.businessType as keyof typeof ICONS] || Store;
              const color = COLORS[store.businessType as keyof typeof COLORS] || '#fff';
              
              return (
                <motion.div
                  key={store._id}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="card-gradient"
                  style={{
                    padding: '24px',
                    borderRadius: '24px',
                    position: 'relative',
                    overflow: 'hidden',
                    borderTop: `4px solid ${color}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                       <div style={{ 
                         width: '48px', height: '48px', borderRadius: '14px', 
                         background: `${color}15`, color: color,
                         display: 'flex', alignItems: 'center', justifyContent: 'center'
                       }}>
                         <Icon size={24} />
                       </div>
                       <div>
                         <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{store.name}</h3>
                         <span style={{ 
                           background: `${color}20`, color: color, padding: '4px 10px', 
                           borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase'
                         }}>
                           {store.businessType}
                         </span>
                       </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '16px' }}>
                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                       <MapPin size={16} color="var(--accent)" />
                       {store.location || 'Location Not Set'}
                     </div>
                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                       <Mail size={16} color="var(--accent)" />
                       {store.email}
                     </div>
                     <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                       <Phone size={16} color="var(--accent)" />
                       {store.phone || '+91 XXXX XXXXX'}
                     </div>
                  </div>

                  <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                     <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Status</p>
                        <p style={{ color: '#4ade80', fontWeight: '600', fontSize: '0.9rem' }}>Active</p>
                     </div>
                     <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Joined</p>
                        <p style={{ color: 'white', fontWeight: '600', fontSize: '0.9rem' }}>{new Date(store.createdAt).toLocaleDateString()}</p>
                     </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
