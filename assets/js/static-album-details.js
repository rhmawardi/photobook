(function() {
    var STORAGE_KEY = 'photobook.staticAlbumDetails.v1';
    var staticAlbums = ['albumMakassar', 'albumManado', 'albumTomohon'];

    function getDetails() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch (error) {
            return {};
        }
    }

    function saveDetails(details) {
        if (window.PhotoBookCloud) {
            window.PhotoBookCloud.saveJson(STORAGE_KEY, details);
            return;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(details));
    }

    function applyDetails() {
        var details = getDetails();
        staticAlbums.forEach(function(albumId) {
            var card = document.getElementById(albumId);
            if (!card) return;
            var albumDetail = details[albumId];
            if (!albumDetail) return;

            var titleEl = card.querySelector('h2');
            var dateEl = card.querySelector('.fa-calendar-alt').parentElement;
            var descEl = card.querySelector('p.text-gray-600');

            if (titleEl && albumDetail.title) {
                titleEl.textContent = albumDetail.title;
            }
            if (dateEl && albumDetail.date) {
                // Keep the icon, just update text
                dateEl.innerHTML = dateEl.innerHTML.split('</i>')[0] + '</i> ' + albumDetail.date;
            }
            if (descEl && albumDetail.description) {
                descEl.textContent = albumDetail.description;
            }
        });
    }

    function addEditButtons() {
        staticAlbums.forEach(function(albumId) {
            var card = document.getElementById(albumId);
            if (!card || card.querySelector('[data-edit-static-album]')) {
                return;
            }
            // Find the container where actions are placed, or just append to p-6
            var p6 = card.querySelector('.p-6');
            if (!p6) return;
            
            var flexContainer = p6.querySelector('.flex.items-center.justify-between');
            if (!flexContainer) return;

            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'static-album-edit-action';
            btn.dataset.editStaticAlbum = albumId;
            btn.innerHTML = '<i class="fas fa-pen"></i> Edit Info';
            
            // Insert it before the "Open Album" link or alongside
            flexContainer.insertBefore(btn, flexContainer.firstChild);
        });
    }

    function bindEvents() {
        document.addEventListener('click', function(event) {
            var btn = event.target.closest('[data-edit-static-album]');
            if (!btn) return;
            
            event.preventDefault();
            event.stopPropagation();
            
            var albumId = btn.dataset.editStaticAlbum;
            var card = document.getElementById(albumId);
            if (!card) return;

            var titleEl = card.querySelector('h2');
            var dateElText = card.querySelector('.fa-calendar-alt').parentElement.textContent.trim();
            var descEl = card.querySelector('p.text-gray-600');

            var currentTitle = titleEl ? titleEl.textContent : '';
            var currentDate = dateElText || '';
            var currentDesc = descEl ? descEl.textContent : '';

            var newTitle = prompt('Nama Album:', currentTitle);
            if (newTitle === null) return;
            
            var newDate = prompt('Tanggal Album:', currentDate);
            if (newDate === null) return;

            var newDesc = prompt('Deskripsi Album:', currentDesc);
            if (newDesc === null) return;

            var details = getDetails();
            details[albumId] = {
                title: newTitle.trim() || currentTitle,
                date: newDate.trim() || currentDate,
                description: newDesc.trim() || currentDesc
            };

            saveDetails(details);
            applyDetails();
        });
    }

    // Add some basic CSS for the edit button
    var style = document.createElement('style');
    style.textContent = `
        .static-album-edit-action {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            font-size: 12px;
            font-weight: 700;
            color: #C76F85;
            background: #F8E5E9;
            border-radius: 50px;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            margin-right: auto;
        }
        .static-album-edit-action:hover {
            background: #E5A4B3;
            color: white;
        }
    `;
    document.head.appendChild(style);

    document.addEventListener('DOMContentLoaded', function() {
        applyDetails();
        addEditButtons();
        bindEvents();
        if (window.PhotoBookCloud) {
            window.PhotoBookCloud.syncLocalWithCloud(STORAGE_KEY, {}, function() {
                applyDetails();
            });
        }
    });
})();
