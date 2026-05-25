'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Trash2,
  Receipt,
  Package,
  Search,
  ChevronRight,
  Utensils,
  StickyNote,
  AlertCircle,
  Smartphone,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  ListTodo,
  Settings,
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import styles from './Manage.module.css';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

export default function ManagePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Table operations
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [targetTableNum, setTargetTableNum] = useState('');

  // EOD Inventory reconciliation modal
  const [isEODOpen, setIsEODOpen] = useState(false);
  const [eodQuantities, setEodQuantities] = useState<Record<string, number>>({});
  const [shoppingList, setShoppingList] = useState<any[]>([]);

  // Checkout Form States
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Default configurations based on business type
  const isRestaurant = user?.businessType === 'Restaurant';
  const sessionLabel = isRestaurant ? 'Table' : 'Order';

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // For restaurants: menu items (dishes to sell) come from /api/menu
      // Raw materials always come from /api/inventory regardless of business type
      const menuEndpoint = isRestaurant ? '/api/menu' : '/api/inventory';
      const dealerId = user?.dealerId?._id || user?.dealerId;

      const fetchList: Promise<Response>[] = [
        fetch(`/api/active-sessions?userId=${user?._id}&dealerId=${dealerId}`),
        fetch(`${menuEndpoint}?userId=${user?._id}&dealerId=${dealerId}`),
        fetch(`/api/tables?userId=${user?._id}&dealerId=${dealerId}`)
      ];

      // Always fetch raw materials for EOD reconciliation
      if (isRestaurant) {
        fetchList.push(fetch(`/api/inventory?userId=${user?._id}&dealerId=${dealerId}`));
      }

      const [sessionsRes, invRes, tablesRes, rawMatRes] = await Promise.all(fetchList);

      if (sessionsRes.ok) setSessions(await sessionsRes.json());
      if (tablesRes.ok) setTables(await tablesRes.json());
      if (invRes.ok) {
        const data = await invRes.json();
        const normalized = data.map((item: any) => ({
          ...item,
          price: item.price || item.sellingPrice || 0
        }));
        setInventory(normalized);
      }
      // Set raw materials for EOD (only restaurants have separate raw materials)
      if (rawMatRes && rawMatRes.ok) {
        setRawMaterials(await rawMatRes.json());
      } else if (!isRestaurant && invRes.ok) {
        // For non-restaurant stores, inventory IS the raw materials
        const data = await invRes.json();
        setRawMaterials(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSessionForTable = (tableNumber: string) => {
    return sessions.find((s) => s.reference === `Table ${tableNumber}`);
  };

  const updateSession = async (reference: string, items: any[]) => {
    if (!user?._id) return;
    try {
      const res = await fetch('/api/active-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          businessType: user.businessType,
          reference,
          items
        })
      });

      if (res.ok) {
        const fullRes = await fetch(`/api/active-sessions?userId=${user._id}`);
        const tablesRes = await fetch(`/api/tables?userId=${user._id}`);
        if (fullRes.ok && tablesRes.ok) {
          const allSessions = await fullRes.json();
          setSessions(allSessions);
          setTables(await tablesRes.json());

          const currentSession = allSessions.find((s: any) => s.reference === reference);
          if (selectedTable && selectedTable.number === reference.replace('Table ', '')) {
            setSelectedTable({
              ...selectedTable,
              activeSession: currentSession || { reference, items: [] }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error updating session:', error);
    }
  };

  const addItemToSession = (item: any) => {
    if (!selectedTable) return;
    const activeSession = selectedTable.activeSession || { reference: `Table ${selectedTable.number}`, items: [] };
    const sessionItems = [...(activeSession.items || [])];
    const existingIndex = sessionItems.findIndex(i => String(i.productId) === String(item._id));

    if (existingIndex > -1) {
      sessionItems[existingIndex].quantity += 1;
    } else {
      sessionItems.push({
        productId: item._id,
        name: item.name,
        price: item.price,
        quantity: 1,
        unit: item.unit || (isRestaurant ? 'Portion' : 'Piece'),
        status: 'Order Received'
      });
    }
    updateSession(activeSession.reference, sessionItems);
  };

  const updateItemStatus = (productId: string, newStatus: string) => {
    if (!selectedTable || !selectedTable.activeSession) return;
    const sessionItems = selectedTable.activeSession.items.map((i: any) => 
      String(i.productId) === String(productId) ? { ...i, status: newStatus } : i
    );
    updateSession(selectedTable.activeSession.reference, sessionItems);
  };

  const removeItemFromSession = (productId: string) => {
    if (!selectedTable || !selectedTable.activeSession) return;
    const sessionItems = (selectedTable.activeSession.items || []).filter((i: any) => String(i.productId) !== String(productId));
    updateSession(selectedTable.activeSession.reference, sessionItems);
  };

  const handleShiftTable = async () => {
    if (!selectedTable || !selectedTable.activeSession || !targetTableNum) return;
    try {
      const activeSession = selectedTable.activeSession;
      
      // Update session reference to target table
      await updateSession(`Table ${targetTableNum}`, activeSession.items);

      // Delete current table session
      if (activeSession._id) {
        await fetch(`/api/active-sessions?id=${activeSession._id}`, { method: 'DELETE' });
      }

      setIsShiftOpen(false);
      setTargetTableNum('');
      setSelectedTable(null);
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Failed to shift table');
    }
  };

  const handleFinalizeOrder = async () => {
    if (!selectedTable || !selectedTable.activeSession || !user) return;
    setProcessing(true);

    try {
      const activeSession = selectedTable.activeSession;
      const finalItems = activeSession.items.map((item: any) => ({
        inventoryId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      const subTotal = activeSession.total;
      const tax = subTotal * 0.05;
      const total = subTotal + tax;

      const orderPayload = {
        userId: user._id,
        businessType: user.businessType,
        items: finalItems,
        subTotal,
        tax,
        total,
        customerName,
        customerMobile,
        orderSource: 'Dine-In',
        paymentMethod,
        status: 'Added to Bill'
      };

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (orderRes.ok) {
        const order = await orderRes.json();
        setLastOrder(order);

        // Delete active session, this will automatically vacate the table via the trigger
        if (activeSession._id) {
          await fetch(`/api/active-sessions?id=${activeSession._id}`, { method: 'DELETE' });
        }

        setIsCheckoutOpen(false);
        setIsReceiptOpen(true);
        fetchData();
        setSelectedTable(null);
        setCustomerMobile('');
        setCustomerName('');
      }
    } catch (error) {
      console.error(error);
      alert('Checkout failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!lastOrder) return;

    const storeName = user?.businessName || 'Gourmet Kitchen';
    const customerName = lastOrder.customerName || 'Guest';
    const mobile = lastOrder.customerMobile;
    const total = lastOrder.total.toFixed(2);
    const receiptLink = `${window.location.origin}/receipt/${lastOrder.orderId}`;

    const sparkles = String.fromCodePoint(0x2728);
    const wave = String.fromCodePoint(0x1F44B);
    const cheers = String.fromCodePoint(0x1F942);
    const money = String.fromCodePoint(0x1F4B0);
    const linkIcon = String.fromCodePoint(0x1F517);
    const pray = String.fromCodePoint(0x1F64F);

    const message = `${sparkles} *DINE & DELIGHT | ${storeName.toUpperCase()}* ${sparkles}\n` +
      `-----------------------------------\n` +
      `Hello ${customerName}! ${wave}\n` +
      `Your visit was successful. ${cheers}\n` +
      `Total Bill: *₹${total}* ${money}\n` +
      `-----------------------------------\n` +
      `${linkIcon} *VIEW DIGITAL RECEIPT:*\n` +
      `${receiptLink}\n` +
      `-----------------------------------\n` +
      `Thank you for dining with us! Hope to see you back soon. ${pray}${sparkles}`;

    let finalMobile = mobile.replace(/\D/g, '');
    if (finalMobile.length === 10) finalMobile = `91${finalMobile}`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${finalMobile}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, 'OmniBizWhatsApp');
  };

  // EOD inventory calculations — always uses RestroInventory (raw materials)
  const triggerEODReconciliation = async () => {
    try {
      const dealerId = user?.dealerId?._id || user?.dealerId;
      const res = await fetch(`/api/inventory?userId=${user?._id}&dealerId=${dealerId}`);
      if (res.ok) {
        const materials = await res.json();
        setRawMaterials(materials);
        const initialQuantities: Record<string, number> = {};
        materials.forEach((item: any) => {
          initialQuantities[item._id] = item.stock ?? 0;
        });
        setEodQuantities(initialQuantities);
        setIsEODOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEODReconciliation = async () => {
    try {
      setProcessing(true);
      const updates = Object.entries(eodQuantities).map(([id, qty]) => {
        return fetch('/api/inventory', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _id: id, stock: qty })
        });
      });

      await Promise.all(updates);

      // Generate shopping list of items where stock <= minStock
      const dealerId = user?.dealerId?._id || user?.dealerId;
      const res = await fetch(`/api/inventory?userId=${user?._id}&dealerId=${dealerId}`);
      if (res.ok) {
        const updatedMaterials = await res.json();
        setRawMaterials(updatedMaterials);
        const lowStock = updatedMaterials.filter((item: any) => item.stock <= (item.minStock || 5));
        setShoppingList(lowStock);
      }
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group tables by section
  const sections = Array.from(new Set(tables.map(t => t.section || 'Main Hall')));

  return (
    <div className={styles.container}>
      <header className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Utensils size={36} /> Dine-In floor Planner
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Manage live tables, order cooking states, and split billing.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Settings shortcut — table layout is managed from Settings */}
          <button
            onClick={() => router.push('/settings')}
            className="glass-dark"
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              fontWeight: '600',
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            <LayoutGrid size={16} /> Edit Table Layout
          </button>
          <button 
            onClick={triggerEODReconciliation}
            className="glass-dark" 
            style={{ 
              padding: '12px 20px', 
              borderRadius: '12px', 
              color: 'var(--accent)', 
              border: '1px solid var(--accent)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontWeight: '700',
              cursor: 'pointer' 
            }}
          >
            <ListTodo size={18} /> EOD Reconciliation
          </button>
          <button 
            onClick={fetchData}
            className="glass-dark" 
            style={{ 
              padding: '12px 16px', 
              borderRadius: '12px', 
              color: 'white', 
              border: '1px solid rgba(255,255,255,0.1)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontWeight: '600',
              cursor: 'pointer' 
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      <div className={styles.mainGrid}>
        {/* Floor plans grouped by section */}
        <div className={styles.gridSection}>
          {loading ? (
            <div style={{ padding: '80px', textAlign: 'center' }}>
              <div className="pulse" style={{ color: 'var(--accent)', fontWeight: 600 }}>Loading Dhaba Layout...</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {sections.map(section => (
                <div key={section}>
                  <h2 style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.6)', marginBottom: '16px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{section}</h2>
                  <div className={styles.sessionsGrid}>
                    {tables.filter(t => t.section === section).map(table => {
                      const sessionData = getSessionForTable(table.number);
                      const isActive = table.status === 'occupied' || (sessionData && sessionData.items.length > 0);
                      const isSelected = selectedTable?.number === table.number;

                      return (
                        <motion.div
                          key={table._id}
                          whileHover={{ scale: 1.02 }}
                          className={`${styles.sessionCard} card-gradient ${isActive ? styles.active : ''} ${isSelected ? styles.selected : ''}`}
                          onClick={() => setSelectedTable({
                            ...table,
                            activeSession: sessionData || { reference: `Table ${table.number}`, items: [] }
                          })}
                          style={{
                            borderLeft: `4px solid ${isActive ? 'var(--accent)' : '#4ade80'}`
                          }}
                        >
                          <div className={styles.cardHeader}>
                            <Utensils size={18} />
                            <span style={{ fontWeight: '800', color: 'white' }}>Table {table.number}</span>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>
                              Cap: {table.seatingCapacity}
                            </span>
                          </div>
                          {isActive ? (
                            <div className={styles.cardBody}>
                              <p className={styles.sessionTotal} style={{ color: 'var(--accent)' }}>₹{sessionData?.total || 0}</p>
                              <p className={styles.sessionItems}>{sessionData?.items?.length || 0} active item(s)</p>
                              {table.occupiedSince && (
                                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>
                                  Active since: {new Date(table.occupiedSince).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className={styles.emptyTag} style={{ color: '#4ade80', fontWeight: 'bold' }}>Vacant / Free</div>
                          )}
                          {isActive && <div className={styles.activeIndicator} />}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Table details panel */}
        <div className={styles.detailsSection}>
          <AnimatePresence mode="wait">
            {!selectedTable ? (
              <motion.div key="empty" className={styles.emptyState}>
                <AlertCircle size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <p>Select a table to manage orders and billing</p>
              </motion.div>
            ) : (
              <motion.div key="active" className={styles.sessionDetails}>
                <div className={styles.detailsHeader}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Table {selectedTable.number}</h2>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Section: {selectedTable.section}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="glass-dark" 
                      onClick={() => setIsShiftOpen(true)}
                      style={{ 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        padding: '10px 14px', 
                        borderRadius: '10px', 
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                      disabled={!selectedTable.activeSession?.items?.length}
                    >
                      Shift Table
                    </button>
                    <button 
                      className={styles.checkoutBtn} 
                      onClick={() => setIsCheckoutOpen(true)} 
                      disabled={!selectedTable.activeSession?.items?.length}
                    >
                      Checkout <Receipt size={16} />
                    </button>
                  </div>
                </div>

                <div className={styles.currentItems}>
                  <h3>Active KOT Items</h3>
                  {!selectedTable.activeSession?.items?.length ? (
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', padding: '20px' }}>No items ordered yet. Add items below!</p>
                  ) : (
                    <div className={styles.itemsList}>
                      {selectedTable.activeSession.items.map((item: any) => (
                        <div key={item.productId} className={styles.listItem} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ fontWeight: '700', fontSize: '1rem', color: 'white' }}>{item.name}</p>
                              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>₹{item.price} x {item.quantity}</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontWeight: '800', color: 'var(--accent)' }}>₹{item.price * item.quantity}</span>
                              <button onClick={() => removeItemFromSession(item.productId)} className={styles.removeIcon}><Trash2 size={16} /></button>
                            </div>
                          </div>
                          {/* Dhaba Status Control — hide entirely once Added to Bill */}
                          {(item.status || 'Order Received') !== 'Added to Bill' ? (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              {['Order Received', 'Preparing', 'Added to Bill'].map((status) => {
                                const isActiveStatus = (item.status || 'Order Received') === status;
                                const statusColors: Record<string, string> = {
                                  'Order Received': '#3b82f6',
                                  'Preparing': '#facc15',
                                  'Added to Bill': '#4ade80'
                                };
                                const color = statusColors[status];
                                return (
                                  <button
                                    key={status}
                                    onClick={(e) => { e.stopPropagation(); updateItemStatus(String(item.productId), status); }}
                                    style={{
                                      flex: 1,
                                      padding: '6px',
                                      borderRadius: '8px',
                                      fontSize: '0.7rem',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      border: `1px solid ${isActiveStatus ? color : 'rgba(255,255,255,0.08)'}`,
                                      background: isActiveStatus ? `${color}22` : 'transparent',
                                      color: isActiveStatus ? color : 'rgba(255,255,255,0.4)',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    {status}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ marginTop: '6px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(74,222,128,0.12)', border: '1px solid #4ade8050', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: '700', color: '#4ade80' }}>
                              ✓ Added to Bill
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add new items to order */}
                <div className={styles.addItemSection}>
                  <div className={styles.searchBar}>
                    <Search size={18} color="rgba(255,255,255,0.4)" />
                    <input type="text" placeholder="Add dish (e.g. Dal, Naan, Paneer)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <div className={styles.inventoryScroll}>
                    {filteredInventory.map(item => (
                      <div key={item._id} className={styles.inventoryItem} onClick={() => addItemToSession(item)}>
                        <div>
                          <p style={{ fontWeight: '700', color: 'white' }}>{item.name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '2px', fontWeight: 'bold' }}>₹{item.price}</p>
                        </div>
                        <Plus size={16} color="var(--accent)" />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Shift Table Modal */}
      <AnimatePresence>
        {isShiftOpen && selectedTable && (
          <div className={styles.modalOverlay}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-dark" style={{ padding: '32px', borderRadius: '24px', width: '380px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 style={{ marginBottom: '20px', fontSize: '1.4rem' }}>Shift Table {selectedTable.number}</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '24px' }}>Move the active KOT order to another vacant table.</p>

              <div className={styles.formGroup} style={{ marginBottom: '24px' }}>
                <label>Select Target Table</label>
                <select value={targetTableNum} onChange={e => setTargetTableNum(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }}>
                  <option value="">-- Choose Vacant Table --</option>
                  {tables.filter(t => t.status === 'free' && t.number !== selectedTable.number).map(t => (
                    <option key={t._id} value={t.number}>Table {t.number} ({t.section})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setIsShiftOpen(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleShiftTable} disabled={!targetTableNum} style={{ flex: 1, padding: '12px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: '600', cursor: 'pointer' }}>Shift Order</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && selectedTable && (
          <div className={styles.modalOverlay}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-dark" style={{ padding: '32px', borderRadius: '24px', width: '400px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 style={{ marginBottom: '24px', fontSize: '1.5rem' }}>Table {selectedTable.number} Checkout</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className={styles.summaryRow} style={{ opacity: 0.6, fontSize: '0.9rem' }}>
                  <span>Subtotal</span>
                  <span>₹{(selectedTable.activeSession?.total || 0).toFixed(2)}</span>
                </div>
                <div className={styles.summaryRow} style={{ opacity: 0.6, fontSize: '0.9rem' }}>
                  <span>GST (5%)</span>
                  <span>₹{((selectedTable.activeSession?.total || 0) * 0.05).toFixed(2)}</span>
                </div>
                <div className={styles.summaryRow} style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', color: 'white' }}>
                  <span>Grand Total</span>
                  <span>₹{((selectedTable.activeSession?.total || 0) * 1.05).toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className={styles.formGroup}>
                  <label>Customer Name</label>
                  <input type="text" placeholder="e.g. Rahul Sharma" value={customerName} onChange={e => setCustomerName(e.target.value)} style={{ padding: '12px' }} />
                </div>
                <div className={styles.formGroup}>
                  <label>Customer Mobile</label>
                  <input type="text" placeholder="e.g. 9876543210 (For WhatsApp Receipt)" value={customerMobile} onChange={e => setCustomerMobile(e.target.value)} style={{ padding: '12px' }} />
                </div>
                <div className={styles.formGroup}>
                  <label>Payment Method</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    {['Cash', 'UPI', 'Card'].map(m => (
                      <button
                        key={m}
                        className={paymentMethod === m ? styles.activeMethod : styles.methodBtn}
                        onClick={() => setPaymentMethod(m)}
                        style={{ padding: '10px' }}
                      >{m}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button onClick={() => setIsCheckoutOpen(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleFinalizeOrder} disabled={processing} style={{ flex: 1, padding: '12px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 20px rgba(var(--accent-rgb), 0.3)' }}>
                    {processing ? 'Processing...' : 'Settle & Print'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EOD inventory modal */}
      <AnimatePresence>
        {isEODOpen && (
          <div className={styles.modalOverlay}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-dark" style={{ padding: '36px', borderRadius: '32px', width: '100%', maxWidth: '650px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ListTodo size={28} color="var(--accent)" /> End of Day stock audit
                </h2>
                <button onClick={() => { setIsEODOpen(false); setShoppingList([]); }} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
              </div>

              {shoppingList.length === 0 ? (
                <>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '24px' }}>Update the remaining quantities for ingredients manually. The system will compile the shopping procurement list for tomorrow.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '350px', overflowY: 'auto', paddingRight: '10px', marginBottom: '24px' }}>
                    {rawMaterials.length === 0 && (
                      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '20px' }}>No raw materials found. Add ingredients in Inventory first.</p>
                    )}
                    {rawMaterials.map((item: any) => (
                      <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <p style={{ fontWeight: '700', color: 'white' }}>{item.name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Min alert: {item.minStock || 5} {item.unit} | Supplier: {item.supplier || '—'}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="number" 
                            min="0"
                            value={eodQuantities[item._id] ?? item.stock ?? 0} 
                            onChange={e => setEodQuantities(prev => ({ ...prev, [item._id]: Number(e.target.value) }))}
                            style={{ width: '80px', padding: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', textAlign: 'center', fontWeight: 'bold' }} 
                          />
                          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', width: '40px' }}>{item.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setIsEODOpen(false)} style={{ flex: 1, padding: '16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: 'white', fontWeight: '600', cursor: 'pointer' }}>Close</button>
                    <button onClick={handleSaveEODReconciliation} disabled={processing} style={{ flex: 1, padding: '16px', background: 'var(--accent)', border: 'none', borderRadius: '14px', color: 'white', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 25px rgba(var(--accent-rgb), 0.3)' }}>
                      {processing ? 'Saving...' : 'Compile Shopping List'}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ background: 'rgba(74, 222, 128, 0.15)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', margin: '0 auto 16px', justifyContent: 'center' }}>
                    <ShoppingBag size={32} color="#4ade80" />
                  </div>
                  <h3>Shopping List for Tomorrow</h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '4px', marginBottom: '24px' }}>
                    The following ingredients have fallen below their minimum stock alert thresholds:
                  </p>

                  <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px', maxHeight: '250px', overflowY: 'auto' }}>
                    {shoppingList.map((item: any) => (
                      <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ fontWeight: '600', color: 'white' }}>• {item.name}</span>
                        <span style={{ color: '#f87171', fontWeight: 'bold' }}>
                          Current: {item.stock} {item.unit} (Alert: {item.minStock || 5})
                        </span>
                      </div>
                    ))}
                    {shoppingList.length === 0 && (
                      <p style={{ textAlign: 'center', color: '#4ade80', fontWeight: 'bold' }}>All stocks are well-maintained! Nothing needed tomorrow.</p>
                    )}
                  </div>

                  <button 
                    onClick={() => {
                      const text = `*SHOPPING PROCUREMENT LIST FOR ${new Date().toLocaleDateString()}*\n\n` + 
                        shoppingList.map((item: any) => `• ${item.name} (Current: ${item.stock} ${item.unit} | Target: ${item.minStock || 5})`).join('\n');
                      navigator.clipboard.writeText(text);
                      alert('Copied to clipboard! You can paste in WhatsApp to share with suppliers.');
                    }}
                    className="glass-dark" 
                    style={{ width: '100%', padding: '16px', background: 'var(--accent)', border: 'none', color: 'white', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', marginBottom: '12px' }}
                  >
                    Copy Shopping List to Clipboard
                  </button>
                  <button 
                    onClick={() => { setIsEODOpen(false); setShoppingList([]); }}
                    style={{ width: '100%', padding: '16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px', cursor: 'pointer' }}
                  >
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      <AnimatePresence>
        {isReceiptOpen && lastOrder && (
          <div className={styles.modalOverlay}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-dark" style={{ padding: '32px', borderRadius: '32px', width: '380px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ background: '#4ade80', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Receipt color="white" />
                </div>
                <h2>Payment Successful!</h2>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '4px' }}>
                  Order #{lastOrder.orderId} • {new Date().toLocaleTimeString()}
                </div>
              </div>

              <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', borderBottom: '1px dashed rgba(255,255,255,0.1)', padding: '16px 0', margin: '16px 0' }}>
                {lastOrder.items.map((item: any) => (
                  <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px' }}>
                    <span style={{ color: 'white' }}>{item.name} x {item.quantity}</span>
                    <span style={{ fontWeight: 600 }}>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <div className={styles.summaryRow} style={{ fontSize: '0.9rem', opacity: 0.6 }}>
                  <span>Subtotal</span>
                  <span>₹{(lastOrder?.subTotal || 0).toFixed(2)}</span>
                </div>
                <div className={styles.summaryRow} style={{ fontSize: '0.9rem', opacity: 0.6 }}>
                  <span>GST (5%)</span>
                  <span>₹{(lastOrder?.tax || 0).toFixed(2)}</span>
                </div>
                <div className={styles.summaryRow} style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '8px', fontSize: '1.2rem', color: '#4ade80' }}>
                  <span>Grand Total</span>
                  <span>₹{(lastOrder?.total || 0).toFixed(2)}</span>
                </div>
              </div>

              <div style={{ textAlign: 'center', background: 'white', padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>
                <QRCodeSVG
                  value={typeof window !== 'undefined' ? `${window.location.origin}/receipt/${lastOrder.orderId}` : ''}
                  size={140}
                />
                <p style={{ color: '#000', fontSize: '0.7rem', marginTop: '8px', fontWeight: '600' }}>SCAN FOR E-RECEIPT</p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSendWhatsApp}
                  disabled={!lastOrder.customerMobile}
                  style={{ flex: 1, padding: '12px', background: lastOrder.customerMobile ? '#25D366' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: lastOrder.customerMobile ? 'white' : 'rgba(255,255,255,0.2)', fontWeight: '600', cursor: lastOrder.customerMobile ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Smartphone size={18} /> Send WhatsApp
                </button>
                <button
                  onClick={() => setIsReceiptOpen(false)}
                  style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontWeight: '600', cursor: 'pointer' }}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
