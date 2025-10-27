// Initialize Socket.IO
const socket = io();

// State
let currentShortCode = null;
let referrerChart = null; // Store chart instance

// DOM Elements
const urlInput = document.getElementById('urlInput');
const utmSource = document.getElementById('utmSource');
const utmMedium = document.getElementById('utmMedium');
const utmCampaign = document.getElementById('utmCampaign');
const utmTerm = document.getElementById('utmTerm');
const utmContent = document.getElementById('utmContent');
const shortenBtn = document.getElementById('shortenBtn');
const resultSection = document.getElementById('resultSection');
const shortUrlDisplay = document.getElementById('shortUrlDisplay');
const copyBtn = document.getElementById('copyBtn');
const viewAnalyticsBtn = document.getElementById('viewAnalyticsBtn');
const shareBtn = document.getElementById('shareBtn');
const analyticsSection = document.getElementById('analyticsSection');
const backBtn = document.getElementById('backBtn');

// Dashboard Elements
const createNewBtn = document.getElementById('createNewBtn');
const createFirstBtn = document.getElementById('createFirstBtn');
const linksGrid = document.getElementById('linksGrid');
const emptyState = document.getElementById('emptyState');

// Event Listeners
if (shortenBtn) shortenBtn.addEventListener('click', createShortLink);
if (copyBtn) copyBtn.addEventListener('click', copyToClipboard);
if (viewAnalyticsBtn) viewAnalyticsBtn.addEventListener('click', showAnalytics);
if (shareBtn) shareBtn.addEventListener('click', shareLink);
if (backBtn) backBtn.addEventListener('click', goBack);
if (createNewBtn) createNewBtn.addEventListener('click', showCreateForm);
if (createFirstBtn) createFirstBtn.addEventListener('click', showCreateForm);

// Allow Enter key to submit
if (urlInput) {
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createShortLink();
    });
}

// Show Dashboard
async function showDashboard() {
    if (!isAuthenticated()) return;
    
    dashboardSection.style.display = 'block';
    shortenerSection.style.display = 'none';
    analyticsSection.style.display = 'none';
    
    await loadUserLinks();
}

// Show Create Form
function showCreateForm() {
    dashboardSection.style.display = 'none';
    shortenerSection.style.display = 'block';
    analyticsSection.style.display = 'none';
}

