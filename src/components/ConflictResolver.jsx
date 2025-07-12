import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Car, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  ArrowRight,
  Lightbulb,
  Users,
  Route,
  Zap
} from 'lucide-react';
import { resolveConflicts } from '../utils/routeOptimization';

const ConflictResolver = ({ conflictingTrips, vehicles, allTrips, onResolutionApplied, onClose }) => {
  const [resolutions, setResolutions] = useState({});
  const [isResolving, setIsResolving] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);

  useEffect(() => {
    if (conflictingTrips.length > 0) {
      generateResolutions();
    }
  }, [conflictingTrips, vehicles]);

  const generateResolutions = async () => {
    setIsResolving(true);
    const newResolutions = {};

    for (const trip of conflictingTrips) {
      try {
        const resolution = await resolveConflicts(trip, vehicles, allTrips);
        newResolutions[trip.id] = resolution;
      } catch (error) {
        console.error(`Error resolving conflicts for trip ${trip.id}:`, error);
        newResolutions[trip.id] = {
          hasConflicts: true,
          resolutionStrategies: [],
          error: error.message
        };
      }
    }

    setResolutions(newResolutions);
    setIsResolving(false);
  };

  const applyResolution = async (tripId, strategyIndex, optionIndex) => {
    const resolution = resolutions[tripId];
    const strategy = resolution.resolutionStrategies[strategyIndex];
    const option = strategy.options[optionIndex];

    if (onResolutionApplied) {
      onResolutionApplied(tripId, strategy.type, option);
    }

    // Remove resolved trip from the list
    const updatedResolutions = { ...resolutions };
    delete updatedResolutions[tripId];
    setResolutions(updatedResolutions);
  };

  const getStrategyIcon = (type) => {
    switch (type) {
      case 'time_adjustment': return Clock;
      case 'vehicle_change': return Car;
      case 'reschedule_existing': return RefreshCw;
      case 'trip_optimization': return Route;
      default: return Lightbulb;
    }
  };

  const getStrategyColor = (type) => {
    switch (type) {
      case 'time_adjustment': return 'text-blue-600';
      case 'vehicle_change': return 'text-green-600';
      case 'reschedule_existing': return 'text-yellow-600';
      case 'trip_optimization': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const formatTimeChange = (option) => {
    if (option.newTime) {
      return `Nouveau créneau: ${option.newTime} (${option.impact} impact)`;
    }
    return 'Modification d\'horaire';
  };

  const formatVehicleChange = (option) => {
    const conflictText = option.conflicts > 0 ? ` (${option.conflicts} conflits)` : '';
    return `${option.vehicle} (${option.vehicleType})${conflictText} - Score: ${option.optimizationScore}`;
  };

  const formatRescheduling = (option) => {
    return `Déplacer "${option.tripToReschedule.patient}" de ${option.tripToReschedule.oldTime} à ${option.tripToReschedule.newTime}`;
  };

  const formatOptimization = (option) => {
    return `${option.description} - Économies: ${option.estimatedSavings}€`;
  };

  if (conflictingTrips.length === 0) {
    return null; // Don't show anything if no conflicts
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
            Résolution des conflits ({conflictingTrips.length})
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Modal Content */}
        <div className="space-y-6 max-h-96 overflow-y-auto">
          <div className="bg-white rounded-lg">
            {isResolving && (
              <div className="flex items-center justify-center text-blue-600 mb-4">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Analyse en cours...
              </div>
            )}

            <div className="space-y-6">
              {conflictingTrips.map(trip => {
                const resolution = resolutions[trip.id];
                
                return (
                  <div key={trip.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-red-900">
                          {trip.patient} - {trip.pickupTime || trip.time}
                        </h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          trip.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          trip.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {trip.priority}
                        </span>
                      </div>
                      <div className="text-sm text-red-700">
                        <p>{trip.pickup} → {trip.destination}</p>
                        <p>Type de véhicule requis: {trip.vehicleType}</p>
                        {trip.conflictReason && (
                          <p className="font-medium mt-1">Raison: {trip.conflictReason}</p>
                        )}
                      </div>
                    </div>

                    {resolution && !isResolving ? (
                      resolution.error ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <p className="text-gray-600">Erreur lors de l'analyse: {resolution.error}</p>
                        </div>
                      ) : resolution.resolutionStrategies.length > 0 ? (
                        <div className="space-y-4">
                          <h5 className="font-medium text-gray-900">Solutions proposées:</h5>
                          
                          {resolution.resolutionStrategies.map((strategy, strategyIndex) => {
                            const StrategyIcon = getStrategyIcon(strategy.type);
                            const colorClass = getStrategyColor(strategy.type);
                            
                            return (
                              <div key={strategyIndex} className="border border-gray-200 rounded-lg">
                                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                                  <div className="flex items-center">
                                    <StrategyIcon className={`h-5 w-5 ${colorClass} mr-2`} />
                                    <span className="font-medium text-gray-900">{strategy.description}</span>
                                    {strategyIndex === 0 && (
                                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                        Recommandé
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="p-4 space-y-3">
                                  {strategy.options.map((option, optionIndex) => (
                                    <div key={optionIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                                      <div className="flex-1">
                                        {strategy.type === 'time_adjustment' && (
                                          <p className="text-sm text-gray-700">{formatTimeChange(option)}</p>
                                        )}
                                        {strategy.type === 'vehicle_change' && (
                                          <p className="text-sm text-gray-700">{formatVehicleChange(option)}</p>
                                        )}
                                        {strategy.type === 'reschedule_existing' && (
                                          <p className="text-sm text-gray-700">{formatRescheduling(option)}</p>
                                        )}
                                        {strategy.type === 'trip_optimization' && (
                                          <p className="text-sm text-gray-700">{formatOptimization(option)}</p>
                                        )}
                                      </div>
                                      
                                      <button
                                        onClick={() => applyResolution(trip.id, strategyIndex, optionIndex)}
                                        className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Appliquer
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <XCircle className="h-5 w-5 text-yellow-600 mr-2" />
                            <p className="text-yellow-800">Aucune solution automatique trouvée</p>
                          </div>
                          <p className="text-yellow-700 text-sm mt-1">
                            Cette course nécessite une intervention manuelle ou doit être reportée.
                          </p>
                        </div>
                      )
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <RefreshCw className="h-4 w-4 animate-spin text-gray-600 mr-2" />
                          <p className="text-gray-600">Recherche de solutions...</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Lightbulb className="h-5 w-5 text-blue-600 mr-2" />
              <h4 className="font-medium text-blue-900">Conseils pour éviter les conflits</h4>
            </div>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Planifiez les courses urgentes en priorité</li>
              <li>• Laissez des créneaux de 15-30 minutes entre les courses</li>
              <li>• Vérifiez la disponibilité des véhicules avant l'assignation</li>
              <li>• Utilisez l'optimisation automatique pour une meilleure répartition</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictResolver;
