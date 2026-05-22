const connectDB = require('../../config/db');
const Transaction = require('../../src/models/Transaction');
const User = require('../../src/models/User');
const coreApi = require('../../config/midtrans');

// Ganti dari "export default async function" menjadi "module.exports ="
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        await connectDB();

        const notificationJson = req.body;
        const statusResponse = await coreApi.transaction.notification(notificationJson);
        
        const orderId = statusResponse.order_id;
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        const transaction = await Transaction.findOne({ orderId: orderId });
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction record not found' });
        }

        if (transaction.status === 'SUCCESS' || transaction.status === 'FAILED') {
            return res.status(200).send('OK - Status already finalized');
        }

        let finalStatus = 'PENDING';

        switch (transactionStatus) {
            case 'capture':
            case 'settlement':
                finalStatus = 'SUCCESS';
                break;
            case 'pending':
                finalStatus = 'PENDING';
                break;
            case 'deny':
            case 'expire':
            case 'cancel':
                finalStatus = 'FAILED';
                break;
            default:
                finalStatus = 'PENDING';
                break;
        }

        if (finalStatus === 'SUCCESS') {
            transaction.status = 'SUCCESS';
            transaction.paidAt = new Date();
            transaction.rawMidtransResponse = statusResponse;
            await transaction.save();

            const updatedUser = await User.findOneAndUpdate(
                { firebaseUid: transaction.userId },
                { $inc: { balance: transaction.amount } },
                { new: true }
            );

            console.log(`[SUCCESS] Saldo ditambahkan ke UID: ${transaction.userId}.`);
            return res.status(200).json({ message: 'Webhook processed: Payment SUCCESS' });

        } else if (finalStatus === 'FAILED') {
            transaction.status = 'FAILED';
            transaction.rawMidtransResponse = statusResponse;
            await transaction.save();

            return res.status(200).json({ message: `Webhook processed: Payment FAILED` });
        }

        return res.status(200).json({ message: 'Webhook processed: Payment still PENDING' });

    } catch (error) {
        console.error('✗ Webhook Processing Error:', error.message);
        return res.status(500).send('Internal Server Error');
    }
};
