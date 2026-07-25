// ===============================================
//         IMAGE ZOOM WITH GALLERY SUPPORT
// ===============================================

let currentZoomLevel = 1;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let imageOffsetX = 0;
let imageOffsetY = 0;

// Global gallery state
window.zoomGallery = [];
window.zoomGalleryIndex = 0;

/**
 * Open the zoom modal
 * @param {string} imageUrl - Fallback single image URL
 * @param {string} imageTitle - Caption for the image
 * @param {Array<string>} [gallery=null] - Array of all image URLs (optional)
 * @param {number} [startIndex=0] - Index of the image to show first
 */
function zoomImage(imageUrl, imageTitle = '', gallery = null, startIndex = 0) {
    const modal = document.getElementById('imageZoomModal');
    const zoomedImg = document.getElementById('zoomedImage');
    const titleEl = document.getElementById('zoomedImageTitle');

    if (!modal || !zoomedImg) {
        console.error('Image zoom modal elements not found');
        return;
    }

    // Save gallery data for navigation
    if (gallery && Array.isArray(gallery) && gallery.length > 1) {
        window.zoomGallery = gallery;
        window.zoomGalleryIndex = startIndex;
    } else {
        window.zoomGallery = [];
        window.zoomGalleryIndex = 0;
    }

    // Reset zoom state
    currentZoomLevel = 1;
    imageOffsetX = 0;
    imageOffsetY = 0;

    // Determine which image to actually show
    const srcToLoad = window.zoomGallery.length
        ? window.zoomGallery[window.zoomGalleryIndex]
        : imageUrl;

    // Show loading state
    zoomedImg.classList.add('loading');
    zoomedImg.src = '';

    // Load the image with error handling
    const img = new Image();
    img.onload = function () {
        zoomedImg.src = srcToLoad;
        zoomedImg.classList.remove('loading');
        resetImageTransform();
    };
    img.onerror = function () {
        zoomedImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f0f0f0"/><text x="100" y="100" text-anchor="middle" dy=".3em" font-family="Arial" font-size="14" fill="%23999">Image not available</text></svg>';
        zoomedImg.classList.remove('loading');
        resetImageTransform();
    };
    img.src = srcToLoad;

    // Update title (add gallery counter if applicable)
    if (titleEl) {
        if (window.zoomGallery.length) {
            titleEl.textContent = `${imageTitle} (${window.zoomGalleryIndex + 1}/${window.zoomGallery.length})`;
        } else {
            titleEl.textContent = imageTitle || '';
        }
    }

    // Show modal
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);

    // Prevent background scrolling
    document.body.style.overflow = 'hidden';

    // Add drag/touch listeners
    zoomedImg.addEventListener('mousedown', startDrag);
    zoomedImg.addEventListener('touchstart', startDragTouch);

    // Wheel zoom
    modal.addEventListener('wheel', handleWheelZoom, { passive: false });

    // Update zoom indicator
    updateZoomIndicator();

    // Render gallery navigation
    renderZoomGallery();
}

