import React from 'react';
import { Clock, MapPin, User, AlertCircle } from 'lucide-react';

const VehicleSchedule = ({ vehicle, onTripClick, onAddTrip }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'conflict': return 'bg-red-500';
      case 'maintenance': return 'bg-gray-500';
      default: return 'bg-gray-300';
    }
  };

  const getTripColor = (type, status) => {
    if (type === 'conflict') return 'bg-red-500 hover:bg-red-600';
    if (status === 'completed') return 'bg-green-500 hover:bg-green-600';
    if (status === 'in-progress') return 'bg-blue-500 hover:bg-blue-600';
    return 'bg-blue-400 hover:bg-blue-500';
  };

  const formatTime = (time) => {
    return time;
  };

  const calculatePosition = (time) => {
    if (!time || typeof time !== 'string') {
      return 0; // Default position if time is invalid
    }
    
    const timeParts = time.split(':');
    if (timeParts.length !== 2) {
      return 0; // Default position if time format is invalid
    }
    
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    
    if (isNaN(hours) || isNaN(minutes)) {
      return 0; // Default position if time is invalid
    }
    
    const totalMinutes = (hours - 6) * 60 + minutes; // Start from 6 AM
    const dayMinutes = 14 * 60; // 6 AM to 8 PM = 14 hours
    return Math.max(0, Math.min(100, (totalMinutes / dayMinutes) * 100));
  };

  const calculateWidth = (duration) => {
    const dayMinutes = 14 * 60;
    return Math.min(100, (duration * 60 / dayMinutes) * 100);
  };

  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      {/* Vehicle Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(vehicle.status)}`}></div>
          <div>
            <h3 className="font-semibold text-gray-900">{vehicle.name}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{vehicle.type}</span>
              {vehicle.currentLocation && (
                <>
                  <span>•</span>
                  <MapPin className="h-3 w-3" />
                  <span>{vehicle.currentLocation}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {vehicle.status === 'conflict' && (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <span className="text-sm font-medium text-gray-600 capitalize">
            {vehicle.status}
          </span>
        </div>
      </div>

      {/* Time Scale */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>6h</span>
          <span>9h</span>
          <span>12h</span>
          <span>15h</span>
          <span>18h</span>
          <span>20h</span>
        </div>
        
        {/* Schedule Timeline */}
        <div className="relative h-12 bg-gray-50 rounded-lg border">
          {/* Current time indicator */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
            style={{ left: `${calculatePosition(new Date().toTimeString().slice(0, 5))}%` }}
          >
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-400 rounded-full"></div>
          </div>

          {/* Trips */}
          {vehicle.trips?.map((trip, index) => {
            const leftPosition = calculatePosition(trip.time);
            const width = calculateWidth(trip.duration);
            
            return (
              <div
                key={index}
                className={`absolute top-1 bottom-1 rounded text-xs text-white flex items-center justify-center font-medium cursor-pointer transition-all ${getTripColor(trip.type, trip.status)}`}
                style={{
                  left: `${leftPosition}%`,
                  width: `${width}%`,
                  minWidth: '60px'
                }}
                onClick={() => onTripClick && onTripClick(trip)}
                title={`${trip.patient} - ${trip.time} (${trip.duration}h)`}
              >
                <div className="truncate px-1">
                  {trip.patient}
                </div>
              </div>
            );
          })}

          {/* Available slots for new trips */}
          {vehicle.status === 'available' && (
            <button
              onClick={() => onAddTrip && onAddTrip(vehicle)}
              className="absolute top-2 bottom-2 right-2 bg-dashed bg-gray-200 hover:bg-gray-300 border-2 border-dashed border-gray-400 rounded text-xs text-gray-600 flex items-center justify-center transition-colors"
              style={{ width: '40px' }}
            >
              +
            </button>
          )}
        </div>
      </div>

      {/* Trip Details */}
      {vehicle.trips && vehicle.trips.length > 0 && (
        <div className="mt-3 space-y-1">
          {vehicle.trips.slice(0, 2).map((trip, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="font-medium">{trip.time}</span>
                <User className="h-3 w-3 text-gray-400" />
                <span>{trip.patient}</span>
              </div>
              <div className="flex items-center space-x-1">
                {trip.pickup && (
                  <span className="text-gray-500 text-xs">{trip.pickup}</span>
                )}
                {trip.status && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                    trip.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {trip.status}
                  </span>
                )}
              </div>
            </div>
          ))}
          {vehicle.trips.length > 2 && (
            <div className="text-xs text-gray-500 text-center">
              +{vehicle.trips.length - 2} autres courses
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VehicleSchedule;
