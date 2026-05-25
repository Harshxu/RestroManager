import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import RestroInventory from '@/models/RestroInventory';
import StoreInventory from '@/models/StoreInventory';
import Dealer from '@/models/Dealer';
import User from '@/models/User';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    let dealerId = searchParams.get('dealerId');
    const userId = searchParams.get('userId');
    
    if (!dealerId && userId) {
      const user = await User.findById(userId);
      if (user) dealerId = user.dealerId;
    }
    
    if (!dealerId) {
      return NextResponse.json({ error: 'Missing dealerId' }, { status: 400 });
    }
    
    // Get last 50 orders, or respect custom limit (0 or 'all' for unlimited)
    const limitParam = searchParams.get('limit');
    let query = Order.find({ dealerId }).sort({ createdAt: -1 });
    
    if (limitParam === '0' || limitParam === 'all') {
      // no limit
    } else if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (!isNaN(parsedLimit)) {
        query = query.limit(parsedLimit);
      }
    } else {
      query = query.limit(50);
    }

    const orders = await query;
    return NextResponse.json(orders);
  } catch (error: any) {
    console.error('ORDER GET ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();
    
    let dealerId = data.dealerId;
    const createdBy = data.userId;
    
    if (!dealerId && data.userId) {
      const user = await User.findById(data.userId);
      if (user) dealerId = user.dealerId;
    }
    
    if (!dealerId || !data.items || data.items.length === 0) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
    }
    
    const dealer = await Dealer.findById(dealerId);
    if (!dealer) {
       return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    const orderId = `OB-${Math.floor(10000 + Math.random() * 90000)}`;
    
    // Create the order
    const order = await Order.create({
      ...data,
      dealerId,
      createdBy,
      orderId
    });
    
    // Process inventory updates (decrement stock)
    for (const item of data.items) {
      if (item.inventoryId) {
        if (dealer.businessType !== 'Restaurant') {
          // Only decrement stock for Stores. Restaurants sell from Menu (no stock).
          await StoreInventory.findByIdAndUpdate(item.inventoryId, {
            $inc: { stock: -item.quantity }
          });
        }
      }
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error('ORDER POST ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
