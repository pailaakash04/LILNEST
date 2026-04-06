import express from 'express';
import prisma from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

async function ensureUserFromReq(req) {
  const { uid, email, name } = req.user;
  let user = await prisma.user.findUnique({ where: { firebaseUid: uid } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        firebaseUid: uid,
        email: email || null,
        displayName: name || null,
      },
    });
    return user;
  }

  const updates = {};
  if (!user.email && email) updates.email = email;
  if (!user.displayName && name) updates.displayName = name;

  if (Object.keys(updates).length) {
    user = await prisma.user.update({ where: { id: user.id }, data: updates });
  }

  return user;
}

async function logEvent(userId, action, entity, entityId, meta = null) {
  try {
    await prisma.auditEvent.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        meta: meta || undefined,
      },
    });
  } catch {
    // no-op
  }
}

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

router.post('/me', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    return res.json({
      id: user.id,
      role: user.role,
      email: user.email,
      displayName: user.displayName,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to sync user' });
  }
});

// Profile (mother/child stored in preferences JSON)
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const type = req.query.type || 'mother';

    let profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      profile = await prisma.userProfile.create({ data: { userId: user.id, preferences: {} } });
    }

    const preferences = profile.preferences || {};
    return res.json({ profile: preferences[type] || {} });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const { type = 'mother', data = {} } = req.body || {};

    const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
    const preferences = profile?.preferences || {};

    const updated = await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: { preferences: { ...preferences, [type]: data } },
      create: { userId: user.id, preferences: { [type]: data } },
    });

    await logEvent(user.id, 'update', 'user_profile', user.id, { type });
    return res.json({ profile: updated.preferences?.[type] || {} });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Community
router.get('/community/posts', async (_req, res) => {
  try {
    const posts = await prisma.communityPost.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });

    const formatted = posts.map((post) => ({
      id: post.id,
      title: post.title,
      body: post.body,
      category: post.category,
      tags: post.tags || [],
      likes: post.likeCount,
      replies: post.commentCount,
      views: post.views,
      authorName: post.isAnonymous ? 'Anonymous' : (post.authorName || post.user?.displayName || post.user?.email || 'Anonymous'),
      isAnonymous: post.isAnonymous,
      createdAt: post.createdAt,
    }));

    return res.json({ posts: formatted });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load posts' });
  }
});

router.post('/community/posts', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const { title, body, category, tags, isAnonymous } = req.body || {};

    if (!body || !String(body).trim()) {
      return res.status(400).json({ error: 'Body is required' });
    }

    const post = await prisma.communityPost.create({
      data: {
        userId: user.id,
        title: title || null,
        body: body.trim(),
        category: category || null,
        tags: Array.isArray(tags) ? tags : [],
        isAnonymous: Boolean(isAnonymous),
        authorName: isAnonymous ? 'Anonymous' : (user.displayName || user.email || 'Anonymous'),
      },
    });

    await logEvent(user.id, 'create', 'community_post', post.id);
    return res.json({ id: post.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create post' });
  }
});

router.get('/community/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await prisma.communityComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: { user: true },
    });

    return res.json({
      comments: comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        authorName: comment.user?.displayName || comment.user?.email || 'Anonymous',
        createdAt: comment.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load comments' });
  }
});

router.post('/community/posts/:postId/comments', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const { postId } = req.params;
    const { body } = req.body || {};

    if (!body || !String(body).trim()) {
      return res.status(400).json({ error: 'Body is required' });
    }

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.communityComment.create({
        data: { postId, userId: user.id, body: body.trim() },
      });
      await tx.communityPost.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      });
      return created;
    });

    await logEvent(user.id, 'create', 'community_comment', comment.id, { postId });
    return res.json({ id: comment.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create comment' });
  }
});

