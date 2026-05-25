import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// GET — check if key is set (returns masked version only)
export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const user = await User.findById(userId).select('geminiApiKey');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const key = user.geminiApiKey || '';
    return NextResponse.json({
      hasKey: key.length > 0,
      // Return a masked preview: AIzaSy••••••••XXXX
      maskedKey: key.length > 8
        ? `${key.slice(0, 7)}${'•'.repeat(key.length - 11)}${key.slice(-4)}`
        : key.length > 0 ? '••••••••' : '',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — save the key
export async function POST(req: Request) {
  try {
    await dbConnect();
    const { userId, geminiApiKey } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    await User.findByIdAndUpdate(userId, { geminiApiKey: geminiApiKey || '' });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — remove the key
export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    await User.findByIdAndUpdate(userId, { geminiApiKey: '' });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
