import mongoose from 'mongoose';

const ActiveSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  businessType: {
    type: String,
    required: true,
  },
  reference: {
    type: String, // "Table 1", "Bulk Order #1", etc.
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active',
  },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
      name: String,
      price: Number,
      quantity: Number,
      unit: String,
      status: {
        type: String,
        enum: ['Order Received', 'Preparing', 'Added to Bill'],
        default: 'Order Received',
      },
    }
  ],
  total: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Force re-register model to clear stale middleware cache
if (mongoose.models.ActiveSession) {
  delete (mongoose.models as any).ActiveSession;
}

// Update total before saving
ActiveSessionSchema.pre('save', async function() {
  this.total = this.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  this.updatedAt = new Date();
});

export default mongoose.model('ActiveSession', ActiveSessionSchema);
