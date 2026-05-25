import mongoose from 'mongoose';

const StoreInventorySchema = new mongoose.Schema({
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
  category: {
    type: String,
    required: [true, 'Please provide a category (e.g., Grocery, Medical).'],
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Please provide a selling price.'],
  },
  costPrice: {
    type: Number,
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
    default: 'Piece',
  },
  dealerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    required: true,
  },
  imageUrl: String,
}, {
  timestamps: true,
});

export default mongoose.models.StoreInventory || mongoose.model('StoreInventory', StoreInventorySchema);
