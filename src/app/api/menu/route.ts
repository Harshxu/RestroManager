import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import RestroMenu from '@/models/RestroMenu';
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

    const dealer = await Dealer.findById(dealerId);
    if (!dealer) {
       return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }
    
    if (dealer.businessType !== 'Restaurant') {
       return NextResponse.json({ error: 'Only restaurants have a menu' }, { status: 400 });
    }

    const items = await RestroMenu.find({ dealerId }).sort({ createdAt: -1 });
    return NextResponse.json(items);
  } catch (error: any) {
    console.error('MENU GET ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();
    let dealerId = data.dealerId;
    
    if (!dealerId && data.userId) {
      const user = await User.findById(data.userId);
      if (user) dealerId = user.dealerId;
    }
    
    if (!dealerId || !data.name || !data.price || !data.category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const dealer = await Dealer.findById(dealerId);
    if (!dealer) return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });

    if (dealer.businessType !== 'Restaurant') {
       return NextResponse.json({ error: 'Only restaurants can create a menu' }, { status: 400 });
    }

    const cleanData = { ...data, dealerId };
    const item = await RestroMenu.create(cleanData);
    
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    console.error('MENU POST ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();
    const { _id, ...updateData } = data;
    
    if (!_id) {
      return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });
    }
    
    const item = await RestroMenu.findByIdAndUpdate(_id, updateData, { new: true });
    return NextResponse.json(item);
  } catch (error: any) {
    console.error('MENU PUT ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });
    }
    
    await RestroMenu.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Menu item deleted' }, { status: 200 });
  } catch (error: any) {
    console.error('MENU DELETE ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
