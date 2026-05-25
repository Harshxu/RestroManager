import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Dealer from '@/models/Dealer';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    const { email, password, name, businessName, businessType, location, phone } = body;

    // Check if user exists by username (email)
    const existingUser = await User.findOne({ username: email });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Create the Dealer (business)
    const dealer = await Dealer.create({
      storeName: businessName,
      businessType: businessType === 'Kirana' || businessType === 'Medical' ? 'Store' : 'Restaurant',
      ownerName: name,
      ownerPhone: phone || email, // fallback if phone not provided
      address: location,
    });

    // Create the Owner User
    const user = await User.create({
      username: email,
      password, // Plain text PIN for MVP
      name,
      phone: phone || email,
      role: 'Owner',
      dealerId: dealer._id,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Error registering store' }, { status: 500 });
  }
}
