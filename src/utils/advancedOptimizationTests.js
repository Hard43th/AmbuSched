// Advanced Optimization Test Suite
// Extended test scenarios for comprehensive OSRM + VROOM testing

import { getOSRMRoute, getOSRMMatrix, batchGeocodingAndRouting, testOSRMConnection } from '../services/osrmService.js';
import { solveVRP, testVROOMOptimization, diagnosticVROOMTest } from '../services/vroomService.js';
import { smartOptimize, optimizeWithOSRMAndVROOM } from './routeOptimization.js';

/**
 * STRESS TEST SCENARIOS - For performance and reliability testing
 */

/**
 * Generate large-scale test scenario
 * @param {number} vehicleCount - Number of vehicles to test
 * @param {number} jobCount - Number of jobs to test  
 * @returns {Object} Large test scenario
 */
export function generateStressTestScenario(vehicleCount = 10, jobCount = 50) {
  const vehicles = [];
  const jobs = [];
  
  // Generate vehicles across Hyères region
  const vehicleLocations = [
    [6.1286, 43.1205], // Hyères Centre
    [6.1400, 43.1100], // Carqueiranne
    [6.1200, 43.1300], // Giens
    [6.1350, 43.1150], // Avenue Gambetta
    [6.1100, 43.1350], // Port area
  ];
  
  for (let i = 1; i <= vehicleCount; i++) {
    const location = vehicleLocations[i % vehicleLocations.length];
    vehicles.push({
      id: i,
      name: `Vehicle-${i}`,
      type: i % 3 === 0 ? 'Ambulance' : i % 3 === 1 ? 'VSL' : 'Taxi',
      start: location,
      end: location,
      capacity: [i % 3 === 0 ? 2 : 4],
      time_window: [25200, 64800], // 7h00 - 18h00
      skills: i % 3 === 0 ? [1, 2, 3] : [1]
    });
  }
  
  // Generate jobs across wider region
  const jobLocations = [
    [6.1286, 43.1205], [6.1350, 43.1180], [6.1200, 43.1250], [6.1180, 43.1220],
    [6.1450, 43.1050], [6.1320, 43.1160], [6.1100, 43.1300], [6.1380, 43.1140],
    [6.1250, 43.1190], [5.9282, 43.1242], [5.8794, 43.1042], [5.8394, 43.0942],
    [5.7583, 43.1356], [6.2000, 43.1000], [6.0500, 43.1400], [6.1500, 43.1350]
  ];
  
  for (let i = 1; i <= jobCount; i++) {
    const location = jobLocations[i % jobLocations.length];
    const startTime = 28800 + (i * 600); // Spread jobs every 10 minutes from 8h00
    
    jobs.push({
      id: i,
      description: `Job-${i} - ${i % 4 === 0 ? 'Urgent' : 'Normal'} transport`,
      location: location,
      service: 300 + (i % 10) * 120, // 5-25 minutes service time
      delivery: [1],
      time_windows: [[startTime, startTime + 3600]], // 1-hour window
      skills: [i % 5 === 0 ? 2 : 1], // Some require medical skills
      priority: i % 4 === 0 ? 150 : i % 3 === 0 ? 100 : 75
    });
  }
  
  return {
    name: `Stress Test - ${vehicleCount} vehicles, ${jobCount} jobs`,
    description: `Large-scale optimization test for performance evaluation`,
    vehicles,
    jobs
  };
}

/**
 * Performance benchmark test
 * @param {Object} scenario - Test scenario to benchmark
 * @returns {Promise<Object>} Performance results
 */
