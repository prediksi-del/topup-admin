import { connectDB } from '../../config/db.js';
import { snap } from '../../config/midtrans.js';
import { verifyFirebaseToken } from '../../src/middlewares/firebaseAuth.middleware.js';
import { validatePayload, schemas } from '../../src/middlewares/validate.middleware.js';
import Transaction from '../../src/models/Transaction.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await verifyFirebaseToken(req, res, 'user');
  if (!user) return;

  const cleanBody = validatePayload(req.body, schemas.topup, res);
  if (!cleanBody) return;

  await connectDB();
  const orderId = `TP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  try {
    const parameter = {
      transaction_details: { order_id: orderId, gross_amount: cleanBody.amount },
      customer_details: { first_name: user.name, email: user.email }
    };

    const midtransTx = await snap.createTransaction(parameter);

    const tx = await Transaction.create({
      userId: user._id,
      orderId,
      type: 'topup',
      amount: cleanBody.amount,
      status: 'pending',
      snapToken: midtransTx.token
    });

    return res.status(201).json({ redirect_url: midtransTx.redirect_url, token: midtransTx.token, tx });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
