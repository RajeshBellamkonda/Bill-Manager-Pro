// Notification Manager
class NotificationManager {
    constructor() {
        this.permission = Notification.permission;
        this.checkInterval = null;
        this.swRegistration = null; // Cache the ServiceWorker registration
    }

    /**
     * Determine if running on a Chromium browser on Android
     */
    isChromiumOnAndroid() {
        if (navigator.userAgent.match(/Android/i) && navigator.userAgent.match(/Chrome/i)) {
            return true;
        }
        return false;
    }

    showWorkerNotification() {
    navigator.serviceWorker.register('https://rajeshbellamkonda.github.io/Bill-Manager-Pro/notifications.js')
    .then(function(registration) {
        registration.update();

        const messageChannel = new MessageChannel();

        registration.active.postMessage({
            type: 'CONNECT'
        }, [messageChannel.port2]);


        messageChannel.port1.onmessage = function(event) {
            if(event.data.payload === 'closed') {
                document.getElementById('notification-status').innerHTML = 'closed';
            }
        };


        registration.showNotification('This is a notification', {body: 'Do you see it?', requireInteraction: true, icon: 'https://rajeshbellamkonda.github.io/Bill-Manager-Pro/fav-icon.png'})
            .then(function() {
                document.getElementById('notification-status').innerHTML = 'displayed';
            });
    });
}

    /**
     * Get or create ServiceWorker registration for Android Chrome
     */
    async getServiceWorkerRegistration() {
        if (this.swRegistration) {
            return this.swRegistration;
        }

        try {
            // Check if already registered
            const existingRegistration = await navigator.serviceWorker.getRegistration();
            
            if (existingRegistration) {
                alert('DEBUG PWA: Using existing ServiceWorker registration');
                console.log('Using existing ServiceWorker registration');
                this.swRegistration = existingRegistration;
                return existingRegistration;
            }

            // Register new ServiceWorker with correct scope
            alert('DEBUG PWA: Registering new ServiceWorker');
            console.log('Registering new ServiceWorker');
            this.swRegistration = await navigator.serviceWorker.register('https://rajeshbellamkonda.github.io/Bill-Manager-Pro/service-worker.js');
                        
            // Wait for it to be ready
            await navigator.serviceWorker.ready;
            
            return this.swRegistration;
        } catch (error) {
            console.error('ServiceWorker registration error:', error);
            throw error;
        }
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
            // Use ServiceWorker for Android Chrome
            if (this.isChromiumOnAndroid() && 'serviceWorker' in navigator) {
                console.log('Detected Android Chrome - using ServiceWorker notification');
                
                try {
                    // https://www.kenherbert.dev/browser-notification-tester/
                    // https://www.kenherbert.dev/static/js/browser-notifications-test.js
                     // alert('DEBUG PWA: New - Test: Showing notification via ServiceWorker'); 
                     this.showWorkerNotification();

                    // Get or reuse existing registration
                    const registration = await this.getServiceWorkerRegistration();
                    
                   

                    // Show notification directly through registration
                    await registration.showNotification(title, {
                        body: options.body || '',
                        icon: 'https://rajeshbellamkonda.github.io/Bill-Manager-Pro/fav-icon.png',
                        badge: 'https://rajeshbellamkonda.github.io/Bill-Manager-Pro/fav-icon.png',
                        vibrate: [200, 100, 200],
                        requireInteraction: options.requireInteraction || false,
                        tag: options.tag || 'bill-reminder',
                        data: options.data || {},
                        ...options
                    });
                    
                    console.log('ServiceWorker notification shown:', title);
                    alert(`Notification shown: ${title}`);
                    return true;
                } catch (swError) {
                    console.error('ServiceWorker notification failed, trying fallback:', swError);
                    alert(`ServiceWorker error: ${swError.message}. Trying fallback...`);
                    // Fall through to standard notification
                }
            }
            
            // Fallback to regular Notification API for desktop or if ServiceWorker fails
            console.log('Using standard Notification API');
            const notification = new Notification(title, {
                body: options.body || '',
                icon: 'https://rajeshbellamkonda.github.io/Bill-Manager-Pro/fav-icon.png',
                badge: 'https://rajeshbellamkonda.github.io/Bill-Manager-Pro/fav-icon.png',
                requireInteraction: options.requireInteraction || false,
                tag: options.tag || 'bill-reminder',
                ...options
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            notification.onshow = () => {
                console.log('Standard notification shown:', title);
            };

            notification.onerror = (event) => {
                console.error('Notification error:', event.type);
            };

            notification.onclose = () => {
                console.log('Notification closed:', title);
            };

            alert(`Standard notification shown: ${title}`);
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
