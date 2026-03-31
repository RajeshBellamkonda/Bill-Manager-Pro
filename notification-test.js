/**
 * Browser Notification Tester
 * Adapted for Bill Manager Pro
 */

/**
 * Determine if running on a Chromium browser on Android
 * @returns {boolean}
 */
function isChromiumOnAndroid() {
    if (navigator.userAgent.match(/Android/i) && navigator.userAgent.match(/Chrome/i)) {
        return true;
    }
    return false;
}

/**
 * Initialize the state of inputs & information based on feature detection
 */
function initialize() {
    // Detect Android Chrome
    if (isChromiumOnAndroid()) {
        document.getElementById('android-status').innerHTML = 'yes';
        document.getElementById('mobile-selector').checked = true;
    } else {
        document.getElementById('android-status').innerHTML = 'no';
    }

    if (!('Notification' in window)) {
        document.getElementById('support-status').innerHTML = 'no';
        return;
    }

    document.getElementById('support-status').innerHTML = 'yes';
    document.getElementById('permission-status-field').style.visibility = 'visible';
    document.getElementById('notification-status-field').style.visibility = 'visible';
    document.getElementById('notification-field').style.visibility = 'visible';

    updatePermissionStatus();
}

/**
 * Update the displayed status for notification permission
 */
function updatePermissionStatus() {
    var output = Notification.permission;

    if (output === 'default') {
        output = 'not yet';
    }

    document.getElementById('permission-status').innerHTML = output;
}

/**
 * Display a notification using ServiceWorker (for mobile/Android)
 */
function showWorkerNotification() {
    navigator.serviceWorker.register('notification-test-worker.js')
        .then(function (registration) {
            registration.update();

            const messageChannel = new MessageChannel();

            if (registration.active) {
                registration.active.postMessage({
                    type: 'CONNECT'
                }, [messageChannel.port2]);
            }

            messageChannel.port1.onmessage = function (event) {
                if (event.data && event.data.payload === 'closed') {
                    document.getElementById('notification-status').innerHTML = 'closed';
                }
            };

            registration.showNotification('This is a notification', {
                body: 'Do you see it?',
                requireInteraction: true,
                icon: 'fav-icon.png'
            }).then(function () {
                document.getElementById('notification-status').innerHTML = 'displayed';
            });
        })
        .catch(function (err) {
            document.getElementById('notification-status').innerHTML = 'no - ServiceWorker error: ' + err.message;
        });
}

/**
 * Show a notification using the standard Notification API
 */
function showStandardNotification() {
    var notification = new Notification('This is a notification', {
        body: 'Do you see it?',
        requireInteraction: true,
        icon: 'fav-icon.png'
    });

    notification.onshow = function () {
        document.getElementById('notification-status').innerHTML = 'displayed';
    };

    notification.onerror = function (event) {
        document.getElementById('notification-status').innerHTML = 'no - an error occurred: ' + event.type;
    };

    notification.onclose = function () {
        document.getElementById('notification-status').innerHTML = 'closed';
    };
}

/**
 * Call the necessary notification method based on the mobile selector checkbox
 */
function notify() {
    if (document.getElementById('mobile-selector').checked) {
        showWorkerNotification();
    } else {
        showStandardNotification();
    }
}

/**
 * Handle user click on the Send Notification button
 */
document.getElementById('notify').onclick = function () {
    if (Notification.permission === 'granted') {
        document.getElementById('notification-status').innerHTML = 'pending';
        notify();
    } else if (Notification.permission !== 'denied') {
        document.getElementById('permission-status').innerHTML = 'requesting permission';

        Notification.requestPermission().then(function (permission) {
            updatePermissionStatus();

            if (permission === 'granted') {
                document.getElementById('notification-status').innerHTML = 'pending';
                notify();
            } else if (permission === 'denied') {
                document.getElementById('notification-status').innerHTML = 'no';
            }
        });
    }
};

initialize();
