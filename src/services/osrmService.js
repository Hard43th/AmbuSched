// OSRM (Open Source Routing Machine) Service Integration
// Provides real-world routing data for AmbuSched optimization

/**
 * OSRM Service Configuration
 * Using local Docker OSRM instance with France dataset
 */
const OSRM_CONFIG = {
  // Local OSRM Docker instance
  baseUrl: 'http://localhost:5000',
  
  // Docker command to start OSRM server:
  // Run from: C:\Users\bapti\Documents\Programation\Logiciels_de_dev\Geograph\osrm-data
  // Command: docker run -t -i -p 5000:5000 -v "%CD%:/data" ghcr.io/project-osrm/osrm-backend osrm-routed --algorithm mld /data/france-latest.osrm
  
  // Fallback to public server if local is not available
  fallbackUrl: 'https://router.project-osrm.org',
  
  profile: 'driving', // driving, walking, cycling
  timeout: 10000, // 10 seconds timeout for local server
  fallbackTimeout: 30000, // 30 seconds for public server
  
  // Coordinates format: [longitude, latitude] (OSRM uses lon,lat not lat,lon!)
  coordinateFormat: 'lon,lat',
  
  // Local server configuration
  dockerConfig: {
    dataPath: 'C:\\Users\\bapti\\Documents\\Programation\\Logiciels_de_dev\\Geograph\\osrm-data',
    dockerCommand: 'docker run -t -i -p 5000:5000 -v "%CD%:/data" ghcr.io/project-osrm/osrm-backend osrm-routed --algorithm mld /data/france-latest.osrm',
    port: 5000
  }
};

/**
 * Check if local OSRM server is running
 * @returns {Promise<boolean>} True if local server is accessible
 */
async function isLocalOSRMRunning() {
  try {
    const response = await fetch(`${OSRM_CONFIG.baseUrl}/route/v1/driving/6.1286,43.1205;6.1400,43.1300?overview=false`, {
      method: 'GET',
      timeout: 3000
    });
    return response.ok;
  } catch (error) {
    console.warn('🔄 Local OSRM server not accessible, will use fallback');
    return false;
  }
}

/**
 * Get the appropriate OSRM base URL (local or fallback)
 * @returns {Promise<string>} Base URL to use
 */
async function getOSRMBaseUrl() {
  const isLocalRunning = await isLocalOSRMRunning();
  if (isLocalRunning) {
    console.log('✅ Using local OSRM server at localhost:5000');
    return OSRM_CONFIG.baseUrl;
  } else {
    console.log('🌐 Using fallback OSRM server (public)');
    return OSRM_CONFIG.fallbackUrl;
  }
}

/**
 * Convert address to coordinates using geocoding
 * In production, you might want to use a dedicated geocoding service
 * @param {string} address - Address to geocode
 * @returns {Promise<Array>} [longitude, latitude]
 */
export async function geocodeForOSRM(address) {
  // Use your existing geocoding function but convert to OSRM format
  const { calculateDistance, geocodeAddress } = await import('../utils/routeOptimization.js');
  
  try {
    const coords = await geocodeAddress(address);
    // Convert from [lat, lng] to [lng, lat] for OSRM
    return [coords.lng, coords.lat];
  } catch (error) {
    console.error('Geocoding error:', error);
    // Fallback to Hyères coordinates
    return [6.1286, 43.1205];
  }
}

/**
 * Get routing information between multiple points using OSRM
 * @param {Array} coordinates - Array of [longitude, latitude] coordinates
 * @param {Object} options - Routing options
 * @returns {Promise<Object>} Routing response with distances, durations, and geometry
 */
