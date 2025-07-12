import React, { useState } from 'react';
import { Settings, Clock, Zap, RefreshCw, Info } from 'lucide-react';

const TimeWindowConfigPanel = ({ 
  isOpen, 
  onClose, 
  onConfigChange, 
  currentConfig,
  lastOptimizationResult 
}) => {
  const [config, setConfig] = useState({
    appointmentBufferBefore: 30,
    appointmentBufferAfter: 30,
    maxReturnWaitTime: 240,
    bufferBetweenAppointments: 20,
    bufferBetweenReturns: 10,
    bufferMixed: 15,
    allowConflictPenalty: true,
    conflictPenaltyScore: 50,
    minAssignmentScore: 15,
    workingHours: { start: 6, end: 22 },
    ...currentConfig
  });

  const [presetMode, setPresetMode] = useState('balanced');

  if (!isOpen) return null;

  const presets = {
    strict: {
      appointmentBufferBefore: 45,
      appointmentBufferAfter: 45,
      maxReturnWaitTime: 180,
      bufferBetweenAppointments: 30,
      bufferBetweenReturns: 20,
      bufferMixed: 25,
      allowConflictPenalty: false,
      conflictPenaltyScore: 100,
      minAssignmentScore: 30,
      description: 'Conservative scheduling with large buffers'
    },
    balanced: {
      appointmentBufferBefore: 30,
      appointmentBufferAfter: 30,
      maxReturnWaitTime: 240,
      bufferBetweenAppointments: 20,
      bufferBetweenReturns: 10,
      bufferMixed: 15,
      allowConflictPenalty: true,
      conflictPenaltyScore: 50,
      minAssignmentScore: 15,
      description: 'Good balance between assignments and realistic scheduling'
    },
    aggressive: {
      appointmentBufferBefore: 15,
      appointmentBufferAfter: 15,
      maxReturnWaitTime: 300,
      bufferBetweenAppointments: 10,
      bufferBetweenReturns: 5,
      bufferMixed: 8,
      allowConflictPenalty: true,
      conflictPenaltyScore: 25,
      minAssignmentScore: 10,
      description: 'Maximum assignments with tight scheduling'
    }
  };

  const handlePresetChange = (preset) => {
    setPresetMode(preset);
    setConfig(prev => ({ ...prev, ...presets[preset] }));
  };

  const handleConfigUpdate = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onConfigChange(config);
  };

  const getAssignmentRateColor = (rate) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Configuration des Fenêtres Temporelles</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Results Display */}
          {lastOptimizationResult && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Résultats de la Dernière Optimisation
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Taux d'affectation:</span>
                  <span className={`ml-2 font-semibold ${getAssignmentRateColor(lastOptimizationResult.assignmentRate)}`}>
                    {lastOptimizationResult.assignmentRate || 0}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Courses affectées:</span>
                  <span className="ml-2 font-semibold">{lastOptimizationResult.assignedTrips || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Courses non affectées:</span>
                  <span className="ml-2 font-semibold text-red-600">{lastOptimizationResult.unassignedTrips || 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Preset Selection */}
          <div>
            <h3 className="font-semibold mb-3">Modes Prédéfinis</h3>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(presets).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => handlePresetChange(key)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    presetMode === key
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium capitalize">{key}</div>
                  <div className="text-xs text-gray-600 mt-1">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Time Window Configuration */}
          <div className="grid grid-cols-2 gap-6">
            {/* Appointment Time Windows */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Fenêtres Temporelles - Rendez-vous
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tampon avant RDV (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={config.appointmentBufferBefore}
                    onChange={(e) => handleConfigUpdate('appointmentBufferBefore', parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Temps pour récupérer le patient avant le RDV
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tampon après RDV (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={config.appointmentBufferAfter}
                    onChange={(e) => handleConfigUpdate('appointmentBufferAfter', parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Temps pour le retour après le RDV
                  </div>
                </div>
              </div>
            </div>

            {/* Return Trip Configuration */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Voyages de Retour
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temps d'attente max pour retour (minutes)
                  </label>
                  <input
                    type="number"
                    min="60"
                    max="480"
                    value={config.maxReturnWaitTime || 240}
                    onChange={(e) => handleConfigUpdate('maxReturnWaitTime', parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Temps maximum que le patient peut attendre pour être récupéré
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Buffer Times Between Trips */}
          <div>
            <h3 className="font-semibold mb-3">Temps Tampon Entre Courses</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RDV ↔ RDV (min)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={config.bufferBetweenAppointments}
                  onChange={(e) => handleConfigUpdate('bufferBetweenAppointments', parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retour ↔ Retour (min)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={config.bufferBetweenReturns}
                  onChange={(e) => handleConfigUpdate('bufferBetweenReturns', parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RDV ↔ Retour (min)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={config.bufferMixed}
                  onChange={(e) => handleConfigUpdate('bufferMixed', parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Conflict Resolution */}
          <div>
            <h3 className="font-semibold mb-3">Résolution des Conflits</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allowConflicts"
                  checked={config.allowConflictPenalty}
                  onChange={(e) => handleConfigUpdate('allowConflictPenalty', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="allowConflicts" className="text-sm font-medium">
                  Autoriser les conflits temporels avec pénalité
                </label>
              </div>

              {config.allowConflictPenalty && (
                <div className="ml-6 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pénalité de score
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={config.conflictPenaltyScore}
                      onChange={(e) => handleConfigUpdate('conflictPenaltyScore', parseInt(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Score minimum d'affectation
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={config.minAssignmentScore}
                      onChange={(e) => handleConfigUpdate('minAssignmentScore', parseInt(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Panel */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Conseils d'optimisation:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Réduisez les tampons pour augmenter le taux d'affectation</li>
                  <li>• Activez les conflits avec pénalité pour plus de flexibilité</li>
                  <li>• Utilisez le mode "Agressif" pour maximiser les affectations</li>
                  <li>• Surveillez les logs de la console pour comprendre les rejets</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Annuler
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => {
                handleApply();
                onClose();
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Appliquer & Fermer
            </button>
            <button
              onClick={handleApply}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Appliquer & Tester
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeWindowConfigPanel;
