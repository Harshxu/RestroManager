import mongoose from 'mongoose';

const InventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name for this item.'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
  sku: {
    type: String,
    required: [true, 'Please provide an SKU.'],
    unique: true,
  },
  price: {
    type: Number,
    required: [true, 'Please provide a price.'],
  },
  stock: {
    type: Number,
    required: [true, 'Please provide stock quantity.'],
    default: 0,
  },
  minStock: {
    type: Number,
    default: 5,
  },
  unit: {
    type: String,
    enum: ['Piece', 'Kg', 'Gram', 'Liter', 'Ml', 'Packet', 'Box', 'Dozen', 'Other'],
    default: 'Piece'
  },
  category: {
    type: String,
    required: [true, 'Please provide a category (e.g., Food, Grocery, Medicine).'],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  businessType: {
    type: String,
    enum: ['Restaurant', 'Kirana', 'Medical'],
    required: true,
  },
  imageUrl: String,
}, {
  timestamps: true,
});

export default mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);