export async function getOSRMRoute(coordinates, options = {}) {
  try {
    if (coordinates.length < 2) {
      throw new Error('At least 2 coordinates are required for routing');
    }

    const {
      overview = 'full',
      geometries = 'geojson',
      alternatives = false,
      steps = false,
      annotations = true
    } = options;

    // Format coordinates for OSRM: "lon,lat;lon,lat;..."
    const coordString = coordinates
      .map(coord => `${coord[0]},${coord[1]}`)
      .join(';');

    // Get appropriate OSRM server URL
    const baseUrl = await getOSRMBaseUrl();
    const url = `${baseUrl}/route/v1/${OSRM_CONFIG.profile}/${coordString}`;
    
    const params = {
      overview,
      geometries,
      alternatives,
      steps,
      annotations
    };

    console.log('🗺️  OSRM Route request:', url);
    
    const urlWithParams = `${url}?${new URLSearchParams(params)}`;
    
    const timeout = baseUrl === OSRM_CONFIG.baseUrl ? OSRM_CONFIG.timeout : OSRM_CONFIG.fallbackTimeout;
    
    const response = await fetch(urlWithParams, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(timeout)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok') {
      throw new Error(`OSRM routing failed: ${data.message}`);
    }

    const route = data.routes[0];
    
    return {
      success: true,
      distance: Math.round(route.distance / 1000 * 10) / 10, // Convert meters to km, round to 1 decimal
      duration: Math.round(route.duration / 60), // Convert seconds to minutes
      geometry: route.geometry,
      legs: route.legs,
      waypoints: data.waypoints,
      raw: data
    };

  } catch (error) {
    console.error('OSRM routing error:', error);
    
    // Fallback to Haversine distance calculation
    if (coordinates.length === 2) {
      const distance = calculateHaversineDistance(coordinates[0], coordinates[1]);
      const estimatedDuration = (distance / 1000) * 60; // Rough estimate: 1 km/min
      
      return {
        success: false,
        fallback: true,
        distance: distance,
        duration: estimatedDuration,
        error: error.message,
        geometry: null
      };
    }
    
    throw error;
  }
}

/**
 * Get distance and duration matrix between multiple points
 * Essential for VROOM optimization
 * @param {Array} coordinates - Array of [longitude, latitude] coordinates
 * @param {Object} options - Matrix options
 * @returns {Promise<Object>} Distance and duration matrices
 */
export async function getOSRMMatrix(coordinates, options = {}) {
  try {
    if (coordinates.length < 2) {
      throw new Error('At least 2 coordinates are required for matrix calculation');
    }

    const {
      sources = null, // Use all points as sources by default
      destinations = null, // Use all points as destinations by default
      annotations = ['duration', 'distance']
    } = options;

    // Format coordinates for OSRM
    const coordString = coordinates
      .map(coord => `${coord[0]},${coord[1]}`)
      .join(';');

    // Get appropriate OSRM server URL
    const baseUrl = await getOSRMBaseUrl();
    const url = `${baseUrl}/table/v1/${OSRM_CONFIG.profile}/${coordString}`;
    
    const params = {
      annotations: annotations.join(',')
    };

    if (sources) params.sources = sources.join(';');
    if (destinations) params.destinations = destinations.join(';');

    console.log('🏁 OSRM Matrix request:', url);
    
    const urlWithParams = `${url}?${new URLSearchParams(params)}`;
    
    const timeout = baseUrl === OSRM_CONFIG.baseUrl ? OSRM_CONFIG.timeout : OSRM_CONFIG.fallbackTimeout;
    
    const response = await fetch(urlWithParams, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(timeout)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok') {
      throw new Error(`OSRM matrix calculation failed: ${data.message}`);
    }

    return {
      success: true,
      durations: data.durations, // 2D array of durations in seconds
      distances: data.distances, // 2D array of distances in meters
      sources: data.sources,
      destinations: data.destinations,
      raw: data
    };

  } catch (error) {
    console.error('OSRM matrix error:', error);
    
    // Fallback to simplified distance matrix
    const matrix = await createFallbackMatrix(coordinates);
    
    return {
      success: false,
      fallback: true,
      durations: matrix.durations,
      distances: matrix.distances,
      error: error.message
    };
  }
}

