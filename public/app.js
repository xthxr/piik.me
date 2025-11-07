// ================================
// MODERN LINK360 UI - APP LOGIC
// ================================

// Initialize Socket.IO
const socket = io();

// State
let currentPage = 'home';
let currentTheme = 'dark';
let userLinks = [];
let currentUser = null;

// Debounce utility for real-time updates
let analyticsUpdateTimeout = null;
function debounceAnalyticsUpdate(callback, delay = 300) {
    if (analyticsUpdateTimeout) {
        clearTimeout(analyticsUpdateTimeout);
    }
    analyticsUpdateTimeout = setTimeout(callback, delay);
}

// DOM Elements
const sidebar = document.getElementById('sidebar');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const pageTitle = document.getElementById('pageTitle');

// Theme Elements
const themeBtns = document.querySelectorAll('.theme-btn');
const html = document.documentElement;

// User Elements
const sidebarUser = document.getElementById('sidebarUser');
const sidebarUserPhoto = document.getElementById('sidebarUserPhoto');
const sidebarUserName = document.getElementById('sidebarUserName');
const sidebarUserEmail = document.getElementById('sidebarUserEmail');
const topbarUserPhoto = document.getElementById('topbarUserPhoto');
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');
const logoutBtn = document.getElementById('logoutBtn');

// Modal Elements
const createLinkModal = document.getElementById('createLinkModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const createLinkBtn = document.getElementById('createLinkBtn');
const createFirstBtn = document.getElementById('createFirstBtn');
const createLinkSubmit = document.getElementById('createLinkSubmit');
const loginModal = document.getElementById('loginModal');
const googleLoginBtn = document.getElementById('googleLoginBtn');

// Bug Report Modal Elements
const bugReportModal = document.getElementById('bugReportModal');
const reportBugBtn = document.getElementById('reportBugBtn');
const closeBugReportModal = document.getElementById('closeBugReportModal');
const cancelBugReport = document.getElementById('cancelBugReport');
const bugReportForm = document.getElementById('bugReportForm');

// Home Page Elements
const linksContainer = document.getElementById('linksContainer');
const emptyState = document.getElementById('emptyState');
const filterTabs = document.querySelectorAll('.filter-tab');
const sortSelect = document.getElementById('sortSelect');
const searchInput = document.getElementById('searchInput');

// Form Elements
const customShortCode = document.getElementById('customShortCode');
const shortCodeCounter = document.getElementById('shortCodeCounter');
const customShortCodeError = document.getElementById('customShortCodeError');
const customShortCodeSuccess = document.getElementById('customShortCodeSuccess');

// Stats Elements
const totalLinksEl = document.getElementById('totalLinks');
const totalClicksEl = document.getElementById('totalClicks');
const activeLinksEl = document.getElementById('activeLinks');
const avgClickRateEl = document.getElementById('avgClickRate');

// Form Elements
const destinationUrl = document.getElementById('destinationUrl');
const utmSource = document.getElementById('utmSource');
const utmMedium = document.getElementById('utmMedium');
const utmCampaign = document.getElementById('utmCampaign');
const utmTerm = document.getElementById('utmTerm');
const utmContent = document.getElementById('utmContent');

// ================================
// INITIALIZATION
// ================================

document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeAuth();
    initializeNavigation();
    initializeEventListeners();
});

// ================================
// THEME SYSTEM
// ================================

function initializeTheme() {
    // Check saved theme or use system preference
    const savedTheme = localStorage.getItem('link360-theme');
    
    if (savedTheme) {
        setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        setTheme('light');
    } else {
        setTheme('dark');
    }
}

function setTheme(theme) {
    currentTheme = theme;
    
    if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        html.setAttribute('data-theme', systemTheme);
    } else {
        html.setAttribute('data-theme', theme);
    }
    
    // Update active button
    themeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    
    localStorage.setItem('link360-theme', theme);
}

// ================================
// NAVIGATION
// ================================

function initializeNavigation() {
    // Handle navigation clicks
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const page = item.dataset.page;
            if (page) { // Only handle nav items with data-page
                e.preventDefault();
                navigateToPage(page, true); // true = update browser history
            }
        });
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => {
        const path = window.location.pathname;
        const page = path.substring(1) || 'home'; // Remove leading slash
        navigateToPage(page, false); // false = don't push to history again
    });
    
    // Load initial page based on URL
    const initialPath = window.location.pathname;
    const initialPage = initialPath.substring(1) || 'home';
    navigateToPage(initialPage, false);
}

function navigateToPage(page, updateHistory = true) {
    // Default to home if page is root or empty
    if (!page || page === '' || page === '/') {
        page = 'home';
    }
    
    currentPage = page;
    
    // Update browser URL without reloading
    if (updateHistory) {
        window.history.pushState({ page }, '', `/${page}`);
    }
    
    // Save current page to localStorage
    localStorage.setItem('link360-current-page', page);
    
    // Update nav items
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });
    
    // Update pages
    pages.forEach(p => {
        p.style.display = p.id === `${page}Page` ? 'block' : 'none';
    });
    
    // Update title
    const titles = {
        home: 'Home',
        analytics: 'Analytics',
        profile: 'Profile'
    };
    pageTitle.textContent = titles[page] || page;
    document.title = `Link360 - ${titles[page] || page}`;
    
    // Load page data
    if (page === 'home') {
        loadLinks();
    } else if (page === 'analytics') {
        loadAnalytics();
    } else if (page === 'profile') {
        loadProfile();
    }
    
    // Close sidebar on mobile
    if (window.innerWidth <= 1024) {
        sidebar.classList.remove('show');
    }
}

// ================================
// EVENT LISTENERS
// ================================

