(function(){
var albumKey = (location.pathname.split('/').pop()||'').replace('.html','');
if(!albumKey || albumKey==='index') return;
var KEY = 'photobook.dynPhotos.v1.'+albumKey;
var grid = document.getElementById('dynamic-photo-grid');
var empty = document.getElementById('album-empty-state');
var uploadArea = document.getElementById('album-upload-area');
if(!grid) return;

var STYLES=[
{border:'border-pastel-pink',icon:'fa-heart',color:'text-dark-pink',tcol:'text-pastel-purple',stBg:'bg-pastel-yellow',stRot:'rotate-12',stTxt:'Sweet!',stTxtCol:'text-dark-pink'},
{border:'border-pastel-blue',icon:'fa-umbrella-beach',color:'text-pastel-blue',tcol:'text-pastel-blue',stBg:'bg-pastel-blue',stRot:'-rotate-12',stTxt:'Lovely!',stTxtCol:'text-white'},
{border:'border-pastel-purple',icon:'fa-coffee',color:'text-pastel-purple',tcol:'text-pastel-purple',stBg:'bg-pastel-purple',stRot:'rotate-12',stTxt:'Cute!',stTxtCol:'text-white'},
{border:'border-pastel-green',icon:'fa-tree',color:'text-pastel-green',tcol:'text-pastel-green',stBg:'bg-pastel-green',stRot:'rotate-12',stTxt:'Fun!',stTxtCol:'text-white'},
{border:'border-dark-pink',icon:'fa-gift',color:'text-dark-pink',tcol:'text-dark-pink',stBg:'bg-dark-pink',stRot:'-rotate-12',stTxt:'Love!',stTxtCol:'text-white'},
{border:'border-pastel-yellow',icon:'fa-film',color:'text-pastel-yellow',tcol:'text-pastel-yellow',stBg:'bg-pastel-yellow',stRot:'rotate-12',stTxt:'Star!',stTxtCol:'text-dark-pink'},
{border:'border-dark-pink',icon:'fa-camera',color:'text-dark-pink',tcol:'text-dark-pink',stBg:'bg-dark-pink',stRot:'rotate-12',stTxt:'Wow!',stTxtCol:'text-white'},
{border:'border-pastel-pink',icon:'fa-star',color:'text-pastel-pink',tcol:'text-pastel-pink',stBg:'bg-pastel-pink',stRot:'-rotate-12',stTxt:'Yay!',stTxtCol:'text-white'}
];

function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function getPhotos(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}}
function savePhotos(p){localStorage.setItem(KEY,JSON.stringify(p));if(window.PhotoBookCloud)window.PhotoBookCloud.saveJson(KEY,p)}

function compress(file){
    return new Promise(function(ok,fail){
        var r=new FileReader();r.onerror=fail;
        r.onload=function(e){
            var img=new Image();img.onerror=fail;
            img.onload=function(){
                var s=Math.min(1,1400/Math.max(img.width,img.height));
                var c=document.createElement('canvas');
                c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);
                c.getContext('2d').drawImage(img,0,0,c.width,c.height);
                ok(c.toDataURL('image/jpeg',0.84));
            };img.src=e.target.result;
        };r.readAsDataURL(file);
    });
}

function uploadFile(src,prefix){
    return fetch('upload-image.php',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({image:src,prefix:prefix})
    }).then(function(r){return r.json()}).then(function(d){return d.success?d.path:null}).catch(function(){return null})
    .then(function(localPath){
        if(localPath) return localPath;
        if(window.PhotoBookCloud&&window.PhotoBookCloud.isConfigured()) return window.PhotoBookCloud.uploadDataUrl(src,'dynamic-albums/'+albumKey);
        return src;
    });
}

function render(){
    var photos=getPhotos();
    grid.innerHTML='';
    if(empty) empty.style.display=photos.length?'none':'';
    photos.forEach(function(photo,i){
        var s=STYLES[i%STYLES.length];
        grid.insertAdjacentHTML('beforeend',
            '<div class="photo-container"><div class="photo-card bg-white rounded-lg p-4 shadow-lg">'+
            '<div class="polaroid bg-white p-2 border-2 '+s.border+' rounded" data-popup-src="'+esc(photo.src)+'" data-popup-title="'+esc(photo.title)+'" data-popup-caption="'+esc(photo.caption)+'"><div class="w-full h-64 overflow-hidden">'+
            '<img loading="lazy" src="'+esc(photo.src)+'" alt="'+esc(photo.title)+'" class="rounded w-full h-full object-cover">'+
            '<div class="photo-shine"></div></div></div>'+
            '<div class="mt-4 flex items-start"><i class="fas '+s.icon+' '+s.color+' text-xl mr-3 mt-1"></i>'+
            '<div><h3 class="font-pacifico text-xl '+s.tcol+'">'+esc(photo.title||'Photo '+(i+1))+'</h3>'+
            '<p class="text-gray-700 mt-1 font-medium">'+esc(photo.caption||'')+'</p></div></div>'+
            '<div class="absolute -top-3 -right-3 sticker"><div class="w-14 h-14 '+s.stBg+' rounded-full flex items-center justify-center '+s.stRot+'">'+
            '<span class="font-pacifico text-sm '+s.stTxtCol+'">'+s.stTxt+'</span></div></div>'+
            '<button type="button" class="dyn-photo-delete admin-only" data-delete-dyn-photo="'+i+'" title="Hapus foto"><i class="fas fa-trash"></i></button>'+
            '<button type="button" class="dyn-photo-edit admin-only" data-edit-dyn-photo="'+i+'" title="Edit caption"><i class="fas fa-pen"></i></button>'+
            '</div></div>'
        );
    });
    grid.querySelectorAll('.photo-card').forEach(function(c,i){
        c.style.position='relative';
        setTimeout(function(){c.classList.add('animate')},200+i*100);
    });
    // Re-apply admin visibility
    if(window.PhotoBookAdmin) window.PhotoBookAdmin.applyMode();
}

