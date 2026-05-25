'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Receipt, MapPin, Phone, Calendar, CheckCircle2 } from 'lucide-react';
import styles from './Receipt.module.css';

export default function PublicReceiptPage() {
  const params = useParams();
  const [order, setOrder] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFullData = async () => {
      try {
        // Fetch order by orderId
        const res = await fetch(`/api/orders/public?orderId=${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data.order);
          setStore(data.store);
        }
      } catch (error) {
        console.error('Error fetching receipt:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) fetchFullData();
  }, [params.id]);

  if (loading) return <div className={styles.loader}>Loading E-Receipt...</div>;
  if (!order) return <div className={styles.error}>Receipt not found or expired.</div>;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.receiptPaper}>
        <div className={styles.header}>
          <h1 className={styles.storeName}>{store?.businessName || 'OmniBiz Store'}</h1>
          <div className={styles.storeDetails}>
            <p><MapPin size={12} /> {store?.businessAddress || store?.location || 'Digital Service'}</p>
            <p><Phone size={12} /> {store?.phone || '+91 XXXXXXXXXX'}</p>
            {store?.gstNumber && <p className={styles.gstTag}>GSTIN: {store.gstNumber}</p>}
          </div>
        </div>

        <div className={styles.statusSection}>
          <div className={styles.statusBadge}>
            <CheckCircle2 size={16} /> PAID
          </div>
          <div className={styles.orderInfo}>
             <span>#{order.orderId}</span>
             <span className={styles.dot}>•</span>
             <span>{new Date(order.createdAt).toLocaleDateString()}</span>
             <span className={styles.dot}>•</span>
             <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
          </div>
        </div>

        <div className={styles.billTable}>
           <div className={styles.tableHeader}>
              <span>ITEM</span>
              <span>QTY</span>
              <span>TOTAL</span>
           </div>
           <div className={styles.tableBody}>
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className={styles.tableRow}>
                   <div className={styles.itemName}>
                      <span style={{ fontWeight: 500 }}>{item.name}</span>
                      <span className={styles.unitPrice}>₹{item.price}</span>
                   </div>
                   <span>{item.quantity}</span>
                   <span style={{ fontWeight: 600 }}>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
           </div>
        </div>

        <div className={styles.summarySection}>
           <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <span>₹{(order.subTotal || 0).toFixed(2)}</span>
           </div>
           <div className={styles.summaryRow}>
              <span>GST (5%)</span>
              <span>₹{(order.tax || 0).toFixed(2)}</span>
           </div>
           <div className={`${styles.summaryRow} ${styles.grandTotal}`}>
              <span>Amount Paid</span>
              <span>₹{order.total.toFixed(2)}</span>
           </div>
        </div>

        <div className={styles.footer}>
           <p className={styles.paymentMethod}>Paid via {order.paymentMethod}</p>
           <div className={styles.thankYou}>
              <h3>Thank You!</h3>
              <p>Please visit us again</p>
           </div>
           <div className={styles.poweredBy}>
              Powered by OmniBiz SaaS
           </div>
        </div>
      </div>
    </div>
  );
}
