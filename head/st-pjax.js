/* =========================================================
   ST pjax — partial navigation engine
   Loaded once, in <head>, AFTER header.min.js
   ========================================================= */
(function () {
    'use strict';
    if (window.__stPjaxLoaded) return;
    window.__stPjaxLoaded = true;

    const CONFIG = {
        containerSelector: 'main',
        timeout: 15000,
        cacheSize: 20,
        cacheTTL: 5 * 60 * 1000,
    };

    /* ---------- cache ---------- */
    const cache = new Map();
    const cacheGet = (u) => {
        const e = cache.get(u);
        if (!e) return null;
        if (Date.now() - e.ts > CONFIG.cacheTTL) { cache.delete(u); return null; }
        return e;
    };
    const cacheSet = (u, data) => {
        if (cache.size >= CONFIG.cacheSize) cache.delete(cache.keys().next().value);
        cache.set(u, { ...data, ts: Date.now() });
    };

    /* ---------- progress bar ---------- */
let bar = null;
function showProgress() {
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'stPjaxProgress';
        bar.style.cssText =
            'position:fixed;top:0;left:0;height:5px;width:12%;' +
      'background:linear-gradient(90deg,#6C3CE1 0%,#EC4899 50%,#F59E0B 100%);' +
'box-shadow:0 0 16px rgba(236,72,153,0.8),0 0 32px rgba(108,60,225,0.5);' +
            'border-radius:0 3px 3px 0;' +
            'z-index:2147483647;pointer-events:none;' +
            'transition:width .3s cubic-bezier(0.4,0,0.2,1),opacity .3s ease;';
        document.body.appendChild(bar);
    }
    bar.style.opacity = '1';
    bar.style.width = '50%';
    requestAnimationFrame(() => { bar.style.width = '100%'; });
}
    function endProgress() {
        if (!bar) return;
        bar.style.width = '100%';
        setTimeout(() => { bar.style.opacity = '0'; }, 200);
        setTimeout(() => { bar.style.width = '0%'; }, 600);
    }

    /* ---------- link filter ---------- */
    function shouldIntercept(a, ev) {
        if (!a || !a.href) return false;
        if (ev.defaultPrevented) return false;
        if (ev.button !== 0) return false;
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return false;
        if (a.target && a.target !== '_self') return false;
        if (a.hasAttribute('download')) return false;
        if (a.dataset.noPjax !== undefined) return false;
        if (a.getAttribute('href')?.startsWith('#')) return false;
        if (/^(mailto|tel|javascript):/i.test(a.href)) return false;

        let u; try { u = new URL(a.href, location.origin); } catch { return false; }
        if (u.origin !== location.origin) return false;
        // same page, hash-only → let the browser handle
        if (u.pathname === location.pathname &&
            u.search === location.search && u.hash) return false;
        return true;
    }

    /* ---------- head sync ---------- */
    const MANAGED = 'data-pjax-head';
    function syncHead(newDoc) {
        document.head.querySelectorAll('[' + MANAGED + ']').forEach(n => n.remove());

        const have = new Set();
        document.head
            .querySelectorAll('link[rel="stylesheet"],style,script[src],meta[name]')
            .forEach(n => {
                if (n.href) have.add('href:' + n.href);
                else if (n.src) have.add('src:' + n.src);
                else if (n.tagName === 'META') have.add('meta:' + n.name);
                else if (n.tagName === 'STYLE') have.add('style:' + n.textContent.length + ':' + n.textContent);
            });

        newDoc.head
            .querySelectorAll('link[rel="stylesheet"],style,script[src],meta[name]')
            .forEach(n => {
                let key;
                if (n.tagName === 'LINK' && n.href) key = 'href:' + n.href;
                else if (n.tagName === 'SCRIPT' && n.src) key = 'src:' + n.src;
                else if (n.tagName === 'META') key = 'meta:' + n.name;
                else if (n.tagName === 'STYLE') key = 'style:' + n.textContent.slice(0, 200);
                else return;

                if (have.has(key)) return;
                const c = n.cloneNode(true);
                c.setAttribute(MANAGED, '1');
                document.head.appendChild(c);
            });

        if (newDoc.title && newDoc.title !== document.title) document.title = newDoc.title;
    }

    /* ---------- load <script src> that aren't loaded yet ---------- */
    const loadedSrc = new Set(
        [...document.querySelectorAll('script[src]')].map(s => s.src)
    );
    function loadNewScripts(newDoc) {
        const pending = [];
        newDoc.querySelectorAll('script[src]').forEach(old => {
            const src = old.src;
            if (!src || loadedSrc.has(src)) return;
            loadedSrc.add(src);
            pending.push(new Promise((res, rej) => {
                const s = document.createElement('script');
                [...old.attributes].forEach(a => s.setAttribute(a.name, a.value));
                s.async = false;
                s.onload = res;
                s.onerror = rej;
                document.body.appendChild(s);
            }));
        });
        // inline scripts inside the new <main> also need a run
        return Promise.allSettled(pending);
    }

    /* ---------- re-run inline scripts inside the swapped main ---------- */
    function runInlineScripts(root) {
        root.querySelectorAll('script:not([src])').forEach(old => {
            const s = document.createElement('script');
            [...old.attributes].forEach(a => s.setAttribute(a.name, a.value));
            s.textContent = old.textContent;
            old.replaceWith(s);
        });
    }

    /* ---------- main navigate ---------- */
    let busy = false;
    let abort = null;

    async function navigate(path, { push = true } = {}) {
        if (busy) return;
        busy = true;

        const target = new URL(path, location.origin);
        const route = target.pathname + target.search + target.hash;

        showProgress();
        document.documentElement.style.cursor = 'progress';
        window.dispatchEvent(new CustomEvent('st:pjax-before', { detail: { url: route } }));

        try {
            let doc;
            const hit = cacheGet(route);
            if (hit) {
                doc = new DOMParser().parseFromString(hit.html, 'text/html');
            } else {
                if (abort) abort.abort();
                abort = new AbortController();
                const t = setTimeout(() => abort.abort(), CONFIG.timeout);

                const res = await fetch(route, {
                    headers: { 'X-Requested-With': 'st-pjax' },
                    signal: abort.signal,
                    credentials: 'same-origin',
                });
                clearTimeout(t);

                if (!res.ok) throw new Error('HTTP ' + res.status);
                const ct = res.headers.get('content-type') || '';
                if (!ct.includes('text/html')) throw new Error('Not HTML');

                const html = await res.text();
                doc = new DOMParser().parseFromString(html, 'text/html');
                cacheSet(route, { html });
            }

            const newMain = doc.querySelector(CONFIG.containerSelector);
            const oldMain = document.querySelector(CONFIG.containerSelector);
            if (!newMain || !oldMain) throw new Error('No <main>');

            // Reset scroll BEFORE swap so new content starts at top
            window.scrollTo(0, 0);

            // Swap
            oldMain.replaceWith(newMain);

            syncHead(doc);
            await loadNewScripts(doc);
            runInlineScripts(newMain);

            if (push) history.pushState({ stPjax: true, route }, '', route);
            else        history.replaceState({ stPjax: true, route }, '', route);

            // Re-apply translations
            if (typeof translateUI === 'function') { try { translateUI(); } catch (_) {} }

            // Let pages know
            window.dispatchEvent(new CustomEvent('st:page-loaded', { detail: { route, doc } }));
            window.dispatchEvent(new CustomEvent('st:pjax-after',  { detail: { route } }));

        } catch (err) {
            console.warn('⚠️ pjax failed, falling back to full load:', err);
            location.href = route;
        } finally {
            busy = false;
            endProgress();
            document.documentElement.style.cursor = '';
        }
    }

    /* ---------- intercept internal link clicks (capture phase) ---------- */
    document.addEventListener('click', (ev) => {
        const a = ev.target.closest('a');
        if (!shouldIntercept(a, ev)) return;
        ev.preventDefault();
        ev.stopPropagation();              // beat header's own bubble listener
        const u = new URL(a.href, location.origin);
        navigate(u.pathname + u.search + u.hash);
    }, true);

    /* ---------- back / forward ---------- */
    window.addEventListener('popstate', () => {
        navigate(location.pathname + location.search + location.hash, { push: false });
    });

    /* ---------- wrap navigateWithUserInfo so header buttons use pjax ---------- */
function buildUserUrl(path) {
    const normalized = path.startsWith('/') || path.startsWith('http')
        ? path
        : '/' + path;
    const u = new URL(normalized, location.origin);

    let user = null;
    try {
        const raw = localStorage.getItem('st_customer') || sessionStorage.getItem('st_customer');
        if (raw) user = JSON.parse(raw);
    } catch (_) {}
    if (!user && window.STHeader?.AppState?.user) user = window.STHeader.AppState.user;

    // Only inject once per session — see note above
    const alreadySynced = sessionStorage.getItem('st_user_synced') === '1';
    if (user?.id && !alreadySynced) {
        u.searchParams.set('user_id', user.id);
        if (user.email) u.searchParams.set('user_email', user.email);
        if (user.name)  u.searchParams.set('user_name',  user.name);
        if (user.phone) u.searchParams.set('user_phone', user.phone);
        if (user.address) u.searchParams.set('user_address', user.address);
        u.searchParams.set('session', Date.now().toString());
        u.searchParams.set('logged_in', 'true');
        sessionStorage.setItem('st_user_synced', '1');
    }
    return u.pathname + u.search + u.hash;
}
    const _orig = window.navigateWithUserInfo;
    window.navigateWithUserInfo = function (path) {
        try { return navigate(buildUserUrl(path)); }
        catch (e) { console.warn('pjax navigate failed:', e); return _orig ? _orig(path) : (location.href = path); }
    };

    /* ---------- public API ---------- */
    window.stPjax = {
        navigate: (p) => navigate(buildUserUrl(p)),
        clearCache: () => cache.clear(),
        CONFIG,
    };

    console.log('✅ ST pjax engine loaded');
})();