// QR Generator Module
const QRGenerator = {
    currentPattern: 'square',
    currentFrame: 'none',
    currentColor: '#000000',
    currentBgColor: '#ffffff',
    currentFormat: 'png',
    currentLink: '',
    currentBrandName: '',
    qrCode: null,

    init() {
        this.cacheDom();
        this.bindEvents();
        this.loadUserLinks();
        this.createFloatingPreview();
        this.initScrollBehavior();
    },

    createFloatingPreview() {
        // Create floating preview container
        const floatingPreview = document.createElement('div');
        floatingPreview.className = 'qr-floating-preview';
        floatingPreview.id = 'floatingQRPreview';
        floatingPreview.innerHTML = `
            <div class="floating-header">
                <span class="floating-title">Live Preview</span>
                <button class="floating-close" onclick="document.getElementById('floatingQRPreview').classList.remove('show')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="floating-qr-container">
                <canvas id="floatingQRCanvas" width="400" height="400"></canvas>
            </div>
            <div class="resize-handle"></div>
        `;
        document.body.appendChild(floatingPreview);
        this.floatingCanvas = document.getElementById('floatingQRCanvas');
        this.floatingPreview = floatingPreview;
        
        // Make it draggable and resizable
        this.initDraggable();
        this.initResizable();
    },

    initDraggable() {
        const preview = this.floatingPreview;
        const header = preview.querySelector('.floating-header');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        header.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        // Touch events for mobile
        header.addEventListener('touchstart', dragStart);
        document.addEventListener('touchmove', drag);
        document.addEventListener('touchend', dragEnd);

        function dragStart(e) {
            if (e.type === 'touchstart') {
                initialX = e.touches[0].clientX - xOffset;
                initialY = e.touches[0].clientY - yOffset;
            } else {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
            }

            if (e.target === header || header.contains(e.target)) {
                if (!e.target.classList.contains('floating-close')) {
                    isDragging = true;
                    preview.classList.add('dragging');
                }
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                
                if (e.type === 'touchmove') {
                    currentX = e.touches[0].clientX - initialX;
                    currentY = e.touches[0].clientY - initialY;
                } else {
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                }

                xOffset = currentX;
                yOffset = currentY;

                setTranslate(currentX, currentY, preview);
            }
        }

        function dragEnd(e) {
            if (isDragging) {
                initialX = currentX;
                initialY = currentY;
                isDragging = false;
                preview.classList.remove('dragging');
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate(${xPos}px, calc(-50% + ${yPos}px))`;
        }
    },

    initResizable() {
        const preview = this.floatingPreview;
        const resizeHandle = preview.querySelector('.resize-handle');
        let isResizing = false;
        let startX, startY, startWidth, startHeight;

        resizeHandle.addEventListener('mousedown', initResize);
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);

        // Touch events
        resizeHandle.addEventListener('touchstart', initResize);
        document.addEventListener('touchmove', resize);
        document.addEventListener('touchend', stopResize);

        function initResize(e) {
            isResizing = true;
            preview.classList.add('resizing');
            
            if (e.type === 'touchstart') {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            } else {
                startX = e.clientX;
                startY = e.clientY;
            }
            
            startWidth = preview.offsetWidth;
            startHeight = preview.offsetHeight;
            
            e.preventDefault();
            e.stopPropagation();
        }

        function resize(e) {
            if (!isResizing) return;
            
            let clientX, clientY;
            if (e.type === 'touchmove') {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            
            const width = startWidth + (clientX - startX);
            const height = startHeight + (clientY - startY);
            
            // Maintain aspect ratio by using the larger dimension
            const size = Math.max(width, height);
            
            // Apply min/max constraints
            if (size >= 150 && size <= 400) {
                preview.style.width = size + 'px';
            }
            
            e.preventDefault();
        }

        function stopResize(e) {
            if (isResizing) {
                isResizing = false;
                preview.classList.remove('resizing');
            }
        }
    },

    initScrollBehavior() {
        const qrPreviewCard = document.querySelector('.qr-preview-card');
        if (!qrPreviewCard) return;

        let scrollTimeout;
        const handleScroll = () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const previewRect = qrPreviewCard.getBoundingClientRect();
                
                // Show floating preview when main preview goes out of view
                if (previewRect.top < -100 && this.currentLink) {
                    this.floatingPreview.classList.add('show');
                    this.updateFloatingPreview();
                } else {
                    this.floatingPreview.classList.remove('show');
                }
            }, 50);
        };

        window.addEventListener('scroll', handleScroll);
    },

    updateFloatingPreview() {
        // Copy main canvas to floating canvas
        if (this.qrCanvas && this.floatingCanvas) {
            const ctx = this.floatingCanvas.getContext('2d');
            ctx.clearRect(0, 0, 400, 400);
            ctx.drawImage(this.qrCanvas, 0, 0, 400, 400);
        }
    },

    cacheDom() {
        this.qrLinkInput = document.getElementById('qrLinkInput');
        this.generateBtn = document.getElementById('generateQRBtn');
        this.qrCanvas = document.getElementById('qrCanvas');
        this.qrPlaceholder = document.getElementById('qrPlaceholder');
        this.qrBrandInput = document.getElementById('qrBrandInput');
        this.qrBrandOverlay = document.getElementById('qrBrandOverlay');
        this.qrBrandText = document.getElementById('qrBrandText');
        this.qrColorPicker = document.getElementById('qrColorPicker');
        this.qrColorHex = document.getElementById('qrColorHex');
        this.bgColorPicker = document.getElementById('bgColorPicker');
        this.bgColorHex = document.getElementById('bgColorHex');
        this.transparentBg = document.getElementById('transparentBg');
        this.downloadBtn = document.getElementById('downloadQRBtn');
        this.quickLinksGrid = document.getElementById('quickLinksGrid');
        this.downloadBgOptions = document.getElementById('downloadBgOptions');
        this.transparentOption = document.getElementById('transparentOption');
    },

    bindEvents() {
        if (!this.generateBtn || !this.qrLinkInput) return;
        
        // Generate QR Code
        this.generateBtn.addEventListener('click', () => this.generateQR());
        this.qrLinkInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.generateQR();
        });

        // Brand name overlay
        this.qrBrandInput.addEventListener('input', (e) => {
            this.currentBrandName = e.target.value;
            if (this.currentBrandName && this.qrCode) {
                this.qrBrandText.textContent = this.currentBrandName;
                this.qrBrandOverlay.style.display = 'block';
            } else {
                this.qrBrandOverlay.style.display = 'none';
            }
        });

        // Pattern selection
        document.querySelectorAll('.pattern-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('.pattern-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                this.currentPattern = option.dataset.pattern;
                if (this.currentLink) this.generateQR();
            });
        });

        // Frame selection
        document.querySelectorAll('.frame-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('.frame-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                this.currentFrame = option.dataset.frame;
                if (this.currentLink) this.generateQR();
            });
        });

        // Color pickers
        this.qrColorPicker.addEventListener('input', (e) => {
            this.currentColor = e.target.value;
            this.qrColorHex.value = e.target.value.toUpperCase();
            if (this.currentLink) this.generateQR();
        });

        this.qrColorHex.addEventListener('input', (e) => {
            const color = e.target.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                this.currentColor = color;
                this.qrColorPicker.value = color;
                if (this.currentLink) this.generateQR();
            }
        });

        // Color presets
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.addEventListener('click', (e) => {
                const color = preset.dataset.color;
                this.currentColor = color;
                this.qrColorPicker.value = color;
                this.qrColorHex.value = color.toUpperCase();
                if (this.currentLink) this.generateQR();
            });
        });

        // Background color for JPG
        this.bgColorPicker.addEventListener('input', (e) => {
            this.currentBgColor = e.target.value;
            this.bgColorHex.value = e.target.value.toUpperCase();
        });

        this.bgColorHex.addEventListener('input', (e) => {
            const color = e.target.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                this.currentBgColor = color;
                this.bgColorPicker.value = color;
            }
        });

        // Format selection
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFormat = btn.dataset.format;
                
                // Show/hide options based on format
                if (this.currentFormat === 'jpg') {
                    this.downloadBgOptions.style.display = 'block';
                    this.transparentOption.style.display = 'none';
                    this.transparentBg.checked = false;
                } else {
                    this.downloadBgOptions.style.display = 'none';
                    this.transparentOption.style.display = 'block';
                }
            });
        });

        // Download button
        this.downloadBtn.addEventListener('click', () => this.downloadQR());
    },

    async generateQR() {
        const link = this.qrLinkInput.value.trim();
        if (!link) {
            this.showNotification('Please enter a link or text', 'error');
            return;
        }

        this.currentLink = link;
        this.qrPlaceholder.style.display = 'none';

        try {
            // Check if QRCode library is loaded
            if (typeof QRCode === 'undefined') {
                throw new Error('QR Code library not loaded. Please refresh the page.');
            }

            // Get canvas context
            const ctx = this.qrCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.qrCanvas.width, this.qrCanvas.height);

            // Set background
            if (!(this.transparentBg?.checked && this.currentFormat === 'png')) {
                ctx.fillStyle = this.currentBgColor || '#ffffff';
                ctx.fillRect(0, 0, 400, 400);
            }

            // Create temporary container for QR generation
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            document.body.appendChild(tempContainer);

            // Generate QR code using library
            const qrCode = new QRCode(tempContainer, {
                text: link,
                width: 400,
                height: 400,
                colorDark: this.currentColor || '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });

            // Wait for QR code to render
            setTimeout(() => {
                try {
                    const qrImg = tempContainer.querySelector('img');
                    if (!qrImg) {
                        throw new Error('QR image not generated');
                    }

                    // Wait for image to load
                    if (qrImg.complete) {
                        this.drawQRToCanvas(ctx, qrImg);
                        document.body.removeChild(tempContainer);
                    } else {
                        qrImg.onload = () => {
                            this.drawQRToCanvas(ctx, qrImg);
                            document.body.removeChild(tempContainer);
                        };
                    }

                    this.qrCanvas.style.display = 'block';
                    this.downloadBtn.disabled = false;
                    
                    // Update floating preview
                    setTimeout(() => this.updateFloatingPreview(), 100);
                } catch (drawError) {
                    document.body.removeChild(tempContainer);
                    throw drawError;
                }
            }, 200);

        } catch (error) {
            console.error('QR generation error:', error);
            this.showNotification(error.message || 'Failed to generate QR code', 'error');
            this.qrPlaceholder.style.display = 'block';
            this.qrPlaceholder.textContent = 'Failed to generate QR code. Please try again.';
        }
    },

    drawQRToCanvas(ctx, qrImg) {
        // Clear canvas first
        ctx.clearRect(0, 0, 400, 400);
        
        // Always draw the base QR code first to ensure scannability
        ctx.drawImage(qrImg, 0, 0, 400, 400);
        
        // For non-square patterns, apply visual effects that don't break the QR code
        if (this.currentPattern !== 'square') {
            this.applyVisualPattern(ctx);
        }
        
        // Apply frame if selected
        if (this.currentFrame && this.currentFrame !== 'none') {
            this.applyFrame(ctx, 400);
        }
        
        // Update floating preview
        this.updateFloatingPreview();
    },

    applyVisualPattern(ctx) {
        // Get the current QR code image data
        const imageData = ctx.getImageData(0, 0, 400, 400);
        const data = imageData.data;
        
        // Apply pattern-specific visual effects while preserving QR structure
        switch (this.currentPattern) {
            case 'dots':
            case 'circular':
                this.applyRoundedCorners(ctx, imageData);
                break;
            case 'rounded':
            case 'extra-rounded':
                const radius = this.currentPattern === 'extra-rounded' ? 4 : 2;
                this.applyRoundedCorners(ctx, imageData, radius);
                break;
            default:
                // For other patterns, just ensure the color is applied
                this.applyColorOnly(ctx, imageData);
                break;
        }
    },

    applyRoundedCorners(ctx, imageData, radius = 3) {
        // This creates a softened appearance without destroying the QR code structure
        const data = imageData.data;
        const width = 400;
        const height = 400;
        
        // Create a new canvas for the rounded effect
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Copy original image
        tempCtx.putImageData(imageData, 0, 0);
        
        // Apply subtle blur for rounded effect without losing scannability
        ctx.clearRect(0, 0, width, height);
        ctx.filter = 'blur(0.5px)';
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.filter = 'none';
        
        // Enhance contrast to maintain scannability
        const newImageData = ctx.getImageData(0, 0, width, height);
        const newData = newImageData.data;
        
        for (let i = 0; i < newData.length; i += 4) {
            // Increase contrast
            const avg = (newData[i] + newData[i + 1] + newData[i + 2]) / 3;
            if (avg < 128) {
                // Make dark pixels darker (apply current color)
                const color = this.hexToRgb(this.currentColor);
                newData[i] = color.r;
                newData[i + 1] = color.g;
                newData[i + 2] = color.b;
            } else {
                // Keep light pixels light
                newData[i] = 255;
                newData[i + 1] = 255;
                newData[i + 2] = 255;
            }
        }
        
        ctx.putImageData(newImageData, 0, 0);
    },

    applyColorOnly(ctx, imageData) {
        // Simply change the color while keeping QR structure intact
        const data = imageData.data;
        const color = this.hexToRgb(this.currentColor);
        
        for (let i = 0; i < data.length; i += 4) {
            // If pixel is dark (part of QR code), apply the custom color
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (brightness < 128) {
                data[i] = color.r;
                data[i + 1] = color.g;
                data[i + 2] = color.b;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    },

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    },

    applyFrame(ctx, size) {
        const frameWidth = 20;
        ctx.strokeStyle = this.getFrameColor();
        ctx.lineWidth = frameWidth;

        switch (this.currentFrame) {
            case 'business':
                ctx.strokeRect(frameWidth/2, frameWidth/2, size - frameWidth, size - frameWidth);
                break;
            case 'wedding':
                ctx.beginPath();
                ctx.arc(size/2, size/2, (size - frameWidth)/2, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 'birthday':
                ctx.save();
                const gradient = ctx.createLinearGradient(0, 0, size, size);
                gradient.addColorStop(0, '#F59E0B');
                gradient.addColorStop(1, '#EF4444');
                ctx.strokeStyle = gradient;
                ctx.lineWidth = frameWidth;
                this.roundRect(ctx, frameWidth/2, frameWidth/2, size - frameWidth, size - frameWidth, 20);
                ctx.stroke();
                ctx.restore();
                break;
            case 'party':
                ctx.setLineDash([10, 10]);
                ctx.strokeRect(frameWidth/2, frameWidth/2, size - frameWidth, size - frameWidth);
                ctx.setLineDash([]);
                break;
            default:
                // Other frame styles can be added here
                break;
        }
    },

    getFrameColor() {
        const frameColors = {
            business: '#3B82F6',
            wedding: '#EC4899',
            birthday: '#F59E0B',
            party: '#8B5CF6',
            concert: '#EF4444',
            conference: '#06b6d4',
            restaurant: '#10B981',
            retail: '#8B5CF6',
            social: '#3B82F6'
        };
        return frameColors[this.currentFrame] || this.currentColor;
    },

    adjustColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    },

    downloadQR() {
        if (!this.currentLink) {
            this.showNotification('Please generate a QR code first', 'error');
            return;
        }

        try {
            // Create a temporary canvas for download
            const downloadCanvas = document.createElement('canvas');
            downloadCanvas.width = 800;  // Higher resolution for download
            downloadCanvas.height = 800;
            const ctx = downloadCanvas.getContext('2d');

            // Set background based on format
            if (this.currentFormat === 'jpg') {
                ctx.fillStyle = this.currentBgColor;
                ctx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);
            } else if (!this.transparentBg.checked) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);
            }

            // Scale and draw the QR code
            ctx.scale(2, 2);
            ctx.drawImage(this.qrCanvas, 0, 0);

            // Convert to blob and download
            const mimeType = this.currentFormat === 'png' ? 'image/png' : 'image/jpeg';
            downloadCanvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `qr-code-${Date.now()}.${this.currentFormat}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.showNotification('QR Code downloaded successfully!', 'success');
            }, mimeType, 0.95);

        } catch (error) {
            console.error('Download error:', error);
            this.showNotification('Failed to download QR code', 'error');
        }
    },

    async loadUserLinks() {
        // Load user's recent links for quick generation
        try {
            // Check if Firebase is initialized
            if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
                console.log('Firebase not ready, waiting...');
                setTimeout(() => this.loadUserLinks(), 500);
                return;
            }

            const user = firebase.auth().currentUser;
            if (!user) {
                console.log('No user logged in');
                this.quickLinksGrid.innerHTML = '<p class="text-muted">Please log in to see your links</p>';
                return;
            }

            const db = firebase.firestore();
            
            // First, try to get all user links without active filter
            const linksSnapshot = await db.collection('links')
                .where('userId', '==', user.uid)
                .orderBy('createdAt', 'desc')
                .limit(6)
                .get();

            if (linksSnapshot.empty) {
                this.quickLinksGrid.innerHTML = `
                    <div style="text-align: center; padding: 24px; color: var(--text-secondary);">
                        <i class="fas fa-link" style="font-size: 32px; opacity: 0.3; margin-bottom: 12px; display: block;"></i>
                        <p>No links yet!</p>
                        <p style="font-size: 14px; margin-top: 8px;">Create a link to generate QR codes</p>
                    </div>
                `;
                return;
            }

            this.quickLinksGrid.innerHTML = '';
            linksSnapshot.forEach(doc => {
                const link = doc.data();
                const btn = document.createElement('button');
                btn.className = 'quick-link-btn';
                
                const shortUrl = `${window.location.origin}/${link.shortCode}`;
                const displayUrl = this.truncateUrl(link.originalUrl, 35);
                
                btn.innerHTML = `
                    <div class="quick-link-header">
                        <span class="link-short" style="font-weight: 600; color: var(--accent-cyan);">/${link.shortCode}</span>
                        <span class="link-clicks" style="color: var(--text-tertiary); font-size: 12px;">
                            <i class="fas fa-mouse-pointer"></i> ${link.clicks || 0}
                        </span>
                    </div>
                    <span class="link-original" style="font-size: 13px; color: var(--text-secondary); display: block; margin-top: 4px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${link.originalUrl}">${displayUrl}</span>
                `;
                
                btn.addEventListener('click', () => {
                    this.qrLinkInput.value = shortUrl;
                    this.generateQR();
                    // Smooth scroll to preview
                    document.querySelector('.qr-preview-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
                
                this.quickLinksGrid.appendChild(btn);
            });

        } catch (error) {
            console.error('Error loading links:', error);
            this.quickLinksGrid.innerHTML = `
                <div style="text-align: center; padding: 24px; color: var(--text-secondary);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 32px; opacity: 0.3; margin-bottom: 12px; display: block; color: var(--accent-orange);"></i>
                    <p>Error loading links</p>
                    <p style="font-size: 14px; margin-top: 8px;">${error.message}</p>
                    <button class="btn btn-sm btn-secondary" onclick="window.QRGenerator.loadUserLinks()" style="margin-top: 12px;">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    },

    truncateUrl(url, maxLength) {
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength - 3) + '...';
    },

    showNotification(message, type = 'info') {
        // Use existing notification system if available
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }
};

// Initialize when QR Generator page is shown
if (typeof window !== 'undefined') {
    window.QRGenerator = QRGenerator;
}
