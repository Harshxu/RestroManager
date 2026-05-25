import mongoose from 'mongoose';

const DealerSchema = new mongoose.Schema({
  storeName: {
    type: String,
    required: [true, 'Please provide a store/restaurant name.'],
  },
  businessType: {
    type: String,
    enum: ['Restaurant', 'Store'],
    required: [true, 'Please provide a business type.'],
  },
  ownerName: {
    type: String,
    required: [true, 'Please provide the owner name.'],
  },
  ownerPhone: {
    type: String,
    required: [true, 'Please provide the owner phone number.'],
    unique: true,
  },
  address: {
    type: String,
  },
  gstNumber: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true,
});

export default mongoose.models.Dealer || mongoose.model('Dealer', DealerSchema);
