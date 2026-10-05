// ================================
// PIIK.ME - LANDING INTERACTIVITY (Cleaned)
// ================================

document.addEventListener('DOMContentLoaded', () => {
    initWorkerGlobe();
    initMobileMenu();
    initScrollAnimations();
    initThemeToggle();
    initActionButtons();
});

// 1. GLOBE WORKER
function initWorkerGlobe() {
    const canvas = document.getElementById('globeViz');
    if (!canvas) return;
    if (!('transferControlToOffscreen' in canvas)) return;

    if (!('transferControlToOffscreen' in canvas)) {
        console.error('OffscreenCanvas is not supported in this browser.');
        return; 
    }

    try {
        // Detach canvas from Main Thread
        const offscreenCanvas = canvas.transferControlToOffscreen();

        // Start Worker
        const worker = new Worker('js/globe-worker.js');

        worker.postMessage({ 
            type: 'INIT', 
            canvas: offscreenCanvas,
            width: window.innerWidth,
            height: window.innerHeight,
            pixelRatio: Math.min(window.devicePixelRatio, 1.2)
        }, [offscreenCanvas]); 

        window.addEventListener('resize', () => {
            worker.postMessage({
                type: 'RESIZE',
                width: window.innerWidth,
                height: window.innerHeight
            });
        });

        console.log('Main thread is free! Offscreen Globe Worker Active 🚀');
    } catch (e) {
        console.error('Failed to initialize globe worker:', e);
    }
}

// 2. MOBILE MENU
function initMobileMenu() {
    const toggle = document.getElementById('mobileMenuToggle');
    const menu = document.getElementById('mobileMenu');
    const links = menu ? menu.querySelectorAll('a') : [];
    
    if (!toggle || !menu) return;

    let isOpen = false;

    function syncMenuState(open) {
        toggle.setAttribute('aria-expanded', String(open));
        menu.setAttribute('aria-hidden', String(!open));
    }

    function closeMenu() {
        if (!isOpen) return;
        isOpen = false;
        menu.classList.add('translate-x-full');
        document.body.style.overflow = '';
        syncMenuState(false);
    }

    function toggleMenu() {
        if (!isOpen) {
            isOpen = true;
            menu.classList.remove('translate-x-full');
            document.body.style.overflow = 'hidden';
            syncMenuState(true);
        } else {
            menu.classList.add('translate-x-full');
            document.body.style.overflow = '';
            const icon = toggle.querySelector('i');
            if (icon) icon.className = 'fas fa-bars text-xl';
        }
    }

    syncMenuState(false);
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });

    // Close on link clicks
    links.forEach(link => {
        link.addEventListener('click', () => closeMenu());
    });

    // Close on outer escape key press
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeMenu();
    });
}

// ================================
// SCROLL ANIMATIONS (Native Navbar)
// ================================
function initScrollAnimations() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        const isLight = document.documentElement.classList.contains('light-theme');
        if (window.scrollY > 50) {
            navbar.style.backgroundColor = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.85)';
            navbar.classList.add('shadow-lg');
        } else {
            navbar.style.backgroundColor = isLight ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.2)';
            navbar.classList.remove('shadow-lg');
        }
    });
}

// ================================
// THEME TOGGLE (Fixed For Custom String)
// ================================
function initThemeToggle() {
    const desktopToggle = document.getElementById('themeToggleBtn');
    const mobileToggle = document.getElementById('mobileThemeToggleBtn');
    const toggles = [desktopToggle, mobileToggle].filter(Boolean);
    
    function updateIcon() {
        const isLight = document.documentElement.classList.contains('light-theme');
        toggles.forEach(toggle => {
            const lightIcon = toggle.querySelector('.light-icon');
            const darkIcon = toggle.querySelector('.dark-icon');
            if (lightIcon && darkIcon) {
                if (isLight) {
                    lightIcon.style.display = 'inline-block';
                    darkIcon.style.display = 'none';
                } else {
                    lightIcon.style.display = 'none';
                    darkIcon.style.display = 'inline-block';
                }
            }
        });
        
        // Sync static layout layers matching current background values
        window.dispatchEvent(new Event('scroll'));
    }

    function toggleTheme() {
        const isLight = document.documentElement.classList.contains('light-theme');
        if (isLight) {
            document.documentElement.classList.remove('light-theme');
            document.documentElement.classList.add('dark');
            try {
                localStorage.setItem('theme', 'dark');
            } catch (e) {
                console.warn('Storage sandboxed layout state container active.', e);
            }
        } else {
            document.documentElement.classList.add('light-theme');
            document.documentElement.classList.remove('dark');
            try {
                localStorage.setItem('theme', 'light');
            } catch (e) {
                console.warn('Storage sandboxed layout state container active.', e);
            }
        }
        updateIcon();
    }

    // Read stored safe settings cleanly inside standard try sandbox
    let savedTheme = null;
    try {
        savedTheme = localStorage.getItem('theme');
    } catch (e) {
        console.warn('Could not read user theme preference directly.', e);
    }

    // Initial setup state alignment matching headers
    if (savedTheme === 'light' || (!savedTheme && window.matchMedia('(prefers-color-scheme: light)').matches)) {
        document.documentElement.classList.add('light-theme');
        document.documentElement.classList.remove('dark');
    } else {
        document.documentElement.classList.remove('light-theme');
        document.documentElement.classList.add('dark');
    }

    toggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            toggleTheme();
        });
    });

    // Run layout adjustments immediately
    updateIcon();
}

// ================================
// NAVIGATION & BUTTON ROUTING HANDLERS
// ================================
function initActionButtons() {
    const actions = [
        { id: 'loginBtn', url: '/login' },
        { id: 'mobileLoginBtn', url: '/login' },
        { id: 'getStartedBtn', url: '/register' },
        { id: 'mobileGetStartedBtn', url: '/register' },
        { id: 'heroStartBtn', url: '/register' },
        { id: 'pricingGetStartedBtn', url: '/register' },
        { id: 'bottomCtaGetStartedBtn', url: '/register' }
    ];

    actions.forEach(action => {
        const btn = document.getElementById(action.id);
        if (btn) {
            btn.addEventListener('click', () => {
                window.location.href = action.url;
            });
        }
    });
}