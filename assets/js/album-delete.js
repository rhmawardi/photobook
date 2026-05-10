(function() {
    var STORAGE_KEY = 'photobook.deletedAlbums.v1';
    var staticAlbums = [
        { id: 'albumMakassar', name: 'Makassar' },
        { id: 'albumManado', name: 'Manado' },
        { id: 'albumTomohon', name: 'Tomohon' }
    ];

    function readDeleted() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch (error) {
            return [];
        }
    }

    function saveDeleted(deleted) {
        if (window.PhotoBookCloud) {
            window.PhotoBookCloud.saveJson(STORAGE_KEY, deleted);
            return;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deleted));
    }

    function applyDeleted() {
        var deleted = readDeleted();
        staticAlbums.forEach(function(album) {
            var card = document.getElementById(album.id);
            if (card) {
                card.style.display = deleted.indexOf(album.id) === -1 ? '' : 'none';
            }
        });
    }

    function addButtons() {
        staticAlbums.forEach(function(album) {
            var card = document.getElementById(album.id);
            if (!card || card.querySelector('[data-delete-static-album]')) {
                return;
            }
            var inner = card.querySelector('.album-card-inner') || card;
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'album-delete-action';
            button.dataset.deleteStaticAlbum = album.id;
            button.setAttribute('aria-label', 'Hapus album ' + album.name);
            button.innerHTML = '<i class="fas fa-trash"></i>';
            inner.appendChild(button);
        });
    }

    function bindEvents() {
        document.addEventListener('click', function(event) {
            var button = event.target.closest('[data-delete-static-album]');
            if (!button) { return; }
            event.preventDefault();
            event.stopPropagation();
            var albumId = button.dataset.deleteStaticAlbum;
            var album = staticAlbums.find(function(item) { return item.id === albumId; });
            if (!confirm('Hapus album ' + (album ? album.name : 'ini') + ' dari halaman utama?')) {
                return;
            }
            var deleted = readDeleted();
            if (deleted.indexOf(albumId) === -1) {
                deleted.push(albumId);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(deleted));
            saveDeleted(deleted);
            applyDeleted();
        }, true);
    }

    document.addEventListener('DOMContentLoaded', function() {
        addButtons();
        applyDeleted();
        bindEvents();
        if (window.PhotoBookCloud) {
            window.PhotoBookCloud.syncLocalWithCloud(STORAGE_KEY, [], function() {
                applyDeleted();
            });
        }
    });
})();
