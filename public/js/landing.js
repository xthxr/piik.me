// ================================
// PIIK.ME - LANDING INTERACTIVITY
// ================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    initGlobe();
    initMobileMenu();
    initScrollAnimations();
});

// ================================
// 3D GLOBE VISUALIZATION
// ================================
function initGlobe() {
    console.log('Initializing globe...');
    const globeContainer = document.getElementById('globeViz');
    
    if (!globeContainer) {
        console.error('Globe container not found!');
        return;
    }
    
    console.log('Globe container found:', globeContainer);

    // Check if Globe is available
    if (typeof Globe === 'undefined') {
        console.error('Globe.gl library not loaded!');
        return;
    }
    
    console.log('Globe library loaded, creating globe...');

    try {
        // Configuration
        const N_ARCS = 20;
        const ARC_REL_LEN = 0.4;
        const FLIGHT_TIME = 1000;

        // Generate random data
        const arcsData = [...Array(N_ARCS).keys()].map(() => ({
            startLat: (Math.random() - 0.5) * 180,
            startLng: (Math.random() - 0.5) * 360,
            endLat: (Math.random() - 0.5) * 180,
            endLng: (Math.random() - 0.5) * 360,
            color: [['#3b82f6', '#8b5cf6', '#ec4899'][Math.round(Math.random() * 2)], ['#3b82f6', '#8b5cf6', '#ec4899'][Math.round(Math.random() * 2)]]
        }));

        // Initialize Globe
        const world = Globe()(globeContainer)
            .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
            .arcsData(arcsData)
            .arcColor('color')
            .arcDashLength(ARC_REL_LEN)
            .arcDashGap(2)
            .arcDashInitialGap(1)
            .arcDashAnimateTime(FLIGHT_TIME)
            .atmosphereColor('#3b82f6')
            .atmosphereAltitude(0.15)
            .width(globeContainer.offsetWidth || window.innerWidth)
            .height(globeContainer.offsetHeight || window.innerHeight);

        // Auto-rotate
        world.controls().autoRotate = true;
        world.controls().autoRotateSpeed = 0.5;
        
        // Zoom out to fit screen
        world.pointOfView({ altitude: 2.5 });
        
        console.log('Globe created successfully!');

        // Handle Resize - keep globe responsive
        window.addEventListener('resize', () => {
            const width = globeContainer.offsetWidth || window.innerWidth;
            const height = globeContainer.offsetHeight || window.innerHeight;
            world.width(width);
            world.height(height);
        });
        
    } catch (error) {
        console.error('Error initializing globe:', error);
        globeContainer.innerHTML = '<div style="color: red; padding: 20px;">Globe failed to load: ' + error.message + '</div>';
    }
}

// ================================
// MOBILE MENU
// ================================
function initMobileMenu() {
    const toggle = document.getElementById('mobileMenuToggle');
    const menu = document.getElementById('mobileMenu');
    const links = document.querySelectorAll('.mobile-link');
    
    if (!toggle || !menu) return;

    let isOpen = false;

    function toggleMenu() {
        isOpen = !isOpen;
        if (isOpen) {
            menu.classList.remove('translate-x-full');
            toggle.innerHTML = '<i class="fas fa-times text-xl"></i>';
            document.body.style.overflow = 'hidden';
        } else {
            menu.classList.add('translate-x-full');
            toggle.innerHTML = '<i class="fas fa-bars text-xl"></i>';
            document.body.style.overflow = '';
        }
    }

    toggle.addEventListener('click', toggleMenu);
    
    // Close on link click
    links.forEach(link => {
        link.addEventListener('click', () => {
            if (isOpen) toggleMenu();
        });
    });
}

// ================================
// SCROLL ANIMATIONS (GSAP)
// ================================
function initScrollAnimations() {
    // Check if GSAP is available
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        try {
            gsap.registerPlugin(ScrollTrigger);

            // Reveal elements on scroll, but exclude the navbar logo
            gsap.utils.toArray('.group:not(.navbar-logo)').forEach(group => {
                gsap.fromTo(group, 
                    { y: 50, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.8,
                        stagger: 0.2,
                        scrollTrigger: {
                            trigger: group,
                            start: "top 80%",
                            toggleActions: "play none none reverse"
                        }
                    }
                );
            });
        } catch (error) {
            console.warn('GSAP animations not initialized:', error);
        }
    }

    // Navbar Blur Effect (works without GSAP)
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                navbar.classList.add('shadow-lg');
            } else {
                navbar.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
                navbar.classList.remove('shadow-lg');
            }
        });
    }
}
