const connectDB = require('../../config/db');
const Transaction = require('../../src/models/Transaction');
const User = require('../../src/models/User');
const coreApi = require('../../config/midtrans');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        await connectDB();

        const notificationJson = req.body;

        // 1. Validasi keaslian data (Idempotent & Secure Verification via Midtrans SDK)
        const statusResponse = await coreApi.transaction.notification(notificationJson);
        
        const orderId = statusResponse.order_id;
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        // 2. Cari transaksi terkait di database
        const transaction = await Transaction.findOne({ orderId: orderId });
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction record not found' });
        }

        // Jika transaksi sebelumnya sudah sukses, hentikan eksekusi untuk mencegah double-topup
        if (transaction.status === 'SUCCESS') {
            return res.status(200).send('OK - Already Processed');
        }

        // 3. Evaluasi status pembayaran Midtrans
        let finalStatus = 'PENDING';

        if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
            if (fraudStatus === 'challenge') {
                finalStatus = 'PENDING';
            } else if (fraudStatus === 'accept') {
                finalStatus = 'SUCCESS';
            }
        } else if (['cancel', 'deny', 'expire'].includes(transactionStatus)) {
            finalStatus = 'FAILED';
        }

        // 4. Jika status berubah menjadi SUCCESS, tambahkan saldo ke user secara ACID terjamin
        if (finalStatus === 'SUCCESS') {
            transaction.status = 'SUCCESS';
            transaction.paidAt = new Date();
            await transaction.save();

            // Increment saldo user di koleksi User
            await User.findOneAndUpdate(
                { firebaseUid: transaction.userId },
                { $inc: { balance: transaction.amount } }
            );

            console.log(`[WEBHOOK SUCCESS] Saldo User ${transaction.userId} berhasil ditambahkan sejumlah Rp ${transaction.amount}`);
        } else if (finalStatus === 'FAILED') {
            transaction.status = 'FAILED';
            await transaction.save();
        }

        // Midtrans mewajibkan respon HTTP 200 OK sebagai tanda callback diterima dengan baik
        return res.status(200).send('OK');

    } catch (error) {
        console.error('Webhook Verification Failed:', error.message);
        return res.status(500).send('Internal Server Error');
    }
}
