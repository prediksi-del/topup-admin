import { connectDB } from '../../config/db.js';
import { verifyFirebaseToken } from '../../src/middlewares/firebaseAuth.middleware.js';
import { validatePayload, schemas } from '../../src/middlewares/validate.middleware.js';
import User from '../../src/models/User.js';
import Transaction from '../../src/models/Transaction.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const userAuth = await verifyFirebaseToken(req, res, 'user');
  if (!userAuth) return;

  const cleanBody = validatePayload(req.body, schemas.withdraw, res);
  if (!cleanBody) return;

  const db = await connectDB();
  const session = await db.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userAuth._id).session(session);
    if (user.balance < cleanBody.amount) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Saldo tidak mencukupi' });
    }

    // Bekukan/potong saldo user langsung di database saat request diajukan
    user.balance -= cleanBody.amount;
    await user.save({ session });

    const orderId = `WD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const tx = await Transaction.create([{
      userId: user._id,
      orderId,
      type: 'withdraw',
      amount: cleanBody.amount,
      status: 'pending',
      bankDetails: {
        bankName: cleanBody.bankName,
        accountNumber: cleanBody.accountNumber,
        accountName: cleanBody.accountName
      }
    }], { session });

    await session.commitTransaction();
    return res.status(201).json({ message: 'Permintaan penarikan diproses', data: tx[0] });
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
}
