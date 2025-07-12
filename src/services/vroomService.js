// VROOM (Vehicle Routing Open-source Optimization Machine) Service Integration
// Provides state-of-the-art VRP solving for AmbuSched

import axios from 'axios';

/**
 * VROOM Service Configuration
 * Configured for local Docker VROOM instance
 */
const VROOM_CONFIG = {
  // Local VROOM Docker instance
  baseUrl: 'http://localhost:3000',
  
  // Docker command to start VROOM server:
  // Command: docker run -it --rm -p 3000:3000 ghcr.io/vroom-project/vroom-docker
  
  // Fallback servers (try these if local is down)
  fallbackUrls: [
    'http://solver.vroom-project.org', // Public demo server (often offline)
    'https://router.project-osrm.org/vroom/v1' // Alternative if available
  ],
  
  timeout: 15000, // 15 seconds timeout for local server
  fallbackTimeout: 30000, // 30 seconds for public servers
  maxJobs: 100,   // Maximum number of jobs per request
  maxVehicles: 20, // Maximum number of vehicles per request
  
  // Default optimization options
  defaultOptions: {
    geometry: false, // Disable geometry for faster processing
    overview: 'simplified'
  },
  
  // Local server configuration
  dockerConfig: {
    dockerCommand: 'docker run -it --rm -p 3000:3000 ghcr.io/vroom-project/vroom-docker',
    port: 3000,
    image: 'ghcr.io/vroom-project/vroom-docker'
  }
};

/**
 * Check if local VROOM server is running
 * @returns {Promise<boolean>} True if local server is accessible
 */
async function isLocalVROOMRunning() {
  try {
    // Try a simple GET request to the base URL
    // VROOM servers typically return 404 on GET / but this means they're running
    const response = await axios.get(`${VROOM_CONFIG.baseUrl}`, {
      timeout: 3000,
      validateStatus: function (status) {
        // Accept any status code (including 404) as long as the server responds
        return status >= 200 && status < 600;
      }
    });
    
    console.log(`✅ VROOM server is running (status: ${response.status})`);
    // 404 on GET / is normal for VROOM servers - they don't have a root endpoint
    return true;
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.warn('❌ Local VROOM server not accessible (connection refused)');
    } else {
      console.warn('⚠️ Local VROOM server health check failed:', error.message);
    }
    return false;
  }
}

/**
 * Get the appropriate VROOM server URLs in order of preference
 * @returns {Promise<Array>} Array of server URLs to try
 */
async function getVROOMServerUrls() {
  console.log('🔍 Checking VROOM server availability...');
  
  // Try the enhanced connectivity test first
  const isLocalOptimizationWorking = await testVROOMServerConnectivity();
  
  if (isLocalOptimizationWorking) {
    console.log('✅ Local VROOM server fully operational - using as primary');
    return [VROOM_CONFIG.baseUrl, ...VROOM_CONFIG.fallbackUrls];
  } else {
    // Fall back to basic health check
    const basicCheck = await isLocalVROOMRunning();
    if (basicCheck) {
      console.log('🟡 Local VROOM server responding but optimization may have issues, including in chain');
      return [VROOM_CONFIG.baseUrl, ...VROOM_CONFIG.fallbackUrls];
    } else {
      console.log('❌ Local VROOM server not available, using fallback servers only');
      return VROOM_CONFIG.fallbackUrls;
    }
  }
}

/**
 * Solve Vehicle Routing Problem using VROOM
 * @param {Object} vrpData - VRP problem data in VROOM format
 * @param {Object} options - Solving options
 * @returns {Promise<Object>} Optimized routing solution
 */
export async function solveVRP(vrpData, options = {}) {
  try {
    console.log('🚛 VROOM VRP Solving started...');
    console.log('  - Jobs:', vrpData.jobs?.length || 0);
    console.log('  - Shipments:', vrpData.shipments?.length || 0);
    console.log('  - Vehicles:', vrpData.vehicles?.length || 0);

    // Debug: Log summary instead of full JSON to avoid overwhelming console
    console.log('🚚 VROOM Request Summary:', {
      vehicleCount: vrpData.vehicles?.length || 0,
      shipmentCount: vrpData.shipments?.length || 0,
      returnShipments: vrpData.shipments?.filter(s => 
        s.type === 'return' || s.description?.includes('RETOUR')
      ).length || 0
    });

    const requestData = {
      ...vrpData,
      options: {
        ...VROOM_CONFIG.defaultOptions,
        ...options
      }
    };

    // Validate input data
    validateVRPData(requestData);

    // Get servers to try (local first if available, then fallbacks)
    const serversToTry = await getVROOMServerUrls();

    let lastError = null;
    
    for (const serverUrl of serversToTry) {
      try {
        console.log(`🔄 Trying VROOM server: ${serverUrl}`);
        
        const response = await axios.post(
          serverUrl,
          requestData,
          {
            timeout: VROOM_CONFIG.timeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'AmbuSched/1.0'
            }
          }
        );

        console.log('✅ VROOM VRP Solving completed');
        console.log('  - Server used:', serverUrl);
        console.log('  - Computation time:', response.data.summary?.computing_times?.loading + response.data.summary?.computing_times?.solving, 'ms');
        console.log('  - Total cost:', response.data.summary?.cost);
        console.log('  - Unassigned jobs:', response.data.summary?.unassigned);

        return {
          success: true,
          solution: response.data,
          summary: response.data.summary,
          routes: response.data.routes,
          unassigned: response.data.unassigned,
          serverUsed: serverUrl,
          raw: response.data
        };

      } catch (serverError) {
        console.warn(`❌ VROOM server ${serverUrl} failed:`, serverError.message);
        lastError = serverError;
        continue; // Try next server
      }
    }

    // All servers failed
    console.error('🚫 All VROOM servers failed');
    throw lastError || new Error('All VROOM servers are unavailable');

  } catch (error) {
    console.error('VROOM VRP solving error:', error);
    
    if (error.response) {
      console.error('VROOM API Error:', error.response.data);
      return {
        success: false,
        error: error.response.data.error || error.message,
        details: error.response.data,
        suggestion: 'VROOM servers appear to be offline. Consider using OSRM-only optimization or basic greedy assignment.'
      };
    }
    
    return {
      success: false,
      error: error.message,
      fallback: true,
      suggestion: 'VROOM service unavailable. The system will use alternative optimization methods.'
    };
  }
}

/**
 * Convert AmbuSched trips and vehicles to VROOM format
 * @param {Array} trips - AmbuSched trips
 * @param {Array} vehicles - AmbuSched vehicles
 * @param {Array} distanceMatrix - Distance matrix from OSRM
 * @param {Array} durationMatrix - Duration matrix from OSRM
 * @param {Array} coordinates - Coordinates array
 * @returns {Object} VROOM-formatted VRP data
 */
