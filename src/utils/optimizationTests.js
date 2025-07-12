// AmbuSched OSRM + VROOM Optimization Test Suite
// Comprehensive test scenarios for vehicle routing optimization

import { getOSRMRoute, getOSRMMatrix, batchGeocodingAndRouting } from '../services/osrmService.js';
import { solveVRP, testVROOMOptimization } from '../services/vroomService.js';

/**
 * Comprehensive test data for Hyères region optimization
 * Fixed for VROOM compatibility: priority values 0-100, no invalid fields
 */
const TEST_SCENARIOS = {
  // Scenario 1: Morning Rush - Multiple short trips
  morningRush: {
    name: "Morning Rush Hour - Multiple Short Trips",
    description: "Optimize 8 patient transports during morning rush hour",
    vehicles: [
      {
        id: 1,
        start: [6.1286, 43.1205], // Hyères Centre
        end: [6.1286, 43.1205],
        capacity: [4], // 4 passengers
        time_window: [28800, 43200], // 8h00 - 12h00
        skills: [1] // Basic transport
      },
      {
        id: 2,
        start: [6.1286, 43.1205],
        end: [6.1286, 43.1205],
        capacity: [2], // 2 patients
        time_window: [28800, 43200],
        skills: [1, 2] // Basic + Medical
      },
      {
        id: 3,
        start: [6.1400, 43.1100], // Carqueiranne
        end: [6.1400, 43.1100],
        capacity: [4],
        time_window: [28800, 43200],
        skills: [1]
      }
    ],
    jobs: [
      {
        id: 1,
        location: [6.1350, 43.1180], // Rue Victor Hugo
        service: 600, // 10 minutes pickup
        delivery: [1],
        time_windows: [[30600, 32400]], // 8h30 - 9h00
        skills: [1],
        priority: 90
      },
      {
        id: 2,
        location: [6.1200, 43.1300], // Avenue du Maréchal Juin
        service: 900,
        delivery: [1],
        time_windows: [[32400, 34200]], // 9h00 - 9h30
        skills: [1],
        priority: 85
      },
      {
        id: 3,
        location: [6.1400, 43.1100], // Carqueiranne centre
        service: 480,
        delivery: [1],
        time_windows: [[34200, 36000]], // 9h30 - 10h00
        skills: [1, 2],
        priority: 95
      },
      {
        id: 4,
        location: [6.1500, 43.1000], // La Londe-les-Maures
        service: 1200,
        delivery: [2],
        time_windows: [[36000, 39600]], // 10h00 - 11h00
        skills: [2],
        priority: 80
      },
      {
        id: 5,
        location: [6.1100, 43.1400], // Le Pradet
        service: 600,
        delivery: [1],
        time_windows: [[39600, 41400]], // 11h00 - 11h30
        skills: [1],
        priority: 75
      },
      {
        id: 6,
        location: [6.1350, 43.1250], // Centre-ville Hyères
        service: 300,
        delivery: [1],
        time_windows: [[39600, 43200]], // 11h00 - 12h00
        skills: [1],
        priority: 70
      },
      {
        id: 7,
        location: [6.1450, 43.1150], // Giens
        service: 900,
        delivery: [1],
        time_windows: [[30600, 36000]], // 8h30 - 10h00
        skills: [1],
        priority: 65
      },
      {
        id: 8,
        location: [6.1380, 43.1280], // Hospital vicinity
        service: 1800,
        delivery: [2],
        time_windows: [[28800, 43200]], // 8h00 - 12h00
        skills: [2],
        priority: 100
      }
    ]
  },

  // Scenario 2: Long Distance - Inter-city transport
  longDistance: {
    name: "Long Distance Inter-City Transport",
    description: "Transport patients between cities in the Var region",
    vehicles: [
      {
        id: 1,
        start: [6.1286, 43.1205], // Hyères
        end: [6.1286, 43.1205],
        capacity: [4],
        time_window: [25200, 64800], // 7h00 - 18h00
        skills: [1, 2]
      },
      {
        id: 2,
        start: [6.1286, 43.1205],
        end: [6.1286, 43.1205],
        capacity: [2],
        time_window: [28800, 61200], // 8h00 - 17h00
        skills: [1, 2]
      }
    ],
    jobs: [
      {
        id: 1,
        location: [5.9282, 43.1242], // Toulon
        service: 1800, // 30 minutes at hospital
        delivery: [1],
        time_windows: [[32400, 36000]], // 9h00 - 10h00
        skills: [2],
        priority: 95
      },
      {
        id: 2,
        location: [5.8794, 43.1042], // La Seyne-sur-Mer
        service: 900,
        delivery: [1],
        time_windows: [[39600, 43200]], // 11h00 - 12h00
        skills: [1],
        priority: 80
      },
      {
        id: 3,
        location: [5.8394, 43.0942], // Six-Fours-les-Plages
        service: 1200,
        delivery: [2],
        time_windows: [[45000, 48600]], // 12h30 - 13h30
        skills: [1],
        priority: 90
      },
      {
        id: 4,
        location: [5.7583, 43.1356], // Bandol
        service: 600,
        delivery: [1],
        time_windows: [[50400, 54000]], // 14h00 - 15h00
        skills: [1],
        priority: 70
      },
      {
        id: 5,
        location: [5.9282, 43.1242], // Pickup in Toulon
        service: 300,
        delivery: [1],
        time_windows: [[54000, 57600]], // 15h00 - 16h00
        skills: [1],
        priority: 85
      }
    ]
  },

  // Scenario 3: Simple test with minimal data
  simpleTest: {
    name: "Simple Test - Basic Functionality",
    description: "Simple test with 2 vehicles and 3 jobs",
    vehicles: [
      {
        id: 1,
        start: [6.1286, 43.1205],
        end: [6.1286, 43.1205],
        capacity: [4],
        time_window: [25200, 64800],
        skills: [1]
      },
      {
        id: 2,
        start: [6.1286, 43.1205],
        end: [6.1286, 43.1205],
        capacity: [2],
        time_window: [25200, 64800],
        skills: [1, 2]
      }
    ],
    jobs: [
      {
        id: 1,
        location: [6.1350, 43.1180],
        service: 600,
        delivery: [1],
        time_windows: [[28800, 43200]],
        skills: [1],
        priority: 90
      },
      {
        id: 2,
        location: [6.1200, 43.1300],
        service: 900,
        delivery: [1],
        time_windows: [[28800, 43200]],
        skills: [1],
        priority: 80
      },
      {
        id: 3,
        location: [6.1400, 43.1100],
        service: 480,
        delivery: [2],
        time_windows: [[28800, 43200]],
        skills: [2],
        priority: 95
      }
    ]
  }
};