function closeImageZoom() {
    const modal = document.getElementById('imageZoomModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }

    document.body.style.overflow = '';

    const zoomedImg = document.getElementById('zoomedImage');
    if (zoomedImg) {
        zoomedImg.removeEventListener('mousedown', startDrag);
        zoomedImg.removeEventListener('touchstart', startDragTouch);
    }

    modal.removeEventListener('wheel', handleWheelZoom);

    isDragging = false;
}

// ===============================================
//               ZOOM CONTROLS
// ===============================================

function zoomIn() {
    if (currentZoomLevel < 5) {
        currentZoomLevel += 0.25;
        updateImageTransform();
        updateZoomIndicator();
    }
}

function zoomOut() {
    if (currentZoomLevel > 0.25) {
        currentZoomLevel -= 0.25;
        updateImageTransform();
        updateZoomIndicator();
    }
}

function resetZoom() {
    currentZoomLevel = 1;
    imageOffsetX = 0;
    imageOffsetY = 0;
    updateImageTransform();
    updateZoomIndicator();
}

function updateImageTransform() {
    const zoomedImg = document.getElementById('zoomedImage');
    if (zoomedImg) {
        zoomedImg.style.transform = `translate(${imageOffsetX}px, ${imageOffsetY}px) scale(${currentZoomLevel})`;
    }
}

function resetImageTransform() {
    const zoomedImg = document.getElementById('zoomedImage');
    if (zoomedImg) {
        zoomedImg.style.transform = 'translate(0px, 0px) scale(1)';
        zoomedImg.style.transition = 'transform 0.3s ease';
    }
}

function updateZoomIndicator() {
    const indicator = document.getElementById('zoomLevelIndicator');
    if (indicator) {
        const percentage = Math.round(currentZoomLevel * 100);
        indicator.textContent = `${percentage}%`;
        indicator.classList.toggle('hidden', currentZoomLevel === 1);
    }
}

// ===============================================
//               DRAG TO PAN
// ===============================================

function startDrag(e) {
    e.preventDefault();
    isDragging = true;
    dragStartX = e.clientX - imageOffsetX;
    dragStartY = e.clientY - imageOffsetY;

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
}

function startDragTouch(e) {
    if (e.touches.length === 1) {
        e.preventDefault();
        isDragging = true;
        dragStartX = e.touches[0].clientX - imageOffsetX;
        dragStartY = e.touches[0].clientY - imageOffsetY;

        document.addEventListener('touchmove', doDragTouch, { passive: false });
        document.addEventListener('touchend', stopDrag);
    }
}

function doDrag(e) {
    if (!isDragging) return;
    e.preventDefault();
    imageOffsetX = e.clientX - dragStartX;
    imageOffsetY = e.clientY - dragStartY;
    updateImageTransform();
}

function doDragTouch(e) {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    imageOffsetX = e.touches[0].clientX - dragStartX;
    imageOffsetY = e.touches[0].clientY - dragStartY;
    updateImageTransform();
}

function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', doDrag);
    document.removeEventListener('touchmove', doDragTouch);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchend', stopDrag);
}

// ===============================================
//           GALLERY NAVIGATION
// ===============================================

function renderZoomGallery() {
    const modal = document.getElementById('imageZoomModal');
    if (!modal) return;

    let galleryContainer = document.getElementById('zoomGalleryContainer');
    let prevBtn = document.getElementById('zoomPrevBtn');
    let nextBtn = document.getElementById('zoomNextBtn');

    // Create gallery UI once
    if (!galleryContainer) {
        // Prev button
        prevBtn = document.createElement('button');
        prevBtn.id = 'zoomPrevBtn';
        prevBtn.innerHTML = '❮';
        prevBtn.className = 'absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-black rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-lg z-10';
        prevBtn.onclick = (e) => { e.stopPropagation(); prevZoomImage(); };
        modal.appendChild(prevBtn);

        // Next button
        nextBtn = document.createElement('button');
        nextBtn.id = 'zoomNextBtn';
        nextBtn.innerHTML = '❯';
        nextBtn.className = 'absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-black rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-lg z-10';
        nextBtn.onclick = (e) => { e.stopPropagation(); nextZoomImage(); };
        modal.appendChild(nextBtn);

        // Thumbnails container
        galleryContainer = document.createElement('div');
        galleryContainer.id = 'zoomGalleryContainer';
        galleryContainer.className = 'absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90%] pb-2 px-4';
        modal.appendChild(galleryContainer);
    } else {
        prevBtn = document.getElementById('zoomPrevBtn');
        nextBtn = document.getElementById('zoomNextBtn');
    }

    // Show/hide buttons and thumbnails based on gallery size
    const hasGallery = window.zoomGallery.length > 1;
    prevBtn.style.display = hasGallery ? 'flex' : 'none';
    nextBtn.style.display = hasGallery ? 'flex' : 'none';

    if (hasGallery) {
        galleryContainer.innerHTML = window.zoomGallery.map((img, idx) => `
            <img src="${img}"
                 class="w-14 h-14 object-cover rounded-lg border-2 cursor-pointer transition-all hover:opacity-80 ${idx === window.zoomGalleryIndex ? 'border-white' : 'border-gray-500 opacity-60'}"
                 onclick="switchZoomImage(${idx})"
                 onerror="this.src='https://placehold.co/56x56?text=No+Image'">
        `).join('');
    } else {
        galleryContainer.innerHTML = '';
    }
}

