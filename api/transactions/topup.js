import connectDB from '../../config/db.js';
import Transaction from '../../src/models/Transaction.js';
import danaService from '../../src/services/dana.service.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { amount, phoneNumber, userId } = req.body;

    if (!amount || !phoneNumber || !userId) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    try {
        await connectDB();

        const orderId = `AJM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const danaResponse = await danaService.createOrder({
            orderId, amount, phoneNumber
        });

        // Mengambil checkoutUrl langsung (Redirect URL murni DANA)
        const redirectUrl = danaResponse.acquiringData.checkoutUrl;

        const newTransaction = new Transaction({
            orderId,
            userId,
            amount: Number(amount),
            walletType: 'DANA',
            phoneNumber,
            status: 'PENDING',
            rawDanaResponse: danaResponse
        });
        await newTransaction.save();

        return res.status(200).json({
            success: true,
            orderId,
            status: 'PENDING',
            payment: {
                provider: 'DANA',
                amount: Number(amount),
                actionType: 'redirect_url',
                actionUrl: redirectUrl
            },
            message: `Permintaan transaksi topup DANA berhasil dibuat. Silakan klik tombol di bawah untuk membayar.`
        });

    } catch (error) {
        console.error('Serverless Topup Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