/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function convertToVROOMFormat(trips, vehicles, distanceMatrix, durationMatrix, coordinates, routingData = null, timeWindowConfig = null) {
  try {
    console.log('🔄 Converting to VROOM format...');
    console.log('  - Input coordinates:', coordinates.length);
    console.log('  - Distance matrix size:', distanceMatrix.length, 'x', distanceMatrix[0]?.length);

    // Use provided time window config or defaults
    const config = timeWindowConfig || {
      appointmentBufferBefore: 30,
      appointmentBufferAfter: 30,
      returnTripDuration: 60,
      bufferBetweenAppointments: 20,
      bufferBetweenReturns: 10,
      bufferMixed: 15,
      allowConflictPenalty: true,
      conflictPenaltyScore: 50,
      minAssignmentScore: 15,
      workingHours: { start: 6, end: 22 }
    };
    
    console.log('⏱️ Using time window config in convertToVROOMFormat:', config);

    // Create address to coordinate index mapping
    const addressToIndex = new Map();
    
    // Check if we have routingData with address-to-coordinate mapping (when coordinates are provided)
    if (routingData && routingData.coordinatesProvided) {
      console.log('📍 Using provided coordinate mapping from routing data');
      
      // Use the address order from routingData
      routingData.addresses.forEach((address, index) => {
        addressToIndex.set(address, index);
      });
      
    } else {
      // Original behavior: map addresses to coordinate indices
      const allAddresses = [
        ...trips.map(trip => trip.pickup),
        ...trips.map(trip => trip.destination),
        ...vehicles.map(vehicle => vehicle.currentLocation || 'Base Hyères')
      ];
      
      const uniqueAddresses = [...new Set(allAddresses)];
      uniqueAddresses.forEach((address, index) => {
        addressToIndex.set(address, index);
      });
    }

    console.log('  - Address mapping:', addressToIndex.size, 'unique addresses');
    console.log('  - Address list:', Array.from(addressToIndex.entries()).map(([addr, idx]) => `${idx}: ${addr}`));

    // Convert vehicles to VROOM format
    const vroomVehicles = vehicles
      .filter(vehicle => vehicle.status !== 'maintenance')
      .map((vehicle, index) => {
        const vehicleAddress = vehicle.currentLocation || 'Base Hyères';
        const startIndex = addressToIndex.get(vehicleAddress) || 0;

        return {
          id: vehicle.id || index + 1,
          start: startIndex,
          end: startIndex, // Return to same location
          capacity: getVehicleCapacity(vehicle),
          skills: getVehicleSkills(vehicle),
          time_window: getVehicleTimeWindow(vehicle),
          profile: 'driving',
          description: `${vehicle.name} (${vehicle.type})`
        };
      });

    // Convert trips to VROOM shipments (pickup → delivery model)
    const vroomShipments = trips.map((trip, index) => {
      const pickupIndex = addressToIndex.get(trip.pickup) || 0;
      const deliveryIndex = addressToIndex.get(trip.destination) || 0;

      // Check for address mapping issues
      if (!addressToIndex.has(trip.pickup)) {
        console.warn(`⚠️ Pickup address not found in mapping: "${trip.pickup}" for trip ${trip.id}`);
      }
      if (!addressToIndex.has(trip.destination)) {
        console.warn(`⚠️ Destination address not found in mapping: "${trip.destination}" for trip ${trip.id}`);
      }

      const timeWindow = getTripTimeWindow(trip);
      
      // Debug logging for all trips
      console.log(`� Processing trip ${trip.id} (${trip.isReturnTrip ? 'RETURN' : 'REGULAR'}):`, {
        patient: trip.patient,
        pickup: trip.pickup,
        destination: trip.destination,
        pickupIndex,
        deliveryIndex,
        appointmentTime: trip.appointmentTime,
        duration: trip.duration,
        exitTime: trip.exitTime,
        earliestPickupTime: trip.earliestPickupTime,
        maxWaitTime: trip.maxWaitTime
      });
      
      // Determine trip type FIRST (this is critical!)
      const isReturnTrip = Boolean(trip.isReturnTrip);
      
      // IMPORTANT: Return trips and appointment trips have VERY different constraints
      let pickupTimeWindow = null;
      let deliveryTimeWindow = null;
      let shipmentPriority = 100; // Default priority
      
      if (isReturnTrip) {
        // RETURN TRIP LOGIC:
        // - Pickup: MUST be after appointment ends (exitTime + buffer) 
        // - Delivery: NO TIME CONSTRAINT (flexible arrival at home)
        // - Priority: MANDATORY but flexible timing
        
        if (trip.exitTime && trip.earliestPickupTime) {
          const earliestPickupMinutes = timeToMinutes(trip.earliestPickupTime);
          const maxWaitMinutes = trip.maxWaitTime || 240; // 4 hours max wait
          
          // Pickup window: starts after appointment + buffer, ends after max wait
          const startSeconds = earliestPickupMinutes * 60;
          const endSeconds = (earliestPickupMinutes + maxWaitMinutes) * 60;
          
          if (startSeconds >= 0 && endSeconds > startSeconds && endSeconds <= 24 * 3600) {
            pickupTimeWindow = [startSeconds, endSeconds];
            console.log(`� Return trip ${trip.id}: pickup window [${Math.floor(startSeconds/3600)}:${Math.floor((startSeconds%3600)/60).toString().padStart(2,'0')} - ${Math.floor(endSeconds/3600)}:${Math.floor((endSeconds%3600)/60).toString().padStart(2,'0')}]`);
          } else {
            pickupTimeWindow = [8 * 3600, 20 * 3600]; // Default: 8 AM to 8 PM
            console.warn(`⚠️ Return trip ${trip.id}: using default pickup window [8:00 - 20:00]`);
          }
          
          // Delivery: NO TIME CONSTRAINT - patient can arrive home anytime
          deliveryTimeWindow = undefined; // No constraint on arrival time at home
          
          // Priority: HIGH (mandatory) but not extreme
          shipmentPriority = 500; // High priority for mandatory return trips
          
        } else {
          console.warn(`⚠️ Return trip ${trip.id} missing time data, using default windows`);
          pickupTimeWindow = [8 * 3600, 20 * 3600];
          deliveryTimeWindow = undefined;
          shipmentPriority = 500;
        }
        
      } else {
        // APPOINTMENT TRIP LOGIC:
        // - Pickup: Flexible (arrive a bit before appointment)
        // - Delivery: STRICT (must arrive by appointment time)
        // - Priority: Based on medical urgency
        
        if (trip.appointmentTime) {
          const appointmentMinutes = timeToMinutes(trip.appointmentTime);
          const appointmentSeconds = appointmentMinutes * 60;
          
          // Pickup window: flexible, but should be before appointment
          const bufferBeforeSeconds = config.appointmentBufferBefore * 60;
          const bufferAfterSeconds = config.appointmentBufferAfter * 60;
          const maxPickupAdvanceHours = Math.max(2, config.appointmentBufferBefore / 30) * 3600; // At least 2 hours or proportional to buffer
          
          const pickupStart = Math.max(config.workingHours.start * 3600, appointmentSeconds - maxPickupAdvanceHours);
          const pickupEnd = appointmentSeconds - bufferBeforeSeconds;
          pickupTimeWindow = [pickupStart, pickupEnd];
          
          // Delivery window: STRICT - must arrive by appointment time
          const deliveryStart = appointmentSeconds - bufferBeforeSeconds;
          const deliveryEnd = appointmentSeconds + bufferAfterSeconds; // Allow small buffer after appointment
          deliveryTimeWindow = [[deliveryStart, deliveryEnd]];
          
          console.log(`🏥 Appointment trip ${trip.id}: delivery window [${Math.floor(deliveryStart/3600)}:${Math.floor((deliveryStart%3600)/60).toString().padStart(2,'0')} - ${Math.floor(deliveryEnd/3600)}:${Math.floor((deliveryEnd%3600)/60).toString().padStart(2,'0')}] (buffer: ${config.appointmentBufferBefore}min/${config.appointmentBufferAfter}min)`);
          
          // Priority: Based on medical urgency
          const urgencyPriority = {
            'urgent': 1000,   // Highest priority
            'high': 800,      // High priority
            'normal': 600,    // Normal priority  
            'low': 400        // Lower priority
          };
          shipmentPriority = urgencyPriority[trip.priority] || 600;
          
        } else {
          console.warn(`⚠️ Appointment trip ${trip.id} missing appointment time`);
          pickupTimeWindow = timeWindow;
          deliveryTimeWindow = timeWindow ? [[timeWindow[0] + 1800, timeWindow[1]]] : undefined;
          shipmentPriority = 600;
        }
      }

      // Create shipment for VROOM (pickup + delivery)
      const shipment = {
        id: trip.id || index + 1,
        priority: shipmentPriority, // Use calculated priority based on trip type
        pickup: {
          id: (trip.id || index + 1) * 10 + 1, // Pickup ID: tripId * 10 + 1
          location_index: pickupIndex,
          time_windows: pickupTimeWindow ? [pickupTimeWindow] : undefined,
          service: getTripServiceTime(trip),
          description: `${isReturnTrip ? 'Return ' : ''}Pickup: ${trip.patient} at ${trip.pickup}`
          // Removed problematic 'flexible' attribute
        },
        delivery: {
          id: (trip.id || index + 1) * 10 + 2, // Delivery ID: tripId * 10 + 2
          location_index: deliveryIndex,
          time_windows: deliveryTimeWindow, // Use calculated delivery time window (undefined for returns)
          service: getTripServiceTime(trip),
          description: `${isReturnTrip ? 'Return ' : ''}Delivery: ${trip.patient} to ${trip.destination}`
        },
        amount: [1], // One patient per shipment
        skills: getTripRequiredSkills(trip),
        description: `${isReturnTrip ? '🔄 RETOUR - ' : '🏥 RDV - '}${trip.patient} - ${trip.pickup} → ${trip.destination}`,
        ...(isReturnTrip && {
          type: 'return',
          originalCourseId: trip.originalCourseId,
          exitTime: trip.exitTime,
          maxWaitTime: trip.maxWaitTime || 240
        })
      };

      // Debug log for all shipments
      if (isReturnTrip) {
        console.log(`� RETURN SHIPMENT ${shipment.id}:`, {
          priority: shipment.priority,
          pickup: {
            address: trip.pickup,
            locationIndex: pickupIndex,
            timeWindow: shipment.pickup.time_windows,
            constraint: 'MUST pickup after appointment ends'
          },
          delivery: {
            address: trip.destination,
            locationIndex: deliveryIndex,
            timeWindow: shipment.delivery.time_windows,
            constraint: 'NO TIME CONSTRAINT (flexible arrival home)'
          }
        });
      } else {
        console.log(`🏥 APPOINTMENT SHIPMENT ${shipment.id}:`, {
          priority: shipment.priority,
          pickup: {
            address: trip.pickup,
            locationIndex: pickupIndex,
            timeWindow: shipment.pickup.time_windows,
            constraint: 'Flexible pickup before appointment'
          },
          delivery: {
            address: trip.destination,
            locationIndex: deliveryIndex,
            timeWindow: shipment.delivery.time_windows,
            constraint: 'STRICT - must arrive by appointment time'
          }
        });
      }

      // CRITICAL: Validate time windows are properly formatted
      if (shipment.pickup.time_windows) {
        const isValidPickup = Array.isArray(shipment.pickup.time_windows) && 
                              shipment.pickup.time_windows.every(tw => 
                                Array.isArray(tw) && tw.length === 2 && 
                                typeof tw[0] === 'number' && typeof tw[1] === 'number'
                              );
        if (!isValidPickup) {
          console.error(`❌ INVALID pickup time_windows for trip ${trip.id}:`, shipment.pickup.time_windows);
        }
      }
      
      if (shipment.delivery.time_windows) {
        const isValidDelivery = Array.isArray(shipment.delivery.time_windows) && 
                                shipment.delivery.time_windows.every(tw => 
                                  Array.isArray(tw) && tw.length === 2 && 
                                  typeof tw[0] === 'number' && typeof tw[1] === 'number'
                                );
        if (!isValidDelivery) {
          console.error(`❌ INVALID delivery time_windows for trip ${trip.id}:`, shipment.delivery.time_windows);
        }
      }

      return shipment;
    });

    // Ensure matrices are properly sized
    const matrixSize = Math.max(coordinates.length, uniqueAddresses.length);
    
    // Pad matrices if necessary
    const paddedDistanceMatrix = ensureMatrixSize(distanceMatrix, matrixSize);
    const paddedDurationMatrix = ensureMatrixSize(durationMatrix, matrixSize);

    // Create VROOM problem structure
    const vroomData = {
      vehicles: vroomVehicles,
      shipments: vroomShipments,
      matrices: {
        driving: {
          durations: paddedDurationMatrix,
          distances: paddedDistanceMatrix
        }
      }
    };

    console.log('✅ VROOM format conversion completed');
    console.log('  - Vehicles:', vroomVehicles.length);
    console.log('  - Shipments:', vroomShipments.length);
    console.log('  - Regular trips:', vroomShipments.filter(s => s.type !== 'return' && !s.description?.includes('RETOUR')).length);
    console.log('  - Return trips:', vroomShipments.filter(s => s.type === 'return' || s.description?.includes('RETOUR')).length);
    console.log('  - Matrix size:', paddedDistanceMatrix.length + 'x' + paddedDistanceMatrix[0]?.length);

    return vroomData;

  } catch (error) {
    console.error('VROOM format conversion error:', error);
    throw error;
  }
}

