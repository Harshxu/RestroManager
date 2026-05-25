'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  AlertCircle,
  Edit2,
  Trash2,
  CheckCircle2
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';

export default function InventoryPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', sku: '', price: 0, stock: 0, category: 'General', unit: 'Kg', minStock: 5, supplier: '' });
  const [useCustomCategory, setUseCustomCategory] = useState(false);

  const uniqueCategories = Array.from(new Set(inventory.map((i:any) => i.category)));

  const fetchInventory = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const dealerId = user?.dealerId?._id || user?.dealerId;
      const res = await fetch(`/api/inventory?userId=${user._id}&dealerId=${dealerId}`);
      if (res.ok) {
        const data = await res.json();
        const normalized = data.map((item: any) => ({
          ...item,
          price: item.price || item.sellingPrice || 0
        }));
        setInventory(normalized);
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [user]);

  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to delete this specific Stock item?")) return;
    try {
      const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      if(res.ok) fetchInventory();
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
        res = await fetch('/api/inventory', {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({...payload, _id: editingItem._id})
        });
      } else {
        res = await fetch('/api/inventory', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({...payload, sku: formData.sku || `SKU-${Math.floor(Math.random()*10000)}`})
        });
      }

      if(res?.ok) {
        setIsModalOpen(false);
        setEditingItem(null);
        fetchInventory();
      } else {
        const d = await res?.json();
        alert(d.error);
      }
    } catch(e) {
      console.error(e);
    }
  };

  const filtered = inventory.filter(item => {
    return item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      <header style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem' }}>Inventory</h1>
          <button 
            onClick={() => {
              setEditingItem(null);
              setUseCustomCategory(false);
              setFormData({ name: '', sku: '', price: 0, stock: 0, category: uniqueCategories[0] as string || 'General', unit: 'Kg', minStock: 5, supplier: '' });
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
            <Plus size={20} /> {user?.businessType === 'Restaurant' ? 'Add Ingredient' : 'Add Product'}
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
              placeholder={`Search ${user?.businessType || ''} items...`}
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
              <th style={{ padding: '20px 16px 20px 24px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', width: '48px' }}>#</th>
              <th style={{ padding: '20px 24px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>ITEM</th>
              <th style={{ padding: '20px 24px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>STOCK</th>
              <th style={{ padding: '20px 24px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>COST</th>
              <th style={{ padding: '20px 24px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>SUPPLIER</th>
              <th style={{ padding: '20px 24px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>STATUS</th>
              <th style={{ padding: '20px 24px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode='popLayout'>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '80px', textAlign: 'center' }}><div className="pulse" style={{ color: 'var(--accent)', fontWeight: 600 }}>Syncing Real DB Data...</div></td></tr>
            ) : error ? (
              <tr><td colSpan={7} style={{ padding: '80px', textAlign: 'center', color: '#f87171' }}>{error}</td></tr>
            ) : filtered.map((item, i) => {
              const status = item.stock > (item.minStock || 5) ? 'In Stock' : item.stock > 0 ? 'Low Stock' : 'Out of Stock';
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
                {/* Row index */}
                <td style={{ padding: '16px 8px 16px 24px', color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', fontWeight: '600', width: '48px' }}>
                  {i + 1}
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ 
                      width: '44px', 
                      height: '44px', 
                      borderRadius: '12px', 
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Package size={22} color="var(--accent)" />
                    </div>
                    <div>
                      <p style={{ fontWeight: '700', fontSize: '1rem', color: '#fff' }}>{item.name}</p>
                      <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>{item.category} · min alert: {item.minStock || 5} {item.unit}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px 24px', fontWeight: '700', fontSize: '1.05rem' }}>
                  {item.stock} <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{item.unit || 'Piece'}</span>
                </td>
                <td style={{ padding: '16px 24px', fontWeight: '800', fontSize: '1.05rem' }}>₹{item.price || item.sellingPrice || 0} <span style={{ fontSize: '0.78rem', fontWeight: 'normal', color: 'rgba(255,255,255,0.4)' }}>/{item.unit || 'Piece'}</span></td>
                <td style={{ padding: '16px 24px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                  {item.supplier || <span style={{ opacity: 0.3 }}>—</span>}
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ 
                    padding: '5px 12px', 
                    borderRadius: '20px', 
                    fontSize: '0.78rem', 
                    fontWeight: '700',
                    background: status === 'In Stock' ? 'rgba(74, 222, 128, 0.12)' : 
                                status === 'Low Stock' ? 'rgba(250, 204, 21, 0.12)' : 
                                'rgba(248, 113, 113, 0.12)',
                    color: status === 'In Stock' ? '#4ade80' : 
                           status === 'Low Stock' ? '#facc15' : 
                           '#f87171',
                    border: `1px solid ${status === 'In Stock' ? 'rgba(74, 222, 128, 0.25)' : status === 'Low Stock' ? 'rgba(250, 204, 21, 0.25)' : 'rgba(248, 113, 113, 0.25)'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}>
                    {status === 'Low Stock' && <AlertCircle size={12} />}
                    {status === 'In Stock' && <CheckCircle2 size={12} />}
                    {status}
                  </span>
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => {
                        setEditingItem(item);
                        setUseCustomCategory(false);
                        setFormData({ 
                           name: item.name || '', sku: item.sku || '', price: item.price || item.sellingPrice || 0, stock: item.stock || 0, 
                           category: item.category || '', unit: item.unit || 'Kg', minStock: item.minStock || 5, supplier: item.supplier || ''
                        });
                        setIsModalOpen(true);
                      }}
                      title="Edit Item"
                      style={{ 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        color: 'white', 
                        cursor: 'pointer', 
                        width: '34px', height: '34px', borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    ><Edit2 size={15} /></button>
                    <button 
                      onClick={() => handleDelete(item._id)}
                      title="Delete Item"
                      style={{ 
                        background: 'rgba(248, 113, 113, 0.08)', 
                        border: '1px solid rgba(248, 113, 113, 0.2)', 
                        color: '#f87171', 
                        cursor: 'pointer', 
                        width: '34px', height: '34px', borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(248, 113, 113, 0.18)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(248, 113, 113, 0.08)'}
                    ><Trash2 size={15} /></button>
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
            <Package size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
            <p>No products found matching your search</p>
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
              <h2 style={{ marginBottom: '32px', fontSize: '1.8rem' }}>{editingItem ? 'Edit Item' : user?.businessType === 'Restaurant' ? 'Add Raw Ingredient' : 'Add Product'}</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Product Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Price (₹)</label>
                  <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Stock Quantity</label>
                  <input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>SKU Code</label>
                  <input type="text" placeholder="Auto-generated if blank" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Unit Type</label>
                  <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}>
                    <option value="Piece">Piece</option>
                    <option value="Kg">Kg</option>
                    <option value="Gram">Gram</option>
                    <option value="Liter">Liter</option>
                    <option value="Ml">Ml</option>
                    <option value="Packet">Packet</option>
                    <option value="Box">Box</option>
                    <option value="Dozen">Dozen</option>
                    <option value="Other">Other...</option>
                  </select>
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
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Low Stock Alert Threshold</label>
                  <input type="number" value={formData.minStock} onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Supplier Name (optional)</label>
                <input type="text" placeholder="e.g. Sharma Traders, Local Mandi" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
              </div>
            </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '40px' }}>
                <button onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '16px', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'} onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}>Cancel</button>
                <button onClick={handleSave} style={{ flex: 1, padding: '16px', background: 'var(--accent)', border: 'none', color: 'white', borderRadius: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 25px rgba(var(--accent-rgb), 0.4)', transition: 'transform 0.2s' }} onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>Save Product</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
