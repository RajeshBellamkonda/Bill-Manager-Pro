// PWA Installation and Service Worker Handler
class PWAHandler {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
    }

    init() {
        // Register service worker (only on HTTP/HTTPS, not file://)
        if ('serviceWorker' in navigator && 
            (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
            navigator.serviceWorker.register('/service-worker.js')
                .then((registration) => {
                    alert('DEBUG: Service Worker registered successfully.');
                    console.log('Service Worker registered:', registration);
                    registration.showNotification('This is a notification', {body: 'Do you see it?', requireInteraction: true, icon: 'fav-icon.png'})
                })
                .catch((error) => {
                    alert('DEBUG: Service Worker registration failed. error: ' + error);
                    console.log('Service Worker registration failed:', error);
                });
        } else if (window.location.protocol === 'file:') {
            alert('DEBUG: Service Worker not available on file:// protocol. Please use a web server (http://localhost).');
            console.log('Service Worker not available when using file:// protocol. Please use a web server (http://localhost).');
        }

        // Listen for install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });

        // Check if already installed
        window.addEventListener('appinstalled', () => {
            console.log('PWA installed');
            this.isInstalled = true;
            this.hideInstallButton();
        });

        // Detect if running as PWA
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.isInstalled = true;
            console.log('Running as PWA');
        }

        // Add install button click handler
        this.setupInstallButton();
    }

    showInstallButton() {
        const installBtn = document.getElementById('installBtn');
        if (installBtn) {
            installBtn.style.display = 'block';
        }
    }

    hideInstallButton() {
        const installBtn = document.getElementById('installBtn');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    }

    setupInstallButton() {
        const installBtn = document.getElementById('installBtn');
        if (installBtn) {
            installBtn.addEventListener('click', () => {
                this.promptInstall();
            });
        }
    }

    async promptInstall() {
        if (!this.deferredPrompt) {
            alert('App is already installed or installation is not available');
            return;
        }

        // Show the install prompt
        this.deferredPrompt.prompt();

        // Wait for the user's response
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`User response: ${outcome}`);

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        // Clear the saved prompt
        this.deferredPrompt = null;
        this.hideInstallButton();
    }

    // Check for updates
    async checkForUpdates() {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                registration.update();
            }
        }
    }

    // Request persistent storage (useful for Android)
    async requestPersistentStorage() {
        if (navigator.storage && navigator.storage.persist) {
            const isPersisted = await navigator.storage.persist();
            console.log(`Persistent storage granted: ${isPersisted}`);
            return isPersisted;
        }
        return false;
    }
}

// Initialize PWA handler
const pwaHandler = new PWAHandler();
document.addEventListener('DOMContentLoaded', () => {
    pwaHandler.init();
    pwaHandler.requestPersistentStorage();
});
