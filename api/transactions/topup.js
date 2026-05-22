const connectDB = require('../../config/db');
const Transaction = require('../../src/models/Transaction');
const midtransService = require('../../src/services/midtrans.service');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { amount, walletType, phoneNumber, userEmail, userId } = req.body;

    // Validasi input awal
    if (!amount || !walletType || !phoneNumber || !userId) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    try {
        // 1. Pastikan database terkoneksi dengan pooling serverless
        await connectDB();

        // Generate unik Order ID secara rapi
        const orderId = `TOPUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // 2. Tembak layanan Midtrans Core API Direct E-Wallet
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
            rawMidtransResponse: midtransResponse // Disimpan untuk cadangan audit data
        });
        await newTransaction.save();

        // 4. Proses Ekstraksi Tautan Lanjutan (Deep Link / Redirect URL)
        let paymentAction = {
            type: 'push_notification', // Default untuk OVO (User tinggal tunggu push notif PIN di HP)
            url: null
        };

        const type = walletType.toLowerCase();

        // Jika GoPay, cari URL deeplink dari array actions bawaan Midtrans
        if (type === 'gopay' && midtransResponse.actions) {
            // Biasanya actions[1] adalah deeplink untuk aplikasi Gojek / QRIS deeplink
            const deeplinkAction = midtransResponse.actions.find(act => act.name === 'deeplink-redirect');
            paymentAction = {
                type: 'deeplink',
                url: deeplinkAction ? deeplinkAction.url : midtransResponse.actions[0].url
            };
        } 
        // Jika DANA, ambil langsung dari properti redirect_url murni
        else if (type === 'dana' && midtransResponse.redirect_url) {
            paymentAction = {
                type: 'redirect_url',
                url: midtransResponse.redirect_url
            };
        }

        // 5. Kembalikan respon terstruktur yang siap pakai oleh Android / Client Front-end
        return res.status(200).json({
            success: true,
            orderId,
            status: 'PENDING',
            payment: {
                provider: walletType.toUpperCase(),
                amount: Number(amount),
                actionType: paymentAction.type, // 'push_notification', 'deeplink', atau 'redirect_url'
                actionUrl: paymentAction.url     // Tautan yang harus dibuka oleh aplikasi client (jika ada)
            },
            message: type === 'ovo' 
                ? `Permintaan topup OVO berhasil. Silakan cek push notification di HP ${phoneNumber} Anda untuk memasukkan PIN.`
                : `Permintaan topup ${walletType.toUpperCase()} berhasil dibuat. Silakan selesaikan pembayaran.`
        });

    } catch (error) {
        console.error('Topup Serverless Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
    }
