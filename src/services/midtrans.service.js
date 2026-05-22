import coreApi from '../../config/midtrans.js';

class MidtransService {
    async chargeEwallet({ orderId, amount, walletType, phoneNumber }) {
        const type = walletType.toLowerCase();
        let parameter = {
            "transaction_details": {
                "order_id": orderId,
                "gross_amount": Number(amount)
            }
        };

        if (type === 'gopay') {
            parameter.payment_type = "gopay";
            parameter.gopay = {
                "enable_callback": true,
                "callback_url": "https://topup-admin-nine.vercel.app/payment-status"
            };
        } else if (type === 'ovo') {
            parameter.payment_type = "ovo";
            parameter.ovo = {
                "phone_number": phoneNumber
            };
        } else if (type === 'dana') {
            parameter.payment_type = "dana";
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

export default new MidtransService();
