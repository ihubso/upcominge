

        document.addEventListener('DOMContentLoaded', function() {
            console.log('📄 Terms & Conditions page loaded');

            // --- Fetch and render business info ---
            fetchBusinessInfo();

            // --- Smooth scroll for TOC links ---
            document.querySelectorAll('.toc-item').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const targetId = this.getAttribute('href').substring(1);
                    const target = document.getElementById(targetId);
                    if (target) {
                        const headerOffset = 100;
                        const elementPosition = target.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                        window.scrollTo({
                            top: offsetPosition,
                            behavior: 'smooth'
                        });
                    }
                });
            });

            // --- Accept Button ---
            document.getElementById('acceptBtn').addEventListener('click', function() {
                showToast('✅ ' + t('thank_you_accept', 'Thank you for accepting our Terms & Conditions!'));
                this.innerHTML = '<i class="fas fa-check"></i> ' + t('accepted', 'Accepted');
                this.style.background = '#10B981';
                this.disabled = true;
                document.getElementById('declineBtn').style.opacity = '0.5';
                document.getElementById('declineBtn').disabled = true;

                localStorage.setItem('st_terms_accepted', 'true');
                localStorage.setItem('st_terms_accepted_date', new Date().toISOString());
            });

            // --- Decline Button ---
            document.getElementById('declineBtn').addEventListener('click', function() {
                showToast('⚠️ ' + t('must_accept', 'You must accept the Terms & Conditions to use our platform.'), 'error');
            });

            // --- Check if already accepted ---
            const termsAccepted = localStorage.getItem('st_terms_accepted');
            if (termsAccepted === 'true') {
                const btn = document.getElementById('acceptBtn');
                btn.innerHTML = '<i class="fas fa-check"></i> ' + t('already_accepted', 'Already Accepted');
                btn.style.background = '#10B981';
                btn.disabled = true;
                document.getElementById('declineBtn').style.opacity = '0.5';
                document.getElementById('declineBtn').disabled = true;
            }

            // --- Toast ---
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

            // --- Animation on scroll for sections ---
            const sections = document.querySelectorAll('.term-section');

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });

            sections.forEach((section, index) => {
                section.style.opacity = '0';
                section.style.transform = 'translateY(20px)';
                section.style.transition = `all 0.5s ease ${index * 0.05}s`;
                observer.observe(section);
            });

            setTimeout(() => {
                sections.forEach(section => {
                    section.style.opacity = '1';
                    section.style.transform = 'translateY(0)';
                });
            }, 200);

            console.log('✅ Terms & Conditions page ready');
        });

        // Helper translation function for dynamic content
        function t(key, fallback) {
            if (window.Translations && window.Translations.translate) {
                const result = window.Translations.translate(key);
                if (result && result !== key) return result;
            }
            return fallback || key;
        }

        // ============================================================
        //  FETCH BUSINESS INFO FROM SUPABASE
        // ============================================================

        async function fetchBusinessInfo() {
            console.log('📡 Fetching business info...');

            try {
                // Get Supabase client - use the helper so we get an initialized client,
                // not the raw Supabase SDK object.
                const supabase = getSupabaseClient();

                if (!supabase || typeof supabase.from !== 'function') {
                    console.warn('⚠️ Supabase client not available, using fallback data');
                    showFallbackData();
                    return;
                }

                // Fetch from business_info
                const { data: businessData, error: businessError } = await supabase
                    .from('business_info')
                    .select('*')
                    .eq('id', 1)
                    .single();

                if (businessError) {
                    console.warn('⚠️ Business info fetch error:', businessError.message);
                    // Still try contact_info
                }

                // Fetch from contact_info
                const { data: contactData, error: contactError } = await supabase
                    .from('contact_info')
                    .select('*')
                    .eq('id', 1)
                    .single();

                if (contactError) {
                    console.warn('⚠️ Contact info fetch error:', contactError.message);
                }

                // Combine data (contact_info takes precedence for overlapping fields)
                const combinedData = {
                    ...(businessData || {}),
                    ...(contactData || {})
                };

                if (combinedData && Object.keys(combinedData).length > 0) {
                    renderBusinessInfo(combinedData);
                } else {
                    showFallbackData();
                }

            } catch (err) {
                console.error('❌ Error fetching business info:', err);
                showFallbackData();
            }
        }

        // ============================================================
        //  RENDER BUSINESS INFO
        // ============================================================

        function renderBusinessInfo(data) {
            console.log('✅ Rendering business info:', data);

            // Company name
            const companyName = data.name || data.company_name || 'Sucess Technology';
            document.getElementById('companyName').textContent = `${t('terms_and', 'Terms &')} Conditions · ${companyName}`;
            document.querySelectorAll('#businessName1, #businessName7, #businessName9').forEach(el => {
                el.textContent = companyName;
            });

            // Tagline / description
            if (data.description) {
                document.getElementById('companyTagline').textContent = data.description;
            }

            // Effective date
            if (data.established_date || data.created_at) {
                const date = new Date(data.established_date || data.created_at);
                if (!isNaN(date)) {
                    document.getElementById('effectiveDate').textContent = `${t('effective', 'Effective')} ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
                }
            }

            // Last updated
            if (data.updated_at) {
                const date = new Date(data.updated_at);
                if (!isNaN(date)) {
                    document.getElementById('lastUpdatedDate').textContent = date.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                    });
                }
            }

            // Contact Email
            if (data.email) {
                document.getElementById('contactEmail').textContent = data.email;
            }

            // Contact Phone
            if (data.phone || data.phone_number) {
                document.getElementById('contactPhone').textContent = data.phone || data.phone_number;
            }

            // Address
            const addressParts = [];
            if (data.address) addressParts.push(data.address);
            if (data.city) addressParts.push(data.city);
            if (data.country) addressParts.push(data.country);
            if (addressParts.length > 0) {
                document.getElementById('contactAddress').textContent = addressParts.join(', ');
            }

            // Business Hours
            if (data.hours || data.business_hours) {
                document.getElementById('contactHours').textContent = data.hours || data.business_hours;
            }

            // Governing Law - Country
            if (data.country) {
                document.getElementById('governingCountry').textContent = `the ${data.country}`;
                document.getElementById('jurisdictionCountry').textContent = data.country;
                document.getElementById('lawCountry').textContent = data.country;
                document.getElementById('courtCountry').textContent = data.country;
            }

            // Store in session for other pages
            try {
                sessionStorage.setItem('st_business_info', JSON.stringify(data));
            } catch (e) { /* ignore */ }
        }

        // ============================================================
        //  FALLBACK DATA
        // ============================================================

        function showFallbackData() {
            console.log('📋 Using fallback business data');

            document.getElementById('companyName').textContent = `Terms & Conditions · Sucess Technology`;
            document.querySelectorAll('#businessName1, #businessName7, #businessName9').forEach(el => {
                el.textContent = 'Sucess Technology';
            });
        }

 
