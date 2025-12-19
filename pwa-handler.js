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
            
            // Listen for controller change (when SW takes control)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                alert('DEBUG PWA: ServiceWorker controller changed - now active!');
                console.log('ServiceWorker controller changed');
            });
            
            navigator.serviceWorker.register('https://rajeshbellamkonda.github.io/Bill-Manager-Pro/service-worker.js')
                .then(async (registration) => {
                    alert(`DEBUG PWA: ServiceWorker registered successfully! Scope: ${registration.scope}`);
                    console.log('Service Worker registered:', registration);
                    
                    // Check if there's an update waiting
                    if (registration.waiting) {
                        alert('DEBUG PWA: ServiceWorker update waiting, activating...');
                        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                    
                    // Wait for the service worker to be ready
                    await navigator.serviceWorker.ready;
                    
                    // Check controller status
                    if (!navigator.serviceWorker.controller) {
                        alert('DEBUG PWA: ServiceWorker ready but no controller. Reloading page once to activate...');
                        // Mark that we've done the reload to prevent infinite loop
                        if (!sessionStorage.getItem('sw_reloaded')) {
                            sessionStorage.setItem('sw_reloaded', 'true');
                            window.location.reload();
                        } else {
                            alert('DEBUG PWA: Already reloaded once. ServiceWorker might need manual activation. Try closing all tabs and reopening.');
                        }
                        return;
                    }
                    
                    alert('DEBUG PWA: ServiceWorker is ready and controlling the page!');
                    sessionStorage.removeItem('sw_reloaded'); // Clear the flag on success
                })
                .catch((error) => {
                    alert(`DEBUG PWA ERROR: ServiceWorker registration failed: ${error.message}`);
                    console.log('Service Worker registration failed:', error);
                });
        } else if (window.location.protocol === 'file:') {
            alert('DEBUG PWA: Cannot register ServiceWorker - using file:// protocol. Notifications require http:// or https://');
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