function initializeEventListeners() {
    // Theme switcher
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });
    
    // Mobile menu toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('show');
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('show') && 
            !sidebar.contains(e.target) && 
            e.target !== mobileMenuBtn) {
            sidebar.classList.remove('show');
        }
    });
    
    // Close sidebar when clicking on nav items on mobile
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                sidebar.classList.remove('show');
            }
        });
    });
    
    // User dropdown
    if (userMenuBtn) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        userDropdown.classList.remove('show');
    });
    
    // Create link modal
    if (createLinkBtn) {
        createLinkBtn.addEventListener('click', openCreateLinkModal);
    }
    
    if (createFirstBtn) {
        createFirstBtn.addEventListener('click', openCreateLinkModal);
    }
    
    if (modalClose) {
        modalClose.addEventListener('click', closeCreateLinkModal);
    }
    
    if (modalCancel) {
        modalCancel.addEventListener('click', closeCreateLinkModal);
    }
    
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeCreateLinkModal);
    }
    
    if (createLinkSubmit) {
        createLinkSubmit.addEventListener('click', handleCreateLink);
    }
    
    // Custom short code validation
    if (customShortCode) {
        // Character counter
        customShortCode.addEventListener('input', () => {
            const value = customShortCode.value;
            shortCodeCounter.textContent = value.length;
            
            // Only allow valid characters
            customShortCode.value = value.replace(/[^a-zA-Z0-9-_]/g, '');
            
            // Real-time validation
            if (value.length > 0) {
                validateCustomShortCode(value);
            } else {
                customShortCodeError.style.display = 'none';
                customShortCodeSuccess.style.display = 'none';
            }
        });
    }
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Search
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Bug Report Modal
    if (reportBugBtn) {
        reportBugBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openBugReportModal();
        });
    }
    
    if (closeBugReportModal) {
        closeBugReportModal.addEventListener('click', closeBugReport);
    }
    
    if (cancelBugReport) {
        cancelBugReport.addEventListener('click', closeBugReport);
    }
    
    if (bugReportForm) {
        bugReportForm.addEventListener('submit', handleBugReport);
    }
    
    // Filter tabs
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filterLinks(tab.dataset.filter);
        });
    });
    
    // Sort
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            sortLinks(sortSelect.value);
        });
    }
    
    // Google Login Button
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', handleGoogleLogin);
    }
    
    // Initialize custom styled selects
    initializeCustomSelects();
}

// ================================
// CUSTOM SELECT ENHANCEMENT
// ================================

function initializeCustomSelects() {
    const selects = document.querySelectorAll('.filter-select');
    
    selects.forEach(select => {
        // Add icon if not already present
        if (!select.classList.contains('enhanced')) {
            select.classList.add('enhanced');
            
            // Update select styling on change
            select.addEventListener('change', () => {
                select.style.fontWeight = '600';
            });
        }
    });
}

// ================================
// AUTHENTICATION
// ================================

async function handleGoogleLogin() {
    try {
        if (typeof firebase === 'undefined' || !firebase.auth) {
            showToast('Firebase is not initialized', 'error');
            return;
        }
        
        const provider = new firebase.auth.GoogleAuthProvider();
        
        // Try popup method first
        try {
            const result = await firebase.auth().signInWithPopup(provider);
            console.log('Signed in:', result.user.displayName);
            showToast('Welcome ' + result.user.displayName + '!', 'success');
            
            // Close login modal on successful sign-in
            loginModal.style.display = 'none';
            
            // Restore last visited page or go to home
            const savedPage = localStorage.getItem('link360-current-page') || 'home';
            navigateToPage(savedPage);
            
        } catch (popupError) {
            // If popup fails, try redirect
            if (popupError.code === 'auth/popup-blocked') {
                console.log('Popup blocked, trying redirect...');
                await firebase.auth().signInWithRedirect(provider);
            } else if (popupError.code === 'auth/popup-closed-by-user') {
                // User closed popup, do nothing
            } else {
                throw popupError;
            }
        }
    } catch (error) {
        console.error('Error signing in:', error);
        
        if (error.code === 'auth/unauthorized-domain') {
            showToast('This domain is not authorized. Please add it to Firebase Console.', 'error');
        } else {
            showToast('Error signing in: ' + error.message, 'error');
        }
    }
}

async function initializeAuth() {
    // Check if user is authenticated
    const token = await getAuthToken();
    
    if (token) {
        try {
            const user = await getCurrentUser();
            if (user) {
                currentUser = user;
                showAuthenticatedUI();
                
                // Get current page from URL instead of localStorage
                const currentPath = window.location.pathname;
                const currentPageFromUrl = currentPath.substring(1) || 'home';
                
                // Load data for the current page
                if (currentPageFromUrl === 'home') {
                    loadLinks();
                } else if (currentPageFromUrl === 'analytics') {
                    loadAnalytics();
                } else if (currentPageFromUrl === 'profile') {
                    loadProfile();
                }
            } else {
                showLoginModal();
            }
        } catch (error) {
            console.error('Auth error:', error);
            showLoginModal();
        }
    } else {
        showLoginModal();
    }
    
    // Handle redirect result
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().getRedirectResult().then((result) => {
            if (result.user) {
                console.log('Signed in via redirect:', result.user.displayName);
                showToast('Welcome ' + result.user.displayName + '!', 'success');
                
                // Close login modal and restore page
                loginModal.style.display = 'none';
                const currentPath = window.location.pathname;
                const currentPageFromUrl = currentPath.substring(1) || 'home';
                navigateToPage(currentPageFromUrl);
            }
        }).catch((error) => {
            console.error('Redirect error:', error);
            showToast('Error signing in: ' + error.message, 'error');
        });
    }
}

async function getAuthToken() {
    return new Promise((resolve) => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    const token = await user.getIdToken();
                    resolve(token);
                } else {
                    resolve(null);
                }
            });
        } else {
            resolve(null);
        }
    });
}

async function getCurrentUser() {
    return new Promise((resolve) => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged((user) => {
                resolve(user);
            });
        } else {
            resolve(null);
        }
    });
}

