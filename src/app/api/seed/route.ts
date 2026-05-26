import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Dealer from '@/models/Dealer';
import RestroInventory from '@/models/RestroInventory';
import StoreInventory from '@/models/StoreInventory';
import Order from '@/models/Order';
import Expense from '@/models/Expense';

export async function GET() {
  try {
    await dbConnect();
    
    // Safety check: Prevent seeding if data already exists in the database
    const existingDealersCount = await Dealer.countDocuments();
    if (existingDealersCount > 0) {
      return NextResponse.json(
        { error: 'Database already has active business accounts. Seeding is disabled to prevent accidental production data loss.' }, 
        { status: 400 }
      );
    }
    
    // Drop old indexes to prevent "email_1 duplicate key" errors from the old schema
    try {
      await User.collection.dropIndexes();
      await Dealer.collection.dropIndexes();
      await RestroInventory.collection.dropIndexes();
      await StoreInventory.collection.dropIndexes();
      await Order.collection.dropIndexes();
    } catch(e) {
      // ignore if collection doesn't exist yet
    }

    // Clear existing
    await User.deleteMany({});
    await Dealer.deleteMany({});
    await RestroInventory.deleteMany({});
    await StoreInventory.deleteMany({});
    await Order.deleteMany({});
    await Expense.deleteMany({});

    // Create Dealers
    const restoDealer = await Dealer.create({
      storeName: 'Gourmet Kitchen',
      businessType: 'Restaurant',
      ownerName: 'Chef Rahul',
      ownerPhone: '9876543210',
    });

    const kiranaDealer = await Dealer.create({
      storeName: 'Sharma Kirana Store',
      businessType: 'Store',
      ownerName: 'Mr. Sharma',
      ownerPhone: '9876543211',
    });

    const medDealer = await Dealer.create({
      storeName: 'Apollo Pharmacy',
      businessType: 'Store',
      ownerName: 'Dr. Apollo',
      ownerPhone: '9876543212',
    });

    // Create Users (Owners)
    await User.create([
      { username: 'restaurant@omnibiz.com', password: '1234', name: 'Gourmet Kitchen', phone: '9876543210', role: 'Owner', dealerId: restoDealer._id },
      { username: 'kirana@omnibiz.com', password: '1234', name: 'Sharma Kirana', phone: '9876543211', role: 'Owner', dealerId: kiranaDealer._id },
      { username: 'medical@omnibiz.com', password: '1234', name: 'Apollo Pharmacy', phone: '9876543212', role: 'Owner', dealerId: medDealer._id },
    ]);

    // 3. Seed Inventory & Menu
    
    // Restaurant Raw Materials
    await RestroInventory.create([
      { name: 'Tomato', category: 'Vegetables', price: 40, stock: 50, unit: 'Kg', dealerId: restoDealer._id },
      { name: 'Onion', category: 'Vegetables', price: 30, stock: 100, unit: 'Kg', dealerId: restoDealer._id },
      { name: 'Wheat Flour (Aata)', category: 'Grocery', price: 45, stock: 50, unit: 'Kg', dealerId: restoDealer._id }
    ]);

    // Restaurant Menu Items
    const RestroMenu = (await import('@/models/RestroMenu')).default;
    await RestroMenu.collection.dropIndexes().catch(() => {});
    await RestroMenu.deleteMany({});
    await RestroMenu.create([
      { name: 'Dal Makhani', category: 'Main Course', price: 220, dealerId: restoDealer._id },
      { name: 'Butter Naan', category: 'Breads', price: 45, dealerId: restoDealer._id },
      { name: 'Paneer Korma', category: 'Main Course', price: 280, dealerId: restoDealer._id }
    ]);

    // Restaurant Tables
    const Table = (await import('@/models/Table')).default;
    await Table.collection.dropIndexes().catch(() => {});
    await Table.deleteMany({});
    await Table.create([
      { number: '1', seatingCapacity: 4, status: 'free', section: 'AC Section', dealerId: restoDealer._id },
      { number: '2', seatingCapacity: 4, status: 'free', section: 'AC Section', dealerId: restoDealer._id },
      { number: '3', seatingCapacity: 6, status: 'free', section: 'Main Hall', dealerId: restoDealer._id },
      { number: '4', seatingCapacity: 2, status: 'free', section: 'Main Hall', dealerId: restoDealer._id },
      { number: '5', seatingCapacity: 4, status: 'free', section: 'Rooftop', dealerId: restoDealer._id },
      { number: '6', seatingCapacity: 8, status: 'free', section: 'Rooftop', dealerId: restoDealer._id },
    ]);

    // Seed Store Inventory (Kirana & Meds)
    await StoreInventory.create([
      { name: 'Basmati Rice 5kg', sku: 'K-001', category: 'Grocery', sellingPrice: 650, costPrice: 500, stock: 45, unit: 'Packet', dealerId: kiranaDealer._id },
      { name: 'Fortune Oil 1L', sku: 'K-002', category: 'Grocery', sellingPrice: 180, costPrice: 150, stock: 10, unit: 'Liter', dealerId: kiranaDealer._id },
      { name: 'Aashirvaad Atta 10kg', sku: 'K-003', category: 'Grocery', sellingPrice: 420, costPrice: 380, stock: 15, unit: 'Packet', dealerId: kiranaDealer._id },
      { name: 'Paracetamol 500mg', sku: 'M-001', category: 'Medicine', sellingPrice: 40, costPrice: 20, stock: 120, unit: 'Box', dealerId: medDealer._id },
      { name: 'Amoxicillin', sku: 'M-002', category: 'Medicine', sellingPrice: 120, costPrice: 80, stock: 85, unit: 'Box', dealerId: medDealer._id },
    ]);

    return NextResponse.json({ message: 'Database seeded successfully with new Multi-Tenant architecture!' });
  } catch (error: any) {
    console.error("SEED ERROR:", error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
