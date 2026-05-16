(function() {
    var STORAGE_KEY = 'photobook.customAlbums.v1';

    function $(selector, root) {
        return (root || document).querySelector(selector);
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>'"]/g, function(char) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
        });
    }

    function createId(prefix) {
        return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    }

    function getAlbums() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch (error) {
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

    function buildShell() {
        var header = $('header');
        var albumsGrid = $('main .grid');
        if (!header || !albumsGrid) {
            return;
        }

        header.insertAdjacentHTML('beforeend', [
            '<div class="custom-album-toolbar">',
            '  <button id="create-album-open" class="create-album-btn" type="button"><i class="fas fa-plus"></i><span>Create New Album</span></button>',
            '</div>'
        ].join(''));

        // Custom albums will be appended directly into the main albums grid
        // No separate section needed
        albumsGrid.id = 'main-albums-grid';

        document.body.insertAdjacentHTML('beforeend', [
            '<div id="create-album-modal" class="custom-album-modal" aria-hidden="true">',
            '  <div class="custom-album-dialog" role="dialog" aria-modal="true" aria-labelledby="create-album-title">',
            '    <div class="custom-album-modal-head">',
            '      <div><h2 id="create-album-title">Create New Album</h2><p>Buat album baru. Halaman HTML akan otomatis terbuat.</p></div>',
            '      <button class="custom-album-close" type="button" data-close-modal><i class="fas fa-times"></i></button>',
            '    </div>',
            '    <div class="custom-album-modal-body" style="display:flex; flex-direction:column; gap:24px;">',
            '      <!-- Live Preview Card -->',
            '      <div style="max-width:320px; margin:0 auto; width:100%; transform:scale(0.9); transform-origin:top center;">',
            '        <h3 style="text-align:center; font-family:\'Quicksand\',sans-serif; font-size:14px; color:#999; margin-bottom:12px; font-weight:700;">Live Preview</h3>',
            '        <div class="album-card-inner bg-white rounded-2xl shadow-xl overflow-hidden relative">',
            '          <div id="preview-collage" class="album-collage">',
            '            <div class="collage-main"><img src="./images/placeholder.jpg" alt="Preview"></div>',
            '            <div class="collage-side">',
            '              <div class="collage-thumb"><img src="./images/placeholder.jpg"></div>',
            '              <div class="collage-thumb"><img src="./images/placeholder.jpg"></div>',
            '              <div class="collage-thumb" style="position:relative;"><img src="./images/placeholder.jpg"><div id="preview-more" class="collage-more">+16<span>more photos</span></div></div>',
            '            </div>',
            '            <div id="preview-badge" class="collage-badge">📍 Custom</div>',
            '          </div>',
            '          <div class="p-6">',
            '            <div class="flex items-center gap-3 mb-2"><span id="preview-emoji" class="text-2xl">💌</span><h2 id="preview-title" class="font-pacifico text-2xl text-dark-pink">Nama Album</h2></div>',
            '            <p class="text-gray-500 text-sm font-medium mb-1"><i class="fas fa-calendar-alt text-pastel-pink mr-1"></i> <span id="preview-date">Hari ini</span></p>',
            '            <p id="preview-desc" class="text-gray-600 font-medium mt-2 mb-5">Album penuh kenangan indah kita. 💕</p>',
            '          </div>',
            '        </div>',
            '      </div>',
            '      <form id="create-album-form">',
            '        <div class="custom-album-form-grid">',
            '          <div class="custom-field"><label for="album-title-input">Nama Album</label><input id="album-title-input" type="text" maxlength="60" placeholder="Contoh: Anniversary Trip" required></div>',
            '          <div class="custom-field"><label for="album-date-input">Tanggal</label><input id="album-date-input" type="date"></div>',
            '          <div class="custom-field"><label for="album-location-input">Lokasi</label><input id="album-location-input" type="text" maxlength="40" placeholder="Contoh: Bali, Jakarta, dll"></div>',
            '          <div class="custom-field"><label for="album-emoji-input">Emoji Icon</label><input id="album-emoji-input" type="text" maxlength="4" placeholder="🏝️" value="💌"></div>',
            '          <div class="custom-field"><label for="album-color-input">Warna Kartu</label><select id="album-color-input" style="width:100%; border:1.5px solid #E5A4B3; border-radius:12px; padding:10px 12px; font-family:\'Quicksand\',sans-serif; outline:none; background:white;"><option value="">Pink (Default)</option><option value="blue">Biru</option><option value="green">Hijau</option><option value="yellow">Kuning</option></select></div>',
            '          <div class="custom-field full-width"><label for="album-description-input">Deskripsi Album</label><textarea id="album-description-input" maxlength="180" placeholder="Tulis cerita singkat untuk album ini..."></textarea></div>',
            '        </div>',
            '        <p class="custom-storage-note">Catatan: Anda dapat mengupload foto setelah membuka halaman album baru.</p>',
            '        <div class="custom-modal-actions"><button class="album-action-btn secondary" type="button" data-close-modal>Batal</button><button class="album-action-btn" id="create-album-submit-btn" type="submit"><i class="fas fa-save"></i> Buat Album</button></div>',
            '      </form>',
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
        document.body.style.overflow = '';
    }

    function resetCreateForm() {
        var form = document.getElementById('create-album-form');
        if (form) { 
            form.reset(); 
            // Trigger input event to reset preview
            var evt = new Event('input');
            var changeEvt = new Event('change');
            document.getElementById('album-title-input').dispatchEvent(evt);
            var colorSelect = document.getElementById('album-color-input');
            if(colorSelect) colorSelect.dispatchEvent(changeEvt);
        }
    }

    function renderAlbums() {
        var albums = getAlbums();
        var grid = document.getElementById('main-albums-grid');
        if (!grid) { return; }

        // Remove previously rendered custom album cards
        var oldCards = grid.querySelectorAll('[data-custom-album-id]');
        for (var i = 0; i < oldCards.length; i++) {
            oldCards[i].remove();
        }

        // Append custom album cards into the main grid (matching static album layout)
        albums.forEach(function(album) {
            var location = album.location || 'Custom';
            var emoji = album.emoji || '💌';
            var photoCount = album.photoCount || 20;
            var color = album.color || '';

            var collageClass = color ? ' album-collage-' + color : '';
            var badgeClass = color ? ' collage-badge-' + color : '';
            var moreClass = color ? ' collage-more-' + color : '';

            var collage = [
                '<div class="album-collage' + collageClass + '">',
                '  <div class="collage-main"><img src="./images/placeholder.jpg" alt="' + escapeHtml(album.title) + ' 1" loading="lazy"></div>',
                '  <div class="collage-side">',
                '    <div class="collage-thumb"><img src="./images/placeholder.jpg" alt="' + escapeHtml(album.title) + ' 2" loading="lazy"></div>',
                '    <div class="collage-thumb"><img src="./images/placeholder.jpg" alt="' + escapeHtml(album.title) + ' 3" loading="lazy"></div>',
                '    <div class="collage-thumb" style="position:relative;">',
                '      <img src="./images/placeholder.jpg" alt="' + escapeHtml(album.title) + ' 4" loading="lazy">',
                '      <div class="collage-more' + moreClass + '">+' + Math.max(0, photoCount - 4) + '<span>more photos</span></div>',
                '    </div>',
                '  </div>',
                '  <div class="collage-badge' + badgeClass + '">📍 ' + escapeHtml(location) + '</div>',
                '</div>'
            ].join('');

            var cardHtml = [
                '<div class="album-card custom-album-card animate" id="' + album.id + '" data-custom-album-id="' + album.id + '">',
                '  <div class="album-card-inner bg-white rounded-2xl shadow-xl overflow-hidden relative">',
                '    <button type="button" class="album-delete-action admin-only" data-delete-album="' + album.id + '" title="Hapus Album"><i class="fas fa-trash"></i></button>',
                collage,
                '    <div class="p-6">',
                '      <div class="flex items-center gap-3 mb-2">',
                '        <span class="text-2xl">' + emoji + '</span>',
                '        <h2 class="font-pacifico text-2xl text-dark-pink">' + escapeHtml(album.title) + '</h2>',
                '      </div>',
                '      <p class="text-gray-500 text-sm font-medium mb-1">',
                '        <i class="fas fa-calendar-alt text-pastel-pink mr-1"></i> ' + escapeHtml(formatDate(album.date)),
                '      </p>',
                '      <p class="text-gray-600 font-medium mt-2 mb-5">' + escapeHtml(album.description || 'Album penuh kenangan indah kita. 💕') + '</p>',
                '      <div class="flex items-center justify-between">',
                '        <span class="text-sm text-pastel-purple font-semibold"><i class="fas fa-images mr-1"></i> ' + photoCount + ' Photos</span>',
                '        <a href="' + album.id + '.html" class="open-album-btn">Open Album <i class="fas fa-arrow-right"></i></a>',
                '      </div>',
                '    </div>',
                '  </div>',
                '</div>'
            ].join('');

            grid.insertAdjacentHTML('beforeend', cardHtml);
        });
        
        // Let album-cover and static-album-details apply to the newly rendered cards
        if (typeof window.applyCovers === "function") { window.applyCovers(); }
        if (typeof window.addControls === "function") { window.addControls(); }
        var applyDetailsEvent = new CustomEvent('photobook:custom-albums-rendered');
        window.dispatchEvent(applyDetailsEvent);
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

            var deleteAlbumBtn = event.target.closest('[data-delete-album]');
            if (deleteAlbumBtn && confirm('Hapus album ini secara permanen?')) {
                var albumId = deleteAlbumBtn.dataset.deleteAlbum;
                
                // If it's a custom album, remove from localStorage
                var albums = getAlbums();
                var isCustom = albums.some(function(a) { return a.id === albumId; });
                if (isCustom) {
                    saveAlbums(albums.filter(function(album) { return album.id !== albumId; }));
                } else {
                    // It's a static album, track its deletion in localStorage
                    var deletedStatic = JSON.parse(localStorage.getItem('photobook.deletedStaticAlbums') || '[]');
                    if (deletedStatic.indexOf(albumId) === -1) {
                        deletedStatic.push(albumId);
                        localStorage.setItem('photobook.deletedStaticAlbums', JSON.stringify(deletedStatic));
                    }
                    var card = document.getElementById('album-' + albumId) || deleteAlbumBtn.closest('.album-card');
                    if (card) card.style.display = 'none';
                }

                // Call API to delete physical file
                fetch('delete-album.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: albumId })
                }).catch(function(e) { console.error('Gagal hapus file HTML:', e); });

                if (isCustom) renderAlbums();
                return;
            }

            var editCustomAlbum = event.target.closest('[data-edit-custom-album]');
            if (editCustomAlbum) {
                var albums = getAlbums();
                var albumToEdit = albums.find(function(a) { return a.id === editCustomAlbum.dataset.editCustomAlbum; });
                if (!albumToEdit) return;
                
                var newTitle = prompt("Nama Album:", albumToEdit.title);
                if (newTitle === null) return;
                var newLocation = prompt("Lokasi Album:", albumToEdit.location || 'Custom');
                if (newLocation === null) return;
                var newEmoji = prompt("Emoji Icon:", albumToEdit.emoji || '💌');
                if (newEmoji === null) return;
                var newDate = prompt("Tanggal Album:", albumToEdit.date);
                if (newDate === null) return;
                var newDesc = prompt("Deskripsi Album:", albumToEdit.description || '');
                if (newDesc === null) return;
                var newColor = prompt("Warna Kartu (kosongkan untuk pink, atau isi: blue / green / yellow):", albumToEdit.color || '');
                if (newColor === null) return;
                
                albumToEdit.title = newTitle.trim() || albumToEdit.title;
                albumToEdit.location = newLocation.trim() || albumToEdit.location || 'Custom';
                albumToEdit.emoji = newEmoji.trim() || albumToEdit.emoji || '💌';
                albumToEdit.date = newDate.trim() || albumToEdit.date;
                albumToEdit.description = newDesc.trim() || albumToEdit.description;
                albumToEdit.color = newColor.trim().toLowerCase();
                if (['blue', 'green', 'yellow'].indexOf(albumToEdit.color) === -1) albumToEdit.color = '';
                
                albumToEdit.updatedAt = new Date().toISOString();
                
                saveAlbums(albums);
                renderAlbums();
                
                // Note: Updating local storage does not update the physical HTML file's title.
                // We could add an API call to update the HTML, but for now it just updates the index.html card.
                return;
            }
        });

        // Live preview listeners
        var updatePreview = function() {
            var title = document.getElementById('album-title-input').value.trim() || 'Nama Album';
            var loc = document.getElementById('album-location-input').value.trim() || 'Custom';
            var emoji = document.getElementById('album-emoji-input').value.trim() || '💌';
            var date = document.getElementById('album-date-input').value;
            var color = document.getElementById('album-color-input').value;
            var desc = document.getElementById('album-description-input').value.trim() || 'Album penuh kenangan indah kita. 💕';

            document.getElementById('preview-title').textContent = title;
            document.getElementById('preview-badge').textContent = '📍 ' + loc;
            document.getElementById('preview-emoji').textContent = emoji;
            document.getElementById('preview-desc').textContent = desc;
            document.getElementById('preview-date').textContent = date ? formatDate(date) : 'Hari ini';

            var collage = document.getElementById('preview-collage');
            var badge = document.getElementById('preview-badge');
            var more = document.getElementById('preview-more');

            // Reset classes
            collage.className = 'album-collage';
            badge.className = 'collage-badge';
            more.className = 'collage-more';

            if (color) {
                collage.classList.add('album-collage-' + color);
                badge.classList.add('collage-badge-' + color);
                more.classList.add('collage-more-' + color);
            }
        };

        var titleInp = document.getElementById('album-title-input');
        if (titleInp) {
            titleInp.addEventListener('input', updatePreview);
            document.getElementById('album-location-input').addEventListener('input', updatePreview);
            document.getElementById('album-emoji-input').addEventListener('input', updatePreview);
            document.getElementById('album-date-input').addEventListener('input', updatePreview);
            document.getElementById('album-color-input').addEventListener('change', updatePreview);
            document.getElementById('album-description-input').addEventListener('input', updatePreview);
        }

        var form = document.getElementById('create-album-form');
        if (form) {
            form.addEventListener('submit', function(event) {
                event.preventDefault();
                var title = document.getElementById('album-title-input').value.trim();
                if (!title) { return; }

                var albumId = createId('album');
                var date = document.getElementById('album-date-input').value;
                var location = document.getElementById('album-location-input').value.trim() || 'Custom';
                var emoji = document.getElementById('album-emoji-input').value.trim() || '💌';
                var color = document.getElementById('album-color-input').value;
                var description = document.getElementById('album-description-input').value.trim() || 'Album penuh kenangan indah kita. 💕';

                if (!date) {
                    var d = new Date();
                    date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                }

                var btn = document.getElementById('create-album-submit-btn');
                var originalHtml = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
                btn.disabled = true;

                fetch('create-album.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: albumId,
                        title: title,
                        date: date,
                        description: description
                    })
                }).then(function(res) { return res.json(); }).then(function(data) {
                    if (!data.success) {
                        console.error("Gagal membuat file HTML:", data.error);
                        alert("Pembuatan file HTML gagal: " + data.error + ". Pastikan menggunakan server PHP (seperti XAMPP).");
                        btn.innerHTML = originalHtml;
                        btn.disabled = false;
                        return;
                    }
                    
                    var album = {
                        id: albumId,
                        title: title,
                        date: date,
                        location: location,
                        emoji: emoji,
                        color: color,
                        description: description,
                        photoCount: 0,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };

                    var albums = getAlbums();
                    albums.unshift(album);
                    saveAlbums(albums);

                    closeModal('create-album-modal');
                    resetCreateForm();
                    renderAlbums();
                    
                    // Navigate directly to the new album
                    window.location.href = albumId + '.html';
                    
                }).catch(function(err) {
                    console.error("Fetch error:", err);
                    alert("Terjadi kesalahan koneksi saat memproses album.");
                    btn.innerHTML = originalHtml;
                    btn.disabled = false;
                });
            });
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        buildShell();
        bindEvents();
        renderAlbums();

        // Hide deleted static albums
        var deletedStatic = JSON.parse(localStorage.getItem('photobook.deletedStaticAlbums') || '[]');
        deletedStatic.forEach(function(id) {
            var card = document.getElementById('album-' + id);
            if (card) card.style.display = 'none';
        });

        if (window.PhotoBookCloud) {
            window.PhotoBookCloud.syncLocalWithCloud(STORAGE_KEY, [], function() {
                renderAlbums();
            });
        }
    });
})();





