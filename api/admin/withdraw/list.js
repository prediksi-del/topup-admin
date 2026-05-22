import { connectDB } from '../../../config/db.js';
import { verifyFirebaseToken } from '../../../src/middlewares/firebaseAuth.middleware.js';
import Transaction from '../../../src/models/Transaction.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const admin = await verifyFirebaseToken(req, res, 'admin');
  if (!admin) return;

  await connectDB();
  try {
    const data = await Transaction.find({ type: 'withdraw' }).populate('userId', 'name email').sort({ createdAt: -1 });
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
