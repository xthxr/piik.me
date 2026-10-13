document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const header = document.getElementById('siteHeader');
    const themeToggle = document.getElementById('themeToggleBtn');
    const menuToggle = document.getElementById('mobileMenuToggle');
    const menu = document.getElementById('mobileMenu');

    const syncThemeIcon = () => {
        const icon = themeToggle?.querySelector('i');
        if (icon) icon.className = root.classList.contains('dark') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    };

    syncThemeIcon();
    themeToggle?.addEventListener('click', () => {
        root.classList.toggle('dark');
        localStorage.setItem('piik-theme', root.classList.contains('dark') ? 'dark' : 'light');
        syncThemeIcon();
    });

    const setMenuOpen = (isOpen) => {
        menuToggle?.setAttribute('aria-expanded', String(isOpen));
        menu?.setAttribute('aria-hidden', String(!isOpen));
        menu?.classList.toggle('is-open', isOpen);
        document.body.classList.toggle('menu-open', isOpen);
    };

    menuToggle?.addEventListener('click', () => setMenuOpen(!menu?.classList.contains('is-open')));
    menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenuOpen(false)));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setMenuOpen(false);
    });

    const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 12);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
});
