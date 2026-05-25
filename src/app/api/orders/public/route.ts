import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import Dealer from '@/models/Dealer';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
    }

    // Find the order
    const order = await Order.findOne({ orderId });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Find the associated store (dealer)
    const store = await Dealer.findById(order.dealerId).select('storeName address ownerPhone gstNumber');
    
    // Format to match old expectations if needed by UI
    const storeResponse = store ? {
      businessName: store.storeName,
      businessAddress: store.address,
      phone: store.ownerPhone,
      gstNumber: store.gstNumber,
    } : null;

    return NextResponse.json({ order, store: storeResponse });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