function switchZoomImage(index) {
    if (index === window.zoomGalleryIndex || !window.zoomGallery.length) return;
    // Reuse zoomImage to refresh the view
    zoomImage(null, document.getElementById('zoomedImageTitle')?.textContent?.replace(/\(\d+\/\d+\)/, '').trim() || 'Product', window.zoomGallery, index);
}

function nextZoomImage() {
    if (window.zoomGallery.length === 0) return;
    const newIndex = (window.zoomGalleryIndex + 1) % window.zoomGallery.length;
    switchZoomImage(newIndex);
}

function prevZoomImage() {
    if (window.zoomGallery.length === 0) return;
    const newIndex = (window.zoomGalleryIndex - 1 + window.zoomGallery.length) % window.zoomGallery.length;
    switchZoomImage(newIndex);
}

// ===============================================
//          DOWNLOAD IMAGE
// ===============================================

function downloadZoomedImage() {
    const zoomedImg = document.getElementById('zoomedImage');
    if (!zoomedImg || !zoomedImg.src || zoomedImg.src.startsWith('data:')) {
        alert('Cannot download this image');
        return;
    }

    const link = document.createElement('a');
    link.href = zoomedImg.src;
    link.download = `image_${Date.now()}.jpg`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===============================================
//            KEYBOARD SHORTCUTS
// ===============================================

document.addEventListener('keydown', function (e) {
    const modal = document.getElementById('imageZoomModal');
    if (!modal || modal.classList.contains('hidden')) return;

    switch (e.key) {
        case 'Escape':
            closeImageZoom();
            break;
        case '+':
        case '=':
            e.preventDefault();
            zoomIn();
            break;
        case '-':
        case '_':
            e.preventDefault();
            zoomOut();
            break;
        case '0':
            e.preventDefault();
            resetZoom();
            break;
        case 'd':
        case 'D':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                downloadZoomedImage();
            }
            break;
        case 'ArrowLeft':
            e.preventDefault();
            prevZoomImage();
            break;
        case 'ArrowRight':
            e.preventDefault();
            nextZoomImage();
            break;
    }
});

// Double click to reset zoom
document.getElementById('zoomedImage')?.addEventListener('dblclick', function (e) {
    e.preventDefault();
    e.stopPropagation();
    resetZoom();
});

// Wheel zoom handler
function handleWheelZoom(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY < 0) {
        zoomIn();
    } else {
        zoomOut();
    }
}

// ===============================================
//         USER PHOTO ZOOM (unchanged)
// ===============================================

function zoomUserPhoto() {
    const fixPath = (path) => {
        if (!path || path.startsWith('http') || path.startsWith('image/') || path.startsWith('data:')) return path;
        const base = (typeof API_BASE !== 'undefined' && API_BASE) ? API_BASE : 'https://localhost:54221';
        return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    const userPhoto = document.getElementById('modalUserPhoto');
    const managerPhoto = document.getElementById('managerProfilePhoto');
    const targetPhoto = (userPhoto && userPhoto.offsetParent !== null) ? userPhoto : managerPhoto;

    if (!targetPhoto || !targetPhoto.src || targetPhoto.src.includes('out%20of%20stock')) {
        console.warn("No valid user photo found to zoom.");
        return;
    }

    const rawPath = targetPhoto.getAttribute('src');
    const cleanSrc = fixPath(rawPath);

    const userName = document.getElementById('modalUserFullName')?.textContent ||
                     document.getElementById('modalUserName')?.textContent ||
                     document.getElementById('managerName')?.textContent ||
                     'User';

    if (typeof zoomImage === 'function') {
        zoomImage(cleanSrc, `${userName}'s Photo`);
    } else {
        console.error("zoomImage function not found!");
    }
}