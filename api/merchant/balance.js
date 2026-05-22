import connectDB from '../../config/db.js';
import danaService from '../../src/services/dana.service.js';
import { DANA_CONFIG } from '../../config/dana.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const targetUrl = '/v1/merchant/balance/query';
    const timestamp = new Date().toISOString();
    const body = { merchantId: DANA_CONFIG.merchantId };

    // Membuat signature HMAC-SHA256 murni
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
            return res.status(200).json({
                success: true,
                balance: Number(result.balance.amount.value) // Nilai saldo asli dari DANA
            });
        } else {
            return res.status(400).json({ success: false, message: result.responseMessage });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}
