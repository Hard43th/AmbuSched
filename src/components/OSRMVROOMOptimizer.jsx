import React, { useState, useEffect } from 'react';
import { 
  optimizeWithOSRMAndVROOM, 
  smartOptimize,
  getOptimizationServiceStatus 
} from '../utils/routeOptimization';
import { Clock, MapPin, Truck, Zap, CheckCircle, AlertCircle, Info } from 'lucide-react';

const OSRMVROOMOptimizer = ({ trips = [], vehicles = [] }) => {
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [error, setError] = useState(null);
  const [optimizationMethod, setOptimizationMethod] = useState('smart');

  // Check service status on component mount
  useEffect(() => {
    checkServiceStatus();
  }, []);

  const checkServiceStatus = async () => {
    try {
      const status = await getOptimizationServiceStatus();
      setServiceStatus(status);
    } catch (err) {
      console.error('Failed to check service status:', err);
    }
  };

  const runOptimization = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let result;
      
      switch (optimizationMethod) {
        case 'osrm-vroom':
          result = await optimizeWithOSRMAndVROOM(trips, vehicles);
          break;
        case 'smart':
        default:
          result = await smartOptimize(trips, vehicles);
          break;
      }
      
      setOptimizationResult(result);
    } catch (err) {
      setError(err.message);
      console.error('Optimization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const ServiceStatusCard = ({ service, info }) => (
    <div className={`p-4 rounded-lg border ${info.available ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">{info.service}</h4>
        <div className={`flex items-center ${info.available ? 'text-green-600' : 'text-red-600'}`}>
          {info.available ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="ml-1 text-sm font-medium">{info.status}</span>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-2">{info.baseUrl}</p>
      <div className="space-y-1">
        {info.features?.slice(0, 3).map((feature, index) => (
          <div key={index} className="text-xs text-gray-500 flex items-center">
            <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
            {feature}
          </div>
        ))}
      </div>
    </div>
  );

  const OptimizationResults = ({ result }) => {
    if (!result) return null;

    const assignedTrips = result.results?.filter(r => r.status === 'assigned') || [];
    const unassignedTrips = result.results?.filter(r => r.status === 'unassigned') || [];

    return (
      <div className="space-y-6">
        {/* Summary Statistics */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-blue-600" />
            Optimization Results
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{result.summary?.assignmentRate || 0}%</div>
              <div className="text-sm text-gray-600">Assignment Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{result.summary?.totalDistance || 0}km</div>
              <div className="text-sm text-gray-600">Total Distance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{Math.round(result.summary?.totalDuration || 0)}min</div>
              <div className="text-sm text-gray-600">Total Duration</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{result.computationTime || 0}ms</div>
              <div className="text-sm text-gray-600">Computation Time</div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Algorithm Used:</span>
              <span className="font-medium text-gray-900">{result.algorithm}</span>
            </div>
            {result.realWorldRouting && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600">Real-world Routing:</span>
                <span className="font-medium text-green-600">✓ Enabled</span>
              </div>
            )}
            {result.stateOfTheArt && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600">State-of-the-art VRP:</span>
                <span className="font-medium text-green-600">✓ VROOM</span>
              </div>
            )}
          </div>
        </div>

        {/* Assigned Trips */}
        {assignedTrips.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Assigned Trips ({assignedTrips.length})
            </h4>
            <div className="space-y-3">
              {assignedTrips.slice(0, 5).map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="font-medium text-gray-900">{result.trip.patient}</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                          result.trip.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          result.trip.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {result.trip.priority}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {result.trip.pickup} → {result.trip.destination}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Truck className="w-4 h-4 mr-1" />
                        {result.assignment.vehicle.name} ({result.assignment.vehicle.type})
                        <Clock className="w-4 h-4 ml-4 mr-1" />
                        {result.trip.pickupTime || result.trip.time}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        {result.assignment.optimization.score}/100
                      </div>
                      <div className="text-xs text-gray-500">Optimization Score</div>
                      {result.assignment.optimization.details?.totalDistance && (
                        <div className="text-xs text-gray-500 mt-1">
                          {Math.round(result.assignment.optimization.details.totalDistance * 10) / 10}km
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {assignedTrips.length > 5 && (
                <div className="text-center text-sm text-gray-500">
                  ... and {assignedTrips.length - 5} more assigned trips
                </div>
              )}
            </div>
          </div>
        )}

        {/* Unassigned Trips */}
        {unassignedTrips.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
              Unassigned Trips ({unassignedTrips.length})
            </h4>
            <div className="space-y-3">
              {unassignedTrips.map((result, index) => (
                <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex items-center mb-2">
                    <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="font-medium text-gray-900">{result.trip.patient}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {result.trip.pickup} → {result.trip.destination}
                  </div>
                  <div className="text-sm text-red-600">
                    Reason: {result.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          OSRM + VROOM Route Optimization
        </h1>
        <p className="text-gray-600">
          Real-world routing with state-of-the-art Vehicle Routing Problem solving
        </p>
      </div>

      {/* Service Status */}
      {serviceStatus && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Service Status
          </h2>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <ServiceStatusCard service="OSRM" info={serviceStatus.services.osrm} />
            <ServiceStatusCard service="VROOM" info={serviceStatus.services.vroom} />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Info className="w-4 h-4 mr-2 text-blue-600" />
              <span className="font-medium text-blue-900">Recommended Method</span>
            </div>
            <p className="text-blue-800 text-sm">
              {serviceStatus.recommendedMethod === 'optimizeWithOSRMAndVROOM' ? 
                'Full OSRM + VROOM optimization (optimal quality)' :
                serviceStatus.recommendedMethod === 'optimizeWithOSRMOnly' ?
                'OSRM routing with greedy assignment (good quality)' :
                'Basic optimization (fallback mode)'
              }
            </p>
          </div>
        </div>
      )}

      {/* Optimization Controls */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Optimization Controls</h2>
        
        <div className="flex items-center space-x-4 mb-4">
          <label className="flex items-center">
            <input 
              type="radio" 
              value="smart" 
              checked={optimizationMethod === 'smart'} 
              onChange={(e) => setOptimizationMethod(e.target.value)}
              className="mr-2"
            />
            Smart Optimization (Recommended)
          </label>
          <label className="flex items-center">
            <input 
              type="radio" 
              value="osrm-vroom" 
              checked={optimizationMethod === 'osrm-vroom'} 
              onChange={(e) => setOptimizationMethod(e.target.value)}
              className="mr-2"
            />
            Force OSRM + VROOM
          </label>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={runOptimization}
            disabled={loading || trips.length === 0 || vehicles.length === 0}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Optimizing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Run Optimization
              </>
            )}
          </button>
          
          <button 
            onClick={checkServiceStatus}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center"
          >
            <Info className="w-4 h-4 mr-2" />
            Refresh Status
          </button>

          <div className="text-sm text-gray-600">
            {trips.length} trips, {vehicles.length} vehicles
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
            <span className="font-medium text-red-900">Optimization Error</span>
          </div>
          <p className="text-red-800 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Optimization Results */}
      <OptimizationResults result={optimizationResult} />

      {/* Usage Instructions */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">How to Use OSRM + VROOM</h3>
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <strong>1. OSRM Setup:</strong>
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>Public server: Uses <code>router.project-osrm.org</code> (limited usage)</li>
              <li>Production: Deploy your own OSRM server with French road data</li>
              <li>Docker: <code>docker run -p 5000:5000 osrm/osrm-backend</code></li>
            </ul>
          </div>
          <div>
            <strong>2. VROOM Setup:</strong>
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>Public server: Uses <code>solver.vroom-project.org</code> (limited usage)</li>
              <li>Production: Deploy VROOM server with custom constraints</li>
              <li>Docker: <code>docker run -p 3000:3000 vroomvrp/vroom-docker</code></li>
            </ul>
          </div>
          <div>
            <strong>3. Benefits:</strong>
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>Real-world routing data (traffic, road restrictions)</li>
              <li>State-of-the-art VRP optimization algorithms</li>
              <li>Automatic fallback to basic optimization if services unavailable</li>
              <li>Support for complex constraints (time windows, vehicle capacities)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OSRMVROOMOptimizer;