router.post('/community/posts/:postId/like', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const { postId } = req.params;

    const likeId = { postId, userId: user.id };
    const existing = await prisma.communityPostLike.findUnique({ where: { postId_userId: likeId } });

    if (existing) {
      await prisma.$transaction([
        prisma.communityPostLike.delete({ where: { postId_userId: likeId } }),
        prisma.communityPost.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
      ]);
      return res.json({ liked: false });
    }

    await prisma.$transaction([
      prisma.communityPostLike.create({ data: likeId }),
      prisma.communityPost.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
    ]);

    await logEvent(user.id, 'like', 'community_post', postId);
    return res.json({ liked: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Time Capsules
router.get('/time-capsules', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const capsules = await prisma.timeCapsule.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { media: true },
    });

    return res.json({ capsules });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load capsules' });
  }
});

router.post('/time-capsules', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const { title, message, unlockType, unlockDate, status, meta } = req.body || {};

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const capsule = await prisma.timeCapsule.create({
      data: {
        userId: user.id,
        title: String(title).trim(),
        message: String(message).trim(),
        unlockType: unlockType || 'date',
        unlockDate: unlockDate ? new Date(unlockDate) : null,
        status: status || 'locked',
        meta: meta || undefined,
      },
    });

    await logEvent(user.id, 'create', 'time_capsule', capsule.id);
    return res.json({ id: capsule.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create capsule' });
  }
});

router.post('/time-capsules/:id/media', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const { id } = req.params;
    const { type, storageUrl, thumbnailUrl } = req.body || {};

    if (!type || !storageUrl) {
      return res.status(400).json({ error: 'type and storageUrl are required' });
    }

    const capsule = await prisma.timeCapsule.findFirst({ where: { id, userId: user.id } });
    if (!capsule) {
      return res.status(404).json({ error: 'Capsule not found' });
    }

    const media = await prisma.timeCapsuleMedia.create({
      data: { capsuleId: id, type, storageUrl, thumbnailUrl },
    });

    await logEvent(user.id, 'create', 'time_capsule_media', media.id, { capsuleId: id });
    return res.json({ id: media.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add media' });
  }
});

// Marketplace
router.get('/marketplace/providers', async (_req, res) => {
  try {
    const providers = await prisma.marketplaceProvider.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ providers });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load providers' });
  }
});

router.get('/marketplace/providers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const provider = await prisma.marketplaceProvider.findUnique({
      where: { id },
      include: { services: true, reviews: true },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    return res.json({ provider });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load provider' });
  }
});

router.get('/marketplace/bookings', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const bookings = await prisma.marketplaceBooking.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { provider: true, service: true },
    });

    return res.json({ bookings });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load bookings' });
  }
});

router.post('/marketplace/bookings', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const { providerId, serviceId, sessionType, scheduledAt, notes, paymentMethod, amount, currency } = req.body || {};

    if (!providerId || !sessionType || !scheduledAt) {
      return res.status(400).json({ error: 'providerId, sessionType, and scheduledAt are required' });
    }

    const booking = await prisma.marketplaceBooking.create({
      data: {
        userId: user.id,
        providerId,
        serviceId: serviceId || null,
        sessionType,
        scheduledAt: new Date(scheduledAt),
        notes: notes || null,
        paymentMethod: paymentMethod || null,
        amount: amount ?? null,
        currency: currency || 'INR',
      },
    });

    await logEvent(user.id, 'create', 'marketplace_booking', booking.id);
    return res.json({ id: booking.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Emergency contacts
router.get('/emergency-contacts', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const contacts = await prisma.emergencyContact.findMany({
      where: { userId: user.id },
    });

    return res.json({ contacts });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load contacts' });
  }
});

router.put('/emergency-contacts', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const { contacts = [] } = req.body || {};

    const results = await prisma.$transaction(
      contacts.map((contact) =>
        prisma.emergencyContact.upsert({
          where: { userId_type: { userId: user.id, type: contact.type } },
          update: { name: contact.name, phone: contact.phone },
          create: { userId: user.id, type: contact.type, name: contact.name, phone: contact.phone },
        })
      )
    );

    await logEvent(user.id, 'update', 'emergency_contacts', null, { count: results.length });
    return res.json({ count: results.length });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save contacts' });
  }
});

