import connectDB from '../../config/db.js';
import Transaction from '../../src/models/Transaction.js';
import midtransService from '../../src/services/midtrans.service.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { amount, walletType, phoneNumber, userEmail, userId } = req.body;

    if (!amount || !walletType || !phoneNumber || !userId) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    try {
        await connectDB();

        const orderId = `TOPUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const midtransResponse = await midtransService.chargeEwallet({
            orderId, amount, walletType, phoneNumber, userEmail
        });

        const newTransaction = new Transaction({
            orderId,
            userId,
            amount: Number(amount),
            walletType: walletType.toUpperCase(),
            phoneNumber,
            status: 'PENDING',
            rawMidtransResponse: midtransResponse
        });
        await newTransaction.save();

        let paymentAction = {
            type: 'push_notification',
            url: null
        };

        const type = walletType.toLowerCase();

        if (type === 'gopay' && midtransResponse.actions) {
            const deeplinkAction = midtransResponse.actions.find(act => act.name === 'deeplink-redirect');
            paymentAction = {
                type: 'deeplink',
                url: deeplinkAction ? deeplinkAction.url : midtransResponse.actions[0].url
            };
        } else if (type === 'dana' && midtransResponse.redirect_url) {
            paymentAction = {
                type: 'redirect_url',
                url: midtransResponse.redirect_url
            };
        }

        return res.status(200).json({
            success: true,
            orderId,
            status: 'PENDING',
            payment: {
                provider: walletType.toUpperCase(),
                amount: Number(amount),
                actionType: paymentAction.type,
                actionUrl: paymentAction.url
            },
            message: type === 'ovo' 
                ? `Permintaan topup OVO berhasil. Silakan cek push notification di HP ${phoneNumber} Anda.`
                : `Permintaan topup ${walletType.toUpperCase()} berhasil dibuat.`
        });

    } catch (error) {
        console.error('Topup Serverless Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
