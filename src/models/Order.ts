import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
  },
});

const OrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  dealerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
  },
  items: [OrderItemSchema],
  subTotal: Number,
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: {
    type: Number,
    required: true,
  },
  customerName: String,
  customerMobile: String,
  orderSource: {
    type: String,
    enum: ['Dine-In', 'Takeaway', 'Delivery'],
    default: 'Dine-In',
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'UPI', 'Card', 'Pending'],
    default: 'Cash',
  },
  status: {
    type: String,
    enum: ['Order Received', 'Preparing', 'Added to Bill', 'Cancelled'],
    default: 'Order Received',
  },
}, {
  timestamps: true,
});

// Force refresh model to recognize new fields
if (mongoose.models.Order) {
  delete (mongoose.models as any).Order;
}

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
