(function() {
    var config = window.PHOTOBOOK_CLOUD_CONFIG || {};
    var SETTINGS_KEY = 'photobook.githubSettings.v1';
    var TOKEN_KEY = 'photobook.githubToken.v1';

    function isGithubMode() {
        return Boolean(config.enabled && config.provider === 'github');
    }

    function readSettings() {
        var saved = {};
        try {
            saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        } catch (error) {
            saved = {};
        }
        var inferred = inferGithubPagesRepo();
        return {
            owner: saved.owner || config.githubOwner || inferred.owner || '',
            repo: saved.repo || config.githubRepo || inferred.repo || '',
            branch: saved.branch || config.githubBranch || 'main',
            dataPath: saved.dataPath || config.githubDataPath || 'data',
            uploadsPath: saved.uploadsPath || config.githubUploadsPath || 'uploads'
        };
    }

    function saveSettings(settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    function getToken() {
        return config.githubPublicToken || localStorage.getItem(TOKEN_KEY) || '';
    }

    function setToken(token) {
        localStorage.setItem(TOKEN_KEY, token.trim());
    }

    function inferGithubPagesRepo() {
        var host = location.hostname;
        var parts = location.pathname.split('/').filter(Boolean);
        if (!host.endsWith('.github.io')) {
            return {};
        }
        var owner = host.replace('.github.io', '');
        var repo = parts[0] || (owner + '.github.io');
        return { owner: owner, repo: repo };
    }

    function isConfigured() {
        if (!isGithubMode()) {
            return false;
        }
        var settings = readSettings();
        return Boolean(getToken() && settings.owner && settings.repo && settings.branch);
    }

    function localRead(key, fallback) {
        try {
            return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
        } catch (error) {
            console.warn('Local data read failed:', error);
            return fallback;
        }
    }

    function localWrite(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function safeKey(key) {
        return String(key).replace(/[^a-zA-Z0-9._-]/g, '_');
    }

    function cleanPath(value) {
        return String(value || '').replace(/^\/+|\/+$/g, '');
    }

    function keyToGithubPath(key) {
        var settings = readSettings();
        return cleanPath(settings.dataPath) + '/' + safeKey(key) + '.json';
    }

    function dataUrlToBase64(dataUrl) {
        return dataUrl.split(',')[1] || '';
    }

    function utf8ToBase64(value) {
        return btoa(unescape(encodeURIComponent(value)));
    }

    function base64ToUtf8(value) {
        return decodeURIComponent(escape(atob(value.replace(/\s/g, ''))));
    }

    function githubHeaders() {
        return {
            Authorization: 'Bearer ' + getToken(),
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        };
    }

    function githubApiUrl(path) {
        var settings = readSettings();
        return 'https://api.github.com/repos/' + encodeURIComponent(settings.owner) + '/' + encodeURIComponent(settings.repo) + '/contents/' + path.split('/').map(encodeURIComponent).join('/');
    }

    async function getGithubFile(path) {
        var settings = readSettings();
        var response = await fetch(githubApiUrl(path) + '?ref=' + encodeURIComponent(settings.branch), {
            headers: githubHeaders()
        });
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            throw new Error('GitHub read failed: ' + response.status + ' ' + await response.text());
        }
        return response.json();
    }

    async function putGithubFile(path, contentBase64, message) {
        var settings = readSettings();
        var existing = await getGithubFile(path);
        var body = {
            message: message,
            content: contentBase64,
            branch: settings.branch
        };
        if (existing && existing.sha) {
            body.sha = existing.sha;
        }
        var response = await fetch(githubApiUrl(path), {
            method: 'PUT',
            headers: Object.assign({ 'Content-Type': 'application/json' }, githubHeaders()),
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            throw new Error('GitHub save failed: ' + response.status + ' ' + await response.text());
        }
        return response.json();
    }

    async function githubLoadJson(key, fallback) {
        var file = await getGithubFile(keyToGithubPath(key));
        if (!file || !file.content) {
            await githubSaveJson(key, localRead(key, fallback));
            return localRead(key, fallback);
        }
        var data = JSON.parse(base64ToUtf8(file.content));
        localWrite(key, data);
        return data;
    }

    async function githubSaveJson(key, data) {
        localWrite(key, data);
        await putGithubFile(
            keyToGithubPath(key),
            utf8ToBase64(JSON.stringify(data, null, 2)),
            'Update photobook data: ' + safeKey(key)
        );
        return data;
    }

    async function loadJson(key, fallback) {
        if (!isConfigured()) {
            return localRead(key, fallback);
        }
        try {
            return await githubLoadJson(key, fallback);
        } catch (error) {
            console.warn('GitHub load failed, using local data:', error);
            showStatus('GitHub load gagal, memakai data lokal');
            return localRead(key, fallback);
        }
    }

    async function saveJson(key, data) {
        localWrite(key, data);
        if (!isConfigured()) {
            showSetupButton();
            return data;
        }
        try {
            await githubSaveJson(key, data);
            showStatus('Data tersimpan ke GitHub');
        } catch (error) {
            console.warn('GitHub save failed, data kept locally:', error);
            showStatus('GitHub save gagal, data tetap disimpan lokal');
        }
        return data;
    }

    async function syncLocalWithCloud(key, fallback, onData) {
        var data = await loadJson(key, fallback);
        localWrite(key, data);
        if (typeof onData === 'function') {
            onData(data);
        }
        return data;
    }

    async function uploadDataUrl(dataUrl, pathPrefix) {
        if (!isConfigured() || !dataUrl || dataUrl.indexOf('data:') !== 0) {
            showSetupButton();
            return dataUrl;
        }
        var settings = readSettings();
        var basePath = cleanPath(settings.uploadsPath);
        var safePrefix = cleanPath(pathPrefix || 'photo').replace(/[^a-zA-Z0-9/_-]/g, '-');
        var path = basePath + '/' + safePrefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
        try {
            var result = await putGithubFile(path, dataUrlToBase64(dataUrl), 'Upload photobook photo');
            showStatus('Foto tersimpan ke GitHub');
            return (result.content && result.content.download_url) || rawGithubUrl(path);
        } catch (error) {
            console.warn('GitHub image upload failed, using local image data:', error);
            showStatus('Upload GitHub gagal, foto tersimpan lokal');
            return dataUrl;
        }
    }

    function rawGithubUrl(path) {
        var settings = readSettings();
        return 'https://raw.githubusercontent.com/' + encodeURIComponent(settings.owner) + '/' + encodeURIComponent(settings.repo) + '/' + encodeURIComponent(settings.branch) + '/' + path.split('/').map(encodeURIComponent).join('/');
    }

    function ensureUi() {
        if (!isGithubMode() || config.showGithubSyncButton === false || document.getElementById('github-sync-button')) {
            return;
        }
        var style = document.createElement('style');
        style.textContent = '#github-sync-button{position:fixed;left:24px;bottom:86px;z-index:9998;display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border:0;border-radius:999px;color:#57606a;background:rgba(255,255,255,.88);box-shadow:0 6px 18px rgba(36,41,47,.14);font-size:20px;cursor:pointer;opacity:.72;transition:opacity .2s,transform .2s,box-shadow .2s}#github-sync-button:hover{opacity:1;transform:translateY(-2px);box-shadow:0 10px 24px rgba(36,41,47,.2)}#github-sync-button span{display:none}#github-sync-modal{position:fixed;inset:0;z-index:100004;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(24,27,31,.45);backdrop-filter:blur(8px)}#github-sync-modal.is-visible{display:flex}.github-sync-card{width:min(480px,100%);border-radius:20px;background:#fff;padding:24px;box-shadow:0 24px 80px rgba(24,27,31,.32);font-family:Quicksand,sans-serif}.github-sync-card h2{margin:0 0 8px;color:#24292f;font-family:Pacifico,cursive;font-size:26px}.github-sync-card p{margin:0 0 16px;color:#57606a;font-weight:700;line-height:1.5}.github-sync-card label{display:block;margin:12px 0 6px;color:#24292f;font-size:13px;font-weight:900}.github-sync-card input{width:100%;border:1.5px solid #d0d7de;border-radius:12px;padding:11px 12px;font-family:Quicksand,sans-serif;font-weight:700}.github-sync-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:18px}.github-sync-actions button{min-height:40px;border:0;border-radius:999px;padding:9px 15px;font-weight:900;cursor:pointer}.github-sync-save{color:#fff;background:#24292f}.github-sync-cancel{color:#24292f;background:#f6f8fa}.github-sync-status{position:fixed;left:50%;bottom:24px;z-index:100005;transform:translate(-50%,20px);opacity:0;padding:10px 14px;border-radius:999px;color:#fff;background:#24292f;font-family:Quicksand,sans-serif;font-size:13px;font-weight:900;transition:.2s;pointer-events:none}.github-sync-status.is-visible{opacity:1;transform:translate(-50%,0)}@media(max-width:640px){#github-sync-button{left:14px;bottom:72px}.github-sync-actions button{width:100%}}';
        document.head.appendChild(style);
        var settings = readSettings();
        document.body.insertAdjacentHTML('beforeend', [
            '<button id="github-sync-button" type="button" aria-label="GitHub Sync" title="GitHub Sync"><i class="fab fa-github"></i><span>GitHub Sync</span></button>',
            '<div id="github-sync-modal" aria-hidden="true">',
            '  <div class="github-sync-card" role="dialog" aria-modal="true" aria-labelledby="github-sync-title">',
            '    <h2 id="github-sync-title">GitHub Sync</h2>',
            '    <p>Jika token publik belum diisi di cloud-config.js, masukkan token GitHub di sini. Token publik membuat semua pengunjung bisa upload/edit.</p>',
            '    <label for="github-owner-input">Owner / Username</label><input id="github-owner-input" value="' + escapeHtml(settings.owner) + '" placeholder="username GitHub">',
            '    <label for="github-repo-input">Repository</label><input id="github-repo-input" value="' + escapeHtml(settings.repo) + '" placeholder="nama repo">',
            '    <label for="github-branch-input">Branch</label><input id="github-branch-input" value="' + escapeHtml(settings.branch) + '" placeholder="main">',
            '    <label for="github-token-input">Fine-grained token</label><input id="github-token-input" type="password" value="' + escapeHtml(localStorage.getItem(TOKEN_KEY) || '') + '" placeholder="github_pat_...">',
            '    <div class="github-sync-actions"><button class="github-sync-cancel" type="button" data-github-close>Batal</button><button class="github-sync-save" type="button" id="github-sync-save">Simpan</button></div>',
            '  </div>',
            '</div>',
            '<div id="github-sync-status" class="github-sync-status"></div>'
        ].join(''));
        document.getElementById('github-sync-button').addEventListener('click', openSettings);
        document.getElementById('github-sync-save').addEventListener('click', saveSettingsFromUi);
        document.querySelectorAll('[data-github-close]').forEach(function(button) {
            button.addEventListener('click', closeSettings);
        });
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>'"]/g, function(char) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
        });
    }

    function openSettings() {
        var modal = document.getElementById('github-sync-modal');
        if (modal) {
            modal.classList.add('is-visible');
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    function closeSettings() {
        var modal = document.getElementById('github-sync-modal');
        if (modal) {
            modal.classList.remove('is-visible');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    function saveSettingsFromUi() {
        var settings = readSettings();
        settings.owner = document.getElementById('github-owner-input').value.trim();
        settings.repo = document.getElementById('github-repo-input').value.trim();
        settings.branch = document.getElementById('github-branch-input').value.trim() || 'main';
        saveSettings(settings);
        setToken(document.getElementById('github-token-input').value);
        closeSettings();
        showStatus(isConfigured() ? 'GitHub Sync aktif' : 'Lengkapi data GitHub Sync');
    }

    function showSetupButton() {
        if (!isGithubMode()) {
            return;
        }
        ensureUi();
    }

    function showStatus(message) {
        ensureUi();
        var status = document.getElementById('github-sync-status');
        if (!status) { return; }
        status.textContent = message;
        status.classList.add('is-visible');
        clearTimeout(showStatus.timer);
        showStatus.timer = setTimeout(function() {
            status.classList.remove('is-visible');
        }, 2200);
    }

    document.addEventListener('DOMContentLoaded', function() {
        if (isGithubMode()) {
            ensureUi();
        }
    });

    window.PhotoBookCloud = {
        isConfigured: isConfigured,
        localRead: localRead,
        localWrite: localWrite,
        loadJson: loadJson,
        saveJson: saveJson,
        syncLocalWithCloud: syncLocalWithCloud,
        uploadDataUrl: uploadDataUrl
    };
})();


