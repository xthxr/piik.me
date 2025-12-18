/**
 * In-memory storage fallback for when Firebase is not configured
 */
class MemoryStore {
  constructor() {
    this.links = new Map();
    this.analytics = new Map();
  }

  // Link methods
  async getLink(shortCode) {
    return this.links.get(shortCode) || null;
  }

  async setLink(shortCode, linkData) {
    this.links.set(shortCode, linkData);
    return linkData;
  }

  async deleteLink(shortCode) {
    return this.links.delete(shortCode);
  }

  async getAllLinks(userId) {
    const userLinks = [];
    for (const [, link] of this.links) {
      if (link.userId === userId) {
        userLinks.push(link);
      }
    }
    return userLinks;
  }

  // Analytics methods
  async getAnalytics(shortCode) {
    return this.analytics.get(shortCode) || { clicks: [] };
  }

  async addClick(shortCode, clickData) {
    const current = this.analytics.get(shortCode) || { clicks: [] };
    current.clicks.push(clickData);
    this.analytics.set(shortCode, current);
    return clickData;
  }

  // Clear all data (for testing)
  clear() {
    this.links.clear();
    this.analytics.clear();
  }
}

module.exports = new MemoryStore();