// Medicine prescriptions
router.get('/medicine/prescriptions', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const prescriptions = await prisma.medicinePrescription.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ prescriptions });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load prescriptions' });
  }
});

router.post('/medicine/prescriptions', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const { medicineKey, medicineName, kind, dosage, notes } = req.body || {};

    if (!medicineKey || !medicineName || !kind) {
      return res.status(400).json({ error: 'medicineKey, medicineName, and kind are required' });
    }

    const rx = await prisma.medicinePrescription.create({
      data: {
        userId: user.id,
        medicineKey,
        medicineName,
        kind,
        dosage: dosage || null,
        notes: notes || null,
      },
    });

    await logEvent(user.id, 'create', 'medicine_prescription', rx.id);
    return res.json({ id: rx.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save prescription' });
  }
});

router.delete('/medicine/prescriptions/:id', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const { id } = req.params;

    await prisma.medicinePrescription.delete({ where: { id } });
    await logEvent(user.id, 'delete', 'medicine_prescription', id);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete prescription' });
  }
});

// Hydration
router.get('/hydration', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const { date } = req.query;

    const start = date ? new Date(`${date}T00:00:00.000Z`) : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const logs = await prisma.hydrationLog.findMany({
      where: { userId: user.id, loggedAt: { gte: start, lt: end } },
    });
    const total = logs.reduce((sum, log) => sum + log.amountMl, 0);

    return res.json({ total });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load hydration' });
  }
});

router.post('/hydration', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const { amountMl } = req.body || {};

    const amount = Number(amountMl);
    if (!Number.isFinite(amount) || amount === 0) {
      return res.status(400).json({ error: 'amountMl must be a non-zero number' });
    }

    const log = await prisma.hydrationLog.create({
      data: { userId: user.id, amountMl: amount },
    });

    await logEvent(user.id, 'create', 'hydration_log', log.id);
    return res.json({ id: log.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to log hydration' });
  }
});

// Garden stats
router.get('/garden-stats', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    let stats = await prisma.gardenStat.findUnique({ where: { userId: user.id } });

    if (!stats) {
      stats = await prisma.gardenStat.create({ data: { userId: user.id } });
    }

    return res.json({ stats });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load garden stats' });
  }
});

router.put('/garden-stats', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const payload = req.body || {};

    const stats = await prisma.gardenStat.upsert({
      where: { userId: user.id },
      update: {
        focusStreak: payload.focusStreak,
        breakStreak: payload.breakStreak,
        meditationMinutes: payload.meditationMinutes,
        totalSessions: payload.totalSessions,
        achievements: payload.achievements,
        gardenLevel: payload.gardenLevel,
        weeklyProgress: payload.weeklyProgress,
        totalPoints: payload.totalPoints,
      },
      create: {
        userId: user.id,
        focusStreak: payload.focusStreak || 0,
        breakStreak: payload.breakStreak || 0,
        meditationMinutes: payload.meditationMinutes || 0,
        totalSessions: payload.totalSessions || 0,
        achievements: payload.achievements || 0,
        gardenLevel: payload.gardenLevel || 1,
        weeklyProgress: payload.weeklyProgress || [],
        totalPoints: payload.totalPoints || 0,
      },
    });

    await logEvent(user.id, 'update', 'garden_stats', user.id);
    return res.json({ stats });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update garden stats' });
  }
});

// Rewards summary
router.get('/rewards/summary', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    let summary = await prisma.rewardsSummary.findUnique({ where: { userId: user.id } });
    if (!summary) {
      summary = await prisma.rewardsSummary.create({ data: { userId: user.id } });
    }
    return res.json({ summary });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load rewards summary' });
  }
});

