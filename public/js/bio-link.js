// ================================
// BIO LINK MODULE
// ================================

let bioLinks = [];
let currentBioLink = null;
let bioLinkItems = [];

// Initialize Bio Link functionality
function initBioLink() {
    console.log('Initializing Bio Link module');
    
    // Wait for Firebase to be ready
    if (typeof firebase === 'undefined') {
        console.error('Firebase not loaded');
        setTimeout(initBioLink, 500);
        return;
    }

    // Check current auth state
    const user = firebase.auth().currentUser;
    if (user) {
        loadBioLinks();
    } else {
        // Wait for auth state to be established
        const unsubscribe = firebase.auth().onAuthStateChanged((authUser) => {
            if (authUser) {
                loadBioLinks();
                unsubscribe(); // Stop listening after first load
            } else {
                console.log('User not authenticated for bio links');
                const container = document.getElementById('bioLinksContainer');
                const emptyState = document.getElementById('bioLinksEmptyState');
                if (container) container.style.display = 'none';
                if (emptyState) {
                    emptyState.style.display = 'flex';
                    emptyState.innerHTML = `
                        <div class="empty-state-icon">
                            <i class="fas fa-lock"></i>
                        </div>
                        <h3>Please log in</h3>
                        <p>You need to be logged in to create bio links</p>
                    `;
                }
                unsubscribe();
            }
        });
    }
}

// Load all bio links for the current user
async function loadBioLinks() {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            console.error('Firebase not ready');
            showToast('Firebase not initialized', 'error');
            return;
        }

        const user = firebase.auth().currentUser;
        if (!user || !user.uid) {
            console.error('User not authenticated');
            showToast('Please log in to view bio links', 'error');
            return;
        }

        console.log('Loading bio links for user:', user.uid);

        const db = firebase.firestore();
        const bioLinksSnapshot = await db.collection('bioLinks')
            .where('userId', '==', user.uid)
            .get();

        bioLinks = [];
        bioLinksSnapshot.forEach(doc => {
            bioLinks.push({ id: doc.id, ...doc.data() });
        });

        console.log('Loaded', bioLinks.length, 'bio links');

        // Sort by creation date (most recent first)
        bioLinks.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
        });

        renderBioLinks();
        updateBioLinkStats();
        
        // Show editor or empty state
        const createBtn = document.getElementById('createBioLinkBtn');
        const editor = document.getElementById('bioLinkEditor');
        const emptyState = document.getElementById('bioLinksEmptyState');
        const statsGrid = document.getElementById('bioLinkStatsGrid');
        
        if (bioLinks.length > 0) {
            // Hide create button and show editor
            if (createBtn) createBtn.style.display = 'none';
            if (emptyState) emptyState.style.display = 'none';
            if (editor) {
                editor.style.display = 'block';
                loadBioLinkIntoEditor(bioLinks[0]);
            }
            if (statsGrid) statsGrid.style.display = 'grid';
        } else {
            // Show create button and empty state
            if (createBtn) createBtn.style.display = 'flex';
            if (editor) editor.style.display = 'none';
            if (emptyState) emptyState.style.display = 'flex';
            if (statsGrid) statsGrid.style.display = 'none';
        }

    } catch (error) {
        console.error('Error loading bio links:', error);
        showToast('Failed to load bio links: ' + (error.message || 'Unknown error'), 'error');
    }
}

// Render bio links grid
function renderBioLinks() {
    // No longer needed - using inline editor
}

// Update bio link stats
function updateBioLinkStats() {
    const totalBioLinks = bioLinks.length;
    const totalViews = bioLinks.reduce((sum, bl) => sum + (bl.views || 0), 0);
    const totalClicks = bioLinks.reduce((sum, bl) => sum + (bl.clicks || 0), 0);
    const avgCTR = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : 0;

    document.getElementById('totalBioLinks').textContent = totalBioLinks;
    document.getElementById('totalBioViews').textContent = totalViews;
    document.getElementById('totalBioClicks').textContent = totalClicks;
    document.getElementById('avgBioCTR').textContent = avgCTR + '%';
}

// Open bio link modal
function openBioLinkModal(bioLinkId = null) {
    const modal = document.getElementById('bioLinkModal');
    const modalTitle = document.getElementById('bioLinkModalTitle');

    // Reset form
    document.getElementById('bioLinkName').value = '';
    document.getElementById('bioLinkSlug').value = '';
    document.getElementById('bioLinkDescription').value = '';
    document.getElementById('bioProfilePicture').value = '';
    document.getElementById('bioProfilePictureFile').value = '';
    document.getElementById('bioProfilePicturePreview').style.display = 'none';
    document.getElementById('bioThemeColor').value = '#06b6d4';
    document.getElementById('bioThemeColorHex').value = '#06b6d4';
    document.getElementById('bioBackgroundStyle').value = 'gradient';
    document.getElementById('bioInstagram').value = '';
    document.getElementById('bioTwitter').value = '';
    document.getElementById('bioLinkedIn').value = '';
    document.getElementById('bioGithub').value = '';
    document.getElementById('bioYoutube').value = '';
    document.getElementById('bioWebsite').value = '';
    
    bioLinkItems = [];
    renderBioLinkItems();

    if (bioLinkId) {
        // Edit mode
        currentBioLink = bioLinks.find(bl => bl.id === bioLinkId);
        if (currentBioLink) {
            modalTitle.textContent = 'Edit Bio Link';
            document.getElementById('bioLinkName').value = currentBioLink.name || '';
            document.getElementById('bioLinkSlug').value = currentBioLink.slug || '';
            document.getElementById('bioLinkDescription').value = currentBioLink.description || '';
            document.getElementById('bioProfilePicture').value = currentBioLink.profilePicture || '';
            
            // Show existing profile picture preview
            if (currentBioLink.profilePicture) {
                showBioProfilePicturePreview(currentBioLink.profilePicture, 'Existing photo');
            }
            
            document.getElementById('bioThemeColor').value = currentBioLink.themeColor || '#06b6d4';
            document.getElementById('bioThemeColorHex').value = currentBioLink.themeColor || '#06b6d4';
            document.getElementById('bioBackgroundStyle').value = currentBioLink.backgroundStyle || 'gradient';
            document.getElementById('bioInstagram').value = currentBioLink.social?.instagram || '';
            document.getElementById('bioTwitter').value = currentBioLink.social?.twitter || '';
            document.getElementById('bioLinkedIn').value = currentBioLink.social?.linkedin || '';
            document.getElementById('bioGithub').value = currentBioLink.social?.github || '';
            document.getElementById('bioYoutube').value = currentBioLink.social?.youtube || '';
            document.getElementById('bioWebsite').value = currentBioLink.social?.website || '';
            bioLinkItems = currentBioLink.links || [];
            renderBioLinkItems();
        }
    } else {
        // Create mode
        modalTitle.textContent = 'Create Bio Link';
        currentBioLink = null;
    }

    modal.style.display = 'flex';
}

// Close bio link modal
function closeBioLinkModal() {
    document.getElementById('bioLinkModal').style.display = 'none';
    currentBioLink = null;
    bioLinkItems = [];
}

