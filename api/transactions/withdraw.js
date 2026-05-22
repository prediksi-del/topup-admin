import connectDB from '../../config/db.js';
import Transaction from '../../src/models/Transaction.js';
import danaService from '../../src/services/dana.service.js';
import { DANA_CONFIG } from '../../config/dana.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { bankCode, accountNo, amount } = req.body;

    if (!bankCode || !accountNo || !amount) {
        return res.status(400).json({ success: false, message: 'Parameter tidak lengkap.' });
    }

    await connectDB();
    const withdrawId = `WD-${Date.now()}`;
    const targetUrl = '/v1/disbursement/transfer';
    const timestamp = new Date().toISOString();

    const body = {
        transferId: withdrawId,
        amount: { currency: "IDR", value: String(amount) },
        receiver: {
            bankCode: bankCode,
            accountNumber: accountNo,
            accountName: "Penerima Kas Withdraw"
        },
        merchantId: DANA_CONFIG.merchantId
    };

    const signature = danaService.generateSignature(targetUrl, timestamp, body);

    try {
        const response = await fetch(`${DANA_CONFIG.baseUrl}${targetUrl}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-DANA-CLIENT-ID': DANA_CONFIG.clientId,
                'X-DANA-SIGNATURE': signature,
                'X-DANA-TIMESTAMP': timestamp
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (result.responseCode === 'SUCCESS') {
            // Catat transaksi keluar ke MongoDB
            const wdTrans = new Transaction({
                orderId: withdrawId,
                userId: "SYSTEM_ADMIN",
                amount: Number(amount),
                walletType: 'WITHDRAW_' + bankCode,
                phoneNumber: accountNo,
                status: 'SUCCESS',
                rawDanaResponse: result
            });
            await wdTrans.save();

            return res.status(200).json({ success: true, message: 'Withdrawal sukses diproses bank.' });
        } else {
            return res.status(400).json({ success: false, message: result.responseMessage });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
              }