// Load User's Links
async function loadUserLinks() {
    try {
        const token = await getAuthToken();
        
        if (!token) {
            console.log('No auth token available');
            emptyState.style.display = 'block';
            linksGrid.style.display = 'none';
            return;
        }
        
        console.log('Fetching user links...');
        const response = await fetch('/api/user/links', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            console.error('Error response:', error);
            throw new Error(error.error || 'Failed to fetch links');
        }
        
        const data = await response.json();
        console.log('Fetched links:', data.links?.length || 0);
        
        if (data.links && data.links.length > 0) {
            displayLinks(data.links);
            emptyState.style.display = 'none';
            linksGrid.style.display = 'grid';
        } else {
            console.log('No links found, showing empty state');
            emptyState.style.display = 'block';
            linksGrid.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading links:', error);
        // Show empty state on error
        emptyState.style.display = 'block';
        linksGrid.style.display = 'none';
    }
}

// Display Links Grid
function displayLinks(links) {
    linksGrid.innerHTML = links.map(link => {
        const ctr = link.analytics.impressions > 0 
            ? ((link.analytics.clicks / link.analytics.impressions) * 100).toFixed(1) 
            : 0;
        
        return `
            <div class="link-card" data-shortcode="${link.shortCode}">
                <div class="link-card-header">
                    <h3 class="link-title">${truncateUrl(link.originalUrl, 40)}</h3>
                    <button class="link-copy-btn" onclick="copyLinkUrl('${link.shortUrl}')">📋</button>
                </div>
                <div class="link-short-url">
                    <a href="${link.shortUrl}" target="_blank">${link.shortUrl}</a>
                </div>
                <div class="link-stats">
                    <div class="link-stat">
                        <span class="stat-label">👁️ Impressions</span>
                        <span class="stat-value">${link.analytics.impressions || 0}</span>
                    </div>
                    <div class="link-stat">
                        <span class="stat-label">🖱️ Clicks</span>
                        <span class="stat-value">${link.analytics.clicks || 0}</span>
                    </div>
                    <div class="link-stat">
                        <span class="stat-label">📤 Shares</span>
                        <span class="stat-value">${link.analytics.shares || 0}</span>
                    </div>
                    <div class="link-stat">
                        <span class="stat-label">📈 CTR</span>
                        <span class="stat-value">${ctr}%</span>
                    </div>
                </div>
                <div class="link-actions">
                    <button class="link-action-btn" onclick="viewLinkAnalytics('${link.shortCode}')">
                        📊 View Analytics
                    </button>
                    <button class="link-action-btn" onclick="shareLink('${link.shortUrl}', '${link.shortCode}')">
                        🔗 Share
                    </button>
                    <button class="link-action-btn delete-btn" onclick="deleteLink('${link.shortCode}')">
                        🗑️ Delete
                    </button>
                </div>
                <div class="link-date">
                    Created ${formatDate(link.createdAt)}
                </div>
            </div>
        `;
    }).join('');
}

// Helper Functions
function truncateUrl(url, maxLength) {
    return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

function copyLinkUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        // Show temporary success message
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

function viewLinkAnalytics(shortCode) {
    currentShortCode = shortCode;
    showAnalytics();
}

// Delete Link
async function deleteLink(shortCode) {
    if (!confirm('Are you sure you want to delete this link? This action cannot be undone.')) {
        return;
    }
    
    try {
        const token = await getAuthToken();
        const response = await fetch(`/api/links/${shortCode}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete link');
        }
        
        // Remove the link card from UI with animation
        const linkCard = document.querySelector(`[data-shortcode="${shortCode}"]`);
        if (linkCard) {
            linkCard.style.opacity = '0';
            linkCard.style.transform = 'scale(0.9)';
            setTimeout(() => {
                linkCard.remove();
                // Check if there are any links left
                const remainingLinks = document.querySelectorAll('.link-card');
                if (remainingLinks.length === 0) {
                    emptyState.style.display = 'block';
                    linksGrid.style.display = 'none';
                }
            }, 300);
        }
        
        // Show success message
        alert('Link deleted successfully!');
    } catch (error) {
        console.error('Error deleting link:', error);
        alert('Failed to delete link: ' + error.message);
    }
}

// Create Short Link
async function createShortLink() {
    if (!isAuthenticated()) {
        alert('Please sign in to create links');
        return;
    }
    
    const url = urlInput.value.trim();
    
    if (!url) {
        alert('Please enter a URL');
        return;
    }

    // Validate URL
    try {
        new URL(url);
    } catch (e) {
        alert('Please enter a valid URL');
        return;
    }

    // Get UTM parameters if provided
    const utmParams = {
        source: utmSource.value.trim(),
        medium: utmMedium.value.trim(),
        campaign: utmCampaign.value.trim(),
        term: utmTerm.value.trim(),
        content: utmContent.value.trim()
    };

    // Remove empty UTM parameters
    Object.keys(utmParams).forEach(key => {
        if (!utmParams[key]) delete utmParams[key];
    });

    shortenBtn.disabled = true;
    shortenBtn.textContent = 'Generating...';

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
                utmParams: Object.keys(utmParams).length > 0 ? utmParams : null
            })
        });

        const data = await response.json();

        if (data.success) {
            currentShortCode = data.shortCode;
            shortUrlDisplay.value = data.shortUrl;
            resultSection.style.display = 'block';
            resultSection.classList.add('success-animation');
            
            // Clear animation class after animation completes
            setTimeout(() => {
                resultSection.classList.remove('success-animation');
            }, 500);
        } else {
            alert('Error: ' + (data.error || 'Failed to create short link'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to create short link. Please try again.');
    } finally {
        shortenBtn.disabled = false;
        shortenBtn.textContent = 'Generate Zaplink';
    }
}

// Copy to Clipboard
function copyToClipboard() {
    shortUrlDisplay.select();
    document.execCommand('copy');
    
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✅ Copied!';
    copyBtn.classList.add('success-animation');
    
    setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('success-animation');
    }, 2000);
}

// Show Analytics
async function showAnalytics() {
    if (!currentShortCode) return;

    document.querySelector('.shortener-section').style.display = 'none';
    analyticsSection.style.display = 'block';

    // Subscribe to real-time updates
    socket.emit('subscribe', currentShortCode);

    // Listen for real-time updates
    socket.on(`analytics:${currentShortCode}`, (data) => {
        updateAnalyticsDisplay(data.data);
    });

    // Load initial analytics
    await loadAnalytics(currentShortCode);

    // Track impression
    trackImpression(currentShortCode);
}

// Load Analytics
async function loadAnalytics(shortCode) {
    try {
        const response = await fetch(`/api/analytics/${shortCode}`);
        const data = await response.json();

        if (data.link && data.analytics) {
            displayLinkInfo(data.link);
            updateAnalyticsDisplay(data.analytics);
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Display Link Info
function displayLinkInfo(link) {
    const linkInfo = document.getElementById('linkInfo');
    linkInfo.innerHTML = `
        <div style="margin-bottom: 10px;">
            <strong>Short URL:</strong> <a href="${link.shortUrl}" target="_blank">${link.shortUrl}</a>
        </div>
        <div style="margin-bottom: 10px;">
            <strong>Original URL:</strong> ${link.originalUrl}
        </div>
        <div>
            <strong>Created:</strong> ${new Date(link.createdAt).toLocaleString()}
        </div>
        ${Object.keys(link.utmParams || {}).length > 0 ? `
            <div style="margin-top: 10px;">
                <strong>UTM Parameters:</strong>
                <div style="margin-top: 5px; padding: 10px; background: white; border-radius: 8px;">
                    ${Object.entries(link.utmParams).map(([key, value]) => 
                        value ? `<div><code>${key}: ${value}</code></div>` : ''
                    ).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

// Update Analytics Display
function updateAnalyticsDisplay(analytics) {
    // Update main stats
    document.getElementById('impressions').textContent = analytics.impressions || 0;
    document.getElementById('clicks').textContent = analytics.clicks || 0;
    document.getElementById('shares').textContent = analytics.shares || 0;
    
    // Calculate CTR
    const ctr = analytics.impressions > 0 
        ? ((analytics.clicks / analytics.impressions) * 100).toFixed(2) 
        : 0;
    document.getElementById('ctr').textContent = `${ctr}%`;

    // Update metric cards
    updateMetricCards(analytics);
    
    // Update devices chart
    updateChart('devicesChart', analytics.devices || {});
    
    // Update browsers chart
    updateChart('browsersChart', analytics.browsers || {});
    
    // Update referrers donut chart
    updateReferrerChart(analytics.referrers || {});
    
    // Update click history
    updateClickHistory(analytics.clickHistory || []);
}

// Update Metric Cards
function updateMetricCards(analytics) {
    // Page Views by Device
    const devices = analytics.devices || {};
    document.getElementById('desktopViews').textContent = devices.Desktop || 0;
    document.getElementById('mobileViews').textContent = devices.Mobile || 0;
    
    // Top Browsers
    const browsers = analytics.browsers || {};
    const sortedBrowsers = Object.entries(browsers).sort((a, b) => b[1] - a[1]);
    
    if (sortedBrowsers.length >= 1) {
        document.getElementById('topBrowser1Name').textContent = sortedBrowsers[0][0];
        document.getElementById('topBrowser1Value').textContent = sortedBrowsers[0][1].toLocaleString();
    }
    
    if (sortedBrowsers.length >= 2) {
        document.getElementById('topBrowser2Name').textContent = sortedBrowsers[1][0];
        document.getElementById('topBrowser2Value').textContent = sortedBrowsers[1][1].toLocaleString();
    }
    
    // Engagement (most active referrer)
    const referrers = analytics.referrers || {};
    const sortedReferrers = Object.entries(referrers).sort((a, b) => b[1] - a[1]);
    
    if (sortedReferrers.length > 0) {
        document.getElementById('engagementIndicator').textContent = sortedReferrers[0][0];
        document.getElementById('engagementValue').textContent = sortedReferrers[0][1].toLocaleString();
    } else {
        document.getElementById('engagementIndicator').textContent = 'No data';
        document.getElementById('engagementValue').textContent = '0';
    }
}

// Update Chart
function updateChart(containerId, data) {
    const container = document.getElementById(containerId);
    
    if (Object.keys(data).length === 0) {
        container.innerHTML = '<p style="color: #64748b; text-align: center;">No data yet</p>';
        return;
    }

    const total = Object.values(data).reduce((sum, val) => sum + val, 0);
    
    container.innerHTML = Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .map(([key, value]) => {
            const percentage = ((value / total) * 100).toFixed(1);
            return `
                <div class="chart-item">
                    <div>
                        <div class="chart-item-label">${key}</div>
                        <div class="chart-bar" style="width: ${percentage}%; max-width: 200px;"></div>
                    </div>
                    <div class="chart-item-value">${value} (${percentage}%)</div>
                </div>
            `;
        })
        .join('');
}

// Update Click History
function updateClickHistory(history) {
    const container = document.getElementById('clickHistory');
    
    if (history.length === 0) {
        container.innerHTML = '<p style="color: #64748b; text-align: center;">No clicks yet</p>';
        return;
    }

    // Show most recent 10 clicks
    const recentClicks = history.slice(-10).reverse();
    
    container.innerHTML = recentClicks.map(click => `
        <div class="click-item">
            <div class="click-time">${new Date(click.timestamp).toLocaleString()}</div>
            <div class="click-details">
                <div class="click-detail">
                    <span>🖥️</span>
                    <span>${click.device}</span>
                </div>
                <div class="click-detail">
                    <span>🌐</span>
                    <span>${click.browser}</span>
                </div>
                <div class="click-detail">
                    <span>🔗</span>
                    <span>${click.referrer}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Update Referrer Donut Chart
function updateReferrerChart(referrers) {
    const canvas = document.getElementById('referrerDonutChart');
    const legendContainer = document.getElementById('referrerLegend');
    
    if (Object.keys(referrers).length === 0) {
        canvas.parentElement.innerHTML = '<p style="color: #64748b; text-align: center; padding: 40px;">No referrer data yet</p>';
        return;
    }
    
    // Calculate total clicks
    const total = Object.values(referrers).reduce((sum, val) => sum + val, 0);
    
    // Sort referrers by count and get data
    const sortedReferrers = Object.entries(referrers)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));
    
    // Define colors for different referrers
    const colorMap = {
        'Google': '#EA4335',
        'LinkedIn': '#0A66C2',
        'Facebook': '#1877F2',
        'Unknown': '#8B5CF6',
        'Reddit': '#FF4500',
        'Instagram': '#E1306C',
        'X (formerly Twitter)': '#1DA1F2',
        'Twitter': '#1DA1F2',
        'Bitly Pages': '#2C3E50',
        'Direct': '#64748B'
    };
    
    // Map referrer names to display names
    const nameMap = {
        'twitter.com': 'X (formerly Twitter)',
        'x.com': 'X (formerly Twitter)',
        't.co': 'X (formerly Twitter)',
        'Direct': 'Unknown'
    };
    
    // Process data for chart
    const chartData = sortedReferrers.map((ref, index) => {
        let displayName = ref.name;
        
        // Try to extract domain name
        if (ref.name.includes('://')) {
            try {
                const url = new URL(ref.name);
                displayName = url.hostname.replace('www.', '');
            } catch (e) {
                displayName = ref.name;
            }
        }
        
        // Apply name mapping
        displayName = nameMap[displayName] || displayName;
        
        // Capitalize first letter
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        
        // Get color
        const color = colorMap[displayName] || `hsl(${index * 40}, 70%, 50%)`;
        
        return {
            name: displayName,
            count: ref.count,
            percentage: ((ref.count / total) * 100).toFixed(1),
            color: color
        };
    });
    
    // Destroy existing chart if it exists
    if (referrerChart) {
        referrerChart.destroy();
    }
    
    // Create donut chart
    const ctx = canvas.getContext('2d');
    referrerChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartData.map(d => d.name),
            datasets: [{
                data: chartData.map(d => d.count),
                backgroundColor: chartData.map(d => d.color),
                borderWidth: 3,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false // We'll create custom legend
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });
    
    // Create custom legend
    legendContainer.innerHTML = `
        <div class="referrer-total">
            <div class="total-number">${total}</div>
            <div class="total-label">CLICKS + SCANS</div>
        </div>
        <div class="referrer-list">
            ${chartData.map(item => `
                <div class="referrer-item">
                    <div class="referrer-color" style="background-color: ${item.color}"></div>
                    <div class="referrer-name">${item.name}</div>
                    <div class="referrer-count">${item.count}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// Track Impression
async function trackImpression(shortCode) {
    try {
        await fetch(`/api/track/impression/${shortCode}`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('Error tracking impression:', error);
    }
}

// Share Link with Platform Detection
async function shareLink(url, shortCode) {
    // If called from dashboard, use parameters
    if (arguments.length === 2) {
        url = url;
        currentShortCode = shortCode;
    } else {
        // If called from result section
        url = shortUrlDisplay.value;
    }
    
    // Show share menu for better tracking
    showShareMenu(url, shortCode || currentShortCode);
}

// Show Share Menu with Platform Options
function showShareMenu(baseUrl, shortCode) {
    const platforms = [
        { name: 'WhatsApp', icon: '💬', utm: 'whatsapp', url: `https://wa.me/?text=${encodeURIComponent(baseUrl + '?utm_source=whatsapp')}` },
        { name: 'Instagram', icon: '📷', utm: 'instagram', copyOnly: true },
        { name: 'Facebook', icon: '👥', utm: 'facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(baseUrl + '?utm_source=facebook')}` },
        { name: 'Twitter/X', icon: '🐦', utm: 'twitter', url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(baseUrl + '?utm_source=twitter')}` },
        { name: 'LinkedIn', icon: '💼', utm: 'linkedin', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(baseUrl + '?utm_source=linkedin')}` },
        { name: 'Telegram', icon: '✈️', utm: 'telegram', url: `https://t.me/share/url?url=${encodeURIComponent(baseUrl + '?utm_source=telegram')}` },
        { name: 'Copy Link', icon: '📋', utm: 'direct', copyOnly: true }
    ];
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'share-modal';
    modal.innerHTML = `
        <div class="share-modal-content">
            <div class="share-modal-header">
                <h3>📤 Share Link</h3>
                <button class="share-modal-close" onclick="closeShareMenu()">&times;</button>
            </div>
            <div class="share-info">
                <p>💡 Each click from your shared link counts as a share!</p>
            </div>
            <div class="share-modal-body">
                ${platforms.map(platform => `
                    <button class="share-platform-btn" onclick="shareToplatform('${platform.utm}', '${baseUrl}', ${platform.copyOnly || false}, '${platform.url || ''}', '${shortCode}')">
                        <span class="platform-icon">${platform.icon}</span>
                        <span class="platform-name">${platform.name}</span>
                    </button>
                `).join('')}
            </div>
            <div class="share-footer">
                <small>Share with friends and watch your analytics grow! 📊</small>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

// Close Share Menu
function closeShareMenu() {
    const modal = document.querySelector('.share-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

// Share to Specific Platform
async function shareToplatform(platform, baseUrl, copyOnly, shareUrl, shortCode) {
    const trackedUrl = `${baseUrl}?utm_source=${platform}`;
    
    if (copyOnly) {
        // Copy to clipboard
        await navigator.clipboard.writeText(platform === 'direct' ? baseUrl : trackedUrl);
        
        // Show success message
        const btn = event.target.closest('.share-platform-btn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<span class="platform-icon">✅</span><span class="platform-name">Copied!</span>';
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
        }, 2000);
    } else {
        // Open share URL
        window.open(shareUrl, '_blank', 'width=600,height=400');
        closeShareMenu();
    }
    
    // Track share
    if (shortCode) {
        await fetch(`/api/track/share/${shortCode}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ platform })
        });
    }
}

// Go Back
function goBack() {
    analyticsSection.style.display = 'none';
    
    // Show dashboard instead of create form
    showDashboard();
    
    // Unsubscribe from socket updates
    if (currentShortCode) {
        socket.off(`analytics:${currentShortCode}`);
    }
    
    currentShortCode = null;
}

// Socket connection status
socket.on('connect', () => {
    console.log('Connected to Zaplink server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from Zaplink server');
});

// Initialize: Check if user is already authenticated and show dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for Firebase auth to initialize
    setTimeout(() => {
        if (isAuthenticated()) {
            showDashboard();
        }
    }, 500);
});
