import connectDB from '../../config/db.js';
import Transaction from '../../src/models/Transaction.js';
import User from '../../src/models/User.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        await connectDB();

        const { merchantOrderReference, transactionStatus } = req.body;

        const transaction = await Transaction.findOne({ orderId: merchantOrderReference });
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction record not found' });
        }

        if (transaction.status === 'SUCCESS' || transaction.status === 'FAILED') {
            return res.status(200).json({ responseCode: "SUCCESS", responseMessage: "Already processed" });
        }

        if (transactionStatus === 'SUCCESS' || transactionStatus === 'PAID') {
            transaction.status = 'SUCCESS';
            transaction.paidAt = new Date();
            await transaction.save();

            // Tambah Saldo / Balance User berdasarkan Firebase UID yang tersimpan
            await User.findOneAndUpdate(
                { firebaseUid: transaction.userId },
                { $inc: { balance: transaction.amount } }
            );

            console.log(`[DANA SUCCESS] Balance otomatis ditambahkan ke UID: ${transaction.userId}`);
            return res.status(200).json({ responseCode: "SUCCESS", responseMessage: "Success" });
        } 
        
        else if (transactionStatus === 'FAILED' || transactionStatus === 'CANCELLED') {
            transaction.status = 'FAILED';
            await transaction.save();
            return res.status(200).json({ responseCode: "SUCCESS", responseMessage: "Payment Failed" });
        }

        return res.status(200).send('PENDING_STATE');

    } catch (error) {
        console.error('✗ DANA Webhook Processing Error:', error.message);
        return res.status(500).send('Internal Server Error');
    }
}
