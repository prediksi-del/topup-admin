export async function createIrisPayout(payoutData) {
  const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const baseUrl = isProd ? 'https://app.midtrans.com/iris/api/v1' : 'https://app.sandbox.midtrans.com/iris/api/v1';
  const authString = Buffer.from(`${process.env.MIDTRANS_IRIS_API_KEY}:`).toString('base64');

  const response = await fetch(`${baseUrl}/payouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': payoutData.referenceNo
    },
    body: JSON.stringify({
      payouts: [{
        beneficiary_name: payoutData.accountName,
        beneficiary_account: payoutData.accountNumber,
        beneficiary_bank: payoutData.bankName,
        amount: payoutData.amount.toString(),
        notes: `Payout WD ${payoutData.referenceNo}`
      }]
    })
  });
  return await response.json();
}
