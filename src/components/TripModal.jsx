import React, { useState } from 'react';
import { X, MapPin, Clock, User, Car, Phone, AlertCircle, Zap, Route } from 'lucide-react';
import { findBestVehicleAssignment, calculateOptimizationScore } from '../utils/routeOptimization';

const TripModal = ({ isOpen, onClose, onSave, trip, vehicles, patients }) => {
  const [formData, setFormData] = useState({
    patient: trip?.patient || '',
    patientPhone: trip?.patientPhone || '',
    pickup: trip?.pickup || '',
    destination: trip?.destination || '',
    pickupTime: trip?.pickupTime || '',
    vehicleType: trip?.vehicleType || 'VSL',
    priority: trip?.priority || 'normal',
    notes: trip?.notes || '',
    estimatedDuration: trip?.estimatedDuration || 1,
    ...trip
  });

  const [validation, setValidation] = useState({});
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validation[field]) {
      setValidation(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.patient) errors.patient = 'Patient requis';
    if (!formData.pickup) errors.pickup = 'Adresse de départ requise';
    if (!formData.destination) errors.destination = 'Destination requise';
    if (!formData.pickupTime) errors.pickupTime = 'Heure de prise en charge requise';
    
    setValidation(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  const handleTestInsertion = async () => {
    if (validateForm()) {
      setIsOptimizing(true);
      try {
        const result = await findBestVehicleAssignment(formData, vehicles);
        setOptimizationResult(result);
        
        if (result.success) {
          const assignment = result.recommended;
          const details = assignment.optimization.details;
          
          const message = `🎯 Optimisation réussie!\n\n` +
            `✅ Véhicule recommandé: ${assignment.vehicle.name} (${assignment.vehicle.type})\n` +
            `📊 Score d'optimisation: ${assignment.optimization.score}/100\n\n` +
            `📍 Distance vers pickup: ${details.distanceToPickup} km\n` +
            `🛣️ Distance trajet: ${details.tripDistance} km\n` +
            `⏱️ Temps total estimé: ${details.totalTime} min\n` +
            `⛽ Coût carburant: ${details.fuelCost}€\n` +
            `🕐 Arrivée estimée: ${details.estimatedArrival}\n\n` +
            (details.conflicts.length > 0 ? 
              `⚠️ Conflits détectés: ${details.conflicts.length}\n${details.conflicts.map(c => `• ${c.message}`).join('\n')}` :
              `✅ Aucun conflit détecté`
            );
          
          alert(message);
        } else {
          alert(`❌ Optimisation échouée:\n${result.message}\n\nAlternatives disponibles: ${result.alternatives?.length || 0}`);
        }
      } catch (error) {
        alert(`❌ Erreur lors de l'optimisation:\n${error.message}`);
      } finally {
        setIsOptimizing(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {trip ? 'Modifier la course' : 'Ajouter une course'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Patient Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="h-4 w-4 inline mr-1" />
                  Patient *
                </label>
                {patients ? (
                  <select
                    value={formData.patient}
                    onChange={(e) => handleChange('patient', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      validation.patient ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Sélectionner un patient</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.name}>
                        {patient.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.patient}
                    onChange={(e) => handleChange('patient', e.target.value)}
                    placeholder="Nom du patient"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      validation.patient ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                )}
                {validation.patient && (
                  <p className="text-red-500 text-xs mt-1">{validation.patient}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.patientPhone}
                  onChange={(e) => handleChange('patientPhone', e.target.value)}
                  placeholder="Numéro de téléphone"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Location Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Adresse de départ *
                </label>
                <input
                  type="text"
                  value={formData.pickup}
                  onChange={(e) => handleChange('pickup', e.target.value)}
                  placeholder="Adresse de prise en charge"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validation.pickup ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {validation.pickup && (
                  <p className="text-red-500 text-xs mt-1">{validation.pickup}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Destination *
                </label>
                <input
                  type="text"
                  value={formData.destination}
                  onChange={(e) => handleChange('destination', e.target.value)}
                  placeholder="Destination"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validation.destination ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {validation.destination && (
                  <p className="text-red-500 text-xs mt-1">{validation.destination}</p>
                )}
              </div>
            </div>

            {/* Trip Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Heure de prise en charge *
                </label>
                <input
                  type="time"
                  value={formData.pickupTime}
                  onChange={(e) => handleChange('pickupTime', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validation.pickupTime ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {validation.pickupTime && (
                  <p className="text-red-500 text-xs mt-1">{validation.pickupTime}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Car className="h-4 w-4 inline mr-1" />
                  Type de véhicule
                </label>
                <select
                  value={formData.vehicleType}
                  onChange={(e) => handleChange('vehicleType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="VSL">VSL</option>
                  <option value="Ambulance">Ambulance</option>
                  <option value="Taxi">Taxi médical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Priorité
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Basse</option>
                  <option value="normal">Normale</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                placeholder="Informations complémentaires, instructions spéciales..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Estimated Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée estimée (heures)
              </label>
              <input
                type="number"
                min="0.5"
                max="8"
                step="0.5"
                value={formData.estimatedDuration}
                onChange={(e) => handleChange('estimatedDuration', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleTestInsertion}
              disabled={isOptimizing}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-500 flex items-center"
            >
              {isOptimizing ? (
                <Route className="h-4 w-4 mr-2 animate-pulse" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {isOptimizing ? 'Optimisation...' : 'Tester l\'insertion'}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {trip ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TripModal;
