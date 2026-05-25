import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Owner', 'Manager', 'Staff'], 
    required: true,
    default: 'Staff'
  },
  dealerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    required: true,
  },
  geminiApiKey: {
    type: String,
    default: '',
  }
}, {
  timestamps: true,
});

// Force refresh model to recognize new schema
if (mongoose.models.User) {
  delete (mongoose.models as any).User;
}

export default mongoose.models.User || mongoose.model('User', UserSchema);