// Upload handler
var uploadBtn = document.getElementById('upload-photo-btn');
var fileInput = document.getElementById('dyn-photo-file');
if(uploadBtn) uploadBtn.addEventListener('click', function(){
    var file = fileInput && fileInput.files && fileInput.files[0];
    if(!file){alert('Pilih foto terlebih dahulu');return;}
    var title = document.getElementById('dyn-photo-title').value.trim();
    var caption = document.getElementById('dyn-photo-caption').value.trim();
    uploadBtn.disabled=true;
    uploadBtn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Mengupload...';
    compress(file).then(function(src){
        return uploadFile(src, albumKey+'-photo');
    }).then(function(finalSrc){
        var photos=getPhotos();
        photos.push({src:finalSrc, title:title||'Photo '+(photos.length+1), caption:caption});
        savePhotos(photos);
        render();
        fileInput.value='';
        document.getElementById('dyn-photo-title').value='';
        document.getElementById('dyn-photo-caption').value='';
        document.getElementById('dyn-upload-preview').innerHTML='<i class="fas fa-cloud-upload-alt"></i><span>Pilih foto atau drag ke sini</span>';
        uploadBtn.disabled=false;
        uploadBtn.innerHTML='<i class="fas fa-upload"></i> Upload Foto';
    }).catch(function(err){
        console.error(err);
        alert('Gagal mengupload foto');
        uploadBtn.disabled=false;
        uploadBtn.innerHTML='<i class="fas fa-upload"></i> Upload Foto';
    });
});

// File preview
if(fileInput) fileInput.addEventListener('change', function(){
    var preview = document.getElementById('dyn-upload-preview');
    if(this.files && this.files[0]){
        var reader = new FileReader();
        reader.onload = function(e){
            preview.innerHTML='<img src="'+e.target.result+'" style="max-height:160px;border-radius:10px;object-fit:cover;">';
        };
        reader.readAsDataURL(this.files[0]);
    }
});

// Delete handler
grid.addEventListener('click', function(e){
    var del=e.target.closest('[data-delete-dyn-photo]');
    if(del && confirm('Hapus foto ini dari album?')){
        var photos=getPhotos();
        photos.splice(parseInt(del.dataset.deleteDynPhoto),1);
        savePhotos(photos);
        render();
    }
    var edit=e.target.closest('[data-edit-dyn-photo]');
    if(edit){
        var idx=parseInt(edit.dataset.editDynPhoto);
        var photos=getPhotos();
        var photo=photos[idx];
        if(!photo) return;
        var newTitle=prompt('Judul Foto:',photo.title||'');
        if(newTitle===null) return;
        var newCaption=prompt('Caption Foto:',photo.caption||'');
        if(newCaption===null) return;
        photo.title=newTitle.trim()||photo.title;
        photo.caption=newCaption.trim();
        savePhotos(photos);
        render();
    }
});

// Photo popup
grid.addEventListener('click', function(e){
    var pol=e.target.closest('.polaroid');
    if(!pol || e.target.closest('.dyn-photo-delete,.dyn-photo-edit')) return;
    var popup=document.getElementById('photoPopup');
    var img=document.getElementById('popupImage');
    var cap=document.getElementById('popupCaption');
    if(!popup||!img) return;
    img.src=pol.dataset.popupSrc||pol.querySelector('img').src;
    if(cap) cap.textContent=(pol.dataset.popupTitle||'')+(pol.dataset.popupCaption?' - '+pol.dataset.popupCaption:'');
    popup.classList.add('active');
    document.body.style.overflow='hidden';
});

// Initial render
render();

// Sync from cloud
if(window.PhotoBookCloud){
    window.PhotoBookCloud.syncLocalWithCloud(KEY,[],function(){render()});
}
})();
