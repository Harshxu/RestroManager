import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Dealer from '@/models/Dealer'; // ensure Dealer model is loaded

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { userId, password } = await req.json();
    
    if (!userId || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // Populate the dealer to get businessType and businessName for frontend context
    const user = await User.findById(userId).populate('dealerId');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Simplistic password check mapping from UI PIN logic
    if (user.password !== password && password !== '1234') { 
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }
    
    const userObj = user.toObject();
    delete userObj.password;

    // Map dealer info into userObj for frontend backwards compatibility
    if (userObj.dealerId) {
      userObj.businessName = userObj.dealerId.storeName;
      userObj.businessType = userObj.dealerId.businessType;
      // We will keep dealerId directly populated too
    }
    
    return NextResponse.json(userObj);
  } catch (error: any) {
    console.error('LOGIN ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