export async function runPerformanceBenchmark(scenario) {
  console.log(`🏃‍♂️ Performance benchmark: ${scenario.name}`);
  
  const results = {
    scenario: scenario.name,
    vehicleCount: scenario.vehicles.length,
    jobCount: scenario.jobs.length,
    osrmPerformance: null,
    vroomPerformance: null,
    smartOptimizePerformance: null,
    memoryUsage: null
  };
  
  // Memory usage before
  const memoryBefore = performance.memory ? performance.memory.usedJSHeapSize : 0;
  
  try {
    // Test OSRM performance
    const osrmStart = performance.now();
    const addresses = [
      ...scenario.jobs.map(job => `${job.location[1]},${job.location[0]}`),
      ...scenario.vehicles.map(vehicle => `${vehicle.start[1]},${vehicle.start[0]}`)
    ];
    const uniqueAddresses = [...new Set(addresses)];
    await batchGeocodingAndRouting(uniqueAddresses.slice(0, 20)); // Limit for testing
    results.osrmPerformance = performance.now() - osrmStart;
    
    // Test VROOM performance (smaller subset for speed)
    const vroomStart = performance.now();
    const smallScenario = {
      ...scenario,
      vehicles: scenario.vehicles.slice(0, 5),
      jobs: scenario.jobs.slice(0, 15)
    };
    await testVROOMOptimization();
    results.vroomPerformance = performance.now() - vroomStart;
    
    // Test smart optimization
    const smartStart = performance.now();
    await smartOptimize(
      smallScenario.jobs.map(job => ({
        id: job.id,
        pickup: `${job.location[1]},${job.location[0]}`,
        destination: `${job.location[1] + 0.01},${job.location[0] + 0.01}`,
        priority: job.priority > 120 ? 'urgent' : 'normal',
        vehicleType: job.skills.includes(2) ? 'Ambulance' : 'VSL'
      })),
      smallScenario.vehicles.map(vehicle => ({
        id: vehicle.id,
        name: vehicle.name,
        type: vehicle.type,
        status: 'available'
      }))
    );
    results.smartOptimizePerformance = performance.now() - smartStart;
    
    // Memory usage after
    const memoryAfter = performance.memory ? performance.memory.usedJSHeapSize : 0;
    results.memoryUsage = memoryAfter - memoryBefore;
    
    console.log(`✅ Benchmark completed:`);
    console.log(`  - OSRM: ${Math.round(results.osrmPerformance)}ms`);
    console.log(`  - VROOM: ${Math.round(results.vroomPerformance)}ms`);
    console.log(`  - Smart Optimize: ${Math.round(results.smartOptimizePerformance)}ms`);
    console.log(`  - Memory Used: ${Math.round(results.memoryUsage / 1024)}KB`);
    
  } catch (error) {
    console.error(`❌ Benchmark failed: ${error.message}`);
    results.error = error.message;
  }
  
  return results;
}

/**
 * Comprehensive service health check
 * @returns {Promise<Object>} Health check results
 */
