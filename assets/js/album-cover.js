(function() {
    var STORAGE_KEY = 'photobook.albumCovers.v1';
    var albums = [
        { id: 'albumMakassar', name: 'Makassar' },
        { id: 'albumManado', name: 'Manado' },
        { id: 'albumTomohon', name: 'Tomohon' }
    ];

    function readCovers() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch (error) {
            return {};
        }
    }

    function saveCovers(covers) {
        if (window.PhotoBookCloud) {
            window.PhotoBookCloud.saveJson(STORAGE_KEY, covers);
            return;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(covers));
    }

    function compressImage(file) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onerror = reject;
            reader.onload = function(event) {
                var img = new Image();
                img.onerror = reject;
                img.onload = function() {
                    var maxSize = 1400;
                    var scale = Math.min(1, maxSize / Math.max(img.width, img.height));
                    var canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, Math.round(img.width * scale));
                    canvas.height = Math.max(1, Math.round(img.height * scale));
                    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.84));
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function uploadToLocal(src, prefix) {
        return fetch('upload-image.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: src, prefix: prefix })
        }).then(function(res) { return res.json(); }).then(function(data) {
            if (data.success && data.path) {
                return data.path;
            }
            return null;
        }).catch(function() {
            return null;
        });
    }

    function uploadCover(src, fileId) {
        // 1. Try local PHP upload first
        return uploadToLocal(src, 'cover-' + fileId).then(function(localPath) {
            if (localPath) { return localPath; }
            // 2. Try GitHub cloud upload
            if (window.PhotoBookCloud && window.PhotoBookCloud.isConfigured()) {
                return window.PhotoBookCloud.uploadDataUrl(src, 'album-covers/' + fileId);
            }
            // 3. Fallback: keep data URL
            return src;
        });
    }

    function applyCovers() {
        var covers = readCovers();
        document.querySelectorAll('.album-card').forEach(function(card) {
            var albumId = card.id || card.dataset.customAlbumId;
            if (!albumId) return;
            
            var albumCovers = covers[albumId];
            if (!albumCovers) return;

            // Backward compatibility
            if (typeof albumCovers === 'string') {
                albumCovers = { 0: albumCovers };
                covers[albumId] = albumCovers;
            }

            var images = card.querySelectorAll('.album-collage img');
            Object.keys(albumCovers).forEach(function(index) {
                var img = images[parseInt(index, 10)];
                if (img && albumCovers[index]) {
                    img.src = albumCovers[index];
                }
            });
        });
    }

    function addControls() {
        document.querySelectorAll('.album-card').forEach(function(card) {
            var albumId = card.id || card.dataset.customAlbumId;
            if (!albumId || card.querySelector('[data-album-cover-upload]')) {
                return;
            }
            // Find all image containers in the collage
            var containers = card.querySelectorAll('.collage-main, .collage-thumb');
            containers.forEach(function(container, index) {
                var label = document.createElement('label');
                label.className = 'album-cover-edit-btn';
                label.innerHTML = '<i class="fas fa-camera"></i><input type="file" accept="image/*" data-album-cover-upload="' + albumId + '" data-img-index="' + index + '">';
                container.appendChild(label);
            });
        });
    }

    function bindEvents() {
        document.addEventListener('change', function(event) {
            if (!event.target.matches('[data-album-cover-upload]')) {
                return;
            }
            var input = event.target;
            var file = input.files && input.files[0];
            var albumId = input.dataset.albumCoverUpload;
            var imgIndex = input.dataset.imgIndex;
            
            if (!file || !albumId || imgIndex === undefined) { return; }

            var label = input.parentElement;
            var originalHtml = label.innerHTML;
            label.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            compressImage(file).then(function(src) {
                return uploadCover(src, albumId + '_' + imgIndex);
            }).then(function(src) {
                var covers = readCovers();
                if (typeof covers[albumId] === 'string') {
                    covers[albumId] = { 0: covers[albumId] };
                }
                if (!covers[albumId]) {
                    covers[albumId] = {};
                }
                covers[albumId][imgIndex] = src;
                
                localStorage.setItem(STORAGE_KEY, JSON.stringify(covers));
                saveCovers(covers);
                
                label.innerHTML = originalHtml;
                applyCovers();
            }).catch(function(error) {
                console.error(error);
                alert('Gambar gagal diganti. Coba pilih gambar lain.');
                label.innerHTML = originalHtml;
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        addControls();
        applyCovers();
        bindEvents();
        if (window.PhotoBookCloud) {
            window.PhotoBookCloud.syncLocalWithCloud(STORAGE_KEY, {}, function() {
                applyCovers();
            });
        }
    });

    window.applyCovers = applyCovers;
    window.addControls = addControls;
})();
