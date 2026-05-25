'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  DollarSign, 
  Calendar, 
  PieChart as PieIcon,
  Filter,
  ArrowDownCircle,
  TrendingDown,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', amount: 0, category: 'Raw Material', note: '' });

  const categories = ['Salary', 'Rent', 'Electricity', 'Raw Material', 'Marketing', 'Maintenance', 'Other'];

  useEffect(() => {
    if (user) fetchExpenses();
  }, [user]);

  const fetchExpenses = async () => {
    try {
      const res = await fetch(`/api/expenses?userId=${user?._id}`);
      if (res.ok) setExpenses(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, userId: user?._id })
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ title: '', amount: 0, category: 'Raw Material', note: '' });
        fetchExpenses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchExpenses();
  };

  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Expense Manager</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Track your operational costs to monitor true profitability.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ background: '#f87171', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={20} /> Add Expense
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
        <div className="card-gradient" style={{ padding: '24px', borderRadius: '20px' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: '4px' }}>Total Monthly Outflow</p>
          <h2 style={{ fontSize: '2rem', color: '#f87171' }}>₹{totalExpenses.toLocaleString()}</h2>
        </div>
        <div className="card-gradient" style={{ padding: '24px', borderRadius: '20px' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: '4px' }}>Major Category</p>
          <h2 style={{ fontSize: '1.5rem' }}>Raw Materials</h2>
        </div>
        <div className="card-gradient" style={{ padding: '24px', borderRadius: '20px' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: '4px' }}>Growth In Costs</p>
          <h2 style={{ fontSize: '1.5rem', color: '#4ade80' }}>+2.4%</h2>
        </div>
      </div>

      <div className="card-gradient" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
              <th style={{ padding: '16px 24px', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>TITLE</th>
              <th style={{ padding: '16px 24px', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>CATEGORY</th>
              <th style={{ padding: '16px 24px', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>DATE</th>
              <th style={{ padding: '16px 24px', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>AMOUNT</th>
              <th style={{ padding: '16px 24px' }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="spin" /></td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>No expenses recorded</td></tr>
            ) : expenses.map(ex => (
              <tr key={ex._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '16px 24px' }}>{ex.title}</td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>{ex.category}</span>
                </td>
                <td style={{ padding: '16px 24px', color: 'rgba(255,255,255,0.4)' }}>{new Date(ex.date).toLocaleDateString()}</td>
                <td style={{ padding: '16px 24px', fontWeight: '600', color: '#f87171' }}>-₹{ex.amount}</td>
                <td style={{ padding: '16px 24px' }}>
                  <button onClick={() => handleDelete(ex._id)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-dark" style={{ padding: '32px', borderRadius: '24px', width: '400px' }}>
              <h2 style={{ marginBottom: '24px' }}>Log Expense</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input type="text" placeholder="Title (e.g. Electricity Bill)" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', color: 'white' }} />
                <input type="number" placeholder="Amount" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', color: 'white' }} />
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', color: 'white' }}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <textarea placeholder="Notes" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', color: 'white', height: '80px' }} />
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }}>Cancel</button>
                  <button onClick={handleAdd} style={{ flex: 1, padding: '12px', background: '#f87171', border: 'none', borderRadius: '10px', color: 'white', fontWeight: '600' }}>Save</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
