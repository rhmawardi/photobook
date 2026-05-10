(function() {
    var albumKey = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
    var supportedAlbums = ['makassar', 'manado', 'tomohon'];
    if (supportedAlbums.indexOf(albumKey) === -1) {
        return;
    }

    var STORAGE_KEY = 'photobook.staticAlbumEdits.v1.' + albumKey;
    var activeCard = null;
    var activeIndex = null;

    function getEdits() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch (error) {
            console.warn('Album edits could not be loaded:', error);
            return {};
        }
    }

    function saveEdits(edits) {
        if (window.PhotoBookCloud) {
            window.PhotoBookCloud.saveJson(STORAGE_KEY, edits);
            return;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
    }

    function uploadCloudImage(src, prefix) {
        if (!window.PhotoBookCloud || !window.PhotoBookCloud.isConfigured()) {
            return Promise.reject(new Error('GitHub Sync belum aktif. Isi token dan repo di cloud-config.js atau tombol GitHub Sync.'));
        }
        return window.PhotoBookCloud.uploadDataUrl(src, prefix).then(function(uploadedSrc) {
            if (!uploadedSrc || uploadedSrc.indexOf('data:') === 0) {
                throw new Error('Upload ke GitHub gagal. Foto lama tetap dipakai.');
            }
            return uploadedSrc;
        });
    }

    function getCardParts(card) {
        return {
            img: card.querySelector('.polaroid img'),
            title: card.querySelector('h3'),
            caption: card.querySelector('p.text-gray-700') || card.querySelector('.mt-4 p')
        };
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
                    resolve(canvas.toDataURL('image/jpeg', 0.84));
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function showToast(message) {
        var toast = document.getElementById('static-editor-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'static-editor-toast';
            toast.className = 'static-editor-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('is-visible');
        clearTimeout(showToast.timer);
        showToast.timer = setTimeout(function() {
            toast.classList.remove('is-visible');
        }, 1800);
    }

    function getCardWrapper(card) {
        return card.closest('.photo-container') || card;
    }

    function markEdited(card, edit) {
        card.classList.toggle('static-photo-card-edited', Boolean(edit && !edit.deleted && (edit.src || edit.title !== undefined || edit.caption !== undefined)));
    }

    function applyEdit(card, index) {
        var edits = getEdits();
        var edit = edits[index];
        var parts = getCardParts(card);
        if (parts.img && !parts.img.dataset.originalSrc) {
            parts.img.dataset.originalSrc = parts.img.getAttribute('src') || '';
        }
        if (parts.title && !parts.title.dataset.originalText) {
            parts.title.dataset.originalText = parts.title.textContent || '';
        }
        if (parts.caption && !parts.caption.dataset.originalText) {
            parts.caption.dataset.originalText = parts.caption.textContent || '';
        }

        getCardWrapper(card).style.display = edit && edit.deleted ? 'none' : '';

        if (edit && !edit.deleted) {
            if (edit.src && parts.img) {
                parts.img.src = edit.src;
            }
            if (edit.title !== undefined && parts.title) {
                parts.title.textContent = edit.title;
            }
            if (edit.caption !== undefined && parts.caption) {
                parts.caption.textContent = edit.caption;
            }
        }
        markEdited(card, edit);
    }

    function ensureModal() {
        if (document.getElementById('static-caption-modal')) {
            return;
        }
        document.body.insertAdjacentHTML('beforeend', [
            '<div id="static-caption-modal" class="static-caption-modal" aria-hidden="true">',
            '  <div class="static-caption-dialog" role="dialog" aria-modal="true" aria-labelledby="static-caption-title">',
            '    <div class="static-caption-head">',
            '      <div><h2 id="static-caption-title">Edit Caption</h2><p>Ubah judul kecil dan caption foto.</p></div>',
            '      <button type="button" class="static-caption-close" data-static-close><i class="fas fa-times"></i></button>',
            '    </div>',
            '    <form id="static-caption-form" class="static-caption-body">',
            '      <div class="static-caption-field"><label for="static-caption-heading">Judul Foto</label><input id="static-caption-heading" type="text" maxlength="80"></div>',
            '      <div class="static-caption-field"><label for="static-caption-text">Caption Foto</label><textarea id="static-caption-text" maxlength="220"></textarea></div>',
            '      <div class="static-caption-actions"><button type="button" class="static-caption-cancel" data-static-close>Batal</button><button type="submit" class="static-caption-save"><i class="fas fa-save"></i> Simpan Caption</button></div>',
            '    </form>',
            '  </div>',
            '</div>'
        ].join(''));
    }

    function openCaptionEditor(card, index) {
        ensureModal();
        activeCard = card;
        activeIndex = String(index);
        var edits = getEdits();
        var edit = edits[activeIndex] || {};
        var parts = getCardParts(card);
        document.getElementById('static-caption-heading').value = edit.title !== undefined ? edit.title : (parts.title ? parts.title.textContent : '');
        document.getElementById('static-caption-text').value = edit.caption !== undefined ? edit.caption : (parts.caption ? parts.caption.textContent : '');
        var modal = document.getElementById('static-caption-modal');
        modal.classList.add('is-visible');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeCaptionEditor() {
        var modal = document.getElementById('static-caption-modal');
        if (!modal) { return; }
        modal.classList.remove('is-visible');
        modal.setAttribute('aria-hidden', 'true');
        if (!document.querySelector('.popup-overlay.active')) {
            document.body.style.overflow = '';
        }
    }

    function resetPhoto(card, index) {
        var edits = getEdits();
        delete edits[String(index)];
        saveEdits(edits);
        var parts = getCardParts(card);
        if (parts.img && parts.img.dataset.originalSrc) {
            parts.img.src = parts.img.dataset.originalSrc;
        }
        if (parts.title) {
            parts.title.textContent = parts.title.dataset.originalText || '';
        }
        if (parts.caption) {
            parts.caption.textContent = parts.caption.dataset.originalText || '';
        }
        markEdited(card, null);
        showToast('Foto dikembalikan ke versi awal');
    }

    function deletePhoto(card, index) {
        var edits = getEdits();
        edits[String(index)] = edits[String(index)] || {};
        edits[String(index)].deleted = true;
        saveEdits(edits);
        getCardWrapper(card).style.display = 'none';
        showToast('Foto berhasil dihapus');
    }

    function enhanceCard(card, index) {
        if (card.dataset.staticEditorReady === 'true') {
            return;
        }
        card.dataset.staticEditorReady = 'true';
        card.dataset.staticPhotoIndex = String(index);
        card.style.position = card.style.position || 'relative';
        applyEdit(card, String(index));

        var actions = document.createElement('div');
        actions.className = 'static-photo-editor-actions';
        actions.innerHTML = [
            '<button type="button" class="static-photo-menu-trigger" data-static-menu-toggle aria-label="Menu foto"><i class="fas fa-ellipsis-vertical"></i></button>',
            '<div class="static-photo-menu" data-static-menu>',
            '  <label class="static-photo-upload-label"><i class="fas fa-image"></i><span>Ganti Foto</span><input type="file" accept="image/*" data-static-upload></label>',
            '  <button type="button" class="static-photo-edit-btn" data-static-edit-caption><i class="fas fa-pen"></i><span>Edit Caption</span></button>',
            '  <button type="button" class="static-photo-edit-btn secondary" data-static-reset><i class="fas fa-rotate-left"></i><span>Reset</span></button>',
            '  <button type="button" class="static-photo-edit-btn danger" data-static-delete><i class="fas fa-trash"></i><span>Hapus</span></button>',
            '</div>'
        ].join('');
        card.appendChild(actions);
    }

    function bindEvents() {
        document.addEventListener('click', function(event) {
            var menuToggle = event.target.closest('[data-static-menu-toggle]');
            if (menuToggle) {
                event.preventDefault();
                event.stopPropagation();
                var currentMenu = menuToggle.closest('.static-photo-editor-actions').querySelector('[data-static-menu]');
                document.querySelectorAll('.static-photo-menu.is-open').forEach(function(menu) {
                    if (menu !== currentMenu) {
                        menu.classList.remove('is-open');
                    }
                });
                currentMenu.classList.toggle('is-open');
                return;
            }

            var actionButton = event.target.closest('[data-static-edit-caption], [data-static-reset], [data-static-delete]');
            if (actionButton) {
                var actionMenu = actionButton.closest('[data-static-menu]');
                if (actionMenu) {
                    actionMenu.classList.remove('is-open');
                }
            }

            if (!event.target.closest('.static-photo-editor-actions')) {
                document.querySelectorAll('.static-photo-menu.is-open').forEach(function(menu) {
                    menu.classList.remove('is-open');
                });
            }

            var editButton = event.target.closest('[data-static-edit-caption]');
            if (editButton) {
                event.preventDefault();
                event.stopPropagation();
                var card = editButton.closest('.photo-card');
                openCaptionEditor(card, card.dataset.staticPhotoIndex);
                return;
            }

            var resetButton = event.target.closest('[data-static-reset]');
            if (resetButton) {
                event.preventDefault();
                event.stopPropagation();
                var resetCard = resetButton.closest('.photo-card');
                if (confirm('Kembalikan foto dan caption ini ke versi awal?')) {
                    resetPhoto(resetCard, resetCard.dataset.staticPhotoIndex);
                }
                return;
            }

            var deleteButton = event.target.closest('[data-static-delete]');
            if (deleteButton) {
                event.preventDefault();
                event.stopPropagation();
                var deleteCard = deleteButton.closest('.photo-card');
                if (confirm('Hapus foto ini dari album?')) {
                    deletePhoto(deleteCard, deleteCard.dataset.staticPhotoIndex);
                }
                return;
            }

            if (event.target.closest('[data-static-close]')) {
                event.preventDefault();
                closeCaptionEditor();
            }
        }, true);

        document.addEventListener('change', function(event) {
            if (!event.target.matches('[data-static-upload]')) {
                return;
            }
            var uploadMenu = event.target.closest('[data-static-menu]');
            if (uploadMenu) {
                uploadMenu.classList.remove('is-open');
            }
            event.stopPropagation();
            var input = event.target;
            var file = input.files && input.files[0];
            var card = input.closest('.photo-card');
            if (!file || !card) { return; }
            var index = card.dataset.staticPhotoIndex;
            compressImage(file).then(function(src) {
                return uploadCloudImage(src, 'static-albums/' + albumKey + '/' + index);
            }).then(function(src) {
                var edits = getEdits();
                edits[index] = edits[index] || {};
                edits[index].src = src;
                saveEdits(edits);
                var parts = getCardParts(card);
                if (parts.img) {
                    parts.img.src = src;
                }
                markEdited(card, edits[index]);
                input.value = '';
                showToast('Foto berhasil diupload ke GitHub');
            }).catch(function(error) {
                console.error(error);
                alert(error.message || 'Foto gagal diupload ke GitHub. Foto lama tetap dipakai.');
            });
        }, true);

        document.addEventListener('submit', function(event) {
            if (!event.target.matches('#static-caption-form')) {
                return;
            }
            event.preventDefault();
            if (!activeCard || activeIndex === null) { return; }
            var edits = getEdits();
            edits[activeIndex] = edits[activeIndex] || {};
            edits[activeIndex].title = document.getElementById('static-caption-heading').value.trim();
            edits[activeIndex].caption = document.getElementById('static-caption-text').value.trim();
            saveEdits(edits);
            var parts = getCardParts(activeCard);
            if (parts.title) {
                parts.title.textContent = edits[activeIndex].title;
            }
            if (parts.caption) {
                parts.caption.textContent = edits[activeIndex].caption;
            }
            markEdited(activeCard, edits[activeIndex]);
            closeCaptionEditor();
            showToast('Caption berhasil disimpan');
        });

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeCaptionEditor();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('.photo-card').forEach(function(card, index) {
            enhanceCard(card, index + 1);
        });
        if (window.PhotoBookCloud) {
            window.PhotoBookCloud.syncLocalWithCloud(STORAGE_KEY, {}, function() {
                document.querySelectorAll('.photo-card').forEach(function(card, index) {
                    applyEdit(card, String(index + 1));
                });
            });
        }
        ensureModal();
        bindEvents();
    });
})();