/**
 * Get nearest road/routing point for a coordinate
 * Useful for snapping addresses to the road network
 * @param {Array} coordinate - [longitude, latitude]
 * @param {Object} options - Nearest options
 * @returns {Promise<Object>} Nearest point information
 */
export async function getOSRMNearest(coordinate, options = {}) {
  try {
    const { number = 1 } = options;
    
    const coordString = `${coordinate[0]},${coordinate[1]}`;
    const url = `${OSRM_CONFIG.baseUrl}/nearest/v1/${OSRM_CONFIG.profile}/${coordString}`;
    
    const params = { number };

    const urlWithParams = `${url}?${new URLSearchParams(params)}`;

    const response = await fetch(urlWithParams, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok') {
      throw new Error(`OSRM nearest failed: ${data.message}`);
    }

    return {
      success: true,
      waypoints: data.waypoints,
      raw: data
    };

  } catch (error) {
    console.error('OSRM nearest error:', error);
    return {
      success: false,
      waypoints: [{ location: coordinate }],
      error: error.message
    };
  }
}

/**
 * Batch geocoding and routing for multiple addresses
 * Optimized for AmbuSched trip planning
 * @param {Array} addresses - Array of address strings
 * @returns {Promise<Object>} Batch routing data
 */
export async function batchGeocodingAndRouting(addresses) {
  try {
    console.log('🔄 Batch geocoding and routing for', addresses.length, 'addresses');
    
    // Step 1: Geocode all addresses
    const coordinates = await Promise.all(
      addresses.map(address => geocodeForOSRM(address))
    );

    // Step 2: Get distance/duration matrix
    const matrix = await getOSRMMatrix(coordinates);

    // Step 3: Snap coordinates to nearest roads
    const snappedCoordinates = await Promise.all(
      coordinates.map(async (coord) => {
        const nearest = await getOSRMNearest(coord);
        return nearest.success ? nearest.waypoints[0].location : coord;
      })
    );

    return {
      success: true,
      addresses,
      originalCoordinates: coordinates,
      snappedCoordinates,
      distanceMatrix: matrix.distances,
      durationMatrix: matrix.durations,
      matrixSuccess: matrix.success
    };

  } catch (error) {
    console.error('Batch geocoding/routing error:', error);
    throw error;
  }
}

/**
 * Helper function: Calculate Haversine distance as fallback
 * @param {Array} coord1 - [longitude, latitude]
 * @param {Array} coord2 - [longitude, latitude]
 * @returns {number} Distance in meters
 */
function calculateHaversineDistance(coord1, coord2) {
  const R = 6371000; // Earth's radius in meters
  const lat1Rad = coord1[1] * Math.PI / 180;
  const lat2Rad = coord2[1] * Math.PI / 180;
  const deltaLatRad = (coord2[1] - coord1[1]) * Math.PI / 180;
  const deltaLngRad = (coord2[0] - coord1[0]) * Math.PI / 180;

  const a = Math.sin(deltaLatRad/2) * Math.sin(deltaLatRad/2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLngRad/2) * Math.sin(deltaLngRad/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * Create fallback matrix when OSRM is unavailable
 * @param {Array} coordinates - Array of [longitude, latitude] coordinates
 * @returns {Promise<Object>} Fallback matrix
 */
async function createFallbackMatrix(coordinates) {
  const size = coordinates.length;
  const distances = Array(size).fill().map(() => Array(size).fill(0));
  const durations = Array(size).fill().map(() => Array(size).fill(0));

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (i !== j) {
        const distance = calculateHaversineDistance(coordinates[i], coordinates[j]);
        const duration = (distance / 1000) * 60; // Rough estimate: 1 km/min
        
        distances[i][j] = distance;
        durations[i][j] = duration;
      }
    }
  }

  return { distances, durations };
}

/**
 * Validate OSRM server availability
 * @returns {Promise<boolean>} True if OSRM server is available
 */