function showAuthenticatedUI() {
    if (currentUser) {
        // Update sidebar user info
        sidebarUserPhoto.src = currentUser.photoURL || 'https://via.placeholder.com/40';
        sidebarUserName.textContent = currentUser.displayName || 'User';
        sidebarUserEmail.textContent = currentUser.email || '';
        sidebarUser.style.display = 'flex';
        
        // Update topbar user info
        topbarUserPhoto.src = currentUser.photoURL || 'https://via.placeholder.com/40';
        
        // Hide login modal
        loginModal.style.display = 'none';
    }
}

function showLoginModal() {
    loginModal.style.display = 'flex';
}

async function handleLogout(e) {
    e.preventDefault();
    
    if (typeof firebase !== 'undefined' && firebase.auth) {
        try {
            await firebase.auth().signOut();
            currentUser = null;
            userLinks = [];
            showLoginModal();
            showToast('Logged out successfully', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Failed to logout', 'error');
        }
    }
}

// ================================
// MODAL FUNCTIONS
// ================================

function openCreateLinkModal() {
    createLinkModal.classList.add('show');
    destinationUrl.focus();
}

function closeCreateLinkModal() {
    createLinkModal.classList.remove('show');
    clearCreateLinkForm();
}

function clearCreateLinkForm() {
    destinationUrl.value = '';
    customShortCode.value = '';
    shortCodeCounter.textContent = '0';
    customShortCodeError.style.display = 'none';
    customShortCodeSuccess.style.display = 'none';
    utmSource.value = '';
    utmMedium.value = '';
    utmCampaign.value = '';
    utmTerm.value = '';
    utmContent.value = '';
}

// Validate custom short code availability
let validateTimeout;
async function validateCustomShortCode(shortCode) {
    clearTimeout(validateTimeout);
    
    // Basic validation
    if (shortCode.length < 3) {
        customShortCodeError.textContent = 'Short code must be at least 3 characters';
        customShortCodeError.style.display = 'block';
        customShortCodeSuccess.style.display = 'none';
        return false;
    }
    
    if (!/^[a-zA-Z0-9-_]+$/.test(shortCode)) {
        customShortCodeError.textContent = 'Only letters, numbers, hyphens, and underscores allowed';
        customShortCodeError.style.display = 'block';
        customShortCodeSuccess.style.display = 'none';
        return false;
    }
    
    // Check availability with debounce
    validateTimeout = setTimeout(async () => {
        try {
            const db = firebase.firestore();
            const doc = await db.collection('links').doc(shortCode).get();
            
            if (doc.exists) {
                customShortCodeError.textContent = '✗ This short code is already taken';
                customShortCodeError.style.display = 'block';
                customShortCodeSuccess.style.display = 'none';
                return false;
            } else {
                customShortCodeError.style.display = 'none';
                customShortCodeSuccess.style.display = 'block';
                return true;
            }
        } catch (error) {
            console.error('Error checking availability:', error);
            return true; // Allow if check fails
        }
    }, 500);
}

// ================================
// LINK MANAGEMENT
// ================================

async function handleCreateLink() {
    const url = destinationUrl.value.trim();
    
    if (!url) {
        showToast('Please enter a URL', 'error');
        return;
    }
    
    // Validate URL
    try {
        new URL(url);
    } catch (e) {
        showToast('Please enter a valid URL', 'error');
        return;
    }
    
    // Get custom short code
    const customCode = customShortCode.value.trim();
    
    // Validate custom short code if provided
    if (customCode) {
        if (customCode.length < 3) {
            showToast('Custom short code must be at least 3 characters', 'error');
            return;
        }
        if (!/^[a-zA-Z0-9-_]+$/.test(customCode)) {
            showToast('Invalid short code format', 'error');
            return;
        }
        
        // Check if already taken
        try {
            const db = firebase.firestore();
            const doc = await db.collection('links').doc(customCode).get();
            if (doc.exists) {
                showToast('This short code is already taken', 'error');
                return;
            }
        } catch (error) {
            console.error('Error checking short code:', error);
        }
    }
    
    // Get UTM parameters
    const utmParams = {
        source: utmSource.value.trim(),
        medium: utmMedium.value.trim(),
        campaign: utmCampaign.value.trim(),
        term: utmTerm.value.trim(),
        content: utmContent.value.trim()
    };
    
    // Remove empty params
    Object.keys(utmParams).forEach(key => {
        if (!utmParams[key]) delete utmParams[key];
    });
    
    createLinkSubmit.disabled = true;
    createLinkSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    
    try {
        const token = await getAuthToken();
        const response = await fetch('/api/shorten', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                url,
                customShortCode: customCode || null,
                utmParams: Object.keys(utmParams).length > 0 ? utmParams : null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Link created successfully!', 'success');
            closeCreateLinkModal();
            loadLinks();
        } else {
            showToast(data.error || 'Failed to create link', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to create link. Please try again.', 'error');
    } finally {
        createLinkSubmit.disabled = false;
        createLinkSubmit.innerHTML = '<i class="fas fa-plus"></i> Create Link';
    }
}

async function loadLinks() {
    try {
        if (!currentUser) {
            emptyState.style.display = 'block';
            linksContainer.style.display = 'none';
            return;
        }
        
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            showToast('Firestore not available', 'error');
            return;
        }
        
        const db = firebase.firestore();
        
        // Set up real-time listener for links
        if (window.linksUnsubscribe) {
            window.linksUnsubscribe();
        }
        
        window.linksUnsubscribe = db.collection('links')
            .where('userId', '==', currentUser.uid)
            .onSnapshot(async (snapshot) => {
                userLinks = [];
                
                for (const doc of snapshot.docs) {
                    const linkData = doc.data();
                    
                    // Get analytics data for this link (single document per link)
                    const analyticsDoc = await db.collection('analytics').doc(linkData.shortCode).get();
                    const analyticsData = analyticsDoc.exists ? analyticsDoc.data() : { clicks: 0 };
                    
                    userLinks.push({
                        ...linkData,
                        clicks: analyticsData.clicks || 0,
                        id: doc.id
                    });
                }
                
                // Sort by createdAt in memory (newest first)
                userLinks.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(0);
                    return dateB - dateA;
                });
                
                if (userLinks.length > 0) {
                    displayLinks(userLinks);
                    updateStats(userLinks);
                    emptyState.style.display = 'none';
                    linksContainer.style.display = 'grid';
                } else {
                    emptyState.style.display = 'block';
                    linksContainer.style.display = 'none';
                }
            }, (error) => {
                console.error('Error loading links:', error);
                showToast('Failed to load links: ' + error.message, 'error');
            });
        
    } catch (error) {
        console.error('Error setting up links listener:', error);
        showToast('Failed to load links', 'error');
    }
}