// Render bio link items in modal
function renderBioLinkItems() {
    const container = document.getElementById('bioLinksListContainer');
    if (!container) return;

    if (bioLinkItems.length === 0) {
        container.innerHTML = '<p style="color: var(--text-tertiary); font-size: 14px; text-align: center; padding: 12px;">No links added yet. Click "Add Link" to get started.</p>';
        return;
    }

    container.innerHTML = bioLinkItems.map((item, index) => `
        <div class="bio-link-item" data-index="${index}">
            <div class="bio-link-item-handle">
                <i class="fas fa-grip-vertical"></i>
            </div>
            <div class="bio-link-item-content">
                <input type="text" class="form-input" placeholder="Link Title" value="${item.title || ''}" onchange="updateBioLinkItem(${index}, 'title', this.value)">
                <input type="url" class="form-input" placeholder="https://example.com" value="${item.url || ''}" onchange="updateBioLinkItem(${index}, 'url', this.value)">
            </div>
            <button class="btn-icon" onclick="removeBioLinkItem(${index})" title="Remove">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// Add new bio link item
function addBioLinkItem() {
    bioLinkItems.push({ title: '', url: '' });
    renderBioLinkItems();
}

// Update bio link item
function updateBioLinkItem(index, field, value) {
    if (bioLinkItems[index]) {
        bioLinkItems[index][field] = value;
    }
}

// Remove bio link item
function removeBioLinkItem(index) {
    bioLinkItems.splice(index, 1);
    renderBioLinkItems();
}

// Save bio link
async function saveBioLink() {
    try {
        // Check if Firebase is ready
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            showToast('Firebase not ready. Please try again.', 'error');
            return;
        }

        if (!currentUser || !currentUser.uid) {
            showToast('You must be logged in to save bio links', 'error');
            return;
        }

        const name = document.getElementById('bioLinkName').value.trim();
        const slug = document.getElementById('bioLinkSlug').value.trim();
        const description = document.getElementById('bioLinkDescription').value.trim();

        // Validation
        if (!name) {
            showToast('Please enter a bio link name', 'error');
            return;
        }

        if (!slug || !/^[a-zA-Z0-9-_]+$/.test(slug)) {
            showToast('Please enter a valid URL slug', 'error');
            return;
        }

        // Check if slug is available (only if creating new or slug changed)
        const db = firebase.firestore();
        
        if (!currentBioLink || currentBioLink.slug !== slug) {
            const existingSlug = await db.collection('bioLinks')
                .where('slug', '==', slug)
                .get();

            if (!existingSlug.empty) {
                showToast('This URL slug is already taken', 'error');
                return;
            }
        }

        // Filter out empty links
        const validLinks = bioLinkItems.filter(item => item.title && item.url);

        const bioLinkData = {
            userId: currentUser.uid,
            name,
            slug,
            description,
            profilePicture: document.getElementById('bioProfilePicture').value.trim(),
            themeColor: document.getElementById('bioThemeColor').value,
            backgroundStyle: document.getElementById('bioBackgroundStyle').value,
            links: validLinks,
            social: {
                instagram: document.getElementById('bioInstagram').value.trim(),
                twitter: document.getElementById('bioTwitter').value.trim(),
                linkedin: document.getElementById('bioLinkedIn').value.trim(),
                github: document.getElementById('bioGithub').value.trim(),
                youtube: document.getElementById('bioYoutube').value.trim(),
                website: document.getElementById('bioWebsite').value.trim()
            },
            views: currentBioLink?.views || 0,
            clicks: currentBioLink?.clicks || 0,
            verified: currentBioLink?.verified || false,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (currentBioLink) {
            // Update existing
            await db.collection('bioLinks').doc(currentBioLink.id).update(bioLinkData);
            showToast('Bio link updated successfully!', 'success');
        } else {
            // Check if user already has a bio link
            const userBioLinks = await db.collection('bioLinks')
                .where('userId', '==', currentUser.uid)
                .get();
            
            if (!userBioLinks.empty) {
                showToast('You can only create one bio link. Please edit your existing one.', 'error');
                closeBioLinkModal();
                return;
            }
            
            // Create new
            bioLinkData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('bioLinks').add(bioLinkData);
            showToast('Bio link created successfully!', 'success');
        }

        closeBioLinkModal();
        loadBioLinks();

    } catch (error) {
        console.error('Error saving bio link:', error);
        showToast('Failed to save bio link: ' + error.message, 'error');
    }
}

// Copy bio link to clipboard
function copyBioLink(slug) {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
        showToast('Link copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Copy failed:', err);
        showToast('Failed to copy link', 'error');
    });
}

// View bio link in new tab
function viewBioLink(slug) {
    window.open(`/${slug}`, '_blank');
}

// Edit bio link
function editBioLink(bioLinkId) {
    openBioLinkModal(bioLinkId);
}

// Delete bio link
async function deleteBioLink(bioLinkId) {
    if (!confirm('Are you sure you want to delete this bio link? This action cannot be undone.')) {
        return;
    }

    try {
        const db = firebase.firestore();
        await db.collection('bioLinks').doc(bioLinkId).delete();
        showToast('Bio link deleted successfully', 'success');
        loadBioLinks();
    } catch (error) {
        console.error('Error deleting bio link:', error);
        showToast('Failed to delete bio link', 'error');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Create bio link button
    const createBioLinkBtn = document.getElementById('createBioLinkBtn');
    if (createBioLinkBtn) {
        createBioLinkBtn.addEventListener('click', () => openBioLinkModal());
    }

    // Create first bio button
    const createFirstBioBtn = document.getElementById('createFirstBioBtn');
    if (createFirstBioBtn) {
        createFirstBioBtn.addEventListener('click', () => openBioLinkModal());
    }

    // Modal close buttons
    const bioLinkModalClose = document.getElementById('bioLinkModalClose');
    if (bioLinkModalClose) {
        bioLinkModalClose.addEventListener('click', closeBioLinkModal);
    }

    const bioLinkModalCancel = document.getElementById('bioLinkModalCancel');
    if (bioLinkModalCancel) {
        bioLinkModalCancel.addEventListener('click', closeBioLinkModal);
    }

    const bioLinkModalOverlay = document.getElementById('bioLinkModalOverlay');
    if (bioLinkModalOverlay) {
        bioLinkModalOverlay.addEventListener('click', closeBioLinkModal);
    }

    // Save button
    const saveBioLinkBtn = document.getElementById('saveBioLinkBtn');
    if (saveBioLinkBtn) {
        saveBioLinkBtn.addEventListener('click', saveBioLink);
    }

    // Add link item button
    const addBioLinkItemBtn = document.getElementById('addBioLinkItemBtn');
    if (addBioLinkItemBtn) {
        addBioLinkItemBtn.addEventListener('click', addBioLinkItem);
    }

    // Description character counter
    const bioLinkDescription = document.getElementById('bioLinkDescription');
    const bioDescCount = document.getElementById('bioDescCount');
    if (bioLinkDescription && bioDescCount) {
        bioLinkDescription.addEventListener('input', (e) => {
            bioDescCount.textContent = e.target.value.length;
        });
    }

    // Theme color sync
    const bioThemeColor = document.getElementById('bioThemeColor');
    const bioThemeColorHex = document.getElementById('bioThemeColorHex');
    if (bioThemeColor && bioThemeColorHex) {
        bioThemeColor.addEventListener('input', (e) => {
            bioThemeColorHex.value = e.target.value.toUpperCase();
        });
        bioThemeColorHex.addEventListener('input', (e) => {
            const color = e.target.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                bioThemeColor.value = color;
            }
        });
    }

    // Slug validation
    const bioLinkSlug = document.getElementById('bioLinkSlug');
    const bioSlugError = document.getElementById('bioSlugError');
    const bioSlugSuccess = document.getElementById('bioSlugSuccess');
    
    if (bioLinkSlug && bioSlugError && bioSlugSuccess) {
        let slugCheckTimeout;
        bioLinkSlug.addEventListener('input', (e) => {
            const slug = e.target.value.trim();
            
            clearTimeout(slugCheckTimeout);
            bioSlugError.style.display = 'none';
            bioSlugSuccess.style.display = 'none';

            if (!slug) return;

            if (!/^[a-zA-Z0-9-_]+$/.test(slug)) {
                bioSlugError.textContent = 'Only letters, numbers, hyphens, and underscores allowed';
                bioSlugError.style.display = 'block';
                return;
            }

            slugCheckTimeout = setTimeout(async () => {
                try {
                    // Skip check if editing and slug hasn't changed
                    if (currentBioLink && currentBioLink.slug === slug) {
                        bioSlugSuccess.style.display = 'block';
                        return;
                    }

                    const db = firebase.firestore();
                    const existingSlug = await db.collection('bioLinks')
                        .where('slug', '==', slug)
                        .get();

                    if (existingSlug.empty) {
                        bioSlugSuccess.style.display = 'block';
                    } else {
                        bioSlugError.textContent = 'This URL slug is already taken';
                        bioSlugError.style.display = 'block';
                    }
                } catch (error) {
                    console.error('Error checking slug:', error);
                }
            }, 500);
        });
    }

    // Import data button
    const importDataBtn = document.getElementById('importDataBtn');
    if (importDataBtn) {
        importDataBtn.addEventListener('click', importFromPlatform);
    }
});

// ================================
// IMPORT FROM OTHER PLATFORMS
// ================================

async function importFromPlatform() {
    const importUrl = document.getElementById('importUrl').value.trim();
    const importStatus = document.getElementById('importStatus');
    const importBtn = document.getElementById('importDataBtn');
    
    if (!importUrl) {
        showImportStatus('Please enter a URL', 'error');
        return;
    }

    // Detect platform
    let platform = null;
    let username = null;

    if (importUrl.includes('linktr.ee') || importUrl.includes('linktree.com')) {
        platform = 'linktree';
        const match = importUrl.match(/(?:https?:\/\/)?(?:www\.)?linktr\.ee\/([a-zA-Z0-9_.-]+)|(?:https?:\/\/)?(?:www\.)?linktree\.com\/([a-zA-Z0-9_.-]+)/);
        username = match ? (match[1] || match[2]) : null;
    } else if (importUrl.includes('bento.me')) {
        platform = 'bento';
        const match = importUrl.match(/(?:https?:\/\/)?(?:www\.)?bento\.me\/([a-zA-Z0-9_.-]+)/);
        username = match ? match[1] : null;
    }

    if (!platform || !username) {
        showImportStatus('Invalid URL. Please enter a valid Linktree or Bento URL', 'error');
        return;
    }

    // Show loading
    const originalText = importBtn.innerHTML;
    importBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importing...';
    importBtn.disabled = true;
    showImportStatus('Fetching your data...', 'loading');

    try {
        let data;
        if (platform === 'linktree') {
            data = await importFromLinktree(username);
        } else if (platform === 'bento') {
            data = await importFromBento(username);
        }

        if (data) {
            fillFormWithImportedData(data);
            showImportStatus(`✓ Successfully imported from ${platform === 'linktree' ? 'Linktree' : 'Bento'}!`, 'success');
            
            // Clear import URL after successful import
            setTimeout(() => {
                document.getElementById('importUrl').value = '';
                importStatus.style.display = 'none';
            }, 3000);
        } else {
            showImportStatus('Could not fetch data. Make sure your profile is public.', 'error');
        }
    } catch (error) {
        console.error('Import error:', error);
        showImportStatus('Failed to import data. Please try again.', 'error');
    } finally {
        importBtn.innerHTML = originalText;
        importBtn.disabled = false;
    }
}

async function importFromLinktree(username) {
    try {
        const url = `https://linktr.ee/${username}`;
        
        // Use our server-side proxy to avoid CORS issues
        const response = await fetch('/api/import-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch Linktree data');
        }
        
        const result = await response.json();
        const html = result.html;
        
        console.log('Fetched HTML length:', html.length);
        
        // Parse HTML to find __NEXT_DATA__ script tag
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Look for Next.js data
        const nextDataScript = doc.querySelector('script#__NEXT_DATA__');
        if (nextDataScript) {
            const nextData = JSON.parse(nextDataScript.textContent);
            console.log('Linktree Next.js data:', nextData);
            return parseLinktreeData(nextData.props?.pageProps || nextData, username);
        }
        
        // Method 2: Try to find embedded JSON in script tags
        const allScripts = doc.querySelectorAll('script');
        for (const script of allScripts) {
            const content = script.textContent;
            if (content.includes('account') && content.includes('links')) {
                try {
                    const jsonMatch = content.match(/({.*})/s);
                    if (jsonMatch) {
                        const jsonData = JSON.parse(jsonMatch[1]);
                        console.log('Found embedded JSON:', jsonData);
                        return parseLinktreeData(jsonData, username);
                    }
                } catch (e) {
                    continue;
                }
            }
        }
        
        throw new Error('Could not extract Linktree data');
        
    } catch (error) {
        console.error('Linktree import error:', error);
        return null;
    }
}

