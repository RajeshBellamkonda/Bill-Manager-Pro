let commPort;

self.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'CONNECT') {
        commPort = event.ports[0];
    }
});

self.onnotificationclose = function () {
    if (commPort) {
        commPort.postMessage({ payload: 'closed' });
    }
};
