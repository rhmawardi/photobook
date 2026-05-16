(function() {
    var STORAGE_KEY = 'photobook.adminMode.v1';

    function isAdmin() {
        return localStorage.getItem(STORAGE_KEY) === 'true';
    }

    function password() {
        return (window.PHOTOBOOK_CLOUD_CONFIG && window.PHOTOBOOK_CLOUD_CONFIG.adminPassword) || 'rizkyfaikah26';
    }

    function applyMode() {
        document.body.classList.toggle('admin-mode', isAdmin());
        var button = document.getElementById('admin-mode-button');
        if (button) {
            button.setAttribute('aria-label', isAdmin() ? 'Admin aktif' : 'Login admin');
            button.setAttribute('title', isAdmin() ? 'Admin aktif' : 'Login admin');
            button.innerHTML = isAdmin() ? '<i class="fas fa-unlock"></i>' : '<i class="fas fa-lock"></i>';
        }
        window.dispatchEvent(new CustomEvent('photobook:admin-mode-change', { detail: { isAdmin: isAdmin() } }));
    }

    function ensureUi() {
        if (document.getElementById('admin-mode-button')) {
            return;
        }
        document.body.insertAdjacentHTML('beforeend', [
            '<button id="admin-mode-button" type="button" aria-label="Login admin" title="Login admin"><i class="fas fa-lock"></i></button>',
            '<div id="admin-mode-modal" aria-hidden="true">',
            '  <div class="admin-mode-card" role="dialog" aria-modal="true" aria-labelledby="admin-mode-title">',
            '    <h2 id="admin-mode-title">Admin Mode</h2>',
            '    <p>Login admin untuk upload, edit, hapus, dan ganti cover album.</p>',
            '    <label for="admin-password-input">Password Admin</label>',
            '    <input id="admin-password-input" type="password" autocomplete="current-password" placeholder="Password...">',
            '    <div id="admin-mode-error" class="admin-mode-error">Password admin salah.</div>',
            '    <div class="admin-mode-actions">',
            '      <button type="button" class="admin-mode-logout" id="admin-mode-logout">Logout</button>',
            '      <button type="button" class="admin-mode-cancel" data-admin-close>Batal</button>',
            '      <button type="button" class="admin-mode-save" id="admin-mode-login">Login</button>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join(''));
    }

    function openModal() {
        var modal = document.getElementById('admin-mode-modal');
        var input = document.getElementById('admin-password-input');
        var error = document.getElementById('admin-mode-error');
        if (!modal) { return; }
        if (error) { error.classList.remove('is-visible'); }
        if (input) { input.value = ''; }
        modal.classList.add('is-visible');
        modal.setAttribute('aria-hidden', 'false');
        setTimeout(function() { if (input) { input.focus(); } }, 50);
    }

    function closeModal() {
        var modal = document.getElementById('admin-mode-modal');
        if (!modal) { return; }
        modal.classList.remove('is-visible');
        modal.setAttribute('aria-hidden', 'true');
    }

    function login() {
        var input = document.getElementById('admin-password-input');
        var error = document.getElementById('admin-mode-error');
        if (input && input.value === password()) {
            localStorage.setItem(STORAGE_KEY, 'true');
            closeModal();
            applyMode();
            return;
        }
        if (error) { error.classList.add('is-visible'); }
    }

    function logout() {
        localStorage.removeItem(STORAGE_KEY);
        closeModal();
        applyMode();
    }

    document.addEventListener('DOMContentLoaded', function() {
        ensureUi();
        applyMode();
        document.getElementById('admin-mode-button').addEventListener('click', openModal);
        document.getElementById('admin-mode-login').addEventListener('click', login);
        document.getElementById('admin-mode-logout').addEventListener('click', logout);
        document.querySelectorAll('[data-admin-close]').forEach(function(button) {
            button.addEventListener('click', closeModal);
        });
        document.getElementById('admin-password-input').addEventListener('keydown', function(event) {
            if (event.key === 'Enter') { login(); }
        });
    });

    window.PhotoBookAdmin = {
        isAdmin: isAdmin,
        applyMode: applyMode
    };
})();
