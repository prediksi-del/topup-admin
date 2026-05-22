import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true },
    amount: { type: Number, required: true },
    walletType: { type: String, enum: ['DANA', 'OVO', 'GOPAY'], required: true },
    phoneNumber: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' },
    createdAt: { type: Date, default: Date.now },
    paidAt: { type: Date },
    rawMidtransResponse: { type: Object }
});

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
