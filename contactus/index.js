  
        // ============================================================
        //  SAFETY OVERRIDES - Prevents querySelector errors
        // ============================================================
        
        // Safe wrapper for querySelector to prevent errors
        (function() {
            const originalQuerySelector = Document.prototype.querySelector;
            const originalQuerySelectorAll = Document.prototype.querySelectorAll;
            
            Document.prototype.querySelector = function(selector) {
                try {
                    return originalQuerySelector.call(this, selector);
                } catch(e) {
                    console.warn('⚠️ querySelector prevented error for:', selector);
                    return null;
                }
            };
            
            Document.prototype.querySelectorAll = function(selector) {
                try {
                    return originalQuerySelectorAll.call(this, selector);
                } catch(e) {
                    console.warn('⚠️ querySelectorAll prevented error for:', selector);
                    return [];
                }
            };
            
            Element.prototype.querySelector = function(selector) {
                try {
                    return originalQuerySelector.call(this, selector);
                } catch(e) {
                    console.warn('⚠️ Element.querySelector prevented error for:', selector);
                    return null;
                }
            };
            
            Element.prototype.querySelectorAll = function(selector) {
                try {
                    return originalQuerySelectorAll.call(this, selector);
                } catch(e) {
                    console.warn('⚠️ Element.querySelectorAll prevented error for:', selector);
                    return [];
                }
            };
        })();

        // Helper translation function for dynamic content
        function t(key, fallback) {
            if (window.Translations && window.Translations.translate) {
                const result = window.Translations.translate(key);
                if (result && result !== key) return result;
            }
            return fallback || key;
        }

        // ============================================================
        //  CONTACT PAGE - Fetches from Supabase business_info & contact_info
        // ============================================================

        // --- DOM Elements ---
        const elements = {
            loading: document.getElementById('contactLoading'),
            content: document.getElementById('contactContent'),
            heroShopName: document.getElementById('heroShopName'),
            heroDescription: document.getElementById('heroDescription'),
            heroLocationText: document.getElementById('heroLocationText'),
            heroHoursText: document.getElementById('heroHoursText'),
            heroShopImage: document.getElementById('heroShopImage'),
            shopPhotoPlaceholder: document.getElementById('shopPhotoPlaceholder'),
            contactAddress: document.getElementById('contactAddress'),
            contactPhoneLink: document.getElementById('contactPhoneLink'),
            contactEmailLink: document.getElementById('contactEmailLink'),
            contactHours: document.getElementById('contactHours'),
            contactShopName: document.getElementById('contactShopName'),
            contactDescription: document.getElementById('contactDescription'),
            descriptionCard: document.getElementById('descriptionCard'),
            mapAddress: document.getElementById('mapAddress'),
            mapCoords: document.getElementById('mapCoords'),
            mapDirectionsBtn: document.getElementById('mapDirectionsBtn'),
            mapLinkBtn: document.getElementById('mapLinkBtn'),
            directionsAction: document.getElementById('directionsAction'),
            ctaDirectionsBtn: document.getElementById('ctaDirectionsBtn'),
            callAction: document.getElementById('callAction'),
            ctaCallBtn: document.getElementById('ctaCallBtn'),
            whatsappBtn: document.getElementById('whatsappBtn'),
            emailBtn: document.getElementById('emailBtn'),
            openBadge: document.getElementById('openBadge'),
            socialLinks: document.getElementById('socialLinks')
        };

        // ============================================================
        //  FETCH BUSINESS INFO
        // ============================================================

        async function fetchBusinessInfo() {
            const client = getSupabaseClient();
            if (!client) {
                console.warn('⚠️ Supabase not available');
                showFallbackData();
                return;
            }

            try {
                // Fetch from business_info
                const { data: businessData, error: businessError } = await client
                    .from('business_info')
                    .select('*')
                    .eq('id', 1)
                    .single();

                if (businessError) throw businessError;

                // Fetch from contact_info
                const { data: contactData, error: contactError } = await client
                    .from('contact_info')
                    .select('id, latitude, longitude, hours, description, shop_photo, created_at')
                    .eq('id', 1)
                    .single();

                if (contactError) {
                    console.warn('⚠️ Could not fetch contact_info:', contactError.message);
                }

                // Combine data
                const combinedData = {
                    ...businessData,
                    ...contactData
                };

                if (combinedData) {
                    renderContactInfo(combinedData);
                } else {
                    showFallbackData();
                }

            } catch (err) {
                console.error('❌ Error fetching data:', err.message);
                showFallbackData();
            }
        }

        // ============================================================
        //  RENDER CONTACT INFO
        // ============================================================

        function renderContactInfo(info) {
            // Hide loading, show content
            elements.loading.style.display = 'none';
            elements.content.style.display = 'block';

            // Shop name
            const shopName = info.shop_name || 'Sucess Technology';
            elements.heroShopName.textContent = shopName;
            elements.contactShopName.textContent = shopName;

            // Description
            const description = info.description || t('default_description', 'Your trusted partner for premium technology products and exceptional service.');
            elements.heroDescription.textContent = description;
            elements.contactDescription.textContent = description;

            // Show description card if custom description exists
            if (info.description && info.description.trim() && info.description !== 'Your trusted partner for premium technology products and exceptional service.') {
                elements.descriptionCard.classList.remove('hidden');
            }

            // Address
            const address = info.address || t('default_address', 'Douala, Cameroon');
            elements.contactAddress.textContent = address;
            elements.heroLocationText.textContent = address;
            elements.mapAddress.textContent = address;

            // Phone
            const phone = info.phone || t('default_phone', ' ');
            const phoneClean = phone.replace(/\s/g, '');
            const phoneDigits = phone.replace(/\D/g, '');
            
            elements.contactPhoneLink.textContent = phone;
            elements.contactPhoneLink.href = `tel:${phoneClean}`;
            elements.callAction.href = `tel:${phoneClean}`;
            elements.ctaCallBtn.href = `tel:${phoneClean}`;

            // WhatsApp - use digits only
            if (phoneDigits && phoneDigits.length > 0) {
                elements.whatsappBtn.href = `https://wa.me/${phoneDigits}`;
            } else {
                elements.whatsappBtn.href = '#';
            }

            // Email
            const email = info.email || t('default_email', 'info@sucesstechnology.com');
            elements.contactEmailLink.textContent = email;
            elements.contactEmailLink.href = `mailto:${email}`;
            elements.emailBtn.href = `mailto:${email}`;

            // Hours
            const hoursText = info.hours || t('default_hours', 'Mon - Fri: 7:00 AM - 8:00 PM\nSun: Closed');
            const hoursDisplay = hoursText.replace(/\\n/g, '\n');
            elements.contactHours.textContent = hoursDisplay;
            elements.heroHoursText.textContent = hoursDisplay;

            // Open/Closed badge
            const isOpen = checkIfOpen(hoursText);
            const badge = elements.openBadge;
            if (isOpen) {
                badge.textContent = t('open_now', '🟢 Open Now');
                badge.className = 'card-badge open';
            } else {
                badge.textContent = t('closed', '🔴 Closed');
                badge.className = 'card-badge closed';
            }

            // Coordinates
            let lat = info.latitude || '4.051056';
            let lng = info.longitude || '9.767869';
            if (typeof lat === 'string') lat = parseFloat(lat);
            if (typeof lng === 'string') lng = parseFloat(lng);
            
            const coordsText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            elements.mapCoords.textContent = `📍 ${coordsText}`;

            // Map links
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
            elements.mapDirectionsBtn.href = mapsUrl;
            elements.mapLinkBtn.href = mapsUrl;
            elements.directionsAction.href = mapsUrl;
            elements.ctaDirectionsBtn.href = mapsUrl;

            // Shop Photo
            if (info.shop_photo && info.shop_photo.trim()) {
                elements.heroShopImage.src = info.shop_photo;
                elements.heroShopImage.style.display = 'block';
                elements.shopPhotoPlaceholder.style.display = 'none';
            } else {
                elements.heroShopImage.style.display = 'none';
                elements.shopPhotoPlaceholder.style.display = 'flex';
            }

            // Social Links
            renderSocialLinks(info);

            // Update page title
            document.title = `${t('contact_title', 'Contact')} & ${t('locate_us', 'Locate Us')} · ${shopName}`;

            console.log('✅ Contact info loaded successfully');
        }

        // ============================================================
        //  CHECK IF OPEN
        // ============================================================

        function checkIfOpen(hoursText) {
            const now = new Date();
            const day = now.getDay(); // 0 = Sunday
            const hour = now.getHours();
            const minute = now.getMinutes();
            const currentTime = hour * 60 + minute;

            // Parse hours text
            const lines = hoursText.toLowerCase().split('\n');

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                // Check if closed
                if (trimmed.includes('closed')) {
                    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                    for (let i = 0; i < days.length; i++) {
                        if (trimmed.includes(days[i]) && day === i) {
                            return false;
                        }
                    }
                }

                // Parse time ranges like "Mon - Fri: 7:00 AM - 8:00 PM"
                const timeMatch = trimmed.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);

                if (timeMatch) {
                    let startHour = parseInt(timeMatch[1]);
                    const startMin = parseInt(timeMatch[2] || '0');
                    const startPeriod = timeMatch[3]?.toLowerCase();
                    let endHour = parseInt(timeMatch[4]);
                    const endMin = parseInt(timeMatch[5] || '0');
                    const endPeriod = timeMatch[6]?.toLowerCase();

                    // Convert to 24-hour
                    if (startPeriod === 'pm' && startHour !== 12) startHour += 12;
                    if (startPeriod === 'am' && startHour === 12) startHour = 0;
                    if (endPeriod === 'pm' && endHour !== 12) endHour += 12;
                    if (endPeriod === 'am' && endHour === 12) endHour = 0;

                    const startTime = startHour * 60 + startMin;
                    const endTime = endHour * 60 + endMin;

                    // Check if current day matches
                    const dayMatch = 
                        (day === 0 && trimmed.includes('sun')) ||
                        (day === 1 && trimmed.includes('mon')) ||
                        (day === 2 && trimmed.includes('tue')) ||
                        (day === 3 && trimmed.includes('wed')) ||
                        (day === 4 && trimmed.includes('thu')) ||
                        (day === 5 && trimmed.includes('fri')) ||
                        (day === 6 && trimmed.includes('sat')) ||
                        (day >= 1 && day <= 5 && trimmed.includes('mon') && trimmed.includes('fri'));

                    if (dayMatch && currentTime >= startTime && currentTime <= endTime) {
                        return true;
                    }
                }
            }

            return false;
        }

        // ============================================================
        //  RENDER SOCIAL LINKS
        // ============================================================

        function renderSocialLinks(info) {
            const container = elements.socialLinks;
            const socialItems = [];

            const socialConfig = [
                { key: 'facebook', icon: 'fa-facebook', label: 'Facebook' },
                { key: 'instagram', icon: 'fa-instagram', label: 'Instagram' },
                { key: 'tiktok', icon: 'fa-tiktok', label: 'TikTok' },
                { key: 'twitter', icon: 'fa-twitter', label: 'Twitter' },
                { key: 'youtube', icon: 'fa-youtube', label: 'YouTube' },
                { key: 'linkedin', icon: 'fa-linkedin', label: 'LinkedIn' }
            ];

            socialConfig.forEach(social => {
                const url = info[social.key];
                if (url && url.trim() && url !== '#') {
                    socialItems.push({
                        icon: social.icon,
                        label: social.label,
                        url: url
                    });
                }
            });

            if (socialItems.length === 0) {
                container.innerHTML = `
                    <span style="color:#94A3B8;font-size:14px;" data-translate="no_social">No social links available</span>
                `;
                return;
            }

            container.innerHTML = socialItems.map(item => `
                <a href="${item.url}" target="_blank" rel="noopener noreferrer" title="${item.label}">
                    <i class="fab ${item.icon}"></i>
                </a>
            `).join('');
        }

        // ============================================================
        //  SHARE LOCATION
        // ============================================================

        function shareLocation() {
            const address = elements.contactAddress?.textContent || t('our_store', 'Our Store');
            const mapsUrl = elements.mapDirectionsBtn?.href || window.location.href;

            if (navigator.share) {
                navigator.share({
                    title: t('visit_our_store', 'Visit Our Store'),
                    text: `${t('find_us_at', 'Find us at')}: ${address}`,
                    url: mapsUrl
                }).catch(() => {
                    navigator.clipboard.writeText(mapsUrl);
                    showToast('📍 ' + t('location_copied', 'Location link copied!'));
                });
            } else {
                navigator.clipboard.writeText(mapsUrl);
                showToast('📍 ' + t('location_copied', 'Location link copied!'));
            }
        }

        // ============================================================
        //  FALLBACK DATA
        // ============================================================

        function showFallbackData() {
            const fallbackInfo = {
                shop_name: 'Sucess Technology',
                email: 'info@sucesstechnology.com',
                phone: '+237 6XX XXX XXX',
                address: 'Douala, Cameroon',
                description: t('default_description', 'Your trusted partner for premium technology products and exceptional service.'),
                hours: 'Mon - Fri: 7:00 AM - 8:00 PM\nSun: Closed',
                latitude: '4.051056',
                longitude: '9.767869',
                facebook: '#',
                instagram: '#',
                tiktok: '#'
            };

            renderContactInfo(fallbackInfo);
            console.log('ℹ️ Using fallback contact data');
        }

        // ============================================================
        //  TOAST
        // ============================================================

        function showToast(message, type = 'success') {
            const existing = document.querySelector('.toast-msg');
            if (existing) existing.remove();

            const toast = document.createElement('div');
            toast.className = `toast-msg ${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(-20px)';
                toast.style.transition = 'all 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        // ============================================================
        //  SAFE ANCHOR CLICK HANDLING
        // ============================================================

        function setupSafeAnchorHandlers() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                const href = anchor.getAttribute('href');
                if (href && href !== '#' && href.length > 1) {
                    anchor.addEventListener('click', function(e) {
                        const targetId = this.getAttribute('href');
                        if (targetId && targetId !== '#') {
                            try {
                                const target = document.querySelector(targetId);
                                if (target) {
                                    e.preventDefault();
                                    target.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'start'
                                    });
                                }
                            } catch(e) {}
                        }
                    });
                }
            });
        }

        // ============================================================
        //  INITIALIZE
        // ============================================================

        document.addEventListener('DOMContentLoaded', function() {
            console.log('📄 Contact page loading...');

            fetchBusinessInfo();
            setupSafeAnchorHandlers();

            console.log('✅ Contact page ready');
        });
    