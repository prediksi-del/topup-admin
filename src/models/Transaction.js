const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    userId: { type: String, required: true }, // Terhubung ke Firebase UID
    amount: { type: Number, required: true },
    walletType: { type: String, enum: ['DANA', 'OVO', 'GOPAY'], required: true },
    phoneNumber: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' },
    createdAt: { type: Date, default: Date.now },
    paidAt: { type: Date },
    rawMidtransResponse: { type: Object }
});

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
