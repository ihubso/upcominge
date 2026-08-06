// ===============================================
//         IMAGE ZOOM WITH GALLERY SUPPORT
// ===============================================

let currentZoomLevel = 1;
let isDragging = false;
let isMouseDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let imageOffsetX = 0;
let imageOffsetY = 0;
let isInteractingWithImage = false;
let isClickingImage = false;

// Pinch zoom variables
let initialPinchDistance = 0;
let lastPinchZoom = 1;
let isPinching = false;

// Global gallery state
window.zoomGallery = [];
window.zoomGalleryIndex = 0;

// Touch event handler references for cleanup
let touchMoveHandler = null;
let touchEndHandler = null;
let pinchMoveHandler = null;

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
    isInteractingWithImage = false;
    isDragging = false;
    isMouseDragging = false;
    isClickingImage = false;

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

    // --- FIX: Remove old listeners before adding new ones ---
    zoomedImg.removeEventListener('mousedown', startDrag);
    zoomedImg.removeEventListener('touchstart', startDragTouch);
    zoomedImg.removeEventListener('touchstart', handlePinchStart);
    zoomedImg.removeEventListener('click', preventModalClose);
    zoomedImg.removeEventListener('mousedown', preventModalClose);
    
    // --- FIX: Add click prevention on image ---
    zoomedImg.addEventListener('click', preventModalClose);
    zoomedImg.addEventListener('mousedown', preventModalClose);
    
    // --- FIX: Mouse drag ---
    zoomedImg.addEventListener('mousedown', startDrag);
    
    // --- FIX: Touch drag ---
    zoomedImg.addEventListener('touchstart', startDragTouch, { passive: false });
    zoomedImg.addEventListener('touchstart', handlePinchStart, { passive: false });

    // Wheel zoom
    modal.addEventListener('wheel', handleWheelZoom, { passive: false });

    // --- FIX: Track when user is interacting with the image ---
    const imageContainer = zoomedImg.parentElement;
    if (imageContainer) {
        // Touch interactions
        imageContainer.addEventListener('touchstart', function(e) {
            isInteractingWithImage = true;
        }, { passive: true });
        
        imageContainer.addEventListener('touchend', function(e) {
            setTimeout(() => {
                isInteractingWithImage = false;
            }, 300);
        }, { passive: true });
        
        // Mouse interactions
        imageContainer.addEventListener('mousedown', function(e) {
            isInteractingWithImage = true;
            isClickingImage = true;
        }, { passive: true });
        
        imageContainer.addEventListener('mouseup', function(e) {
            setTimeout(() => {
                isInteractingWithImage = false;
                isClickingImage = false;
            }, 300);
        }, { passive: true });
        
        // Mouse leave - prevent stuck state
        imageContainer.addEventListener('mouseleave', function(e) {
            setTimeout(() => {
                isInteractingWithImage = false;
                isClickingImage = false;
            }, 100);
        }, { passive: true });
    }

    // --- FIX: Modal click handler that respects interactions ---
    const closeHandler = function(e) {
        // Only close if clicking the backdrop, NOT the image or its container
        if (e.target === modal) {
            // Check if we're interacting with the image or dragging
            if (!isInteractingWithImage && !isDragging && !isMouseDragging && !isClickingImage) {
                closeImageZoom();
            }
        }
    };
    
    // Store the handler reference for cleanup
    modal._closeHandler = closeHandler;
    modal.removeEventListener('click', modal._closeHandler);
    modal.addEventListener('click', closeHandler);

    // --- FIX: Prevent touch from closing modal ---
    const touchPreventHandler = function(e) {
        const target = e.target;
        // If touching the image or gallery controls, stop propagation
        if (target.id === 'zoomedImage' || 
            target.closest('#zoomGalleryContainer') || 
            target.closest('#zoomPrevBtn') || 
            target.closest('#zoomNextBtn') ||
            target.closest('.zoom-controls') ||
            target.closest('.zoom-image-container')) {
            e.stopPropagation();
            isInteractingWithImage = true;
        }
    };
    
    modal._touchPreventHandler = touchPreventHandler;
    modal.removeEventListener('touchstart', modal._touchPreventHandler);
    modal.addEventListener('touchstart', touchPreventHandler, { passive: false });

    // Update zoom indicator
    updateZoomIndicator();

    // Render gallery navigation
    renderZoomGallery();
}

