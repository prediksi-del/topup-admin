const mongoose = require('mongoose');

let cachedDb = null;

const connectDB = async () => {
    if (cachedDb && mongoose.connection.readyState === 1) {
        return cachedDb;
    }

    try {
        const db = await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10, 
            serverSelectionTimeoutMS: 5000,
        });
        cachedDb = db;
        console.log('✓ MongoDB Connected (Pooled)');
        return cachedDb;
    } catch (err) {
        console.error('✗ MongoDB Connection Error:', err.message);
        throw err;
    }
};

module.exports = connectDB;