router.post('/rewards/summary', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const { points, level, streak, badges } = req.body || {};

    const updateData = {};
    if (points !== undefined) updateData.points = points;
    if (level !== undefined) updateData.level = level;
    if (streak !== undefined) updateData.streak = streak;
    if (badges !== undefined) updateData.badges = badges;

    const summary = await prisma.rewardsSummary.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        points: points ?? 0,
        level: level ?? 1,
        streak: streak ?? 0,
        badges: badges ?? [],
      },
    });

    await logEvent(user.id, 'update', 'rewards_summary', user.id);
    return res.json({ summary });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update rewards summary' });
  }
});

router.get('/rewards/challenges', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const challenges = await prisma.rewardsChallenge.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ challenges });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load challenges' });
  }
});

router.post('/rewards/challenges', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const { name, goal, progress, xp, description } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const challenge = await prisma.rewardsChallenge.create({
      data: {
        userId: user.id,
        name,
        goal: goal ?? 0,
        progress: progress ?? 0,
        xp: xp ?? 0,
        description: description || null,
      },
    });

    await logEvent(user.id, 'create', 'rewards_challenge', challenge.id);
    return res.json({ id: challenge.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create challenge' });
  }
});

// Settings
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    let settings = await prisma.userSetting.findUnique({ where: { userId: user.id } });
    if (!settings) {
      settings = await prisma.userSetting.create({ data: { userId: user.id, settings: {} } });
    }
    return res.json({ settings: settings.settings });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load settings' });
  }
});

router.put('/settings', requireAuth, async (req, res) => {
  try {
    const user = await ensureUserFromReq(req);
    const settings = await prisma.userSetting.upsert({
      where: { userId: user.id },
      update: { settings: req.body || {} },
      create: { userId: user.id, settings: req.body || {} },
    });

    await logEvent(user.id, 'update', 'user_settings', user.id);
    return res.json({ settings: settings.settings });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Doctor dashboard
router.get('/doctor/patients', requireAuth, async (_req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ patients });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load patients' });
  }
});

router.post('/doctor/patients', requireAuth, async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const patient = await prisma.patient.create({ data: { name, risk: 'Low' } });
    return res.json({ id: patient.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create patient' });
  }
});

router.get('/doctor/patients/:id', requireAuth, async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { id: req.params.id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    return res.json({ patient });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load patient' });
  }
});

router.put('/doctor/patients/:id', requireAuth, async (req, res) => {
  try {
    const { risk } = req.body || {};
    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data: { risk },
    });
    return res.json({ patient });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update patient' });
  }
});

router.get('/doctor/patients/:id/prescriptions', requireAuth, async (req, res) => {
  try {
    const prescriptions = await prisma.patientPrescription.findMany({
      where: { patientId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ prescriptions });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load prescriptions' });
  }
});

router.post('/doctor/patients/:id/prescriptions', requireAuth, async (req, res) => {
  try {
    const { drug, dose, note } = req.body || {};
    if (!drug || !dose) return res.status(400).json({ error: 'drug and dose are required' });
    const rx = await prisma.patientPrescription.create({
      data: { patientId: req.params.id, drug, dose, note: note || null },
    });
    return res.json({ id: rx.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add prescription' });
  }
});

router.get('/doctor/patients/:id/reports', requireAuth, async (req, res) => {
  try {
    const reports = await prisma.patientReport.findMany({
      where: { patientId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ reports });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load reports' });
  }
});

router.post('/doctor/patients/:id/reports', requireAuth, async (req, res) => {
  try {
    const { name, type, size, url } = req.body || {};
    if (!name || !url) return res.status(400).json({ error: 'name and url are required' });
    const report = await prisma.patientReport.create({
      data: { patientId: req.params.id, name, type: type || null, size: size || null, url },
    });
    return res.json({ id: report.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add report' });
  }
});

export default router;
