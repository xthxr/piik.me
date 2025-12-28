// Version Checker - Fetches latest release from GitHub
class VersionChecker {
    constructor() {
        this.owner = 'xthxr';
        this.repo = 'piik.me';
        this.currentVersion = 'v0.2.0-beta'; // Beta version
        this.apiUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/releases/latest`;
    }

    async checkForUpdates() {
        try {
            const response = await fetch(this.apiUrl);
            
            if (!response.ok) {
                // No releases yet, show current beta version
                this.showVersionBanner(this.currentVersion, true);
                return;
            }

            const release = await response.json();
            const latestVersion = release.tag_name;
            const releaseNotes = release.body;

            this.showVersionBanner(latestVersion, false, releaseNotes);
        } catch (error) {
            console.log('Could not fetch version info:', error);
            // Show beta version as fallback
            this.showVersionBanner(this.currentVersion, true);
        }
    }

    showVersionBanner(version, isBeta = false, releaseNotes = '') {
        const existingBanner = document.getElementById('versionBanner');
        if (existingBanner) {
            existingBanner.remove();
        }

        const banner = document.createElement('div');
        banner.id = 'versionBanner';
        banner.className = 'version-banner';
        
        const versionText = isBeta ? 'Beta v0.2 is Now Live' : `${version} is Now Live`;
        
        banner.innerHTML = `
            <div class="version-banner-content">
                <span class="version-text">${versionText}</span>
                <button class="whats-new-btn" id="whatsNewBtn">
                    <i class="fas fa-sparkles"></i> What's New
                </button>
                <button class="close-banner-btn" id="closeBannerBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Insert banner at the top of the app container
        const appContainer = document.getElementById('app');
        if (appContainer) {
            appContainer.insertBefore(banner, appContainer.firstChild);
        }

        // Add event listeners
        const whatsNewBtn = document.getElementById('whatsNewBtn');
        const closeBannerBtn = document.getElementById('closeBannerBtn');

        if (whatsNewBtn) {
            whatsNewBtn.addEventListener('click', () => {
                this.openChangelog(releaseNotes);
            });
        }

        if (closeBannerBtn) {
            closeBannerBtn.addEventListener('click', () => {
                banner.style.animation = 'slideUp 0.3s ease-out';
                setTimeout(() => banner.remove(), 300);
                localStorage.setItem('versionBannerDismissed', version);
            });
        }

        // Check if user already dismissed this version
        const dismissedVersion = localStorage.getItem('versionBannerDismissed');
        if (dismissedVersion === version) {
            banner.style.display = 'none';
        }
    }

    openChangelog(releaseNotes = '') {
        // Create modal for changelog
        const modal = document.createElement('div');
        modal.className = 'modal changelog-modal';
        modal.style.display = 'flex';

        modal.innerHTML = `
            <div class="modal-content changelog-content">
                <div class="modal-header">
                    <h2><i class="fas fa-rocket"></i> What's New</h2>
                    <button class="close-modal" id="closeChangelogModal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body changelog-body">
                    <div id="changelogContent">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i> Loading changelog...
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Fetch and display CHANGELOG.md
        this.loadChangelog();

        // Close modal events
        const closeBtn = document.getElementById('closeChangelogModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.opacity = '0';
                setTimeout(() => modal.remove(), 200);
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.opacity = '0';
                setTimeout(() => modal.remove(), 200);
            }
        });
    }

    async loadChangelog() {
        const contentDiv = document.getElementById('changelogContent');
        if (!contentDiv) return;

        try {
            const response = await fetch('/CHANGELOG.md');
            
            if (!response.ok) {
                throw new Error('Failed to load changelog');
            }

            const markdown = await response.text();
            
            // Convert markdown to HTML (basic conversion)
            const html = this.markdownToHtml(markdown);
            contentDiv.innerHTML = html;
        } catch (error) {
            console.error('Error loading changelog:', error);
            contentDiv.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Could not load changelog. Please visit our 
                    <a href="https://github.com/${this.owner}/${this.repo}/releases" target="_blank">
                        GitHub Releases
                    </a> page.</p>
                </div>
            `;
        }
    }

    markdownToHtml(markdown) {
        // Basic markdown to HTML conversion
        let html = markdown
            // Headers
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Code blocks
            .replace(/```(\w+)?\n([\s\S]+?)```/g, '<pre><code>$2</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            // Bullet lists
            .replace(/^\- (.+)$/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            // Horizontal rule
            .replace(/^---$/gim, '<hr>')
            // Line breaks
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        return `<div class="markdown-content"><p>${html}</p></div>`;
    }
}

// Initialize version checker when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const versionChecker = new VersionChecker();
        versionChecker.checkForUpdates();
    });
} else {
    const versionChecker = new VersionChecker();
    versionChecker.checkForUpdates();
}