function displayLinks(links, filter) {
    // Add "Delete All Inactive" button if viewing inactive links
    let headerHTML = '';
    if (filter === 'inactive' && links.length > 0) {
        headerHTML = `
            <div style="margin-bottom: 20px; padding: 16px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="margin: 0 0 4px 0; color: var(--accent-red); font-size: 14px; font-weight: 600;">
                        <i class="fas fa-exclamation-triangle"></i> Inactive Links
                    </h4>
                    <p style="margin: 0; color: var(--text-secondary); font-size: 13px;">
                        These links will be permanently deleted after 15 days of deactivation
                    </p>
                </div>
                <button class="btn btn-danger" onclick="permanentlyDeleteInactiveLinks()">
                    <i class="fas fa-trash"></i> Delete All Inactive
                </button>
            </div>
        `;
    }
    
    const linksHTML = links.map(link => {
        const isInactive = link.isActive === false;
        const daysRemaining = link.scheduledDeletion ? 
            Math.ceil((link.scheduledDeletion.toDate() - new Date()) / (1000 * 60 * 60 * 24)) : null;
        
        return `
        <div class="link-card ${isInactive ? 'inactive-link' : ''}" data-link-id="${link.shortCode}">
            <div class="link-icon ${isInactive ? 'inactive' : ''}">
                <i class="fas fa-${isInactive ? 'ban' : 'link'}"></i>
            </div>
            <div class="link-content">
                <div class="link-url">
                    <a href="${link.shortUrl}" class="link-short" target="_blank">${link.shortUrl}</a>
                    <button class="btn-icon" onclick="copyLink('${link.shortUrl}')" title="Copy">
                        <i class="fas fa-copy"></i>
                    </button>
                    ${isInactive ? `<span class="inactive-badge">Inactive</span>` : ''}
                </div>
                <div class="link-destination">${link.originalUrl}</div>
                <div class="link-meta">
                    <span><i class="fas fa-calendar"></i> ${formatDate(link.createdAt)}</span>
                    ${link.utmParams ? '<span><i class="fas fa-tags"></i> UTM Enabled</span>' : ''}
                    ${isInactive && daysRemaining ? `<span style="color: var(--accent-red);"><i class="fas fa-clock"></i> Deletes in ${daysRemaining} days</span>` : ''}
                </div>
            </div>
            <div class="link-stats">
                <div class="link-stat">
                    <span class="link-stat-value">${link.clicks || 0}</span>
                    <span class="link-stat-label">Clicks</span>
                </div>
            </div>
            <div class="link-actions">
                ${!isInactive ? `
                    <button class="link-action-btn" onclick="viewAnalytics('${link.shortCode}')" title="Analytics">
                        <i class="fas fa-chart-line"></i>
                    </button>
                    <button class="link-action-btn" onclick="showQRCode('${link.shortUrl}', '${link.shortCode}')" title="QR Code">
                        <i class="fas fa-qrcode"></i>
                    </button>
                    <button class="link-action-btn" onclick="shareLink('${link.shortUrl}')" title="Share">
                        <i class="fas fa-share-alt"></i>
                    </button>
                    <button class="link-action-btn delete" onclick="deleteLink('${link.shortCode}')" title="Deactivate">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : `
                    <button class="link-action-btn" onclick="reactivateLink('${link.shortCode}')" title="Reactivate">
                        <i class="fas fa-redo"></i>
                    </button>
                `}
            </div>
        </div>
    `;
    }).join('');
    
    linksContainer.innerHTML = headerHTML + linksHTML;
}

function updateStats(links) {
    const activeLinks = links.filter(link => link.isActive !== false);
    const totalClicks = activeLinks.reduce((sum, link) => sum + (link.clicks || 0), 0);
    const activeWithClicks = activeLinks.filter(link => link.clicks > 0).length;
    const avgRate = activeLinks.length > 0 ? (totalClicks / activeLinks.length).toFixed(1) : 0;
    
    // Show total count of all links (active + inactive)
    totalLinksEl.textContent = links.length;
    totalClicksEl.textContent = totalClicks.toLocaleString();
    activeLinksEl.textContent = activeWithClicks;
    avgClickRateEl.textContent = avgRate;
    avgClickRateEl.textContent = avgRate;
}

function filterLinks(filter) {
    let filtered = [...userLinks];
    
    if (filter === 'active') {
        // Active links: isActive = true or undefined (for backwards compatibility)
        filtered = filtered.filter(link => link.isActive !== false);
    } else if (filter === 'inactive') {
        // Inactive links: isActive = false
        filtered = filtered.filter(link => link.isActive === false);
    }
    // 'all' shows everything
    
    // Apply current sort order
    const sortSelect = document.getElementById('sortSelect');
    const currentSort = sortSelect?.value || 'recent';
    filtered = applySortOrder(filtered, currentSort);
    
    displayLinks(filtered, filter);
}

function applySortOrder(links, sortBy) {
    let sorted = [...links];
    
    if (sortBy === 'recent') {
        sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'clicks') {
        sorted.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
    } else if (sortBy === 'oldest') {
        sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
    
    return sorted;
}

function sortLinks(sortBy) {
    let sorted = applySortOrder(userLinks, sortBy);
    
    // Apply current filter
    const filterTabs = document.querySelectorAll('.filter-tab');
    let currentFilter = 'all';
    filterTabs.forEach(tab => {
        if (tab.classList.contains('active')) {
            currentFilter = tab.dataset.filter;
        }
    });
    
    if (currentFilter === 'active') {
        sorted = sorted.filter(link => link.isActive !== false);
    } else if (currentFilter === 'inactive') {
        sorted = sorted.filter(link => link.isActive === false);
    }
    
    displayLinks(sorted, currentFilter);
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    
    const filtered = userLinks.filter(link => 
        link.originalUrl.toLowerCase().includes(query) ||
        link.shortUrl.toLowerCase().includes(query) ||
        link.shortCode.toLowerCase().includes(query)
    );
    
    displayLinks(filtered);
}

// ================================
// LINK ACTIONS
// ================================

function copyLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        showToast('Link copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Failed to copy link', 'error');
    });
}

function viewAnalytics(shortCode) {
    // Navigate to analytics page and load specific link
    navigateToPage('analytics');
    loadLinkAnalytics(shortCode);
}

function showQRCode(shortUrl, shortCode) {
    // Create QR code modal
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>QR Code</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="text-align: center;">
                <div id="qr-${shortCode}" style="display: inline-block; padding: 20px; background: white; border-radius: 12px;"></div>
                <p style="margin-top: 16px; color: var(--text-secondary); font-size: 14px;">${shortUrl}</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="downloadQR('${shortCode}')">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Generate QR code
    new QRCode(document.getElementById(`qr-${shortCode}`), {
        text: shortUrl,
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

function downloadQR(shortCode) {
    const qrElement = document.getElementById(`qr-${shortCode}`);
    const canvas = qrElement.querySelector('canvas');
    
    if (canvas) {
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `link360-qr-${shortCode}.png`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('QR code downloaded!', 'success');
        });
    }
}

function shareLink(url) {
    if (navigator.share) {
        navigator.share({
            title: 'Check out this link',
            url: url
        }).catch(() => {});
    } else {
        copyLink(url);
    }
}

async function deleteLink(shortCode) {
    if (!confirm('Are you sure you want to deactivate this link? It will be moved to Inactive section.')) {
        return;
    }
    
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            showToast('Firestore not available', 'error');
            return;
        }
        
        const db = firebase.firestore();
        
        // Find the link document
        const linkQuery = await db.collection('links')
            .where('shortCode', '==', shortCode)
            .where('userId', '==', currentUser.uid)
            .limit(1)
            .get();
        
        if (linkQuery.empty) {
            showToast('Link not found', 'error');
            return;
        }
        
        const linkDoc = linkQuery.docs[0];
        
        // Soft delete: mark as inactive with deletion date
        const deactivationDate = firebase.firestore.Timestamp.now();
        const permanentDeletionDate = new Date();
        permanentDeletionDate.setDate(permanentDeletionDate.getDate() + 15);
        
        await linkDoc.ref.update({
            isActive: false,
            deactivatedAt: deactivationDate,
            scheduledDeletion: firebase.firestore.Timestamp.fromDate(permanentDeletionDate)
        });
        
        showToast('Link deactivated. Will be permanently deleted in 15 days.', 'success');
        loadLinks();
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to deactivate link: ' + error.message, 'error');
    }
}

async function permanentlyDeleteInactiveLinks() {
    if (!confirm('Are you sure you want to permanently delete ALL inactive links? This cannot be undone!')) {
        return;
    }
    
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            showToast('Firestore not available', 'error');
            return;
        }
        
        const db = firebase.firestore();
        
        // Find all inactive links
        const inactiveLinksQuery = await db.collection('links')
            .where('userId', '==', currentUser.uid)
            .where('isActive', '==', false)
            .get();
        
        if (inactiveLinksQuery.empty) {
            showToast('No inactive links to delete', 'info');
            return;
        }
        
        // Delete all inactive links
        const batch = db.batch();
        let count = 0;
        
        inactiveLinksQuery.docs.forEach(doc => {
            batch.delete(doc.ref);
            count++;
        });
        
        await batch.commit();
        
        showToast(`Successfully deleted ${count} inactive link${count > 1 ? 's' : ''}`, 'success');
        loadLinks();
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to delete inactive links: ' + error.message, 'error');
    }
}

async function reactivateLink(shortCode) {
    if (!confirm('Do you want to reactivate this link?')) {
        return;
    }
    
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            showToast('Firestore not available', 'error');
            return;
        }
        
        const db = firebase.firestore();
        
        // Find the link document
        const linkQuery = await db.collection('links')
            .where('shortCode', '==', shortCode)
            .where('userId', '==', currentUser.uid)
            .limit(1)
            .get();
        
        if (linkQuery.empty) {
            showToast('Link not found', 'error');
            return;
        }
        
        const linkDoc = linkQuery.docs[0];
        
        // Reactivate the link
        await linkDoc.ref.update({
            isActive: true,
            deactivatedAt: firebase.firestore.FieldValue.delete(),
            scheduledDeletion: firebase.firestore.FieldValue.delete()
        });
        
        showToast('Link reactivated successfully!', 'success');
        loadLinks();
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to reactivate link: ' + error.message, 'error');
    }
}

// ================================
// ANALYTICS
// ================================

async function loadAnalytics() {
    // Load analytics overview
    const analyticsLinkSelect = document.getElementById('analyticsLinkSelect');
    
    // Populate link selector
    if (analyticsLinkSelect && userLinks.length > 0) {
        analyticsLinkSelect.innerHTML = '<option value="all">All Links</option>' +
            userLinks.map(link => `<option value="${link.shortCode}">${link.shortUrl}</option>`).join('');
        
        // Add change listener
        analyticsLinkSelect.addEventListener('change', () => {
            loadAnalyticsData(analyticsLinkSelect.value);
        });
    }
    
    // Load analytics data
    loadAnalyticsData('all');
    
    // Set up real-time listener
    setupAnalyticsRealtime('all');
}

async function loadLinkAnalytics(shortCode) {
    const analyticsLinkSelect = document.getElementById('analyticsLinkSelect');
    if (analyticsLinkSelect) {
        analyticsLinkSelect.value = shortCode;
    }
    loadAnalyticsData(shortCode);
    setupAnalyticsRealtime(shortCode);
}

async function setupAnalyticsRealtime(linkFilter) {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.log('Firestore not available');
        return;
    }
    
    const db = firebase.firestore();
    
    // Unsubscribe from previous listener if exists
    if (window.analyticsUnsubscribe) {
        window.analyticsUnsubscribe();
    }
    
    // Set up real-time listener for analytics collection (ULTRA FAST!)
    if (linkFilter === 'all') {
        // First, get all shortCodes for current user
        const linksSnapshot = await db.collection('links')
            .where('userId', '==', currentUser.uid)
            .get();
        
        const shortCodes = linksSnapshot.docs.map(doc => doc.data().shortCode);
        
        if (shortCodes.length === 0) {
            console.log('No links found for user');
            return;
        }
        
        // Listen to analytics collection for ALL user's links
        // This will trigger INSTANTLY when any click happens!
        window.analyticsUnsubscribe = db.collection('analytics')
            .where('shortCode', 'in', shortCodes.slice(0, 10)) // Firestore 'in' limit is 10
            .onSnapshot((snapshot) => {
                console.log('🚀 REAL-TIME UPDATE: New click detected! Updating in 100ms...');
                // Ultra-fast debounce (100ms) for smooth updates
                debounceAnalyticsUpdate(() => loadAnalyticsData('all'), 100);
            }, (error) => {
                console.error('Real-time listener error:', error);
            });
        
        // If user has more than 10 links, set up additional listeners
        if (shortCodes.length > 10) {
            for (let i = 10; i < shortCodes.length; i += 10) {
                const batch = shortCodes.slice(i, i + 10);
                db.collection('analytics')
                    .where('shortCode', 'in', batch)
                    .onSnapshot((snapshot) => {
                        console.log('🚀 REAL-TIME UPDATE: New click detected (batch)!');
                        debounceAnalyticsUpdate(() => loadAnalyticsData('all'), 100);
                    });
            }
        }
    } else {
        // Listen to specific link's analytics - INSTANT UPDATES!
        window.analyticsUnsubscribe = db.collection('analytics')
            .where('shortCode', '==', linkFilter)
            .onSnapshot((snapshot) => {
                console.log('🚀 REAL-TIME UPDATE: Click on', linkFilter);
                // Instant update with minimal debounce
                debounceAnalyticsUpdate(() => loadAnalyticsData(linkFilter), 100);
            }, (error) => {
                console.error('Real-time listener error:', error);
            });
    }
}

async function loadAnalyticsData(linkFilter) {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            showToast('Firestore not available', 'error');
            return;
        }
        
        // Check if user is authenticated
        if (!currentUser || !currentUser.uid) {
            console.log('User not authenticated yet, skipping analytics load');
            return;
        }
        
        const db = firebase.firestore();
        let totalClicks = 0;
        let totalImpressions = 0;
        let uniqueVisitors = new Set();
        let countries = new Set();
        let devices = {};
        let browsers = {};
        let referrers = {};
        let clicksOverTime = {};
        let allClickHistory = [];
        
        // Fetch links based on filter
        let linksQuery;
        if (linkFilter === 'all') {
            linksQuery = db.collection('links').where('userId', '==', currentUser.uid);
        } else {
            linksQuery = db.collection('links').where('shortCode', '==', linkFilter).where('userId', '==', currentUser.uid);
        }
        
        const linksSnapshot = await linksQuery.get();
        
        if (linksSnapshot.empty) {
            console.log('No links found for user');
            // Update UI with zeros
            updateAnalyticsUI(0, 0, 0, 0, {}, {}, {}, {});
            return;
        }
        
        // Fetch analytics for each link (NEW STRUCTURE)
        for (const linkDoc of linksSnapshot.docs) {
            const linkData = linkDoc.data();
            const shortCode = linkData.shortCode;
            
            // Get analytics document for this link (single document per link)
            const analyticsDoc = await db.collection('analytics').doc(shortCode).get();
            
            if (analyticsDoc.exists) {
                const analytics = analyticsDoc.data();
                
                console.log(`Analytics for ${shortCode}:`, analytics);
                
                // Aggregate clicks and impressions
                totalClicks += analytics.clicks || 0;
                totalImpressions += analytics.impressions || 0;
                
                // Merge devices
                if (analytics.devices) {
                    Object.entries(analytics.devices).forEach(([device, count]) => {
                        devices[device] = (devices[device] || 0) + count;
                    });
                }
                
                // Merge browsers
                if (analytics.browsers) {
                    Object.entries(analytics.browsers).forEach(([browser, count]) => {
                        browsers[browser] = (browsers[browser] || 0) + count;
                    });
                }
                
                // Merge referrers
                if (analytics.referrers) {
                    Object.entries(analytics.referrers).forEach(([referrer, count]) => {
                        referrers[referrer] = (referrers[referrer] || 0) + count;
                    });
                }
                
                // Process click history for timeline with dynamic granularity
                if (analytics.clickHistory && Array.isArray(analytics.clickHistory)) {
                    allClickHistory.push(...analytics.clickHistory);
                }
                
                // Track countries if available
                if (analytics.countries) {
                    Object.keys(analytics.countries).forEach(country => {
                        countries.add(country);
                    });
                }
            }
        }
        
        // Sort click history by timestamp
        allClickHistory.sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return timeA - timeB;
        });
        
        // Calculate unique visitors from click history (approximate by counting unique referrer+device combinations)
        const visitorFingerprints = new Set();
        allClickHistory.forEach(click => {
            const fingerprint = `${click.referrer}_${click.device}_${click.browser}`;
            visitorFingerprints.add(fingerprint);
        });
        const uniqueVisitorsCount = visitorFingerprints.size || totalClicks; // Fallback to total clicks if no history
        
        // Calculate CTR (Click-Through Rate)
        const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100) : 0;
        
        // Calculate percentage changes (compare last 7 days vs previous 7 days)
        const now = Date.now();
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);
        
        let currentPeriodClicks = 0;
        let previousPeriodClicks = 0;
        let currentPeriodVisitors = new Set();
        let previousPeriodVisitors = new Set();
        
        allClickHistory.forEach(click => {
            const clickTime = new Date(click.timestamp).getTime();
            const fingerprint = `${click.referrer}_${click.device}_${click.browser}`;
            
            if (clickTime >= sevenDaysAgo) {
                currentPeriodClicks++;
                currentPeriodVisitors.add(fingerprint);
            } else if (clickTime >= fourteenDaysAgo && clickTime < sevenDaysAgo) {
                previousPeriodClicks++;
                previousPeriodVisitors.add(fingerprint);
            }
        });
        
        // Calculate percentage changes
        const clicksChange = calculatePercentageChange(currentPeriodClicks, previousPeriodClicks);
        const visitorsChange = calculatePercentageChange(currentPeriodVisitors.size, previousPeriodVisitors.size);
        
        // For impressions and CTR, we'll need to implement historical tracking
        // For now, we'll only show if we have comparison data
        const impressionsChange = null; // Will implement when we have historical impression data
        const ctrChange = null; // Will implement when we have historical CTR data
        
        // Update analytics stats in UI
        document.getElementById('analyticsImpressions').textContent = totalImpressions.toLocaleString();
        document.getElementById('analyticsClicks').textContent = totalClicks.toLocaleString();
        document.getElementById('analyticsCTR').textContent = ctr.toFixed(1) + '%';
        document.getElementById('analyticsVisitors').textContent = uniqueVisitorsCount.toLocaleString();
        
        // Update percentage changes (only show if we have comparison data)
        updateStatChange('impressionsChange', impressionsChange);
        updateStatChange('clicksChange', clicksChange);
        updateStatChange('ctrChange', ctrChange);
        updateStatChange('visitorsChange', visitorsChange);
        
        // Process clicks over time with dynamic granularity
        const clicksOverTimeData = processClicksOverTime(allClickHistory);
        
        const topReferrers = Object.entries(referrers)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([source, count]) => ({ source, count }));
        
        const devicesList = Object.entries(devices)
            .sort((a, b) => b[1] - a[1])
            .map(([device, count]) => ({ device, count }));
        
        const browsersList = Object.entries(browsers)
            .sort((a, b) => b[1] - a[1])
            .map(([browser, count]) => ({ browser, count }));
        
        const geographicList = Array.from(countries).map(country => ({
            country,
            count: 0 // Would need additional tracking for exact counts per country
        }));
        
        // Render charts and lists
        renderClicksChart(clicksOverTimeData);
        renderReferrersChart(topReferrers);
        renderGeographicList(geographicList);
        renderDevicesList(devicesList);
        renderBrowsersList(browsersList);
        renderReferrersList(topReferrers);
        
        console.log('✅ Analytics loaded successfully:', {
            totalImpressions,
            totalClicks,
            ctr: ctr.toFixed(1) + '%',
            uniqueVisitors: uniqueVisitorsCount,
            countries: countries.size
        });
        
    } catch (error) {
        console.error('Error loading analytics:', error);
        showToast('Failed to load analytics: ' + error.message, 'error');
    }
}

// Process clicks over time with dynamic granularity
function processClicksOverTime(clickHistory) {
    if (!clickHistory || clickHistory.length === 0) {
        return { labels: [], data: [], granularity: 'none' };
    }
    
    const now = Date.now();
    const firstClick = new Date(clickHistory[0].timestamp).getTime();
    const ageInMinutes = (now - firstClick) / (1000 * 60);
    
    let granularity;
    let formatLabel;
    let groupKey;
    
    if (ageInMinutes <= 60) {
        // First hour: Show per minute
        granularity = 'minute';
        formatLabel = (date) => {
            const d = new Date(date);
            return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        };
        groupKey = (timestamp) => {
            const d = new Date(timestamp);
            d.setSeconds(0, 0);
            return d.getTime();
        };
    } else if (ageInMinutes <= 1440) {
        // First 24 hours: Show per hour
        granularity = 'hour';
        formatLabel = (date) => {
            const d = new Date(date);
            return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        };
        groupKey = (timestamp) => {
            const d = new Date(timestamp);
            d.setMinutes(0, 0, 0);
            return d.getTime();
        };
    } else {
        // After 24 hours: Show per day
        granularity = 'day';
        formatLabel = (date) => {
            const d = new Date(date);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        };
        groupKey = (timestamp) => {
            const d = new Date(timestamp);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        };
    }
    
    // Group clicks by time period
    const grouped = {};
    clickHistory.forEach(click => {
        const key = groupKey(click.timestamp);
        grouped[key] = (grouped[key] || 0) + 1;
    });
    
    // Convert to array and sort
    const sorted = Object.entries(grouped)
        .map(([timestamp, count]) => ({
            timestamp: parseInt(timestamp),
            count
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
    
    // Fill in missing time periods with 0
    if (sorted.length > 0) {
        const filled = [];
        const start = sorted[0].timestamp;
        const end = sorted[sorted.length - 1].timestamp;
        
        let interval;
        if (granularity === 'minute') interval = 60 * 1000;
        else if (granularity === 'hour') interval = 60 * 60 * 1000;
        else interval = 24 * 60 * 60 * 1000;
        
        for (let t = start; t <= end; t += interval) {
            const existing = sorted.find(s => s.timestamp === t);
            filled.push({
                label: formatLabel(t),
                count: existing ? existing.count : 0
            });
        }
        
        return { 
            labels: filled.map(f => f.label), 
            data: filled.map(f => f.count),
            granularity 
        };
    }
    
    return { 
        labels: sorted.map(s => formatLabel(s.timestamp)), 
        data: sorted.map(s => s.count),
        granularity 
    };
}

function renderClicksChart(chartData) {
    // Implement with Chart.js
    const ctx = document.getElementById('clicksChart');
    if (!ctx) return;
    
    // Destroy existing chart if any
    if (window.clicksChartInstance) {
        window.clicksChartInstance.destroy();
    }
    
    const { labels, data, granularity } = chartData;
    
    // Create new chart
    window.clicksChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Clicks (${granularity === 'minute' ? 'per minute' : granularity === 'hour' ? 'per hour' : 'per day'})`,
                data: data,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderReferrersChart(data) {
    // Implement with Chart.js
    const ctx = document.getElementById('referrersChart');
    if (!ctx) return;
    
    if (window.referrersChartInstance) {
        window.referrersChartInstance.destroy();
    }
    
    window.referrersChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.source),
            datasets: [{
                data: data.map(d => d.count),
                backgroundColor: [
                    '#8b5cf6',
                    '#3b82f6',
                    '#10b981',
                    '#f59e0b',
                    '#ef4444'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function renderGeographicList(data) {
    const container = document.getElementById('geographicList');
    if (!container) return;
    
    container.innerHTML = data.map(item => `
        <div class="analytics-item">
            <span class="analytics-item-label">${item.country}</span>
            <span class="analytics-item-value">${item.count}</span>
        </div>
    `).join('') || '<p style="color: var(--text-secondary); text-align: center;">No data available</p>';
}

function renderDevicesList(data) {
    const container = document.getElementById('devicesList');
    if (!container) return;
    
    container.innerHTML = data.map(item => `
        <div class="analytics-item">
            <span class="analytics-item-label">${item.device}</span>
            <span class="analytics-item-value">${item.count}</span>
        </div>
    `).join('') || '<p style="color: var(--text-secondary); text-align: center;">No data available</p>';
}

function renderBrowsersList(data) {
    const container = document.getElementById('browsersList');
    if (!container) return;
    
    container.innerHTML = data.map(item => `
        <div class="analytics-item">
            <span class="analytics-item-label">${item.browser}</span>
            <span class="analytics-item-value">${item.count}</span>
        </div>
    `).join('') || '<p style="color: var(--text-secondary); text-align: center;">No data available</p>';
}

function renderReferrersList(data) {
    const container = document.getElementById('referrersList');
    if (!container) return;
    
    container.innerHTML = data.map(item => `
        <div class="analytics-item">
            <span class="analytics-item-label">${item.source}</span>
            <span class="analytics-item-value">${item.count}</span>
        </div>
    `).join('') || '<p style="color: var(--text-secondary); text-align: center;">No data available</p>';
}

// Calculate percentage change between current and previous period
function calculatePercentageChange(current, previous) {
    if (previous === 0) {
        return current > 0 ? { value: 100, isPositive: true } : null;
    }
    const change = ((current - previous) / previous) * 100;
    return {
        value: Math.abs(change),
        isPositive: change >= 0
    };
}

// Update stat change element
function updateStatChange(elementId, changeData) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (!changeData || changeData.value === 0) {
        element.style.display = 'none';
        return;
    }
    
    element.style.display = 'block';
    element.className = `stat-change ${changeData.isPositive ? 'positive' : 'negative'}`;
    element.textContent = `${changeData.isPositive ? '+' : '-'}${changeData.value.toFixed(1)}%`;
}

// ================================
// PROFILE
// ================================

function loadProfile() {
    if (!currentUser) return;
    
    const profileAvatar = document.getElementById('profileAvatar');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    
    if (profileAvatar) profileAvatar.src = currentUser.photoURL || 'https://via.placeholder.com/100';
    if (profileName) profileName.value = currentUser.displayName || '';
    if (profileEmail) profileEmail.value = currentUser.email || '';
}

// ================================
// UTILITY FUNCTIONS
// ================================

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 16px 24px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Make functions globally available
window.copyLink = copyLink;
window.viewAnalytics = viewAnalytics;
window.showQRCode = showQRCode;
window.downloadQR = downloadQR;
window.shareLink = shareLink;
window.deleteLink = deleteLink;

// ================================
// BUG REPORT FUNCTIONALITY
// ================================

function openBugReportModal() {
    bugReportModal.style.display = 'flex';
    
    // Pre-fill email if user is logged in
    if (currentUser && currentUser.email) {
        document.getElementById('bugEmail').value = currentUser.email;
    }
}

function closeBugReport() {
    bugReportModal.style.display = 'none';
    bugReportForm.reset();
}

async function handleBugReport(e) {
    e.preventDefault();
    
    const bugTitle = document.getElementById('bugTitle').value.trim();
    const bugDescription = document.getElementById('bugDescription').value.trim();
    const bugSteps = document.getElementById('bugSteps').value.trim();
    const bugEmail = document.getElementById('bugEmail').value.trim();
    
    if (!bugTitle || !bugDescription) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Prepare email content
    const emailSubject = `Bug Report: ${bugTitle}`;
    const emailBody = `Bug Report from Link360
    
Title: ${bugTitle}

Description:
${bugDescription}

${bugSteps ? `Steps to Reproduce:\n${bugSteps}\n` : ''}
${bugEmail ? `Reporter Email: ${bugEmail}\n` : ''}
${currentUser ? `User ID: ${currentUser.uid}\nUser Email: ${currentUser.email}\n` : ''}
Browser: ${navigator.userAgent}
Date: ${new Date().toISOString()}`;
    
    // Create mailto link
    const mailtoLink = `mailto:atharakram@zohomail.in?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    
    // Open email client
    window.location.href = mailtoLink;
    
    // Close modal and show success message
    closeBugReport();
    showToast('Thank you for your bug report! Your email client will open.', 'success');
}
