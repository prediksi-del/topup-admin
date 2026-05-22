import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.credentialWithEntries(serviceAccount)
    });
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
  }
}

export const authAdmin = admin.auth();
