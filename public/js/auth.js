// Authentication State Management

let currentUser = null;
let authToken = null;

// Auth UI Elements (may not exist in all pages)
const loginSection = document.getElementById('loginSection');
const userSection = document.getElementById('userSection');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const promptLoginBtn = document.getElementById('promptLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userPhoto = document.getElementById('userPhoto');
const userName = document.getElementById('userName');

// Section Elements
const loginPrompt = document.getElementById('loginPrompt');
const dashboardSection = document.getElementById('dashboardSection');
const shortenerSection = document.querySelector('.shortener-section');

// Initialize Auth State Listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        authToken = await user.getIdToken();
        
        // Update UI (only if elements exist)
        if (userPhoto) userPhoto.src = user.photoURL || 'https://via.placeholder.com/40';
        if (userName) userName.textContent = user.displayName || user.email;
        
        if (loginSection) loginSection.style.display = 'none';
        if (userSection) userSection.style.display = 'block';
        if (loginPrompt) loginPrompt.style.display = 'none';
        
        // Show dashboard by default - wait for app.js to load
        if (typeof showDashboard === 'function') {
            showDashboard();
        } else {
            // Fallback: wait for DOM to be ready and retry
            window.addEventListener('DOMContentLoaded', () => {
                if (typeof showDashboard === 'function') {
                    showDashboard();
                }
            });
        }
    } else {
        currentUser = null;
        authToken = null;
        
        if (loginSection) loginSection.style.display = 'block';
        if (userSection) userSection.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'block';
        if (dashboardSection) dashboardSection.style.display = 'none';
        if (shortenerSection) shortenerSection.style.display = 'none';
        
        // Hide analytics if visible
        const analyticsSection = document.getElementById('analyticsSection');
        if (analyticsSection) analyticsSection.style.display = 'none';
    }
});

// Google Sign In
async function signInWithGoogle() {
    try {
        // Try redirect method first (better for embedded browsers)
        if (window.location !== window.parent.location) {
            // We're in an iframe/embedded browser, use redirect
            await auth.signInWithRedirect(googleProvider);
        } else {
            // Try popup method
            const result = await auth.signInWithPopup(googleProvider);
            console.log('Signed in:', result.user.displayName);
        }
    } catch (error) {
        console.error('Error signing in:', error);
        
        if (error.code === 'auth/popup-blocked') {
            // Fallback to redirect if popup is blocked
            console.log('Popup blocked, trying redirect...');
            await auth.signInWithRedirect(googleProvider);
        } else if (error.code === 'auth/popup-closed-by-user') {
            // User closed popup, do nothing
        } else if (error.code === 'auth/unauthorized-domain') {
            alert('This domain is not authorized. Please add it to Firebase Console > Authentication > Settings > Authorized domains');
        } else {
            alert('Error signing in: ' + error.message + '\n\nTip: Try opening in a regular browser instead of VS Code.');
        }
    }
}

// Handle redirect result
auth.getRedirectResult().then((result) => {
    if (result.user) {
        console.log('Signed in via redirect:', result.user.displayName);
    }
}).catch((error) => {
    console.error('Redirect error:', error);
});

// Sign Out
async function signOut() {
    try {
        await auth.signOut();
        console.log('Signed out');
    } catch (error) {
        console.error('Error signing out:', error);
        alert('Error signing out. Please try again.');
    }
}

// Event Listeners
if (googleLoginBtn) googleLoginBtn.addEventListener('click', signInWithGoogle);
if (promptLoginBtn) promptLoginBtn.addEventListener('click', signInWithGoogle);

// Get Auth Token (for API calls)
async function getAuthToken() {
    if (currentUser) {
        return await currentUser.getIdToken();
    }
    return null;
}

// Check if user is authenticated
function isAuthenticated() {
    return currentUser !== null;
}

// Verify user before sensitive actions (2FA reauthentication)
async function verifyUserBeforeAction(actionDescription = 'perform this action') {
    if (!currentUser) {
        showToast('Please sign in first', 'error');
        return false;
    }

    try {
        // Show loading state
        const loadingToast = showToast(`Verifying identity to ${actionDescription}...`, 'info');

        // Reauthenticate with popup
        const result = await auth.currentUser.reauthenticateWithPopup(window.googleProvider);
        
        console.log('✅ User reauthenticated:', result.user.email);
        
        // Clear loading toast
        if (loadingToast && loadingToast.remove) loadingToast.remove();
        
        showToast('Identity verified successfully', 'success');
        return true;
        
    } catch (error) {
        console.error('Reauthentication failed:', error);
        
        // Handle specific error cases
        if (error.code === 'auth/popup-closed-by-user') {
            showToast('Verification cancelled', 'info');
        } else if (error.code === 'auth/popup-blocked') {
            showToast('Please allow popups to verify your identity', 'error');
        } else if (error.code === 'auth/user-mismatch') {
            showToast('Please sign in with the same account', 'error');
        } else if (error.code === 'auth/cancelled-popup-request') {
            // Another popup is already open, ignore silently
            showToast('Verification cancelled', 'info');
        } else {
            showToast('Verification failed: ' + error.message, 'error');
        }
        
        return false;
    }
}
