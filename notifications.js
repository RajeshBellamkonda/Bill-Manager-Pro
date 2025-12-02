// Notification Manager
class NotificationManager {
    constructor() {
        this.permission = Notification.permission;
        this.checkInterval = null;
    }

    async requestPermission() {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return false;
        }

        if (this.permission === 'granted') {
            return true;
        }

        if (this.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            return permission === 'granted';
        }

        return false;
    }

    showNotification(title, options = {}) {
        if (this.permission === 'granted') {
            const notification = new Notification(title, {
                icon: '💰',
                badge: '💰',
                ...options
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            return notification;
        }
    }

    async checkUpcomingBills() {
        const bills = await database.getAllBills();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        bills.forEach(bill => {
            if (bill.isPaid) return;

            const dueDate = new Date(bill.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            const reminderDays = bill.reminderDays || 3;

            // Check if bill is due today
            if (daysUntilDue === 0) {
                this.showNotification('Bill Due Today! 🔔', {
                    body: `${bill.name} - $${bill.amount.toFixed(2)} is due today!`,
                    tag: `bill-due-${bill.id}`,
                    requireInteraction: true
                });
            }
            // Check if bill is within reminder window
            else if (daysUntilDue > 0 && daysUntilDue <= reminderDays) {
                this.showNotification('Upcoming Bill Reminder 📅', {
                    body: `${bill.name} - $${bill.amount.toFixed(2)} is due in ${daysUntilDue} day(s)`,
                    tag: `bill-reminder-${bill.id}`
                });
            }
            // Check if bill is overdue
            else if (daysUntilDue < 0) {
                this.showNotification('Overdue Bill! ⚠️', {
                    body: `${bill.name} - $${bill.amount.toFixed(2)} was due ${Math.abs(daysUntilDue)} day(s) ago`,
                    tag: `bill-overdue-${bill.id}`,
                    requireInteraction: true
                });
            }
        });
    }

    startPeriodicCheck() {
        // Check immediately
        this.checkUpcomingBills();

        // Check every hour
        this.checkInterval = setInterval(() => {
            this.checkUpcomingBills();
        }, 60 * 60 * 1000); // 1 hour
    }

    stopPeriodicCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    async scheduleRecurringNotifications() {
        // Check at 9 AM daily
        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(9, 0, 0, 0);

        if (now > scheduledTime) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        const timeUntilNotification = scheduledTime - now;

        setTimeout(() => {
            this.checkUpcomingBills();
            // Reschedule for next day
            this.scheduleRecurringNotifications();
        }, timeUntilNotification);
    }
}

// Initialize notification manager
const notificationManager = new NotificationManager();
