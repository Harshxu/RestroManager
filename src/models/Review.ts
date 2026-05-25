import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  dealerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  platform: {
    type: String,
    enum: ['Zomato', 'Swiggy', 'Google', 'Direct'],
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  customerPhone: {
    type: String,
    default: '',
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  comment: {
    type: String,
    default: '',
  },
  // Recovery tracking
  isContacted: {
    type: Boolean,
    default: false,
  },
  contactNote: {
    type: String,
    default: '',
  },
  isResolved: {
    type: Boolean,
    default: false,
  },
  // Alert status
  alertDismissed: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

if (mongoose.models.Review) {
  delete (mongoose.models as any).Review;
}

export default mongoose.model('Review', ReviewSchema);
