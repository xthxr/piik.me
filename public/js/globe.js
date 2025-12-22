// Globe Visualization for Analytics
// Adapted from Vue component to vanilla JavaScript

class GlobeVisualization {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = null;
    this.globe = null;
    this.locations = [];
    this.currentShortCode = null;
    this.hexAltitude = 0.001;
    this.countriesData = null;
    this.resizeObserver = null;
    
    this.init();
  }

  async init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`Globe container #${this.containerId} not found`);
      return;
    }

    // Load countries GeoJSON
    await this.loadCountriesData();
  }

  async loadCountriesData() {
    try {
      const response = await fetch('/countries.geojson');
      this.countriesData = await response.json();
    } catch (error) {
      console.warn('Could not load countries.geojson, using basic globe');
      this.countriesData = { features: [] };
    }
  }

  async loadLocations(shortCode) {
    if (!shortCode) return;
    
    try {
      const response = await fetch(`/api/analytics/${shortCode}/locations`);
      const data = await response.json();
      
      if (data.locations) {
        this.locations = data.locations.map(loc => ({
          lat: loc.lat,
          lng: loc.lng,
          city: loc.city,
          country: loc.country,
          count: Math.max(1, loc.count)
        }));
        
        if (this.globe) {
          this.updateGlobeData();
        }
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  }

  getSize() {
    const width = this.container.clientWidth || 800;
    const height = window.innerWidth > 768 ? width * 0.5 : width * 0.8;
    return { width, height };
  }

  initGlobe() {
    if (!this.container || !this.countriesData) return;

    const { width, height } = this.getSize();
    
    // Clear container
    this.container.innerHTML = '';

    // Calculate highest count for color scaling
    const highest = this.locations.reduce((acc, curr) => Math.max(acc, curr.count), 0) || 1;
    
    // Create color scale
    const weightColor = d3.scaleSequentialSqrt(d3.interpolateYlOrRd)
      .domain([0, highest * 3]);

    // Initialize Globe
    this.globe = Globe()(this.container)
      .width(width)
      .height(height)
      .backgroundColor('rgba(0,0,0,0)')
      .atmosphereColor('rgba(170, 170, 200, 0.8)')
      .globeMaterial(new THREE.MeshPhongMaterial({
        color: 'rgba(0, 0, 112, 1)',
        transparent: false,
        opacity: 1,
      }))
      .hexPolygonsData(this.countriesData.features)
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.2)
      .hexPolygonColor(() => `rgba(54, 211, 153, ${Math.random() / 10.5 + 0.5})`)
      .hexPolygonAltitude(() => this.hexAltitude)
      .hexBinResolution(3)
      .hexBinPointsData(this.locations)
      .hexBinMerge(true)
      .hexBinPointWeight('count')
      .hexTopColor(d => weightColor(d.sumWeight))
      .hexSideColor(d => weightColor(d.sumWeight))
      .hexLabel(d => {
        const data = d.points[0];
        return `
          <div style="background: rgba(0,0,0,0.8); padding: 10px; border-radius: 8px; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            <div style="font-weight: 600; margin-bottom: 5px;">${data.city}, ${data.country}</div>
            <div style="font-size: 14px; opacity: 0.9;">Clicks: ${d.sumWeight}</div>
          </div>
        `;
      })
      .ringColor(() => t => `rgba(255,100,50,${1 - t})`)
      .ringMaxRadius(3)
      .ringPropagationSpeed(3)
      .onGlobeReady(() => {
        // Center view
        const firstLocation = this.locations[0] || { lat: 20, lng: 0 };
        this.globe.pointOfView({ 
          lat: firstLocation.lat, 
          lng: firstLocation.lng, 
          altitude: window.innerWidth > 768 ? 2 : 3 
        });
        
        // Enable auto-rotation
        this.globe.controls().autoRotate = true;
        this.globe.controls().autoRotateSpeed = 0.3;
        this.globe.controls().enableZoom = true;
      });

    // Add zoom listener to adjust hex altitude
    if (this.globe.controls()) {
      this.globe.controls().addEventListener('end', this.debounce(() => {
        const distance = Math.round(this.globe.controls().getDistance());
        let nextAlt = 0.005;
        if (distance <= 300) nextAlt = 0.001;
        else if (distance >= 600) nextAlt = 0.02;
        if (nextAlt !== this.hexAltitude) {
          this.hexAltitude = nextAlt;
          this.globe.hexPolygonAltitude(() => this.hexAltitude);
        }
      }, 200));
    }

    // Stop rotation on interaction
    this.container.addEventListener('mousedown', () => {
      if (this.globe && this.globe.controls()) {
        this.globe.controls().autoRotate = false;
      }
    });

    // Handle window resize
    this.setupResize();
  }

  updateGlobeData() {
    if (!this.globe) return;

    const highest = this.locations.reduce((acc, curr) => Math.max(acc, curr.count), 0) || 1;
    const weightColor = d3.scaleSequentialSqrt(d3.interpolateYlOrRd)
      .domain([0, highest * 3]);

    this.globe
      .hexBinPointsData(this.locations)
      .hexTopColor(d => weightColor(d.sumWeight))
      .hexSideColor(d => weightColor(d.sumWeight));
  }

  setupResize() {
    // Use ResizeObserver if available
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.debounce(() => {
        if (this.globe) {
          const { width, height } = this.getSize();
          this.globe.width(width).height(height);
        }
      }, 250));
      
      this.resizeObserver.observe(this.container);
    } else {
      // Fallback to window resize
      window.addEventListener('resize', this.debounce(() => {
        if (this.globe) {
          const { width, height } = this.getSize();
          this.globe.width(width).height(height);
        }
      }, 250));
    }
  }

  async update(shortCode) {
    if (this.currentShortCode === shortCode && this.globe) {
      // Just update data
      await this.loadLocations(shortCode);
      return;
    }

    this.currentShortCode = shortCode;
    await this.loadLocations(shortCode);
    
    if (!this.globe) {
      this.initGlobe();
    } else {
      this.updateGlobeData();
    }
  }

  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.globe) {
      if (this.globe._destructor) {
        this.globe._destructor();
      }
      this.globe = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  // Utility: Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Global instance
window.globeViz = null;
