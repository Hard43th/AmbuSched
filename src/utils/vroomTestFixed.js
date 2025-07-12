// Quick VROOM test with clean, working format
// This will verify that our VROOM integration is working

import { solveVRP } from '../services/vroomService.js';

export async function testVROOMFixed() {
  console.log('🧪 Testing VROOM with fully corrected format...');
  
  const vroomData = {
    vehicles: [
      {
        id: 1,
        start: [6.1286, 43.1205],
        end: [6.1286, 43.1205],
        capacity: [4],
        time_window: [28800, 43200],
        skills: [1]
      },
      {
        id: 2,
        start: [6.1286, 43.1205],
        end: [6.1286, 43.1205],
        capacity: [2],
        time_window: [28800, 43200],
        skills: [1, 2]
      },
      {
        id: 3,
        start: [6.1400, 43.1100],
        end: [6.1400, 43.1100],
        capacity: [4],
        time_window: [28800, 43200],
        skills: [1]
      }
    ],
    jobs: [
      {
        id: 1,
        location: [6.1350, 43.1180],
        service: 600,
        delivery: [1],
        time_windows: [[30600, 32400]],
        skills: [1],
        priority: 90
      },
      {
        id: 2,
        location: [6.1200, 43.1250],
        service: 900,
        delivery: [1],
        time_windows: [[32400, 34200]],
        skills: [1],
        priority: 80
      },
      {
        id: 3,
        location: [6.1180, 43.1220],
        service: 300,
        delivery: [1],
        time_windows: [[29700, 31500]],
        skills: [2],
        priority: 100
      },
      {
        id: 4,
        location: [6.1450, 43.1050],
        service: 1200,
        delivery: [1],
        time_windows: [[34200, 36000]],
        skills: [1],
        priority: 70
      },
      {
        id: 5,
        location: [6.1320, 43.1160],
        service: 480,
        delivery: [1],
        time_windows: [[36000, 37800]],
        skills: [1],
        priority: 60
      },
      {
        id: 6,
        location: [6.1100, 43.1300],
        service: 1800,
        delivery: [1],
        time_windows: [[37800, 39600]],
        skills: [1],
        priority: 80
      },
      {
        id: 7,
        location: [6.1380, 43.1140],
        service: 360,
        delivery: [1],
        time_windows: [[39600, 41400]],
        skills: [1],
        priority: 50
      },
      {
        id: 8,
        location: [6.1250, 43.1190],
        service: 720,
        delivery: [1],
        time_windows: [[41400, 43200]],
        skills: [1],
        priority: 65
      }
    ],
    options: {
      g: false
    }
  };

  try {
    console.log('📤 Sending corrected data to VROOM...');
    console.log(`   - Vehicles: ${vroomData.vehicles.length}`);
    console.log(`   - Jobs: ${vroomData.jobs.length}`);
    
    const result = await solveVRP(vroomData);

    if (result.success) {
      console.log('✅ VROOM optimization successful!');
      console.log(`   - Total cost: ${result.solution.summary.cost}`);
      console.log(`   - Routes: ${result.solution.routes.length}`);
      console.log(`   - Assigned jobs: ${result.solution.summary.routes}`);
      console.log(`   - Unassigned jobs: ${result.solution.summary.unassigned}`);
      
      result.solution.routes.forEach((route, index) => {
        const jobCount = route.steps.filter(step => step.type === 'job').length;
        console.log(`   Route ${index + 1} (Vehicle ${route.vehicle}): ${jobCount} jobs, ${(route.duration / 60).toFixed(0)} min`);
      });
      
      return true;
    } else {
      console.log('❌ VROOM optimization failed:', result.error);
      return false;
    }

  } catch (error) {
    console.log('❌ VROOM test failed:', error.message);
    return false;
  }
}
