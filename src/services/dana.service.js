import crypto from 'crypto';
import { DANA_CONFIG } from '../../config/dana.js';

class DanaService {
    generateSignature(targetUrl, timestamp, bodyData) {
        const stringToSign = `POST:${targetUrl}:${DANA_CONFIG.secretKey}:${timestamp}:${JSON.stringify(bodyData)}`;
        return crypto.createHmac('sha256', DANA_CONFIG.secretKey).update(stringToSign).digest('hex');
    }

    async createOrder({ orderId, amount, phoneNumber }) {
        const targetUrl = '/v1/checkout/initiation';
        const timestamp = new Date().toISOString();

        const body = {
            order: {
                orderId: orderId,
                amount: {
                    currency: "IDR",
                    value: String(amount)
                },
                merchantId: DANA_CONFIG.merchantId
            },
            merchantOrderReference: orderId,
            redirectUrl: "https://topup-admin-nine.vercel.app/payment-status", 
            notificationUrl: "https://topup-admin-nine.vercel.app/api/webhook/dana",
            paymentSelectionType: "REGULAR",
            userPhoneNumber: phoneNumber
        };

        const signature = this.generateSignature(targetUrl, timestamp, body);

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
            
            if (result.responseCode !== 'SUCCESS' || !result.acquiringData) {
                throw new Error(result.responseMessage || 'Gagal memperoleh data transaksi dari API DANA');
            }

            return result;
        } catch (error) {
            throw new Error(`DANA Service Integration Error: ${error.message}`);
        }
    }
}

export default new DanaService();
