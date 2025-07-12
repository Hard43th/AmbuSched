/**
 * Course Generator Plugin for AmbuSched
 * Generates realistic medical transport courses for the Carpentras/Avignon region
 * 
 * Usage:
 * import { generateCourses, presets } from './utils/courseGenerator.js';
 * const courses = generateCourses(presets.MORNING_RUSH, 10);
 */

// Geographic data for the Carpentras/Avignon region
const LOCATIONS = {
  // Pickup locations (small towns and neighborhoods)
  pickups: [
    { name: 'Carpentras Centre', coords: [5.0481, 44.2550] },
    { name: 'Monteux', coords: [5.0089, 44.0381] },
    { name: 'Pernes-les-Fontaines', coords: [5.0589, 44.0061] },
    { name: 'L\'Isle-sur-la-Sorgue', coords: [5.0514, 43.9189] },
    { name: 'Vedène', coords: [4.9011, 43.9789] },
    { name: 'Sarrians', coords: [4.9750, 44.1531] },
    { name: 'Aubignan', coords: [5.0267, 44.1042] },
    { name: 'Saint-Didier', coords: [5.1089, 44.2461] },
    { name: 'Mazan', coords: [5.1167, 44.0597] },
    { name: 'Mormoiron', coords: [5.1844, 44.0714] },
    { name: 'Avignon Centre', coords: [4.8096, 43.9493] },
    { name: 'Entraigues-sur-la-Sorgue', coords: [4.9250, 44.0106] },
    { name: 'Sorgues', coords: [4.8703, 44.0069] },
    { name: 'Le Thor', coords: [4.9939, 43.9289] },
    { name: 'Châteauneuf-du-Pape', coords: [4.8342, 44.0564] },
    { name: 'Bédarrides', coords: [4.8975, 44.0411] },
    { name: 'Courthézon', coords: [4.8789, 44.0886] },
    { name: 'Orange', coords: [4.8083, 44.1378] },
    { name: 'Jonquières', coords: [4.9072, 44.1142] },
    { name: 'Violès', coords: [4.9356, 44.1550] },
    { name: 'Camaret-sur-Aigues', coords: [4.8706, 44.1706] },
    { name: 'Travaillan', coords: [4.9086, 44.1739] },
    { name: 'Althen-des-Paluds', coords: [4.9539, 43.9906] },
    { name: 'Velleron', coords: [5.0267, 43.9531] },
    { name: 'Méthamis', coords: [5.2094, 44.1764] },
    { name: 'Flassan', coords: [5.1481, 44.1103] },
    { name: 'Caromb', coords: [5.1053, 44.1408] },
    { name: 'Bédoin', coords: [5.1781, 44.1261] },
    { name: 'Malaucène', coords: [5.1336, 44.1747] },
    { name: 'Beaumes-de-Venise', coords: [5.0317, 44.1189] }
  ],
  
  // Destination locations (medical facilities)
  destinations: [
    { name: 'CHU Avignon', coords: [4.8050, 43.9320], type: 'hospital' },
    { name: 'Clinique Rhône-Durance Avignon', coords: [4.8200, 43.9400], type: 'clinic' },
    { name: 'CHU Marseille La Timone', coords: [5.3950, 43.2784], type: 'hospital' },
    { name: 'Hôpital Carpentras', coords: [5.0520, 44.2580], type: 'hospital' },
    { name: 'Centre de dialyse Avignon', coords: [4.8100, 43.9350], type: 'dialysis' },
    { name: 'CHU Marseille Nord', coords: [5.4200, 43.3400], type: 'hospital' },
    { name: 'Clinique Bouchard Marseille', coords: [5.3800, 43.2900], type: 'clinic' },
    { name: 'CHU Avignon Cardiologie', coords: [4.8050, 43.9320], type: 'cardiology' },
    { name: 'CHU Marseille La Conception', coords: [5.3850, 43.2950], type: 'hospital' },
    { name: 'Clinique Avignon', coords: [4.8150, 43.9300], type: 'clinic' },
    { name: 'Hôpital Européen Marseille', coords: [5.3700, 43.2800], type: 'hospital' },
    { name: 'Cabinet cardiologie Avignon', coords: [4.8200, 43.9450], type: 'cardiology' },
    { name: 'Laboratoire Carpentras', coords: [5.0500, 44.2600], type: 'laboratory' },
    { name: 'CHU Marseille Urgences', coords: [5.3950, 43.2784], type: 'emergency' },
    { name: 'Clinique privée Avignon', coords: [4.8300, 43.9500], type: 'clinic' },
    { name: 'Centre médical Carpentras', coords: [5.0550, 44.2650], type: 'medical_center' },
    { name: 'CHU Avignon Neurologie', coords: [4.8050, 43.9320], type: 'neurology' },
    { name: 'Cabinet gynéco Avignon', coords: [4.8250, 43.9400], type: 'gynecology' },
    { name: 'CHU Marseille Pédiatrie', coords: [5.3900, 43.2850], type: 'pediatric' },
    { name: 'Polyclinique Avignon', coords: [4.8350, 43.9550], type: 'clinic' },
    { name: 'Cabinet médical Carpentras', coords: [5.0480, 44.2570], type: 'medical_center' },
    { name: 'Laboratoire Avignon', coords: [4.8180, 43.9380], type: 'laboratory' },
    { name: 'CHU Marseille Oncologie', coords: [5.3850, 43.2900], type: 'oncology' },
    { name: 'Centre médical Avignon', coords: [4.8200, 43.9400], type: 'medical_center' },
    { name: 'Cabinet dentaire Carpentras', coords: [5.0520, 44.2590], type: 'dental' },
    { name: 'Pharmacie Avignon', coords: [4.8150, 43.9350], type: 'pharmacy' },
    { name: 'Centre de soins Carpentras', coords: [5.0500, 44.2580], type: 'care_center' },
    { name: 'Polyclinique Marseille', coords: [5.3900, 43.2950], type: 'clinic' }
  ]
};

