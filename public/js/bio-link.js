// ================================
// BIO LINK MODULE
// ================================

let bioLinks = [];
let currentBioLink = null;
let bioLinkItems = [];

// Initialize Bio Link functionality
function initBioLink() {
    console.log('Initializing Bio Link module');
    
    // Check if user is authenticated
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.uid) {
        loadBioLinks();
    } else {
        // Wait for auth to complete
        setTimeout(() => {
            if (typeof currentUser !== 'undefined' && currentUser && currentUser.uid) {
                loadBioLinks();
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
            }
        }, 1000);
    }
}

// Load all bio links for the current user
async function loadBioLinks() {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            console.log('Firebase not ready');
            return;
        }

        if (!currentUser || !currentUser.uid) {
            console.log('User not authenticated');
            return;
        }

        const db = firebase.firestore();
        const bioLinksSnapshot = await db.collection('bioLinks')
            .where('userId', '==', currentUser.uid)
            .get();

        bioLinks = [];
        bioLinksSnapshot.forEach(doc => {
            bioLinks.push({ id: doc.id, ...doc.data() });
        });

        // Sort by creation date (most recent first)
        bioLinks.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
        });

        renderBioLinks();
        updateBioLinkStats();

    } catch (error) {
        console.error('Error loading bio links:', error);
        showToast('Failed to load bio links', 'error');
    }
}

// Render bio links grid
function renderBioLinks() {
    const container = document.getElementById('bioLinksContainer');
    const emptyState = document.getElementById('bioLinksEmptyState');

    if (!container) return;

    if (bioLinks.length === 0) {
        container.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }

    container.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = bioLinks.map(bioLink => `
        <div class="bio-link-card" data-id="${bioLink.id}">
            <div class="bio-link-header">
                <div class="bio-link-info">
                    ${bioLink.profilePicture ? `
                        <img src="${bioLink.profilePicture}" alt="${bioLink.name}" class="bio-link-avatar">
                    ` : `
                        <div class="bio-link-avatar-placeholder" style="background: ${bioLink.themeColor || '#06b6d4'};">
                            <i class="fas fa-user"></i>
                        </div>
                    `}
                    <div>
                        <h3>${bioLink.name}</h3>
                        <p class="bio-link-url">piik.me/bio/${bioLink.slug}</p>
                    </div>
                </div>
                <div class="bio-link-actions">
                    <button class="btn-icon" onclick="copyBioLink('${bioLink.slug}')" title="Copy Link">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn-icon" onclick="viewBioLink('${bioLink.slug}')" title="View Page">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                    <button class="btn-icon" onclick="editBioLink('${bioLink.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="deleteBioLink('${bioLink.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="bio-link-description">
                ${bioLink.description || 'No description'}
            </div>
            <div class="bio-link-stats">
                <div class="bio-link-stat">
                    <i class="fas fa-link"></i>
                    <span>${bioLink.links?.length || 0} links</span>
                </div>
                <div class="bio-link-stat">
                    <i class="fas fa-eye"></i>
                    <span>${bioLink.views || 0} views</span>
                </div>
                <div class="bio-link-stat">
                    <i class="fas fa-mouse-pointer"></i>
                    <span>${bioLink.clicks || 0} clicks</span>
                </div>
            </div>
            <div class="bio-link-links-preview">
                ${(bioLink.links || []).slice(0, 3).map(link => `
                    <div class="bio-link-preview-item">
                        <i class="fas fa-link"></i>
                        <span>${link.title}</span>
                    </div>
                `).join('')}
                ${bioLink.links?.length > 3 ? `<div class="bio-link-preview-more">+${bioLink.links.length - 3} more</div>` : ''}
            </div>
        </div>
    `).join('');
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
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (currentBioLink) {
            // Update existing
            await db.collection('bioLinks').doc(currentBioLink.id).update(bioLinkData);
            showToast('Bio link updated successfully!', 'success');
        } else {
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
    const url = `${window.location.origin}/bio/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
        showToast('Link copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Copy failed:', err);
        showToast('Failed to copy link', 'error');
    });
}

// View bio link in new tab
function viewBioLink(slug) {
    window.open(`/bio/${slug}`, '_blank');
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
});

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

            try {
                // Check if user is authenticated
                const user = firebase.auth().currentUser;
                if (!user) {
                    showToast('Please log in to upload images', 'error');
                    e.target.value = '';
                    return;
                }

                // Find the upload button
                const uploadBtn = e.target.parentElement.querySelector('button.btn-secondary');
                if (!uploadBtn) {
                    console.error('Upload button not found');
                    throw new Error('Upload button not found');
                }

                // Show loading state
                const originalText = uploadBtn.innerHTML;
                uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
                uploadBtn.disabled = true;

                // Upload to Firebase Storage
                const storage = firebase.storage();
                const storageRef = storage.ref();
                const fileExtension = file.name.split('.').pop();
                const fileName = `bio-profiles/${user.uid}/${Date.now()}.${fileExtension}`;
                const fileRef = storageRef.child(fileName);

                await fileRef.put(file);
                const downloadURL = await fileRef.getDownloadURL();

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
                showToast(`Failed to upload: ${error.message || 'Unknown error'}`, 'error');
                
                // Reset file input
                e.target.value = '';
                
                // Reset button
                const uploadBtn = e.target.parentElement.querySelector('button.btn-secondary');
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