// --- FIX: New function to prevent modal close on image click ---
function preventModalClose(e) {
    e.preventDefault();
    e.stopPropagation();
    isClickingImage = true;
    isInteractingWithImage = true;
    
    // Reset after a short delay
    setTimeout(() => {
        isClickingImage = false;
        isInteractingWithImage = false;
    }, 200);
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
        zoomedImg.removeEventListener('touchstart', handlePinchStart);
        zoomedImg.removeEventListener('click', preventModalClose);
        zoomedImg.removeEventListener('mousedown', preventModalClose);
    }

    // Clean up global touch listeners
    if (touchMoveHandler) {
        document.removeEventListener('touchmove', touchMoveHandler, { capture: true });
        touchMoveHandler = null;
    }
    if (touchEndHandler) {
        document.removeEventListener('touchend', touchEndHandler, { capture: true });
        touchEndHandler = null;
    }
    if (pinchMoveHandler) {
        document.removeEventListener('touchmove', pinchMoveHandler, { capture: true });
        pinchMoveHandler = null;
    }

    // Clean up mouse listeners
    document.removeEventListener('mousemove', doDrag, { capture: true });
    document.removeEventListener('mouseup', stopDrag, { capture: true });

    // Remove modal click handler
    if (modal && modal._closeHandler) {
        modal.removeEventListener('click', modal._closeHandler);
        delete modal._closeHandler;
    }
    
    // Remove touch prevent handler
    if (modal && modal._touchPreventHandler) {
        modal.removeEventListener('touchstart', modal._touchPreventHandler);
        delete modal._touchPreventHandler;
    }

    modal.removeEventListener('wheel', handleWheelZoom);

    isDragging = false;
    isMouseDragging = false;
    isPinching = false;
    isInteractingWithImage = false;
    isClickingImage = false;
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
        // Remove transition during drag for smoother experience
        if (!isDragging && !isPinching && !isMouseDragging) {
            zoomedImg.style.transition = 'transform 0.2s ease';
        } else {
            zoomedImg.style.transition = 'none';
        }
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
//               DRAG TO PAN (FIXED)
// ===============================================

function startDrag(e) {
    // Only handle left mouse button
    if (e.button !== 0) return;
    
    e.preventDefault();
    e.stopPropagation(); // CRITICAL: Prevent modal close
    
    isMouseDragging = true;
    isDragging = true;
    isInteractingWithImage = true;
    isClickingImage = true;
    
    dragStartX = e.clientX - imageOffsetX;
    dragStartY = e.clientY - imageOffsetY;

    // Remove old listeners
    document.removeEventListener('mousemove', doDrag, { capture: true });
    document.removeEventListener('mouseup', stopDrag, { capture: true });
    
    // Add new listeners with capture phase
    document.addEventListener('mousemove', doDrag, { capture: true });
    document.addEventListener('mouseup', stopDrag, { capture: true });
}

function startDragTouch(e) {
    // Only handle single touch (not pinch)
    if (e.touches.length === 1 && !isPinching) {
        e.preventDefault();
        e.stopPropagation(); // CRITICAL: Stop propagation to prevent modal close
        isDragging = true;
        isInteractingWithImage = true;
        isClickingImage = true;
        dragStartX = e.touches[0].clientX - imageOffsetX;
        dragStartY = e.touches[0].clientY - imageOffsetY;

        // Remove any existing handlers
        if (touchMoveHandler) {
            document.removeEventListener('touchmove', touchMoveHandler, { capture: true });
        }
        if (touchEndHandler) {
            document.removeEventListener('touchend', touchEndHandler, { capture: true });
        }

        // Create new handlers
        touchMoveHandler = doDragTouch;
        touchEndHandler = stopDragTouch;

        // Use capture phase to prevent event bubbling
        document.addEventListener('touchmove', touchMoveHandler, { passive: false, capture: true });
        document.addEventListener('touchend', touchEndHandler, { passive: false, capture: true });
        document.addEventListener('touchcancel', touchEndHandler, { passive: false, capture: true });
    }
}

function doDrag(e) {
    if (!isDragging && !isMouseDragging) return;
    e.preventDefault();
    e.stopPropagation(); // CRITICAL: Prevent modal close
    
    imageOffsetX = e.clientX - dragStartX;
    imageOffsetY = e.clientY - dragStartY;
    updateImageTransform();
}

function doDragTouch(e) {
    if (!isDragging || e.touches.length !== 1) {
        return;
    }
    e.preventDefault();
    e.stopPropagation(); // CRITICAL: Prevent default zoom behavior
    imageOffsetX = e.touches[0].clientX - dragStartX;
    imageOffsetY = e.touches[0].clientY - dragStartY;
    updateImageTransform();
}

function stopDrag(e) {
    // CRITICAL: Prevent modal close on mouse up
    if (isMouseDragging || isDragging) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    isDragging = false;
    isMouseDragging = false;
    
    // Don't immediately reset isClickingImage - let it stay true for a moment
    // to prevent the click from closing the modal
    setTimeout(() => {
        isInteractingWithImage = false;
        isClickingImage = false;
    }, 200);
    
    document.removeEventListener('mousemove', doDrag, { capture: true });
    document.removeEventListener('mouseup', stopDrag, { capture: true });
    
    // Reapply transition after drag
    const zoomedImg = document.getElementById('zoomedImage');
    if (zoomedImg) {
        zoomedImg.style.transition = 'transform 0.2s ease';
    }
}

