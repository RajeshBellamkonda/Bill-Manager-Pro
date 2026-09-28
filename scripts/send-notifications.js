const admin = require('firebase-admin');

const APP_URL = 'https://rajeshbellamkonda.github.io/Bill-Manager-Pro/';
const ICON_URL = `${APP_URL}fav-icon.png`;

function initFirebase() {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
        console.error('FIREBASE_SERVICE_ACCOUNT secret is not set');
        process.exit(1);
    }
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(raw))
    });
}

async function sendNotifications() {
    const db = admin.firestore();
    const messaging = admin.messaging();

    const now = new Date();
    console.log(`Running at ${now.toISOString()}`);

    const snapshot = await db.collection('scheduled_notifications')
        .where('scheduledFor', '<=', now)
        .where('sent', '==', false)
        .get();

    if (snapshot.empty) {
        console.log('No notifications to send');
        return;
    }

    console.log(`Found ${snapshot.size} notifications to send`);

    const messages = [];
    const docRefs = [];

    snapshot.forEach(doc => {
        const d = doc.data();
        if (!d.token || !d.title) return;

        messages.push({
            token: d.token,
            notification: { title: d.title, body: d.body },
            webpush: {
                notification: {
                    icon: ICON_URL,
                    badge: ICON_URL,
                    requireInteraction: d.type === 'due_today' || d.type === 'overdue',
                    tag: `bill-${d.type}-${d.billId}`,
                    vibrate: [200, 100, 200]
                },
                fcmOptions: { link: APP_URL }
            }
        });
        docRefs.push(doc.ref);
    });

    if (messages.length === 0) return;

    const BATCH_SIZE = 500;
    let sent = 0, failed = 0, cleaned = 0;

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        const batchMessages = messages.slice(i, i + BATCH_SIZE);
        const batchRefs = docRefs.slice(i, i + BATCH_SIZE);

        const response = await messaging.sendEach(batchMessages);
        const dbBatch = db.batch();

        response.responses.forEach((resp, idx) => {
            if (resp.success) {
                dbBatch.update(batchRefs[idx], {
                    sent: true,
                    sentAt: admin.firestore.FieldValue.serverTimestamp()
                });
                sent++;
            } else {
                const code = resp.error?.code;
                const invalidToken =
                    code === 'messaging/registration-token-not-registered' ||
                    code === 'messaging/invalid-registration-token';

                if (invalidToken) {
                    dbBatch.delete(batchRefs[idx]);
                    cleaned++;
                } else {
                    dbBatch.update(batchRefs[idx], {
                        sendError: code,
                        retryCount: admin.firestore.FieldValue.increment(1)
                    });
                    failed++;
                }
            }
        });

        await dbBatch.commit();
    }

    console.log(`Done — sent: ${sent}, failed: ${failed}, invalid tokens cleaned: ${cleaned}`);
}

initFirebase();
sendNotifications().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
