// Notification Manager
class NotificationManager {
    constructor() {
        this.permission = Notification.permission;
        this.checkInterval = null;
    }

    async requestPermission() {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            alert('Notifications are not supported in this browser');
            return false;
        }

        // Always check current permission state
        this.permission = Notification.permission;
        console.log('Current notification permission:', this.permission);

        if (this.permission === 'granted') {
            console.log('Permission already granted');
            return true;
        }

        if (this.permission === 'denied') {
            console.log('Notification permission denied');
            alert('Notification permission was denied. Please enable it in your browser settings.');
            return false;
        }

        // Permission is 'default' - need to request it
        try {
            console.log('Requesting notification permission...');
            const permission = await Notification.requestPermission();
            this.permission = permission;
            console.log('Notification permission result:', permission);
            
            if (permission === 'granted') {
                alert('Notifications enabled! You will receive reminders for your bills.');
            }
            
            return permission === 'granted';
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            alert(`Failed to request notification permission: ${error.message}`);
            return false;
        }
    }

    async showNotification(title, options = {}) {
        // Always check current permission
        this.permission = Notification.permission;
        
        if (this.permission !== 'granted') {
            console.warn('Cannot show notification. Permission:', this.permission);
            return null;
        }

        try {
            // Check if service worker is available (required for Android Chrome)
            if ('serviceWorker' in navigator) {
                // Wait for service worker to be ready
                const registration = await navigator.serviceWorker.ready;
                
                // Check for controller after waiting
                const hasController = navigator.serviceWorker.controller;
                
                console.log('ServiceWorker status:', { ready: true, hasController });
                
                if (hasController) {
                    // Use ServiceWorker notification (Android Chrome)
                    await registration.showNotification(title, {
                        icon: 'fav-icon.png',
                        badge: 'fav-icon.png',
                        vibrate: [200, 100, 200],
                        requireInteraction: options.requireInteraction || false,
                        priority: 'high',
                        urgency: 'high',
                        ...options
                    });
                    console.log('Service Worker notification shown:', title);
                    return true;
                }
            }
            
            // Fallback to regular Notification API (Desktop browsers)
            console.log('Using fallback Notification API');
            const notification = new Notification(title, {
                icon: 'fav-icon.png',
                badge: 'fav-icon.png',
                ...options
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            console.log('Regular notification shown:', title);
            return notification;
        } catch (error) {
            console.error('Error showing notification:', error);
            alert(`Failed to show notification: ${error.message}`);
            return null;
        }
    }

    async checkUpcomingBills() {
        const bills = await database.getAllBills();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let notificationCount = 0;

        bills.forEach(bill => {
            if (bill.isPaid) return;

            const dueDate = new Date(bill.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            const reminderDays = bill.reminderDays || 3;

            // Check if bill is due today
            if (daysUntilDue === 0) {
                this.showNotification('Bill Due Today! 🔔', {
                    body: `${bill.name} - ${app.currencySymbol}${bill.amount.toFixed(2)} is due today!`,
                    tag: `bill-due-${bill.id}`,
                    requireInteraction: true
                });
                notificationCount++;
            }
            // Check if bill is within reminder window
            else if (daysUntilDue > 0 && daysUntilDue <= reminderDays) {
                this.showNotification('Upcoming Bill Reminder 📅', {
                    body: `${bill.name} - ${app.currencySymbol}${bill.amount.toFixed(2)} is due in ${daysUntilDue} day(s)`,
                    tag: `bill-reminder-${bill.id}`
                });
                notificationCount++;
            }
            // Check if bill is overdue
            else if (daysUntilDue < 0) {
                this.showNotification('Overdue Bill! ⚠️', {
                    body: `${bill.name} - ${app.currencySymbol}${bill.amount.toFixed(2)} was due ${Math.abs(daysUntilDue)} day(s) ago`,
                    tag: `bill-overdue-${bill.id}`,
                    requireInteraction: true
                });
                notificationCount++;
            }
        });

        console.log(`Checked ${bills.length} bills, sent ${notificationCount} notifications`);
        return notificationCount;
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