function parseLinktreeData(props, username) {
    const data = {
        name: '',
        description: '',
        links: [],
        profilePicture: '',
        social: {}
    };
    
    // Extract account info
    if (props.account) {
        if (props.account.username) data.name = props.account.username;
        if (props.account.pageTitle) data.name = props.account.pageTitle;
        if (props.account.description) data.description = props.account.description;
        if (props.account.profilePictureUrl) data.profilePicture = props.account.profilePictureUrl;
    }
    
    // Extract links - try multiple possible paths
    let links = props.links || props.account?.links || [];
    
    console.log('Parsing links:', links);
    
    if (links && Array.isArray(links)) {
        links.forEach(link => {
            // Skip social links, only get regular links
            if (link.url && link.title && link.type !== 'SOCIAL_LINK' && link.type !== 'SOCIAL') {
                data.links.push({
                    title: link.title,
                    url: link.url
                });
            }
        });
    }
    
    // Extract social links from multiple possible locations
    let socialLinks = props.socialLinks || props.account?.socialLinks || [];
    
    console.log('Parsing social links:', socialLinks);
    
    if (socialLinks && Array.isArray(socialLinks)) {
        socialLinks.forEach(social => {
            extractSocialLink(social.url, data.social);
        });
    }
    
    // Also check for links that might be social in the main links array
    if (links && Array.isArray(links)) {
        links.forEach(link => {
            if ((link.type === 'SOCIAL_LINK' || link.type === 'SOCIAL') && link.url) {
                extractSocialLink(link.url, data.social);
            }
        });
    }
    
    // If no name found, use username
    if (!data.name) {
        data.name = username;
    }
    
    console.log('Final parsed data:', data);
    return data;
}