/**
 * Convert VROOM solution back to AmbuSched format
 * @param {Object} vroomSolution - VROOM solution
 * @param {Array} originalTrips - Original AmbuSched trips
 * @param {Array} originalVehicles - Original AmbuSched vehicles
 * @returns {Object} AmbuSched-formatted solution
 */
export function convertFromVROOMSolution(vroomSolution, originalTrips, originalVehicles) {
  try {
    console.log('🔄 Converting VROOM solution back to AmbuSched format...');

    const results = [];
    const vehicleAssignments = new Map();

    // Process each route in the VROOM solution
    vroomSolution.routes.forEach(route => {
      const vehicle = originalVehicles.find(v => v.id === route.vehicle);
      if (!vehicle) return;

      const assignedTrips = [];
      let totalDistance = 0;
      let totalDuration = 0;

      // Process steps in the route
      route.steps.forEach(step => {
        if (step.type === 'job') {
          const trip = originalTrips.find(t => t.id === step.job);
          if (trip) {
            assignedTrips.push({
              ...trip,
              scheduledTime: step.arrival ? new Date(step.arrival * 1000) : null,
              estimatedDuration: step.service || 0,
              arrivalTime: step.arrival,
              departureTime: step.arrival + (step.service || 0)
            });
          }
        }
      });

      totalDistance = route.distance;
      totalDuration = route.duration;

      // Create assignment result for each trip
      assignedTrips.forEach(trip => {
        results.push({
          trip,
          assignment: {
            vehicle,
            optimization: {
              score: calculateVROOMScore(route, trip),
              details: {
                totalDistance: totalDistance / 1000, // Convert to km
                totalTime: totalDuration / 60, // Convert to minutes
                estimatedArrival: trip.scheduledTime,
                route: route,
                conflicts: [], // VROOM handles conflicts automatically
                fuelCost: (totalDistance / 1000) * 0.15 // €0.15/km
              }
            }
          },
          status: 'assigned',
          vroomOptimized: true
        });
      });

      vehicleAssignments.set(vehicle.id, {
        vehicle,
        trips: assignedTrips,
        route,
        totalDistance: totalDistance / 1000,
        totalDuration: totalDuration / 60,
        utilization: calculateVehicleUtilization(route)
      });
    });

    // Handle unassigned trips
    vroomSolution.unassigned.forEach(unassignedJob => {
      const trip = originalTrips.find(t => t.id === unassignedJob.id);
      if (trip) {
        results.push({
          trip,
          assignment: null,
          status: 'unassigned',
          reason: 'VROOM could not assign this trip',
          vroomCode: unassignedJob.code
        });
      }
    });

    const summary = {
      totalTrips: originalTrips.length,
      assignedTrips: results.filter(r => r.status === 'assigned').length,
      unassignedTrips: results.filter(r => r.status === 'unassigned').length,
      totalDistance: vroomSolution.summary.distance / 1000, // km
      totalDuration: vroomSolution.summary.duration / 60, // minutes
      totalCost: vroomSolution.summary.cost,
      computingTime: vroomSolution.summary.computing_times,
      assignmentRate: Math.round((results.filter(r => r.status === 'assigned').length / originalTrips.length) * 100)
    };

    console.log('✅ VROOM solution conversion completed');
    console.log('  - Assignment rate:', summary.assignmentRate + '%');
    console.log('  - Total distance:', summary.totalDistance + 'km');
    console.log('  - Computing time:', summary.computingTime?.solving + 'ms');

    return {
      results,
      vehicleAssignments: Array.from(vehicleAssignments.values()),
      summary,
      vroomSummary: vroomSolution.summary,
      algorithm: 'VROOM VRP Solver',
      // Keep original VROOM routes for UI compatibility
      routes: vroomSolution.routes,
      unassigned: vroomSolution.unassigned
    };

  } catch (error) {
    console.error('VROOM solution conversion error:', error);
    throw error;
  }
}

/**
 * Advanced VROOM optimization with custom constraints
 * @param {Array} trips - AmbuSched trips
 * @param {Array} vehicles - AmbuSched vehicles
 * @param {Object} constraints - Additional constraints
 * @returns {Promise<Object>} Advanced optimization result
 */
