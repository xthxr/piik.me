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
function setupLivePreviewListeners() {
    const fields = ['editorBioName', 'editorBioDescription', 'editorThemeColor', 'editorThemeColorHex'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateLivePreview);
        }
    });
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
        <div class="bio-link-item" style="display: flex; gap: 12px; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
            <div class="bio-link-item-handle" style="cursor: move; color: #9ca3af; display: flex; align-items: center;">
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
    
    updateLivePreview();
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
    }
}

// Remove editor bio link item
function removeEditorBioLinkItem(index) {
    editorBioLinkItems.splice(index, 1);
    renderEditorBioLinkItems();
}

// Update live preview
function updateLivePreview() {
    const name = document.getElementById('editorBioName').value || 'Your Name';
    const description = document.getElementById('editorBioDescription').value || 'Your bio description';
    const themeColor = document.getElementById('editorThemeColor').value || '#06b6d4';
    const profilePicture = document.getElementById('editorProfilePicture').value;
    
    // Update preview name and description
    document.getElementById('previewName').textContent = name;
    document.getElementById('previewDescription').textContent = description;
    
    // Update avatar
    const previewAvatar = document.getElementById('previewAvatar');
    if (profilePicture) {
        previewAvatar.innerHTML = `<img src="${profilePicture}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    } else {
        previewAvatar.style.background = themeColor;
        previewAvatar.innerHTML = '<i class="fas fa-user"></i>';
    }
    
    // Update background
    const preview = document.getElementById('bioLinkPreview');
    if (profilePicture) {
        preview.style.background = 'none';
        preview.style.backgroundImage = `url(${profilePicture})`;
        preview.style.backgroundSize = 'cover';
        preview.style.backgroundPosition = 'center';
        preview.style.filter = 'blur(60px) brightness(0.8)';
        preview.style.transform = 'scale(1.2)';
    } else {
        preview.style.background = `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 100%)`;
        preview.style.backgroundImage = 'none';
        preview.style.filter = 'none';
        preview.style.transform = 'none';
    }
    
    // Update social links preview
    const socialPreview = document.getElementById('previewSocial');
    const social = {
        instagram: document.getElementById('editorInstagram').value,
        twitter: document.getElementById('editorTwitter').value,
        linkedin: document.getElementById('editorLinkedIn').value,
        github: document.getElementById('editorGithub').value,
        youtube: document.getElementById('editorYoutube').value,
        website: document.getElementById('editorWebsite').value
    };
    
    const socialLinks = [];
    if (social.instagram) socialLinks.push('<i class="fab fa-instagram"></i>');
    if (social.twitter) socialLinks.push('<i class="fab fa-twitter"></i>');
    if (social.linkedin) socialLinks.push('<i class="fab fa-linkedin"></i>');
    if (social.github) socialLinks.push('<i class="fab fa-github"></i>');
    if (social.youtube) socialLinks.push('<i class="fab fa-youtube"></i>');
    if (social.website) socialLinks.push('<i class="fas fa-globe"></i>');
    
    if (socialLinks.length > 0) {
        socialPreview.innerHTML = socialLinks.map(icon => 
            `<div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center; color: ${themeColor}; font-size: 16px;">${icon}</div>`
        ).join('');
    } else {
        socialPreview.innerHTML = '';
    }
    
    // Update links preview
    const linksPreview = document.getElementById('previewLinks');
    const validLinks = editorBioLinkItems.filter(item => item.title && item.url);
    
    if (validLinks.length > 0) {
        linksPreview.innerHTML = validLinks.map(link => 
            `<div style="background: white; border: 2px solid ${themeColor}; border-radius: 8px; padding: 12px 16px; text-align: center; color: ${themeColor}; font-weight: 600; font-size: 14px;">${link.title}</div>`
        ).join('');
    } else {
        linksPreview.innerHTML = '<p style="color: #9ca3af; font-size: 12px;">No links added yet</p>';
    }
}

// Save editor bio link
async function saveEditorBioLink() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            showToast('Please log in to save changes', 'error');
            return;
        }
        
        const name = document.getElementById('editorBioName').value.trim();
        const slug = document.getElementById('editorBioSlug').value.trim();
        const description = document.getElementById('editorBioDescription').value.trim();
        
        if (!name) {
            showToast('Please enter a name', 'error');
            return;
        }
        
        if (!slug || !/^[a-zA-Z0-9-_]+$/.test(slug)) {
            showToast('Please enter a valid URL slug', 'error');
            return;
        }
        
        // Check if slug changed and is available
        const db = firebase.firestore();
        if (currentEditorBioLink.slug !== slug) {
            const existingSlug = await db.collection('bioLinks').where('slug', '==', slug).get();
            if (!existingSlug.empty) {
                showToast('This URL slug is already taken', 'error');
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
        showToast('Bio link updated successfully!', 'success');
        loadBioLinks();
        
    } catch (error) {
        console.error('Error saving bio link:', error);
        showToast('Failed to save: ' + (error.message || 'Unknown error'), 'error');
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
        window.open(`/bio/${slug}`, '_blank');
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
}
