import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Expense from '@/models/Expense';
import User from '@/models/User';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let dealerId = searchParams.get('dealerId');
    const userId = searchParams.get('userId');

    if (!dealerId && userId) {
      await dbConnect();
      const user = await User.findById(userId);
      if (user) dealerId = user.dealerId;
    }

    if (!dealerId) {
      return NextResponse.json({ error: 'dealerId is required' }, { status: 400 });
    }

    await dbConnect();
    const expenses = await Expense.find({ dealerId }).sort({ date: -1 });
    return NextResponse.json(expenses);
  } catch (error: any) {
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
    
    const expense = await Expense.create({
      ...data,
      dealerId,
      createdBy
    });
    return NextResponse.json(expense);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    await dbConnect();
    await Expense.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Expense deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
