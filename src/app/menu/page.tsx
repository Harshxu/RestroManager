'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Edit2,
  Trash2,
  CheckCircle2,
  Utensils,
  Clock,
  Info
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';

export default function MenuPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', price: 0, category: 'Main Course', description: '', preparationTime: 15, isAvailable: true });
  const [useCustomCategory, setUseCustomCategory] = useState(false);

  const uniqueCategories = Array.from(new Set(menuItems.map((i:any) => i.category)));

  const fetchMenuItems = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const dealerId = user?.dealerId?._id || user?.dealerId;
      const res = await fetch(`/api/menu?userId=${user._id}&dealerId=${dealerId}`);
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data);
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching menu items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, [user]);

  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to delete this menu dish?")) return;
    try {
      const res = await fetch(`/api/menu?id=${id}`, { method: 'DELETE' });
      if(res.ok) fetchMenuItems();
    } catch(e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      const payload = {
        ...formData,
        userId: user._id,
        businessType: user.businessType
      };

      let res;
      if (editingItem) {
        res = await fetch('/api/menu', {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({...payload, _id: editingItem._id})
        });
      } else {
        res = await fetch('/api/menu', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        });
      }

      if(res?.ok) {
        setIsModalOpen(false);
        setEditingItem(null);
        fetchMenuItems();
      } else {
        const d = await res?.json();
        alert(d.error);
      }
    } catch(e) {
      console.error(e);
    }
  };

  const filtered = menuItems.filter(item => {
    return item.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      <header style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Utensils size={32} /> Restaurant Menu
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Manage sellable dishes, prices, categories, and availability.</p>
          </div>
          <button 
            onClick={() => {
              setEditingItem(null);
              setUseCustomCategory(false);
              setFormData({ name: '', price: 0, category: uniqueCategories[0] as string || 'Main Course', description: '', preparationTime: 15, isAvailable: true });
              setIsModalOpen(true);
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
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(var(--accent-rgb), 0.4)',
              transition: 'transform 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Plus size={20} /> Add Dish
          </button>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ 
            flex: 1, 
            background: 'rgba(255,255,255,0.05)', 
            borderRadius: '12px', 
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <Search size={18} color="rgba(255,255,255,0.4)" />
            <input 
              type="text" 
              placeholder="Search dishes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%' }}
            />
          </div>
        </div>
      </header>

      <div className="glass-dark" style={{ borderRadius: '24px', overflow: 'hidden', padding: '0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
              <th style={{ padding: '24px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>DISH</th>
              <th style={{ padding: '24px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>PREP TIME</th>
              <th style={{ padding: '24px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>PRICE</th>
              <th style={{ padding: '24px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>STATUS</th>
              <th style={{ padding: '24px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode='popLayout'>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '80px', textAlign: 'center' }}><div className="pulse" style={{ color: 'var(--accent)', fontWeight: 600 }}>Syncing Menu...</div></td></tr>
            ) : error ? (
              <tr><td colSpan={5} style={{ padding: '80px', textAlign: 'center', color: '#f87171' }}>{error}</td></tr>
            ) : filtered.map((item, i) => {
              return (
              <motion.tr 
                key={item._id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '12px', 
                      background: 'rgba(252, 128, 25, 0.1)',
                      border: '1px solid rgba(252, 128, 25, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Utensils size={24} color="var(--accent)" />
                    </div>
                    <div>
                      <p style={{ fontWeight: '700', fontSize: '1.05rem', color: '#fff' }}>{item.name}</p>
                      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{item.category} • {item.description || 'No description'}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '20px 24px', fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={16} /> {item.preparationTime || 15} mins</span>
                </td>
                <td style={{ padding: '20px 24px', fontWeight: '800', fontSize: '1.1rem' }}>₹{item.price}</td>
                <td style={{ padding: '20px 24px' }}>
                  <span style={{ 
                    padding: '6px 12px', 
                    borderRadius: '20px', 
                    fontSize: '0.8rem', 
                    fontWeight: '700',
                    background: item.isAvailable ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                    color: item.isAvailable ? '#4ade80' : '#f87171',
                    border: `1px solid ${item.isAvailable ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: 'fit-content'
                  }}>
                    {item.isAvailable ? <CheckCircle2 size={14} /> : <Info size={14} />}
                    {item.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </td>
                <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => {
                        setEditingItem(item);
                        setUseCustomCategory(false);
                        setFormData({ 
                           name: item.name || '', 
                           price: item.price || 0, 
                           category: item.category || '',
                           description: item.description || '',
                           preparationTime: item.preparationTime || 15,
                           isAvailable: item.isAvailable !== false
                        });
                        setIsModalOpen(true);
                      }}
                      title="Edit Dish"
                      style={{ 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        color: 'white', 
                        cursor: 'pointer', 
                        width: '36px', height: '36px', borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    ><Edit2 size={16} /></button>
                    <button 
                      onClick={() => handleDelete(item._id)}
                      title="Delete Dish"
                      style={{ 
                        background: 'rgba(248, 113, 113, 0.1)', 
                        border: '1px solid rgba(248, 113, 113, 0.2)', 
                        color: '#f87171', 
                        cursor: 'pointer', 
                        width: '36px', height: '36px', borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(248, 113, 113, 0.2)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)'}
                    ><Trash2 size={16} /></button>
                  </div>
                </td>
              </motion.tr>
              );
            })}
            </AnimatePresence>
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '80px', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
            <Utensils size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
            <p>No dishes found matching your search</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-dark" 
              style={{ padding: '40px', borderRadius: '32px', width: '100%', maxWidth: '550px', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <h2 style={{ marginBottom: '32px', fontSize: '1.8rem' }}>{editingItem ? 'Edit Dish' : 'Add New Dish'}</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Dish Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Description</label>
                <input type="text" placeholder="e.g. Traditional clay oven naan" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Price (₹)</label>
                  <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Prep Time (mins)</label>
                  <input type="number" value={formData.preparationTime} onChange={e => setFormData({...formData, preparationTime: Number(e.target.value)})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Category</label>
                  {!useCustomCategory ? (
                    <select 
                      value={formData.category} 
                      onChange={e => {
                        if (e.target.value === 'ADD_NEW') {
                          setUseCustomCategory(true);
                          setFormData({...formData, category: ''});
                        } else {
                          setFormData({...formData, category: e.target.value});
                        }
                      }} 
                      style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                    >
                      {uniqueCategories.map((c: any) => <option key={c} value={c}>{c}</option>)}
                      <option value="ADD_NEW">+ Add New Category</option>
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      placeholder="Type custom category..." 
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})} 
                      autoFocus
                      style={{ width: '100%', padding: '12px', background: 'var(--accent)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', color: 'white' }} 
                    />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Availability Status</label>
                  <select value={formData.isAvailable ? 'true' : 'false'} onChange={e => setFormData({...formData, isAvailable: e.target.value === 'true'})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}>
                    <option value="true">Available</option>
                    <option value="false">Unavailable</option>
                  </select>
                </div>
              </div>
            </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '40px' }}>
                <button onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '16px', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'} onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}>Cancel</button>
                <button onClick={handleSave} style={{ flex: 1, padding: '16px', background: 'var(--accent)', border: 'none', color: 'white', borderRadius: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 25px rgba(var(--accent-rgb), 0.4)', transition: 'transform 0.2s' }} onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>Save Dish</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