/**
 * Test suite execution functions
 */
export const optimizationTestSuite = {
  
  // Run individual scenario
  async runScenario(scenarioName) {
    console.log(`🚀 Running scenario: ${scenarioName}`);
    
    const scenario = TEST_SCENARIOS[scenarioName];
    if (!scenario) {
      throw new Error(`Scenario '${scenarioName}' not found`);
    }

    const startTime = Date.now();
    
    try {
      const result = await solveVRP(scenario);
      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        scenario: scenarioName,
        name: scenario.name,
        description: scenario.description,
        success: true,
        duration,
        result,
        vehicles: scenario.vehicles.length,
        jobs: scenario.jobs.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        scenario: scenarioName,
        name: scenario.name,
        description: scenario.description,
        success: false,
        duration,
        error: error.message,
        vehicles: scenario.vehicles.length,
        jobs: scenario.jobs.length,
        timestamp: new Date().toISOString()
      };
    }
  },

  // Run all scenarios
  async runAllScenarios() {
    console.log('🎯 Starting comprehensive optimization test suite...');
    
    const results = [];
    const scenarios = Object.keys(TEST_SCENARIOS);
    
    for (const scenarioName of scenarios) {
      try {
        const result = await this.runScenario(scenarioName);
        results.push(result);
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log(`✅ ${scenarioName}: ${result.success ? 'PASSED' : 'FAILED'} (${result.duration}ms)`);
      } catch (error) {
        console.error(`❌ ${scenarioName}: ERROR -`, error.message);
        results.push({
          scenario: scenarioName,
          success: false,
          error: error.message,
          duration: 0,
          timestamp: new Date().toISOString()
        });
      }
    }

    const summary = {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
      results
    };

    console.log(`📊 Test Suite Complete: ${summary.passed}/${summary.total} passed (${summary.totalDuration}ms total)`);
    return summary;
  },

  // Get scenario list
  getScenarios() {
    return Object.keys(TEST_SCENARIOS).map(key => ({
      key,
      name: TEST_SCENARIOS[key].name,
      description: TEST_SCENARIOS[key].description,
      vehicles: TEST_SCENARIOS[key].vehicles.length,
      jobs: TEST_SCENARIOS[key].jobs.length
    }));
  },

  // Get raw scenario data
  getScenarioData(scenarioName) {
    const scenario = TEST_SCENARIOS[scenarioName];
    if (!scenario) {
      throw new Error(`Scenario '${scenarioName}' not found`);
    }

    return scenario;
  }
};

