import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Table from '@/models/Table';
import User from '@/models/User';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    let dealerId = searchParams.get('dealerId');

    if (!dealerId && userId) {
      const user = await User.findById(userId);
      if (user) dealerId = user.dealerId;
    }

    if (!dealerId) {
      return NextResponse.json({ error: 'Missing dealerId' }, { status: 400 });
    }

    const tables = await Table.find({ dealerId }).sort({ number: 1 });
    return NextResponse.json(tables);
  } catch (error: any) {
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

    if (!dealerId || !data.number) {
      return NextResponse.json({ error: 'Table number and dealerId are required' }, { status: 400 });
    }

    const table = await Table.create({
      ...data,
      dealerId,
    });

    return NextResponse.json(table, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();
    const { _id, ...updateData } = data;

    if (!_id) {
      return NextResponse.json({ error: 'Missing table ID' }, { status: 400 });
    }

    const table = await Table.findByIdAndUpdate(_id, updateData, { new: true });
    return NextResponse.json(table);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing table ID' }, { status: 400 });
    }

    await Table.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Table deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