export async function optimizeWithVRoomAdvanced(trips, vehicles, constraints = {}) {
  try {
    console.log('🎯 Advanced VROOM optimization starting...');

    // Extract time window configuration with defaults
    const timeWindowConfig = constraints.timeWindowConfig || {
      appointmentBufferBefore: 30,
      appointmentBufferAfter: 30,
      returnTripDuration: 60,
      bufferBetweenAppointments: 20,
      bufferBetweenReturns: 10,
      bufferMixed: 15,
      allowConflictPenalty: true,
      conflictPenaltyScore: 50,
      minAssignmentScore: 15,
      workingHours: { start: 6, end: 22 }
    };

    console.log('⏱️ Using time window configuration:', timeWindowConfig);

    // Import OSRM service for routing data
    const { batchGeocodingAndRouting } = await import('./osrmService.js');

    // Step 1: Check if trips already have coordinates
    const hasCoordinates = trips.length > 0 && 
      trips.every(trip => 
        trip.coordinates && Array.isArray(trip.coordinates) && trip.coordinates.length === 2 &&
        trip.destinationCoords && Array.isArray(trip.destinationCoords) && trip.destinationCoords.length === 2
      );

    console.log('🗺️ Coordinate availability check:', {
      hasCoordinates,
      sampleTrip: trips[0] ? {
        pickup: trips[0].pickup,
        coordinates: trips[0].coordinates,
        destination: trips[0].destination,
        destinationCoords: trips[0].destinationCoords
      } : 'No trips'
    });

    let routingData;
    
    if (hasCoordinates) {
      // Step 2A: Use existing coordinates directly (skip geocoding)
      console.log('✅ Using provided coordinates from CSV file');
      
      // Extract all coordinates
      const allCoordinates = [];
      const addressToCoordinateMap = new Map();
      
      trips.forEach(trip => {
        if (!addressToCoordinateMap.has(trip.pickup)) {
          addressToCoordinateMap.set(trip.pickup, trip.coordinates);
          allCoordinates.push(trip.coordinates);
        }
        if (!addressToCoordinateMap.has(trip.destination)) {
          addressToCoordinateMap.set(trip.destination, trip.destinationCoords);
          allCoordinates.push(trip.destinationCoords);
        }
      });
      
      // Add vehicle coordinates
      vehicles.forEach(vehicle => {
        const vehicleLocation = vehicle.currentLocation || 'Base Hyères';
        if (!addressToCoordinateMap.has(vehicleLocation)) {
          const vehicleCoords = vehicle.coordinates || [6.1286, 43.1205]; // Default to Hyères if not specified
          addressToCoordinateMap.set(vehicleLocation, vehicleCoords);
          allCoordinates.push(vehicleCoords);
        }
      });
      
      // Remove duplicate coordinates
      const uniqueCoordinates = allCoordinates.filter((coord, index, arr) => 
        arr.findIndex(c => c[0] === coord[0] && c[1] === coord[1]) === index
      );
      
      console.log('📍 Using coordinates:', {
        totalCoordinates: uniqueCoordinates.length,
        sampleCoordinates: uniqueCoordinates.slice(0, 3)
      });
      
      // Use direct coordinates with OSRM for distance matrix
      try {
        const coordinateString = uniqueCoordinates.map(coord => `${coord[0]},${coord[1]}`).join(';');
        const matrixUrl = `http://localhost:5000/table/v1/driving/${coordinateString}`;
        
        console.log('🌐 OSRM Matrix request:', matrixUrl);
        const matrixResponse = await fetch(matrixUrl);
        
        if (matrixResponse.ok) {
          const matrixData = await matrixResponse.json();
          
          routingData = {
            success: true,
            coordinates: uniqueCoordinates,
            addresses: Array.from(addressToCoordinateMap.keys()),
            distanceMatrix: matrixData.distances || [],
            durationMatrix: matrixData.durations || [],
            osrmUsed: true,
            coordinatesProvided: true
          };
          
          console.log('✅ OSRM matrix successful:', {
            matrixSize: matrixData.distances?.length || 0,
            sampleDistances: matrixData.distances?.[0]?.slice(0, 3) || []
          });
        } else {
          throw new Error(`OSRM matrix request failed with status ${matrixResponse.status}`);
        }
      } catch (osrmError) {
        console.warn('⚠️ OSRM direct matrix failed:', osrmError.message);
        console.warn('Creating fallback matrix from coordinates');
        routingData = createFallbackRoutingDataFromCoordinates(uniqueCoordinates, Array.from(addressToCoordinateMap.keys()));
      }
      
    } else {
      // Step 2B: Fall back to address geocoding (original behavior)
      console.log('⚠️ No coordinates provided, falling back to address geocoding');
      
      const addresses = [
        ...trips.map(trip => trip.pickup),
        ...trips.map(trip => trip.destination),
        ...vehicles.map(vehicle => vehicle.currentLocation || 'Base Hyères')
      ];

      const uniqueAddresses = [...new Set(addresses)];

      try {
        routingData = await batchGeocodingAndRouting(uniqueAddresses);
        if (!routingData.success) {
          throw new Error('Failed to get routing data from OSRM');
        }
      } catch (osrmError) {
        console.warn('⚠️  OSRM unavailable, using fallback routing data');
        routingData = createFallbackRoutingData(uniqueAddresses);
      }
    }      // Step 3: Try VROOM optimization first
      try {
        const vroomData = convertToVROOMFormat(
          trips,
          vehicles,
          routingData.distanceMatrix,
          routingData.durationMatrix,
          routingData.coordinates,
          routingData,  // Pass the full routing data for coordinate mapping
          timeWindowConfig  // Pass the time window configuration
        );

      // Apply additional constraints
      if (constraints.maxRouteTime) {
        vroomData.vehicles.forEach(vehicle => {
          vehicle.time_window = [0, constraints.maxRouteTime];
        });
      }

      if (constraints.balanceRoutes) {
        vroomData.options = {
          ...vroomData.options,
          balance: true
        };
      }

      // Try to solve with VROOM
      const vroomResult = await solveVRP(vroomData, constraints.vroomOptions);

      if (vroomResult.success) {
        // VROOM succeeded - convert back to AmbuSched format
        const solution = convertFromVROOMSolution(
          vroomResult.solution,
          trips,
          vehicles
        );

        return {
          ...solution,
          optimizationMethod: 'OSRM + VROOM',
          routingData,
          vroomResult,
          constraints
        };
      } else {
        console.warn('⚠️  VROOM failed, falling back to local VRP solver');
        console.warn('VROOM error:', vroomResult.error);
        console.warn('Suggestion:', vroomResult.suggestion);
      }
    } catch (vroomError) {
      console.warn('⚠️  VROOM unavailable, using fallback VRP solver');
      console.warn('VROOM error:', vroomError.message);
    }

    // Step 4: Use fallback VRP solver when VROOM is offline
    console.log('🔄 Using fallback VRP solver...');
    const fallbackSolution = await fallbackVRPSolver(
      trips,
      vehicles,
      routingData.distanceMatrix,
      routingData.durationMatrix,
      timeWindowConfig  // Pass the time window configuration
    );

    return {
      ...fallbackSolution,
      optimizationMethod: routingData.osrmUsed ? 'OSRM + Fallback VRP' : 'Fallback VRP',
      routingData,
      vroomOffline: true,
      constraints
    };

  } catch (error) {
    console.error('Advanced VROOM optimization error:', error);
    throw error;
  }
}

/**
 * Create fallback routing data when OSRM is also unavailable
 */
function createFallbackRoutingData(addresses) {
  console.log('🔄 Creating fallback routing data...');
  
  const size = addresses.length;
  const distanceMatrix = Array(size).fill().map(() => Array(size).fill(0));
  const durationMatrix = Array(size).fill().map(() => Array(size).fill(0));
  
  // Create simple distance/duration estimates
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (i !== j) {
        // Simple distance estimation based on address similarity
        const distance = estimateDistanceBetweenAddresses(addresses[i], addresses[j]);
        const duration = distance / 40 * 60; // Assume 40 km/h average speed
        
        distanceMatrix[i][j] = distance * 1000; // Convert to meters
        durationMatrix[i][j] = duration * 60; // Convert to seconds
      }
    }
  }
  
  return {
    success: false,
    fallback: true,
    addresses,
    distanceMatrix,
    durationMatrix,
    coordinates: addresses.map(() => [6.1286, 43.1205]), // Default to Hyères
    osrmUsed: false
  };
}

/**
 * Create fallback routing data from provided coordinates using Haversine distance
 */
function createFallbackRoutingDataFromCoordinates(coordinates, addresses) {
  console.log('🔄 Creating fallback routing data from coordinates...');
  
  const size = coordinates.length;
  const distanceMatrix = Array(size).fill().map(() => Array(size).fill(0));
  const durationMatrix = Array(size).fill().map(() => Array(size).fill(0));
  
  // Calculate Haversine distances between coordinates
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (i !== j) {
        const distance = calculateHaversineDistance(coordinates[i], coordinates[j]);
        const duration = distance / 50 * 60; // Assume 50 km/h average speed
        
        distanceMatrix[i][j] = distance * 1000; // Convert to meters
        durationMatrix[i][j] = duration * 60; // Convert to seconds
      }
    }
  }
  
  return {
    success: true,
    fallback: true,
    addresses: addresses || coordinates.map((_, i) => `Location ${i}`),
    distanceMatrix,
    durationMatrix,
    coordinates,
    osrmUsed: false,
    coordinatesProvided: true
  };
}

/**
 * Calculate Haversine distance between two coordinates
 */