// Common French first and last names for realistic patient names
const PATIENT_NAMES = {
  firstNames: [
    'Jean', 'Marie', 'Pierre', 'Sophie', 'Paul', 'Claire', 'Henri', 'Lucie', 
    'Michel', 'Sylvie', 'Robert', 'Nathalie', 'François', 'Isabelle', 'Thierry',
    'Véronique', 'Alain', 'Brigitte', 'Didier', 'Monique', 'Patrick', 'Catherine',
    'Gérard', 'Martine', 'Jean-Claude', 'Françoise', 'Raymond', 'Nicole', 'André',
    'Denise', 'Bernard', 'Jacqueline', 'Daniel', 'Christiane', 'Philippe', 'Annie',
    'Christian', 'Michèle', 'Jacques', 'Josiane', 'Claude', 'Colette', 'Marcel',
    'Yvette', 'René', 'Simone', 'Louis', 'Jeanne', 'Roger', 'Marguerite'
  ],
  lastNames: [
    'Dupont', 'Martin', 'Leroy', 'Blanc', 'Moreau', 'Dubois', 'Rousseau', 'Bernard',
    'Garnier', 'Lemoine', 'Durand', 'Petit', 'Roux', 'Girard', 'Faure', 'Simon',
    'Morel', 'Laurent', 'Mercier', 'Lefebvre', 'Fontaine', 'Noel', 'Picard', 'Bonnet',
    'Roy', 'Gauthier', 'Perrin', 'Chevallier', 'Muller', 'Schmitt', 'Fournier',
    'Masson', 'Denis', 'Legrand', 'Boyer', 'Robin', 'Clement', 'Guerin', 'Morin',
    'Dufour', 'Andre', 'Blanchard', 'Guillot', 'Fernandez', 'Lopez', 'Gonzalez'
  ]
};

// Course generation presets
export const presets = {
  MORNING_RUSH: {
    name: 'Morning Rush',
    timeRange: { start: '06:00', end: '12:00' },
    destinationPreferences: ['hospital', 'dialysis', 'laboratory'],
    description: 'Morning medical appointments and dialysis sessions'
  },
  
  AFTERNOON_STANDARD: {
    name: 'Afternoon Standard',
    timeRange: { start: '12:00', end: '18:00' },
    destinationPreferences: ['clinic', 'medical_center', 'cardiology'],
    description: 'Afternoon specialist consultations'
  },
  
  EMERGENCY_TRANSPORT: {
    name: 'Emergency Transport',
    timeRange: { start: '00:00', end: '23:59' },
    destinationPreferences: ['emergency', 'hospital'],
    description: 'Urgent medical transports'
  },
  
  SPECIALIST_CONSULTATIONS: {
    name: 'Specialist Consultations',
    timeRange: { start: '08:00', end: '17:00' },
    destinationPreferences: ['cardiology', 'neurology', 'oncology', 'gynecology'],
    description: 'Specialized medical consultations'
  },
  
  ROUTINE_CARE: {
    name: 'Routine Care',
    timeRange: { start: '09:00', end: '16:00' },
    destinationPreferences: ['clinic', 'medical_center', 'pharmacy', 'laboratory'],
    description: 'Routine medical care and check-ups'
  },

  DIALYSIS_SESSIONS: {
    name: 'Dialysis Sessions',
    timeRange: { start: '06:00', end: '14:00' },
    destinationPreferences: ['dialysis'],
    description: 'Regular dialysis treatments'
  },

  PEDIATRIC_CARE: {
    name: 'Pediatric Care',
    timeRange: { start: '09:00', end: '17:00' },
    destinationPreferences: ['pediatric', 'hospital'],
    description: 'Children medical appointments'
  },

  LONG_DISTANCE: {
    name: 'Long Distance Transport',
    timeRange: { start: '07:00', end: '15:00' },
    destinationPreferences: ['hospital'],
    locationPreference: 'marseille', // Prefer Marseille destinations
    description: 'Long distance medical transports to Marseille'
  }
};