function extractSocialLink(url, socialObj) {
    if (!url) return;
    
    if (url.includes('instagram.com') && !socialObj.instagram) {
        const match = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
        if (match) socialObj.instagram = match[1];
    } else if ((url.includes('twitter.com') || url.includes('x.com')) && !socialObj.twitter) {
        const match = url.match(/(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/);
        if (match) socialObj.twitter = match[1];
    } else if (url.includes('youtube.com') && !socialObj.youtube) {
        socialObj.youtube = url;
    } else if (url.includes('tiktok.com') && !socialObj.tiktok) {
        const match = url.match(/tiktok\.com\/@?([a-zA-Z0-9_.]+)/);
        if (match) socialObj.tiktok = match[1];
    } else if (url.includes('github.com') && !socialObj.github) {
        const match = url.match(/github\.com\/([a-zA-Z0-9_-]+)/);
        if (match) socialObj.github = match[1];
    } else if (url.includes('linkedin.com') && !socialObj.linkedin) {
        socialObj.linkedin = url;
    }
}

async function importFromBento(username) {
    try {
        const url = `https://bento.me/${username}`;
        
        // Use our server-side proxy to avoid CORS issues
        const response = await fetch('/api/import-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch Bento data');
        }
        
        const result = await response.json();
        const html = result.html;
        
        // Parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const data = {
            name: '',
            description: '',
            links: [],
            profilePicture: '',
            social: {}
        };

        // Try to get name from meta tags
        const ogTitle = doc.querySelector('meta[property="og:title"]');
        if (ogTitle) {
            data.name = ogTitle.content;
        }

        // Try to get description
        const ogDescription = doc.querySelector('meta[property="og:description"]');
        if (ogDescription) {
            data.description = ogDescription.content;
        }

        // Try to get profile picture
        const ogImage = doc.querySelector('meta[property="og:image"]');
        if (ogImage) {
            data.profilePicture = ogImage.content;
        }
        
        // Try to extract data from Next.js __NEXT_DATA__ script
        const nextDataScript = doc.querySelector('script#__NEXT_DATA__');
        if (nextDataScript) {
            try {
                const nextData = JSON.parse(nextDataScript.textContent);
                const pageProps = nextData?.props?.pageProps;
                
                if (pageProps) {
                    if (pageProps.user) {
                        if (pageProps.user.name) data.name = pageProps.user.name;
                        if (pageProps.user.bio) data.description = pageProps.user.bio;
                        if (pageProps.user.avatar) data.profilePicture = pageProps.user.avatar;
                    }
                    
                    // Extract links/components
                    if (pageProps.components && Array.isArray(pageProps.components)) {
                        pageProps.components.forEach(component => {
                            if (component.type === 'link' && component.url && component.title) {
                                data.links.push({
                                    title: component.title,
                                    url: component.url
                                });
                            }
                            
                            // Extract social links
                            if (component.type === 'social' || component.platform) {
                                const url = component.url || '';
                                if (url) {
                                    extractSocialLink(url, data.social);
                                }
                            }
                        });
                    }
                }
            } catch (e) {
                console.log('Could not parse NEXT_DATA:', e);
            }
        }

        // If no name found, use username
        if (!data.name) {
            data.name = username;
        }

        return data;
    } catch (error) {
        console.error('Bento import error:', error);
        return null;
    }
}

