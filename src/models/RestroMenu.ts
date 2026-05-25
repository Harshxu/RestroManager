import mongoose from 'mongoose';

const RestroMenuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a menu item name.'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
  category: {
    type: String, // e.g., 'Main Course', 'Breads', 'Dessert'
    required: [true, 'Please provide a category.'],
  },
  price: {
    type: Number,
    required: [true, 'Please provide a selling price.'],
  },
  description: {
    type: String,
  },
  preparationTime: {
    type: Number,
    default: 15,
  },
  isAvailable: {
    type: Boolean,
    default: true,
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

if (mongoose.models.RestroMenu) {
  delete (mongoose.models as any).RestroMenu;
}

export default mongoose.models.RestroMenu || mongoose.model('RestroMenu', RestroMenuSchema);