export async function runServiceHealthCheck() {
  console.log('🏥 Comprehensive Service Health Check');
  console.log('====================================');
  
  const results = {
    timestamp: new Date().toISOString(),
    osrm: {
      local: { status: 'unknown', responseTime: 0, error: null },
      fallback: { status: 'unknown', responseTime: 0, error: null }
    },
    vroom: {
      local: { status: 'unknown', responseTime: 0, error: null },
      public: { status: 'unknown', responseTime: 0, error: null }
    },
    integration: {
      routeCalculation: { status: 'unknown', error: null },
      matrixCalculation: { status: 'unknown', error: null },
      vrpSolving: { status: 'unknown', error: null }
    },
    recommendations: []
  };
  
  // Test OSRM connections
  try {
    const osrmTest = await testOSRMConnection();
    results.osrm.local = osrmTest.local;
    results.osrm.fallback = osrmTest.fallback;
    
    if (!osrmTest.local.available && !osrmTest.fallback.available) {
      results.recommendations.push('⚠️ No OSRM servers available - routing will use basic fallback');
    } else if (!osrmTest.local.available) {
      results.recommendations.push('🌐 Local OSRM offline - using public server (rate limited)');
    } else {
      results.recommendations.push('✅ OSRM services optimal');
    }
  } catch (error) {
    results.osrm.error = error.message;
    results.recommendations.push('❌ OSRM connection test failed');
  }
  
  // Test VROOM optimization with enhanced diagnostics
  try {
    console.log('🔍 Running VROOM diagnostic test...');
    const vroomDiagnostic = await diagnosticVROOMTest();
    
    if (vroomDiagnostic.localServer.basicHealthCheck) {
      results.vroom.local.status = 'available';
      results.vroom.local.responseTime = vroomDiagnostic.localServer.responseTime;
      
      if (vroomDiagnostic.localServer.optimizationTest) {
        results.recommendations.push('✅ VROOM local server fully operational');
      } else {
        results.recommendations.push('🟡 VROOM server responding but optimization may have issues');
      }
    } else {
      results.vroom.local.status = 'unavailable';
      results.vroom.local.error = vroomDiagnostic.localServer.error;
    }

    // Also test public VROOM as fallback
    const publicVroomTest = await testVROOMOptimization();
    if (publicVroomTest.success) {
      results.vroom.public.status = 'available';
      results.vroom.public.responseTime = publicVroomTest.computationTime || 0;
      if (!vroomDiagnostic.localServer.basicHealthCheck) {
        results.recommendations.push('✅ Public VROOM server available as fallback');
      }
    } else {
      results.vroom.public.status = 'unavailable';
      results.vroom.public.error = publicVroomTest.error;
      if (!vroomDiagnostic.localServer.basicHealthCheck) {
        results.recommendations.push('⚠️ No VROOM servers available - using fallback algorithms');
      }
    }
    
  } catch (error) {
    results.vroom.local.error = error.message;
    results.vroom.public.error = error.message;
    results.recommendations.push('❌ VROOM diagnostic tests failed');
  }
  
  // Integration tests
  try {
    // Test route calculation
    const route = await getOSRMRoute([
      [6.1286, 43.1205], // Hyères
      [5.9282, 43.1242]  // Toulon
    ]);
    results.integration.routeCalculation.status = route.success ? 'working' : 'degraded';
    if (!route.success) {
      results.integration.routeCalculation.error = route.error;
    }
    
    // Test matrix calculation
    const matrix = await getOSRMMatrix([
      [6.1286, 43.1205],
      [6.1350, 43.1180],
      [6.1200, 43.1250]
    ]);
    results.integration.matrixCalculation.status = matrix.success ? 'working' : 'degraded';
    if (!matrix.success) {
      results.integration.matrixCalculation.error = matrix.error;
    }
    
  } catch (error) {
    results.integration.error = error.message;
    results.recommendations.push('❌ Integration tests failed');
  }
  
  // Overall health assessment
  const healthyServices = [
    results.osrm.local.available || results.osrm.fallback.available,
    results.vroom.public.status === 'available',
    results.integration.routeCalculation.status === 'working',
    results.integration.matrixCalculation.status === 'working'
  ].filter(Boolean).length;
  
  const overallHealth = healthyServices >= 3 ? 'Excellent' : 
                       healthyServices >= 2 ? 'Good' : 
                       healthyServices >= 1 ? 'Degraded' : 'Critical';
  
  console.log(`\n🎯 Overall System Health: ${overallHealth}`);
  console.log(`📊 Services Available: ${healthyServices}/4`);
  
  if (results.recommendations.length > 0) {
    console.log('\n📋 Recommendations:');
    results.recommendations.forEach(rec => console.log(`  ${rec}`));
  }
  
  return {
    ...results,
    overallHealth,
    servicesAvailable: healthyServices,
    totalServices: 4
  };
}

/**
 * Real-world scenario simulation
 * @returns {Promise<Object>} Simulation results
 */
