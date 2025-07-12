import React, { useState, useEffect } from 'react';
import { 
  Route, 
  Zap, 
  Clock, 
  MapPin, 
  Fuel, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  Target
} from 'lucide-react';
import { 
  findBestVehicleAssignment, 
  optimizeMultipleTrips, 
  calculateOptimizationScore 
} from '../utils/routeOptimization';

const RouteOptimizer = ({ trips, vehicles, onOptimizationComplete }) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [vehicleAssignments, setVehicleAssignments] = useState([]);
  const [showDetails, setShowDetails] = useState(false);

  // Auto-optimization for single trip
  const optimizeSingleTrip = async (trip) => {
    setIsOptimizing(true);
    try {
      const result = await findBestVehicleAssignment(trip, vehicles);
      setVehicleAssignments([result]);
      setSelectedTrip(trip);
      setShowDetails(true);
    } catch (error) {
      console.error('Optimization error:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Batch optimization for all unassigned trips
  const optimizeAllTrips = async () => {
    setIsOptimizing(true);
    try {
      const unassignedTrips = trips.filter(trip => trip.status === 'unassigned');
      const results = await optimizeMultipleTrips(unassignedTrips, vehicles);
      setOptimizationResults(results);
      setShowDetails(true);
      
      if (onOptimizationComplete) {
        onOptimizationComplete(results);
      }
    } catch (error) {
      console.error('Batch optimization error:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const OptimizationSummary = ({ summary }) => (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
          Résultats d'optimisation
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          summary.assignmentRate >= 90 ? 'bg-green-100 text-green-800' :
          summary.assignmentRate >= 70 ? 'bg-yellow-100 text-yellow-800' : 
          'bg-red-100 text-red-800'
        }`}>
          {summary.assignmentRate}% assigné
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{summary.assignedTrips}</div>
          <div className="text-sm text-gray-600">Courses assignées</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{summary.unassignedTrips}</div>
          <div className="text-sm text-gray-600">Non assignées</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{summary.totalDistance} km</div>
          <div className="text-sm text-gray-600">Distance totale</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{summary.averageOptimizationScore}/100</div>
          <div className="text-sm text-gray-600">Score moyen</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          Temps total: {Math.round(summary.totalTime / 60)}h {summary.totalTime % 60}min
        </div>
        <div className="flex items-center">
          <Fuel className="h-4 w-4 mr-1" />
          Coût carburant estimé: {summary.estimatedFuelCost}€
        </div>
      </div>
    </div>
  );

  const VehicleAssignmentCard = ({ assignment, trip }) => {
    const { vehicle, optimization } = assignment;
    const details = optimization.details;

    return (
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              optimization.score >= 80 ? 'bg-green-500' :
              optimization.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <h4 className="font-medium text-gray-900">{vehicle.name}</h4>
            <span className="ml-2 text-sm text-gray-500">({vehicle.type})</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              optimization.score >= 80 ? 'bg-green-100 text-green-800' :
              optimization.score >= 60 ? 'bg-yellow-100 text-yellow-800' : 
              'bg-red-100 text-red-800'
            }`}>
              Score: {optimization.score}/100
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1 text-gray-400" />
            <span>{details.distanceToPickup}km vers pickup</span>
          </div>
          <div className="flex items-center">
            <Route className="h-4 w-4 mr-1 text-gray-400" />
            <span>{details.tripDistance}km trajet</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1 text-gray-400" />
            <span>{details.totalTime}min total</span>
          </div>
          <div className="flex items-center">
            <Fuel className="h-4 w-4 mr-1 text-gray-400" />
            <span>{details.fuelCost}€ carburant</span>
          </div>
        </div>

        {details.conflicts && details.conflicts.length > 0 && (
          <div className="mt-3 p-2 bg-red-50 rounded">
            <div className="flex items-center text-red-700 text-sm">
              <AlertTriangle className="h-4 w-4 mr-1" />
              {details.conflicts.length} conflit(s) détecté(s)
            </div>
            {details.conflicts.map((conflict, index) => (
              <div key={index} className="text-xs text-red-600 ml-5">
                {conflict.message}
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 text-xs text-gray-500">
          Arrivée estimée: {details.estimatedArrival}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Optimization Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-blue-600" />
            Optimisation des trajets
          </h2>
          <div className="flex space-x-3">
            <button
              onClick={optimizeAllTrips}
              disabled={isOptimizing || trips.filter(t => t.status === 'unassigned').length === 0}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
            >
              {isOptimizing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Target className="h-4 w-4 mr-2" />
              )}
              Optimiser tout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            <span>{trips.filter(t => t.status === 'assigned').length} courses assignées</span>
          </div>
          <div className="flex items-center">
            <XCircle className="h-4 w-4 mr-2 text-red-600" />
            <span>{trips.filter(t => t.status === 'unassigned').length} courses en attente</span>
          </div>
          <div className="flex items-center">
            <Route className="h-4 w-4 mr-2 text-blue-600" />
            <span>{vehicles.filter(v => v.status === 'available').length} véhicules disponibles</span>
          </div>
        </div>
      </div>

      {/* Optimization Results */}
      {optimizationResults && showDetails && (
        <div>
          <OptimizationSummary summary={optimizationResults.summary} />
          
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Détails des assignations</h3>
            </div>
            <div className="p-6">
              {optimizationResults.results.map((result, index) => (
                <div key={index} className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-gray-900">{result.trip.patient}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {result.trip.pickup} → {result.trip.destination}
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      result.status === 'assigned' ? 'bg-green-100 text-green-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {result.status === 'assigned' ? 'Assigné' : 'Non assigné'}
                    </span>
                  </div>
                  
                  {result.assignment ? (
                    <VehicleAssignmentCard 
                      assignment={result.assignment} 
                      trip={result.trip}
                    />
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                      {result.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Single Trip Assignment Results */}
      {vehicleAssignments.length > 0 && selectedTrip && !optimizationResults && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Assignation pour {selectedTrip.patient}
            </h3>
          </div>
          <div className="p-6">
            {vehicleAssignments[0].success ? (
              <div>
                <VehicleAssignmentCard 
                  assignment={vehicleAssignments[0].recommended} 
                  trip={selectedTrip}
                />
                
                {vehicleAssignments[0].alternatives.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-3">Alternatives</h4>
                    {vehicleAssignments[0].alternatives.map((alt, index) => (
                      <VehicleAssignmentCard 
                        key={index}
                        assignment={alt} 
                        trip={selectedTrip}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
                {vehicleAssignments[0].message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteOptimizer;