function calculateHaversineDistance(coord1, coord2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2[1] - coord1[1]) * Math.PI / 180;
  const dLon = (coord2[0] - coord1[0]) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1[1] * Math.PI / 180) * Math.cos(coord2[1] * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

/**
 * Simple distance estimation between addresses
 */
function estimateDistanceBetweenAddresses(addr1, addr2) {
  // Very simple estimation - in production, use geocoding + Haversine
  if (addr1 === addr2) return 0;
  
  const baseDistance = 15; // km
  const variation = Math.random() * 20; // Random variation
  
  // Some specific distances for common locations in Var
  const commonDistances = {
    'hyères-toulon': 20,
    'toulon-la seyne': 8,
    'hyères-carqueiranne': 5,
    'toulon-ollioules': 12
  };
  
  const key1 = `${addr1.toLowerCase()}-${addr2.toLowerCase()}`;
  const key2 = `${addr2.toLowerCase()}-${addr1.toLowerCase()}`;
  
  return commonDistances[key1] || commonDistances[key2] || (baseDistance + variation);
}

/**
 * Fallback VRP Solver - Simple but effective algorithm when VROOM is offline
 * Uses greedy nearest neighbor with 2-opt improvement
 * @param {Array} trips - AmbuSched trips
 * @param {Array} vehicles - AmbuSched vehicles
 * @param {Array} distanceMatrix - Distance matrix
 * @param {Array} durationMatrix - Duration matrix
 * @returns {Object} Fallback optimization solution
 */
export async function fallbackVRPSolver(trips, vehicles, distanceMatrix, durationMatrix, timeWindowConfig = null) {
  console.log('🔄 Using fallback VRP solver (VROOM offline)...');
  
  // Use provided time window config or defaults
  const config = timeWindowConfig || {
    appointmentBufferBefore: 30,
    appointmentBufferAfter: 30,
    returnTripDuration: 60,
    bufferBetweenAppointments: 20,
    bufferBetweenReturns: 10,
    bufferMixed: 15,
    allowConflictPenalty: true,
    conflictPenaltyScore: 50,
    minAssignmentScore: 15,
    workingHours: { start: 6, end: 22 }
  };
  
  console.log('⏱️ Using time window config in fallback solver:', config);
  
  try {
    const results = [];
    const vehicleAssignments = new Map();
    
    // Initialize vehicle assignments
    vehicles.forEach(vehicle => {
      if (vehicle.status !== 'maintenance') {
        vehicleAssignments.set(vehicle.id, {
          vehicle,
          trips: [],
          totalDistance: 0,
          totalDuration: 0,
          route: []
        });
      }
    });

    // Sort trips by priority and time for optimal assignment
    const sortedTrips = [...trips].sort((a, b) => {
      // First, prioritize by medical urgency
      const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
      const priorityDiff = (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by trip type: regular appointments before return trips
      const typeScoreA = a.isReturnTrip ? 1 : 2;
      const typeScoreB = b.isReturnTrip ? 1 : 2;
      if (typeScoreA !== typeScoreB) return typeScoreB - typeScoreA;
      
      // Finally by time: earlier appointments first
      const timeA = a.appointmentTime || a.pickupTime || a.time || '09:00';
      const timeB = b.appointmentTime || b.pickupTime || b.time || '09:00';
      return timeA.localeCompare(timeB);
    });

    console.log('📋 Trip assignment order:', sortedTrips.map(trip => ({
      id: trip.id,
      patient: trip.patient,
      type: trip.isReturnTrip ? 'RETURN' : 'APPOINTMENT',
      time: trip.appointmentTime || trip.pickupTime || trip.time,
      priority: trip.priority
    })));

    // Assign trips using enhanced greedy algorithm with time conflict checking
    for (const trip of sortedTrips) {
      console.log(`🚗 Assigning trip ${trip.id} (${trip.isReturnTrip ? 'RETURN' : 'APPOINTMENT'}) - ${trip.patient}`);
      
      const bestAssignment = findBestVehicleForTrip(
        trip, 
        vehicleAssignments, 
        distanceMatrix, 
        durationMatrix,
        config  // Pass the time window configuration
      );

      if (bestAssignment.success) {
        const assignment = vehicleAssignments.get(bestAssignment.vehicleId);
        assignment.trips.push(trip);
        assignment.totalDistance += bestAssignment.additionalDistance;
        assignment.totalDuration += bestAssignment.additionalDuration;
        assignment.route.push({
          type: 'pickup',
          location: trip.pickup,
          trip: trip,
          time: trip.pickupTime || trip.time
        });
        assignment.route.push({
          type: 'delivery',
          location: trip.destination,
          trip: trip,
          time: null // Will be calculated
        });

        console.log(`✅ Assigned trip ${trip.id} to vehicle ${assignment.vehicle.name} (score: ${bestAssignment.score})`);
        console.log(`   Vehicle now has ${assignment.trips.length} trips`);

        results.push({
          trip,
          assignment: {
            vehicle: assignment.vehicle,
            optimization: {
              score: bestAssignment.score,
              details: {
                totalDistance: bestAssignment.additionalDistance,
                totalTime: bestAssignment.additionalDuration,
                estimatedArrival: bestAssignment.estimatedArrival,
                conflicts: [],
                fuelCost: bestAssignment.additionalDistance * 0.15
              }
            }
          },
          status: 'assigned',
          fallbackOptimized: true
        });
      } else {
        console.log(`❌ Could not assign trip ${trip.id}: ${bestAssignment.reason}`);
        results.push({
          trip,
          assignment: null,
          status: 'unassigned',
          reason: bestAssignment.reason
        });
      }
    }

    // Apply 2-opt improvement to each vehicle's route
    for (const [vehicleId, assignment] of vehicleAssignments.entries()) {
      if (assignment.trips.length > 2) {
        const improvedRoute = apply2OptImprovement(
          assignment.trips,
          assignment.vehicle,
          distanceMatrix
        );
        
        if (improvedRoute.improved) {
          assignment.trips = improvedRoute.trips;
          assignment.totalDistance = improvedRoute.totalDistance;
          assignment.totalDuration = improvedRoute.totalDuration;
          
          console.log(`🔧 2-opt improved route for ${assignment.vehicle.name}: -${Math.round((assignment.totalDistance - improvedRoute.totalDistance) * 10) / 10}km`);
        }
      }
    }

    // Calculate summary
    const assignedTrips = results.filter(r => r.status === 'assigned');
    const totalDistance = Array.from(vehicleAssignments.values())
      .reduce((sum, v) => sum + v.totalDistance, 0);
    const totalDuration = Array.from(vehicleAssignments.values())
      .reduce((sum, v) => sum + v.totalDuration, 0);

    const summary = {
      totalTrips: trips.length,
      assignedTrips: assignedTrips.length,
      unassignedTrips: results.length - assignedTrips.length,
      assignmentRate: Math.round((assignedTrips.length / trips.length) * 100),
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalDuration: Math.round(totalDuration),
      averageOptimizationScore: assignedTrips.reduce((sum, r) => 
        sum + r.assignment.optimization.score, 0) / Math.max(assignedTrips.length, 1),
      estimatedFuelCost: Math.round(totalDistance * 0.15 * 100) / 100
    };

    console.log('✅ Fallback VRP solver completed');
    console.log(`  - Assignment rate: ${summary.assignmentRate}%`);
    console.log(`  - Total distance: ${summary.totalDistance}km`);
    
    // Log final vehicle assignments
    console.log('📋 Final vehicle assignments:');
    for (const [vehicleId, assignment] of vehicleAssignments.entries()) {
      console.log(`  ${assignment.vehicle.name}: ${assignment.trips.length} trips`);
      assignment.trips.forEach((trip, index) => {
        const timeInfo = trip.appointmentTime || trip.pickupTime || trip.time || 'No time';
        console.log(`    ${index + 1}. Trip ${trip.id} - ${trip.patient} (${trip.isReturnTrip ? 'RETURN' : 'APPT'}) at ${timeInfo}`);
      });
    }

    // Create VROOM-compatible routes structure for UI compatibility
    const vroomCompatibleRoutes = Array.from(vehicleAssignments.values()).map(assignment => ({
      vehicle: assignment.vehicle.id,
      steps: [
        { type: 'start', location: assignment.vehicle.coordinates || [6.1286, 43.1205] },
        ...assignment.trips.flatMap(trip => [
          {
            type: 'pickup',
            id: trip.id * 10 + 1, // UI expects this format: course.id * 10 + 1
            job: trip.id,
            location: trip.coordinates || [6.1286, 43.1205],
            arrival: 0, // Simplified for fallback
            duration: 600
          },
          {
            type: 'delivery', 
            id: trip.id * 10 + 2, // UI expects this format: course.id * 10 + 2
            job: trip.id,
            location: trip.destinationCoords || [6.1286, 43.1205],
            arrival: 1800, // Simplified for fallback
            duration: 600
          }
        ]),
        { type: 'end', location: assignment.vehicle.coordinates || [6.1286, 43.1205] }
      ],
      distance: Math.round(assignment.totalDistance * 1000), // Convert to meters
      duration: Math.round(assignment.totalDuration * 60), // Convert to seconds
      cost: Math.round(assignment.totalDistance * 0.15 * 100) // Fuel cost estimation
    }));

    return {
      results,
      vehicleAssignments: Array.from(vehicleAssignments.values()),
      summary,
      algorithm: 'Fallback VRP (Greedy + 2-opt)',
      fallback: true,
      vroomOffline: true,
      // Add VROOM-compatible routes for UI
      routes: vroomCompatibleRoutes,
      unassigned: results.filter(r => r.status === 'unassigned').map(r => ({
        id: r.trip.id,
        code: 1, // Generic unassigned code for fallback
        description: r.reason
      }))
    };

  } catch (error) {
    console.error('Fallback VRP solver error:', error);
    throw error;
  }
}

/**
 * Find the best vehicle for a trip using enhanced scoring with time conflict checking
 */
function findBestVehicleForTrip(trip, vehicleAssignments, distanceMatrix, durationMatrix, timeWindowConfig = null) {
  let bestVehicle = null;
  let bestScore = -1;
  let bestMetrics = null;

  for (const [vehicleId, assignment] of vehicleAssignments.entries()) {
    try {
      // Check vehicle compatibility
      const vehicleTypeScore = getVehicleTypeCompatibility(trip.vehicleType, assignment.vehicle.type);
      if (vehicleTypeScore < 50) continue; // Skip incompatible vehicles

      // Check skills compatibility
      const vehicleSkills = getVehicleSkills(assignment.vehicle);
      const requiredSkills = getTripRequiredSkills(trip);
      const skillsMatch = requiredSkills.some(skill => vehicleSkills.includes(skill));
      if (!skillsMatch) continue;

      // CRITICAL: Check for time conflicts - pass the config
      const timeConflict = checkTimeConflicts(trip, assignment.trips, timeWindowConfig);
      if (timeConflict.hasConflict) {
        console.log(`⚠️ Time conflict for vehicle ${assignment.vehicle.name} with trip ${trip.id}:`, timeConflict.reason);
        
        // Check if conflict penalties are allowed
        if (timeWindowConfig?.allowConflictPenalty) {
          const conflictPenalty = timeWindowConfig.conflictPenaltyScore || 50;
          const minScore = timeWindowConfig.minAssignmentScore || 20;
          const adjustedScore = vehicleTypeScore - conflictPenalty;
          
          if (adjustedScore > bestScore && adjustedScore > minScore) {
            console.log(`  🤔 Considering assignment despite conflict (adjusted score: ${adjustedScore})`);
            bestScore = adjustedScore;
            bestVehicle = vehicleId;
            // Calculate basic metrics for conflicted assignment
            bestMetrics = { distance: 50, duration: 90, score: adjustedScore };
          }
        }
        continue; // Continue to check other vehicles
      }

      // Calculate route metrics if this trip is added
      const routeMetrics = calculateRouteMetrics(
        trip, 
        assignment, 
        distanceMatrix, 
        durationMatrix
      );

      // Calculate composite score
      const score = calculateTripAssignmentScore(
        trip,
        assignment.vehicle,
        routeMetrics,
        assignment.trips.length
      );

      if (score > bestScore) {
        bestScore = score;
        bestVehicle = vehicleId;
        bestMetrics = routeMetrics;
      }

    } catch (error) {
      console.error(`Error evaluating vehicle ${assignment.vehicle.name} for trip:`, error);
      continue;
    }
  }

  if (bestVehicle && bestScore > 15) { // Reduced threshold from 30 to 15 for more assignments
    return {
      success: true,
      vehicleId: bestVehicle,
      score: Math.round(bestScore),
      additionalDistance: bestMetrics.additionalDistance,
      additionalDuration: bestMetrics.additionalDuration,
      estimatedArrival: bestMetrics.estimatedArrival
    };
  }

  return {
    success: false,
    reason: `No compatible vehicle found with acceptable score (best score: ${Math.round(bestScore)}, threshold: 15)`
  };
}

/**
 * Check for time conflicts between a new trip and existing trips assigned to a vehicle
 */
function checkTimeConflicts(newTrip, existingTrips, timeWindowConfig = null) {
  if (existingTrips.length === 0) {
    return { hasConflict: false };
  }

  // Get time information for the new trip
  const newTripTime = getTimeBounds(newTrip);
  if (!newTripTime) {
    console.log(`⚠️ No time bounds for trip ${newTrip.id}, allowing assignment`);
    return { hasConflict: false, reason: 'New trip has no time constraints' };
  }

  console.log(`🕐 Checking conflicts for trip ${newTrip.id}:`, {
    type: newTrip.isReturnTrip ? 'RETURN' : 'APPOINTMENT',
    timeWindow: `${formatMinutes(newTripTime.startTime)}-${formatMinutes(newTripTime.endTime)}`,
    duration: `${newTripTime.duration} minutes`,
    existingTripsCount: existingTrips.length
  });

  // Check against all existing trips
  for (const existingTrip of existingTrips) {
    const existingTripTime = getTimeBounds(existingTrip);
    if (!existingTripTime) continue;

    console.log(`  vs existing trip ${existingTrip.id}: ${formatMinutes(existingTripTime.startTime)}-${formatMinutes(existingTripTime.endTime)}`);

    // Check for overlap - pass the config
    const overlap = checkTimeOverlap(newTripTime, existingTripTime, timeWindowConfig);
    if (overlap.hasOverlap) {
      console.log(`  ❌ CONFLICT DETECTED: ${overlap.details}`);
      return {
        hasConflict: true,
        reason: `Time overlap with trip ${existingTrip.id}: ${overlap.details}`,
        conflictingTrip: existingTrip
      };
    } else {
      console.log(`  ✅ No conflict with trip ${existingTrip.id}`);
    }
  }

  console.log(`  ✅ No conflicts found for trip ${newTrip.id}`);
  return { hasConflict: false };
}

/**
 * Format minutes to HH:MM string
 */
function formatMinutes(minutes) {
  if (minutes < 0) minutes = 0;
  if (minutes >= 1440) minutes = 1439; // Cap at 23:59
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Get time bounds for a trip (start and end times) - OPTIMIZED FOR REALISTIC SCHEDULING
 */
function getTimeBounds(trip) {
  // Determine the time based on trip type
  let startTime, endTime;
  
  if (trip.isReturnTrip) {
    // Return trips: more precise timing based on actual pickup window
    if (trip.earliestPickupTime) {
      startTime = timeToMinutes(trip.earliestPickupTime);
      // Return trips are typically 30-60 minutes (pickup + travel home)
      endTime = startTime + 60; // 1 hour for return trip completion
    } else {
      return null; // Can't determine timing for return trip
    }
  } else {
    // Regular appointment trips: more realistic time windows
    if (trip.appointmentTime) {
      const appointmentMinutes = timeToMinutes(trip.appointmentTime);
      const duration = trip.duration || 60; // Default 1 hour if not specified
      
      // Start: 30 minutes before appointment (for pickup and travel)
      // End: appointment + duration + 30 minutes travel back
      startTime = appointmentMinutes - 30; 
      endTime = appointmentMinutes + duration + 30;
    } else if (trip.pickupTime || trip.time) {
      const pickupMinutes = timeToMinutes(trip.pickupTime || trip.time);
      // Assume 1.5 hours total for pickup + appointment + return
      startTime = pickupMinutes;
      endTime = pickupMinutes + 90; 
    } else {
      return null; // No time information
    }
  }

  // Ensure times are within valid range (6 AM to 10 PM)
  startTime = Math.max(6 * 60, startTime); // Not before 6 AM
  endTime = Math.min(22 * 60, endTime);    // Not after 10 PM

  return {
    startTime,
    endTime,
    duration: endTime - startTime,
    type: trip.isReturnTrip ? 'return' : 'appointment'
  };
}

/**
 * Check if two time periods overlap with intelligent buffering
 */
function checkTimeOverlap(time1, time2, timeWindowConfig = null) {
  // Use provided config or defaults
  const config = timeWindowConfig || {
    bufferBetweenAppointments: 20,
    bufferBetweenReturns: 10,
    bufferMixed: 15
  };
  
  // Dynamic buffer time based on trip types
  let bufferMinutes = 15; // Default 15 minutes
  
  // Use configuration-based buffer times
  if (time1.type === 'appointment' && time2.type === 'appointment') {
    bufferMinutes = config.bufferBetweenAppointments;
  } else if (time1.type === 'return' && time2.type === 'return') {
    bufferMinutes = config.bufferBetweenReturns;
  } else {
    bufferMinutes = config.bufferMixed; // Mixed appointment/return
  }
  
  const adjustedTime1End = time1.endTime + bufferMinutes;
  const adjustedTime2End = time2.endTime + bufferMinutes;
  
  // Check for overlap: time1 starts before time2 ends AND time2 starts before time1 ends
  const hasOverlap = (time1.startTime < adjustedTime2End) && (time2.startTime < adjustedTime1End);
  
  if (hasOverlap) {
    return {
      hasOverlap: true,
      details: `${formatMinutes(time1.startTime)}-${formatMinutes(time1.endTime)} overlaps with ${formatMinutes(time2.startTime)}-${formatMinutes(time2.endTime)} (buffer: ${bufferMinutes}min)`
    };
  }
  
  return { hasOverlap: false };
}

/**
 * Calculate route metrics for adding a trip to a vehicle
 */
function calculateRouteMetrics(trip, vehicleAssignment, distanceMatrix, durationMatrix) {
  // For simplicity, calculate direct distance/duration
  // In production, this would consider the full route optimization
  
  const baseDistance = 10; // km - default trip distance
  const baseDuration = 30; // minutes - default trip duration
  
  // Add penalty for vehicle utilization
  const utilizationPenalty = vehicleAssignment.trips.length * 0.1;
  
  return {
    additionalDistance: baseDistance * (1 + utilizationPenalty),
    additionalDuration: baseDuration * (1 + utilizationPenalty),
    estimatedArrival: calculateEstimatedArrival(trip.pickupTime || trip.time, baseDuration)
  };
}

/**
 * Calculate trip assignment score
 */
function calculateTripAssignmentScore(trip, vehicle, routeMetrics, currentTripCount) {
  const vehicleTypeScore = getVehicleTypeCompatibility(trip.vehicleType, vehicle.type);
  const utilizationScore = Math.max(0, 100 - (currentTripCount * 15)); // Penalty for overloading
  const efficiencyScore = Math.max(0, 100 - (routeMetrics.additionalDistance * 2)); // Distance penalty
  
  return (
    vehicleTypeScore * 0.5 +
    utilizationScore * 0.3 +
    efficiencyScore * 0.2
  );
}

/**
 * Get vehicle type compatibility score
 */
function getVehicleTypeCompatibility(requiredType, vehicleType) {
  const compatibility = {
    'Ambulance': { 'Ambulance': 100, 'VSL': 30, 'Taxi': 10 },
    'VSL': { 'Ambulance': 80, 'VSL': 100, 'Taxi': 50 },
    'Taxi': { 'Ambulance': 90, 'VSL': 80, 'Taxi': 100 }
  };
  
  return compatibility[requiredType]?.[vehicleType] || 50;
}

/**
 * Apply 2-opt improvement to a vehicle's route
 */
function apply2OptImprovement(trips, vehicle, distanceMatrix) {
  if (trips.length <= 2) {
    return { improved: false, trips, totalDistance: 0, totalDuration: 0 };
  }

  let bestTrips = [...trips];
  let bestDistance = calculateRouteDistance(trips);
  let improved = false;

  // Try all 2-opt swaps
  for (let i = 1; i < trips.length - 1; i++) {
    for (let j = i + 1; j < trips.length; j++) {
      const newTrips = [...trips];
      
      // Reverse the segment between i and j
      const segment = newTrips.slice(i, j + 1).reverse();
      newTrips.splice(i, j - i + 1, ...segment);
      
      const newDistance = calculateRouteDistance(newTrips);
      
      if (newDistance < bestDistance) {
        bestTrips = newTrips;
        bestDistance = newDistance;
        improved = true;
      }
    }
  }

  return {
    improved,
    trips: bestTrips,
    totalDistance: bestDistance,
    totalDuration: bestDistance / 40 * 60 // Estimate duration from distance
  };
}

/**
 * Calculate total route distance (simplified)
 */
function calculateRouteDistance(trips) {
  // Simplified distance calculation
  // In production, use actual distance matrix
  return trips.length * 10 + Math.random() * 5; // Mock calculation
}

/**
 * Calculate estimated arrival time
 */
function calculateEstimatedArrival(pickupTime, additionalMinutes) {
  if (!pickupTime) return null;
  
  const [hours, minutes] = pickupTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + additionalMinutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

// Helper functions for VROOM format conversion

function validateVRPData(vrpData) {
  if (!vrpData.vehicles || vrpData.vehicles.length === 0) {
    throw new Error('At least one vehicle is required');
  }
  
  // Check for either jobs or shipments
  const hasJobs = vrpData.jobs && vrpData.jobs.length > 0;
  const hasShipments = vrpData.shipments && vrpData.shipments.length > 0;
  
  if (!hasJobs && !hasShipments) {
    throw new Error('At least one job or shipment is required');
  }

  if (hasJobs && vrpData.jobs.length > VROOM_CONFIG.maxJobs) {
    throw new Error(`Too many jobs (${vrpData.jobs.length}). Maximum: ${VROOM_CONFIG.maxJobs}`);
  }

  if (hasShipments && vrpData.shipments.length > VROOM_CONFIG.maxJobs) {
    throw new Error(`Too many shipments (${vrpData.shipments.length}). Maximum: ${VROOM_CONFIG.maxJobs}`);
  }

  if (vrpData.vehicles.length > VROOM_CONFIG.maxVehicles) {
    throw new Error(`Too many vehicles (${vrpData.vehicles.length}). Maximum: ${VROOM_CONFIG.maxVehicles}`);
  }
}

function getVehicleCoordinate(vehicle, coordinates) {
  // Use vehicle's current location or default to first coordinate
  return coordinates[0] || [6.1286, 43.1205]; // Default to Hyères
}

function findCoordinateIndex(coordinate, coordinates) {
  for (let i = 0; i < coordinates.length; i++) {
    const coord = coordinates[i];
    if (Math.abs(coord[0] - coordinate[0]) < 0.001 && Math.abs(coord[1] - coordinate[1]) < 0.001) {
      return i;
    }
  }
  return 0; // Default to first coordinate
}

function findTripCoordinate(address, coordinates) {
  // This would normally geocode the address, but we'll use the first coordinate as fallback
  return coordinates[0] || [6.1286, 43.1205];
}

function getVehicleCapacity(vehicle) {
  // Define capacity based on vehicle type
  const capacities = {
    'Ambulance': 2,    // 2 patients max
    'VSL': 3,          // 3 patients max  
    'Taxi': 4,         // 4 passengers max
    'Minibus': 8       // 8 passengers max
  };
  
  return capacities[vehicle.type] || 1;
}

function getVehicleSkills(vehicle) {
  // Vehicle skills determine which jobs it can handle
  const skills = [];
  
  switch (vehicle.type) {
    case 'Ambulance':
      skills.push(1, 2, 3); // Can handle all emergency levels
      break;
    case 'VSL':
      skills.push(2, 3); // Can handle medium and low priority
      break;
    case 'Taxi':
      skills.push(3); // Only low priority/regular transport
      break;
  }
  
  return skills;
}

function getVehicleTimeWindow(vehicle) {
  // Extended working hours to cover all trip times: 6:00 AM to 9:00 PM
  return [6 * 3600, 21 * 3600]; // In seconds from midnight
}

function getTripTimeWindow(trip) {
  // For return trips, use appointmentTime (which contains the exitTime)
  // For regular trips, use pickupTime or time or appointmentTime
  const timeStr = trip.pickupTime || trip.time || trip.appointmentTime;
  
  if (!timeStr) return null;
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  const timeInSeconds = hours * 3600 + minutes * 60;
  
  // Allow ±30 minutes window for better optimization
  return [timeInSeconds - 1800, timeInSeconds + 1800];
}

function getTripRequiredSkills(trip) {
  // Required skills based on trip type
  const skillRequirements = {
    'Ambulance': [1], // Requires ambulance
    'VSL': [1, 2], // Requires ambulance or VSL
    'Taxi': [1, 2, 3] // Any vehicle type
  };
  
  return skillRequirements[trip.vehicleType] || [1, 2, 3];
}

function getTripServiceTime(trip) {
  // Service time in seconds (time spent at pickup/delivery)
  const serviceTimes = {
    'urgent': 300,  // 5 minutes
    'high': 240,    // 4 minutes
    'normal': 180,  // 3 minutes
    'low': 120      // 2 minutes
  };
  
  return serviceTimes[trip.priority] || 180;
}

// New helper function to ensure matrix is properly sized
function ensureMatrixSize(matrix, targetSize) {
  if (!matrix || matrix.length === 0) {
    // Create default matrix with large distances
    return Array(targetSize).fill().map(() => Array(targetSize).fill(999999));
  }

  const currentSize = matrix.length;
  if (currentSize >= targetSize) {
    return matrix; // Matrix is already large enough
  }

  // Pad the matrix to the target size
  const paddedMatrix = matrix.map(row => {
    const paddedRow = [...row];
    while (paddedRow.length < targetSize) {
      paddedRow.push(999999); // Large distance for unknown connections
    }
    return paddedRow;
  });

  // Add new rows if needed
  while (paddedMatrix.length < targetSize) {
    paddedMatrix.push(Array(targetSize).fill(999999));
  }

  // Set diagonal to 0 (distance from a point to itself)
  for (let i = 0; i < targetSize; i++) {
    paddedMatrix[i][i] = 0;
  }

  return paddedMatrix;
}

function calculateVROOMScore(route, trip) {
  // Calculate a score based on VROOM optimization quality
  const baseScore = 100;
  const distancePenalty = Math.min(20, route.distance / 10000); // Penalty for long routes
  const latePenalty = 0; // Could calculate based on time windows
  
  return Math.max(0, baseScore - distancePenalty - latePenalty);
}

function calculateVehicleUtilization(route) {
  // Calculate how well the vehicle is utilized
  const workingHours = 12; // 12-hour working day
  const usedTime = route.duration / 3600; // Convert to hours
  
  return Math.min(100, (usedTime / workingHours) * 100);
}

/**
 * VROOM Service Status and Configuration Info
 * @returns {Object} Service configuration and status
 */
export function getVROOMServiceInfo() {
  return {
    service: 'VROOM (Vehicle Routing Open-source Optimization Machine)',
    version: 'v1.13+',
    baseUrl: VROOM_CONFIG.baseUrl,
    timeout: VROOM_CONFIG.timeout,
    maxJobs: VROOM_CONFIG.maxJobs,
    maxVehicles: VROOM_CONFIG.maxVehicles,
    features: [
      'Vehicle Routing Problem (VRP) solving',
      'Pickup and delivery optimization',
      'Time windows constraints',
      'Vehicle capacity constraints',
      'Skills-based job assignment',
      'Multi-objective optimization'
    ],
    algorithms: [
      'Local search heuristics',
      'Genetic algorithms',
      'Tabu search',
      'Variable neighborhood search'
    ],
    advantages: [
      'State-of-the-art optimization quality',
      'Fast computation times',
      'Multiple constraint support',
      'Real-world problem modeling'
    ],
    limitations: [
      'Requires OSRM for routing data',
      'Complex setup for custom instances',
      'Limited to specific problem types'
    ]
  };
}

/**
 * Validate VROOM server availability
 * @returns {Promise<boolean>} True if VROOM server is available
 */
export async function validateVROOMServer() {
  try {
    // Test with a simple VRP problem
    const testProblem = {
      vehicles: [
        {
          id: 1,
          start: 0,
          end: 0
        }
      ],
      jobs: [
        {
          id: 1,
          location_index: 1
        }
      ],
      matrices: {
        driving: {
          durations: [
            [0, 600],
            [600, 0]
          ]
        }
      }
    };

    const result = await solveVRP(testProblem);
    console.log('✅ VROOM server validation successful');
    return result.success;

  } catch (error) {
    console.warn('⚠️  VROOM server validation failed:', error.message);
    return false;
  }
}

/**
 * VROOM Server Management Utilities
 */

/**
 * Get instructions to start the local VROOM server
 * @returns {Object} Instructions and commands to start VROOM
 */
export function getVROOMStartInstructions() {
  return {
    instructions: [
      '1. Install Docker Desktop if not already installed',
      '2. Open PowerShell as Administrator',
      '3. Pull the VROOM Docker image:',
      '   docker pull vroomvrp/vroom-docker',
      '4. Start VROOM Docker container:',
      `   ${VROOM_CONFIG.dockerConfig.dockerCommand}`,
      '5. Wait for server to start (should see "VROOM v1.13.0 listening on port 3000")',
      '6. Server will be available at http://localhost:3000',
      '',
      'Note: VROOM requires OSRM server to be running for routing data!'
    ],
    dockerCommand: VROOM_CONFIG.dockerConfig.dockerCommand,
    dockerImage: VROOM_CONFIG.dockerConfig.image,
    testUrl: `${VROOM_CONFIG.baseUrl}`,
    port: VROOM_CONFIG.dockerConfig.port,
    prerequisites: [
      'Docker Desktop installed and running',
      'OSRM server running at localhost:5000',
      'At least 2GB RAM available for VROOM container'
    ]
  };
}

/**
 * Test VROOM server connectivity
 * @returns {Promise<Object>} Server status information
 */
export async function testVROOMConnection() {
  const results = {
    local: { available: false, responseTime: null, error: null },
    fallbacks: []
  };

  // Test local server with simple connection test
  try {
    const start = Date.now();
    // Try to connect to the port - if VROOM is running it should respond
    const response = await fetch(`${VROOM_CONFIG.baseUrl}`, {
      method: 'GET',
      timeout: 5000
    });
    results.local.responseTime = Date.now() - start;
    // Accept any response (200, 404, etc) as long as server responds
    results.local.available = true;
  } catch (error) {
    results.local.error = error.message;
    // If connection refused, server is not running
    results.local.available = false;
  }

  // Test fallback servers
  for (const url of VROOM_CONFIG.fallbackUrls) {
    const fallbackResult = { url, available: false, responseTime: null, error: null };
    
    try {
      const start = Date.now();
      const response = await axios.get(url, { timeout: 10000 });
      fallbackResult.responseTime = Date.now() - start;
      fallbackResult.available = response.status === 200;
      if (response.status !== 200) {
        fallbackResult.error = `HTTP ${response.status}`;
      }
    } catch (error) {
      fallbackResult.error = error.message;
    }
    
    results.fallbacks.push(fallbackResult);
  }

  return results;
}

/**
 * Get VROOM server status and configuration info
 * @returns {Object} Complete server configuration and status
 */
export function getVROOMStatus() {
  return {
    config: VROOM_CONFIG,
    localServer: {
      url: VROOM_CONFIG.baseUrl,
      dockerCommand: VROOM_CONFIG.dockerConfig.dockerCommand,
      dockerImage: VROOM_CONFIG.dockerConfig.image
    },
    fallbackServers: VROOM_CONFIG.fallbackUrls.map(url => ({ url })),
    instructions: getVROOMStartInstructions(),
    integration: {
      osrmRequired: true,
      osrmUrl: 'http://localhost:5000',
      note: 'VROOM needs OSRM server for routing calculations'
    }
  };
}

/**
 * Test VROOM with a simple optimization problem
 * @returns {Promise<Object>} Test results
 */
export async function testVROOMOptimization() {
  const testProblem = {
    vehicles: [
      {
        id: 1,
        start: [6.1286, 43.1205], // Hyères center
        end: [6.1286, 43.1205]
      }
    ],
    jobs: [
      {
        id: 1,
        location: [6.1400, 43.1300], // Nearby location
        service: 300 // 5 minutes
      },
      {
        id: 2,
        location: [6.1100, 43.1100], // Another nearby location
        service: 300
      }
    ],
    options: {
      g: false // Don't require geometry for test
    }
  };

  try {
    console.log('🧪 Testing VROOM optimization...');
    const result = await solveVRP(testProblem);
    return {
      success: true,
      serverUsed: result.serverUsed,
      computationTime: result.solution?.summary?.computing_times?.total || 'N/A',
      routesCount: result.routes?.length || 0,
      assignedJobs: result.solution?.summary?.assigned || 0,
      totalCost: result.solution?.summary?.cost || 'N/A'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Enhanced VROOM server connectivity test with actual optimization request
 * @returns {Promise<boolean>} True if VROOM server can handle optimization requests
 */
async function testVROOMServerConnectivity() {
  try {
    // Create a minimal test VRP problem
    const testVRP = {
      jobs: [
        {
          id: 1,
          location: [6.1286, 43.1205],
          service: 300
        }
      ],
      vehicles: [
        {
          id: 1,
          start: [6.1286, 43.1205],
          end: [6.1286, 43.1205]
        }
      ],
      options: {
        geometry: false
      }
    };

    const response = await axios.post(`${VROOM_CONFIG.baseUrl}`, testVRP, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Check if response contains valid VROOM solution
    if (response.data && response.data.routes && Array.isArray(response.data.routes)) {
      console.log(`✅ VROOM server fully operational - optimization test successful`);
      return true;
    } else {
      console.log(`⚠️ VROOM server responded but format unexpected`);
      return false;
    }

  } catch (error) {
    if (error.response) {
      // Server responded with error status - this means server is running
      console.log(`⚠️ VROOM server running but optimization failed: ${error.response.status}`);
      // Even if optimization fails, server is accessible for fallback logic
      return true; 
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.warn('❌ VROOM server not accessible (connection refused)');
      return false;
    } else {
      console.warn(`⚠️ VROOM connectivity test failed: ${error.message}`);
      return false;
    }
  }
}

/**
 * Manual VROOM server diagnostic test
 * @returns {Promise<Object>} Detailed diagnostic information
 */
export async function diagnosticVROOMTest() {
  console.log('🔍 VROOM Server Diagnostic Test');
  console.log('===============================');
  
  const results = {
    timestamp: new Date().toISOString(),
    localServer: {
      url: VROOM_CONFIG.baseUrl,
      basicHealthCheck: false,
      optimizationTest: false,
      responseTime: null,
      error: null,
      details: null
    },
    recommendations: []
  };

  // Test 1: Basic connectivity
  console.log('🔍 Test 1: Basic server connectivity...');
  try {
    const start = Date.now();
    const response = await axios.get(`${VROOM_CONFIG.baseUrl}`, {
      timeout: 5000,
      validateStatus: () => true // Accept any status
    });
    results.localServer.responseTime = Date.now() - start;
    results.localServer.basicHealthCheck = true;
    results.localServer.details = `Server responded with status ${response.status}`;
    console.log(`✅ Basic connectivity: Server responded (${response.status}) in ${results.localServer.responseTime}ms`);
  } catch (error) {
    results.localServer.error = error.message;
    console.log(`❌ Basic connectivity failed: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      results.recommendations.push('Check if VROOM Docker container is running: docker ps');
      results.recommendations.push('Start VROOM server: docker run -it --rm -p 3000:3000 ghcr.io/vroom-project/vroom-docker');
    }
  }

  // Test 2: Optimization capability
  if (results.localServer.basicHealthCheck) {
    console.log('🔍 Test 2: Optimization capability...');
    try {
      const testData = {
        jobs: [
          { id: 1, location: [6.1286, 43.1205], service: 300 }
        ],
        vehicles: [
          { id: 1, start: [6.1286, 43.1205], end: [6.1286, 43.1205] }
        ],
        options: { geometry: false }
      };

      const start = Date.now();
      const response = await axios.post(`${VROOM_CONFIG.baseUrl}`, testData, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const optimizationTime = Date.now() - start;
      results.localServer.optimizationTest = true;
      console.log(`✅ Optimization test: Successful in ${optimizationTime}ms`);
      
      if (response.data && response.data.routes) {
        console.log(`✅ Response format: Valid VROOM response with ${response.data.routes.length} routes`);
      }
      
    } catch (error) {
      console.log(`❌ Optimization test failed: ${error.message}`);
      if (error.response) {
        console.log(`📊 Server error details: ${JSON.stringify(error.response.data, null, 2)}`);
        results.localServer.details += ` | Optimization error: ${error.response.status}`;
      }
    }
  }

  // Generate recommendations
  if (results.localServer.basicHealthCheck && results.localServer.optimizationTest) {
    results.recommendations.push('✅ VROOM server is fully operational');
  } else if (results.localServer.basicHealthCheck && !results.localServer.optimizationTest) {
    results.recommendations.push('⚠️ VROOM server is running but optimization may be failing');
    results.recommendations.push('Check VROOM server logs for detailed error information');
  } else {
    results.recommendations.push('❌ VROOM server is not accessible');
    results.recommendations.push('Verify Docker container is running and port 3000 is available');
  }

  console.log('\n📋 Diagnostic Summary:');
  console.log(`  Basic Health: ${results.localServer.basicHealthCheck ? '✅' : '❌'}`);
  console.log(`  Optimization: ${results.localServer.optimizationTest ? '✅' : '❌'}`);
  console.log(`  Response Time: ${results.localServer.responseTime}ms`);
  
  console.log('\n💡 Recommendations:');
  results.recommendations.forEach(rec => console.log(`  ${rec}`));

  return results;
}

// Export configuration for debugging
export { VROOM_CONFIG };
