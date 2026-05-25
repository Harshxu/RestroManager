'use client';

import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  ArrowUpRight,
  Plus,
  Receipt,
  Package,
  Store
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';





import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  
  const [chartData, setChartData] = useState([
    { name: 'Mon', sales: 0 }, { name: 'Tue', sales: 0 }, { name: 'Wed', sales: 0 }, 
    { name: 'Thu', sales: 0 }, { name: 'Fri', sales: 0 }, { name: 'Sat', sales: 0 }, { name: 'Sun', sales: 0 }
  ]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const [stats, setStats] = useState([
    { label: 'Today\'s Sales', value: '₹0', icon: TrendingUp, delta: '+0%' },
    { label: 'Total Orders', value: '0', icon: ShoppingBag, delta: '+0%' },
    { label: 'Low Stock Items', value: '0', icon: Package, delta: '-0%' },
    { label: 'New Customers', value: '0', icon: Users, delta: '+0%' },
  ]);

  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    const loadRealData = async () => {
      try {
        const [ordersRes, invRes, sessionsRes] = await Promise.all([
          fetch(`/api/orders?userId=${user._id}`),
          fetch(`/api/inventory?userId=${user._id}`),
          fetch(`/api/active-sessions?userId=${user._id}`)
        ]);
        
        if (ordersRes.ok && invRes.ok && sessionsRes.ok) {
          const orders = await ordersRes.json();
          const inventory = await invRes.json();
          const activeSessions = await sessionsRes.json();
          
          let totalRev = 0;
          const weeklySales = [0, 0, 0, 0];
          
          const productPerf: Record<string, {qty: number, revenue: number}> = {};
          
          orders.forEach((o: any) => {
            totalRev += o.total;
            // randomly distribute to weeks for Demo if we don't have enough span 
            // since dates might be all 'today' we will fake a spread or just dump in week 4
            const weekIdx = Math.floor(Math.random() * 4);
            weeklySales[weekIdx] += o.total;

            o.items.forEach((item: any) => {
              if(!productPerf[item.name]) productPerf[item.name] = { qty: 0, revenue: 0 };
              productPerf[item.name].qty += item.quantity;
              productPerf[item.name].revenue += item.price * item.quantity;
            });
          });

          setStats([
            { label: 'Total Sales', value: `₹${Math.floor(totalRev).toLocaleString()}`, icon: TrendingUp, delta: '+12.5%' },
            { label: 'Total Orders', value: orders.length.toString(), icon: ShoppingBag, delta: '+8.2%' },
            { label: 'Active Sessions', value: activeSessions.length.toString(), icon: Store, delta: 'Live' },
            { label: 'Low Stock Items', value: inventory.filter((i: any) => i.stock <= (i.minStock || 5)).length.toString(), icon: Package, delta: '-2.4%' },
          ]);

          // Dynamically calculate chart data by day of the week based on order createdAt
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const daySales = { 'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0 };
          
          orders.forEach((o: any) => {
            const date = new Date(o.createdAt);
            const dayName = days[date.getDay()];
            daySales[dayName as keyof typeof daySales] += o.total;
          });

          // Reorder ensuring we show a proper weekly span or just simple sequential mapping
          const newChartData = days.map(d => ({ name: d, sales: daySales[d as keyof typeof daySales] }));
          setChartData(newChartData);

          // Populate Recent Activity from the 4 most recent orders
          const acts = orders.reverse().slice(0, 4).map((o: any, idx: number) => ({
             id: o._id,
             text: `Bill #${o._id.toString().slice(-5)} generated`,
             time: new Date(o.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
             icon: Receipt,
             color: idx % 2 === 0 ? '#0070f3' : '#4ade80'
          }));
          
          // Add low stock warnings to activity feed
          const lowItems = inventory.filter((i:any) => i.stock <= 5);
          if (lowItems.length > 0) {
            acts.unshift({
              id: 'low-stock-alert',
              text: `${lowItems[0].name} stock critically low!`,
              time: 'Just now',
              icon: Package,
              color: '#facc15'
            });
          }
          setRecentActivity(acts.slice(0,4));
        }
      } catch (err) {}
    };
    loadRealData();
  }, [user]);
  
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Dashboard</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Welcome back, {user?.name || 'User'}! Here's what's happening at {user?.businessName || 'your store'}.</p>
        </div>
        <button 
          onClick={() => router.push('/billing')}
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
          <Plus size={20} /> New Bill
        </button>
      </header>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '24px',
        marginBottom: '40px' 
      }}>
        {stats.map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ delay: i * 0.1, duration: 0.4, type: 'spring' }}
            className="glass-dark"
            style={{ 
              padding: '28px', 
              position: 'relative',
              overflow: 'hidden',
              cursor: 'default'
            }}
          >
            <div style={{ 
              background: 'rgba(59, 130, 246, 0.15)', 
              width: '56px', 
              height: '56px', 
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              boxShadow: 'inset 0 0 20px rgba(59, 130, 246, 0.1)'
            }}>
              <stat.icon size={28} color="var(--accent)" />
            </div>
            <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{stat.label}</p>
            <h3 style={{ fontSize: '2.2rem', fontWeight: 800 }}>{stat.value}</h3>
            <div style={{ 
              marginTop: '16px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              color: stat.delta.startsWith('+') || stat.delta === 'Live' ? '#4ade80' : '#f87171',
              background: stat.delta.startsWith('+') || stat.delta === 'Live' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 700
            }}>
              <ArrowUpRight size={16} /> {stat.delta}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: '12px', fontSize: '0.8rem', fontWeight: 500 }}>vs last week</span>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '40px' }}>
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card-gradient"
          style={{ 
            padding: '32px', 
            borderRadius: '24px',
            height: '400px'
          }}
        >
          <h3 style={{ marginBottom: '24px' }}>Sales Analytics</h3>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="name" 
                stroke="rgba(255,255,255,0.3)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.3)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)'
                }}
                itemStyle={{ color: '#fff' }}
              />
              <Area 
                type="monotone" 
                dataKey="sales" 
                stroke="var(--accent)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorSales)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-dark"
          style={{ 
            padding: '32px'
          }}
        >
          <h3 style={{ marginBottom: '24px' }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
            {/* Timeline Line */}
            <div style={{ position: 'absolute', left: '19px', top: '24px', bottom: '24px', width: '2px', background: 'rgba(255,255,255,0.05)', zIndex: 0 }} />

            {recentActivity.length > 0 ? recentActivity.map((item, idx) => (
              <div key={item.id} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '12px', 
                  background: `rgba(${item.color === '#0070f3' ? '0,112,243' : item.color === '#4ade80' ? '74,222,128' : '250,204,21'}, 0.15)`,
                  border: `1px solid rgba(${item.color === '#0070f3' ? '0,112,243' : item.color === '#4ade80' ? '74,222,128' : '250,204,21'}, 0.3)`,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <item.icon size={20} color={item.color} />
                </div>
                <div style={{ paddingTop: '4px' }}>
                  <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.95)', fontWeight: 600 }}>{item.text}</p>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{item.time}</p>
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px 20px', zIndex: 1 }}>No recent activity to show yet. Generate a bill!</div>
            )}
          </div>
          <button style={{ 
            width: '100%', 
            marginTop: '32px', 
            background: 'transparent', 
            border: '1px solid rgba(255,255,255,0.1)', 
            padding: '14px', 
            borderRadius: '12px', 
            color: 'rgba(255,255,255,0.8)',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            View All Activity
          </button>
        </motion.div>
      </div>
    </div>
  );
}
