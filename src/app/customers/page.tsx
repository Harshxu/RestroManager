'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Phone, 
  ShoppingBag, 
  TrendingUp, 
  Search,
  ChevronRight,
  History,
  Loader2,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function CustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) fetchCustomerData();
  }, [user]);

  const fetchCustomerData = async () => {
    try {
      const res = await fetch(`/api/orders?userId=${user?._id}`);
      if (res.ok) {
        const orders = await res.json();
        
        // Group orders by mobile number to identify unique customers
        const customerMap: Record<string, any> = {};
        
        orders.forEach((order: any) => {
          if (!order.customerMobile) return;
          
          if (!customerMap[order.customerMobile]) {
            customerMap[order.customerMobile] = {
              mobile: order.customerMobile,
              name: order.customerName || 'Anonymous',
              totalSpent: 0,
              orderCount: 0,
              lastOrderDate: order.createdAt,
              lastOrderItems: order.items.length,
              history: []
            };
          }
          
          const customer = customerMap[order.customerMobile];
          // Update name if it was previously anonymous but now we have it
          if (order.customerName && customer.name === 'Anonymous') {
            customer.name = order.customerName;
          }
          customer.totalSpent += order.total;
          customer.orderCount += 1;
          customer.history.push({
            id: order.orderId,
            date: order.createdAt,
            total: order.total,
            source: order.orderSource
          });
          
          if (new Date(order.createdAt) > new Date(customer.lastOrderDate)) {
            customer.lastOrderDate = order.createdAt;
          }
        });
        
        setCustomers(Object.values(customerMap).sort((a: any, b: any) => b.totalSpent - a.totalSpent));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.mobile.includes(searchTerm)
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Customer Database</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Track loyal customers and their lifetime value at {user?.businessName}.</p>
        </div>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', zIndex: 1 }} />
          <input 
            type="text" 
            placeholder="Search mobile number..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '14px 14px 14px 44px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: 'white', outline: 'none', transition: 'all 0.2s', fontSize: '0.95rem' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>
      </header>

      {loading ? (
        <div style={{ padding: '100px', textAlign: 'center' }}><Loader2 className="spin" size={32} color="var(--accent)" /></div>
      ) : customers.length === 0 ? (
        <div className="glass-dark" style={{ padding: '80px', textAlign: 'center', borderRadius: '32px' }}>
          <Users size={64} style={{ opacity: 0.2, marginBottom: '24px' }} />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem' }}>No customers with mobile numbers found yet. Start billing with mobile numbers to build your list!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '24px' }}>
          {filteredCustomers.map((cust, idx) => (
            <motion.div 
              key={cust.mobile}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-dark"
              style={{ padding: '28px 32px', borderRadius: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s', cursor: 'default' }}
              whileHover={{ y: -4 }}
            >
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <div style={{ 
                  width: '60px', height: '60px', borderRadius: '18px', 
                  background: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Users size={28} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {cust.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} /> {cust.mobile}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShoppingBag size={12} /> {cust.orderCount} Orders
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Lifetime Value</p>
                <h3 style={{ fontSize: '1.5rem', color: '#4ade80' }}>₹{cust.totalSpent.toLocaleString()}</h3>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
