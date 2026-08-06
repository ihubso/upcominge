function getHeaderHTML() {
    return `
        <style>
            /* ----- Reset & Base ----- */
            .st-header *, .st-header *::before, .st-header *::after {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            /* ----- CSS Variables ----- */
            .st-header {
                --st-primary: #6C3CE1;
                --st-primary-dark: #5A2FC4;
                --st-primary-light: #8B6BE8;
                --st-primary-glow: rgba(108, 60, 225, 0.3);
                --st-dark: #0F172A;
                --st-dark-secondary: #1E293B;
                --st-gray: #94A3B8;
                --st-gray-light: #E2E8F0;
                --st-white: #FFFFFF;
                --st-shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
                --st-shadow-md: 0 4px 20px rgba(0,0,0,0.08);
                --st-shadow-lg: 0 8px 40px rgba(0,0,0,0.12);
                --st-shadow-xl: 0 20px 60px rgba(0,0,0,0.15);
                --st-radius-sm: 8px;
                --st-radius-md: 12px;
                --st-radius-lg: 16px;
                --st-radius-xl: 24px;
                --st-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }
            
            /* ----- Topbar ----- */
            .st-topbar {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 10000;
                background: rgba(255, 255, 255, 0.92);
                backdrop-filter: blur(20px) saturate(180%);
                -webkit-backdrop-filter: blur(20px) saturate(180%);
                border-bottom: 1px solid rgba(226, 232, 240, 0.6);
                padding: 12px 24px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: 76px;
                transition: var(--st-transition);
            }
            
            .st-topbar.scrolled {
                box-shadow: var(--st-shadow-md);
                background: rgba(255, 255, 255, 0.98);
            }
            
            /* ----- Brand ----- */
            .st-brand {
                display: flex;
                align-items: center;
                gap: 12px;
                cursor: pointer;
                flex-shrink: 0;
                text-decoration: none;
            }
            
            .st-brand-icon {
                width: 44px;
                height: 44px;
                background: linear-gradient(135deg, var(--st-primary), var(--st-primary-dark));
                border-radius: var(--st-radius-md);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 900;
                font-size: 20px;
                box-shadow: 0 4px 12px var(--st-primary-glow);
                transition: var(--st-transition);
                flex-shrink: 0;
            }
            
            .st-brand:hover .st-brand-icon {
                transform: scale(1.05) rotate(-3deg);
            }
            
            .st-brand-text {
                font-weight: 800;
                font-size: 22px;
                letter-spacing: -0.5px;
                color: var(--st-dark);
            }
            
            .st-brand-text .st-brand-highlight {
                color: var(--st-primary);
                position: relative;
            }
            
            .st-brand-text .st-brand-highlight::after {
                content: '';
                position: absolute;
                bottom: -2px;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, var(--st-primary), var(--st-primary-light));
                border-radius: 2px;
            }
            
            /* ----- Desktop Navigation ----- */
            .st-nav-desktop {
                display: flex;
                align-items: center;
                gap: 4px;
                flex: 1;
                justify-content: center;
                margin: 0 20px;
            }
            
            .st-nav-list {
                display: flex;
                align-items: center;
                gap: 2px;
                list-style: none;
            }
            
            .st-nav-item {
                position: relative;
            }
             .st-dropdown {
                position: absolute;
                top: calc(100% + 8px);
                left: 50%;
                transform: translateX(-50%) translateY(10px);
                background: var(--st-white);
                border-radius: var(--st-radius-lg);
                box-shadow: var(--st-shadow-xl);
                padding: 20px 24px;
                min-width: 480px;
                max-width: 600px;
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
                transition: var(--st-transition);
                border: 1px solid rgba(226, 232, 240, 0.5);
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .st-nav-item:hover .st-dropdown {
                opacity: 1;
                visibility: visible;
                pointer-events: all;
                transform: translateX(-50%) translateY(0);
            }
            
            .st-dropdown::before {
                content: '';
                position: absolute;
                top: -6px;
                left: 50%;
                transform: translateX(-50%) rotate(45deg);
                width: 12px;
                height: 12px;
                background: var(--st-white);
                border-top: 1px solid rgba(226, 232, 240, 0.5);
                border-left: 1px solid rgba(226, 232, 240, 0.5);
            }
            
            .st-dropdown-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid var(--st-gray-light);
            }
            
            .st-dropdown-header h3 {
                font-size: 16px;
                font-weight: 700;
                color: var(--st-dark);
            }
            
            .st-dropdown-header .st-view-all {
                font-size: 13px;
                color: var(--st-primary);
                text-decoration: none;
                font-weight: 600;
            }
            
            .st-dropdown-header .st-view-all:hover {
                text-decoration: underline;
            }
            
            .st-dropdown-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                gap: 10px;
            }
            
            .st-dropdown-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                border-radius: var(--st-radius-sm);
                color: var(--st-dark-secondary);
                text-decoration: none;
                font-size: 13px;
                font-weight: 500;
                transition: var(--st-transition);
                cursor: pointer;
                border: 1px solid transparent;
            }
            
            .st-dropdown-item:hover {
                background: rgba(108, 60, 225, 0.08);
                color: var(--st-primary);
                border-color: var(--st-gray-light);
            }
            
            .st-dropdown-item .st-item-icon {
                width: 36px;
                height: 36px;
                border-radius: var(--st-radius-sm);
                overflow: hidden;
                flex-shrink: 0;
                background: #f1f5f9;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .st-dropdown-item .st-item-icon img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .st-dropdown-item .st-item-icon .st-icon-fallback {
                font-size: 16px;
                color: var(--st-gray);
            }
            
            .st-dropdown-item .st-item-info {
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            
            .st-dropdown-item .st-item-name {
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .st-dropdown-item .st-item-count {
                font-size: 11px;
                color: var(--st-gray);
                font-weight: 400;
            }
            
            .st-dropdown-divider {
                height: 1px;
                background: var(--st-gray-light);
                margin: 6px 0;
            }
            
            .st-dropdown-empty {
                padding: 20px;
                text-align: center;
                color: var(--st-gray);
                font-size: 14px;
            }
            .st-dropdown {
            width: 650px;
            max-width: 90vw;
            }

            .st-dropdown-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            width: 100%;
            }
            /* 1. Fix the dropdown containers: width and hover 'bridge' gap */
#stDropdown_categories, 
#stDropdown_brands, 
#stDropdown_products {
    width: 650px !important;
    max-width: 95vw !important;
    
    /* Move closer and bridge the gap to prevent closing on hover */
    top: 100% !important;
    padding-top: 25px !important;
    margin-top: -10px !important;
    
    /* Ensure mouse interaction is allowed */
    pointer-events: auto !important;
}

/* 2. Force the grids inside to display in 3 columns */
#stDropdownGrid_categories,
#stDropdownGrid_brands,
#stDropdownGrid_products {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 15px !important;
    width: 100% !important;
}

/* 3. Ensure the dropdowns stay visible when hovering over the parent menu item */
.st-nav-item:hover #stDropdown_categories,
.st-nav-item:hover #stDropdown_brands,
.st-nav-item:hover #stDropdown_products {
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
}
                        
            /* Scrollbar styling */
            .st-dropdown::-webkit-scrollbar {
                width: 4px;
            }
            .st-dropdown::-webkit-scrollbar-track {
                background: transparent;
            }
            .st-dropdown::-webkit-scrollbar-thumb {
                background: var(--st-gray-light);
                border-radius: 4px;
            }
            
            .st-nav-link {
                padding: 10px 18px;
                border-radius: var(--st-radius-sm);
                text-decoration: none;
                color: var(--st-dark-secondary);
                font-weight: 500;
                font-size: 14px;
                transition: var(--st-transition);
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                background: none;
                border: none;
                font-family: inherit;
            }
            
            .st-nav-link i {
                font-size: 14px;
                opacity: 0.7;
            }
            
            .st-nav-link:hover {
                background: rgba(108, 60, 225, 0.08);
                color: var(--st-primary);
            }
            
            .st-nav-link.active {
                color: var(--st-primary);
                background: rgba(108, 60, 225, 0.1);
            }
            
            /* ----- Dropdown ----- */
            .st-dropdown {
                position: absolute;
                top: calc(100% + 8px);
                left: 50%;
                transform: translateX(-50%) translateY(10px);
                background: var(--st-white);
                border-radius: var(--st-radius-lg);
                box-shadow: var(--st-shadow-xl);
                padding: 16px;
                min-width: 240px;
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
                transition: var(--st-transition);
                border: 1px solid rgba(226, 232, 240, 0.5);
            }
            
            .st-nav-item:hover .st-dropdown {
                opacity: 1;
                visibility: visible;
                pointer-events: all;
                transform: translateX(-50%) translateY(0);
            }
            
            .st-dropdown::before {
                content: '';
                position: absolute;
                top: -6px;
                left: 50%;
                transform: translateX(-50%) rotate(45deg);
                width: 12px;
                height: 12px;
                background: var(--st-white);
                border-top: 1px solid rgba(226, 232, 240, 0.5);
                border-left: 1px solid rgba(226, 232, 240, 0.5);
            }
            
            .st-dropdown-item {
                display: block;
                padding: 10px 14px;
                border-radius: var(--st-radius-sm);
                color: var(--st-dark-secondary);
                text-decoration: none;
                font-size: 14px;
                font-weight: 500;
                transition: var(--st-transition);
            }
            
            .st-dropdown-item:hover {
                background: rgba(108, 60, 225, 0.08);
                color: var(--st-primary);
            }
            
            /* ----- Right Section (Desktop) ----- */
            .st-header-right {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-shrink: 0;
            }
            
            /* ----- Search ----- */
            .st-search-wrapper {
                position: relative;
            }
            
            .st-search-input {
                padding: 10px 16px 10px 40px;
                border: 2px solid var(--st-gray-light);
                border-radius: var(--st-radius-xl);
                font-size: 14px;
                font-weight: 500;
                outline: none;
                transition: var(--st-transition);
                width: 200px;
                background: var(--st-white);
                font-family: inherit;
            }
            
            .st-search-input:focus {
                border-color: var(--st-primary);
                box-shadow: 0 0 0 4px var(--st-primary-glow);
                width: 260px;
            }
            
            .st-search-icon {
                position: absolute;
                left: 14px;
                top: 50%;
                transform: translateY(-50%);
                color: var(--st-gray);
                pointer-events: none;
            }
            
            /* ----- Action Buttons (Desktop) ----- */
            .st-action-btn {
                position: relative;
                padding: 10px 14px;
                border: none;
                background: none;
                border-radius: var(--st-radius-sm);
                cursor: pointer;
                transition: var(--st-transition);
                color: var(--st-dark-secondary);
                font-size: 18px;
                display: flex;
                align-items: center;
                gap: 6px;
                font-family: inherit;
                font-weight: 500;
            }
            
            .st-action-btn:hover {
                background: rgba(108, 60, 225, 0.08);
                color: var(--st-primary);
            }
            
            .st-action-btn .st-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                background: var(--st-primary);
                color: white;
                font-size: 11px;
                font-weight: 700;
                min-width: 20px;
                height: 20px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0 5px;
                box-shadow: 0 2px 8px var(--st-primary-glow);
            }
            
            /* ----- Account Button ----- */
            .st-account-btn {
                padding: 8px 12px;
                border: none;
                background: none;
                border-radius: var(--st-radius-sm);
                cursor: pointer;
                transition: var(--st-transition);
                display: flex;
                align-items: center;
                gap: 8px;
                font-family: inherit;
                font-size: 14px;
                font-weight: 500;
                color: var(--st-dark-secondary);
            }
            
            .st-account-btn:hover {
                background: rgba(108, 60, 225, 0.08);
                color: var(--st-primary);
            }
            
            .st-account-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--st-primary), var(--st-primary-dark));
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
                font-size: 14px;
            }
            
            /* ----- Account Dropdown ----- */
            .st-account-dropdown {
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                background: var(--st-white);
                border-radius: var(--st-radius-lg);
                box-shadow: var(--st-shadow-xl);
                padding: 16px;
                min-width: 260px;
                border: 1px solid rgba(226, 232, 240, 0.5);
                opacity: 0;
                visibility: hidden;
                transform: translateY(10px);
                transition: var(--st-transition);
            }
            
            .st-account-dropdown.open {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            
            .st-account-dropdown-header {
                text-align: center;
                padding-bottom: 12px;
                border-bottom: 1px solid var(--st-gray-light);
            }
            
            .st-account-dropdown-header .st-avatar-large {
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--st-primary), var(--st-primary-dark));
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
                font-size: 24px;
                margin: 0 auto 8px;
            }
            
            .st-account-dropdown-header .st-name {
                font-weight: 700;
                color: var(--st-dark);
            }
            
            .st-account-dropdown-header .st-email {
                font-size: 12px;
                color: var(--st-gray);
            }
            
            .st-account-dropdown-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 12px;
                border: none;
                background: none;
                width: 100%;
                border-radius: var(--st-radius-sm);
                cursor: pointer;
                transition: var(--st-transition);
                font-family: inherit;
                font-size: 14px;
                font-weight: 500;
                color: var(--st-dark-secondary);
                text-align: left;
            }
            
            .st-account-dropdown-item:hover {
                background: rgba(108, 60, 225, 0.08);
                color: var(--st-primary);
            }
            
            .st-account-dropdown-item.danger:hover {
                background: rgba(239, 68, 68, 0.08);
                color: #EF4444;
            }
            
            .st-account-dropdown-item i {
                width: 20px;
                opacity: 0.7;
            }
            
            .st-account-dropdown-item .hidden {
                display: none;
            }
            
            /* ============================================
               MOBILE BOTTOM NAVIGATION
               ============================================ */
            .st-mobile-bottom-nav {
                display: none;
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: 9999;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px) saturate(180%);
                border-top: 1px solid rgba(226, 232, 240, 0.6);
                padding: 8px 0 env(safe-area-inset-bottom, 8px);
                box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.06);
            }
            
            .st-mobile-bottom-nav .st-nav-items {
                display: flex;
                align-items: center;
                justify-content: space-around;
                max-width: 500px;
                margin: 0 auto;
            }
            
            .st-mobile-bottom-nav .st-nav-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;
                padding: 4px 12px;
                border: none;
                background: none;
                cursor: pointer;
                transition: var(--st-transition);
                font-family: inherit;
                color: var(--st-gray);
                position: relative;
                min-width: 56px;
                text-decoration: none;
            }
            
            .st-mobile-bottom-nav .st-nav-item .st-icon-wrap {
                position: relative;
                font-size: 22px;
                transition: var(--st-transition);
            }
            
            .st-mobile-bottom-nav .st-nav-item .st-label {
                font-size: 10px;
                font-weight: 600;
                transition: var(--st-transition);
            }
            
            .st-mobile-bottom-nav .st-nav-item.active {
                color: var(--st-primary);
            }
            
            .st-mobile-bottom-nav .st-nav-item.active .st-icon-wrap {
                transform: scale(1.05);
            }
            
            .st-mobile-bottom-nav .st-nav-item .st-badge {
                position: absolute;
                top: -6px;
                right: -10px;
                background: var(--st-primary);
                color: white;
                font-size: 10px;
                font-weight: 700;
                min-width: 18px;
                height: 18px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0 4px;
                box-shadow: 0 2px 8px var(--st-primary-glow);
            }
            
            .st-mobile-bottom-nav .st-nav-item .st-avatar-small {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--st-primary), var(--st-primary-dark));
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
                font-size: 12px;
            }
            
            /* ----- Mobile Top Bar (Logo + Search) ----- */
            .st-mobile-topbar {
                display: none;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                width: 100%;
            }
            
            .st-mobile-topbar .st-brand {
                flex-shrink: 0;
            }
            
            .st-mobile-topbar .st-brand-icon {
                width: 36px;
                height: 36px;
                font-size: 16px;
            }
            
            .st-mobile-topbar .st-brand-text {
                font-size: 18px;
            }
            
            .st-mobile-topbar .st-search-wrapper {
                flex: 1;
                max-width: 200px;
            }
            
            .st-mobile-topbar .st-search-input {
                width: 100%;
                padding: 8px 12px 8px 34px;
                font-size: 13px;
                border-radius: var(--st-radius-xl);
            }
            
            .st-mobile-topbar .st-search-input:focus {
                width: 100%;
            }
            
            .st-mobile-topbar .st-search-icon {
                left: 10px;
                font-size: 14px;
            }
            
            .st-mobile-toggle-bar {
                padding: 8px 12px;
                border: none;
                background: none;
                font-size: 24px;
                cursor: pointer;
                color: var(--st-dark);
                border-radius: var(--st-radius-sm);
                transition: var(--st-transition);
            }
            
            .st-mobile-toggle-bar:hover {
                background: rgba(108, 60, 225, 0.08);
                color: var(--st-primary);
            }
            /* Hide on desktop (screens wider than 1024px) */
@media (min-width: 1025px) {
  button#stMobileToggle {
    display: none !important;
  }
}

/* Ensure it is visible on mobile/tablet (screens 1024px and below) */
@media (max-width: 1024px) {
  button#stMobileToggle {
    display: none !important;
  }
}
            /* ============================================
               MOBILE DRAWER
               ============================================ */
            .st-mobile-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 9998;
                opacity: 0;
                visibility: hidden;
                transition: var(--st-transition);
                backdrop-filter: blur(4px);
            }
            
            .st-mobile-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            
            .st-mobile-drawer {
                position: fixed;
                top: 0;
                left: -320px;
                width: 320px;
                max-width: 85vw;
                height: 100vh;
                background: var(--st-white);
                z-index: 10001;
                transition: var(--st-transition);
                box-shadow: var(--st-shadow-xl);
                overflow-y: auto;
                padding: 20px;
                padding-bottom: 100px;
            }
            
            .st-mobile-drawer.open {
                left: 0;
            }
            
            .st-mobile-drawer-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding-bottom: 16px;
                border-bottom: 1px solid var(--st-gray-light);
                margin-bottom: 16px;
            }
            
            .st-mobile-drawer-brand {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .st-mobile-drawer-brand .st-brand-icon {
                width: 36px;
                height: 36px;
                font-size: 16px;
            }
            
            .st-mobile-drawer-brand .st-brand-text {
                font-size: 18px;
            }
            
            .st-mobile-close {
                padding: 8px 12px;
                border: none;
                background: none;
                font-size: 28px;
                cursor: pointer;
                color: var(--st-dark);
                border-radius: var(--st-radius-sm);
                transition: var(--st-transition);
            }
            
            .st-mobile-close:hover {
                background: rgba(239, 68, 68, 0.08);
                color: #EF4444;
            }
            
            .st-mobile-nav-list {
                list-style: none;
                margin-bottom: 20px;
            }
            
            .st-mobile-nav-item {
                border-bottom: 1px solid var(--st-gray-light);
            }
            
            .st-mobile-nav-link {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px 12px;
                text-decoration: none;
                color: var(--st-dark-secondary);
                font-weight: 500;
                font-size: 16px;
                transition: var(--st-transition);
                border: none;
                background: none;
                width: 100%;
                cursor: pointer;
                font-family: inherit;
            }
            
            .st-mobile-nav-link:hover {
                background: rgba(108, 60, 225, 0.08);
                color: var(--st-primary);
                border-radius: var(--st-radius-sm);
            }
            
            .st-mobile-nav-link i {
                width: 24px;
                opacity: 0.7;
            }
            
            /* ============================================
               LOGIN / REGISTER MODAL
               ============================================ */
            .st-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(8px);
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: var(--st-transition);
                padding: 20px;
            }
            
            .st-modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            
            .st-modal {
                background: var(--st-white);
                border-radius: var(--st-radius-xl);
                max-width: 440px;
                width: 100%;
                padding: 40px 32px;
                transform: scale(0.95) translateY(20px);
                transition: var(--st-transition);
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
            }
            
            .st-modal-overlay.active .st-modal {
                transform: scale(1) translateY(0);
            }
            
            .st-modal-close {
                position: absolute;
                top: 16px;
                right: 16px;
                padding: 8px;
                border: none;
                background: none;
                font-size: 24px;
                cursor: pointer;
                color: var(--st-gray);
                border-radius: var(--st-radius-sm);
                transition: var(--st-transition);
            }
            
            .st-modal-close:hover {
                background: rgba(239, 68, 68, 0.08);
                color: #EF4444;
            }
            
            .st-modal-icon {
                width: 64px;
                height: 64px;
                background: linear-gradient(135deg, var(--st-primary), var(--st-primary-dark));
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px;
                color: white;
                font-size: 28px;
                box-shadow: 0 8px 24px var(--st-primary-glow);
            }
            
            .st-modal-title {
                text-align: center;
                font-size: 24px;
                font-weight: 800;
                color: var(--st-dark);
                margin-bottom: 8px;
            }
            
            .st-modal-subtitle {
                text-align: center;
                color: var(--st-gray);
                font-size: 14px;
                margin-bottom: 24px;
            }
            
            .st-form-group {
                margin-bottom: 16px;
            }
            
            .st-form-label {
                display: block;
                font-weight: 600;
                font-size: 13px;
                color: var(--st-dark-secondary);
                margin-bottom: 4px;
            }
            
            .st-form-input {
                width: 100%;
                padding: 12px 16px;
                border: 2px solid var(--st-gray-light);
                border-radius: var(--st-radius-sm);
                font-size: 14px;
                font-weight: 500;
                transition: var(--st-transition);
                outline: none;
                font-family: inherit;
                background: var(--st-white);
            }
            
            .st-form-input:focus {
                border-color: var(--st-primary);
                box-shadow: 0 0 0 4px var(--st-primary-glow);
            }
            
            .st-form-input.error {
                border-color: #EF4444;
                box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
            }
            
            .st-form-error {
                color: #EF4444;
                font-size: 12px;
                font-weight: 500;
                margin-top: 4px;
                display: none;
            }
            
            .st-form-error.visible {
                display: block;
            }
            
            .st-btn-primary {
                width: 100%;
                padding: 14px;
                background: linear-gradient(135deg, var(--st-primary), var(--st-primary-dark));
                color: white;
                border: none;
                border-radius: var(--st-radius-sm);
                font-weight: 700;
                font-size: 16px;
                cursor: pointer;
                transition: var(--st-transition);
                font-family: inherit;
                box-shadow: 0 4px 12px var(--st-primary-glow);
            }
            
            .st-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px var(--st-primary-glow);
            }
            
            .st-btn-primary:active {
                transform: translateY(0);
            }
            
            .st-btn-primary:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            
            .st-modal-footer {
                text-align: center;
                margin-top: 16px;
                font-size: 14px;
                color: var(--st-gray);
            }
            
            .st-modal-footer .st-link {
                color: var(--st-primary);
                font-weight: 600;
                cursor: pointer;
                transition: var(--st-transition);
                background: none;
                border: none;
                font-family: inherit;
                font-size: 14px;
            }
            
            .st-modal-footer .st-link:hover {
                color: var(--st-primary-dark);
                text-decoration: underline;
            }
            
            /* ============================================
               RESPONSIVE
               ============================================ */
            @media (max-width: 1024px) {
                .st-search-input {
                    width: 140px;
                }
                .st-search-input:focus {
                    width: 180px;
                }
                .st-nav-link {
                    padding: 8px 12px;
                    font-size: 13px;
                }
            }
            
            @media (max-width: 768px) {
                .st-topbar {
                    padding: 10px 16px;
                    height: 62px;
                }
                
                .st-nav-desktop {
                    display: none !important;
                }
                .st-header-desktop {
                    display: none !important;
                }
                .st-header-right {
                    display: none !important;
                }
                
                .st-mobile-topbar {
                    display: flex !important;
                }
                .st-mobile-bottom-nav {
                    display: block !important;
                }
                
                .st-brand-text {
                    font-size: 18px;
                }
                
                .st-brand-icon {
                    width: 36px;
                    height: 36px;
                    font-size: 16px;
                }
                
                .st-modal {
                    padding: 28px 20px;
                    max-width: 100%;
                    margin: 10px;
                }
                
                body {
                    padding-bottom: 70px;
                }
            }
            
            @media (max-width: 480px) {
                .st-topbar {
                    padding: 8px 12px;
                    height: 56px;
                }
                
                .st-brand-text {
                    font-size: 15px;
                }
                
                .st-brand-icon {
                    width: 32px;
                    height: 32px;
                    font-size: 14px;
                }
                
                .st-mobile-topbar .st-search-input {
                    font-size: 12px;
                    padding: 6px 10px 6px 28px;
                }
                
                .st-mobile-topbar .st-search-icon {
                    font-size: 12px;
                    left: 8px;
                }
                
                .st-mobile-drawer {
                    width: 280px;
                    padding: 16px;
                }
                
                .st-mobile-bottom-nav .st-nav-item {
                    padding: 2px 8px;
                    min-width: 44px;
                }
                
                .st-mobile-bottom-nav .st-nav-item .st-icon-wrap {
                    font-size: 18px;
                }
                
                .st-mobile-bottom-nav .st-nav-item .st-label {
                    font-size: 9px;
                }
            }
                /* Enhanced "Official" Button Style for Nav Items */
#stMobileNavList li, 
#stMobileWishlistBtn, 
#andstMyOrdersBtn, 
#andstSettingsBtn {
    margin: 6px 16px !important;
    padding: 14px 18px !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 12px !important;
    background-color: #ffffff !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02) !important;
    color: #1e293b !important;
    font-weight: 500 !important;
    width: calc(100% - 32px) !important;
    transition: all 0.2s ease;
}

#stMobileNavList li:active, 
#stMobileWishlistBtn:active {
    background-color: #f8fafc !important;
    transform: scale(0.98);
}

/* Neat Wishlist Number Badge */
#stMobileWishlistCount {
    background-color: #0f172a !important; /* Professional Dark Navy */
    color: #ffffff !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    min-width: 22px !important;
    height: 22px !important;
    border-radius: 20px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 6px !important;
    margin-left: auto !important;
    line-height: 1 !important;
}
/* Country code dropdown styling */
#stRegisterCountryCode {
    appearance: auto;
    cursor: pointer;
    background-color: white;
    border: 2px solid #E2E8F0;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    color: #0F172A;
    transition: all 0.2s ease;
}

#stRegisterCountryCode:focus {
    border-color: #6C3CE1;
    box-shadow: 0 0 0 4px rgba(108, 60, 225, 0.1);
}

#stRegisterCountryCode option {
    padding: 8px;
}

/* Country dropdown */
#stRegisterCountry {
    appearance: auto;
    cursor: pointer;
}

/* Better checkbox styling */
#stRegisterTerms {
    accent-color: #6C3CE1;
    cursor: pointer;
}
/* Drawer Structure */
#stMobileDrawer {
    border-right: 1px solid #cbd5e1 !important;
    background-color: #fcfcfd !important;
}
/* Brand Primary & Premium Drawer Styling */
:root {
    --brand-primary: #6c3ce1;
    --brand-soft: #f4f0ff;
}

/* Badge with Brand Color */
#stMobileWishlistCount {
    background-color: var(--brand-primary) !important;
    box-shadow: 0 2px 8px rgba(108, 60, 225, 0.3) !important;
}

/* Icons styling */
#stMobileDrawer i {
    color: var(--brand-primary) !important;
    font-size: 18px;
    margin-right: 12px;
}

/* Premium Button Cards */
#stMobileNavList li, 
#stMobileWishlistBtn, 
#andstMyOrdersBtn, 
#andstSettingsBtn {
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%) !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 12px !important;
    margin: 8px 16px !important;
    padding: 14px 16px !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.03) !important;
}

/* Highlight active state */
#stMobileNavList li:hover,
#stMobileNavList li:active {
    border-color: var(--brand-primary) !important;
    background: var(--brand-soft) !important;
}
#stMobileWishlistCount {
  background-color: rgb(108, 60, 225);
}

#stMobileNavList li {
  border: 1px solid rgb(226, 232, 240);
  background: linear-gradient(rgb(255, 255, 255), rgb(248, 250, 252));
  box-shadow: rgba(0, 0, 0, 0.02) 0px 2px 4px;
  margin-bottom: 10px;
}

#stMobileNavList li {
  border: 1px solid rgb(226, 232, 240);
  background: linear-gradient(rgb(255, 255, 255), rgb(248, 250, 252));
  box-shadow: rgba(0, 0, 0, 0.02) 0px 2px 4px;
  margin-bottom: 10px;
}

#stMobileNavList li {
  border: 1px solid rgb(226, 232, 240);
  background: linear-gradient(rgb(255, 255, 255), rgb(248, 250, 252));
  box-shadow: rgba(0, 0, 0, 0.02) 0px 2px 4px;
  margin-bottom: 10px;
}

#stMobileNavList li {
  border: 1px solid rgb(226, 232, 240);
  background: linear-gradient(rgb(255, 255, 255), rgb(248, 250, 252));
  box-shadow: rgba(0, 0, 0, 0.02) 0px 2px 4px;
  margin-bottom: 10px;
}

#stMobileWishlistBtn {
  border: 1px solid rgb(226, 232, 240);
  background: linear-gradient(rgb(255, 255, 255), rgb(248, 250, 252));
  box-shadow: rgba(0, 0, 0, 0.02) 0px 2px 4px;
  margin-bottom: 10px;
}

#andstMyOrdersBtn {
  border: 1px solid rgb(226, 232, 240);
  background: linear-gradient(rgb(255, 255, 255), rgb(248, 250, 252));
  box-shadow: rgba(0, 0, 0, 0.02) 0px 2px 4px;
  margin-bottom: 10px;
}

#andstSettingsBtn {
  border: 1px solid rgb(226, 232, 240);
  background: linear-gradient(rgb(255, 255, 255), rgb(248, 250, 252));
  box-shadow: rgba(0, 0, 0, 0.02) 0px 2px 4px;
  margin-bottom: 10px;
}

.st-mobile-nav-link i {
  color: rgb(108, 60, 225);
  opacity: 0.8;
  margin-right: 4px;
}

.st-mobile-nav-link i {
  color: rgb(108, 60, 225);
  opacity: 0.8;
  margin-right: 4px;
}

.st-mobile-nav-link i {
  color: rgb(108, 60, 225);
  opacity: 0.8;
  margin-right: 4px;
}

.st-mobile-nav-link i {
  color: rgb(108, 60, 225);
  opacity: 0.8;
  margin-right: 4px;
}

i.fas.fa-heart {
  color: rgb(108, 60, 225);
  opacity: 0.8;
  margin-right: 4px;
}

.st-account-dropdown-item i {
  color: rgb(108, 60, 225);
  opacity: 0.8;
  margin-right: 4px;
}
#stMobileDrawer {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.st-mobile-drawer-body {
  flex: 1 1 0%;
  overflow-y: auto;
  height: auto;
}
.st-mobile-nav-link i {
  color: rgb(108, 60, 225);
  opacity: 0.8;
  margin-right: 4px;
}

.st-mobile-nav-link i {
  color: rgb(108, 60, 225);
  opacity: 0.8;
  margin-right: 4px;
}

.st-account-dropdown-item i {
  color: rgb(108, 60, 225);
  opacity: 0.8;
  margin-right: 4px;
}

.st-account-dropdown-item i {
  color: rgb(108, 60, 225);
  opacity: 0.8;
  margin-right: 4px;
}
footer { background: #0f172a; color: #e2e8f0; padding: 40px 30px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: 30px; margin-top: 40px; }
  
.st-notification-modal {
            position: fixed;
            top: 0;
            right: -420px;
            width: 420px;
            max-width: 90vw;
            height: 100vh;
            background: white;
            z-index: 10002;
            transition: right 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: -8px 0 40px rgba(0,0,0,0.12);
            display: flex;
            flex-direction: column;
        }

        .st-notification-modal.open {
            right: 0;
        }

        .st-notification-modal .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 18px 24px;
            border-bottom: 1px solid #E2E8F0;
            flex-shrink: 0;
            background: white;
        }

        .st-notification-modal .modal-header h2 {
            font-size: 18px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .st-notification-modal .modal-header h2 i {
            color: #6C3CE1;
        }

        .st-notification-modal .modal-header .close-btn {
            padding: 8px;
            border: none;
            background: none;
            font-size: 24px;
            cursor: pointer;
            color: #94A3B8;
            transition: color 0.2s ease;
        }

        .st-notification-modal .modal-header .close-btn:hover {
            color: #EF4444;
        }

        .st-notification-modal .modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 12px 20px 20px;
        }

        .st-notification-modal .modal-body::-webkit-scrollbar {
            width: 4px;
        }
        .st-notification-modal .modal-body::-webkit-scrollbar-thumb {
            background: #E2E8F0;
            border-radius: 4px;
        }

        .notification-item {
            display: flex;
            gap: 12px;
            padding: 12px 14px;
            border-radius: 12px;
            transition: background 0.2s ease;
            cursor: pointer;
            border-bottom: 1px solid #f1f5f9;
            position: relative;
            align-items: flex-start;
        }

        .notification-item:hover {
            background: #f8fafc;
        }

        .notification-item.unread {
            background: #f8fafc;
        }

        .notification-item .notif-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-size: 16px;
        }

        .notification-item .notif-icon.success {
            background: rgba(16, 185, 129, 0.1);
            color: #10B981;
        }

        .notification-item .notif-icon.info {
            background: rgba(59, 130, 246, 0.1);
            color: #3B82F6;
        }

        .notification-item .notif-icon.warning {
            background: rgba(245, 158, 11, 0.1);
            color: #F59E0B;
        }

        .notification-item .notif-icon.deal {
            background: rgba(239, 68, 68, 0.1);
            color: #EF4444;
        }

        .notification-item .notif-image {
            width: 48px;
            height: 48px;
            border-radius: 8px;
            overflow: hidden;
            flex-shrink: 0;
            background: #f1f5f9;
        }

        .notification-item .notif-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .notification-item .notif-content {
            flex: 1;
            min-width: 0;
        }

        .notification-item .notif-content .notif-title {
            font-weight: 600;
            font-size: 14px;
            color: #0F172A;
        }

        .notification-item .notif-content .notif-text {
            font-size: 13px;
            color: #64748B;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .notification-item .notif-content .notif-time {
            font-size: 11px;
            color: #94A3B8;
            margin-top: 2px;
        }

        .notification-item .notif-unread-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #6C3CE1;
            flex-shrink: 0;
            margin-top: 8px;
        }

        .notification-item .notif-delete {
            border: none;
            background: none;
            color: #94A3B8;
            cursor: pointer;
            font-size: 12px;
            padding: 4px;
            opacity: 0;
            transition: opacity 0.2s ease;
            flex-shrink: 0;
            margin-top: 4px;
        }

        .notification-item:hover .notif-delete {
            opacity: 1;
        }

        .notification-item .notif-delete:hover {
            color: #EF4444;
        }

        .notification-empty {
            text-align: center;
            padding: 40px 20px;
            color: #94A3B8;
        }

        .notification-empty i {
            font-size: 48px;
            color: #E2E8F0;
            display: block;
            margin-bottom: 12px;
        }

        .notification-mark-all {
            border: none;
            background: none;
            color: #6C3CE1;
            font-weight: 600;
            font-size: 12px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 6px;
            transition: background 0.2s ease;
            font-family: inherit;
        }

        .notification-mark-all:hover {
            background: rgba(108, 60, 225, 0.08);
        }

        .notification-clear-all {
            border: none;
            background: none;
            color: #94A3B8;
            font-weight: 500;
            font-size: 12px;
            cursor: pointer;
            padding: 6px 12px;
            border-radius: 6px;
            transition: all 0.2s ease;
            font-family: inherit;
        }

        .notification-clear-all:hover {
            color: #EF4444;
            background: rgba(239, 68, 68, 0.08);
        }

        /* Notification Overlay */
        .st-notification-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.3);
            z-index: 10001;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            backdrop-filter: blur(4px);
        }

        .st-notification-overlay.active {
            opacity: 1;
            visibility: visible;
        }

        /* Toast notification */
        .st-notif-toast {
            position: fixed;
            top: 90px;
            right: 24px;
            max-width: 380px;
            width: 100%;
            background: white;
            border-radius: 16px;
            padding: 16px 20px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.15);
            border-left: 4px solid #6C3CE1;
            z-index: 30001;
            animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: 'Inter', sans-serif;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        @keyframes slideInRight {
            from { transform: translateX(100px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        @media (max-width: 768px) {
            .st-notification-modal {
                width: 100%;
                max-width: 100%;
                right: -100%;
                border-radius: 0;
            }

            .st-notification-modal.open {
                right: 0;
            }

            .st-notif-toast {
                top: 76px;
                right: 12px;
                left: 12px;
                max-width: 100%;
                width: auto;
                border-radius: 12px;
            }
        }
        #stMobileNotificationBtn {
        position: relative;
        cursor: pointer;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        i.fas.fa-bell {
        font-size: 20px;
        color: rgb(74, 85, 104);
        }

        #stMobileNotificationCount {
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        top: 0px;
        right: 0px;
        background-color: rgb(239, 68, 68);
        color: white;
        border-radius: 9999px;
        min-width: 18px;
        height: 18px;
        padding: 0px 4px;
        font-weight: bold;
        border: 2px solid white;
        }@media (max-width: 991px) {
  @keyframes abbreviateBrand {
    0%, 70% { max-width: 400px; }
    100% { max-width: 65px; }
  }

  @keyframes fadeHighlight {
    0%, 70% { opacity: 1; }
    100% { opacity: 0; }
  }

  .st-brand-text {
    display: inline-block !important;
    vertical-align: middle;
    overflow: hidden;
    white-space: nowrap;
    animation: abbreviateBrand 3s forwards ease-in-out;
  }

  .st-brand-highlight {
    display: inline-block;
    animation: fadeHighlight 3s forwards ease-in-out;
  }
}
        </style>
        
        <!-- ============================================
             TOPBAR
             ============================================ -->
        <header class="st-topbar" id="stTopbar">
            <!-- Desktop Layout -->
            <div class="st-header-desktop" style="display:flex;align-items:center;justify-content:space-between;width:100%;">
                <!-- Brand -->
                <a href="/" class="st-brand">
                    <div class="st-brand-icon">${HEADER_CONFIG.logoText}</div>
                    <div class="st-brand-text">${HEADER_CONFIG.shopName}</div>
                </a>
                
                <!-- Desktop Navigation -->
                <nav class="st-nav-desktop" id="stNavDesktop">
                    <ul class="st-nav-list">
                        ${HEADER_CONFIG.navLinks.map(link => `
                            <li class="st-nav-item">
                                <a href="${link.href}" class="st-nav-link ${link.dropdown ? 'has-dropdown' : ''}" data-translate="${link['data-translate'] || ''}">
                                    <i class="fas ${link.icon}"></i> ${link.label}
                                </a>
                                ${link.dropdown ? `
                                    <div class="st-dropdown" id="stDropdown_${link.dropdownType || 'products'}">
                                        <div class="st-dropdown-header">
                                            <h3 data-translate="${link['data-translate'] || ''}">${link.label}</h3>
                                            <a href="${link.href}" class="st-view-all" data-translate="view_all">View All →</a>
                                        </div>
                                        <div class="st-dropdown-grid" id="stDropdownGrid_${link.dropdownType || 'products'}">
                                            <!-- Will be populated dynamically -->
                                            <div class="st-dropdown-empty" data-translate="loading">Loading...</div>
                                        </div>
                                    </div>
                                ` : ''}
                            </li>
                        `).join('')}
                    </ul>
                </nav>
                
                <!-- Desktop Right Section -->
                <div class="st-header-right">
                    <!-- Search -->
                       <form action="/search" method="GET" role="search">
                    <div class="st-search-wrapper">

                        <i class="fas fa-search st-search-icon"></i>
                        <input name="query" type="search" class="st-search-input" id="stSearchInput" 
                               placeholder="Search..." autocomplete="off" data-translate-placeholder="search_placeholder">
                    </div>
                     </div>
                    
                    <!-- Wishlist -->
                    <button class="st-action-btn" id="stWishlistBtn">
                        <i class="fas fa-heart"></i>
                        <span class="st-badge" id="stWishlistCount">0</span>
                    </button>
                    
                    <!-- Cart -->
                    <button class="st-action-btn" id="stCartBtn">
                        <i class="fas fa-shopping-bag"></i>
                        <span class="st-badge" id="stCartCount">0</span>
                    </button>
                    
                    <!-- Account -->
                    <div class="st-nav-item" style="position:relative;">
                        <button class="st-account-btn" id="stAccountBtn">
                            <div class="st-account-avatar" id="stAccountAvatar">G</div>
                            <i class="fas fa-chevron-down" style="font-size:12px;opacity:0.5;"></i>
                        </button>
                        
                        <!-- Account Dropdown -->
                        <div class="st-account-dropdown" id="stAccountDropdown">
                            <div class="st-account-dropdown-header">
                                <div class="st-avatar-large" id="stDropdownAvatar">G</div>
                                <div class="st-name" id="stDropdownName" data-translate="guest">Guest</div>
                                <div class="st-email" id="stDropdownEmail"></div>
                            </div>
                            <div style="padding-top:12px;">
                                <button class="st-account-dropdown-item" id="stMyOrdersBtn">
                                    <i class="fas fa-shopping-bag"></i> <span data-translate="my_orders">My Orders</span>
                                </button>
                                <button class="st-account-dropdown-item" id="stSettingsBtn">
                                    <i class="fas fa-cog"></i> <span data-translate="settings">Settings</span>
                                </button>
                                <button class="st-account-dropdown-item danger" id="stLogoutBtn" style="display:none;" >
                                    <i class="fas fa-sign-out-alt"></i> <span data-translate="logout">Logout</span>
                                </button>
                                <button class="st-account-dropdown-item" id="stAboutUsBtn" onclick="window.location.href='/AboutUs'" >
                                    <i class="fa fa-info-circle"></i> <span data-translate="about_us">About Us</span>
                                </button>
                                <button class="st-account-dropdown-item" id="stTermsBtn" onclick="window.location.href='/Terms'">
                                    <i class="fa fa-file-text"></i> <span data-translate="terms">Terms & Conditions</span>
                                </button>
                                <button class="st-account-dropdown-item" id="stContactBtn" onclick="window.location.href='/contactus'">
                                    <i class="fa fa-map-marker"></i> <span data-translate="locate_us">Locate Us</span>
                                </button>
                            </div>

                            <div id="stAuthButtons" style="padding-top:12px;border-top:1px solid var(--st-gray-light);margin-top:4px;">
                                <button class="st-account-dropdown-item" id="stLoginBtn">
                                    <i class="fas fa-sign-in-alt"></i> <span data-translate="login">Login</span>
                                </button>
                                <button class="st-account-dropdown-item" id="stRegisterBtn">
                                    <i class="fas fa-user-plus"></i> <span data-translate="register">Register</span>
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
            
            <!-- ============================================
                 MOBILE TOP BAR
                 ============================================ -->
            <div class="st-mobile-topbar">
                <a href="/" class="st-brand">
                    <div class="st-brand-icon">${HEADER_CONFIG.logoText}</div>
                    <div class="st-brand-text">${HEADER_CONFIG.shopName}</div>
                </a>
                <div class="st-search-wrapper">
                    <i class="fas fa-search st-search-icon"></i>
                    <input type="search" class="st-search-input" id="stMobileSearchInput" 
                        placeholder="Search..." autocomplete="off" readonly="readonly" data-translate-placeholder="search_placeholder">
                </div>
                <span class="st-icon-wrap" id="stMobileNotificationBtn"">
                    <i class="fas fa-bell"></i>
                    <span class="st-badge" id="stMobileNotificationCount" style="background:#EF4444;font-size:9px;min-width:18px;height:18px;top:-6px;right:-10px;display:none;">0</span>
                </span>
                
                <button class="st-mobile-toggle-bar" id="stMobileToggle">
                    <i class="fas fa-bars"></i>
                </button>
            </div>
        </header>
        
        <!-- ============================================
             MOBILE BOTTOM NAVIGATION
             ============================================ -->
        <nav class="st-mobile-bottom-nav" id="stMobileBottomNav">
            <div class="st-nav-items">
                <a href="/index.html" class="st-nav-item active" >
                    <span class="st-icon-wrap"><i class="fas fa-home"></i></span>
                    <span class="st-label"data-translate="home">Home</span>
                </a>
                
                <button class="st-nav-item" id="stForyouMobileWishlistBtn" >
                    <span class="st-icon-wrap">
                        <i class="fas fa-heart"></i>
                    </span>
                    <span class="st-label"data-translate="for_you">for you</span>
                </button>
                
                <button class="st-nav-item" id="stMobileCartBtn">
                    <span class="st-icon-wrap">
                        <i class="fas fa-shopping-bag"></i>
                        <span class="st-badge" id="stMobileCartCount">0</span>
                    </span>
                    <span class="st-label" data-translate="cart">Cart</span>
                </button>
                
                <button class="st-nav-item" id="stMobileAccountBtn">
                    <span class="st-icon-wrap">
                        <div class="st-avatar-small" id="stMobileAvatar">G</div>
                    </span>
                    
                </button>
            </div>
        </nav>
        
        <!-- ============================================
             MOBILE DRAWER
             ============================================ -->
        <div class="st-mobile-overlay" id="stMobileOverlay"></div>
        <div class="st-mobile-drawer" id="stMobileDrawer">
            <div class="st-mobile-drawer-header">
                <div class="st-mobile-drawer-brand">
                    <div class="st-brand-icon">${HEADER_CONFIG.logoText}</div>
                    <div class="st-brand-text">${HEADER_CONFIG.shopName}</div>
                </div>
                <button class="st-mobile-close" id="stMobileClose">&times;</button>
            </div>
            <div class="st-mobile-drawer-body">
                <ul class="st-mobile-nav-list" id="stMobileNavList">
                    ${HEADER_CONFIG.navLinks.map(link => `
                        <li class="st-mobile-nav-item">
                            <a href="${link.href}" class="st-mobile-nav-link">
                                <i class="fas ${link.icon}"></i> <span data-translate="${link['data-translate'] || ''}">${link.label}</span>
                            </a>
                        </li>
                    `).join('')}
                    <li class="st-mobile-nav-item">
                        <button onclick="window.location.href='/AboutUs'" class="btn btn-primary st-mobile-nav-btn">
                            <i class="fas fa-info-circle"></i> 
                            <span data-translate="about_us">About Us</span>
                        </button>
                    </li>
                    <li class="st-mobile-nav-item">
                        <button onclick="window.location.href='/Terms'" class="btn btn-primary st-mobile-nav-btn">
                            <i class="fas fa-file-contract"></i> 
                            <span data-translate="terms">Terms & Conditions</span>
                        </button>
                    </li>

                </ul>
                <div style="padding-top:16px;border-top:1px solid var(--st-gray-light);">
                    <button class="st-nav-item" id="stMobileWishlistBtn">
                        <span class="st-icon-wrap">
                            <i class="fas fa-heart"></i>
                            <span class="st-badge" id="stMobileWishlistCount">0</span>
                        </span>
                        <span class="st-label" data-translate="wishlist">Wishlist</span>
                    </button>
                <button class="st-account-dropdown-item" id="andstMyOrdersBtn">
                    <i class="fas fa-shopping-bag"></i> <span data-translate="my_orders">My Orders</span>
                </button>
                <button class="st-account-dropdown-item" id="andstSettingsBtn">
                <i class="fas fa-cog"></i> <span data-translate="settings">Settings</span>
                </button>
                </div>

                <div id="stLogoutactt" style="padding-top:16px;border-top:1px solid var(--st-gray-light);">
                    <button class="st-mobile-nav-link" id="stMobileLoginBtn">
                        <i class="fas fa-sign-in-alt"></i> <span data-translate="login">Login</span>
                    </button>
                    <button class="st-mobile-nav-link" id="stMobileRegisterBtn">
                        <i class="fas fa-user-plus"></i>  <span data-translate="register">Register</span>
                     </button>
                </div>
                <div style="padding-top:16px;border-top:1px solid var(--st-gray-light);">
                    <button class="st-account-dropdown-item danger" id="stAndroidLogout" style="display:none;">
                    <i class="fas fa-sign-out-alt"></i> <span data-translate="logout">Logout</span>
                    </button>
                </div>

            </div>

        </div>
        <div class="st-notification-overlay" id="stNotificationOverlay"></div>
        <div class="st-notification-modal" id="stNotificationModal">
            <div class="modal-header">
                <h2 data-translate="notifications_title"><i class="fas fa-bell"></i> Notifications</h2>
                <button class="close-btn" id="stNotificationClose">&times;</button>
            </div>
            <div class="modal-body" id="stNotificationBody">
                <!-- Will be populated by JavaScript -->
            </div>
        </div>
        
        <!-- ============================================
             LOGIN / REGISTER MODAL
             ============================================ -->
        <div class="st-modal-overlay" id="stAuthModal">
            <div class="st-modal">
                <button class="st-modal-close" id="stAuthModalClose">&times;</button>
                
                <!-- Login Form -->
                <div id="stLoginForm">
                    <div class="st-modal-icon"><i class="fas fa-sign-in-alt"></i></div>
                    <h2 class="st-modal-title" data-translate="welcome_back">Welcome Back</h2>
                    <p class="st-modal-subtitle" data-translate="login_subtitle">Login to your account</p>
                    
                    <div class="st-form-group">
                        <label class="st-form-label" data-translate="email_address">Email Address</label>
                        <input type="email" class="st-form-input" id="stLoginEmail" 
                               placeholder="you@example.com" data-translate-placeholder="email_placeholder">
                        <div class="st-form-error" id="stLoginEmailError" data-translate="email_error">Please enter a valid email</div>
                    </div>
                    
                    <div class="st-form-group">
                        <label class="st-form-label" data-translate="password">Password</label>
                        <input type="password" class="st-form-input" id="stLoginPassword" 
                               placeholder="Enter your password" data-translate-placeholder="password_placeholder">
                        <div class="st-form-error" id="stLoginPasswordError" data-translate="password_error">Password is required</div>
                    </div>
                    
                    <div class="st-form-group" style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                            <input type="checkbox" id="stLoginRemember" style="width:16px;height:16px;margin:0;"> 
                            <span style="font-size:14px;color:var(--st-gray);" data-translate="remember_me">Remember me</span>
                        </label>
                    </div>

                    <button class="st-btn-primary" id="stLoginSubmit" data-translate="login">Login</button>
                    
                    <div class="st-modal-footer">
                        <span data-translate="no_account">Don't have an account?</span> <button class="st-link" id="stSwitchToRegister" data-translate="register">Register</button>
                    </div>
                </div>
                
                <!-- Register Form -->
                <div id="stRegisterForm" style="display:none;">
                    <div class="st-modal-icon"><i class="fas fa-user-plus"></i></div>
                    <h2 class="st-modal-title" data-translate="create_account">Create Account</h2>
                    <p class="st-modal-subtitle" data-translate="join_subtitle">Join Success Technology</p>
                    
                    <!-- Full Name -->
                    <div class="st-form-group">
                        <label class="st-form-label" data-translate="full_name">Full Name <span style="color:#EF4444;">*</span></label>
                        <input type="text" class="st-form-input" id="stRegisterName" 
                            placeholder="John Doe" required data-translate-placeholder="name_placeholder">
                        <div class="st-form-error" id="stRegisterNameError" data-translate="name_error">Name is required</div>
                    </div>
                    
                    <!-- Email Address -->
                    <div class="st-form-group">
                        <label class="st-form-label" data-translate="email_address">Email Address <span style="color:#EF4444;">*</span></label>
                        <input type="email" class="st-form-input" id="stRegisterEmail" 
                            placeholder="you@example.com" required data-translate-placeholder="email_placeholder">
                        <div class="st-form-error" id="stRegisterEmailError" data-translate="email_error">Please enter a valid email</div>
                    </div>
                    
                    <!-- Password -->
                    <div class="st-form-group">
                        <label class="st-form-label" data-translate="password">Password <span style="color:#EF4444;">*</span></label>
                        <input type="password" class="st-form-input" id="stRegisterPassword" 
                            placeholder="Min 6 characters" required data-translate-placeholder="password_placeholder">
                        <div class="st-form-help" style="font-size:12px;color:#94A3B8;margin-top:4px;">
                            <i class="fas fa-info-circle"></i> <span data-translate="password_help">Password must be at least 6 characters</span>
                        </div>
                        <div class="st-form-error" id="stRegisterPasswordError" data-translate="password_error">Password must be at least 6 characters</div>
                    </div>

                    <!-- ============================================
                        NEW FIELDS: Phone, Address, Country
                        ============================================ -->
                    
                    <!-- Phone Number -->
                    <div class="st-form-group">
                        <label class="st-form-label" data-translate="phone_number">Phone Number</label>
                        <div style="display:flex;gap:8px;align-items:center;">
                            <select class="st-form-input" id="stRegisterCountryCode" 
                                    style="width:100px;flex-shrink:0;padding:12px 8px;">
                                <option value="+237">🇨🇲 +237</option>
                                <option value="+225">🇨🇮 +225</option>
                                <option value="+234">🇳🇬 +234</option>
                                <option value="+233">🇬🇭 +233</option>
                                <option value="+221">🇸🇳 +221</option>
                                <option value="+254">🇰🇪 +254</option>
                                <option value="+256">🇺🇬 +256</option>
                                <option value="+255">🇹🇿 +255</option>
                                <option value="+27">🇿🇦 +27</option>
                                <option value="+1">🇺🇸 +1</option>
                                <option value="+44">🇬🇧 +44</option>
                                <option value="+91">🇮🇳 +91</option>
                                <option value="+86">🇨🇳 +86</option>
                                <option value="+81">🇯🇵 +81</option>
                                <option value="+49">🇩🇪 +49</option>
                                <option value="+33">🇫🇷 +33</option>
                                <option value="+34">🇪🇸 +34</option>
                                <option value="+39">🇮🇹 +39</option>
                                <option value="+55">🇧🇷 +55</option>
                                <option value="+61">🇦🇺 +61</option>
                                <option value="+64">🇳🇿 +64</option>
                                <option value="+52">🇲🇽 +52</option>
                                <option value="+57">🇨🇴 +57</option>
                                <option value="+54">🇦🇷 +54</option>
                                <option value="+56">🇨🇱 +56</option>
                                <option value="+51">🇵🇪 +51</option>
                                <option value="+62">🇮🇩 +62</option>
                                <option value="+63">🇵🇭 +63</option>
                                <option value="+66">🇹🇭 +66</option>
                                <option value="+60">🇲🇾 +60</option>
                                <option value="+84">🇻🇳 +84</option>
                                <option value="+90">🇹🇷 +90</option>
                                <option value="+20">🇪🇬 +20</option>
                                <option value="+212">🇲🇦 +212</option>
                                <option value="+216">🇹🇳 +216</option>
                                <option value="+213">🇩🇿 +213</option>
                                <option value="+218">🇱🇾 +218</option>
                                <option value="+230">🇲🇺 +230</option>
                                <option value="+222">🇲🇷 +222</option>
                                <option value="+223">🇲🇱 +223</option>
                                <option value="+226">🇧🇫 +226</option>
                                <option value="+228">🇹🇬 +228</option>
                                <option value="+229">🇧🇯 +229</option>
                                <option value="+231">🇱🇷 +231</option>
                                <option value="+232">🇸🇱 +232</option>
                                <option value="+234">🇳🇬 +234</option>
                                <option value="+235">🇹🇩 +235</option>
                                <option value="+236">🇨🇫 +236</option>
                                <option value="+237">🇨🇲 +237</option>
                                <option value="+238">🇨🇻 +238</option>
                                <option value="+239">🇸🇹 +239</option>
                                <option value="+240">🇬🇶 +240</option>
                                <option value="+241">🇬🇦 +241</option>
                                <option value="+242">🇨🇬 +242</option>
                                <option value="+243">🇨🇩 +243</option>
                                <option value="+244">🇦🇴 +244</option>
                                <option value="+245">🇬🇼 +245</option>
                                <option value="+246">🇮🇴 +246</option>
                                <option value="+247">🇦🇨 +247</option>
                                <option value="+248">🇸🇨 +248</option>
                                <option value="+249">🇸🇩 +249</option>
                                <option value="+250">🇷🇼 +250</option>
                                <option value="+251">🇪🇹 +251</option>
                                <option value="+252">🇸🇴 +252</option>
                                <option value="+253">🇩🇯 +253</option>
                                <option value="+255">🇹🇿 +255</option>
                                <option value="+256">🇺🇬 +256</option>
                                <option value="+257">🇧🇮 +257</option>
                                <option value="+258">🇲🇿 +258</option>
                                <option value="+260">🇿🇲 +260</option>
                                <option value="+261">🇲🇬 +261</option>
                                <option value="+262">🇷🇪 +262</option>
                                <option value="+263">🇿🇼 +263</option>
                                <option value="+264">🇳🇦 +264</option>
                                <option value="+265">🇲🇼 +265</option>
                                <option value="+266">🇱🇸 +266</option>
                                <option value="+267">🇧🇼 +267</option>
                                <option value="+268">🇸🇿 +268</option>
                                <option value="+269">🇰🇲 +269</option>
                                <option value="+290">🇸🇭 +290</option>
                                <option value="+291">🇪🇷 +291</option>
                                <option value="+297">🇦🇼 +297</option>
                                <option value="+298">🇫🇴 +298</option>
                                <option value="+299">🇬🇱 +299</option>
                                <option value="+350">🇬🇮 +350</option>
                                <option value="+351">🇵🇹 +351</option>
                                <option value="+352">🇱🇺 +352</option>
                                <option value="+353">🇮🇪 +353</option>
                                <option value="+354">🇮🇸 +354</option>
                                <option value="+355">🇦🇱 +355</option>
                                <option value="+356">🇲🇹 +356</option>
                                <option value="+357">🇨🇾 +357</option>
                                <option value="+358">🇫🇮 +358</option>
                                <option value="+359">🇧🇬 +359</option>
                                <option value="+370">🇱🇹 +370</option>
                                <option value="+371">🇱🇻 +371</option>
                                <option value="+372">🇪🇪 +372</option>
                                <option value="+373">🇲🇩 +373</option>
                                <option value="+374">🇦🇲 +374</option>
                                <option value="+375">🇧🇾 +375</option>
                                <option value="+376">🇦🇩 +376</option>
                                <option value="+377">🇲🇨 +377</option>
                                <option value="+378">🇸🇲 +378</option>
                                <option value="+379">🇻🇦 +379</option>
                                <option value="+380">🇺🇦 +380</option>
                                <option value="+381">🇷🇸 +381</option>
                                <option value="+382">🇲🇪 +382</option>
                                <option value="+383">🇽🇰 +383</option>
                                <option value="+385">🇭🇷 +385</option>
                                <option value="+386">🇸🇮 +386</option>
                                <option value="+387">🇧🇦 +387</option>
                                <option value="+389">🇲🇰 +389</option>
                                <option value="+420">🇨🇿 +420</option>
                                <option value="+421">🇸🇰 +421</option>
                                <option value="+423">🇱🇮 +423</option>
                                <option value="+500">🇫🇰 +500</option>
                                <option value="+501">🇧🇿 +501</option>
                                <option value="+502">🇬🇹 +502</option>
                                <option value="+503">🇸🇻 +503</option>
                                <option value="+504">🇭🇳 +504</option>
                                <option value="+505">🇳🇮 +505</option>
                                <option value="+506">🇨🇷 +506</option>
                                <option value="+507">🇵🇦 +507</option>
                                <option value="+508">🇵🇲 +508</option>
                                <option value="+509">🇭🇹 +509</option>
                                <option value="+590">🇬🇵 +590</option>
                                <option value="+591">🇧🇴 +591</option>
                                <option value="+592">🇬🇾 +592</option>
                                <option value="+593">🇪🇨 +593</option>
                                <option value="+594">🇬🇫 +594</option>
                                <option value="+595">🇵🇾 +595</option>
                                <option value="+596">🇲🇶 +596</option>
                                <option value="+597">🇸🇷 +597</option>
                                <option value="+598">🇺🇾 +598</option>
                                <option value="+599">🇧🇶 +599</option>
                                <option value="+670">🇹🇱 +670</option>
                                <option value="+672">🇦🇶 +672</option>
                                <option value="+673">🇧🇳 +673</option>
                                <option value="+674">🇳🇷 +674</option>
                                <option value="+675">🇵🇬 +675</option>
                                <option value="+676">🇹🇴 +676</option>
                                <option value="+677">🇸🇧 +677</option>
                                <option value="+678">🇻🇺 +678</option>
                                <option value="+679">🇫🇯 +679</option>
                                <option value="+680">🇵🇼 +680</option>
                                <option value="+681">🇼🇫 +681</option>
                                <option value="+682">🇨🇰 +682</option>
                                <option value="+683">🇳🇺 +683</option>
                                <option value="+685">🇼🇸 +685</option>
                                <option value="+686">🇰🇮 +686</option>
                                <option value="+687">🇳🇨 +687</option>
                                <option value="+688">🇹🇻 +688</option>
                                <option value="+689">🇵🇫 +689</option>
                                <option value="+690">🇹🇰 +690</option>
                                <option value="+691">🇫🇲 +691</option>
                                <option value="+692">🇲🇭 +692</option>
                                <option value="+850">🇰🇵 +850</option>
                                <option value="+852">🇭🇰 +852</option>
                                <option value="+853">🇲🇴 +853</option>
                                <option value="+855">🇰🇭 +855</option>
                                <option value="+856">🇱🇦 +856</option>
                                <option value="+880">🇧🇩 +880</option>
                                <option value="+886">🇹🇼 +886</option>
                                <option value="+960">🇲🇻 +960</option>
                                <option value="+961">🇱🇧 +961</option>
                                <option value="+962">🇯🇴 +962</option>
                                <option value="+963">🇸🇾 +963</option>
                                <option value="+964">🇮🇶 +964</option>
                                <option value="+965">🇰🇼 +965</option>
                                <option value="+966">🇸🇦 +966</option>
                                <option value="+967">🇾🇪 +967</option>
                                <option value="+968">🇴🇲 +968</option>
                                <option value="+970">🇵🇸 +970</option>
                                <option value="+971">🇦🇪 +971</option>
                                <option value="+972">🇮🇱 +972</option>
                                <option value="+973">🇧🇭 +973</option>
                                <option value="+974">🇶🇦 +974</option>
                                <option value="+975">🇧🇹 +975</option>
                                <option value="+976">🇲🇳 +976</option>
                                <option value="+977">🇳🇵 +977</option>
                                <option value="+992">🇹🇯 +992</option>
                                <option value="+993">🇹🇲 +993</option>
                                <option value="+994">🇦🇿 +994</option>
                                <option value="+995">🇬🇪 +995</option>
                                <option value="+996">🇰🇬 +996</option>
                                <option value="+998">🇺🇿 +998</option>
                            </select>
                            <input type="tel" class="st-form-input" id="stRegisterPhone" 
                                placeholder="6XX XXX XXX" style="flex:1;" data-translate-placeholder="phone_placeholder">
                        </div>
                        <div class="st-form-help" style="font-size:12px;color:#94A3B8;margin-top:4px;">
                            <i class="fas fa-info-circle"></i> <span data-translate="phone_help">We'll use this to contact you about your orders</span>
                        </div>
                        <div class="st-form-error" id="stRegisterPhoneError" data-translate="phone_error">Please enter a valid phone number</div>
                    </div>

                    <!-- Address -->
                    <div class="st-form-group">
                        <label class="st-form-label" data-translate="delivery_address">Delivery Address</label>
                        <input type="text" class="st-form-input" id="stRegisterAddress" 
                            placeholder="123 Main St, City, Country" data-translate-placeholder="address_placeholder">
                        <div class="st-form-help" style="font-size:12px;color:#94A3B8;margin-top:4px;">
                            <i class="fas fa-info-circle"></i> <span data-translate="address_help">Your default delivery address</span>
                        </div>
                        <div class="st-form-error" id="stRegisterAddressError" data-translate="address_error">Please enter your address</div>
                    </div>

                    <!-- Country / Region (Optional - can be auto-detected) -->
                    <div class="st-form-group">
                        <label class="st-form-label" data-translate="country_region">Country / Region</label>
                        <select class="st-form-input" id="stRegisterCountry">
                            <option value="" data-translate="select_country">Select your country</option>
                            <option value="Cameroon">🇨🇲 Cameroon</option>
                            <option value="Côte d'Ivoire">🇨🇮 Côte d'Ivoire</option>
                            <option value="Nigeria">🇳🇬 Nigeria</option>
                            <option value="Ghana">🇬🇭 Ghana</option>
                            <option value="Senegal">🇸🇳 Senegal</option>
                            <option value="Kenya">🇰🇪 Kenya</option>
                            <option value="Uganda">🇺🇬 Uganda</option>
                            <option value="Tanzania">🇹🇿 Tanzania</option>
                            <option value="South Africa">🇿🇦 South Africa</option>
                            <option value="United States">🇺🇸 United States</option>
                            <option value="United Kingdom">🇬🇧 United Kingdom</option>
                            <option value="India">🇮🇳 India</option>
                            <option value="China">🇨🇳 China</option>
                            <option value="Japan">🇯🇵 Japan</option>
                            <option value="Germany">🇩🇪 Germany</option>
                            <option value="France">🇫🇷 France</option>
                            <option value="Spain">🇪🇸 Spain</option>
                            <option value="Italy">🇮🇹 Italy</option>
                            <option value="Brazil">🇧🇷 Brazil</option>
                            <option value="Australia">🇦🇺 Australia</option>
                            <option value="New Zealand">🇳🇿 New Zealand</option>
                            <option value="Mexico">🇲🇽 Mexico</option>
                            <option value="Colombia">🇨🇴 Colombia</option>
                            <option value="Argentina">🇦🇷 Argentina</option>
                            <option value="Chile">🇨🇱 Chile</option>
                            <option value="Peru">🇵🇪 Peru</option>
                            <option value="Indonesia">🇮🇩 Indonesia</option>
                            <option value="Philippines">🇵🇭 Philippines</option>
                            <option value="Thailand">🇹🇭 Thailand</option>
                            <option value="Malaysia">🇲🇾 Malaysia</option>
                            <option value="Vietnam">🇻🇳 Vietnam</option>
                            <option value="Turkey">🇹🇷 Turkey</option>
                            <option value="Egypt">🇪🇬 Egypt</option>
                            <option value="Morocco">🇲🇦 Morocco</option>
                            <option value="Tunisia">🇹🇳 Tunisia</option>
                            <option value="Algeria">🇩🇿 Algeria</option>
                            <option value="Libya">🇱🇾 Libya</option>
                            <option value="Mauritius">🇲🇺 Mauritius</option>
                            <option value="Mauritania">🇲🇷 Mauritania</option>
                            <option value="Mali">🇲🇱 Mali</option>
                            <option value="Burkina Faso">🇧🇫 Burkina Faso</option>
                            <option value="Togo">🇹🇬 Togo</option>
                            <option value="Benin">🇧🇯 Benin</option>
                            <option value="Liberia">🇱🇷 Liberia</option>
                            <option value="Sierra Leone">🇸🇱 Sierra Leone</option>
                            <option value="Chad">🇹🇩 Chad</option>
                            <option value="Central African Republic">🇨🇫 Central African Republic</option>
                            <option value="Cape Verde">🇨🇻 Cape Verde</option>
                            <option value="São Tomé and Príncipe">🇸🇹 São Tomé and Príncipe</option>
                            <option value="Equatorial Guinea">🇬🇶 Equatorial Guinea</option>
                            <option value="Gabon">🇬🇦 Gabon</option>
                            <option value="Congo">🇨🇬 Congo</option>
                            <option value="DR Congo">🇨🇩 DR Congo</option>
                            <option value="Angola">🇦🇴 Angola</option>
                            <option value="Guinea-Bissau">🇬🇼 Guinea-Bissau</option>
                            <option value="Seychelles">🇸🇨 Seychelles</option>
                            <option value="Sudan">🇸🇩 Sudan</option>
                            <option value="Rwanda">🇷🇼 Rwanda</option>
                            <option value="Ethiopia">🇪🇹 Ethiopia</option>
                            <option value="Somalia">🇸🇴 Somalia</option>
                            <option value="Djibouti">🇩🇯 Djibouti</option>
                            <option value="Burundi">🇧🇮 Burundi</option>
                            <option value="Mozambique">🇲🇿 Mozambique</option>
                            <option value="Zambia">🇿🇲 Zambia</option>
                            <option value="Madagascar">🇲🇬 Madagascar</option>
                            <option value="Zimbabwe">🇿🇼 Zimbabwe</option>
                            <option value="Namibia">🇳🇦 Namibia</option>
                            <option value="Malawi">🇲🇼 Malawi</option>
                            <option value="Lesotho">🇱🇸 Lesotho</option>
                            <option value="Botswana">🇧🇼 Botswana</option>
                            <option value="Eswatini">🇸🇿 Eswatini</option>
                            <option value="Comoros">🇰🇲 Comoros</option>
                            <option value="Eritrea">🇪🇷 Eritrea</option>
                        </select>
                        <div class="st-form-help" style="font-size:12px;color:#94A3B8;margin-top:4px;">
                            <i class="fas fa-info-circle"></i> <span data-translate="country_help">Select your country for shipping and currency</span>
                        </div>
                        <div class="st-form-error" id="stRegisterCountryError" data-translate="country_error">Please select your country</div>
                    </div>
                    
                    <!-- Terms & Conditions -->
                        <div class="st-form-group" style="margin-top:8px;">
                            <label style="display:flex;align-items:flex-start;gap:10px;font-weight:500;font-size:14px;color:#1E293B;cursor:pointer;">
                                <input type="checkbox" id="stRegisterTerms" required style="margin-top:3px;width:18px;height:18px;accent-color:#6C3CE1;">
                                <span data-translate="terms_agree">I agree to the <a href="/terms" target="_blank" style="color:#6C3CE1;text-decoration:underline;font-weight:600;">Terms of Service</a> and <a href="/Policy" target="_blank" style="color:#6C3CE1;text-decoration:underline;font-weight:600;">Privacy Policy</a>.</span>
                            </label>
                            <div class="st-form-error" id="stRegisterTermsError" data-translate="terms_error">You must agree to the terms to create an account</div>
                        </div>
                    
                    <!-- Submit Button -->
                    <button class="st-btn-primary" id="stRegisterSubmit" data-translate="create_account">
                        <i class="fas fa-user-plus"></i> Create Account
                    </button>
                    
                    <div class="st-modal-footer">
                       <span data-translate="have_account">Already have an account?</span> <button class="st-link" id="stSwitchToLogin" data-translate="login">Login</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}