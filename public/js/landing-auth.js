let authStateReady = false;
let currentAuthUser = null;
let authStateWaiter = null;

function setAuthMessage(message) {
    const status = document.getElementById('authStatus');
    if (!status) return;
    status.textContent = message;
    status.hidden = !message;
}

function syncSignedInButtons() {
    if (!currentAuthUser) return;

    const labels = new Map([
        ['loginBtn', 'Go to dashboard'],
        ['heroStartBtn', 'Go to dashboard'],
        ['mobileLoginBtn', 'Go to dashboard'],
        ['pricingGetStartedBtn', 'Go to dashboard']
    ]);
    labels.forEach((label, id) => {
        const button = document.getElementById(id);
        if (button) button.textContent = label;
    });

    ['getStartedBtn', 'mobileGetStartedBtn'].forEach((id) => {
        const button = document.getElementById(id);
        if (button) button.hidden = true;
    });
}

function waitForAuthState() {
    if (authStateReady) return Promise.resolve(currentAuthUser);
    if (authStateWaiter) return authStateWaiter;
    if (typeof firebase === 'undefined' || !firebase.auth) return Promise.resolve(null);

    authStateWaiter = new Promise((resolve) => {
        let unsubscribe = () => {};
        const timeout = setTimeout(() => {
            unsubscribe();
            authStateReady = true;
            currentAuthUser = firebase.auth().currentUser || null;
            resolve(currentAuthUser);
        }, 4500);

        unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            clearTimeout(timeout);
            authStateReady = true;
            currentAuthUser = user;
            unsubscribe();
            resolve(user);
        }, () => {
            clearTimeout(timeout);
            authStateReady = true;
            currentAuthUser = null;
            resolve(null);
        });
    }).finally(() => {
        authStateWaiter = null;
    });

    return authStateWaiter;
}

async function handleSmartSignIn(button) {
    if (!button || button.dataset.busy === 'true') return;

    const originalMarkup = button.innerHTML;
    button.dataset.busy = 'true';
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Opening…';
    setAuthMessage('');

    try {
        const user = await waitForAuthState();
        if (user) {
            window.location.assign('/home');
            return;
        }

        if (typeof firebase === 'undefined' || !firebase.auth || !window.googleProvider) {
            window.location.assign('/home');
            return;
        }

        try {
            await firebase.auth().signInWithPopup(window.googleProvider);
            window.location.assign('/home');
        } catch (error) {
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
                await firebase.auth().signInWithRedirect(window.googleProvider);
                return;
            }
            if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') return;
            if (error.code === 'auth/unauthorized-domain') {
                setAuthMessage('This domain is not enabled for Google sign-in. Please contact the site administrator.');
                return;
            }
            throw error;
        }
    } catch (error) {
        console.error('Sign-in failed:', error);
        setAuthMessage('Sign-in could not start. Please try again.');
    } finally {
        if (button.isConnected) {
            button.innerHTML = originalMarkup;
            button.disabled = false;
            button.removeAttribute('aria-busy');
            delete button.dataset.busy;
        }
    }
}

function closeMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const toggle = document.getElementById('mobileMenuToggle');
    menu?.classList.remove('is-open');
    menu?.setAttribute('aria-hidden', 'true');
    toggle?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
}

if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
        authStateReady = true;
        currentAuthUser = user;
        if (user) syncSignedInButtons();
    });

    firebase.auth().getRedirectResult().then((result) => {
        if (result.user) window.location.assign('/home');
    }).catch((error) => {
        console.error('Sign-in redirect failed:', error);
        setAuthMessage('Sign-in could not finish. Please try again.');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const ctaIds = ['loginBtn', 'getStartedBtn', 'heroStartBtn', 'mobileLoginBtn', 'mobileGetStartedBtn', 'pricingGetStartedBtn'];
    ctaIds.forEach((id) => {
        const button = document.getElementById(id);
        button?.addEventListener('click', (event) => {
            event.preventDefault();
            closeMobileMenu();
            handleSmartSignIn(button);
        });
    });

    syncSignedInButtons();
});
