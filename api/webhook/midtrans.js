import crypto from 'crypto';
import { connectDB } from '../../config/db.js';
import Transaction from '../../src/models/Transaction.js';
import User from '../../src/models/User.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const db = await connectDB();
  const notification = req.body;

  const { order_id: orderId, status_code: statusCode, gross_amount: grossAmount, signature_key: signatureKey, transaction_status: txStatus } = notification;

  // Verifikasi Tanda Tangan Webhook dari Midtrans
  const localSignatureSource = orderId + statusCode + grossAmount + process.env.MIDTRANS_SERVER_KEY;
  const localSignature = crypto.createHash('sha512').update(localSignatureSource).digest('hex');

  if (signatureKey !== localSignature) {
    return res.status(403).json({ message: 'Signature Invalid' });
  }

  const session = await db.startSession();
  session.startTransaction();

  try {
    const tx = await Transaction.findOne({ orderId }).session(session);
    if (!tx || ['success', 'failed'].includes(tx.status)) {
      await session.abortTransaction();
      return res.status(200).json({ message: 'Transaksi diabaikan / sudah berstatus final' });
    }

    if (['capture', 'settlement'].includes(txStatus)) {
      tx.status = 'success';
      await tx.save({ session });

      if (tx.type === 'topup') {
        await User.findByIdAndUpdate(tx.userId, { $inc: { balance: tx.amount } }).session(session);
      }
    } else if (['deny', 'cancel', 'expire'].includes(txStatus)) {
      tx.status = 'failed';
      await tx.save({ session });

      // Jika withdraw gagal di sistem Midtrans Iris (Webhook callback alternatif), kembalikan saldo
      if (tx.type === 'withdraw') {
        await User.findByIdAndUpdate(tx.userId, { $inc: { balance: tx.amount } }).session(session);
      }
    }

    await session.commitTransaction();
    return res.status(200).json({ status: 'OK' });
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
        }
