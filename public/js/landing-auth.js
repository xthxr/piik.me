// ================================
// LANDING PAGE AUTHENTICATION
// ================================

// Note: googleProvider is already initialized in firebase-config.js

// Track if auth state is ready
let authStateReady = false;
let currentAuthUser = null;

// Wait for Firebase auth to be ready
firebase.auth().onAuthStateChanged((user) => {
    authStateReady = true;
    currentAuthUser = user;
    
    if (user) {
        console.log('User is already authenticated:', user.displayName);
        // Update button text to indicate user is signed in
        updateButtonsForAuthenticatedUser();
    } else {
        console.log('No user authenticated');
    }
});

// Handle Smart Sign In
async function handleSmartSignIn() {
    try {
        // Wait for auth state to be ready
        if (!authStateReady) {
            console.log('Waiting for auth state...');
            await new Promise(resolve => {
                const unsubscribe = firebase.auth().onAuthStateChanged(() => {
                    unsubscribe();
                    resolve();
                });
            });
        }
        
        // Check if user is already authenticated
        if (currentAuthUser) {
            // User is already signed in, redirect to home page
            console.log('User already authenticated, redirecting to home...');
            window.location.href = '/home';
            return;
        }
        
        // User is not signed in, initiate Google Sign In
        console.log('User not authenticated, initiating Google Sign In...');
        
        // Try popup method first
        try {
            const result = await firebase.auth().signInWithPopup(window.googleProvider);
            console.log('Signed in successfully:', result.user.displayName);
            
            // Redirect to home page after successful sign in
            window.location.href = '/home';
        } catch (popupError) {
            if (popupError.code === 'auth/popup-blocked') {
                // Fallback to redirect if popup is blocked
                console.log('Popup blocked, using redirect method...');
                await firebase.auth().signInWithRedirect(window.googleProvider);
            } else if (popupError.code === 'auth/popup-closed-by-user') {
                // User closed popup, do nothing
                console.log('Sign-in popup closed by user');
            } else if (popupError.code === 'auth/unauthorized-domain') {
                alert('This domain is not authorized. Please add it to Firebase Console > Authentication > Settings > Authorized domains');
            } else {
                throw popupError;
            }
        }
    } catch (error) {
        console.error('Error during sign in:', error);
        alert('Error signing in: ' + error.message);
    }
}

// Handle redirect result if user was redirected back from Google Sign In
firebase.auth().getRedirectResult().then((result) => {
    if (result.user) {
        console.log('Signed in via redirect:', result.user.displayName);
        // Redirect to home page after successful sign in
        window.location.href = '/home';
    }
}).catch((error) => {
    console.error('Redirect error:', error);
    if (error.code !== 'auth/popup-closed-by-user') {
        alert('Error signing in: ' + error.message);
    }
});

// Update button text for authenticated users
function updateButtonsForAuthenticatedUser() {
    const loginBtn = document.getElementById('loginBtn');
    const getStartedBtn = document.getElementById('getStartedBtn');
    const heroStartBtn = document.getElementById('heroStartBtn');
    const mobileLoginBtn = document.getElementById('mobileLoginBtn');
    const mobileGetStartedBtn = document.getElementById('mobileGetStartedBtn');
    const pricingGetStartedBtn = document.getElementById('pricingGetStartedBtn');
    const bottomCtaGetStartedBtn = document.getElementById('bottomCtaGetStartedBtn');

    // Desktop: Show only one button
    if (loginBtn) {
        loginBtn.textContent = 'GO TO DASHBOARD';
        loginBtn.style.display = 'inline-block';
    }
    if (getStartedBtn) {
        getStartedBtn.style.display = 'none';
    }

    // Hero section: Show only one button
    if (heroStartBtn) {
        heroStartBtn.textContent = 'Go to Dashboard';
        heroStartBtn.style.display = 'inline-block';
    }

    // Mobile: Show only one button
    if (mobileLoginBtn) {
        mobileLoginBtn.textContent = 'Go to Dashboard';
        mobileLoginBtn.style.display = 'block';
    }
    if (mobileGetStartedBtn) {
        mobileGetStartedBtn.style.display = 'none';
    }

    // Pricing section: Change button text if signed in
    if (pricingGetStartedBtn) {
        pricingGetStartedBtn.textContent = 'Go to Dashboard';
    }
    if (bottomCtaGetStartedBtn) {
        bottomCtaGetStartedBtn.textContent = 'Go to Dashboard';
    }
}

// Add event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== Landing Auth: DOM Content Loaded ===');
    
    // Desktop buttons
    const loginBtn = document.getElementById('loginBtn');
    const getStartedBtn = document.getElementById('getStartedBtn');
    const heroStartBtn = document.getElementById('heroStartBtn');
    
    // Mobile buttons
    const mobileLoginBtn = document.getElementById('mobileLoginBtn');
    const mobileGetStartedBtn = document.getElementById('mobileGetStartedBtn');
    
    // Pricing button
    const pricingGetStartedBtn = document.getElementById('pricingGetStartedBtn');
    const bottomCtaGetStartedBtn = document.getElementById('bottomCtaGetStartedBtn');
    
    console.log('Buttons found:', {
        loginBtn: !!loginBtn,
        getStartedBtn: !!getStartedBtn,
        heroStartBtn: !!heroStartBtn,
        mobileLoginBtn: !!mobileLoginBtn,
        mobileGetStartedBtn: !!mobileGetStartedBtn,
        pricingGetStartedBtn: !!pricingGetStartedBtn,
        bottomCtaGetStartedBtn: !!bottomCtaGetStartedBtn
    });
    
    // Attach click handlers to all buttons
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            console.log('Login button clicked');
            handleSmartSignIn();
        });
    }
    
    if (bottomCtaGetStartedBtn) {
        bottomCtaGetStartedBtn.addEventListener('click', () => {
            console.log('Bottom CTA Get Started button clicked');
            handleSmartSignIn();
        });
    }

    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            console.log('Get Started button clicked');
            handleSmartSignIn();
        });
    }
    
    if (heroStartBtn) {
        heroStartBtn.addEventListener('click', () => {
            console.log('Hero Start button clicked');
            handleSmartSignIn();
        });
    }
    
    if (mobileLoginBtn) {
        mobileLoginBtn.addEventListener('click', () => {
            console.log('Mobile Login button clicked');
            // Close mobile menu first
            const mobileMenu = document.getElementById('mobileMenu');
            if (mobileMenu) {
                mobileMenu.classList.add('translate-x-full');
            }
            // Then handle sign in
            handleSmartSignIn();
        });
    }
    
    if (mobileGetStartedBtn) {
        mobileGetStartedBtn.addEventListener('click', () => {
            console.log('Mobile Get Started button clicked');
            // Close mobile menu first
            const mobileMenu = document.getElementById('mobileMenu');
            if (mobileMenu) {
                mobileMenu.classList.add('translate-x-full');
            }
            // Then handle sign in
            handleSmartSignIn();
        });
    }
    
    if (pricingGetStartedBtn) {
        pricingGetStartedBtn.addEventListener('click', () => {
            console.log('Pricing Get Started button clicked');
            handleSmartSignIn();
        });
    }
    
    console.log('Landing page authentication handlers initialized');
});
