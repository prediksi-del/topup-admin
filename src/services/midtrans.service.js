const coreApi = require('../../config/midtrans');

class MidtransService {
    async chargeEwallet({ orderId, amount, walletType, phoneNumber, userEmail }) {
        let paymentType = '';
        let ewalletDetails = {};

        // Normalisasi input walletType ke huruf kecil
        const type = walletType.toLowerCase();

        if (type === 'ovo') {
            paymentType = 'gopay'; // Midtrans memproses OVO & Gopay via core e-wallet channel tertentu
            ewalletDetails = {
                enable_callback: true,
                callback_url: "https://your-app.vercel.app/payment-status"
            };
        } else if (type === 'dana') {
            paymentType = 'danamon_online'; // Atau sesuaikan dengan tipe direct contract DANA Midtrans kamu
        } else if (type === 'gopay') {
            paymentType = 'gopay';
            ewalletDetails = {
                enable_callback: true,
                callback_url: "https://your-app.vercel.app/payment-status"
            };
        } else {
            throw new Error('Metode e-wallet tidak didukung. Gunakan ovo, dana, atau gopay.');
        }

        const parameter = {
            "payment_type": paymentType,
            "transaction_details": {
                "order_id": orderId,
                "gross_amount": Number(amount)
            },
            "customer_details": {
                "email": userEmail || "customer@email.com",
                "phone": phoneNumber
            }
        };

        // Jika OVO, Midtrans membutuhkan data spesifik nomor HP di dalam objek gopay/ovo_details
        if (type === 'ovo') {
            parameter.gopay = {
                "enable_callback": true
            };
            // Catatan: Jika menggunakan direct contract OVO murni, sesuaikan key objek ke "ovo_details"
        }

        try {
            const transaction = await coreApi.charge(parameter);
            return transaction;
        } catch (error) {
            throw new Error(`Midtrans Charge Error: ${error.message}`);
        }
    }
}

module.exports = new MidtransService();
