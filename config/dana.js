export const DANA_CONFIG = {
    baseUrl: process.env.DANA_IS_PRODUCTION === 'true' 
        ? 'https://api.dana.id' 
        : 'https://api.sandbox.dana.id',
    clientId: process.env.DANA_CLIENT_ID,
    secretKey: process.env.DANA_SECRET_KEY, 
    merchantId: process.env.DANA_MERCHANT_ID
};
