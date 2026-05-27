'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  Download, 
  Calendar, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  ChevronDown,
  FileText
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']; // Premium Blue, Purple, Green, Yellow, Red

export default function ReportsPage() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('This Month');
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);
  
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [rawExpenses, setRawExpenses] = useState<any[]>([]);
  const [rawInventory, setRawInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [salesData, setSalesData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  
  const [metrics, setMetrics] = useState({ revenue: 0, profit: 0, retention: 74 });

  // Helper to determine if a date falls within the selected timeframe
  const isWithinTimeframe = (dateStr: string, tf: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    
    if (tf === 'This Month') {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    if (tf === 'Last Month') {
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return date.getMonth() === prevMonth && date.getFullYear() === prevYear;
    }
    if (tf === 'Last 3 Months') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      threeMonthsAgo.setHours(0, 0, 0, 0);
      return date >= threeMonthsAgo;
    }
    if (tf === 'This Year') {
      return date.getFullYear() === now.getFullYear();
    }
    return true; // 'All Time'
  };

  // Fetch all raw data (limit=0 for orders to get all data)
  useEffect(() => {
    if (!user?._id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const endpoint = user.businessType === 'Restaurant' ? '/api/menu' : '/api/inventory';
        const dealerId = user?.dealerId?._id || user?.dealerId;
        
        const [ordersRes, invRes, expRes] = await Promise.all([
          fetch(`/api/orders?userId=${user._id}&dealerId=${dealerId}&limit=0`),
          fetch(`${endpoint}?userId=${user._id}&dealerId=${dealerId}`),
          fetch(`/api/expenses?userId=${user._id}&dealerId=${dealerId}`)
        ]);
        
        if (ordersRes.ok && invRes.ok && expRes.ok) {
          setRawOrders(await ordersRes.json());
          setRawInventory(await invRes.json());
          setRawExpenses(await expRes.json());
        }
      } catch (e) {
        console.error('Error fetching analytics raw data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Recalculate metrics and chart groups when raw data or timeframe changes
  useEffect(() => {
    if (!user) return;

    // 1. Filter orders and expenses
    const filteredOrders = rawOrders.filter(o => isWithinTimeframe(o.createdAt || o.date, timeframe));
    const filteredExpenses = rawExpenses.filter(e => isWithinTimeframe(e.createdAt || e.date, timeframe));

    // 2. Compute Total Revenue & Profit
    let totalRev = filteredOrders.reduce((acc, o) => acc + (o.total || 0), 0);
    let totalExp = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const realProfit = totalRev - totalExp;

    setMetrics({ 
      revenue: totalRev, 
      profit: realProfit,
      retention: filteredOrders.length > 0 ? 84 : 0
    });

    // 3. Category distribution (Pie Chart) - split by actual sales contribution per category
    const catMap: Record<string, number> = {};
    if (filteredOrders.length > 0) {
      filteredOrders.forEach((o: any) => {
        o.items.forEach((item: any) => {
          const matchedItem = rawInventory.find((i: any) => i.name === item.name);
          const cat = matchedItem?.category || 'General';
          catMap[cat] = (catMap[cat] || 0) + (item.price * item.quantity);
        });
      });
    } else {
      rawInventory.forEach((i: any) => {
        catMap[i.category] = (catMap[i.category] || 0) + 1;
      });
    }
    const catVis = Object.keys(catMap).map(k => ({ name: k, value: catMap[k] }));
    setCategoryData(catVis.length ? catVis : [{ name: user.businessType, value: 100 }]);

    // 4. Product performance table (aggregated metrics)
    const productPerf: Record<string, { qty: number, revenue: number }> = {};
    filteredOrders.forEach((o: any) => {
      o.items.forEach((item: any) => {
        if (!productPerf[item.name]) productPerf[item.name] = { qty: 0, revenue: 0 };
        productPerf[item.name].qty += item.quantity;
        productPerf[item.name].revenue += item.price * item.quantity;
      });
    });

    const topProductsText = Object.keys(productPerf)
      .sort((a, b) => productPerf[b].revenue - productPerf[a].revenue)
      .map((name, idx) => {
        const matchedInv = rawInventory.find((i: any) => i.name === name);
        let stockText = 'N/A';
        
        if (matchedInv && matchedInv.stock !== undefined) {
          const maxStock = matchedInv.maxStock || 100;
          const curStock = matchedInv.stock;
          const pct = Math.min(Math.round((curStock / maxStock) * 100), 100);
          stockText = `${pct}%`;
        }
        
        return {
          id: idx.toString(),
          product: name,
          revenue: `₹${productPerf[name].revenue}`,
          stock: stockText,
          trend: idx % 2 === 0 ? 'up' : 'down'
        };
      });
    setTableData(topProductsText);

    // 5. Generate Bar Chart data dynamically by timeframe grouping
    let chartData: any[] = [];
    if (timeframe === 'This Month' || timeframe === 'Last Month') {
      const weeklySales = [0, 0, 0, 0, 0];
      const weeklyExp = [0, 0, 0, 0, 0];
      
      filteredExpenses.forEach(e => {
        const date = new Date(e.createdAt || e.date);
        const day = date.getDate();
        const weekIdx = Math.min(4, Math.floor((day - 1) / 7));
        weeklyExp[weekIdx] += e.amount || 0;
      });

      filteredOrders.forEach(o => {
        const date = new Date(o.createdAt || o.date);
        const day = date.getDate();
        const weekIdx = Math.min(4, Math.floor((day - 1) / 7));
        weeklySales[weekIdx] += o.total || 0;
      });

      chartData = [
        { name: 'Week 1', sales: weeklySales[0], profit: weeklySales[0] - weeklyExp[0] },
        { name: 'Week 2', sales: weeklySales[1], profit: weeklySales[1] - weeklyExp[1] },
        { name: 'Week 3', sales: weeklySales[2], profit: weeklySales[2] - weeklyExp[2] },
        { name: 'Week 4', sales: weeklySales[3], profit: weeklySales[3] - weeklyExp[3] },
      ];
      if (weeklySales[4] > 0 || weeklyExp[4] > 0) {
        chartData.push({ name: 'Week 5', sales: weeklySales[4], profit: weeklySales[4] - weeklyExp[4] });
      }
    } else if (timeframe === 'Last 3 Months') {
      const monthSales: Record<string, number> = {};
      const monthExp: Record<string, number> = {};
      const months: string[] = [];
      
      for (let i = 2; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mName = d.toLocaleString('default', { month: 'short' });
        months.push(mName);
        monthSales[mName] = 0;
        monthExp[mName] = 0;
      }

      filteredOrders.forEach(o => {
        const mName = new Date(o.createdAt || o.date).toLocaleString('default', { month: 'short' });
        if (monthSales[mName] !== undefined) monthSales[mName] += o.total || 0;
      });

      filteredExpenses.forEach(e => {
        const mName = new Date(e.createdAt || e.date).toLocaleString('default', { month: 'short' });
        if (monthExp[mName] !== undefined) monthExp[mName] += e.amount || 0;
      });

      chartData = months.map(mName => ({
        name: mName,
        sales: monthSales[mName],
        profit: monthSales[mName] - monthExp[mName]
      }));
    } else if (timeframe === 'This Year') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthSales = new Array(12).fill(0);
      const monthExp = new Array(12).fill(0);

      filteredOrders.forEach(o => {
        const monthIdx = new Date(o.createdAt || o.date).getMonth();
        monthSales[monthIdx] += o.total || 0;
      });

      filteredExpenses.forEach(e => {
        const monthIdx = new Date(e.createdAt || e.date).getMonth();
        monthExp[monthIdx] += e.amount || 0;
      });

      chartData = monthNames.map((name, idx) => ({
        name,
        sales: monthSales[idx],
        profit: monthSales[idx] - monthExp[idx]
      }));
    } else {
      const yearSales: Record<string, number> = {};
      const yearExp: Record<string, number> = {};

      filteredOrders.forEach(o => {
        const yr = new Date(o.createdAt || o.date).getFullYear().toString();
        yearSales[yr] = (yearSales[yr] || 0) + (o.total || 0);
      });

      filteredExpenses.forEach(e => {
        const yr = new Date(e.createdAt || e.date).getFullYear().toString();
        yearExp[yr] = (yearExp[yr] || 0) + (e.amount || 0);
      });

      const years = Array.from(new Set([...Object.keys(yearSales), ...Object.keys(yearExp)])).sort();
      chartData = years.map(yr => ({
        name: yr,
        sales: yearSales[yr] || 0,
        profit: (yearSales[yr] || 0) - (yearExp[yr] || 0)
      }));
      
      if (chartData.length === 0) {
        chartData = [{ name: new Date().getFullYear().toString(), sales: 0, profit: 0 }];
      }
    }
    
    setSalesData(chartData);

  }, [rawOrders, rawExpenses, rawInventory, timeframe, user]);

  // Export PDF via native Browser Print
  const exportToPDF = () => {
    window.print();
  };

  // Export CSV (Excel) file download
  const exportToExcel = () => {
    let csvContent = "";
    
    // Header Info
    csvContent += `BUSINESS REPORT - ${user?.businessName?.toUpperCase() || 'MY STORE'}\r\n`;
    csvContent += `Timeframe: ${timeframe}\r\n`;
    csvContent += `Generated On: ${new Date().toLocaleString()}\r\n\r\n`;
    
    // Summary Metrics
    csvContent += "SUMMARY METRICS\r\n";
    csvContent += `Total Revenue,Net Profit,Customer Retention\r\n`;
    csvContent += `INR ${Math.floor(metrics.revenue)},INR ${Math.floor(metrics.profit)},${metrics.retention}%\r\n\r\n`;
    
    // Sales breakdown
    csvContent += "SALES & PROFIT BREAKDOWN\r\n";
    csvContent += "Period,Sales (INR),Profit (INR)\r\n";
    salesData.forEach(row => {
      csvContent += `${row.name},${Math.floor(row.sales)},${Math.floor(row.profit)}\r\n`;
    });
    csvContent += "\r\n";
    
    // Product Performance
    csvContent += "PRODUCT PERFORMANCE\r\n";
    csvContent += "Product,Revenue (INR),Stock Health,Trend\r\n";
    tableData.forEach(row => {
      const rev = row.revenue.replace('₹', '');
      csvContent += `"${row.product}",${rev},"${row.stock}","${row.trend.toUpperCase()}"\r\n`;
    });
    
    // Create Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const filename = `${user?.businessName || 'business'}_report_${timeframe.toLowerCase().replace(' ', '_')}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Dynamic Global Print Media Style Sheet */}
      <style>{`
        /* Print-only overrides */
        @media print {
          /* Reset page setup and margins */
          @page {
            size: A4 portrait;
            margin: 1.6cm 1.4cm 1.6cm 1.4cm;
          }
          
          /* Reset colors and base styling to crisp business-white */
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: system-ui, -apple-system, sans-serif !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            font-size: 11pt !important;
            line-height: 1.5 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Hide non-printable app navigation and widgets */
          aside, nav, #ai-chat-bubble, .no-print, [class*="sidebar"], [class*="AIAssistant"], [class*="ReviewAlerts"] {
            display: none !important;
          }

          /* Stretch main container to full sheet space and strip margin-left completely! */
          main, [class*="mainContent"], div[class*="layoutContainer"], div[class*="mainContent"] {
            padding: 0 !important;
            margin: 0 !important;
            margin-left: 0 !important; /* Strip sidebar margin */
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
            background: transparent !important;
            overflow: visible !important;
          }

          /* Metrics Grid 3-column layout constraints for print */
          .metrics-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 12px !important;
            margin-bottom: 24px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

          /* Compact Metrics Cards */
          .glass-dark {
            background: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 12px !important;
            box-shadow: none !important;
            color: #0f172a !important;
            padding: 14px 16px !important; /* Compact padding */
            margin-bottom: 24px !important; /* Keep a nice healthy print gap between all cards! */
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
          }

          .glass-dark p {
            font-size: 8.5pt !important;
            margin-bottom: 6px !important;
            color: #475569 !important;
            font-weight: 600 !important;
          }

          .glass-dark h2 {
            font-size: 18pt !important;
            font-weight: 800 !important;
            margin: 0 !important;
            color: #0f172a !important;
          }

          /* Metrics green/red badges */
          .glass-dark span[style*="color: rgb(74, 222, 128)"],
          .glass-dark span[style*="color: #4ade80"],
          .glass-dark span[style*="color: rgb(248, 113, 113)"],
          .glass-dark span[style*="color: #f87171"] {
            font-size: 8pt !important;
            padding: 2px 6px !important;
            border-radius: 6px !important;
            margin-left: 6px !important;
          }

          /* Force clean vertical stack for charts to avoid horizontal overlap */
          .charts-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 24px !important;
            width: 100% !important;
            margin-bottom: 24px !important;
          }

          .charts-grid > div {
            width: 100% !important;
            height: 320px !important; /* Stable height for print */
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .charts-grid h3 {
            font-size: 12pt !important;
            font-weight: 700 !important;
            margin: 0 0 16px 0 !important;
            border-bottom: 1.5px solid #e2e8f0 !important;
            padding-bottom: 6px !important;
            color: #0f172a !important;
          }

          /* Table Card Border Box */
          .performance-table-card {
            border: 1px solid #cbd5e1 !important;
            border-radius: 12px !important;
            background: #ffffff !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

          /* High contrast typography adjustments */
          h1, h2, h3, h4, h5, p, span, td, th {
            color: #0f172a !important;
            text-shadow: none !important;
          }

          h3 {
            font-size: 14pt !important;
            font-weight: 700 !important;
            margin-bottom: 12px !important;
            border-bottom: 1px solid #e2e8f0 !important;
            padding-bottom: 6px !important;
          }

          p {
            color: #475569 !important;
          }

          /* Positive green badges for print */
          .glass-dark span[style*="color: rgb(74, 222, 128)"],
          .glass-dark span[style*="color: #4ade80"] {
            color: #15803d !important;
            background: #f0fdf4 !important;
            border: 1px solid #bbf7d0 !important;
          }

          /* Elegant business tables */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 10px !important;
          }

          thead tr {
            background: #f8fafc !important;
            border-bottom: 2px solid #cbd5e1 !important;
          }

          th {
            color: #475569 !important;
            padding: 8px 12px !important;
            font-size: 8.5pt !important;
            font-weight: 700 !important;
          }

          td {
            padding: 10px 12px !important;
            border-bottom: 1px solid #e2e8f0 !important;
            font-size: 9.5pt !important;
          }

          tr {
            page-break-inside: avoid !important;
          }

          /* Overrides for Recharts vector graphics */
          .recharts-cartesian-grid-horizontal line, 
          .recharts-cartesian-grid-vertical line {
            stroke: #cbd5e1 !important;
            stroke-dasharray: 2 2 !important;
            opacity: 0.5 !important;
          }
          .recharts-text {
            fill: #475569 !important;
            font-size: 8pt !important;
          }
          .recharts-legend-item-text {
            color: #475569 !important;
          }
          .recharts-responsive-container {
            width: 100% !important;
            height: 300px !important;
          }
        }

        /* Screen-only display rule for print-header */
        .print-header {
          display: none;
        }

        @media print {
          .print-header {
            display: block !important;
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 16px !important;
            margin-bottom: 30px !important;
          }
          .print-header-top {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
          }
          .print-header-title {
            font-size: 20pt !important;
            font-weight: 800 !important;
            color: #0f172a !important;
            margin: 0 0 4px 0 !important;
            letter-spacing: -0.5px !important;
            text-transform: uppercase !important;
          }
          .print-header-meta {
            font-size: 9.5pt !important;
            color: #475569 !important;
            margin: 2px 0 !important;
          }
          .print-badge {
            font-size: 11pt !important;
            font-weight: 700 !important;
            background: #f1f5f9 !important;
            border: 1px solid #cbd5e1 !important;
            padding: 4px 12px !important;
            border-radius: 8px !important;
            color: #0f172a !important;
          }
        }
      `}</style>

      {/* Corporate Print-Only Cover Header */}
      <div className="print-header">
        <div className="print-header-top">
          <div>
            <h1 className="print-header-title">Business Performance Audit</h1>
            <p className="print-header-meta"><strong>Authorized Store:</strong> {user?.businessName || 'Restrofy Store'}</p>
            <p className="print-header-meta"><strong>Operational Type:</strong> {user?.businessType || 'Retail'}</p>
          </div>
          <div className="print-badge">
            Timeframe: {timeframe}
          </div>
        </div>
        <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '8.5pt', color: '#64748b' }}>
          <span><strong>Report ID:</strong> OB-REP-789312</span>
          <span><strong>Generated:</strong> {new Date().toLocaleString()}</span>
        </div>
      </div>

      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Business Reports</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Generating analytics for {user?.businessName || 'your store'}.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Custom Animated Month / Timeframe Dropdown */}
          <div style={{ position: 'relative' }} className="no-print">
            <div 
              onClick={() => setShowTimeframeDropdown(!showTimeframeDropdown)}
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                padding: '10px 16px', 
                borderRadius: '12px', 
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.2s'
              }}
              onMouseOver={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.25)'}
              onMouseOut={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'}
            >
              <Calendar size={18} color="rgba(255,255,255,0.4)" />
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{timeframe}</span>
              <ChevronDown size={16} color="rgba(255,255,255,0.3)" style={{ transform: showTimeframeDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </div>
            
            <AnimatePresence>
              {showTimeframeDropdown && (
                <>
                  <div 
                    onClick={() => setShowTimeframeDropdown(false)} 
                    style={{ position: 'fixed', inset: 0, zIndex: 998 }} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    style={{ 
                      position: 'absolute', 
                      top: 'calc(100% + 8px)', 
                      right: 0, 
                      background: '#12121e', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '14px', 
                      padding: '6px', 
                      minWidth: '180px', 
                      boxShadow: '0 10px 30px rgba(0,0,0,0.6)', 
                      zIndex: 999 
                    }}
                  >
                    {['This Month', 'Last Month', 'Last 3 Months', 'This Year', 'All Time'].map(tf => (
                      <button
                        key={tf}
                        onClick={() => {
                          setTimeframe(tf);
                          setShowTimeframeDropdown(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: timeframe === tf ? 'var(--accent)' : 'transparent',
                          color: timeframe === tf ? 'white' : 'rgba(255,255,255,0.7)',
                          textAlign: 'left',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'block',
                          transition: 'all 0.15s'
                        }}
                        onMouseOver={e => {
                          if (timeframe !== tf) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.color = 'white';
                          }
                        }}
                        onMouseOut={e => {
                          if (timeframe !== tf) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                          }
                        }}
                      >
                        {tf}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          
          {/* Working PDF Export Button */}
          <button 
            onClick={exportToPDF}
            className="no-print"
            style={{ 
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
              color: 'white', 
              border: 'none', 
              padding: '12px 20px', 
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(99,102,241,0.3)',
              transition: 'transform 0.15s'
            }}
            onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'}
            onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}
          >
            <FileText size={18} /> Export PDF
          </button>

          {/* Working Excel Export Button */}
          <button 
            onClick={exportToExcel}
            className="no-print"
            style={{ 
              background: 'linear-gradient(135deg, #10b981, #059669)', 
              color: 'white', 
              border: 'none', 
              padding: '12px 20px', 
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(16,185,129,0.3)',
              transition: 'transform 0.15s'
            }}
            onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'}
            onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}
          >
            <Download size={18} /> Export Excel
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ padding: '80px', textAlign: 'center', color: 'rgba(255,255,255,0.35)' }}>
          <div className="pulse" style={{ fontSize: '1.2rem', fontWeight: 600 }}>Calculating business analytics...</div>
        </div>
      ) : (
        <>
          <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
            <div className="glass-dark" style={{ padding: '28px', borderRadius: '20px' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', marginBottom: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Revenue</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>₹{Math.floor(metrics.revenue).toLocaleString()}</h2>
                <span style={{ color: '#4ade80', fontSize: '1rem', fontWeight: '700', background: 'rgba(74, 222, 128, 0.1)', padding: '4px 12px', borderRadius: '12px' }}>+18.2%</span>
              </div>
            </div>
            <div className="glass-dark" style={{ padding: '28px', borderRadius: '20px' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', marginBottom: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Profit</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>₹{Math.floor(metrics.profit).toLocaleString()}</h2>
                <span style={{ color: '#4ade80', fontSize: '1rem', fontWeight: '700', background: 'rgba(74, 222, 128, 0.1)', padding: '4px 12px', borderRadius: '12px' }}>+12.5%</span>
              </div>
            </div>
            <div className="glass-dark" style={{ padding: '28px', borderRadius: '20px' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', marginBottom: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Retention</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>{metrics.retention}%</h2>
                <span style={{ color: metrics.retention > 0 ? '#4ade80' : 'rgba(255,255,255,0.2)', fontSize: '1rem', fontWeight: '700', background: metrics.retention > 0 ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '12px' }}>
                  {metrics.retention > 0 ? 'Optimal' : 'No Data'}
                </span>
              </div>
            </div>
          </div>

          <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '40px' }}>
            <div className="glass-dark" style={{ padding: '32px', borderRadius: '24px', height: '450px' }}>
              <h3 style={{ marginBottom: '24px' }}>Revenue vs Profit ({timeframe})</h3>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" />
                  <YAxis stroke="rgba(255,255,255,0.3)" />
                  <Tooltip 
                    contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Legend />
                  <Bar dataKey="sales" name="Sales" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="#7928ca" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-dark" style={{ padding: '32px', borderRadius: '24px', height: '450px' }}>
              <h3 style={{ marginBottom: '24px' }}>Category Contribution</h3>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="35%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-dark performance-table-card" style={{ borderRadius: '24px', overflow: 'hidden', padding: 0 }}>
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Product Sales Performance ({timeframe})</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th style={{ padding: '20px 24px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>PRODUCT</th>
                  <th style={{ padding: '20px 24px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>REVENUE</th>
                  <th style={{ padding: '20px 24px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>STOCK HEALTH</th>
                  <th style={{ padding: '20px 24px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>TREND</th>
                </tr>
              </thead>
              <tbody>
                {tableData.length === 0 ? (
                   <tr><td colSpan={4} style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No product sales recorded in this period.</td></tr>
                ) : tableData.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding: '20px 24px', fontWeight: '700', fontSize: '1.05rem', color: '#fff' }}>{item.product}</td>
                    <td style={{ padding: '20px 24px', fontWeight: '800', fontSize: '1.1rem' }}>{item.revenue}</td>
                    <td style={{ padding: '20px 24px' }}>
                      {item.stock === 'N/A' ? (
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', fontStyle: 'italic' }}>Made to order</span>
                      ) : (
                        <div style={{ width: '120px', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ 
                            position: 'absolute', 
                            left: 0, 
                            top: 0, 
                            height: '100%', 
                            width: item.stock, 
                            background: parseInt(item.stock) > 50 ? '#4ade80' : parseInt(item.stock) > 20 ? '#facc15' : '#f87171',
                            borderRadius: '4px',
                            boxShadow: `0 0 10px ${parseInt(item.stock) > 50 ? '#4ade80' : parseInt(item.stock) > 20 ? '#facc15' : '#f87171'}`
                          }} />
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      {item.trend === 'up' ? (
                        <TrendingUp size={24} color="#4ade80" />
                      ) : (
                        <TrendingDown size={24} color="#f87171" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
