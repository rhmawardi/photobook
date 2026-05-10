(function() {
    var STORAGE_KEY = 'photobook.customAlbums.v1';
    var pendingPhotos = [];
    var activeAlbumId = null;

    function $(selector, root) {
        return (root || document).querySelector(selector);
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>'"]/g, function(char) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[char];
        });
    }

    function createId(prefix) {
        return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    }

    function getAlbums() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch (error) {
            console.warn('Custom albums could not be loaded:', error);
            return [];
        }
    }

    function saveAlbums(albums) {
        if (window.PhotoBookCloud) {
            window.PhotoBookCloud.saveJson(STORAGE_KEY, albums);
            return;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
    }

    function uploadCloudImage(src, prefix) {
        if (!window.PhotoBookCloud) {
            return Promise.resolve(src);
        }
        return window.PhotoBookCloud.uploadDataUrl(src, prefix);
    }

    function formatDate(dateValue) {
        if (!dateValue) {
            return 'No date yet';
        }
        var date = new Date(dateValue + 'T00:00:00');
        if (Number.isNaN(date.getTime())) {
            return dateValue;
        }
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
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
                    var width = Math.max(1, Math.round(img.width * scale));
                    var height = Math.max(1, Math.round(img.height * scale));
                    var canvas = document.createElement('canvas');
                    var ctx = canvas.getContext('2d');
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.82));
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function buildShell() {
        var header = $('header');
        var albumsGrid = $('main .grid');
        if (!header || !albumsGrid) {
            return;
        }

        header.insertAdjacentHTML('beforeend', [
            '<div class="custom-album-toolbar">',
            '  <button id="create-album-open" class="create-album-btn" type="button"><i class="fas fa-plus"></i><span>Create New Album</span></button>',
            '  <p class="custom-album-hint">Upload foto sendiri, tulis caption, lalu edit kapan saja.</p>',
            '</div>'
        ].join(''));

        albumsGrid.insertAdjacentHTML('afterend', [
            '<section class="custom-albums-section" aria-labelledby="custom-albums-title">',
            '  <h2 id="custom-albums-title" class="custom-albums-title"><i class="fas fa-heart"></i> My Albums</h2>',
            '  <div id="custom-albums-empty" class="custom-album-empty">Belum ada album custom. Buat album baru dan upload foto favoritmu di sini.</div>',
            '  <div id="custom-albums-grid" class="grid grid-cols-1 md:grid-cols-2 gap-10"></div>',
            '</section>'
        ].join(''));

        document.body.insertAdjacentHTML('beforeend', [
            '<div id="create-album-modal" class="custom-album-modal" aria-hidden="true">',
            '  <div class="custom-album-dialog" role="dialog" aria-modal="true" aria-labelledby="create-album-title">',
            '    <div class="custom-album-modal-head">',
            '      <div><h2 id="create-album-title">Create New Album</h2><p>Buat album pribadi dan upload beberapa foto sekaligus.</p></div>',
            '      <button class="custom-album-close" type="button" data-close-modal><i class="fas fa-times"></i></button>',
            '    </div>',
            '    <div class="custom-album-modal-body">',
            '      <form id="create-album-form">',
            '        <div class="custom-album-form-grid">',
            '          <div class="custom-field"><label for="album-title-input">Nama Album</label><input id="album-title-input" type="text" maxlength="60" placeholder="Contoh: Anniversary Trip" required></div>',
            '          <div class="custom-field"><label for="album-date-input">Tanggal</label><input id="album-date-input" type="date"></div>',
            '          <div class="custom-field full-width"><label for="album-description-input">Deskripsi Album</label><textarea id="album-description-input" maxlength="180" placeholder="Tulis cerita singkat untuk album ini..."></textarea></div>',
            '          <div class="custom-field full-width"><label>Upload Foto</label><div class="custom-upload-zone"><input id="album-photo-input" type="file" accept="image/*" multiple><div class="custom-upload-content"><i class="fas fa-cloud-arrow-up-alt"></i><span>Pilih atau drop foto di sini</span><small>Foto dikompres agar ringan dan bisa tersimpan online.</small></div></div></div>',
            '        </div>',
            '        <div id="photo-preview-grid" class="custom-preview-grid"></div>',
            '        <p class="custom-storage-note">Catatan: jika cloud aktif, album tersimpan online. Jika belum, data disimpan di browser/perangkat ini.</p>',
            '        <div class="custom-modal-actions"><button class="album-action-btn secondary" type="button" data-close-modal>Batal</button><button class="album-action-btn" type="submit"><i class="fas fa-save"></i> Simpan Album</button></div>',
            '      </form>',
            '    </div>',
            '  </div>',
            '</div>',
            '<div id="album-gallery-modal" class="custom-album-modal" aria-hidden="true">',
            '  <div class="custom-album-dialog" role="dialog" aria-modal="true" aria-labelledby="gallery-album-title">',
            '    <div class="custom-album-modal-head">',
            '      <div><h2 id="gallery-album-title">Album</h2><p id="gallery-album-description"></p></div>',
            '      <button class="custom-album-close" type="button" data-close-gallery><i class="fas fa-times"></i></button>',
            '    </div>',
            '    <div class="custom-album-modal-body">',
            '      <div class="custom-gallery-actions">',
            '        <label class="album-action-btn secondary" for="gallery-photo-input"><i class="fas fa-plus"></i> Upload Foto</label>',
            '        <input id="gallery-photo-input" type="file" accept="image/*" multiple hidden>',
            '        <button id="edit-album-info" class="album-action-btn secondary" type="button"><i class="fas fa-pen"></i> Edit Album</button>',
            '        <button id="delete-album" class="album-action-btn danger" type="button"><i class="fas fa-trash"></i> Hapus Album</button>',
            '      </div>',
            '      <div id="custom-gallery-grid" class="custom-gallery-grid"></div>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join(''));
    }

    function openModal(id) {
        var modal = document.getElementById(id);
        if (!modal) { return; }
        modal.classList.add('is-visible');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(id) {
        var modal = document.getElementById(id);
        if (!modal) { return; }
        modal.classList.remove('is-visible');
        modal.setAttribute('aria-hidden', 'true');
        if (!$('.custom-album-modal.is-visible')) {
            document.body.style.overflow = '';
        }
    }

    function resetCreateForm() {
        var form = document.getElementById('create-album-form');
        if (form) { form.reset(); }
        pendingPhotos = [];
        renderPendingPhotos();
    }

    function renderPendingPhotos() {
        var grid = document.getElementById('photo-preview-grid');
        if (!grid) { return; }
        grid.innerHTML = pendingPhotos.map(function(photo, index) {
            return [
                '<article class="custom-preview-card">',
                '  <img src="' + photo.src + '" alt="Preview foto ' + (index + 1) + '">',
                '  <textarea data-preview-caption="' + index + '" placeholder="Tambahkan caption untuk foto ini...">' + escapeHtml(photo.caption) + '</textarea>',
                '  <div class="custom-photo-actions" style="padding:0 10px 12px;">',
                '    <button class="photo-action-btn danger" type="button" data-remove-preview="' + index + '"><i class="fas fa-trash"></i> Hapus</button>',
                '  </div>',
                '</article>'
            ].join('');
        }).join('');
    }

    function renderAlbums() {
        var albums = getAlbums();
        var grid = document.getElementById('custom-albums-grid');
        var empty = document.getElementById('custom-albums-empty');
        if (!grid || !empty) { return; }

        empty.classList.toggle('is-visible', albums.length === 0);
        grid.innerHTML = albums.map(function(album) {
            var photos = album.photos || [];
            var first = photos[0];
            var second = photos[1];
            var third = photos[2];
            var fourth = photos[3];
            var remaining = Math.max(0, photos.length - 4);
            var collage = photos.length ? [
                '<div class="album-collage">',
                '  <div class="collage-main"><img src="' + first.src + '" alt="' + escapeHtml(album.title) + ' 1" loading="lazy"></div>',
                '  <div class="collage-side">',
                '    <div class="collage-thumb"><img src="' + (second ? second.src : first.src) + '" alt="' + escapeHtml(album.title) + ' 2" loading="lazy"></div>',
                '    <div class="collage-thumb"><img src="' + (third ? third.src : first.src) + '" alt="' + escapeHtml(album.title) + ' 3" loading="lazy"></div>',
                '    <div class="collage-thumb"><img src="' + (fourth ? fourth.src : first.src) + '" alt="' + escapeHtml(album.title) + ' 4" loading="lazy">' + (remaining ? '<div class="collage-more">+' + remaining + '<span>more photos</span></div>' : '') + '</div>',
                '  </div>',
                '  <div class="collage-badge">📍 Custom</div>',
                '</div>'
            ].join('') : '<div class="album-collage"><div class="custom-collage-placeholder">Belum ada foto</div><div class="collage-badge">📍 Custom</div></div>';

            return [
                '<div class="album-card custom-album-card animate" data-custom-album-id="' + album.id + '">',
                '  <div class="album-card-inner bg-white rounded-2xl shadow-xl overflow-hidden">',
                collage,
                '    <div class="p-6">',
                '      <div class="flex items-center gap-3 mb-2"><span class="text-2xl">💌</span><h2 class="font-pacifico text-2xl text-dark-pink">' + escapeHtml(album.title) + '</h2></div>',
                '      <p class="text-gray-500 text-sm font-medium mb-1"><i class="fas fa-calendar-alt text-pastel-pink mr-1"></i> ' + escapeHtml(formatDate(album.date)) + '</p>',
                '      <p class="text-gray-600 font-medium mt-2 mb-5">' + escapeHtml(album.description || 'Album custom penuh kenangan.') + '</p>',
                '      <div class="custom-card-actions"><span class="text-sm text-pastel-purple font-semibold"><i class="fas fa-images mr-1"></i> ' + photos.length + ' Photos</span><div class="custom-card-buttons"><button type="button" class="open-album-btn" data-open-custom-album="' + album.id + '">Open Album <i class="fas fa-arrow-right"></i></button><button type="button" class="custom-album-delete-btn" data-delete-custom-album-card="' + album.id + '"><i class="fas fa-trash"></i></button></div></div>',
                '    </div>',
                '  </div>',
                '</div>'
            ].join('');
        }).join('');
    }

    function renderGallery(albumId) {
        var albums = getAlbums();
        var album = albums.find(function(item) { return item.id === albumId; });
        var grid = document.getElementById('custom-gallery-grid');
        if (!album || !grid) { return; }

        activeAlbumId = albumId;
        document.getElementById('gallery-album-title').textContent = album.title;
        document.getElementById('gallery-album-description').textContent = (formatDate(album.date) + ' • ' + (album.description || 'Edit caption dan tambah foto kapan saja.'));

        if (!album.photos.length) {
            grid.innerHTML = '<div class="custom-album-empty is-visible">Album ini belum punya foto. Upload foto pertama kamu.</div>';
            return;
        }

        grid.innerHTML = album.photos.map(function(photo) {
            var isEditing = photo.editing === true;
            return [
                '<article class="custom-photo-card" data-photo-id="' + photo.id + '">',
                '  <img src="' + photo.src + '" alt="' + escapeHtml(photo.caption || album.title) + '" loading="lazy">',
                '  <div class="custom-photo-card-body">',
                isEditing ? '    <textarea class="custom-caption-input" data-caption-editor="' + photo.id + '">' + escapeHtml(photo.caption) + '</textarea>' : '    <p class="custom-caption-text">' + escapeHtml(photo.caption || 'Belum ada caption.') + '</p>',
                '    <div class="custom-photo-actions">',
                isEditing ? '      <button class="photo-action-btn" type="button" data-save-caption="' + photo.id + '"><i class="fas fa-save"></i> Simpan</button>' : '      <button class="photo-action-btn" type="button" data-edit-caption="' + photo.id + '"><i class="fas fa-pen"></i> Edit Caption</button>',
                '      <button class="photo-action-btn danger" type="button" data-delete-photo="' + photo.id + '"><i class="fas fa-trash"></i> Hapus</button>',
                '    </div>',
                '  </div>',
                '</article>'
            ].join('');
        }).join('');
    }

    function updateAlbum(albumId, updater) {
        var albums = getAlbums();
        var index = albums.findIndex(function(album) { return album.id === albumId; });
        if (index === -1) { return; }
        updater(albums[index]);
        saveAlbums(albums);
        renderAlbums();
        renderGallery(albumId);
    }

    function handleFiles(files, callback) {
        var imageFiles = Array.from(files || []).filter(function(file) { return file.type.indexOf('image/') === 0; });
        if (!imageFiles.length) { return; }
        Promise.all(imageFiles.map(function(file) {
            var photoId = createId('photo');
            return compressImage(file).then(function(src) {
                return uploadCloudImage(src, 'custom-albums/' + photoId);
            }).then(function(src) {
                return { id: photoId, src: src, caption: '' };
            });
        })).then(callback).catch(function(error) {
            alert('Foto gagal diproses. Coba upload ulang dengan file gambar lain.');
            console.error(error);
        });
    }

    function bindEvents() {
        document.addEventListener('click', function(event) {
            var openCreate = event.target.closest('#create-album-open');
            if (openCreate) {
                resetCreateForm();
                openModal('create-album-modal');
                return;
            }

            if (event.target.closest('[data-close-modal]')) {
                closeModal('create-album-modal');
                return;
            }

            if (event.target.closest('[data-close-gallery]')) {
                closeModal('album-gallery-modal');
                return;
            }

            var removePreview = event.target.closest('[data-remove-preview]');
            if (removePreview) {
                pendingPhotos.splice(Number(removePreview.dataset.removePreview), 1);
                renderPendingPhotos();
                return;
            }

            var deleteCustomAlbumCard = event.target.closest('[data-delete-custom-album-card]');
            if (deleteCustomAlbumCard && confirm('Hapus album custom ini beserta semua fotonya?')) {
                saveAlbums(getAlbums().filter(function(album) { return album.id !== deleteCustomAlbumCard.dataset.deleteCustomAlbumCard; }));
                renderAlbums();
                return;
            }

            var openAlbum = event.target.closest('[data-open-custom-album]');
            if (openAlbum) {
                renderGallery(openAlbum.dataset.openCustomAlbum);
                openModal('album-gallery-modal');
                return;
            }

            var editCaption = event.target.closest('[data-edit-caption]');
            if (editCaption) {
                updateAlbum(activeAlbumId, function(album) {
                    album.photos.forEach(function(photo) { photo.editing = photo.id === editCaption.dataset.editCaption; });
                });
                return;
            }

            var saveCaption = event.target.closest('[data-save-caption]');
            if (saveCaption) {
                var editor = $('[data-caption-editor="' + saveCaption.dataset.saveCaption + '"]');
                updateAlbum(activeAlbumId, function(album) {
                    album.photos.forEach(function(photo) {
                        if (photo.id === saveCaption.dataset.saveCaption) {
                            photo.caption = editor ? editor.value.trim() : photo.caption;
                            delete photo.editing;
                        }
                    });
                });
                return;
            }

            var deletePhoto = event.target.closest('[data-delete-photo]');
            if (deletePhoto && confirm('Hapus foto ini dari album?')) {
                updateAlbum(activeAlbumId, function(album) {
                    album.photos = album.photos.filter(function(photo) { return photo.id !== deletePhoto.dataset.deletePhoto; });
                });
                return;
            }

            if (event.target.closest('#edit-album-info')) {
                var albums = getAlbums();
                var album = albums.find(function(item) { return item.id === activeAlbumId; });
                if (!album) { return; }
                var title = prompt('Nama album:', album.title);
                if (title === null || !title.trim()) { return; }
                var description = prompt('Deskripsi album:', album.description || '');
                if (description === null) { return; }
                updateAlbum(activeAlbumId, function(item) {
                    item.title = title.trim();
                    item.description = description.trim();
                    item.updatedAt = new Date().toISOString();
                });
                return;
            }

            if (event.target.closest('#delete-album') && confirm('Hapus album custom ini beserta semua fotonya?')) {
                saveAlbums(getAlbums().filter(function(album) { return album.id !== activeAlbumId; }));
                closeModal('album-gallery-modal');
                renderAlbums();
            }
        });

        document.addEventListener('input', function(event) {
            if (event.target.matches('[data-preview-caption]')) {
                var index = Number(event.target.dataset.previewCaption);
                if (pendingPhotos[index]) {
                    pendingPhotos[index].caption = event.target.value;
                }
            }
        });

        var fileInput = document.getElementById('album-photo-input');
        if (fileInput) {
            fileInput.addEventListener('change', function(event) {
                handleFiles(event.target.files, function(photos) {
                    pendingPhotos = pendingPhotos.concat(photos);
                    renderPendingPhotos();
                    fileInput.value = '';
                });
            });
        }

        var galleryInput = document.getElementById('gallery-photo-input');
        if (galleryInput) {
            galleryInput.addEventListener('change', function(event) {
                handleFiles(event.target.files, function(photos) {
                    updateAlbum(activeAlbumId, function(album) {
                        album.photos = album.photos.concat(photos);
                        album.updatedAt = new Date().toISOString();
                    });
                    galleryInput.value = '';
                });
            });
        }

        var form = document.getElementById('create-album-form');
        if (form) {
            form.addEventListener('submit', function(event) {
                event.preventDefault();
                var title = document.getElementById('album-title-input').value.trim();
                if (!title) { return; }

                var album = {
                    id: createId('album'),
                    title: title,
                    date: document.getElementById('album-date-input').value,
                    description: document.getElementById('album-description-input').value.trim(),
                    photos: pendingPhotos.map(function(photo) {
                        return { id: photo.id, src: photo.src, caption: photo.caption.trim() };
                    }),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                var albums = getAlbums();
                albums.unshift(album);
                try {
                    saveAlbums(albums);
                } catch (error) {
                    alert('Album terlalu besar untuk disimpan di browser. Coba kurangi jumlah foto atau ukuran foto.');
                    console.error(error);
                    return;
                }
                closeModal('create-album-modal');
                resetCreateForm();
                renderAlbums();
            });
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        buildShell();
        bindEvents();
        renderAlbums();
        if (window.PhotoBookCloud) {
            window.PhotoBookCloud.syncLocalWithCloud(STORAGE_KEY, [], function() {
                renderAlbums();
            });
        }
    });
})();