/**
 * OSRM connectivity and performance tests
 */
export const osrmTestSuite = {
  
  async testConnectivity() {
    console.log('🔗 Testing OSRM connectivity...');
    
    const testCoordinates = [
      [6.1286, 43.1205], // Hyères Centre
      [6.1350, 43.1180]  // Hyères Nord
    ];

    try {
      const route = await getOSRMRoute(testCoordinates);
      return {
        success: true,
        duration: route.duration,
        distance: route.distance,
        message: 'OSRM connectivity test passed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'OSRM connectivity test failed'
      };
    }
  },

  async testMatrix() {
    console.log('📐 Testing OSRM matrix calculation...');
    
    const locations = [
      [6.1286, 43.1205], // Hyères Centre
      [6.1350, 43.1180], // Hyères Nord
      [6.1400, 43.1100], // Carqueiranne
      [6.1500, 43.1000]  // La Londe
    ];

    try {
      const matrix = await getOSRMMatrix(locations);
      return {
        success: true,
        matrixSize: locations.length,
        message: 'OSRM matrix test passed',
        sampleDuration: matrix.durations[0][1],
        sampleDistance: matrix.distances[0][1]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'OSRM matrix test failed'
      };
    }
  }
};

/**
 * Combined integration tests
 */
export const integrationTestSuite = {
  
  async runFullIntegrationTest() {
    console.log('🔄 Running full integration test (OSRM + VROOM)...');
    
    const results = {
      osrmConnectivity: await osrmTestSuite.testConnectivity(),
      osrmMatrix: await osrmTestSuite.testMatrix(),
      vroomOptimization: await optimizationTestSuite.runScenario('simpleTest'),
      timestamp: new Date().toISOString()
    };

    const allPassed = [
      results.osrmConnectivity.success,
      results.osrmMatrix.success,
      results.vroomOptimization.success
    ].every(success => success === true);

    return {
      ...results,
      overallSuccess: allPassed,
      summary: allPassed ? 'All integration tests passed' : 'Some integration tests failed'
    };
  }
};

// Export test scenarios for external use
export { TEST_SCENARIOS };

// Default export
export default {
  optimizationTestSuite,
  osrmTestSuite,
  integrationTestSuite,
  TEST_SCENARIOS
};

// Backward compatibility functions for OptimizationTester component
export async function runAllOptimizationTests() {
  return await optimizationTestSuite.runAllScenarios();
}

export async function runCompleteTestSuite() {
  return await integrationTestSuite.runFullIntegrationTest();
}

export async function testOSRMConnectivity() {
  return await osrmTestSuite.testConnectivity();
}

export async function testVROOMConnectivity() {
  try {
    const result = await optimizationTestSuite.runScenario('simpleTest');
    return {
      success: result.success,
      message: result.success ? 'VROOM connectivity test passed' : 'VROOM connectivity test failed',
      error: result.error
    };
  } catch (error) {
    return {
      success: false,
      message: 'VROOM connectivity test failed',
      error: error.message
    };
  }
}
