import admin from 'firebase-admin';

function getFirebaseConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return { projectId, clientEmail, privateKey };
}

export function initFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const config = getFirebaseConfig();
  if (!config) return null;

  admin.initializeApp({
    credential: admin.credential.cert(config),
  });

  return admin;
}

export default admin;