export async function runRealWorldSimulation() {
  console.log('🌍 Real-World Scenario Simulation');
  console.log('=================================');
  
  // Simulate a typical day in ambulance service
  const scenarios = [
    {
      name: 'Morning Emergency Rush (8h-10h)',
      description: 'High-priority emergency calls during morning hours',
      trips: [
        {
          id: 1,
          pickup: 'Urgences Hôpital de Hyères',
          destination: 'CHU Toulon',
          priority: 'urgent',
          vehicleType: 'Ambulance',
          pickupTime: '08:15'
        },
        {
          id: 2,
          pickup: 'Résidence Les Palmiers, Hyères',
          destination: 'Centre de Dialyse',
          priority: 'high',
          vehicleType: 'VSL',
          pickupTime: '08:30'
        },
        {
          id: 3,
          pickup: 'École Primaire Victor Hugo',
          destination: 'Hôpital de Hyères',
          priority: 'urgent',
          vehicleType: 'Ambulance',
          pickupTime: '09:00'
        }
      ]
    },
    {
      name: 'Planned Appointments (10h-14h)',
      description: 'Scheduled medical appointments and regular transports',
      trips: [
        {
          id: 4,
          pickup: 'EHPAD Les Mimosas',
          destination: 'Cabinet Médical Godillot',
          priority: 'normal',
          vehicleType: 'VSL',
          pickupTime: '10:30'
        },
        {
          id: 5,
          pickup: 'Domicile Mme Dupont, Avenue Gambetta',
          destination: 'Centre de Kinésithérapie',
          priority: 'normal',
          vehicleType: 'VSL',
          pickupTime: '11:00'
        }
      ]
    },
    {
      name: 'Afternoon Long-Distance (14h-18h)',
      description: 'Inter-hospital transfers and long-distance transports',
      trips: [
        {
          id: 6,
          pickup: 'Hôpital de Hyères',
          destination: 'CHU La Timone, Marseille',
          priority: 'high',
          vehicleType: 'Ambulance',
          pickupTime: '14:30'
        },
        {
          id: 7,
          pickup: 'Clinique Sainte-Marguerite',
          destination: 'Hôpital Sainte-Musse, Toulon',
          priority: 'normal',
          vehicleType: 'VSL',
          pickupTime: '15:00'
        }
      ]
    }
  ];
  
  const vehicles = [
    { id: 1, name: 'Ambulance Alpha', type: 'Ambulance', status: 'available' },
    { id: 2, name: 'Ambulance Beta', type: 'Ambulance', status: 'available' },
    { id: 3, name: 'VSL Gamma', type: 'VSL', status: 'available' },
    { id: 4, name: 'VSL Delta', type: 'VSL', status: 'available' }
  ];
  
  const results = [];
  
  for (const scenario of scenarios) {
    console.log(`\n🎬 Running: ${scenario.name}`);
    console.log(`📍 Description: ${scenario.description}`);
    
    try {
      const startTime = performance.now();
      const result = await smartOptimize(scenario.trips, vehicles);
      const executionTime = performance.now() - startTime;
      
      results.push({
        scenario: scenario.name,
        success: true,
        trips: scenario.trips.length,
        assignedTrips: result.results?.filter(r => r.status === 'assigned').length || 0,
        executionTime: Math.round(executionTime),
        algorithm: result.algorithm,
        summary: result.summary
      });
      
      console.log(`✅ Completed in ${Math.round(executionTime)}ms`);
      console.log(`📊 Assignment rate: ${Math.round((results[results.length-1].assignedTrips / scenario.trips.length) * 100)}%`);
      
    } catch (error) {
      console.error(`❌ Failed: ${error.message}`);
      results.push({
        scenario: scenario.name,
        success: false,
        error: error.message
      });
    }
  }
  
  // Calculate overall simulation results
  const successfulScenarios = results.filter(r => r.success);
  const totalTrips = successfulScenarios.reduce((sum, r) => sum + r.trips, 0);
  const totalAssigned = successfulScenarios.reduce((sum, r) => sum + r.assignedTrips, 0);
  const avgExecutionTime = successfulScenarios.reduce((sum, r) => sum + r.executionTime, 0) / successfulScenarios.length;
  
  console.log(`\n🎯 Simulation Summary:`);
  console.log(`📈 Scenarios completed: ${successfulScenarios.length}/${scenarios.length}`);
  console.log(`📊 Overall assignment rate: ${Math.round((totalAssigned / totalTrips) * 100)}%`);
  console.log(`⚡ Average execution time: ${Math.round(avgExecutionTime)}ms`);
  
  return {
    scenarios: results,
    summary: {
      totalScenarios: scenarios.length,
      successfulScenarios: successfulScenarios.length,
      totalTrips,
      totalAssigned,
      overallAssignmentRate: Math.round((totalAssigned / totalTrips) * 100),
      averageExecutionTime: Math.round(avgExecutionTime)
    }
  };
}

/**
 * Export all advanced tests for easy access
 */
export const ADVANCED_TESTS = {
  stressTest: generateStressTestScenario,
  performance: runPerformanceBenchmark,
  healthCheck: runServiceHealthCheck,
  realWorldSim: runRealWorldSimulation
};

// Auto-log when module loads
if (typeof window !== 'undefined') {
  console.log('🧪 Advanced Optimization Test Suite Loaded');
  console.log('Available tests: stressTest, performance, healthCheck, realWorldSim');
}
