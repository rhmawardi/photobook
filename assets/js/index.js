var deferredInstallPrompt = null;
var musicPlaying = false;
var heartInterval = null;

function isIosDevice() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandaloneApp() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function checkPassword() {
        var inputEl = document.getElementById('pw-input');
        var input = inputEl ? inputEl.value : '';
        var error = document.getElementById('pw-error');
        if (input === 'rizkyfaikah26') {
            var overlay = document.getElementById('password-overlay');
            if (!overlay) { return; }
            overlay.classList.add('fade-out');
            setTimeout(function() { overlay.style.display = 'none'; }, 800);
        } else if (error && inputEl) {
            error.style.opacity = '1';
            inputEl.style.border = '1.5px solid #e05a7a';
            setTimeout(function() {
                error.style.opacity = '0';
                inputEl.style.border = '1.5px solid #E5A4B3';
            }, 2000);
        }
    }
    function togglePwVisibility() {
        var input = document.getElementById('pw-input');
        var icon  = document.getElementById('eye-icon');
        if (!input || !icon) { return; }
        if (input.type === 'password') { input.type = 'text'; icon.textContent = '🙈'; }
        else { input.type = 'password'; icon.textContent = '👁'; }
    }

    function toggleMusic() {
        var audio = document.getElementById('background-music');
        var btn = document.getElementById('music-btn');
        var icon = document.getElementById('music-icon');
        var label = document.getElementById('music-label');
        if (!audio || !btn || !icon || !label) { return; }
        if (!musicPlaying) {
            audio.play().then(function() {
                musicPlaying = true;
            }).catch(function() {
                musicPlaying = false;
                document.getElementById('play-music-text').textContent = 'Tap Again ♡';
            });
            icon.className = 'fas fa-pause';
            document.getElementById('play-music-text').textContent = '♡ Pause Music ♡';
            btn.classList.add('playing');
            label.style.opacity = '1'; label.style.transform = 'translateY(0)';
            heartInterval = setInterval(function(){
                var container = document.getElementById('heart-burst');
                var heart = document.createElement('span');
                heart.textContent = ['❤','💕','✿','♡'][Math.floor(Math.random()*4)];
                heart.className = 'burst-heart';
                heart.style.color = ['#C76F85','#E5A4B3','#BDA8D2','#FF9FB3'][Math.floor(Math.random()*4)];
                heart.style.left = (Math.random()*44)+'px'; heart.style.bottom = '62px';
                if (container) {
                    container.appendChild(heart);
                    setTimeout(function(){ heart.remove(); }, 1300);
                }
            }, 800);
        } else {
            audio.pause(); musicPlaying = false;
            icon.className = 'fas fa-play'; icon.style.marginLeft = '3px';
            document.getElementById('play-music-text').textContent = '♡ Play Music ♡';
            btn.classList.remove('playing');
            label.style.opacity = '0'; label.style.transform = 'translateY(5px)';
            if (heartInterval) { clearInterval(heartInterval); heartInterval = null; }
        }
    }

window.checkPassword = checkPassword;
window.togglePwVisibility = togglePwVisibility;
window.toggleMusic = toggleMusic;

window.addEventListener('beforeinstallprompt', function(event) {
    event.preventDefault();
    deferredInstallPrompt = event;
    var installButton = document.getElementById('install-app-btn');
    if (installButton && !isStandaloneApp()) {
        installButton.classList.add('is-visible');
    }
});

document.addEventListener('DOMContentLoaded', function() {
        var installButton = document.getElementById('install-app-btn');
        var iosTip = document.getElementById('ios-install-tip');
        var iosClose = document.getElementById('ios-install-close');
        var musicBtn = document.getElementById('music-btn');

        if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
            navigator.serviceWorker.register('./service-worker.js').catch(function(error) {
                console.warn('Service worker registration failed:', error);
            });
        }

        if (installButton && isIosDevice() && !isStandaloneApp()) {
            installButton.classList.add('is-visible');
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

        if (musicBtn) {
            musicBtn.addEventListener('mouseenter', function() {
                if (!musicPlaying) {
                    var l = document.getElementById('music-label');
                    if (l) { l.style.opacity = '1'; l.style.transform = 'translateY(0)'; }
                }
            });
            musicBtn.addEventListener('mouseleave', function() {
                if (!musicPlaying) {
                    var l = document.getElementById('music-label');
                    if (l) { l.style.opacity = '0'; l.style.transform = 'translateY(5px)'; }
                }
            });
        }

        var cards = document.querySelectorAll('.album-card');
        cards.forEach(function(card, i) {
            setTimeout(function() { card.classList.add('animate'); }, 600 + i * 200);
        });

        var note = document.getElementById('specialNote');
        if (!note) { return; }
        note.style.transform = 'translateY(30px)';
        function checkNote() {
            var rect = note.getBoundingClientRect();
            if (rect.top <= window.innerHeight && rect.bottom >= 0 && note.style.opacity !== '1') {
                note.style.transition = 'opacity 1s ease, transform 1s ease';
                note.style.opacity = '1';
                note.style.transform = 'translateY(0)';
            }
        }
        checkNote();
        window.addEventListener('scroll', checkNote);
    });

