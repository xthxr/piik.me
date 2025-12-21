// ================================
// LANDING PAGE AUTHENTICATION
// ================================

// Initialize Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Handle Smart Sign In
async function handleSmartSignIn() {
    try {
        // Check if user is already authenticated
        const currentUser = firebase.auth().currentUser;
        
        if (currentUser) {
            // User is already signed in, redirect to home page
            console.log('User already authenticated, redirecting to home...');
            window.location.href = '/home';
            return;
        }
        
        // User is not signed in, initiate Google Sign In
        console.log('User not authenticated, initiating Google Sign In...');
        
        // Try popup method first
        try {
            const result = await firebase.auth().signInWithPopup(googleProvider);
            console.log('Signed in successfully:', result.user.displayName);
            
            // Redirect to home page after successful sign in
            window.location.href = '/home';
        } catch (popupError) {
            if (popupError.code === 'auth/popup-blocked') {
                // Fallback to redirect if popup is blocked
                console.log('Popup blocked, using redirect method...');
                await firebase.auth().signInWithRedirect(googleProvider);
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

// Check authentication state on page load
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        console.log('User is already authenticated:', user.displayName);
        // Update button text to indicate user is signed in
        updateButtonsForAuthenticatedUser();
    }
});

// Update button text for authenticated users
function updateButtonsForAuthenticatedUser() {
    const loginBtn = document.getElementById('loginBtn');
    const getStartedBtn = document.getElementById('getStartedBtn');
    const heroStartBtn = document.getElementById('heroStartBtn');
    const mobileLoginBtn = document.getElementById('mobileLoginBtn');
    const mobileGetStartedBtn = document.getElementById('mobileGetStartedBtn');
    
    if (loginBtn) loginBtn.textContent = 'GO TO DASHBOARD';
    if (getStartedBtn) getStartedBtn.textContent = 'GO TO DASHBOARD';
    if (heroStartBtn) heroStartBtn.textContent = 'Go to Dashboard';
    if (mobileLoginBtn) mobileLoginBtn.textContent = 'Go to Dashboard';
    if (mobileGetStartedBtn) mobileGetStartedBtn.textContent = 'Go to Dashboard';
}

// Add event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Desktop buttons
    const loginBtn = document.getElementById('loginBtn');
    const getStartedBtn = document.getElementById('getStartedBtn');
    const heroStartBtn = document.getElementById('heroStartBtn');
    
    // Mobile buttons
    const mobileLoginBtn = document.getElementById('mobileLoginBtn');
    const mobileGetStartedBtn = document.getElementById('mobileGetStartedBtn');
    
    // Attach click handlers to all buttons
    if (loginBtn) {
        loginBtn.addEventListener('click', handleSmartSignIn);
    }
    
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', handleSmartSignIn);
    }
    
    if (heroStartBtn) {
        heroStartBtn.addEventListener('click', handleSmartSignIn);
    }
    
    if (mobileLoginBtn) {
        mobileLoginBtn.addEventListener('click', () => {
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
            // Close mobile menu first
            const mobileMenu = document.getElementById('mobileMenu');
            if (mobileMenu) {
                mobileMenu.classList.add('translate-x-full');
            }
            // Then handle sign in
            handleSmartSignIn();
        });
    }
    
    console.log('Landing page authentication handlers initialized');
});