function stopDragTouch(e) {
    // CRITICAL: Prevent the modal from closing on touch end
    if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
    }
    isDragging = false;
    
    // Don't immediately reset isClickingImage - let it stay true for a moment
    setTimeout(() => {
        isInteractingWithImage = false;
        isClickingImage = false;
    }, 200);
    
    // Clean up event listeners
    document.removeEventListener('touchmove', touchMoveHandler, { capture: true });
    document.removeEventListener('touchend', touchEndHandler, { capture: true });
    document.removeEventListener('touchcancel', touchEndHandler, { capture: true });
    touchMoveHandler = null;
    touchEndHandler = null;
    
    // Reapply transition after drag
    const zoomedImg = document.getElementById('zoomedImage');
    if (zoomedImg) {
        zoomedImg.style.transition = 'transform 0.2s ease';
    }
}

// ===============================================
//              PINCH TO ZOOM (NEW)
// ===============================================

function handlePinchStart(e) {
    if (e.touches.length === 2) {
        e.preventDefault();
        e.stopPropagation();
        
        isPinching = true;
        isInteractingWithImage = true;
        isClickingImage = true;
        isDragging = false;
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialPinchDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        lastPinchZoom = currentZoomLevel;
        
        // Remove drag handlers during pinch
        document.removeEventListener('touchmove', touchMoveHandler, { capture: true });
        
        // Add pinch move handler
        if (pinchMoveHandler) {
            document.removeEventListener('touchmove', pinchMoveHandler, { capture: true });
        }
        pinchMoveHandler = handlePinchMove;
        document.addEventListener('touchmove', pinchMoveHandler, { passive: false, capture: true });
        
        // Add pinch end handler
        if (touchEndHandler) {
            document.removeEventListener('touchend', touchEndHandler, { capture: true });
        }
        touchEndHandler = handlePinchEnd;
        document.addEventListener('touchend', touchEndHandler, { passive: false, capture: true });
        document.addEventListener('touchcancel', touchEndHandler, { passive: false, capture: true });
    }
}

function handlePinchMove(e) {
    if (e.touches.length === 2 && isPinching) {
        e.preventDefault();
        e.stopPropagation();
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        
        // Calculate zoom change
        const scaleFactor = currentDistance / initialPinchDistance;
        let newZoom = lastPinchZoom * scaleFactor;
        newZoom = Math.min(5, Math.max(0.25, newZoom));
        
        currentZoomLevel = newZoom;
        updateImageTransform();
        updateZoomIndicator();
    }
}

function handlePinchEnd(e) {
    if (isPinching) {
        e.preventDefault();
        e.stopPropagation();
    }
    isPinching = false;
    
    setTimeout(() => {
        isInteractingWithImage = false;
        isClickingImage = false;
    }, 200);
    
    // Clean up pinch handlers
    if (pinchMoveHandler) {
        document.removeEventListener('touchmove', pinchMoveHandler, { capture: true });
        pinchMoveHandler = null;
    }
    if (touchEndHandler) {
        document.removeEventListener('touchend', touchEndHandler, { capture: true });
        document.removeEventListener('touchcancel', touchEndHandler, { capture: true });
        touchEndHandler = null;
    }
    
    // Reapply transition after pinch
    const zoomedImg = document.getElementById('zoomedImage');
    if (zoomedImg) {
        zoomedImg.style.transition = 'transform 0.2s ease';
    }
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
        prevBtn.className = 'zoom-nav-btn absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-black rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-lg z-10';
        prevBtn.setAttribute('aria-label', 'Previous image');
        prevBtn.onmousedown = (e) => e.stopPropagation();
        prevBtn.onclick = (e) => { e.stopPropagation(); prevZoomImage(); };
        modal.appendChild(prevBtn);

        // Next button
        nextBtn = document.createElement('button');
        nextBtn.id = 'zoomNextBtn';
        nextBtn.innerHTML = '❯';
        nextBtn.className = 'zoom-nav-btn absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-black rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-lg z-10';
        nextBtn.setAttribute('aria-label', 'Next image');
        nextBtn.onmousedown = (e) => e.stopPropagation();
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
    if (prevBtn) prevBtn.style.display = hasGallery ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = hasGallery ? 'flex' : 'none';

    if (hasGallery && galleryContainer) {
        galleryContainer.innerHTML = window.zoomGallery.map((img, idx) => `
            <img src="${img}"
                 class="w-14 h-14 object-cover rounded-lg border-2 cursor-pointer transition-all hover:opacity-80 ${idx === window.zoomGalleryIndex ? 'border-white' : 'border-gray-500 opacity-60'}"
                 onmousedown="event.stopPropagation()"
                 onclick="event.stopPropagation(); switchZoomImage(${idx})"
                 onerror="this.src='https://placehold.co/56x56?text=No+Image'"
                 alt="Thumbnail ${idx + 1}">
        `).join('');
    } else if (galleryContainer) {
        galleryContainer.innerHTML = '';
    }
}

function switchZoomImage(index) {
    if (index === window.zoomGalleryIndex || !window.zoomGallery.length) return;
    // Reuse zoomImage to refresh the view
    const titleEl = document.getElementById('zoomedImageTitle');
    const currentTitle = titleEl ? titleEl.textContent.replace(/\(\d+\/\d+\)/, '').trim() : 'Product';
    zoomImage(null, currentTitle, window.zoomGallery, index);
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