/* ============================================
   ADVANCED INTERACTIONS & ANIMATIONS
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    
    // ============================================
    // SCROLL ANIMATIONS - Intersection Observer
    // ============================================
    
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // Add stagger animation to children
                const children = entry.target.querySelectorAll('.product-card, .category-card');
                children.forEach((child, index) => {
                    child.style.animationDelay = `${index * 0.1}s`;
                    child.classList.add('fade-in-up');
                });
            }
        });
    }, observerOptions);
    
    // Observe sections
    document.querySelectorAll('.hot-products-section, .deals-section, .related-section, .categoryShowcase-section').forEach(section => {
        section.classList.add('fade-in-up');
        observer.observe(section);
    });
    
    // ============================================
    // HERO BANNER ENHANCEMENTS
    // ============================================
    
    const heroBanner = document.getElementById('heroBanner');
    if (heroBanner) {
        // Add navigation arrows
        const prevArrow = document.createElement('button');
        prevArrow.className = 'hero-arrow prev';
        prevArrow.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevArrow.setAttribute('aria-label', 'Previous slide');
        
        const nextArrow = document.createElement('button');
        nextArrow.className = 'hero-arrow next';
        nextArrow.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextArrow.setAttribute('aria-label', 'Next slide');
        
        heroBanner.appendChild(prevArrow);
        heroBanner.appendChild(nextArrow);
        
        // Arrow click handlers
        prevArrow.addEventListener('click', () => {
            // Navigate to previous slide (integration with hero-banner.js)
            if (typeof showSlide === 'function') {
                currentSlideIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
                showSlide(currentSlideIndex);
            }
        });
        
        nextArrow.addEventListener('click', () => {
            // Navigate to next slide (integration with hero-banner.js)
            if (typeof showSlide === 'function') {
                currentSlideIndex = (currentSlideIndex + 1) % slides.length;
                showSlide(currentSlideIndex);
            }
        });
    }
    
    // ============================================
    // PRODUCT CARD INTERACTIONS
    // ============================================
    
    document.querySelectorAll('.product-card').forEach(card => {
        // Add quick actions overlay
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'product-actions';
        actionsDiv.innerHTML = `
            <button class="action-btn" aria-label="Quick view">
                <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn" aria-label="Add to wishlist">
                <i class="fas fa-heart"></i>
            </button>
            <button class="action-btn" aria-label="Share">
                <i class="fas fa-share-alt"></i>
            </button>
        `;
        
        card.appendChild(actionsDiv);
        
        // Wishlist button functionality
        const wishlistBtn = card.querySelector('.wishlist-btn');
        if (wishlistBtn) {
            wishlistBtn.addEventListener('click', function(e) {
                e.preventDefault();
                this.classList.toggle('active');
                
                // Animation
                const icon = this.querySelector('i');
                icon.style.transform = 'scale(1.3)';
                setTimeout(() => {
                    icon.style.transform = '';
                }, 200);
                
                // Show toast notification
                showToast(this.classList.contains('active') ? 'Added to wishlist!' : 'Removed from wishlist');
            });
        }
        
        // Add to cart button animation
        const addToCartBtn = card.querySelector('.add-to-cart-btn');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', function(e) {
                // Ripple effect
                const ripple = document.createElement('span');
                ripple.className = 'ripple';
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
                
                // Button feedback
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-check"></i> Added!';
                this.style.background = 'linear-gradient(135deg, #10B981 0%, #34D399 100%)';
                
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.style.background = '';
                }, 2000);
            });
        }
    });
    
    // ============================================
    // SMOOTH SCROLL FOR ANCHOR LINKS
    // ============================================
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
    
    // ============================================
    // PARALLAX EFFECT FOR HERO
    // ============================================
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const heroSection = document.querySelector('.hero-banner-section');
        
        if (heroSection && scrolled < 600) {
            const heroContent = heroSection.querySelector('.hero-content');
            if (heroContent) {
                heroContent.style.transform = `translateY(${scrolled * 0.3}px)`;
                heroContent.style.opacity = 1 - (scrolled / 600);
            }
        }
    });
    
    // ============================================
    // CATEGORY CARD TILT EFFECT
    // ============================================
    
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
    
    // ============================================
    // LAZY LOADING IMAGES
    // ============================================
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.onload = () => {
                        img.classList.add('loaded');
                    };
                }
                imageObserver.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
    
    // ============================================
    // SEARCH BAR EXPANSION
    // ============================================
    
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('focus', () => {
            searchInput.parentElement.classList.add('focused');
        });
        
        searchInput.addEventListener('blur', () => {
            if (!searchInput.value) {
                searchInput.parentElement.classList.remove('focused');
            }
        });
    }
    
    // ============================================
    // CART BADGE PULSE ANIMATION
    // ============================================
    
    const cartBadge = document.querySelector('.cart-badge');
    if (cartBadge) {
        // Pulse when cart has items
        if (parseInt(cartBadge.textContent) > 0) {
            cartBadge.style.animation = 'badgePulse 2s ease-in-out infinite';
        }
    }
    
    // ============================================
    // TOAST NOTIFICATION SYSTEM
    // ============================================
    
    window.showToast = function(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: ${type === 'success' ? 'linear-gradient(135deg, #10B981 0%, #34D399 100%)' : 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)'};
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 600;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    };
    
    // ============================================
    // NUMBER COUNTER ANIMATION
    // ============================================
    
    const animateCounter = (element, target, duration = 2000) => {
        let start = 0;
        const increment = target / (duration / 16);
        
        const updateCounter = () => {
            start += increment;
            if (start < target) {
                element.textContent = Math.floor(start).toLocaleString();
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target.toLocaleString();
            }
        };
        
        updateCounter();
    };
    
    // Animate numbers in view
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.dataset.target);
                if (target) {
                    animateCounter(counter, target);
                    counterObserver.unobserve(counter);
                }
            }
        });
    });
    
    document.querySelectorAll('[data-target]').forEach(counter => {
        counterObserver.observe(counter);
    });
    
    // ============================================
    // MAGNIFIC IMAGE ZOOM
    // ============================================
    
    document.querySelectorAll('.product-image').forEach(img => {
        img.addEventListener('click', () => {
            const modal = document.createElement('div');
            modal.className = 'image-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <img src="${img.src}" alt="${img.alt || 'Product image'}">
                    <button class="modal-close"><i class="fas fa-times"></i></button>
                </div>
            `;
            
            modal.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease-out;
            `;
            
            document.body.appendChild(modal);
            
            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => modal.remove(), 300);
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.animation = 'fadeOut 0.3s ease-out';
                    setTimeout(() => modal.remove(), 300);
                }
            });
        });
    });
    
    // ============================================
    // HEADER SCROLL EFFECT
    // ============================================
    
    let lastScroll = 0;
    const header = document.querySelector('header');
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (header) {
            if (currentScroll > 100) {
                header.classList.add('scrolled');
                header.style.background = 'rgba(255, 255, 255, 0.95)';
                header.style.backdropFilter = 'blur(10px)';
                header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
            } else {
                header.classList.remove('scrolled');
                header.style.background = '';
                header.style.backdropFilter = '';
                header.style.boxShadow = '';
            }
            
            // Hide header on scroll down, show on scroll up
            if (currentScroll > lastScroll && currentScroll > 300) {
                header.style.transform = 'translateY(-100%)';
            } else {
                header.style.transform = 'translateY(0)';
            }
            
            lastScroll = currentScroll;
        }
    });
    
    // ============================================
    // BACK TO TOP BUTTON
    // ============================================
    
    const backToTop = document.createElement('button');
    backToTop.className = 'back-to-top';
    backToTop.innerHTML = '<i class="fas fa-arrow-up"></i>';
    backToTop.setAttribute('aria-label', 'Back to top');
    
    backToTop.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #6C3CE1 0%, #8B5CF6 100%);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 8px 30px rgba(108, 60, 225, 0.4);
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 999;
    `;
    
    document.body.appendChild(backToTop);
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 500) {
            backToTop.style.opacity = '1';
            backToTop.style.visibility = 'visible';
        } else {
            backToTop.style.opacity = '0';
            backToTop.style.visibility = 'hidden';
        }
    });
    
    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    backToTop.addEventListener('mouseenter', () => {
        backToTop.style.transform = 'translateY(-5px)';
        backToTop.style.boxShadow = '0 12px 40px rgba(108, 60, 225, 0.5)';
    });
    
    backToTop.addEventListener('mouseleave', () => {
        backToTop.style.transform = 'translateY(0)';
        backToTop.style.boxShadow = '0 8px 30px rgba(108, 60, 225, 0.4)';
    });
    
    // ============================================
    // KEYBOARD NAVIGATION
    // ============================================
    
    document.addEventListener('keydown', (e) => {
        // ESC to close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.image-modal, .toast').forEach(modal => {
                modal.remove();
            });
        }
    });
    
    console.log('✨ Advanced interactions loaded successfully!');
});

// ============================================
// CSS ANIMATIONS (to be added to stylesheet)
// ============================================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: rippleEffect 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes rippleEffect {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .product-card {
        animation: fadeInUp 0.6s ease-out;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .back-to-top:hover {
        background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%);
    }
    
    .image-modal .modal-content {
        position: relative;
        max-width: 90%;
        max-height: 90%;
    }
    
    .image-modal img {
        max-width: 100%;
        max-height: 90vh;
        object-fit: contain;
    }
    
    .modal-close {
        position: absolute;
        top: -40px;
        right: 0;
        background: none;
        border: none;
        color: white;
        font-size: 30px;
        cursor: pointer;
        transition: transform 0.2s;
    }
    
    .modal-close:hover {
        transform: scale(1.2);
    }
    
    header {
        transition: all 0.3s ease;
    }
    
    header.scrolled {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
    }
`;
document.head.appendChild(style);