/**
 * Generate a random patient name
 */
function generatePatientName() {
  const firstName = PATIENT_NAMES.firstNames[Math.floor(Math.random() * PATIENT_NAMES.firstNames.length)];
  const lastName = PATIENT_NAMES.lastNames[Math.floor(Math.random() * PATIENT_NAMES.lastNames.length)];
  return `${firstName} ${lastName}`;
}

/**
 * Generate a random time within a range
 */
function generateTimeInRange(startTime, endTime) {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const randomMinutes = startMinutes + Math.random() * (endMinutes - startMinutes);
  return minutesToTime(Math.floor(randomMinutes));
}

/**
 * Convert time string to minutes since midnight
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string
 */
function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Filter destinations by type preferences
 */
function filterDestinationsByType(destinationTypes) {
  if (!destinationTypes || destinationTypes.length === 0) {
    return LOCATIONS.destinations;
  }
  return LOCATIONS.destinations.filter(dest => destinationTypes.includes(dest.type));
}

/**
 * Filter destinations by location preference
 */
function filterDestinationsByLocation(destinations, locationPreference) {
  if (!locationPreference) return destinations;
  
  if (locationPreference === 'marseille') {
    return destinations.filter(dest => dest.name.toLowerCase().includes('marseille'));
  }
  
  if (locationPreference === 'avignon') {
    return destinations.filter(dest => dest.name.toLowerCase().includes('avignon'));
  }
  
  return destinations;
}

/**
 * Main course generation function
 */
export function generateCourses(preset, count = 10, options = {}) {
  const {
    startId = 1,
    allowDuplicatePatients = true,
    timeDistribution = 'random', // 'random', 'even', 'clustered'
    customPickups = null,
    customDestinations = null
  } = options;

  const courses = [];
  const usedPatientNames = new Set();
  
  // Get available pickups and destinations
  const availablePickups = customPickups || LOCATIONS.pickups;
  let availableDestinations = customDestinations || filterDestinationsByType(preset.destinationPreferences);
  availableDestinations = filterDestinationsByLocation(availableDestinations, preset.locationPreference);

  for (let i = 0; i < count; i++) {
    // Generate unique patient name if required
    let patientName;
    let attempts = 0;
    do {
      patientName = generatePatientName();
      attempts++;
    } while (!allowDuplicatePatients && usedPatientNames.has(patientName) && attempts < 100);
    
    if (!allowDuplicatePatients) {
      usedPatientNames.add(patientName);
    }

    // Select random pickup and destination
    const pickup = availablePickups[Math.floor(Math.random() * availablePickups.length)];
    const destination = availableDestinations[Math.floor(Math.random() * availableDestinations.length)];

    // Generate appointment time based on distribution
    let appointmentTime;
    if (timeDistribution === 'even') {
      const startMinutes = timeToMinutes(preset.timeRange.start);
      const endMinutes = timeToMinutes(preset.timeRange.end);
      const interval = (endMinutes - startMinutes) / count;
      const timeMinutes = startMinutes + (i * interval);
      appointmentTime = minutesToTime(Math.floor(timeMinutes));
    } else if (timeDistribution === 'clustered') {
      // Create time clusters
      const clusterCount = Math.min(3, Math.ceil(count / 5));
      const clusterIndex = Math.floor(i / (count / clusterCount));
      const startMinutes = timeToMinutes(preset.timeRange.start);
      const endMinutes = timeToMinutes(preset.timeRange.end);
      const clusterSize = (endMinutes - startMinutes) / clusterCount;
      const clusterStart = startMinutes + (clusterIndex * clusterSize);
      const clusterEnd = clusterStart + clusterSize;
      const randomInCluster = clusterStart + Math.random() * (clusterEnd - clusterStart);
      appointmentTime = minutesToTime(Math.floor(randomInCluster));
    } else {
      // Random distribution
      appointmentTime = generateTimeInRange(preset.timeRange.start, preset.timeRange.end);
    }

    const course = {
      id: startId + i,
      patient: patientName,
      pickup: pickup.name,
      destination: destination.name,
      coordinates: [...pickup.coords], // Clone to avoid reference issues
      destinationCoords: [...destination.coords],
      appointmentTime: appointmentTime,
      destinationType: destination.type,
      preset: preset.name
    };

    courses.push(course);
  }

  // Sort by appointment time
  courses.sort((a, b) => timeToMinutes(a.appointmentTime) - timeToMinutes(b.appointmentTime));

  return courses;
}

