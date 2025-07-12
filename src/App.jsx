import React, { useState, useEffect } from 'react';
import { Car, Clock, MapPin, Route, Zap, Navigation, Plus, Edit2, Trash2, Eye, EyeOff, Upload, X, RotateCcw, Settings } from 'lucide-react';
import { optimizeWithVRoomAdvanced } from './services/vroomService';
import { getRoute } from './services/osrmService';
import RouteMap from './components/RouteMap';
import FileUploadModal from './components/FileUploadModal';
import ToastNotification from './components/ToastNotification';
import TimeWindowConfigPanel from './components/TimeWindowConfigPanel';
import { processCoursesWithReturns, formatWaitingTime, calculateWaitingTime } from './utils/returnCourses';

export default function App() {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [tripDetails, setTripDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Modal states
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [showTimeWindowConfig, setShowTimeWindowConfig] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  
  // Toast notification state
  const [toast, setToast] = useState(null);
  
  // Time window configuration
  const [timeWindowConfig, setTimeWindowConfig] = useState({
    appointmentBufferBefore: 30,
    appointmentBufferAfter: 30,
    maxReturnWaitTime: 240,
    bufferBetweenAppointments: 20,
    bufferBetweenReturns: 10,
    bufferMixed: 15,
    allowConflictPenalty: true,
    conflictPenaltyScore: 50,
    minAssignmentScore: 15,
    workingHours: { start: 6, end: 22 }
  });
  
  // View states
  const [activeTab, setActiveTab] = useState('overview');
  const [resultsView, setResultsView] = useState('by-vehicle'); // 'by-vehicle' or 'by-time'
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [visibleRoutes, setVisibleRoutes] = useState(new Set());

  // Vehicles data
  const [vehicles, setVehicles] = useState([
    { 
      id: 1, 
      name: 'VSL 1', 
      type: 'VSL',
      location: 'Jonquières (84)',
      coordinates: [4.9072, 44.1142],
      capacity: 1
    },
    { 
      id: 2, 
      name: 'VSL 2', 
      type: 'VSL',
      location: 'Jonquières (84)',
      coordinates: [4.9072, 44.1142],
      capacity: 1
    },
    { 
      id: 3, 
      name: 'VSL 3', 
      type: 'VSL',
      location: 'Jonquières (84)',
      coordinates: [4.9072, 44.1142],
      capacity: 1
    }
  ]);

  // Courses data
  const [courses, setCourses] = useState([
    { id: 1, patient: 'Jean Dupont', pickup: 'Carpentras Centre', destination: 'CHU Avignon', coordinates: [5.0481, 44.2550], destinationCoords: [4.8050, 43.9320], appointmentTime: '06:15' },
    { id: 2, patient: 'Marie Martin', pickup: 'Monteux', destination: 'Clinique Rhône-Durance Avignon', coordinates: [5.0089, 44.0381], destinationCoords: [4.8200, 43.9400], appointmentTime: '06:45' },
    { id: 3, patient: 'Pierre Leroy', pickup: 'Pernes-les-Fontaines', destination: 'CHU Marseille La Timone', coordinates: [5.0589, 44.0061], destinationCoords: [5.3950, 43.2784], appointmentTime: '07:00' },
    { id: 4, patient: 'Sophie Blanc', pickup: 'L\'Isle-sur-la-Sorgue', destination: 'Hôpital Carpentras', coordinates: [5.0514, 43.9189], destinationCoords: [5.0520, 44.2580], appointmentTime: '07:30' },
    { id: 5, patient: 'Paul Moreau', pickup: 'Vedène', destination: 'Centre de dialyse Avignon', coordinates: [4.9011, 43.9789], destinationCoords: [4.8100, 43.9350], appointmentTime: '08:00' },
    { id: 6, patient: 'Claire Dubois', pickup: 'Sarrians', destination: 'CHU Marseille Nord', coordinates: [4.9750, 44.1531], destinationCoords: [5.4200, 43.3400], appointmentTime: '08:30' },
    { id: 7, patient: 'Henri Rousseau', pickup: 'Aubignan', destination: 'Clinique Bouchard Marseille', coordinates: [5.0267, 44.1042], destinationCoords: [5.3800, 43.2900], appointmentTime: '09:15' },
    { id: 8, patient: 'Lucie Bernard', pickup: 'Saint-Didier', destination: 'CHU Avignon', coordinates: [5.1089, 44.2461], destinationCoords: [4.8050, 43.9320], appointmentTime: '09:45' },
    { id: 9, patient: 'Michel Garnier', pickup: 'Mazan', destination: 'Polyclinique Marseille', coordinates: [5.1167, 44.0597], destinationCoords: [5.3900, 43.2950], appointmentTime: '10:30' },
    { id: 10, patient: 'Sylvie Lemoine', pickup: 'Mormoiron', destination: 'CHU Avignon Cardiologie', coordinates: [5.1844, 44.0714], destinationCoords: [4.8050, 43.9320], appointmentTime: '11:15' },
    { id: 11, patient: 'Robert Durand', pickup: 'Avignon Centre', destination: 'CHU Marseille La Conception', coordinates: [4.8096, 43.9493], destinationCoords: [5.3850, 43.2950], appointmentTime: '12:30' },
    { id: 12, patient: 'Nathalie Petit', pickup: 'Entraigues-sur-la-Sorgue', destination: 'Clinique Avignon', coordinates: [4.9250, 44.0106], destinationCoords: [4.8150, 43.9300], appointmentTime: '13:00' },
    { id: 13, patient: 'François Roux', pickup: 'Sorgues', destination: 'Hôpital Européen Marseille', coordinates: [4.8703, 44.0069], destinationCoords: [5.3700, 43.2800], appointmentTime: '13:30' },
    { id: 14, patient: 'Isabelle Girard', pickup: 'Le Thor', destination: 'Cabinet cardiologie Avignon', coordinates: [4.9939, 43.9289], destinationCoords: [4.8200, 43.9450], appointmentTime: '14:00' },
    { id: 15, patient: 'Thierry Faure', pickup: 'Châteauneuf-du-Pape', destination: 'Laboratoire Carpentras', coordinates: [4.8342, 44.0564], destinationCoords: [5.0500, 44.2600], appointmentTime: '14:45' }
  ]);

  // Calculate trip details using OSRM
  useEffect(() => {
    calculateTripDetails();
  }, [courses]);

  const calculateTripDetails = async () => {
    setLoadingDetails(true);
    const details = {};
    
    try {
      for (const course of courses) {
        try {
          const route = await getRoute([course.coordinates, course.destinationCoords]);
          
          // Calculate pickup time based on course type
          let pickupTimeInSeconds;
          let travelTimeWithBuffer;
          
          if (course.isReturnTrip) {
            // For return courses: pickup must be AFTER exitTime (stored in appointmentTime)
            // Allow some buffer time for vehicle to arrive after patient exits
            const exitTimeInSeconds = getTimeInSeconds(course.appointmentTime);
            const bufferTime = 15 * 60; // 15 minutes buffer
            pickupTimeInSeconds = exitTimeInSeconds + bufferTime;
            travelTimeWithBuffer = 15; // Buffer time in minutes
          } else {
            // For regular courses: pickup before appointment to arrive on time
            const appointmentTimeInSeconds = getTimeInSeconds(course.appointmentTime);
            travelTimeWithBuffer = Math.ceil(route.duration * 1.25);
            pickupTimeInSeconds = appointmentTimeInSeconds - (travelTimeWithBuffer * 60);
          }
          const pickupTime = formatTimeFromSeconds(pickupTimeInSeconds);
          
          details[course.id] = {
            distance: route.distance * 1000,
            duration: route.duration * 60,
            distanceKm: route.distance.toFixed(1),
            durationMin: route.duration,
            pickupTime: pickupTime,
            appointmentTime: course.appointmentTime,
            travelTimeWithBuffer: travelTimeWithBuffer
          };
        } catch (error) {
          console.error(`Error calculating route for course ${course.id}:`, error);
          const distance = calculateDistanceEstimate(course.coordinates, course.destinationCoords);
          const estimatedDurationMin = Math.round(distance * 2);
          
          // Calculate pickup time based on course type  
          let pickupTimeInSeconds;
          let travelTimeWithBuffer;
          
          if (course.isReturnTrip) {
            // For return courses: pickup must be AFTER exitTime
            const exitTimeInSeconds = getTimeInSeconds(course.appointmentTime);
            const bufferTime = 15 * 60; // 15 minutes buffer
            pickupTimeInSeconds = exitTimeInSeconds + bufferTime;
            travelTimeWithBuffer = 15; // Buffer time in minutes
          } else {
            // For regular courses: pickup before appointment
            const appointmentTimeInSeconds = getTimeInSeconds(course.appointmentTime);
            travelTimeWithBuffer = Math.ceil(estimatedDurationMin * 1.25);
            pickupTimeInSeconds = appointmentTimeInSeconds - (travelTimeWithBuffer * 60);
          }
          const pickupTime = formatTimeFromSeconds(pickupTimeInSeconds);
          
          details[course.id] = {
            distance: distance * 1000,
            duration: estimatedDurationMin * 60,
            distanceKm: distance.toFixed(1),
            durationMin: estimatedDurationMin,
            pickupTime: pickupTime,
            appointmentTime: course.appointmentTime,
            travelTimeWithBuffer: travelTimeWithBuffer,
            estimated: true
          };
        }
      }
      setTripDetails(details);
    } catch (error) {
      console.error('Error calculating trip details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const calculateDistanceEstimate = (coord1, coord2) => {
    const R = 6371;
    const dLat = (coord2[1] - coord1[1]) * Math.PI / 180;
    const dLon = (coord2[0] - coord1[0]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1[1] * Math.PI / 180) * Math.cos(coord2[1] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleOptimization = async (customConfig = null) => {
    setIsOptimizing(true);
    setOptimizationResult(null);

    // Use provided config or current state config
    const config = customConfig || timeWindowConfig;

    try {
      console.log('🚛 Starting Advanced VROOM optimization with config:', config);
      console.log('📊 Input data:', {
        vehicleCount: vehicles.length,
        courseCount: courses.length,
        coursesWithDuration: courses.filter(c => c.duration && c.duration > 0).length
      });

      // Step 1: Process courses with returns (this generates return trips automatically)
      const allTrips = processCoursesWithReturns(courses);
      console.log('🔄 Processed courses with returns:', {
        originalCourses: courses.length,
        totalTrips: allTrips.length,
        returnTrips: allTrips.filter(t => t.isReturnTrip).length
      });

      // Step 2: Use the advanced VROOM optimization with time window config
      const result = await optimizeWithVRoomAdvanced(allTrips, vehicles, {
        maxRouteTime: 14 * 3600, // 14 hours max per vehicle
        balanceRoutes: true,
        vroomOptions: {
          geometry: false,
          overview: 'simplified'
        },
        timeWindowConfig: config // Pass the configuration
      });
      
      console.log('✅ Advanced optimization completed:', result);
      setOptimizationResult(result);
      
      // Initialize visible routes
      if (result.routes) {
        setVisibleRoutes(new Set(result.routes.map(route => route.vehicle)));
      }

    } catch (error) {
      console.error('❌ Optimization failed:', error);
      setOptimizationResult({ 
        error: error.message,
        suggestion: 'Try with fewer courses or check if VROOM server is running'
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleTimeWindowConfigChange = async (newConfig) => {
    setTimeWindowConfig(newConfig);
    // Automatically run optimization with new config
    await handleOptimization(newConfig);
  };

  // Helper functions
  const getTimeInSeconds = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 3600 + minutes * 60;
  };

  const formatTimeFromSeconds = (totalSeconds) => {
    if (totalSeconds < 0) totalSeconds = 0;
    if (totalSeconds >= 86400) totalSeconds = 86399;
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Vehicle CRUD operations
  const handleAddVehicle = () => {
    setEditingVehicle({
      name: '',
      type: 'VSL',
      location: 'Jonquières (84)',
      coordinates: [4.9072, 44.1142],
      capacity: 1
    });
    setShowVehicleModal(true);
  };

  const handleEditVehicle = (vehicle) => {
    setEditingVehicle(vehicle);
    setShowVehicleModal(true);
  };

  const handleDeleteVehicle = (vehicleId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?')) {
      setVehicles(prev => prev.filter(v => v.id !== vehicleId));
    }
  };

  const handleSaveVehicle = (vehicleData) => {
    if (editingVehicle.id) {
      // Edit existing
      setVehicles(prev => prev.map(v => 
        v.id === editingVehicle.id ? { ...v, ...vehicleData } : v
      ));
    } else {
      // Add new
      const newId = Math.max(...vehicles.map(v => v.id), 0) + 1;
      setVehicles(prev => [...prev, { id: newId, ...vehicleData }]);
    }
    setShowVehicleModal(false);
    setEditingVehicle(null);
  };

  // Course CRUD operations
  const handleAddCourse = () => {
    setEditingCourse({
      patient: '',
      pickup: '',
      destination: '',
      coordinates: [4.9072, 44.1142],
      destinationCoords: [4.8050, 43.9320],
      appointmentTime: '08:00'
    });
    setShowCourseModal(true);
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setShowCourseModal(true);
  };

  const handleDeleteCourse = (courseId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette course ?')) {
      setCourses(prev => prev.filter(c => c.id !== courseId));
    }
  };

  const handleSaveCourse = (courseData) => {
    if (editingCourse.id) {
      // Edit existing course
      setCourses(prev => prev.map(c => 
        c.id === editingCourse.id ? { ...c, ...courseData } : c
      ));
    } else {
      // Add new course
      const newId = Math.max(...courses.map(c => c.id), 0) + 1;
      const newCourse = { 
        id: newId, 
        ...courseData, 
        isReturnTrip: false,
        originalCourseId: null,
        vehicleType: courseData.vehicleType || 'VSL'
      };
      
      // Generate return course if duration is specified
      const coursesWithReturns = processCoursesWithReturns([newCourse]);
      setCourses(prev => [...prev, ...coursesWithReturns]);
      
      // Show toast if return course was generated
      if (coursesWithReturns.length > 1) {
        setToast({
          message: `Course ajoutée avec course retour générée automatiquement !`,
          type: 'success'
        });
      }
    }
    setShowCourseModal(false);
    setEditingCourse(null);
  };

  const handleCoursesImport = (importedCourses) => {
    // Check for duplicates based on patient name, pickup location, and appointment time
    const existingCourses = courses;
    const duplicates = [];
    const uniqueNewCourses = [];
    
    importedCourses.forEach(newCourse => {
      const isDuplicate = existingCourses.some(existing => 
        existing.patient.toLowerCase() === newCourse.patient.toLowerCase() &&
        existing.pickup.toLowerCase() === newCourse.pickup.toLowerCase() &&
        existing.appointmentTime === newCourse.appointmentTime
      );
      
      if (isDuplicate) {
        duplicates.push(newCourse);
      } else {
        uniqueNewCourses.push(newCourse);
      }
    });
    
    // Generate new IDs for unique courses to avoid conflicts
    const maxId = Math.max(...courses.map(c => c.id), 0);
    const coursesWithNewIds = uniqueNewCourses.map((course, index) => ({
      ...course,
      id: maxId + index + 1,
      isReturnTrip: false, // Imported courses are never return trips initially
      originalCourseId: null,
      vehicleType: course.vehicleType || 'VSL'
    }));
    
    // Process courses to auto-generate return trips
    const coursesWithReturns = processCoursesWithReturns(coursesWithNewIds);
    
    // Add all courses (including auto-generated returns) to existing ones
    setCourses(prev => [...prev, ...coursesWithReturns]);
    
    // Close the modal
    setShowFileUploadModal(false);
    
    // Calculate how many return courses were generated
    const returnCoursesGenerated = coursesWithReturns.length - coursesWithNewIds.length;
    
    // Show appropriate toast message
    if (duplicates.length > 0 && uniqueNewCourses.length > 0) {
      setToast({
        message: `${uniqueNewCourses.length} course${uniqueNewCourses.length > 1 ? 's' : ''} importée${uniqueNewCourses.length > 1 ? 's' : ''} + ${returnCoursesGenerated} retour${returnCoursesGenerated > 1 ? 's' : ''}, ${duplicates.length} doublon${duplicates.length > 1 ? 's' : ''} ignoré${duplicates.length > 1 ? 's' : ''}`,
        type: 'warning'
      });
    } else if (duplicates.length > 0) {
      setToast({
        message: `Aucune nouvelle course importée - ${duplicates.length} doublon${duplicates.length > 1 ? 's' : ''} détecté${duplicates.length > 1 ? 's' : ''}`,
        type: 'warning'
      });
    } else {
      setToast({
        message: `${uniqueNewCourses.length} course${uniqueNewCourses.length > 1 ? 's' : ''} importée${uniqueNewCourses.length > 1 ? 's' : ''} avec ${returnCoursesGenerated} retour${returnCoursesGenerated > 1 ? 's' : ''} générés automatiquement !`,
        type: 'success'
      });
    }
  };

  const handleClearAllCourses = () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer toutes les ${courses.length} courses ? Cette action est irréversible.`)) {
      setCourses([]);
      setToast({
        message: 'Toutes les courses ont été supprimées',
        type: 'info'
      });
    }
  };

  // Route visibility toggle
  const toggleRouteVisibility = (vehicleId) => {
    setVisibleRoutes(prev => {
      const newVisible = new Set(prev);
      if (newVisible.has(vehicleId)) {
        newVisible.delete(vehicleId);
      } else {
        newVisible.add(vehicleId);
      }
      return newVisible;
    });
  };

  // Get results sorted by time
  const getResultsByTime = () => {
    if (!optimizationResult?.routes) return [];
    
    const allAssignments = [];
    
    optimizationResult.routes.forEach(route => {
      const vehicle = vehicles.find(v => v.id === route.vehicle);
      const pickupSteps = route.steps?.filter(step => step.type === 'pickup') || [];
      
      pickupSteps.forEach(step => {
        const course = courses.find(c => c.id * 10 + 1 === step.id);
        const details = course ? tripDetails[course.id] : null;
        
        if (course && details) {
          allAssignments.push({
            course,
            vehicle,
            details,
            pickupTime: details.pickupTime,
            appointmentTime: course.isReturnTrip ? course.exitTime : course.appointmentTime
          });
        }
      });
    });
    
    return allAssignments.sort((a, b) => {
      const timeA = getTimeInSeconds(a.pickupTime);
      const timeB = getTimeInSeconds(b.pickupTime);
      return timeA - timeB;
    });
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AmbuSched - Transport Médical</h1>
                <p className="text-gray-600 mt-1">Optimisation des tournées VSL - Zone Carpentras/Avignon</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowTimeWindowConfig(true)}
                  className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Paramètres
                </button>
                <button
                  onClick={() => handleOptimization()}
                  disabled={isOptimizing}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {isOptimizing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Optimisation en cours...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Optimiser les tournées
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Vehicles Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Véhicules ({vehicles.length})
                </h2>
                <button
                  onClick={handleAddVehicle}
                  className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {vehicles.map(vehicle => {
                  const assignedCourses = optimizationResult?.routes?.find(r => r.vehicle === vehicle.id)?.steps?.filter(s => s.type === 'pickup').length || 0;
                  
                  return (
                    <div key={vehicle.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{vehicle.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {vehicle.type}
                          </span>
                          <button
                            onClick={() => handleEditVehicle(vehicle)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteVehicle(vehicle.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {vehicle.location}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Capacité: {vehicle.capacity} patient • {assignedCourses} courses assignées
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Courses Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Route className="w-5 h-5" />
                  Courses ({courses.filter(c => !c.isReturnTrip).length} + {courses.filter(c => c.isReturnTrip).length} retours)
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFileUploadModal(true)}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    <Upload className="w-4 h-4" />
                    Importer
                  </button>
                  {courses.length > 0 && (
                    <button
                      onClick={handleClearAllCourses}
                      className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                    >
                      <X className="w-4 h-4" />
                      Vider
                    </button>
                  )}
                  <button
                    onClick={handleAddCourse}
                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                </div>
              </div>
              {loadingDetails && (
                <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
                  🔄 Calcul des détails en cours...
                </div>
              )}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {courses.map(course => (
                  <div key={course.id} className={`border rounded-lg p-3 ${
                    course.isReturnTrip ? 'bg-blue-50 border-blue-200' : 'bg-white'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {course.isReturnTrip && (
                          <RotateCcw className="w-4 h-4 text-blue-600" title="Course retour" />
                        )}
                        <h4 className="font-medium text-gray-900 text-sm">
                          {course.isReturnTrip ? '🔄 ' : ''}{course.patient}
                        </h4>
                        {course.isReturnTrip && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            RETOUR
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditCourse(course)}
                          className="text-blue-600 hover:text-blue-800"
                          disabled={course.isReturnTrip} // Disable editing for auto-generated returns
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {course.isReturnTrip ? 'Dispo dès' : 'RDV'}: {course.appointmentTime}
                        {tripDetails[course.id] && (
                          <span className="text-blue-600 ml-2">
                            Pickup: {tripDetails[course.id].pickupTime}
                          </span>
                        )}
                        {course.isReturnTrip && course.exitTime && (
                          <span className="text-green-600 ml-2">
                            Fin RDV: {course.exitTime}
                          </span>
                        )}
                      </div>
                      {course.isReturnTrip && tripDetails[course.id] && (
                        <div className="flex items-center gap-1 text-orange-600">
                          <Clock className="w-3 h-3" />
                          Attente patient: {formatWaitingTime(calculateWaitingTime(course, tripDetails[course.id].pickupTime))}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {course.pickup}
                      </div>
                      <div className="text-gray-500">→ {course.destination}</div>
                      {tripDetails[course.id] && (
                        <div className="flex gap-2 text-gray-500 text-xs mt-1 p-2 bg-gray-50 rounded">
                          <span>{tripDetails[course.id].distanceKm} km</span>
                          <span>{tripDetails[course.id].durationMin} min</span>
                          {tripDetails[course.id].estimated && <span className="text-orange-500">*</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Map Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Carte des transports
              </h2>
              {optimizationResult?.routes && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Visibilité des routes:</span>
                  {optimizationResult.routes.map(route => {
                    const vehicle = vehicles.find(v => v.id === route.vehicle);
                    const isVisible = visibleRoutes.has(route.vehicle);
                    return (
                      <button
                        key={route.vehicle}
                        onClick={() => toggleRouteVisibility(route.vehicle)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          isVisible
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-gray-100 text-gray-600 border border-gray-300'
                        }`}
                      >
                        {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        {vehicle?.name || `Véhicule ${route.vehicle}`}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="relative">
              <RouteMap 
                trips={courses} 
                vehicles={vehicles} 
                optimizationResult={optimizationResult}
                selectedVehicle={selectedVehicle}
                visibleRoutes={visibleRoutes}
              />
            </div>
          </div>

          {/* Optimization Results */}
          {optimizationResult && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Résultats de l'optimisation</h2>
              {optimizationResult.error ? (
                <div className="text-red-600 p-4 bg-red-50 rounded-lg">
                  Erreur: {optimizationResult.error}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Results View Toggle */}
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-sm font-medium text-gray-700">Affichage:</span>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setResultsView('by-vehicle')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          resultsView === 'by-vehicle'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        Par véhicule
                      </button>
                      <button
                        onClick={() => setResultsView('by-time')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          resultsView === 'by-time'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        Par horaire
                      </button>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {optimizationResult.routes?.length || 0}
                      </div>
                      <div className="text-sm text-blue-800">Véhicules utilisés</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {optimizationResult.routes?.reduce((total, route) => 
                          total + (route.steps?.filter(step => step.type === 'pickup').length || 0), 0) || 0}
                      </div>
                      <div className="text-sm text-green-800">Courses assignées</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {optimizationResult.unassigned?.length || 0}
                      </div>
                      <div className="text-sm text-orange-800">Courses non assignées</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {optimizationResult.routes ? 
                          Math.round(optimizationResult.routes.reduce((total, route) => 
                            total + (route.duration || 0), 0) / 60) : 'N/A'}
                      </div>
                      <div className="text-sm text-purple-800">Minutes totales</div>
                    </div>
                  </div>

                  {/* Results by Vehicle */}
                  {resultsView === 'by-vehicle' && optimizationResult.routes && (
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-900">Détail par véhicule</h3>
                      {optimizationResult.routes.map((route, index) => {
                        const vehicle = vehicles.find(v => v.id === route.vehicle);
                        const pickupSteps = route.steps?.filter(step => step.type === 'pickup') || [];
                        const isVisible = visibleRoutes.has(route.vehicle);
                        
                        return (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">
                                {vehicle?.name || `Véhicule ${route.vehicle}`}
                              </h4>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleRouteVisibility(route.vehicle)}
                                  className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                                    isVisible
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                  {isVisible ? 'Visible' : 'Masqué'}
                                </button>
                                <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                  {pickupSteps.length} courses
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              {pickupSteps.map((step, stepIndex) => {
                                const course = courses.find(c => c.id * 10 + 1 === step.id);
                                const details = course ? tripDetails[course.id] : null;
                                
                                return course ? (
                                  <div key={stepIndex} className="bg-gray-50 p-3 rounded border">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <div className="font-medium text-gray-900">{course.patient}</div>
                                        <div className="text-sm text-gray-600">
                                          {course.pickup} → {course.destination}
                                        </div>
                                        {details && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            {details.distanceKm} km • {details.durationMin} min
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-right text-sm">
                                        <div className="text-blue-600 font-medium">
                                          Pickup: {details?.pickupTime || 'N/A'}
                                        </div>
                                        <div className="text-gray-500">
                                          {course.isReturnTrip ? 'Fin RDV' : 'RDV'}: {course.isReturnTrip ? course.exitTime : course.appointmentTime}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Results by Time */}
                  {resultsView === 'by-time' && (
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-900">Planning chronologique</h3>
                      <div className="space-y-2">
                        {getResultsByTime().map((assignment, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-gray-900">{assignment.course.patient}</div>
                                <div className="text-sm text-gray-600">
                                  {assignment.course.pickup} → {assignment.course.destination}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {assignment.details.distanceKm} km • {assignment.details.durationMin} min
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-blue-600 font-medium">
                                  Pickup: {assignment.pickupTime}
                                </div>
                                <div className="text-gray-500">
                                  {assignment.course.isReturnTrip ? 'Fin RDV' : 'RDV'}: {assignment.appointmentTime}
                                </div>
                                <div className="text-sm text-green-600 mt-1">
                                  {assignment.vehicle.name}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unassigned Courses */}
                  {optimizationResult.unassigned && optimizationResult.unassigned.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-medium text-gray-900 mb-3">Courses non assignées</h3>
                      <div className="space-y-2">
                        {optimizationResult.unassigned
                          .filter(item => item.id % 10 === 1) // Only show pickup items to avoid duplicates
                          .map((item, index) => {
                          const course = courses.find(c => c.id * 10 + 1 === item.id);
                          return course ? (
                            <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium text-gray-900">{course.patient}</div>
                                  <div className="text-sm text-gray-600">
                                    {course.pickup} → {course.destination}
                                  </div>
                                  {item.description && (
                                    <div className="text-sm text-red-600 mt-2">
                                      Raison: {item.description}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right text-sm">
                                  <div className="text-gray-500">{course.isReturnTrip ? 'Fin RDV' : 'RDV'}: {course.isReturnTrip ? course.exitTime : course.appointmentTime}</div>
                                </div>
                              </div>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Vehicle Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingVehicle?.id ? 'Modifier véhicule' : 'Ajouter véhicule'}
              </h3>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const vehicleData = {
                name: formData.get('name'),
                type: formData.get('type'),
                location: formData.get('location'),
                coordinates: [parseFloat(formData.get('longitude')), parseFloat(formData.get('latitude'))],
                capacity: parseInt(formData.get('capacity'))
              };
              handleSaveVehicle(vehicleData);
            }}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingVehicle?.name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    name="type"
                    defaultValue={editingVehicle?.type || 'VSL'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="VSL">VSL</option>
                    <option value="Ambulance">Ambulance</option>
                    <option value="Taxi">Taxi Conventionné</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
                  <input
                    type="text"
                    name="location"
                    defaultValue={editingVehicle?.location || 'Jonquières (84)'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                    <input
                      type="number"
                      name="longitude"
                      step="any"
                      defaultValue={editingVehicle?.coordinates?.[0] || 4.9072}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                    <input
                      type="number"
                      name="latitude"
                      step="any"
                      defaultValue={editingVehicle?.coordinates?.[1] || 44.1142}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacité</label>
                  <input
                    type="number"
                    name="capacity"
                    min="1"
                    max="4"
                    defaultValue={editingVehicle?.capacity || 1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowVehicleModal(false);
                    setEditingVehicle(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingVehicle?.id ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCourse?.id ? 'Modifier course' : 'Ajouter course'}
              </h3>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const courseData = {
                patient: formData.get('patient'),
                pickup: formData.get('pickup'),
                destination: formData.get('destination'),
                coordinates: [parseFloat(formData.get('pickupLng')), parseFloat(formData.get('pickupLat'))],
                destinationCoords: [parseFloat(formData.get('destLng')), parseFloat(formData.get('destLat'))],
                appointmentTime: formData.get('appointmentTime')
              };
              handleSaveCourse(courseData);
            }}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                  <input
                    type="text"
                    name="patient"
                    defaultValue={editingCourse?.patient || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lieu de pickup</label>
                  <input
                    type="text"
                    name="pickup"
                    defaultValue={editingCourse?.pickup || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Lng</label>
                    <input
                      type="number"
                      name="pickupLng"
                      step="any"
                      defaultValue={editingCourse?.coordinates?.[0] || 4.9072}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Lat</label>
                    <input
                      type="number"
                      name="pickupLat"
                      step="any"
                      defaultValue={editingCourse?.coordinates?.[1] || 44.1142}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                  <input
                    type="text"
                    name="destination"
                    defaultValue={editingCourse?.destination || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dest Lng</label>
                    <input
                      type="number"
                      name="destLng"
                      step="any"
                      defaultValue={editingCourse?.destinationCoords?.[0] || 4.8050}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dest Lat</label>
                    <input
                      type="number"
                      name="destLat"
                      step="any"
                      defaultValue={editingCourse?.destinationCoords?.[1] || 43.9320}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heure RDV</label>
                  <input
                    type="time"
                    name="appointmentTime"
                    defaultValue={editingCourse?.appointmentTime || '08:00'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCourseModal(false);
                    setEditingCourse(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingCourse?.id ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={showFileUploadModal}
        onClose={() => setShowFileUploadModal(false)}
        onCoursesImported={handleCoursesImport}
        currentCourses={courses}
      />

      {/* Time Window Configuration Panel */}
      <TimeWindowConfigPanel
        isOpen={showTimeWindowConfig}
        onClose={() => setShowTimeWindowConfig(false)}
        onConfigChange={handleTimeWindowConfigChange}
        currentConfig={timeWindowConfig}
        lastOptimizationResult={optimizationResult}
      />

      {/* Toast Notification */}
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}