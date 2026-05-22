import { authAdmin } from '../../config/firebase.js';
import { connectDB } from '../../config/db.js';
import User from '../models/User.js';

export async function verifyFirebaseToken(req, res, requiredRole = 'user') {
  await connectDB();
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or Invalid Authorization Header' });
    return null;
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. Verifikasi token ke server Firebase
    const decodedToken = await authAdmin.verifyIdToken(token);
    
    // 2. Cari data lokal user berdasarkan Firebase UID
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (!user) {
      res.status(404).json({ message: 'User belum terdaftar di database sistem lokal' });
      return null;
    }

    // 3. Validasi Role (User / Admin)
    if (requiredRole === 'admin' && user.role !== 'admin') {
      res.status(403).json({ message: 'Forbidden: Memerlukan hak akses Admin' });
      return null;
    }

    return user;
  } catch (error) {
    res.status(401).json({ message: 'Token Firebase tidak valid atau kedaluwarsa', error: error.message });
    return null;
  }
}
