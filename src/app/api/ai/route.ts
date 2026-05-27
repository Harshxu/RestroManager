import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import RestroInventory from '@/models/RestroInventory';
import RestroMenu from '@/models/RestroMenu';
import ActiveSession from '@/models/ActiveSession';
import User from '@/models/User';
import Table from '@/models/Table';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Use key from DB — never from env
    const apiKey = user.geminiApiKey;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No Gemini API key set up yet.', setup_required: true },
        { status: 402 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const dealerId = user.dealerId;

    // Gather all business data in parallel
    const [orders, menuItems, rawMaterials, activeSessions, tables] = await Promise.all([
      Order.find({ dealerId }).sort({ createdAt: -1 }).limit(100),
      RestroMenu.find({ dealerId }),
      RestroInventory.find({ dealerId }),
      ActiveSession.find({ userId, status: 'active' }),
      Table.find({ dealerId }),
    ]);

    // Compute analytics
    const totalRevenue = orders.reduce((s: number, o: any) => s + (o.total || 0), 0);
    const todayOrders = orders.filter((o: any) => {
      const d = new Date(o.createdAt);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    });
    const todayRevenue = todayOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);

    // Top selling dishes
    const dishCount: Record<string, { name: string; qty: number; revenue: number }> = {};
    orders.forEach((o: any) => {
      o.items?.forEach((item: any) => {
        if (!dishCount[item.name]) dishCount[item.name] = { name: item.name, qty: 0, revenue: 0 };
        dishCount[item.name].qty += item.quantity || 0;
        dishCount[item.name].revenue += (item.price * item.quantity) || 0;
      });
    });
    const topDishes = Object.values(dishCount).sort((a, b) => b.qty - a.qty).slice(0, 5);

    // Low stock raw materials
    const lowStock = rawMaterials.filter((m: any) => (m.stock || 0) <= (m.minStock || 5));

    // Payment methods split
    const paymentMethods: Record<string, number> = {};
    orders.forEach((o: any) => {
      const m = o.paymentMethod || 'Cash';
      paymentMethods[m] = (paymentMethods[m] || 0) + 1;
    });

    // Unavailable menu items
    const unavailableItems = menuItems.filter((m: any) => !m.isAvailable);

    // Table utilization
    const occupiedTables = tables.filter((t: any) => t.status === 'occupied').length;
    const totalTables = tables.length;

    // Build context prompt
    const businessContext = `
You are an expert restaurant business AI analyst embedded inside a Dhaba (Indian roadside restaurant) management system called "Restrofy".
Your job is to autonomously analyze the real-time business data and provide actionable insights without being asked.

=== BUSINESS SNAPSHOT ===
Business Name: ${user.businessName || 'The Dhaba'}
Business Type: ${user.businessType}
Total Orders (last 100): ${orders.length}
Total Revenue: ₹${totalRevenue.toFixed(2)}
Today's Orders: ${todayOrders.length}
Today's Revenue: ₹${todayRevenue.toFixed(2)}

=== LIVE STATUS ===
Active Tables Right Now: ${occupiedTables}/${totalTables}
Active KOT Sessions: ${activeSessions.length}

=== MENU ===
Total Dishes: ${menuItems.length}
Unavailable Items: ${unavailableItems.map((i: any) => i.name).join(', ') || 'None'}

=== TOP SELLING DISHES ===
${topDishes.map((d, i) => `${i + 1}. ${d.name} - ${d.qty} sold - ₹${d.revenue.toFixed(0)} revenue`).join('\n') || 'No data yet'}

=== RAW MATERIALS / INVENTORY ===
Total Items: ${rawMaterials.length}
LOW STOCK ALERTS (${lowStock.length}): ${lowStock.map((m: any) => `${m.name} (${m.stock} ${m.unit} left, min: ${m.minStock})`).join(', ') || 'None'}

=== PAYMENT METHODS ===
${Object.entries(paymentMethods).map(([k, v]) => `${k}: ${v} orders`).join(', ') || 'No data'}

=== YOUR TASK ===
Based on this REAL business data, generate exactly 6 insights in the following JSON format.
Each insight must be specific, actionable, and grounded in the actual data shown above.
Do NOT make up data. Do NOT give generic advice. Be specific to THIS dhaba.

Return ONLY valid JSON, nothing else:
{
  "insights": [
    {
      "id": "unique-id-string",
      "type": "bug" | "feature" | "business" | "alert" | "tip",
      "priority": "high" | "medium" | "low",
      "title": "Short title (max 8 words)",
      "description": "Detailed actionable insight specific to this dhaba (2-3 sentences)",
      "icon": "emoji",
      "action": "Short CTA text or null"
    }
  ],
  "summary": "One sentence executive summary of the business health right now",
  "score": 0-100
}

Rules:
- If low stock items exist, include an 'alert' type for them with HIGH priority
- If any menu items are unavailable, include a 'bug' insight
- Include at least one 'business' insight about revenue patterns
- If no orders today, mention it
- Be conversational but professional. Speak to the owner directly.
- The 'score' is the overall business health from 0-100 based on all the data
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(businessContext);
    const text = result.response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      ...parsed,
      generatedAt: new Date().toISOString(),
      dataSnapshot: {
        totalOrders: orders.length,
        todayOrders: todayOrders.length,
        todayRevenue,
        totalRevenue,
        lowStockCount: lowStock.length,
        activeSessions: activeSessions.length,
        tableUtilization: totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0,
      }
    });
  } catch (error: any) {
    console.error('AI ANALYST ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
