import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Dealer from '@/models/Dealer';

export async function GET() {
  try {
    await dbConnect();
    const users = await User.find({}, '-password').populate('dealerId'); // exclude password
    
    // Map dealer info back to user objects for the frontend UI
    const mappedUsers = users.map(user => {
      const obj = user.toObject();
      if (obj.dealerId) {
        obj.businessName = obj.dealerId.storeName;
        obj.businessType = obj.dealerId.businessType;
      } else {
        obj.businessName = 'Unknown Store';
        obj.businessType = 'Store';
      }
      return obj;
    });

    return NextResponse.json(mappedUsers);
  } catch (error: any) {
    console.error('USER FETCH ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