/**
 * Generate mixed courses from multiple presets
 */
export function generateMixedCourses(presetMix, totalCount = 20) {
  const courses = [];
  let currentId = 1;

  for (const { preset, count, options = {} } of presetMix) {
    const generatedCourses = generateCourses(preset, count, {
      ...options,
      startId: currentId
    });
    courses.push(...generatedCourses);
    currentId += count;
  }

  // Sort all courses by appointment time
  courses.sort((a, b) => timeToMinutes(a.appointmentTime) - timeToMinutes(b.appointmentTime));

  // Reassign IDs to maintain sequence
  courses.forEach((course, index) => {
    course.id = index + 1;
  });

  return courses;
}

/**
 * Quick preset generators for common scenarios
 */
export const quickPresets = {
  /**
   * Generate a typical morning schedule
   */
  morningSchedule: (count = 10) => generateCourses(presets.MORNING_RUSH, count, {
    timeDistribution: 'even'
  }),

  /**
   * Generate emergency transports
   */
  emergencyDay: (count = 5) => generateCourses(presets.EMERGENCY_TRANSPORT, count, {
    timeDistribution: 'random'
  }),

  /**
   * Generate a full day mixed schedule
   */
  fullDayMixed: () => generateMixedCourses([
    { preset: presets.MORNING_RUSH, count: 8 },
    { preset: presets.AFTERNOON_STANDARD, count: 6 },
    { preset: presets.SPECIALIST_CONSULTATIONS, count: 4 },
    { preset: presets.ROUTINE_CARE, count: 2 }
  ]),

  /**
   * Generate dialysis-focused schedule
   */
  dialysisDay: (count = 12) => generateCourses(presets.DIALYSIS_SESSIONS, count, {
    timeDistribution: 'clustered'
  }),

  /**
   * Generate long-distance transports
   */
  longDistanceDay: (count = 6) => generateCourses(presets.LONG_DISTANCE, count, {
    timeDistribution: 'even'
  })
};

/**
 * Export course data to different formats
 */
export const exportFormats = {
  /**
   * Export as JSON
   */
  toJSON: (courses) => JSON.stringify(courses, null, 2),

  /**
   * Export as CSV
   */
  toCSV: (courses) => {
    const headers = ['ID', 'Patient', 'Pickup', 'Destination', 'Pickup_Lng', 'Pickup_Lat', 'Dest_Lng', 'Dest_Lat', 'Appointment_Time', 'Type'];
    const rows = courses.map(course => [
      course.id,
      course.patient,
      course.pickup,
      course.destination,
      course.coordinates[0],
      course.coordinates[1],
      course.destinationCoords[0],
      course.destinationCoords[1],
      course.appointmentTime,
      course.destinationType || 'N/A'
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  },

  /**
   * Export as JavaScript array for direct use
   */
  toJSArray: (courses) => {
    return `const courses = ${JSON.stringify(courses, null, 2)};`;
  }
};

// Example usage and demonstrations
export const examples = {
  /**
   * Basic usage example
   */
  basic: () => {
    console.log('🚑 Basic Course Generation Example');
    const courses = generateCourses(presets.MORNING_RUSH, 5);
    console.log('Generated courses:', courses);
    return courses;
  },

  /**
   * Mixed schedule example
   */
  mixed: () => {
    console.log('🚑 Mixed Schedule Example');
    const courses = quickPresets.fullDayMixed();
    console.log('Generated mixed schedule:', courses);
    return courses;
  },

  /**
   * Custom configuration example
   */
  custom: () => {
    console.log('🚑 Custom Configuration Example');
    const courses = generateCourses(presets.SPECIALIST_CONSULTATIONS, 3, {
      timeDistribution: 'even',
      allowDuplicatePatients: false
    });
    console.log('Generated custom courses:', courses);
    return courses;
  }
};

// Default export for easy importing
export default {
  generateCourses,
  generateMixedCourses,
  presets,
  quickPresets,
  exportFormats,
  examples,
  LOCATIONS
};
