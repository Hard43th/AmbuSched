import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, CheckCircle, XCircle, AlertCircle, Server, Terminal, ExternalLink } from 'lucide-react';
import { testOSRMConnection, getOSRMStartInstructions, getOSRMStatus } from '../services/osrmService';
import { testVROOMConnection, getVROOMStartInstructions, getVROOMStatus, testVROOMOptimization } from '../services/vroomService';

const ServerManager = () => {
  const [osrmStatus, setOsrmStatus] = useState({
    local: { available: false, responseTime: null, error: null },
    fallback: { available: false, responseTime: null, error: null }
  });
  
  const [vroomStatus, setVroomStatus] = useState({
    local: { available: false, responseTime: null, error: null },
    fallbacks: []
  });

  const [testing, setTesting] = useState(false);
  const [vroomTestResult, setVroomTestResult] = useState(null);
  const [showInstructions, setShowInstructions] = useState({ osrm: false, vroom: false });

  const testServers = async () => {
    setTesting(true);
    try {
      const [osrmResult, vroomResult] = await Promise.all([
        testOSRMConnection(),
        testVROOMConnection()
      ]);
      
      setOsrmStatus(osrmResult);
      setVroomStatus(vroomResult);
    } catch (error) {
      console.error('Server testing error:', error);
    } finally {
      setTesting(false);
    }
  };

  const runVroomTest = async () => {
    if (!vroomStatus.local.available && !vroomStatus.fallbacks.some(f => f.available)) {
      alert('No VROOM servers available for testing');
      return;
    }

    setTesting(true);
    try {
      const result = await testVROOMOptimization();
      setVroomTestResult(result);
    } catch (error) {
      setVroomTestResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    testServers();
  }, []);

  const getStatusIcon = (available, error) => {
    if (available) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (error) return <XCircle className="h-5 w-5 text-red-500" />;
    return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  };

  const osrmInstructions = getOSRMStartInstructions();
  const vroomInstructions = getVROOMStartInstructions();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Server className="h-6 w-6" />
            Server Management
          </h2>
          <button
            onClick={testServers}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
            Test Servers
          </button>
        </div>

        {/* OSRM Status */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">OSRM (Routing Server)</h3>
            <button
              onClick={() => setShowInstructions(prev => ({ ...prev, osrm: !prev.osrm }))}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {showInstructions.osrm ? 'Hide' : 'Show'} Setup Instructions
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Local OSRM */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Local Server</h4>
                {getStatusIcon(osrmStatus.local.available, osrmStatus.local.error)}
              </div>
              <p className="text-sm text-gray-600 mb-1">
                URL: <code className="bg-gray-200 px-1 rounded">http://localhost:5000</code>
              </p>
              {osrmStatus.local.responseTime && (
                <p className="text-sm text-gray-600 mb-1">
                  Response time: {osrmStatus.local.responseTime}ms
                </p>
              )}
              {osrmStatus.local.error && (
                <p className="text-sm text-red-600">Error: {osrmStatus.local.error}</p>
              )}
            </div>

            {/* Fallback OSRM */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Fallback Server</h4>
                {getStatusIcon(osrmStatus.fallback.available, osrmStatus.fallback.error)}
              </div>
              <p className="text-sm text-gray-600 mb-1">
                URL: <code className="bg-gray-200 px-1 rounded">router.project-osrm.org</code>
              </p>
              {osrmStatus.fallback.responseTime && (
                <p className="text-sm text-gray-600 mb-1">
                  Response time: {osrmStatus.fallback.responseTime}ms
                </p>
              )}
              {osrmStatus.fallback.error && (
                <p className="text-sm text-red-600">Error: {osrmStatus.fallback.error}</p>
              )}
            </div>
          </div>

          {showInstructions.osrm && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                OSRM Setup Instructions
              </h4>
              <div className="space-y-2 text-sm">
                {osrmInstructions.instructions.map((instruction, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-blue-600 font-mono text-xs mt-1">{index + 1}.</span>
                    <span className="text-blue-800">{instruction}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-100 rounded border">
                <p className="text-xs text-blue-700 mb-2">Docker Command:</p>
                <code className="text-xs text-blue-900 break-all">{osrmInstructions.dockerCommand}</code>
              </div>
              <div className="mt-3 p-3 bg-blue-100 rounded border">
                <p className="text-xs text-blue-700 mb-1">Data Path:</p>
                <code className="text-xs text-blue-900">{osrmInstructions.dataPath}</code>
              </div>
            </div>
          )}
        </div>

        {/* VROOM Status */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">VROOM (Optimization Server)</h3>
            <div className="flex gap-2">
              <button
                onClick={runVroomTest}
                disabled={testing}
                className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                <Play className="h-3 w-3" />
                Test Optimization
              </button>
              <button
                onClick={() => setShowInstructions(prev => ({ ...prev, vroom: !prev.vroom }))}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {showInstructions.vroom ? 'Hide' : 'Show'} Setup Instructions
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Local VROOM */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Local Server</h4>
                {getStatusIcon(vroomStatus.local.available, vroomStatus.local.error)}
              </div>
              <p className="text-sm text-gray-600 mb-1">
                URL: <code className="bg-gray-200 px-1 rounded">http://localhost:3000</code>
              </p>
              {vroomStatus.local.responseTime && (
                <p className="text-sm text-gray-600 mb-1">
                  Response time: {vroomStatus.local.responseTime}ms
                </p>
              )}
              {vroomStatus.local.error && (
                <p className="text-sm text-red-600">Error: {vroomStatus.local.error}</p>
              )}
            </div>

            {/* Fallback VROOM Servers */}
            {vroomStatus.fallbacks.map((fallback, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Fallback {index + 1}</h4>
                  {getStatusIcon(fallback.available, fallback.error)}
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  URL: <code className="bg-gray-200 px-1 rounded text-xs">{fallback.url}</code>
                </p>
                {fallback.responseTime && (
                  <p className="text-sm text-gray-600 mb-1">
                    Response time: {fallback.responseTime}ms
                  </p>
                )}
                {fallback.error && (
                  <p className="text-sm text-red-600">Error: {fallback.error}</p>
                )}
              </div>
            ))}
          </div>

          {vroomTestResult && (
            <div className={`mb-4 p-4 rounded-lg border ${
              vroomTestResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                {vroomTestResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                VROOM Optimization Test Result
              </h4>
              {vroomTestResult.success ? (
                <div className="text-sm space-y-1">
                  <p><strong>Server Used:</strong> {vroomTestResult.serverUsed || 'Unknown'}</p>
                  <p><strong>Computation Time:</strong> {vroomTestResult.computationTime}ms</p>
                  <p><strong>Routes Generated:</strong> {vroomTestResult.routesCount}</p>
                  <p><strong>Jobs Assigned:</strong> {vroomTestResult.assignedJobs}</p>
                  <p><strong>Total Cost:</strong> {vroomTestResult.totalCost}</p>
                </div>
              ) : (
                <p className="text-sm text-red-700">Error: {vroomTestResult.error}</p>
              )}
            </div>
          )}

          {showInstructions.vroom && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                VROOM Setup Instructions
              </h4>
              <div className="space-y-2 text-sm">
                {vroomInstructions.instructions.map((instruction, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-green-600 font-mono text-xs mt-1">{index + 1}.</span>
                    <span className="text-green-800">{instruction}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-green-100 rounded border">
                <p className="text-xs text-green-700 mb-2">Docker Command:</p>
                <code className="text-xs text-green-900 break-all">{vroomInstructions.dockerCommand}</code>
              </div>
              <div className="mt-3 space-y-2">
                <div className="p-3 bg-green-100 rounded border">
                  <p className="text-xs text-green-700 mb-1">Prerequisites:</p>
                  <ul className="text-xs text-green-900 list-disc list-inside space-y-1">
                    {vroomInstructions.prerequisites.map((prereq, index) => (
                      <li key={index}>{prereq}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Integration Status */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-purple-900 mb-3">Integration Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-purple-800 mb-2">OSRM ➜ VROOM</h4>
              <p className="text-purple-700">
                VROOM uses OSRM for routing calculations. Both servers should be running for optimal performance.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-purple-800 mb-2">Current Setup</h4>
              <p className="text-purple-700">
                {osrmStatus.local.available && vroomStatus.local.available 
                  ? '✅ Both local servers are running - optimal performance'
                  : osrmStatus.local.available 
                    ? '⚠️ Only OSRM is running locally - VROOM will use fallback'
                    : vroomStatus.local.available
                      ? '⚠️ Only VROOM is running locally - limited routing accuracy'
                      : '❌ No local servers running - using fallback servers'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerManager;
