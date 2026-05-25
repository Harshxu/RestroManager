import mongoose from 'mongoose';

const RestroInventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide an item name.'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
  category: {
    type: String, // e.g., 'Vegetables', 'Dairy', 'Spices'
    required: [true, 'Please provide a category.'],
  },
  price: {
    type: Number,
    required: [true, 'Please provide a price.'], // cost for raw material
  },
  stock: {
    type: Number,
    default: 0,
  },
  unit: {
    type: String,
    enum: ['Piece', 'Kg', 'Gram', 'Liter', 'Ml', 'Packet', 'Box'],
    default: 'Kg',
  },
  minStock: {
    type: Number,
    default: 5,
  },
  supplier: {
    type: String,
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

// Force refresh model to recognize new schema
if (mongoose.models.RestroInventory) {
  delete (mongoose.models as any).RestroInventory;
}

export default mongoose.models.RestroInventory || mongoose.model('RestroInventory', RestroInventorySchema);

