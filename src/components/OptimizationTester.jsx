import React, { useState, useRef } from 'react';
import { Play, TestTube, Clock, MapPin, Route, Users, AlertTriangle, CheckCircle, XCircle, Trash2, Zap, Activity, Globe } from 'lucide-react';
import { 
  runCompleteTestSuite, 
  runAllOptimizationTests, 
  testOSRMConnectivity, 
  testVROOMConnectivity,
  TEST_SCENARIOS 
} from '../utils/optimizationTests.js';
import { 
  generateStressTestScenario,
  runPerformanceBenchmark,
  runServiceHealthCheck,
  runRealWorldSimulation
} from '../utils/advancedOptimizationTests.js';
import { diagnosticVROOMTest } from '../services/vroomService.js';

const OptimizationTester = ({ isOpen, onClose }) => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState(null);
  const [currentTest, setCurrentTest] = useState('');
  const logRef = useRef(null);

  if (!isOpen) return null;

  // Capture console.log output for display
  const originalConsoleLog = console.log;
  const logs = useRef([]);

  const captureConsoleLog = (enable) => {
    if (enable) {
      logs.current = [];
      console.log = (...args) => {
        logs.current.push(args.join(' '));
        originalConsoleLog(...args);
        if (logRef.current) {
          logRef.current.scrollTop = logRef.current.scrollHeight;
        }
      };
    } else {
      console.log = originalConsoleLog;
    }
  };

  const clearLogs = () => {
    logs.current = [];
    setResults(null);
  };

  const runTest = async (testType) => {
    setTesting(true);
    setResults(null);
    captureConsoleLog(true);

    try {
      let result;
      switch (testType) {
        case 'complete':
          setCurrentTest('Complete Test Suite');
          result = await runCompleteTestSuite();
          break;
        case 'optimization':
          setCurrentTest('Optimization Tests');
          result = await runAllOptimizationTests();
          break;
        case 'osrm':
          setCurrentTest('OSRM Connectivity');
          result = await testOSRMConnectivity();
          break;
        case 'vroom':
          setCurrentTest('VROOM Connectivity');
          result = await testVROOMConnectivity();
          break;
        case 'vroomdiag':
          setCurrentTest('VROOM Diagnostic');
          result = await diagnosticVROOMTest();
          break;
        case 'performance':
          setCurrentTest('Performance Benchmark');
          const stressScenario = generateStressTestScenario(8, 25);
          result = await runPerformanceBenchmark(stressScenario);
          break;
        case 'health':
          setCurrentTest('Service Health Check');
          result = await runServiceHealthCheck();
          break;
        case 'realworld':
          setCurrentTest('Real-World Simulation');
          result = await runRealWorldSimulation();
          break;
        case 'stress':
          setCurrentTest('Stress Test');
          const largeScenario = generateStressTestScenario(15, 50);
          result = { scenario: largeScenario, message: 'Stress test scenario generated' };
          console.log(`Generated stress test: ${largeScenario.vehicles.length} vehicles, ${largeScenario.jobs.length} jobs`);
          break;
        default:
          throw new Error('Unknown test type');
      }
      
      setResults({ success: true, data: result, type: testType });
    } catch (error) {
      setResults({ success: false, error: error.message, type: testType });
    } finally {
      captureConsoleLog(false);
      setTesting(false);
      setCurrentTest('');
    }
  };

  const getScenarioIcon = (scenario) => {
    switch (scenario) {
      case 'morningRush': return <Clock className="h-4 w-4" />;
      case 'longDistance': return <Route className="h-4 w-4" />;
      case 'peakCapacity': return <Users className="h-4 w-4" />;
      case 'timeConstraints': return <AlertTriangle className="h-4 w-4" />;
      default: return <TestTube className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <TestTube className="h-6 w-6 text-blue-600" />
            Optimization Test Suite
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left Panel - Test Controls */}
          <div className="w-1/3 border-r flex flex-col">
            <div className="p-6 overflow-y-auto flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Test Controls</h3>
            
            {/* Quick Tests */}
            <div className="space-y-3 mb-6">
              <h4 className="font-medium text-gray-700">Quick Tests</h4>
              
              <button
                onClick={() => runTest('osrm')}
                disabled={testing}
                className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <MapPin className="h-4 w-4" />
                Test OSRM
              </button>
              
              <button
                onClick={() => runTest('vroom')}
                disabled={testing}
                className="w-full flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Route className="h-4 w-4" />
                Test VROOM
              </button>
              
              <button
                onClick={() => runTest('vroomdiag')}
                disabled={testing}
                className="w-full flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                <Activity className="h-4 w-4" />
                VROOM Diagnostic
              </button>
            </div>

            {/* Optimization Tests */}
            <div className="space-y-3 mb-6">
              <h4 className="font-medium text-gray-700">Optimization Tests</h4>
              
              <button
                onClick={() => runTest('optimization')}
                disabled={testing}
                className="w-full flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <TestTube className="h-4 w-4" />
                All Scenarios
              </button>
              
              <button
                onClick={() => runTest('complete')}
                disabled={testing}
                className="w-full flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Complete Suite
              </button>
            </div>

            {/* Advanced Tests */}
            <div className="space-y-3 mb-6">
              <h4 className="font-medium text-gray-700">Advanced Tests</h4>
              
              <button
                onClick={() => runTest('health')}
                disabled={testing}
                className="w-full flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                <Activity className="h-4 w-4" />
                Health Check
              </button>
              
              <button
                onClick={() => runTest('performance')}
                disabled={testing}
                className="w-full flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                <Zap className="h-4 w-4" />
                Performance Test
              </button>
              
              <button
                onClick={() => runTest('realworld')}
                disabled={testing}
                className="w-full flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                <Globe className="h-4 w-4" />
                Real-World Sim
              </button>
              
              <button
                onClick={() => runTest('stress')}
                disabled={testing}
                className="w-full flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <AlertTriangle className="h-4 w-4" />
                Stress Test
              </button>
            </div>

            {/* Test Scenarios Overview */}
            <div className="space-y-3 mb-6">
              <h4 className="font-medium text-gray-700">Test Scenarios</h4>
              
              {Object.entries(TEST_SCENARIOS).map(([key, scenario]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {getScenarioIcon(key)}
                    <span className="font-medium text-sm">{scenario.name}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{scenario.description}</p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>🚗 {scenario.vehicles.length} vehicles</span>
                    <span>📍 {scenario.jobs.length} jobs</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h5 className="font-medium text-blue-900 mb-2">💡 Test Guide</h5>
              <div className="text-xs text-blue-800 space-y-1">
                <p><strong>Quick Tests:</strong> Basic connectivity checks</p>
                <p><strong>Optimization:</strong> Core routing scenarios</p>
                <p><strong>Health Check:</strong> Full system diagnostics</p>
                <p><strong>Performance:</strong> Speed & memory benchmarks</p>
                <p><strong>Real-World:</strong> Simulated daily operations</p>
                <p><strong>Stress Test:</strong> High-load scenarios</p>
              </div>
            </div>

            {/* Current Test Status */}
            {testing && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <div className="animate-spin">
                    <TestTube className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Running: {currentTest}</span>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Right Panel - Results and Logs */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Results Summary */}
            {results && (
              <div className="p-6 border-b bg-gray-50 flex-shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  {results.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <h4 className="font-medium">
                    {results.success ? 'Test Completed Successfully' : 'Test Failed'}
                  </h4>
                </div>
                
                {results.success ? (
                  <div className="text-sm text-gray-600">
                    {results.type === 'complete' && (
                      <div className="space-y-1">
                        <p>✅ Connectivity tests completed</p>
                        <p>📊 Optimization scenarios: {results.data.optimization?.length || 0}</p>
                        <p>⚡ All systems operational</p>
                      </div>
                    )}
                    {results.type === 'optimization' && Array.isArray(results.data) && (
                      <div className="space-y-1">
                        <p>📊 Scenarios tested: {results.data.length}</p>
                        <p>✅ Successful: {results.data.filter(r => r.success).length}</p>
                        <p>❌ Failed: {results.data.filter(r => !r.success).length}</p>
                      </div>
                    )}
                    {results.type === 'osrm' && (
                      <div className="space-y-1">
                        <p>🗺️ Route test: {results.data.osrmRoute ? '✅' : '❌'}</p>
                        <p>📊 Matrix test: {results.data.osrmMatrix ? '✅' : '❌'}</p>
                      </div>
                    )}
                    {results.type === 'vroom' && (
                      <p>🚛 VROOM optimization: {results.data ? '✅' : '❌'}</p>
                    )}
                    {results.type === 'vroomdiag' && (
                      <div className="space-y-1">
                        <p>🔍 Basic Health: {results.data.localServer?.basicHealthCheck ? '✅' : '❌'}</p>
                        <p>🚛 Optimization: {results.data.localServer?.optimizationTest ? '✅' : '❌'}</p>
                        <p>⚡ Response Time: {results.data.localServer?.responseTime || 'N/A'}ms</p>
                        <p>💡 Recommendations: {results.data.recommendations?.length || 0}</p>
                      </div>
                    )}
                    {results.type === 'health' && (
                      <div className="space-y-1">
                        <p>🏥 Overall Health: {results.data.overallHealth}</p>
                        <p>📊 Services Available: {results.data.servicesAvailable}/{results.data.totalServices}</p>
                        <p>🔍 Recommendations: {results.data.recommendations?.length || 0}</p>
                      </div>
                    )}
                    {results.type === 'performance' && (
                      <div className="space-y-1">
                        <p>🏃‍♂️ Vehicles: {results.data.vehicleCount}</p>
                        <p>📍 Jobs: {results.data.jobCount}</p>
                        <p>⚡ OSRM: {Math.round(results.data.osrmPerformance || 0)}ms</p>
                        <p>🚛 VROOM: {Math.round(results.data.vroomPerformance || 0)}ms</p>
                        <p>🧠 Smart Optimize: {Math.round(results.data.smartOptimizePerformance || 0)}ms</p>
                      </div>
                    )}
                    {results.type === 'realworld' && (
                      <div className="space-y-1">
                        <p>🎬 Scenarios: {results.data.summary?.successfulScenarios}/{results.data.summary?.totalScenarios}</p>
                        <p>📊 Assignment Rate: {results.data.summary?.overallAssignmentRate}%</p>
                        <p>⚡ Avg Time: {results.data.summary?.averageExecutionTime}ms</p>
                        <p>📍 Total Trips: {results.data.summary?.totalTrips}</p>
                      </div>
                    )}
                    {results.type === 'stress' && (
                      <div className="space-y-1">
                        <p>🚗 Vehicles: {results.data.scenario?.vehicles.length}</p>
                        <p>📍 Jobs: {results.data.scenario?.jobs.length}</p>
                        <p>✅ Scenario generated successfully</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-red-600">Error: {results.error}</p>
                )}
              </div>
            )}

            {/* Console Log Output */}
            <div className="flex-1 p-6 min-h-0">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-700">Test Output</h4>
                <button
                  onClick={clearLogs}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </button>
              </div>
              <div 
                ref={logRef}
                className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg h-full overflow-y-auto border border-gray-300"
                style={{ minHeight: '400px', maxHeight: 'calc(100vh - 400px)' }}
              >
                {logs.current.length > 0 ? (
                  <div className="space-y-1">
                    {logs.current.map((log, index) => (
                      <div key={index} className="whitespace-pre-wrap break-words">
                        {log}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-8">
                    <TestTube className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No test output yet.</p>
                    <p className="text-xs mt-1">Run a test to see detailed results here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationTester;
