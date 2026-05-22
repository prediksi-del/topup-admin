import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orderId: { type: String, required: true, unique: true, index: true },
  type: { type: String, enum: ['topup', 'withdraw'], required: true },
  amount: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['pending', 'success', 'failed', 'expired'], default: 'pending', index: true },
  paymentType: { type: String },
  snapToken: { type: String },
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountName: String
  }
}, { timestamps: true });

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
