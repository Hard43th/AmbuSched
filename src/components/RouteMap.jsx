import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Add CSS for selected vehicle animation
const selectedVehicleStyle = `
  .selected-vehicle-icon {
    animation: pulse 2s infinite;
    filter: drop-shadow(0 0 8px #0066ff);
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = selectedVehicleStyle;
  document.head.appendChild(styleSheet);
}

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const vehicleIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3202/3202003.png',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const selectedVehicleIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3202/3202003.png',
  iconSize: [40, 40], // Larger for selected vehicle
  iconAnchor: [20, 20],
  className: 'selected-vehicle-icon'
});

const pickupIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/447/447031.png',
  iconSize: [25, 25],
  iconAnchor: [12, 25],
});

const destinationIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [25, 25],
  iconAnchor: [12, 25],
});

const RouteMap = ({ trips, vehicles, optimizationResult, selectedVehicle, visibleRoutes = new Set() }) => {
  // Carpentras/Avignon area center coordinates
  const center = [44.1, 4.95];
  const zoom = 10;

  // Color palette for different routes
  const routeColors = ['#ff0000', '#00ff00', '#0000ff', '#ff8000', '#8000ff', '#00ffff'];

  const getRouteColor = (vehicleId) => {
    return routeColors[(vehicleId - 1) % routeColors.length];
  };

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
          <span>Véhicules</span>
        </div>
        {selectedVehicle && (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-blue-800"></div>
            <span className="font-medium text-blue-600">{selectedVehicle.name} sélectionné</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <span>Points de départ</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <span>Destinations</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 bg-gray-600" style={{borderTop: '2px dashed #666'}}></div>
          <span>Trajets individuels</span>
        </div>
        {optimizationResult && optimizationResult.routes && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-blue-600"></div>
            <span>Routes optimisées (trajets complets)</span>
          </div>
        )}
        {selectedVehicle && (
          <div className="text-blue-600 font-medium ml-4">
            🔍 Mode focus: seuls les trajets de {selectedVehicle.name} sont affichés
          </div>
        )}
      </div>
      
      {/* Map */}
      <div className="h-96 w-full border rounded-lg overflow-hidden relative z-0">
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%', zIndex: 0 }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Vehicle markers */}
        {vehicles.map(vehicle => {
          const isSelected = selectedVehicle?.id === vehicle.id;
          return (
            <Marker 
              key={`vehicle-${vehicle.id}`} 
              position={[vehicle.coordinates[1], vehicle.coordinates[0]]} 
              icon={isSelected ? selectedVehicleIcon : vehicleIcon}
              zIndexOffset={isSelected ? 1000 : 0}
            >
              <Popup>
                <div>
                  <h3 className="font-semibold">
                    {vehicle.name}
                    {isSelected && <span className="ml-2 text-blue-600">📍 Sélectionné</span>}
                  </h3>
                  <p className="text-sm text-gray-600">{vehicle.type}</p>
                  <p className="text-xs text-gray-500">{vehicle.location}</p>
                  {optimizationResult && optimizationResult.routes && (
                    <p className="text-xs text-blue-600 mt-1">
                      {optimizationResult.routes.find(r => r.vehicle === vehicle.id)?.steps?.filter(s => s.type === 'pickup').length || 0} courses assignées
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Trip markers */}
        {trips.map(trip => {
          // Check if this trip is assigned to the selected vehicle
          const isAssignedToSelected = selectedVehicle && optimizationResult?.routes?.find(route => 
            route.vehicle === selectedVehicle.id && 
            route.steps?.some(step => step.type === 'pickup' && step.id === trip.id * 10 + 1)
          );
          
          // If a vehicle is selected, only show trips assigned to it
          if (selectedVehicle && !isAssignedToSelected) {
            return null;
          }
          
          return (
            <React.Fragment key={`trip-${trip.id}`}>
              {/* Pickup marker */}
              <Marker 
                position={[trip.coordinates[1], trip.coordinates[0]]} 
                icon={pickupIcon}
                opacity={selectedVehicle && !isAssignedToSelected ? 0.3 : 1}
              >
                <Popup>
                  <div>
                    <h4 className="font-semibold text-sm">{trip.patient}</h4>
                    <p className="text-xs text-gray-600">Départ: {trip.pickup}</p>
                    <p className="text-xs text-gray-600">Heure: {trip.time}</p>
                    <p className="text-xs">
                      <span className={`px-1 py-0.5 rounded text-xs ${
                        trip.priority === 'high' ? 'bg-red-100 text-red-800' :
                        trip.priority === 'normal' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {trip.priority}
                      </span>
                    </p>
                    {isAssignedToSelected && (
                      <p className="text-xs text-blue-600 mt-1 font-medium">
                        📋 Assigné à {selectedVehicle.name}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
              
              {/* Destination marker */}
              <Marker 
                position={[trip.destinationCoords[1], trip.destinationCoords[0]]} 
                icon={destinationIcon}
                opacity={selectedVehicle && !isAssignedToSelected ? 0.3 : 1}
              >
                <Popup>
                  <div>
                    <h4 className="font-semibold text-sm">{trip.patient}</h4>
                  <p className="text-xs text-gray-600">Destination: {trip.destination}</p>
                  {isAssignedToSelected && (
                    <p className="text-xs text-blue-600 mt-1 font-medium">
                      📋 Assigné à {selectedVehicle.name}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
            
            {/* Trip route line */}
            <Polyline 
              positions={[
                [trip.coordinates[1], trip.coordinates[0]],
                [trip.destinationCoords[1], trip.destinationCoords[0]]
              ]}
              color="#666666"
              weight={2}
              opacity={selectedVehicle && !isAssignedToSelected ? 0.3 : 0.7}
              dashArray="5, 5"
            />
          </React.Fragment>
          );
        })}

        {/* Optimized routes */}
        {optimizationResult && optimizationResult.routes && optimizationResult.routes.map((route, index) => {
          const vehicle = vehicles.find(v => v.id === route.vehicle);
          const color = getRouteColor(route.vehicle);
          const isSelectedVehicle = selectedVehicle?.id === route.vehicle;
          const isVisible = visibleRoutes.has(route.vehicle);
          
          if (!route.steps || !vehicle) return null;
          
          // If a vehicle is selected, only show its route
          if (selectedVehicle && !isSelectedVehicle) return null;
          
          // If route is not visible, don't render it
          if (!isVisible) return null;
          
          // Create route path including vehicle start and all job locations
          const routePath = [vehicle.coordinates];
          
          route.steps.forEach(step => {
            if (step.type === 'pickup') {
              const trip = trips.find(t => t.id * 10 + 1 === step.id); // Convert pickup ID back to trip ID
              if (trip) {
                routePath.push(trip.coordinates); // Add pickup location
              }
            } else if (step.type === 'delivery') {
              const trip = trips.find(t => t.id * 10 + 2 === step.id); // Convert delivery ID back to trip ID
              if (trip) {
                routePath.push(trip.destinationCoords); // Add delivery location
              }
            }
          });
          
          // Add return to vehicle base
          routePath.push(vehicle.coordinates);

          return (
            <Polyline
              key={`route-${index}`}
              positions={routePath.map(coord => [coord[1], coord[0]])}
              color={isSelectedVehicle ? '#0066ff' : color}
              weight={isSelectedVehicle ? 6 : 4}
              opacity={isSelectedVehicle ? 1 : 0.8}
            />
          );
        })}
      </MapContainer>
      </div>
    </div>
  );
};

export default RouteMap;
