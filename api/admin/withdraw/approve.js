import { connectDB } from '../../../config/db.js';
import { verifyFirebaseToken } from '../../../src/middlewares/firebaseAuth.middleware.js';
import { validatePayload, schemas } from '../../../src/middlewares/validate.middleware.js';
import Transaction from '../../../src/models/Transaction.js';
import User from '../../../src/models/User.js';
import { createIrisPayout } from '../../../src/services/midtrans.service.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const admin = await verifyFirebaseToken(req, res, 'admin');
  if (!admin) return;

  const cleanBody = validatePayload(req.body, schemas.approve, res);
  if (!cleanBody) return;

  const db = await connectDB();
  const session = await db.startSession();
  session.startTransaction();

  try {
    const tx = await Transaction.findById(cleanBody.transactionId).session(session);
    if (!tx || tx.type !== 'withdraw' || tx.status !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Transaksi tidak ditemukan/sudah diproses' });
    }

    if (cleanBody.action === 'reject') {
      tx.status = 'failed';
      await tx.save({ session });

      // Refund saldo ke user karena ditolak
      await User.findByIdAndUpdate(tx.userId, { $inc: { balance: tx.amount } }).session(session);
      await session.commitTransaction();
      return res.status(200).json({ message: 'Withdraw ditolak, saldo dikembalikan' });
    }

    if (cleanBody.action === 'approve') {
      // Hit API Iris Midtrans Payouts
      const pResult = await createIrisPayout({
        referenceNo: tx.orderId,
        amount: tx.amount,
        bankName: tx.bankDetails.bankName,
        accountNumber: tx.bankDetails.accountNumber,
        accountName: tx.bankDetails.accountName
      });

      if (pResult.error_message) {
        await session.abortTransaction();
        return res.status(422).json({ message: 'Gagal di gerbang bank Iris', detail: pResult.error_message });
      }

      tx.status = 'success';
      await tx.save({ session });
      
      await session.commitTransaction();
      return res.status(200).json({ message: 'Dana sukses dicairkan via Iris', data: pResult });
    }
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
}
