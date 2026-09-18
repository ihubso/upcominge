
        // ============================================================
        //  ABOUT US PAGE - Fetches from Supabase business_info & contact_info
        // ============================================================

        // --- DOM Elements ---
        const elements = {
            loading: document.getElementById('aboutLoading'),
            content: document.getElementById('aboutContent'),
            heroShopName: document.getElementById('heroShopName'),
            aboutShopName: document.getElementById('aboutShopName'),
            heroDescription: document.getElementById('heroDescription'),
            aboutDescription: document.getElementById('aboutDescription'),
            contactGrid: document.getElementById('contactInfoGrid'),
            socialLinks: document.getElementById('socialLinks'),
            statYears: document.getElementById('statYears'),
            statProducts: document.getElementById('statProducts'),
            statCustomers: document.getElementById('statCustomers'),
            heroLocationText: document.getElementById('heroLocationText'),
            heroHoursText: document.getElementById('heroHoursText'),
            heroShopImage: document.getElementById('heroShopImage'),
            shopPhotoPlaceholder: document.getElementById('shopPhotoPlaceholder'),
            heroImageContainer: document.getElementById('heroImageContainer')
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
                    renderBusinessInfo(combinedData);
                } else {
                    showFallbackData();
                }

            } catch (err) {
                console.error('❌ Error fetching data:', err.message);
                showFallbackData();
            }
        }

        // ============================================================
        //  RENDER BUSINESS INFO
        // ============================================================

        function renderBusinessInfo(info) {
            // Hide loading, show content
            elements.loading.style.display = 'none';
            elements.content.style.display = 'block';

            // Shop name
            const shopName = info.shop_name || 'Sucess Technology';
            elements.heroShopName.textContent = shopName;
            elements.aboutShopName.textContent = shopName;

            // Description
            const description = info.description || 'Your trusted partner for premium technology products and exceptional service.';
            elements.heroDescription.textContent = description;
            elements.aboutDescription.textContent = description;

            // Hero - Location (from contact_info)
            if (info.latitude && info.longitude) {
                const lat = parseFloat(info.latitude);
                const lng = parseFloat(info.longitude);
                if (!isNaN(lat) && !isNaN(lng)) {
                    elements.heroLocationText.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                    // Also show as Google Maps link
                    const locationLink = document.getElementById('heroLocation');
                    if (locationLink) {
                        locationLink.href = `https://maps.google.com/?q=${lat},${lng}`;
                        locationLink.target = '_blank';
                        locationLink.style.cursor = 'pointer';
                        locationLink.style.textDecoration = 'none';
                    }
                }
            } else if (info.address) {
                elements.heroLocationText.textContent = info.address;
            }

            // Hero - Hours (from contact_info)
            if (info.hours) {
                elements.heroHoursText.textContent = info.hours.replace(/\\n/g, ' • ');
            }

            // Hero - Shop Photo (from contact_info)
            if (info.shop_photo && info.shop_photo.trim()) {
                elements.heroShopImage.src = info.shop_photo;
                elements.heroShopImage.style.display = 'block';
                elements.shopPhotoPlaceholder.style.display = 'none';
                
                // Also set as about image
                const aboutImage = document.querySelector('.about-image');
                if (aboutImage) {
                    const img = document.createElement('img');
                    img.src = info.shop_photo;
                    img.alt = 'Shop Photo';
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    aboutImage.innerHTML = '';
                    aboutImage.appendChild(img);
                }
            } else {
                // Use fallback shop image
                elements.heroShopImage.style.display = 'none';
                elements.shopPhotoPlaceholder.style.display = 'flex';
            }

            // Contact Information
            renderContactInfo(info);

            // Social Links
            renderSocialLinks(info);

            // Stats (can be customized or from business info)
            if (info.stats) {
                try {
                    const stats = JSON.parse(info.stats);
                    if (stats.years) elements.statYears.textContent = stats.years;
                    if (stats.products) elements.statProducts.textContent = stats.products;
                    if (stats.customers) elements.statCustomers.textContent = stats.customers;
                } catch (e) {
                    // Use default stats
                }
            }

            // Update page title
            document.title = `About ${shopName} · Sucess Technology`;

            console.log('✅ Business info loaded successfully');
        }

        // ============================================================
        //  RENDER CONTACT INFO
        // ============================================================

        function renderContactInfo(info) {
            const grid = elements.contactGrid;
            const contactItems = [];

            // Email
            if (info.email) {
                contactItems.push({
                    icon: 'fa-envelope',
                    label: 'Email',
                    value: info.email,
                    href: `mailto:${info.email}`
                });
            }

            // Phone
            if (info.phone) {
                const phoneClean = info.phone.replace(/\s/g, '');
                contactItems.push({
                    icon: 'fa-phone',
                    label: 'Phone',
                    value: info.phone,
                    href: `tel:${phoneClean}`
                });
            }

            // Address
            if (info.address) {
                contactItems.push({
                    icon: 'fa-map-marker-alt',
                    label: 'Address',
                    value: info.address,
                    href: `https://maps.google.com/?q=${encodeURIComponent(info.address)}`
                });
            }

            // Hours (from contact_info)
            if (info.hours) {
                const hoursDisplay = info.hours.replace(/\\n/g, ' • ');
                contactItems.push({
                    icon: 'fa-clock',
                    label: 'Business Hours',
                    value: hoursDisplay,
                    href: '#'
                });
            }

            if (contactItems.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column:1/-1;text-align:center;padding:20px;color:#94A3B8;" data-translate="no_contact">
                        No contact information available
                    </div>
                `;
                return;
            }

            grid.innerHTML = contactItems.map(item => `
                <a href="${item.href}" target="${item.href.startsWith('mailto:') || item.href.startsWith('tel:') || item.href === '#' ? '_self' : '_blank'}" class="contact-info-item">
                    <div class="ci-icon"><i class="fas ${item.icon}"></i></div>
                    <div class="ci-text">
                        <span class="ci-label" data-translate="contact_${item.label.toLowerCase().replace(' ', '_')}">${item.label}</span>
                        <span class="ci-value">${item.value}</span>
                    </div>
                </a>
            `).join('');
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
                if (url && url.trim()) {
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
        //  FALLBACK DATA
        // ============================================================

        function showFallbackData() {
            const fallbackInfo = {
                shop_name: 'Sucess Technology',
                email: 'info@sucesstechnology.com',
                phone: '+237 6XX XXX XXX',
                address: 'Douala, Cameroon',
                description: 'Your trusted partner for premium technology products and exceptional service. We\'re committed to bringing you the best in tech innovation.',
                hours: 'Mon - Fri: 7:00 AM - 8:00 PM\nSun: Closed',
                latitude: '4.051056',
                longitude: '9.767869',
                facebook: '#',
                instagram: '#',
                tiktok: '#'
            };

            renderBusinessInfo(fallbackInfo);
            console.log('ℹ️ Using fallback business data');
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
        //  INITIALIZE
        // ============================================================

        document.addEventListener('DOMContentLoaded', function() {
            console.log('📄 About Us page loading...');

            // Fetch business info
            fetchBusinessInfo();

            // Add smooth scroll
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function(e) {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });

            console.log('✅ About Us page ready');
        });
   