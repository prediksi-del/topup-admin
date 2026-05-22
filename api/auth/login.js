import connectDB from '../../config/db.js';
import User from '../../src/models/User.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { email, password } = req.body;

    try {
        await connectDB();

        // Mencari user dengan role admin
        const admin = await User.findOne({ email, role: 'admin' });
        
        // Catatan: Untuk produksi, sangat disarankan menggunakan bcrypt hash untuk mencocokkan password!
        if (!admin || admin.password !== password) {
            return res.status(401).json({ success: false, message: 'Email atau Password Admin salah.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Otentikasi berhasil.',
            admin: {
                uid: admin.firebaseUid,
                displayName: admin.displayName,
                email: admin.email
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}
