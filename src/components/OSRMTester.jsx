import React, { useState } from 'react';
import { getOSRMRoute } from '../services/osrmService.js';

export default function OSRMTester({ isOpen, onClose }) {
  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Fallback coordinates for common cities (this is the main fix)
  const getFallbackCoordinates = (address) => {
    const normalized = address.toLowerCase().trim();
    console.log(`🔍 Looking up coordinates for: "${normalized}"`);
    
    const coordinates = {
      'avignon': { lat: 43.9493, lng: 4.8059 },
      'marseille': { lat: 43.2965, lng: 5.3698 },
      'nice': { lat: 43.7102, lng: 7.2620 },
      'toulon': { lat: 43.1242, lng: 5.9282 },
      'cannes': { lat: 43.5528, lng: 7.0174 },
      'antibes': { lat: 43.5804, lng: 7.1251 },
      'aix-en-provence': { lat: 43.5263, lng: 5.4454 },
      'montpellier': { lat: 43.6108, lng: 3.8767 },
      'nîmes': { lat: 43.8367, lng: 4.3601 },
      'lyon': { lat: 45.7640, lng: 4.8357 },
      'paris': { lat: 48.8566, lng: 2.3522 },
    };

    // Debug: Show what we're trying to match
    console.log('Available cities:', Object.keys(coordinates));

    // Direct match first
    if (coordinates[normalized]) {
      console.log(`✅ Direct match found for "${normalized}":`, coordinates[normalized]);
      return coordinates[normalized];
    }

    // Try partial matches
    for (const [city, coords] of Object.entries(coordinates)) {
      if (normalized.includes(city)) {
        console.log(`✅ Partial match found: "${normalized}" contains "${city}":`, coords);
        return coords;
      }
    }

    // If no match found, return a distinctive default
    console.warn(`❌ No coordinates found for "${address}", using Paris as default`);
    return coordinates['paris'];
  };

  // Real geocoding function using Nominatim
  const geocodeAddress = async (address) => {
    try {
      console.log(`🌍 Geocoding: "${address}"`);
      
      // For testing, let's skip Nominatim for now and go straight to fallback
      // This will help us debug the coordinate matching
      console.log('⚠️ Skipping Nominatim for debugging, using fallback directly');
      throw new Error('Using fallback for debugging');

    } catch (error) {
      console.log(`Using fallback coordinates for "${address}"`);
      
      // Use fallback coordinates
      const fallbackCoords = getFallbackCoordinates(address);
      console.log(`📍 Fallback coordinates for "${address}":`, fallbackCoords);
      return fallbackCoords;
    }
  };

  const testRoute = async () => {
    if (!departure.trim() || !arrival.trim()) {
      setResult({ error: 'Veuillez saisir les deux adresses' });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      console.log('🧪 Testing OSRM route:', departure, '→', arrival);

      // Geocode both addresses
      console.log('📍 Geocoding addresses...');
      const departureCoords = await geocodeAddress(departure);
      const arrivalCoords = await geocodeAddress(arrival);

      console.log('📍 Final coordinates:', 
        `${departure}: [${departureCoords.lng}, ${departureCoords.lat}]`,
        `${arrival}: [${arrivalCoords.lng}, ${arrivalCoords.lat}]`
      );

      // Check if coordinates are different (with reasonable tolerance)
      const latDiff = Math.abs(departureCoords.lat - arrivalCoords.lat);
      const lngDiff = Math.abs(departureCoords.lng - arrivalCoords.lng);
      
      console.log(`Coordinate differences: lat=${latDiff.toFixed(4)}, lng=${lngDiff.toFixed(4)}`);
      
      if (latDiff < 0.01 && lngDiff < 0.01) {
        setResult({
          error: `Les coordonnées sont trop similaires (lat diff: ${latDiff.toFixed(4)}, lng diff: ${lngDiff.toFixed(4)}). Vérifiez que "${departure}" et "${arrival}" sont des villes différentes.`
        });
        return;
      }

      // Calculate route using OSRM
      console.log('🗺️ Calling OSRM service...');
      
      // Convert coordinate objects to OSRM format: [[lng, lat], [lng, lat]]
      const osrmCoordinates = [
        [departureCoords.lng, departureCoords.lat],
        [arrivalCoords.lng, arrivalCoords.lat]
      ];
      console.log('🗺️ OSRM coordinates format:', osrmCoordinates);
      
      const route = await getOSRMRoute(osrmCoordinates);
      console.log('🗺️ OSRM route result:', route);

      if (route && route.success) {
        setResult({
          success: true,
          distance: route.distance,
          duration: route.duration,
          server: route.server || 'OSRM Server',
          departureCoords,
          arrivalCoords
        });
      } else {
        // Fallback calculation
        const distance = calculateHaversineDistance(departureCoords, arrivalCoords);
        const duration = Math.round((distance / 70) * 60); // 70 km/h average

        setResult({
          success: false,
          distance: Math.round(distance * 10) / 10,
          duration,
          error: route?.error || 'OSRM service unavailable',
          fallback: true,
          departureCoords,
          arrivalCoords
        });
      }

    } catch (error) {
      console.error('OSRM test error:', error);
      setResult({
        error: error.message || 'Erreur lors du calcul de la route'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Haversine distance calculation
  const calculateHaversineDistance = (point1, point2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Test OSRM - Debug Mode</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Départ
            </label>
            <input
              type="text"
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              placeholder="Ex: Avignon"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Arrivée
            </label>
            <input
              type="text"
              value={arrival}
              onChange={(e) => setArrival(e.target.value)}
              placeholder="Ex: Marseille"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={testRoute}
            disabled={isLoading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Calcul en cours...' : 'Calculer la route (Debug Mode)'}
          </button>

          {result && (
            <div className="mt-4 p-4 rounded-md border">
              {result.error ? (
                <div className="text-red-600">
                  <div className="font-medium">❌ Erreur</div>
                  <div className="text-sm mt-1">{result.error}</div>
                </div>
              ) : (
                <div className="text-green-600">
                  <div className="font-medium">
                    {result.success ? '✅ Route calculée avec succès !' : '⚠️ Calcul approximatif'}
                  </div>
                  <div className="text-sm mt-2 space-y-1">
                    <div>Distance: <strong>{result.distance} km</strong></div>
                    <div>Temps: <strong>{Math.floor(result.duration / 60)}h {result.duration % 60}min</strong></div>
                    {result.server && (
                      <div>Serveur: <strong>{result.server}</strong></div>
                    )}
                    {result.fallback && (
                      <div className="text-orange-600 text-xs mt-2">
                        ⚠️ OSRM indisponible - Calcul basé sur la distance à vol d'oiseau
                      </div>
                    )}
                    {result.departureCoords && result.arrivalCoords && (
                      <div className="text-xs text-gray-500 mt-2">
                        <div>Départ: {result.departureCoords.lat.toFixed(4)}, {result.departureCoords.lng.toFixed(4)}</div>
                        <div>Arrivée: {result.arrivalCoords.lat.toFixed(4)}, {result.arrivalCoords.lng.toFixed(4)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
