const coreApi = require('../../config/midtrans');

class MidtransService {
    async chargeEwallet({ orderId, amount, walletType, phoneNumber }) {
        const type = walletType.toLowerCase();
        let parameter = {
            "transaction_details": {
                "order_id": orderId,
                "gross_amount": Number(amount)
            }
        };

        // Mengarahkan alur payload spesifik ke masing-masing provider e-wallet murni
        if (type === 'gopay') {
            parameter.payment_type = "gopay";
            parameter.gopay = {
                "enable_callback": true, // Mengaktifkan deep-link balik ke aplikasi setelah bayar
                "callback_url": "https://topup-admin-nine.vercel.app/payment-status"
            };
        } else if (type === 'ovo') {
            parameter.payment_type = "ovo";
            parameter.ovo = {
                "phone_number": phoneNumber // Memicu Push Notification PIN langsung ke HP user
            };
        } else if (type === 'dana') {
            parameter.payment_type = "dana";
            // DANA murni menghasilkan token redirect menuju halaman sistem DANA tanpa QRIS
        } else {
            throw new Error('Metode e-wallet tidak didukung. Gunakan OVO, DANA, atau GOPAY.');
        }

        try {
            const transaction = await coreApi.charge(parameter);
            return transaction;
        } catch (error) {
            throw new Error(`Midtrans Core API Error: ${error.message}`);
        }
    }
}

module.exports = new MidtransService();
