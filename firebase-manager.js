class FirebaseManager {
    constructor() {
        this.app = null;
        this.messaging = null;
        this.firestoreDb = null;
        this.fcmToken = null;
        this.vapidKey = null;
        this.initialized = false;
    }

    async initialize() {
        const savedConfig = await database.getSetting('firebaseConfig');
        const savedVapidKey = await database.getSetting('firebaseVapidKey');

        if (!savedConfig || !savedVapidKey) return false;

        try {
            // Delete existing app if re-initializing with new config
            if (this.app) {
                await this.app.delete();
                this.app = null;
            }

            this.app = firebase.initializeApp(savedConfig, 'bill-manager');
            this.messaging = firebase.messaging(this.app);
            this.firestoreDb = firebase.firestore(this.app);
            this.vapidKey = savedVapidKey;

            const cachedToken = await database.getSetting('fcmToken');
            if (cachedToken) this.fcmToken = cachedToken;

            this.initialized = true;
            console.log('Firebase initialized successfully');
            return true;
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            alert(`Firebase initialization failed: ${error.message}`);
            this.initialized = false;
            return false;
        }
    }

    async getOrRefreshToken() {
        if (!this.initialized || !this.messaging) return null;

        try {
            const swRegistration = await navigator.serviceWorker.ready;
            const token = await this.messaging.getToken({
                vapidKey: this.vapidKey,
                serviceWorkerRegistration: swRegistration
            });

            if (token && token !== this.fcmToken) {
                this.fcmToken = token;
                await database.saveSetting('fcmToken', token);
                console.log('FCM token refreshed');
            }

            return token;
        } catch (error) {
            console.error('Failed to get FCM token:', error);
            alert(`Failed to get FCM token: ${error.message}`);
            return null;
        }
    }

    // Schedule all notifications for unpaid bills — idempotent (no duplicates).
    async scheduleMonthlyNotifications(bills) {
        if (!this.initialized || !this.firestoreDb) return { created: 0, skipped: 0 };

        if (!this.fcmToken) {
            await this.getOrRefreshToken();
        }
        if (!this.fcmToken) return { created: 0, skipped: 0 };

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tokenFingerprint = this.fcmToken.slice(-8);
        const result = { created: 0, skipped: 0 };
        const currencySymbol = (typeof app !== 'undefined') ? app.currencySymbol : '£';
        const scheduledIds = new Set((await database.getSetting('firebaseScheduledIds')) || []);

        for (const bill of bills) {
            if (bill.isPaid) continue;

            const dueDate = new Date(bill.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            const reminderDays = bill.reminderDays || 3;

            const pending = [];

            if (daysUntilDue < 0) {
                pending.push({
                    date: this._formatDate(today),
                    type: 'overdue',
                    title: 'Overdue Bill! ⚠️',
                    body: `${bill.name} - ${currencySymbol}${bill.amount.toFixed(2)} was due ${Math.abs(daysUntilDue)} day(s) ago`
                });
            } else if (daysUntilDue === 0) {
                pending.push({
                    date: this._formatDate(today),
                    type: 'due_today',
                    title: 'Bill Due Today! 🔔',
                    body: `${bill.name} - ${currencySymbol}${bill.amount.toFixed(2)} is due today!`
                });
            } else {
                // Reminder fires reminderDays before due date
                const reminderDate = new Date(dueDate);
                reminderDate.setDate(reminderDate.getDate() - reminderDays);
                if (reminderDate >= today) {
                    pending.push({
                        date: this._formatDate(reminderDate),
                        type: 'reminder',
                        title: 'Upcoming Bill Reminder 📅',
                        body: `${bill.name} - ${currencySymbol}${bill.amount.toFixed(2)} is due in ${reminderDays} day(s)`
                    });
                } else if (daysUntilDue <= reminderDays) {
                    // Already inside reminder window — fire today
                    pending.push({
                        date: this._formatDate(today),
                        type: 'reminder',
                        title: 'Upcoming Bill Reminder 📅',
                        body: `${bill.name} - ${currencySymbol}${bill.amount.toFixed(2)} is due in ${daysUntilDue} day(s)`
                    });
                }
                // Always schedule a due-date notification
                pending.push({
                    date: this._formatDate(dueDate),
                    type: 'due_today',
                    title: 'Bill Due Today! 🔔',
                    body: `${bill.name} - ${currencySymbol}${bill.amount.toFixed(2)} is due today!`
                });
            }

            for (const n of pending) {
                const docId = `${bill.id}_${n.date}_${n.type}_${tokenFingerprint}`;
                const docRef = this.firestoreDb.collection('scheduled_notifications').doc(docId);

                // Rules forbid client reads, so we can't check Firestore for an existing doc.
                // Track created IDs locally; a re-set of an existing doc is an update, which
                // the rules reject with permission-denied — treat that as "already scheduled".
                if (scheduledIds.has(docId)) {
                    result.skipped++;
                    continue;
                }

                const scheduledFor = new Date(`${n.date}T09:00:00`);
                try {
                    await docRef.set({
                    token: this.fcmToken,
                    billId: String(bill.id),
                    billName: bill.name,
                    amount: bill.amount,
                    currency: currencySymbol,
                    dueDate: bill.dueDate,
                    scheduledFor: firebase.firestore.Timestamp.fromDate(scheduledFor),
                        type: n.type,
                        title: n.title,
                        body: n.body,
                        sent: false,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    result.created++;
                    scheduledIds.add(docId);
                } catch (error) {
                    if (error.code === 'permission-denied') {
                        // Doc already exists (update denied) — or rules not deployed; see console.
                        console.warn(`Firestore write denied for ${docId}:`, error.message);
                        result.skipped++;
                    } else {
                        throw error;
                    }
                }
            }
        }

        await database.saveSetting('firebaseScheduledIds', [...scheduledIds]);

        console.log(`Firebase scheduling: ${result.created} created, ${result.skipped} skipped`);
        return result;
    }

    // Delete all unsent Firestore notifications for a specific bill (call on edit/delete).
    async unscheduleBillNotifications(billId) {
        if (!this.initialized || !this.firestoreDb) return;

        // Rules forbid client queries, so delete by ID using the locally tracked IDs.
        const scheduledIds = (await database.getSetting('firebaseScheduledIds')) || [];
        const prefix = `${billId}_`;
        const toDelete = scheduledIds.filter(id => id.startsWith(prefix));
        if (toDelete.length === 0) return;

        const collection = this.firestoreDb.collection('scheduled_notifications');
        const removed = new Set();
        for (const docId of toDelete) {
            try {
                await collection.doc(docId).delete();
                removed.add(docId);
            } catch (error) {
                if (error.code === 'permission-denied') {
                    // Doc already gone (e.g. removed after sending) — nothing left to delete.
                    console.warn(`Firestore delete denied for ${docId}:`, error.message);
                    removed.add(docId);
                } else {
                    console.warn(`Firestore delete failed for ${docId}:`, error);
                }
            }
        }

        await database.saveSetting('firebaseScheduledIds', scheduledIds.filter(id => !removed.has(id)));
        console.log(`Deleted ${removed.size} scheduled notifications for bill ${billId}`);
    }

    async testConnection() {
        if (!this.initialized) return { ok: false, message: 'Firebase not initialized' };

        try {
            await this.firestoreDb.collection('_connection_test').doc('ping').set({
                ts: firebase.firestore.FieldValue.serverTimestamp()
            });
            await this.firestoreDb.collection('_connection_test').doc('ping').delete();

            const token = await this.getOrRefreshToken();
            if (!token) return { ok: false, message: 'Firestore connected but FCM token failed. Check VAPID key and notification permission.' };

            return { ok: true, message: 'Connected. FCM token registered.' };
        } catch (error) {
            return { ok: false, message: error.message };
        }
    }

    async clear() {
        this.fcmToken = null;
        this.initialized = false;
        if (this.app) {
            try { await this.app.delete(); } catch (_) {}
            this.app = null;
        }
        this.messaging = null;
        this.firestoreDb = null;
    }

    _formatDate(date) {
        return date.toISOString().split('T')[0];
    }
}

const firebaseManager = new FirebaseManager();
