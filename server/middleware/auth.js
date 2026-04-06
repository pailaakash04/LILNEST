import { initFirebaseAdmin } from '../firebaseAdmin.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  const admin = initFirebaseAdmin();
  if (!admin) {
    return res.status(500).json({ error: 'Firebase admin not configured' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
      name: decoded.name || decoded.displayName || null,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid auth token' });
  }
}