export async function validateOSRMServer() {
  try {
    // Test with a simple route request
    const testCoords = [
      [6.1286, 43.1205], // Hyères
      [5.9282, 43.1242]  // Toulon
    ];

    const result = await getOSRMRoute(testCoords);
    console.log('✅ OSRM server validation successful');
    return result.success;

  } catch (error) {
    console.warn('⚠️  OSRM server validation failed:', error.message);
    return false;
  }
}

/**
 * OSRM Service Status and Configuration Info
 * @returns {Object} Service configuration and status
 */
export function getOSRMServiceInfo() {
  return {
    service: 'OSRM (Open Source Routing Machine)',
    version: 'v1',
    baseUrl: OSRM_CONFIG.baseUrl,
    profile: OSRM_CONFIG.profile,
    timeout: OSRM_CONFIG.timeout,
    coordinateFormat: OSRM_CONFIG.coordinateFormat,
    features: [
      'Real-world routing data',
      'Traffic-aware routing',
      'Distance/duration matrices',
      'Road network snapping',
      'Multiple routing profiles'
    ],
    limitations: [
      'Requires internet connection (for public server)',
      'Rate limiting on public servers',
      'European focus (for demo server)'
    ]
  };
}

/**
 * OSRM Server Management Utilities
 */

/**
 * Get instructions to start the local OSRM server
 * @returns {Object} Instructions and commands to start OSRM
 */
export function getOSRMStartInstructions() {
  return {
    dataPath: OSRM_CONFIG.dockerConfig.dataPath,
    instructions: [
      '1. Open PowerShell as Administrator',
      '2. Navigate to OSRM data directory:',
      `   cd "${OSRM_CONFIG.dockerConfig.dataPath}"`,
      '3. Start OSRM Docker container:',
      `   ${OSRM_CONFIG.dockerConfig.dockerCommand}`,
      '4. Wait for server to start (should see "running and waiting for requests")',
      '5. Server will be available at http://localhost:5000'
    ],
    dockerCommand: OSRM_CONFIG.dockerConfig.dockerCommand,
    testUrl: `${OSRM_CONFIG.baseUrl}/health`,
    port: OSRM_CONFIG.dockerConfig.port
  };
}

/**
 * Test OSRM server connectivity
 * @returns {Promise<Object>} Server status information
 */
export async function testOSRMConnection() {
  const results = {
    local: { available: false, responseTime: null, error: null },
    fallback: { available: false, responseTime: null, error: null }
  };

  // Test local server
  try {
    const start = Date.now();
    const response = await fetch(`${OSRM_CONFIG.baseUrl}/route/v1/driving/6.1286,43.1205;6.1400,43.1300?overview=false`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    results.local.responseTime = Date.now() - start;
    results.local.available = response.ok;
    if (!response.ok) {
      results.local.error = `HTTP ${response.status}`;
    }
  } catch (error) {
    results.local.error = error.message;
  }

  // Test fallback server
  try {
    const start = Date.now();
    const response = await fetch(`${OSRM_CONFIG.fallbackUrl}/route/v1/driving/6.1286,43.1205;6.1400,43.1300?overview=false`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000)
    });
    results.fallback.responseTime = Date.now() - start;
    results.fallback.available = response.ok;
    if (!response.ok) {
      results.fallback.error = `HTTP ${response.status}`;
    }
  } catch (error) {
    results.fallback.error = error.message;
  }

  return results;
}

/**
 * Get OSRM server status and configuration info
 * @returns {Object} Complete server configuration and status
 */
export function getOSRMStatus() {
  return {
    config: OSRM_CONFIG,
    localServer: {
      url: OSRM_CONFIG.baseUrl,
      dockerPath: OSRM_CONFIG.dockerConfig.dataPath,
      dockerCommand: OSRM_CONFIG.dockerConfig.dockerCommand
    },
    fallbackServer: {
      url: OSRM_CONFIG.fallbackUrl
    },
    instructions: getOSRMStartInstructions()
  };
}

// Export configuration for debugging
export { OSRM_CONFIG };

// Alias for easier import
export const getRoute = getOSRMRoute;