function fillFormWithImportedData(data) {
    // Fill basic info
    if (data.name) {
        document.getElementById('bioLinkName').value = data.name;
    }

    if (data.description) {
        const descField = document.getElementById('bioLinkDescription');
        descField.value = data.description.substring(0, 200);
        document.getElementById('bioDescCount').textContent = descField.value.length;
    }

    // Auto-generate slug from name
    if (data.name && !document.getElementById('bioLinkSlug').value) {
        const slug = data.name.toLowerCase()
            .replace(/[^a-z0-9-_]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        document.getElementById('bioLinkSlug').value = slug;
        document.getElementById('bioLinkSlug').dispatchEvent(new Event('input'));
    }

    // Fill profile picture URL if available
    if (data.profilePicture) {
        // Store the URL for later use
        window.importedProfilePictureUrl = data.profilePicture;
        showToast('Profile picture URL imported. You can upload it manually if needed.', 'info');
    }

    // Fill social links
    if (data.social) {
        if (data.social.instagram) {
            document.getElementById('bioInstagram').value = data.social.instagram;
        }
        if (data.social.twitter) {
            document.getElementById('bioTwitter').value = data.social.twitter;
        }
        if (data.social.youtube) {
            document.getElementById('bioYoutube').value = data.social.youtube;
        }
        if (data.social.tiktok) {
            document.getElementById('bioTiktok').value = data.social.tiktok;
        }
        if (data.social.github) {
            document.getElementById('bioGithub').value = data.social.github;
        }
    }

    // Add links
    if (data.links && data.links.length > 0) {
        // Clear existing links first
        document.getElementById('bioLinksListContainer').innerHTML = '';
        
        data.links.forEach(link => {
            addBioLinkItem();
            const items = document.querySelectorAll('.bio-link-item');
            const lastItem = items[items.length - 1];
            
            const titleInput = lastItem.querySelector('input[placeholder*="Title"]');
            const urlInput = lastItem.querySelector('input[placeholder*="URL"]');
            
            if (titleInput && link.title) titleInput.value = link.title;
            if (urlInput && link.url) urlInput.value = link.url;
        });
    }
}

function showImportStatus(message, type) {
    const importStatus = document.getElementById('importStatus');
    importStatus.style.display = 'block';
    
    // Remove all type classes
    importStatus.classList.remove('import-success', 'import-error', 'import-loading');
    
    // Set colors based on type
    if (type === 'success') {
        importStatus.style.background = 'rgba(34, 197, 94, 0.1)';
        importStatus.style.border = '1px solid rgba(34, 197, 94, 0.3)';
        importStatus.style.color = '#22c55e';
    } else if (type === 'error') {
        importStatus.style.background = 'rgba(239, 68, 68, 0.1)';
        importStatus.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        importStatus.style.color = '#ef4444';
    } else if (type === 'loading') {
        importStatus.style.background = 'rgba(6, 182, 212, 0.1)';
        importStatus.style.border = '1px solid rgba(6, 182, 212, 0.3)';
        importStatus.style.color = '#06b6d4';
    }
    
    importStatus.textContent = message;
}

// ================================
// PROFILE PICTURE UPLOAD
// ================================

// Handle profile picture file selection
document.addEventListener('DOMContentLoaded', () => {
    const bioProfilePictureFile = document.getElementById('bioProfilePictureFile');
    if (bioProfilePictureFile) {
        bioProfilePictureFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                showToast('Please select a valid image file', 'error');
                e.target.value = '';
                return;
            }

            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                showToast('Image size must be less than 2MB', 'error');
                e.target.value = '';
                return;
            }

            // Find the upload button
            const uploadBtn = e.target.parentElement.querySelector('button.btn-secondary');
            if (!uploadBtn) {
                console.error('Upload button not found');
                showToast('Upload button not found', 'error');
                return;
            }

            try {
                // Check if user is authenticated
                const user = firebase.auth().currentUser;
                if (!user) {
                    showToast('Please log in to upload images', 'error');
                    e.target.value = '';
                    return;
                }

                // Show loading state
                const originalText = uploadBtn.innerHTML;
                uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
                uploadBtn.disabled = true;

                console.log('Starting upload for:', file.name, 'Size:', file.size, 'bytes');
                console.log('User ID:', user.uid);

                // Check if Firebase Storage is properly initialized
                if (!firebase.storage) {
                    throw new Error('Firebase Storage not initialized');
                }

                // Create upload promise with timeout
                const uploadPromise = new Promise(async (resolve, reject) => {
                    try {
                        // Upload to Firebase Storage
                        const storage = firebase.storage();
                        console.log('Storage bucket:', storage.app.options.storageBucket);
                        
                        const storageRef = storage.ref();
                        const fileExtension = file.name.split('.').pop();
                        const fileName = `bio-profiles/${user.uid}/${Date.now()}.${fileExtension}`;
                        const fileRef = storageRef.child(fileName);

                        console.log('Uploading to path:', fileName);

                        // Upload file
                        const uploadTask = fileRef.put(file);

                        // Monitor upload progress
                        uploadTask.on('state_changed',
                            (snapshot) => {
                                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                                console.log('Upload progress:', progress.toFixed(0) + '%');
                                uploadBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${progress.toFixed(0)}%`;
                            },
                            (error) => {
                                console.error('Upload error:', error);
                                console.error('Error code:', error.code);
                                console.error('Error message:', error.message);
                                reject(error);
                            },
                            async () => {
                                // Upload completed successfully
                                console.log('Upload completed, getting download URL...');
                                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                                console.log('Download URL:', downloadURL);
                                resolve(downloadURL);
                            }
                        );
                    } catch (error) {
                        reject(error);
                    }
                });

                // Set timeout for upload (60 seconds)
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Upload timeout - please check Firebase Storage rules')), 60000);
                });

                // Race between upload and timeout
                const downloadURL = await Promise.race([uploadPromise, timeoutPromise]);

                // Update hidden input with URL
                document.getElementById('bioProfilePicture').value = downloadURL;

                // Show preview
                showBioProfilePicturePreview(downloadURL, file.name);

                // Reset button
                uploadBtn.innerHTML = originalText;
                uploadBtn.disabled = false;

                showToast('Profile picture uploaded successfully!', 'success');

            } catch (error) {
                console.error('Error uploading profile picture:', error);
                
                let errorMessage = 'Failed to upload';
                if (error.code === 'storage/unauthorized') {
                    errorMessage = 'Permission denied - please contact support';
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                showToast(errorMessage, 'error');
                
                // Reset file input
                e.target.value = '';
                
                // Reset button
                if (uploadBtn) {
                    uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Picture';
                    uploadBtn.disabled = false;
                }
            }
        });
    }
});

// Show profile picture preview
function showBioProfilePicturePreview(url, fileName) {
    const preview = document.getElementById('bioProfilePicturePreview');
    const previewImg = document.getElementById('bioProfilePicturePreviewImg');
    const fileNameSpan = document.getElementById('bioProfilePictureFileName');

    previewImg.src = url;
    fileNameSpan.textContent = fileName;
    preview.style.display = 'flex';
}

// Remove profile picture
function removeBioProfilePicture() {
    document.getElementById('bioProfilePicture').value = '';
    document.getElementById('bioProfilePictureFile').value = '';
    document.getElementById('bioProfilePicturePreview').style.display = 'none';
}

// ================================
// INLINE EDITOR FUNCTIONS
// ================================

let editorBioLinkItems = [];
let currentEditorBioLink = null;
let autoSaveTimeout = null;
let isSaving = false;

// Auto-save function
function triggerAutoSave() {
    // Clear existing timeout
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }
    
    // Show saving indicator
    const saveBtn = document.querySelector('#bioLinkEditor button.btn-primary');
    if (saveBtn && !isSaving) {
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-circle" style="font-size: 8px; animation: pulse 1s infinite;"></i> Saving...';
        
        // Auto-save after 1.5 seconds of no changes
        autoSaveTimeout = setTimeout(async () => {
            await saveEditorBioLink(true); // Pass true for auto-save
            saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
            }, 2000);
        }, 1500);
    }
}

// Load bio link into editor
function loadBioLinkIntoEditor(bioLink) {
    currentEditorBioLink = bioLink;
    
    // Populate form fields
    document.getElementById('editorBioName').value = bioLink.name || '';
    document.getElementById('editorBioSlug').value = bioLink.slug || '';
    document.getElementById('editorBioDescription').value = bioLink.description || '';
    document.getElementById('editorProfilePicture').value = bioLink.profilePicture || '';
    
    // Show existing profile picture
    if (bioLink.profilePicture) {
        showEditorProfilePicturePreview(bioLink.profilePicture, 'Existing photo');
    }
    
    document.getElementById('editorThemeColor').value = bioLink.themeColor || '#06b6d4';
    document.getElementById('editorThemeColorHex').value = bioLink.themeColor || '#06b6d4';
    document.getElementById('editorBackgroundStyle').value = bioLink.backgroundStyle || 'gradient';
    
    // Social links
    document.getElementById('editorInstagram').value = bioLink.social?.instagram || '';
    document.getElementById('editorTwitter').value = bioLink.social?.twitter || '';
    document.getElementById('editorLinkedIn').value = bioLink.social?.linkedin || '';
    document.getElementById('editorGithub').value = bioLink.social?.github || '';
    document.getElementById('editorYoutube').value = bioLink.social?.youtube || '';
    document.getElementById('editorWebsite').value = bioLink.social?.website || '';
    
    // Links
    editorBioLinkItems = bioLink.links || [];
    renderEditorBioLinkItems();
    updateLivePreview();
    
    // Setup live preview listeners
    setupLivePreviewListeners();
}

// Setup live preview listeners
let livePreviewListenersSetup = false;

function setupLivePreviewListeners() {
    if (livePreviewListenersSetup) return; // Only setup once
    
    const fields = [
        'editorBioName', 
        'editorBioDescription', 
        'editorThemeColor', 
        'editorThemeColorHex',
        'editorInstagram',
        'editorTwitter',
        'editorLinkedIn',
        'editorGithub',
        'editorYoutube',
        'editorWebsite'
    ];
    
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.removeEventListener('input', updateLivePreview); // Remove old listeners
            el.addEventListener('input', () => {
                updateLivePreview();
                triggerAutoSave(); // Trigger auto-save on change
            });
            console.log('Added listener to', id);
        }
    });
    
    // Add listener for background style
    const bgStyleEl = document.getElementById('editorBackgroundStyle');
    if (bgStyleEl) {
        bgStyleEl.addEventListener('change', () => {
            updateLivePreview(); // Update preview when background style changes
            triggerAutoSave();
        });
    }
    
    livePreviewListenersSetup = true;
}

// Render editor bio link items
function renderEditorBioLinkItems() {
    const container = document.getElementById('editorBioLinkItems');
    if (!container) return;
    
    if (editorBioLinkItems.length === 0) {
        container.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 20px;">No links yet. Click "Add Link" to get started.</p>';
        updateLivePreview();
        return;
    }
    
    container.innerHTML = editorBioLinkItems.map((item, index) => `
        <div class="bio-link-item" draggable="true" data-index="${index}" style="display: flex; gap: 12px; padding: 16px; background: #0a0a0a; border-radius: 12px; border: 1px solid #2a2a2a; cursor: move; transition: all 0.2s ease;">
            <div class="bio-link-item-handle" style="cursor: grab; color: #707070; display: flex; align-items: center;">
                <i class="fas fa-grip-vertical"></i>
            </div>
            <div class="bio-link-item-content" style="flex: 1; display: grid; gap: 8px;">
                <input type="text" class="form-input" placeholder="Link Title" value="${item.title || ''}"
                       oninput="updateEditorBioLinkItem(${index}, 'title', this.value)" style="margin: 0;">
                <input type="url" class="form-input" placeholder="https://example.com" value="${item.url || ''}"
                       oninput="updateEditorBioLinkItem(${index}, 'url', this.value)" style="margin: 0;">
            </div>
            <button class="btn-icon" onclick="removeEditorBioLinkItem(${index})" title="Remove">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    // Setup drag and drop
    setupDragAndDrop();
    updateLivePreview();
}

// Setup drag and drop for bio link items
function setupDragAndDrop() {
    const container = document.getElementById('editorBioLinkItems');
    if (!container) return;
    
    const items = container.querySelectorAll('.bio-link-item');
    let draggedItem = null;
    let draggedIndex = null;
    
    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            draggedIndex = parseInt(item.getAttribute('data-index'));
            item.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
        });
        
        item.addEventListener('dragend', (e) => {
            item.style.opacity = '1';
            draggedItem = null;
            draggedIndex = null;
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (draggedItem && draggedItem !== item) {
                const rect = item.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                
                if (e.clientY < midpoint) {
                    item.style.borderTop = '2px solid #06b6d4';
                    item.style.borderBottom = '';
                } else {
                    item.style.borderBottom = '2px solid #06b6d4';
                    item.style.borderTop = '';
                }
            }
        });
        
        item.addEventListener('dragleave', (e) => {
            item.style.borderTop = '';
            item.style.borderBottom = '';
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.style.borderTop = '';
            item.style.borderBottom = '';
            
            if (draggedItem && draggedItem !== item) {
                const dropIndex = parseInt(item.getAttribute('data-index'));
                
                // Reorder the array
                const draggedItemData = editorBioLinkItems[draggedIndex];
                editorBioLinkItems.splice(draggedIndex, 1);
                
                // Recalculate the drop index after removal
                const newDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
                editorBioLinkItems.splice(newDropIndex, 0, draggedItemData);
                
                // Re-render
                renderEditorBioLinkItems();
                triggerAutoSave(); // Auto-save when reordered
            }
        });
    });
}

// Add editor bio link item
function addEditorBioLinkItem() {
    editorBioLinkItems.push({ title: '', url: '' });
    renderEditorBioLinkItems();
}

// Update editor bio link item
function updateEditorBioLinkItem(index, field, value) {
    if (editorBioLinkItems[index]) {
        editorBioLinkItems[index][field] = value;
        updateLivePreview();
        triggerAutoSave(); // Auto-save when link item changes
    }
}

// Remove editor bio link item
function removeEditorBioLinkItem(index) {
    editorBioLinkItems.splice(index, 1);
    renderEditorBioLinkItems();
    triggerAutoSave(); // Auto-save when link is removed
}

// Update live preview
function updateLivePreview() {
    const iframe = document.getElementById('bioPreviewFrame');
    if (!iframe) {
        console.log('Preview iframe not found');
        return;
    }
    
    // Gather all data
    const name = document.getElementById('editorBioName')?.value || 'Your Name';
    const slug = document.getElementById('editorBioSlug')?.value || 'preview';
    const description = document.getElementById('editorBioDescription')?.value || 'Your bio description';
    const themeColor = document.getElementById('editorThemeColor')?.value || '#06b6d4';
    const profilePicture = document.getElementById('editorProfilePicture')?.value || '';
    const backgroundStyle = document.getElementById('editorBackgroundStyle')?.value || 'gradient';
    
    const social = {
        instagram: document.getElementById('editorInstagram')?.value || '',
        twitter: document.getElementById('editorTwitter')?.value || '',
        linkedin: document.getElementById('editorLinkedIn')?.value || '',
        github: document.getElementById('editorGithub')?.value || '',
        youtube: document.getElementById('editorYoutube')?.value || '',
        website: document.getElementById('editorWebsite')?.value || ''
    };
    
    const validLinks = editorBioLinkItems.filter(item => item.title && item.url);
    
    // Generate complete bio.html content
    const bioLinkData = {
        name,
        slug,
        description,
        profilePicture,
        themeColor,
        backgroundStyle,
        social,
        links: validLinks,
        verified: false // Preview is never verified
    };
    
    const htmlContent = generateBioPreviewHTML(bioLinkData);
    iframe.srcdoc = htmlContent;
}

// Generate bio preview HTML (mimics bio.html structure)
function generateBioPreviewHTML(bioLink) {
    const themeColor = bioLink.themeColor || '#06b6d4';
    const backgroundStyle = bioLink.backgroundStyle || 'gradient';
    
    // Helper functions
    function extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch {
            return url;
        }
    }
    
    function getLinkIcon(url) {
        const urlLower = url.toLowerCase();
        if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'fab fa-youtube';
        if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'fab fa-twitter';
        if (urlLower.includes('instagram.com')) return 'fab fa-instagram';
        if (urlLower.includes('facebook.com')) return 'fab fa-facebook';
        if (urlLower.includes('linkedin.com')) return 'fab fa-linkedin';
        if (urlLower.includes('github.com')) return 'fab fa-github';
        if (urlLower.includes('tiktok.com')) return 'fab fa-tiktok';
        if (urlLower.includes('spotify.com')) return 'fab fa-spotify';
        if (urlLower.includes('discord.')) return 'fab fa-discord';
        if (urlLower.includes('twitch.tv')) return 'fab fa-twitch';
        if (urlLower.includes('medium.com')) return 'fab fa-medium';
        if (urlLower.includes('reddit.com')) return 'fab fa-reddit';
        if (urlLower.includes('dribbble.com')) return 'fab fa-dribbble';
        if (urlLower.includes('behance.net')) return 'fab fa-behance';
        return 'fas fa-link';
    }
    
    function hexToRgb(hex) {
        const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 6, g: 182, b: 212 };
    }
    
    // Build social links HTML
    const social = bioLink.social || {};
    const socialLinks = [];
    if (social.instagram) socialLinks.push({ icon: 'fab fa-instagram', url: `https://instagram.com/${social.instagram}` });
    if (social.twitter) socialLinks.push({ icon: 'fab fa-twitter', url: `https://x.com/${social.twitter}` });
    if (social.linkedin) socialLinks.push({ icon: 'fab fa-linkedin', url: social.linkedin.startsWith('http') ? social.linkedin : `https://linkedin.com/in/${social.linkedin}` });
    if (social.github) socialLinks.push({ icon: 'fab fa-github', url: `https://github.com/${social.github}` });
    if (social.youtube) socialLinks.push({ icon: 'fab fa-youtube', url: social.youtube.startsWith('http') ? social.youtube : `https://youtube.com/@${social.youtube}` });
    if (social.website) socialLinks.push({ icon: 'fas fa-globe', url: social.website.startsWith('http') ? social.website : `https://${social.website}` });
    
    let socialLinksHTML = '';
    if (socialLinks.length > 0) {
        socialLinksHTML = '<div class="bio-social">';
        socialLinks.forEach(link => {
            socialLinksHTML += `<a href="${link.url}" class="social-link" target="_blank" rel="noopener noreferrer">
                <i class="${link.icon}" style="color: rgba(255, 255, 255, 0.8);"></i>
            </a>`;
        });
        socialLinksHTML += '</div>';
    }
    
    // Build links HTML
    let linksHTML = '';
    if (bioLink.links && bioLink.links.length > 0) {
        linksHTML = '<div class="bio-links">';
        bioLink.links.forEach((link) => {
            const domain = extractDomain(link.url);
            const icon = getLinkIcon(link.url);
            linksHTML += `<a href="${link.url}" class="bio-link-item" target="_blank" rel="noopener noreferrer">
                <div class="link-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="link-content">
                    <div class="link-title">${link.title}</div>
                    <div class="link-url">${domain}</div>
                </div>
            </a>`;
        });
        linksHTML += '</div>';
    }
    
    // Set background style
    let backgroundCSS = '';
    if (backgroundStyle === 'gradient') {
        const rgb = hexToRgb(themeColor);
        backgroundCSS = `background: linear-gradient(135deg, ${themeColor} 0%, rgb(${Math.floor(rgb.r * 0.7)}, ${Math.floor(rgb.g * 0.7)}, ${Math.floor(rgb.b * 0.7)}) 100%);`;
    } else if (backgroundStyle === 'solid') {
        backgroundCSS = `background: ${themeColor};`;
    } else if (backgroundStyle === 'image' && bioLink.profilePicture) {
        backgroundCSS = `background: url(${bioLink.profilePicture}) center/cover; filter: blur(100px) brightness(0.3);`;
    }
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${bioLink.name}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Encode+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/bio-preview.css">
    <style>
        body {
            ${backgroundCSS}
            margin: 0;
            padding: 0;
            overflow: hidden;
            height: 100vh;
        }
    </style>
</head>
<body>
    <div class="mesh-gradient"></div>
    <div class="bio-container" style="margin: 0; max-height: 100vh; overflow-y: auto;">
        <div class="bio-header">
            ${bioLink.profilePicture ? 
                `<img src="${bioLink.profilePicture}" alt="${bioLink.name}" class="bio-avatar">` :
                `<div class="bio-avatar-placeholder" style="background: ${themeColor};">
                    <i class="fas fa-user"></i>
                </div>`
            }
            <h1 class="bio-name">
                ${bioLink.name}
                ${bioLink.verified ? 
                    '<span class="verified-badge"><i class="fas fa-check"></i></span>' : 
                    '<span class="under-review-badge">Preview</span>'
                }
            </h1>
            ${bioLink.description ? `<p class="bio-description">${bioLink.description}</p>` : ''}
            ${socialLinksHTML}
        </div>
        ${linksHTML}
        <div class="bio-footer">
            <div class="powered-by">
                <span>100% free, try</span>
                <a href="/" target="_blank" style="display: flex; align-items: center; text-decoration: none;">
                    <img src="/assets/images/logo.png" alt="piik.me" style="width: auto; height: 24px;">
                </a>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// Helper function to get favicon/icon for common URLs
function getFaviconForUrl(url) {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'fab fa-youtube';
    if (urlLower.includes('github.com')) return 'fab fa-github';
    if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'fab fa-twitter';
    if (urlLower.includes('linkedin.com')) return 'fab fa-linkedin';
    if (urlLower.includes('instagram.com')) return 'fab fa-instagram';
    if (urlLower.includes('facebook.com')) return 'fab fa-facebook';
    if (urlLower.includes('medium.com')) return 'fab fa-medium';
    if (urlLower.includes('behance.net')) return 'fab fa-behance';
    if (urlLower.includes('dribbble.com')) return 'fab fa-dribbble';
    if (urlLower.includes('spotify.com')) return 'fab fa-spotify';
    if (urlLower.includes('tiktok.com')) return 'fab fa-tiktok';
    if (urlLower.includes('discord')) return 'fab fa-discord';
    if (urlLower.includes('twitch.tv')) return 'fab fa-twitch';
    return 'fas fa-link';
}

// Save editor bio link
async function saveEditorBioLink(isAutoSave = false) {
    if (isSaving) return; // Prevent concurrent saves
    
    try {
        isSaving = true;
        const user = firebase.auth().currentUser;
        if (!user) {
            if (!isAutoSave) showToast('Please log in to save changes', 'error');
            isSaving = false;
            return;
        }
        
        const name = document.getElementById('editorBioName').value.trim();
        const slug = document.getElementById('editorBioSlug').value.trim();
        const description = document.getElementById('editorBioDescription').value.trim();
        
        if (!name) {
            if (!isAutoSave) showToast('Please enter a name', 'error');
            isSaving = false;
            return;
        }
        
        if (!slug || !/^[a-zA-Z0-9-_]+$/.test(slug)) {
            if (!isAutoSave) showToast('Please enter a valid URL slug', 'error');
            isSaving = false;
            return;
        }
        
        // Check if slug changed and is available
        const db = firebase.firestore();
        if (currentEditorBioLink.slug !== slug) {
            const existingSlug = await db.collection('bioLinks').where('slug', '==', slug).get();
            if (!existingSlug.empty) {
                if (!isAutoSave) showToast('This URL slug is already taken', 'error');
                isSaving = false;
                return;
            }
        }
        
        const validLinks = editorBioLinkItems.filter(item => item.title && item.url);
        
        const bioLinkData = {
            name,
            slug,
            description,
            profilePicture: document.getElementById('editorProfilePicture').value.trim(),
            themeColor: document.getElementById('editorThemeColor').value,
            backgroundStyle: document.getElementById('editorBackgroundStyle').value,
            links: validLinks,
            social: {
                instagram: document.getElementById('editorInstagram').value.trim(),
                twitter: document.getElementById('editorTwitter').value.trim(),
                linkedin: document.getElementById('editorLinkedIn').value.trim(),
                github: document.getElementById('editorGithub').value.trim(),
                youtube: document.getElementById('editorYoutube').value.trim(),
                website: document.getElementById('editorWebsite').value.trim()
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('bioLinks').doc(currentEditorBioLink.id).update(bioLinkData);
        
        if (!isAutoSave) {
            showToast('Bio link updated successfully!', 'success');
            loadBioLinks();
        }
        
        isSaving = false;
        
    } catch (error) {
        console.error('Error saving bio link:', error);
        if (!isAutoSave) {
            showToast('Failed to save: ' + (error.message || 'Unknown error'), 'error');
        }
        isSaving = false;
    }
}

// Cancel bio link edits
function cancelBioLinkEdits() {
    if (currentEditorBioLink) {
        loadBioLinkIntoEditor(currentEditorBioLink);
        showToast('Changes discarded', 'info');
    }
}

// View bio link preview
function viewBioLinkPreview() {
    const slug = document.getElementById('editorBioSlug').value.trim();
    if (slug) {
        window.open(`/${slug}`, '_blank');
    }
}

// Editor profile picture upload
document.addEventListener('DOMContentLoaded', () => {
    const editorProfilePictureFile = document.getElementById('editorProfilePictureFile');
    if (editorProfilePictureFile) {
        editorProfilePictureFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (!file.type.startsWith('image/')) {
                showToast('Please select a valid image file', 'error');
                e.target.value = '';
                return;
            }
            
            if (file.size > 2 * 1024 * 1024) {
                showToast('Image size must be less than 2MB', 'error');
                e.target.value = '';
                return;
            }
            
            const uploadBtn = e.target.parentElement.querySelector('button.btn-secondary');
            if (!uploadBtn) return;
            
            try {
                const user = firebase.auth().currentUser;
                if (!user) {
                    showToast('Please log in to upload images', 'error');
                    e.target.value = '';
                    return;
                }
                
                const originalText = uploadBtn.innerHTML;
                uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
                uploadBtn.disabled = true;
                
                const storage = firebase.storage();
                const fileExtension = file.name.split('.').pop();
                const fileName = `bio-profiles/${user.uid}/${Date.now()}.${fileExtension}`;
                const fileRef = storage.ref().child(fileName);
                
                await fileRef.put(file);
                const downloadURL = await fileRef.getDownloadURL();
                
                document.getElementById('editorProfilePicture').value = downloadURL;
                showEditorProfilePicturePreview(downloadURL, file.name);
                updateLivePreview();
                triggerAutoSave(); // Auto-save after picture upload
                
                uploadBtn.innerHTML = originalText;
                uploadBtn.disabled = false;
                showToast('Profile picture uploaded successfully!', 'success');
                
            } catch (error) {
                console.error('Error uploading:', error);
                showToast('Failed to upload: ' + (error.message || 'Unknown error'), 'error');
                e.target.value = '';
                if (uploadBtn) {
                    uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Picture';
                    uploadBtn.disabled = false;
                }
            }
        });
    }
});

function showEditorProfilePicturePreview(url, fileName) {
    const preview = document.getElementById('editorProfilePicturePreview');
    const previewImg = document.getElementById('editorProfilePicturePreviewImg');
    const fileNameSpan = document.getElementById('editorProfilePictureFileName');
    
    if (preview && previewImg && fileNameSpan) {
        previewImg.src = url;
        fileNameSpan.textContent = fileName;
        preview.style.display = 'flex';
    }
}

function removeEditorProfilePicture() {
    document.getElementById('editorProfilePicture').value = '';
    document.getElementById('editorProfilePictureFile').value = '';
    document.getElementById('editorProfilePicturePreview').style.display = 'none';
    updateLivePreview();
    triggerAutoSave(); // Auto-save when picture is removed
}

// ================================
// SHARE BIO LINK FUNCTIONALITY
// ================================

function shareBioLink() {
    const slug = document.getElementById('editorBioSlug')?.value.trim();
    if (!slug) {
        showToast('Please save your bio link first', 'error');
        return;
    }

    const url = `${window.location.origin}/${slug}`;
    const urlInput = document.getElementById('shareBioLinkUrl');
    const modal = document.getElementById('shareBioLinkModal');
    const nativeBtn = document.getElementById('nativeShareBtn');
    
    if (!urlInput || !modal) {
        console.error('Share modal elements not found');
        showToast('Share functionality not available', 'error');
        return;
    }
    
    urlInput.value = url;
    
    // Show native share button on mobile
    if (navigator.share && nativeBtn) {
        nativeBtn.style.display = 'block';
    }
    
    modal.style.display = 'block';
    modal.classList.add('show');
}

function closeShareBioLinkModal() {
    const modal = document.getElementById('shareBioLinkModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
}

function copyShareBioLink() {
    const url = document.getElementById('shareBioLinkUrl').value;
    navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('copyShareBtn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        btn.classList.add('btn-success');
        btn.classList.remove('btn-secondary');
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('btn-success');
            btn.classList.add('btn-secondary');
        }, 2000);
        
        showToast('Link copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Copy failed:', err);
        showToast('Failed to copy link', 'error');
    });
}

