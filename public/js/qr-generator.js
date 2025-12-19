// QR Generator Module
const QRGenerator = {
    currentPattern: 'square',
    currentFrame: 'none',
    currentColor: '#000000',
    currentBgColor: '#ffffff',
    currentFormat: 'png',
    currentLink: '',
    currentBrandName: '',
    qrCodeStyling: null,

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
            if (this.currentLink) this.generateQR();
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

        // Transparent background toggle
        this.transparentBg.addEventListener('change', (e) => {
            if (this.currentLink) this.generateQR();
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
            // Check if QRCodeStyling library is loaded
            if (typeof QRCodeStyling === 'undefined') {
                throw new Error('QR Code Styling library not loaded. Please refresh the page.');
            }

            // Clear previous QR code
            const container = document.querySelector('.qr-canvas-wrapper');
            container.innerHTML = '';

            // Set container background
            const bgColor = this.transparentBg?.checked ? '#ffffffda' : this.currentBgColor;
            container.style.backgroundColor = bgColor;
            container.style.width = '400px';
            container.style.height = '400px';
            container.style.display = 'inline-block';
            container.style.borderRadius = '24px';
            container.style.overflow = 'hidden';

            // Get pattern-specific options
            const patternOptions = this.getPatternOptions();
            
            // Get frame options
            const frameOptions = this.getFrameOptions();

            // Build QR code configuration
            const qrOptions = {
                width: 400,
                height: 400,
                type: 'svg',
                data: link,
                margin: frameOptions.margin,
                qrOptions: {
                    errorCorrectionLevel: 'H'
                },
                imageOptions: {
                    hideBackgroundDots: true,
                    imageSize: 0.4,
                    margin: 5,
                    crossOrigin: 'anonymous'
                },
                dotsOptions: {
                    color: this.currentColor,
                    type: patternOptions.dotsType
                },
                cornersSquareOptions: {
                    color: this.currentColor,
                    type: patternOptions.cornersSquareType
                },
                cornersDotOptions: {
                    color: this.currentColor,
                    type: patternOptions.cornersDotType
                },
                backgroundOptions: {
                    color: 'transparent' // Always transparent - let container handle background
                }
            };

            // Add brand name as text overlay if provided
            if (this.currentBrandName) {
                // Create a data URL for brand text image
                qrOptions.image = await this.createBrandImage(this.currentBrandName);
            }

            // Create QR code
            this.qrCodeStyling = new QRCodeStyling(qrOptions);

            // Append to canvas wrapper (will create SVG)
            this.qrCodeStyling.append(container);

            // Style the SVG to match canvas appearance
            const svg = container.querySelector('svg');
            if (svg) {
                svg.style.display = 'block';
                svg.style.borderRadius = '24px'; // Match container border-radius
                svg.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
                svg.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                svg.style.width = '400px';
                svg.style.height = '400px';
                // Let the QR library handle the background color
            }

            // Apply frame if selected
            if (this.currentFrame !== 'none') {
                this.applyFrameToSVG(container, frameOptions);
            }

            this.downloadBtn.disabled = false;
            
            // Update floating preview
            setTimeout(() => this.updateFloatingPreview(), 100);

        } catch (error) {
            console.error('QR generation error:', error);
            this.showNotification(error.message || 'Failed to generate QR code', 'error');
            this.qrPlaceholder.style.display = 'block';
            this.qrPlaceholder.textContent = 'Failed to generate QR code. Please try again.';
        }
    },

    getPatternOptions() {
        const patterns = {
            'square': {
                dotsType: 'square',
                cornersSquareType: 'square',
                cornersDotType: 'square'
            },
            'dots': {
                dotsType: 'dots',
                cornersSquareType: 'dot',
                cornersDotType: 'dot'
            },
            'rounded': {
                dotsType: 'rounded',
                cornersSquareType: 'extra-rounded',
                cornersDotType: 'dot'
            },
            'extra-rounded': {
                dotsType: 'extra-rounded',
                cornersSquareType: 'extra-rounded',
                cornersDotType: 'dot'
            },
            'classy': {
                dotsType: 'classy',
                cornersSquareType: 'square',
                cornersDotType: 'square'
            },
            'classy-rounded': {
                dotsType: 'classy-rounded',
                cornersSquareType: 'extra-rounded',
                cornersDotType: 'dot'
            },
            'circular': {
                dotsType: 'dots',
                cornersSquareType: 'dot',
                cornersDotType: 'dot'
            },
            'diamond': {
                dotsType: 'square',
                cornersSquareType: 'square',
                cornersDotType: 'square'
            },
            'star': {
                dotsType: 'dots',
                cornersSquareType: 'extra-rounded',
                cornersDotType: 'dot'
            },
            'bars': {
                dotsType: 'classy',
                cornersSquareType: 'square',
                cornersDotType: 'square'
            },
            'thick': {
                dotsType: 'square',
                cornersSquareType: 'square',
                cornersDotType: 'square'
            },
            'thin': {
                dotsType: 'dots',
                cornersSquareType: 'dot',
                cornersDotType: 'dot'
            },
            'fluid': {
                dotsType: 'extra-rounded',
                cornersSquareType: 'extra-rounded',
                cornersDotType: 'dot'
            },
            'mosaic': {
                dotsType: 'classy',
                cornersSquareType: 'extra-rounded',
                cornersDotType: 'dot'
            },
            'leaf': {
                dotsType: 'classy-rounded',
                cornersSquareType: 'extra-rounded',
                cornersDotType: 'dot'
            }
        };

        return patterns[this.currentPattern] || patterns['square'];
    },

    getFrameOptions() {
        const frames = {
            'none': { margin: 10, color: null, text: null },
            'business': { margin: 20, color: '#3B82F6', text: 'SCAN ME' },
            'wedding': { margin: 20, color: '#EC4899', text: '💝' },
            'birthday': { margin: 20, color: '#F59E0B', text: '🎉' },
            'party': { margin: 20, color: '#8B5CF6', text: '🎊' },
            'concert': { margin: 20, color: '#EF4444', text: '🎵' },
            'conference': { margin: 20, color: '#06b6d4', text: 'EVENT' },
            'restaurant': { margin: 20, color: '#10B981', text: '🍴' },
            'retail': { margin: 20, color: '#8B5CF6', text: 'SHOP' },
            'social': { margin: 20, color: '#3B82F6', text: 'FOLLOW' }
        };

        return frames[this.currentFrame] || frames['none'];
    },

    async createBrandImage(text) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');

            // Draw white circle background
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(100, 100, 90, 0, Math.PI * 2);
            ctx.fill();

            // Draw border
            ctx.strokeStyle = this.currentColor;
            ctx.lineWidth = 4;
            ctx.stroke();

            // Draw text
            ctx.fillStyle = this.currentColor;
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Wrap text if too long
            const maxWidth = 160;
            const words = text.split(' ');
            let line = '';
            let y = 100;
            
            if (words.length > 1) {
                y = 85;
                words.forEach((word, i) => {
                    const testLine = line + word + ' ';
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > maxWidth && i > 0) {
                        ctx.fillText(line, 100, y);
                        line = word + ' ';
                        y += 30;
                    } else {
                        line = testLine;
                    }
                });
                ctx.fillText(line, 100, y);
            } else {
                ctx.fillText(text, 100, 100);
            }

            resolve(canvas.toDataURL());
        });
    },

    applyFrameToSVG(container, frameOptions, size = 400) {
        if (!frameOptions.color) return;

        const svg = container.querySelector('svg');
        if (!svg) return;

        const frameColor = frameOptions.color;
        const frameText = frameOptions.text;

        // Scale values based on size
        const scale = size / 400;
        const padding = 5 * scale;
        const strokeWidth = 10 * scale; // Increased from 8 to 10 for better visibility
        const fontSize = 16 * scale;
        const textY = 25 * scale;

        // Add clip-path for rounded corners (24px radius)
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clipPath.setAttribute('id', 'rounded-corners');
        const clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        clipRect.setAttribute('x', '0');
        clipRect.setAttribute('y', '0');
        clipRect.setAttribute('width', size.toString());
        clipRect.setAttribute('height', size.toString());
        clipRect.setAttribute('rx', '24');
        clipRect.setAttribute('ry', '24');
        clipPath.appendChild(clipRect);
        defs.appendChild(clipPath);
        svg.insertBefore(defs, svg.firstChild);

        svg.setAttribute('clip-path', 'url(#rounded-corners)');

        // Add frame rectangle on top
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', padding.toString());
        rect.setAttribute('y', padding.toString());
        rect.setAttribute('width', (size - padding * 2).toString());
        rect.setAttribute('height', (size - padding * 2).toString());
        rect.setAttribute('fill', 'none');
        rect.setAttribute('stroke', frameColor);
        rect.setAttribute('stroke-width', strokeWidth.toString());
        rect.setAttribute('rx', (10 * scale).toString());
        rect.setAttribute('stroke-linecap', 'round');
        rect.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(rect);

        // Add frame text if provided
        if (frameText) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', (size / 2).toString());
            text.setAttribute('y', textY.toString());
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', fontSize.toString());
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('fill', frameColor);
            text.setAttribute('stroke', 'rgba(255,255,255,0.8)');
            text.setAttribute('stroke-width', '1');
            text.setAttribute('stroke-linecap', 'round');
            text.setAttribute('stroke-linejoin', 'round');
            text.textContent = frameText;
            svg.appendChild(text);
        }
    },

    updateFloatingPreview() {
        // Copy main SVG to floating canvas
        if (this.qrCodeStyling && this.floatingCanvas) {
            const container = document.querySelector('.qr-canvas-wrapper');
            const svg = container.querySelector('svg');
            
            if (svg) {
                // Convert SVG to canvas for floating preview
                const svgData = new XMLSerializer().serializeToString(svg);
                const img = new Image();
                const blob = new Blob([svgData], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                
                img.onload = () => {
                    const ctx = this.floatingCanvas.getContext('2d');
                    ctx.clearRect(0, 0, 400, 400);
                    ctx.drawImage(img, 0, 0, 400, 400);
                    URL.revokeObjectURL(url);
                };
                
                img.src = url;
            }
        }
    },

    async downloadQR() {
        if (!this.currentLink || !this.qrCodeStyling) {
            this.showNotification('Please generate a QR code first', 'error');
            return;
        }

        try {
            const extension = this.currentFormat;
            const fileName = `qr-code-${Date.now()}.${extension}`;

            // Get pattern-specific options
            const patternOptions = this.getPatternOptions();
            
            // Get frame options
            const frameOptions = this.getFrameOptions();

            // Determine background color based on format and settings
            let backgroundColor;
            if (extension === 'jpg') {
                // JPG doesn't support transparency, always use the selected background color
                backgroundColor = this.currentBgColor;
            } else {
                // PNG/SVG: use transparent if checkbox is checked, otherwise use background color
                backgroundColor = this.transparentBg?.checked ? 'transparent' : this.currentBgColor;
            }

            // Create download QR with proper settings
            const qrSize = 400;
            const canvasSize = extension === 'svg' ? 400 : 800;
            const scale = canvasSize / 400;
            const downloadOptions = {
                width: qrSize,
                height: qrSize,
                type: 'svg',
                data: this.currentLink,
                margin: frameOptions.margin * scale,
                qrOptions: {
                    errorCorrectionLevel: 'H'
                },
                imageOptions: {
                    hideBackgroundDots: true,
                    imageSize: 0.4,
                    margin: 5,
                    crossOrigin: 'anonymous'
                },
                dotsOptions: {
                    color: this.currentColor,
                    type: patternOptions.dotsType
                },
                cornersSquareOptions: {
                    color: this.currentColor,
                    type: patternOptions.cornersSquareType
                },
                cornersDotOptions: {
                    color: this.currentColor,
                    type: patternOptions.cornersDotType
                },
                backgroundOptions: {
                    color: backgroundColor
                }
            };

            // Add brand name if provided
            if (this.currentBrandName) {
                downloadOptions.image = await this.createBrandImage(this.currentBrandName);
            }

            // Create new QR instance for download
            const downloadQR = new QRCodeStyling(downloadOptions);
            
            // Create temporary container
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            document.body.appendChild(tempContainer);
            
            // Generate QR in temp container
            downloadQR.append(tempContainer);
            
            // Wait for SVG to be rendered
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Apply frame if selected
            if (this.currentFrame !== 'none') {
                this.applyFrameToSVG(tempContainer, frameOptions, qrSize);
            }
            
            // Get the SVG element
            const svg = tempContainer.querySelector('svg');
            
            if (extension === 'svg') {
                // Download SVG directly
                const svgData = new XMLSerializer().serializeToString(svg);
                const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                // Convert SVG to Canvas for PNG/JPG
                const svgData = new XMLSerializer().serializeToString(svg);
                const img = new Image();
                const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                
                await new Promise((resolve, reject) => {
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = canvasSize;
                        canvas.height = canvasSize;
                        const ctx = canvas.getContext('2d');
                        
                        ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
                        
                        canvas.toBlob((blob) => {
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = fileName;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                            resolve();
                        }, extension === 'jpg' ? 'image/jpeg' : 'image/png', 0.95);
                        
                        URL.revokeObjectURL(url);
                    };
                    
                    img.onerror = reject;
                    img.src = url;
                });
            }
            
            // Clean up
            document.body.removeChild(tempContainer);
            
            this.showNotification('QR Code downloaded successfully!', 'success');

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
            
            // Get user links - sort on client side to avoid index requirement
            const linksSnapshot = await db.collection('links')
                .where('userId', '==', user.uid)
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

            // Sort links by creation date (most recent first) and limit to 6
            const links = [];
            linksSnapshot.forEach(doc => {
                links.push({ id: doc.id, ...doc.data() });
            });
            
            links.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB - dateA;
            });
            
            const recentLinks = links.slice(0, 6);

            this.quickLinksGrid.innerHTML = '';
            recentLinks.forEach(link => {
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
