import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
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

    const dealer = await Dealer.findById(dealerId);
    if (!dealer) {
       return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }
    
    let items;
    if (dealer.businessType === 'Restaurant') {
       items = await RestroInventory.find({ dealerId }).sort({ createdAt: -1 });
    } else {
       items = await StoreInventory.find({ dealerId }).sort({ createdAt: -1 });
    }
    
    return NextResponse.json(items);
  } catch (error: any) {
    console.error('INVENTORY GET ERROR:', error);
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
    
    if (!dealerId || !data.name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const dealer = await Dealer.findById(dealerId);
    if (!dealer) return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });

    const cleanData = { ...data, dealerId };
    
    let item;
    if (dealer.businessType === 'Restaurant') {
       item = await RestroInventory.create(cleanData);
    } else {
       // Map legacy payload to StoreInventory expectations
       if (cleanData.price && !cleanData.sellingPrice) {
         cleanData.sellingPrice = cleanData.price;
       }
       if (!cleanData.sku) {
         cleanData.sku = `SKU-${Math.floor(Math.random()*10000)}`;
       }
       item = await StoreInventory.create(cleanData);
    }
    
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    console.error('INVENTORY POST ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();
    const { _id, businessType, dealerId, userId, ...updateData } = data;
    
    if (!_id) {
      return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });
    }
    
    let item = await RestroInventory.findByIdAndUpdate(_id, updateData, { new: true });
    if (!item) {
       const storeUpdateData = { ...updateData };
       if (storeUpdateData.price !== undefined && storeUpdateData.sellingPrice === undefined) {
         storeUpdateData.sellingPrice = storeUpdateData.price;
         delete storeUpdateData.price;
       }
       item = await StoreInventory.findByIdAndUpdate(_id, storeUpdateData, { new: true });
    }
    
    return NextResponse.json(item);
  } catch (error: any) {
    console.error('INVENTORY PUT ERROR:', error);
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
    
    let deleted = await RestroInventory.findByIdAndDelete(id);
    if (!deleted) {
       deleted = await StoreInventory.findByIdAndDelete(id);
    }
    
    return NextResponse.json({ message: 'Item deleted' }, { status: 200 });
  } catch (error: any) {
    console.error('INVENTORY DELETE ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
