import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
  dealerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  title: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  category: {
    type: String, // Salary, Rent, Electricity, Raw Material, Marketing, Other
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  note: String,
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Force refresh model to recognize new schema
if (mongoose.models.Expense) {
  delete (mongoose.models as any).Expense;
}

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
