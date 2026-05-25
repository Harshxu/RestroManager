'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Plus, 
  Minus,
  Trash2, 
  Receipt, 
  Search,
  ShoppingBag,
  ArrowLeft,
  Check,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Billing.module.css';

import { useAuth } from '@/context/AuthContext';

export default function BillingPage() {
  const { user } = useAuth();
  const [cart, setCart] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [showReview, setShowReview] = useState(false);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  const isRestaurant = user?.businessType === 'Restaurant';

  const fetchCatalogItems = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const endpoint = isRestaurant ? '/api/menu' : '/api/inventory';
      const dealerId = user.dealerId?._id || user.dealerId;
      const res = await fetch(`${endpoint}?userId=${user._id}&dealerId=${dealerId}`);
      if (res.ok) {
        const data = await res.json();
        const normalized = data.map((item: any) => ({
          ...item,
          price: item.price || item.sellingPrice || 0
        }));
        setCatalogItems(normalized);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogItems();
    const imported = localStorage.getItem('importOrder');
    if (imported) {
      try {
        const parsed = JSON.parse(imported);
        const cartItems = parsed.items.map((item: any) => ({
          ...item,
          _id: item.productId
        }));
        setCart(cartItems);
        localStorage.removeItem('importOrder');
        setShowReview(true);
      } catch (e) {
        console.error('Error importing order:', e);
      }
    }
  }, [user]);

  const addToCart = (item: any) => {
    if (isRestaurant && item.isAvailable === false) return;
    if (!isRestaurant && item.stock <= 0) return;

    const existing = cart.find(i => i._id === item._id);
    if (existing) {
      if (!isRestaurant && existing.stock && existing.quantity >= item.stock) return;
      setCart(cart.map(i => i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (id: string) => {
    const existing = cart.find(i => i._id === id);
    if (existing && existing.quantity > 1) {
      setCart(cart.map(i => i._id === id ? { ...i, quantity: i.quantity - 1 } : i));
    } else {
      setCart(cart.filter(i => i._id !== id));
    }
  };

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const [orderSource, setOrderSource] = useState(isRestaurant ? 'Dine-In' : 'Counter Sale');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customerMobile, setCustomerMobile] = useState('');

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const categories = ['All', ...Array.from(new Set(catalogItems.map(i => i.category)))];
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredItems = catalogItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCheckout = async () => {
    if (!user || cart.length === 0) return;
    setProcessing(true);
    try {
      const items = cart.map(item => ({
        inventoryId: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));
      const payload = {
        userId: user._id,
        businessType: user.businessType,
        items,
        subTotal: total,
        tax: total * 0.05,
        total: total * 1.05,
        orderSource,
        paymentMethod,
        customerMobile,
        status: 'Added to Bill'
      };
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const order = await res.json();
        setCurrentOrder(order);
        setShowReceipt(true);
        setCart([]);
        setShowReview(false);
        fetchCatalogItems();
      }
    } catch (e) {
      console.error(e);
      alert('Order failed');
    } finally {
      setProcessing(false);
    }
  };

  const closeReceipt = () => {
    setShowReceipt(false);
    setCurrentOrder(null);
  };

  return (
    <div className={styles.container}>
      {/* Catalog View */}
      <div className={styles.inventoryArea}>
        <div className={styles.posHeader}>
          <h1 className={styles.headerTitle}>{isRestaurant ? 'Dhabha POS Terminal' : 'Retail POS Terminal'}</h1>
          <div className={styles.searchBar}>
            <Search size={24} style={{ opacity: 0.5 }} />
            <input 
              type="text" 
              placeholder={isRestaurant ? "Search dishes..." : "Search products..."} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.categoryChips}>
          {categories.map(cat => (
            <div 
              key={cat} 
              className={`${styles.categoryChip} ${selectedCategory === cat ? styles.activeChip : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </div>
          ))}
        </div>

        <div className={styles.itemGrid}>
          {loading ? (
             <div style={{ textAlign: 'center', width: '100%', padding: '100px' }}>
                <p className="text-gradient" style={{ fontSize: '1.5rem' }}>Syncing Menu catalog...</p>
             </div>
          ) : filteredItems.map((item, idx) => {
            const isAvailable = isRestaurant ? item.isAvailable !== false : item.stock > 0;
            return (
              <motion.div 
                key={item._id} 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.02 }}
                className={styles.itemCard}
                onClick={() => addToCart(item)}
                style={{ opacity: isAvailable ? 1 : 0.4 }}
              >
                <div className={styles.itemInfo}>
                  <span className={styles.itemCategory}>{item.category}</span>
                  <p className={styles.itemName}>{item.name}</p>
                  <p className={styles.itemPrice}>₹{item.price}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <span className={styles.stockBadge}>
                     {isRestaurant ? (
                       <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {item.preparationTime || 15}m</span>
                     ) : (
                       `Stock: ${item.stock}`
                     )}
                   </span>
                   <div className={styles.addButton}><Plus size={18} color="white" /></div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          className={styles.floatingCart}
          onClick={() => setShowReview(true)}
        >
          <ShoppingBag size={32} />
          <div className={styles.cartBadge}>{cart.length}</div>
        </motion.div>
      )}

      {/* Review Overlay */}
      <AnimatePresence>
        {showReview && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className={styles.cartOverlay}
          >
            <div className={styles.overlayHeader}>
               <button className={styles.backBtn} onClick={() => setShowReview(false)}>
                  <ArrowLeft size={20} /> Back to Menu Catalog
               </button>
               <h1 style={{ fontSize: '1.8rem' }}>Review & Confirm</h1>
            </div>

            <div className={styles.reviewSection}>
               <div className={styles.reviewList}>
                  {cart.map(item => (
                    <div key={item._id} className={styles.reviewItem}>
                       <div 
                         className={styles.itemCheck} 
                         onClick={() => toggleCheck(item._id)}
                         style={{ background: checkedItems.includes(item._id) ? 'var(--accent)' : 'transparent' }}
                       >
                          {checkedItems.includes(item._id) && <Check size={16} color="white" />}
                       </div>
                       <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>{item.name}</p>
                          <p style={{ opacity: 0.5 }}>₹{item.price} per dish</p>
                       </div>
                       <div className={styles.quantityControls} style={{ padding: '8px 16px' }}>
                          <button onClick={() => removeFromCart(item._id)}><Minus size={20} /></button>
                          <span style={{ fontSize: '1.2rem', fontWeight: 800, minWidth: '30px', textAlign: 'center', color: 'white' }}>{item.quantity}</span>
                          <button onClick={() => addToCart(item)}><Plus size={20} /></button>
                       </div>
                       <div style={{ fontSize: '1.4rem', fontWeight: 800, minWidth: '100px', textAlign: 'right', color: 'white' }}>
                          ₹{(item.price * item.quantity).toFixed(2)}
                       </div>
                       <button onClick={() => setCart(cart.filter(i => i._id !== item._id))} style={{ background: 'transparent', border: 'none', color: '#ff4444', marginLeft: '20px', cursor: 'pointer' }}>
                          <Trash2 size={24} />
                       </button>
                    </div>
                  ))}
               </div>
            </div>

            <div className={styles.checkoutPanel}>
               <div>
                  <h2>Final Checkout</h2>
                  <div className={styles.formSection} style={{ marginTop: '24px' }}>
                    <div className={styles.formGroup}>
                       <label>Customer Mobile (For WhatsApp Receipt)</label>
                       <input 
                         type="text" 
                         placeholder="987xxxxxxx" 
                         value={customerMobile} 
                         onChange={e => setCustomerMobile(e.target.value)} 
                         style={{ padding: '16px', fontSize: '1.1rem' }}
                       />
                    </div>
                    <div className={styles.formGroup}>
                       <label>Order Source</label>
                       <select value={orderSource} onChange={e => setOrderSource(e.target.value)} style={{ padding: '16px' }}>
                          {isRestaurant ? (
                             <>
                               <option value="Dine-In">Dine-In</option>
                               <option value="Takeaway">Takeaway</option>
                               <option value="Delivery">Delivery</option>
                             </>
                          ) : (
                             <>
                               <option value="Counter Sale">Counter Sale</option>
                               <option value="Home Delivery">Home Delivery</option>
                             </>
                          )}
                       </select>
                    </div>
                    <div className={styles.formGroup}>
                       <label>Payment Method</label>
                       <div className={styles.paymentMethods}>
                          {['Cash', 'UPI', 'Card'].map(m => (
                             <div 
                               key={m} 
                               className={`${styles.methodTab} ${paymentMethod === m ? styles.activeMethod : ''}`}
                               onClick={() => setPaymentMethod(m)}
                               style={{ padding: '14px' }}
                             >
                                {m}
                             </div>
                          ))}
                       </div>
                    </div>
                  </div>
               </div>

               <div className={styles.overlayFooter}>
                  <p style={{ opacity: 0.5 }}>Amount to be Paid (Incl 5% GST)</p>
                  <h1 className={styles.grandTotal}>₹{(total * 1.05).toFixed(2)}</h1>
                  <button 
                    className={styles.checkoutBtn}
                    onClick={handleCheckout}
                    disabled={processing || cart.length === 0}
                    style={{ padding: '24px', fontSize: '1.2rem' }}
                  >
                    {processing ? 'Finishing Order...' : `Pay & Finish ${orderSource}`}
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      {showReceipt && currentOrder && (
        <div className={styles.modalOverlay}>
           <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={styles.receiptModal}>
              <button className={styles.closeBtn} onClick={closeReceipt}>✕</button>
              <div className={styles.receiptHeader}>
                 <h2 className="text-gradient" style={{ color: '#000', margin: '0 auto 8px', width: 'fit-content' }}>Order Placed!</h2>
                 <p>RECEIPT #{currentOrder.orderId}</p>
                 <p style={{ fontSize: '0.7rem' }}>{new Date().toLocaleString()}</p>
              </div>

              <div style={{ margin: '20px 0' }}>
                 {currentOrder.items.map((item: any) => (
                   <div key={item._id} className={styles.receiptItem}>
                      <span>{item.name} x {item.quantity}</span>
                      <span style={{ fontWeight: 600 }}>₹{item.price * item.quantity}</span>
                   </div>
                 ))}
                 <div className={styles.receiptDivider} />
                 <div className={styles.receiptTotal}>
                    <span>Total Amount</span>
                    <span>₹{currentOrder.total.toFixed(2)}</span>
                 </div>
              </div>

              <div className={styles.qrSection}>
                 <QRCodeSVG 
                    value={`${window.location.origin}/receipt/${currentOrder.orderId}`} 
                    size={140}
                 />
                 <p>SCAN FOR DIGITAL COPY</p>
              </div>

              <button 
                className={styles.checkoutBtn} 
                style={{ marginTop: '24px', width: '100%', padding: '16px' }}
                onClick={closeReceipt}
              >
                Done
              </button>
           </motion.div>
        </div>
      )}
    </div>
  );
}
