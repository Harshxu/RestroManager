import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Pre-import all Mongoose models to register them at connection startup
// This completely prevents "Schema hasn't been registered" errors in dynamic Next.js routes
import '@/models/Dealer';
import '@/models/User';
import '@/models/Table';
import '@/models/Order';
import '@/models/ActiveSession';
import '@/models/RestroInventory';
import '@/models/RestroMenu';
import '@/models/StoreInventory';
import '@/models/Expense';
import '@/models/Review';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
