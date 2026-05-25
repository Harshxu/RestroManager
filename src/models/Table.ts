import mongoose from 'mongoose';

const TableSchema = new mongoose.Schema({
  number: {
    type: String,
    required: [true, 'Please provide a table number/identifier.'],
  },
  seatingCapacity: {
    type: Number,
    default: 4,
  },
  status: {
    type: String,
    enum: ['free', 'occupied', 'cleaning'],
    default: 'free',
  },
  section: {
    type: String,
    default: 'Main Hall', // e.g., AC Room, Rooftop, Garden
  },
  activeSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ActiveSession',
  },
  occupiedSince: {
    type: Date,
  },
  dealerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    required: true,
  },
}, {
  timestamps: true,
});

if (mongoose.models.Table) {
  delete (mongoose.models as any).Table;
}

export default mongoose.models.Table || mongoose.model('Table', TableSchema);
