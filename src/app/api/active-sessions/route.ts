import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ActiveSession from '@/models/ActiveSession';
import Table from '@/models/Table';
import User from '@/models/User';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const sessions = await ActiveSession.find({ userId, status: 'active' });
    return NextResponse.json(sessions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();
    
    // Check if session already exists for this reference
    let session = await ActiveSession.findOne({ 
      userId: data.userId, 
      reference: data.reference, 
      status: 'active' 
    });

    if (session) {
      // Update existing session
      session.items = data.items;
      await session.save();
    } else {
      // Create new session
      session = await ActiveSession.create(data);
    }

    // Sync status to Floor Plan Table
    if (data.reference && data.reference.startsWith('Table ')) {
      const tableNum = data.reference.replace('Table ', '');
      const user = await User.findById(data.userId);
      if (user) {
        await Table.findOneAndUpdate(
          { number: tableNum, dealerId: user.dealerId },
          { 
            status: 'occupied', 
            occupiedSince: new Date(), 
            activeSessionId: session._id 
          }
        );
      }
    }

    return NextResponse.json(session);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    await dbConnect();
    const session = await ActiveSession.findById(id);
    if (session) {
      if (session.reference && session.reference.startsWith('Table ')) {
        const tableNum = session.reference.replace('Table ', '');
        const user = await User.findById(session.userId);
        if (user) {
          await Table.findOneAndUpdate(
            { number: tableNum, dealerId: user.dealerId },
            { 
              status: 'free', 
              occupiedSince: null, 
              activeSessionId: null 
            }
          );
        }
      }
      await ActiveSession.findByIdAndDelete(id);
    }

    return NextResponse.json({ message: 'Session deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
