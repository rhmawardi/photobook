(function() {
    var deferredInstallPrompt = null;

    function isIosDevice() {
        return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    }

    function isStandaloneApp() {
        return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    function ensureInstallUi() {
        if (document.getElementById('install-app-btn')) {
            return;
        }

        var button = document.createElement('button');
        button.id = 'install-app-btn';
        button.type = 'button';
        button.setAttribute('aria-label', 'Install app');
        button.innerHTML = '<i class="fas fa-download"></i><span>Install App</span>';

        var tip = document.createElement('div');
        tip.id = 'ios-install-tip';
        tip.setAttribute('aria-hidden', 'true');
        tip.innerHTML = '<div class="ios-install-card" role="dialog" aria-modal="true" aria-labelledby="ios-install-title"><button id="ios-install-close" type="button" aria-label="Close install instructions"><i class="fas fa-times"></i></button><div class="ios-install-icon">♡</div><h2 id="ios-install-title">Install di iPhone</h2><p>Tap tombol Share di Safari, lalu pilih <strong>Add to Home Screen</strong>.</p></div>';

        document.body.appendChild(button);
        document.body.appendChild(tip);
    }

    function showInstallButton() {
        var installButton = document.getElementById('install-app-btn');
        if (installButton && !isStandaloneApp()) {
            installButton.classList.add('is-visible');
        }
    }

    window.addEventListener('beforeinstallprompt', function(event) {
        event.preventDefault();
        deferredInstallPrompt = event;
        showInstallButton();
    });

    document.addEventListener('DOMContentLoaded', function() {
        ensureInstallUi();

        if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
            navigator.serviceWorker.register('./service-worker.js').catch(function(error) {
                console.warn('Service worker registration failed:', error);
            });
        }

        var installButton = document.getElementById('install-app-btn');
        var iosTip = document.getElementById('ios-install-tip');
        var iosClose = document.getElementById('ios-install-close');

        if (isIosDevice() && !isStandaloneApp()) {
            showInstallButton();
        }

        if (installButton) {
            installButton.addEventListener('click', function() {
                if (deferredInstallPrompt) {
                    deferredInstallPrompt.prompt();
                    deferredInstallPrompt.userChoice.finally(function() {
                        deferredInstallPrompt = null;
                        installButton.classList.remove('is-visible');
                    });
                    return;
                }

                if (isIosDevice() && iosTip) {
                    iosTip.classList.add('is-visible');
                    iosTip.setAttribute('aria-hidden', 'false');
                }
            });
        }

        if (iosClose && iosTip) {
            iosClose.addEventListener('click', function() {
                iosTip.classList.remove('is-visible');
                iosTip.setAttribute('aria-hidden', 'true');
            });
            iosTip.addEventListener('click', function(event) {
                if (event.target === iosTip) {
                    iosTip.classList.remove('is-visible');
                    iosTip.setAttribute('aria-hidden', 'true');
                }
            });
        }
    });
})();
