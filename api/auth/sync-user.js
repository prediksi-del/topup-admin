import { connectDB } from '../../config/db.js';
import { authAdmin } from '../../config/firebase.js';
import { validatePayload, schemas } from '../../src/middlewares/validate.middleware.js';
import User from '../../src/models/User.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing Token' });
  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = await authAdmin.verifyIdToken(token);
    const cleanBody = validatePayload(req.body, schemas.syncUser, res);
    if (!cleanBody) return;

    await connectDB();
    
    // Gunakan upsert: jika belum ada buat baru, jika sudah ada abaikan / update name
    const user = await User.findOneAndUpdate(
      { firebaseUid: decodedToken.uid },
      { 
        firebaseUid: decodedToken.uid,
        name: cleanBody.name,
        email: cleanBody.email.toLowerCase()
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ message: 'Sinkronisasi User Berhasil', user });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
