const connectDB = require('../../config/db');
const Transaction = require('../../src/models/Transaction');
const midtransService = require('../../src/services/midtrans.service');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { amount, walletType, phoneNumber, userEmail, userId } = req.body;

    if (!amount || !walletType || !phoneNumber || !userId) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // 1. Pastikan database terkoneksi (Serverless re-use connection)
        await connectDB();

        const orderId = `TOPUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // 2. Tembak layanan Midtrans Core API
        const midtransResponse = await midtransService.chargeEwallet({
            orderId, amount, walletType, phoneNumber, userEmail
        });

        // 3. Simpan data transaksi ke MongoDB dengan status PENDING
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

        // 4. Kembalikan respon berisi aksi lanjutan (Deep link aplikasi / Push Info)
        return res.status(200).json({
            success: true,
            orderId,
            status: 'PENDING',
            // Ambil redirect URL / Deeplink untuk DANA/Gopay dari actions Midtrans jika ada
            actions: midtransResponse.actions || null, 
            message: `Permintaan topup ${walletType} berhasil dibuat.`
        });

    } catch (error) {
        console.error('Topup Serverless Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