function shareToWhatsApp() {
    const url = document.getElementById('shareBioLinkUrl').value;
    const text = `Check out my bio link: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function shareToTelegram() {
    const url = document.getElementById('shareBioLinkUrl').value;
    const text = `Check out my bio link`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
}

function shareToTwitter() {
    const url = document.getElementById('shareBioLinkUrl').value;
    const text = `Check out my bio link`;
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
}

function shareToFacebook() {
    const url = document.getElementById('shareBioLinkUrl').value;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
}

function shareToLinkedIn() {
    const url = document.getElementById('shareBioLinkUrl').value;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
}

function shareToEmail() {
    const url = document.getElementById('shareBioLinkUrl').value;
    const subject = 'Check out my bio link';
    const body = `I'd like to share my bio link with you: ${url}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function nativeShare() {
    const url = document.getElementById('shareBioLinkUrl').value;
    const name = document.getElementById('editorBioName')?.value || 'My Bio Link';
    
    try {
        await navigator.share({
            title: name,
            text: 'Check out my bio link',
            url: url
        });
        showToast('Shared successfully!', 'success');
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Share failed:', err);
            showToast('Failed to share', 'error');
        }
    }
}

// Close share modal when clicking overlay
document.addEventListener('DOMContentLoaded', () => {
    const shareModalOverlay = document.getElementById('shareBioLinkModalOverlay');
    if (shareModalOverlay) {
        shareModalOverlay.addEventListener('click', closeShareBioLinkModal);
    }
});

