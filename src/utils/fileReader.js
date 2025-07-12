/**
 * Course File Reader Utility for AmbuSched
 * Supports multiple file formats: JSON, CSV, and custom structured data
 */

/**
 * Parse CSV content into course objects
 */
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('Le fichier CSV doit contenir au moins un en-tête et une ligne de données');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const courses = [];

  // Define header mappings (flexible to handle different column names)
  const headerMappings = {
    id: ['id', 'course_id', 'numero'],
    patient: ['patient', 'nom_patient', 'patient_name', 'nom_complet'],
    firstName: ['prenom', 'first_name', 'firstname'],
    lastName: ['nom', 'last_name', 'lastname', 'nom_famille'],
    pickup: ['pickup', 'depart', 'lieu_depart', 'pickup_location'],
    destination: ['destination', 'arrivee', 'lieu_arrivee', 'hopital', 'hospital'],
    pickupLng: ['pickup_lng', 'depart_lng', 'longitude_depart', 'lng_depart'],
    pickupLat: ['pickup_lat', 'depart_lat', 'latitude_depart', 'lat_depart'],
    destLng: ['dest_lng', 'destination_lng', 'longitude_arrivee', 'lng_arrivee'],
    destLat: ['dest_lat', 'destination_lat', 'latitude_arrivee', 'lat_arrivee'],
    appointmentTime: ['appointment_time', 'heure_rdv', 'time', 'heure'],
    duration: ['duration', 'duree', 'duree_rdv', 'appointment_duration'],
    returnTime: ['return_time', 'heure_retour', 'fin_rdv', 'appointment_end'],
    vehicleType: ['veh_type', 'vehicle_type', 'type_vehicule', 'type']
  };

  // Find column indices
  const columnIndices = {};
  Object.keys(headerMappings).forEach(field => {
    columnIndices[field] = -1;
    for (const possibleHeader of headerMappings[field]) {
      const index = headers.findIndex(h => h === possibleHeader);
      if (index !== -1) {
        columnIndices[field] = index;
        break;
      }
    }
  });

  // Parse each data line
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
    
    if (values.length < 2) continue; // Skip empty lines

    try {
      // Build patient name from separate fields or use combined field
      let patientName = '';
      if (columnIndices.patient !== -1 && values[columnIndices.patient]) {
        patientName = values[columnIndices.patient];
      } else {
        const firstName = columnIndices.firstName !== -1 ? values[columnIndices.firstName] : '';
        const lastName = columnIndices.lastName !== -1 ? values[columnIndices.lastName] : '';
        // Correct order: firstName lastName (not lastName lastName)
        patientName = [firstName, lastName].filter(n => n && n.trim()).join(' ') || `Patient ${i}`;
      }

      const course = {
        id: columnIndices.id !== -1 ? parseInt(values[columnIndices.id]) || i : i,
        patient: patientName,
        pickup: columnIndices.pickup !== -1 ? values[columnIndices.pickup] : 'Lieu non spécifié',
        destination: columnIndices.destination !== -1 ? values[columnIndices.destination] : 'Destination non spécifiée',
        coordinates: [
          columnIndices.pickupLng !== -1 ? parseFloat(values[columnIndices.pickupLng]) : 4.9072,
          columnIndices.pickupLat !== -1 ? parseFloat(values[columnIndices.pickupLat]) : 44.1142
        ],
        destinationCoords: [
          columnIndices.destLng !== -1 ? parseFloat(values[columnIndices.destLng]) : 4.8050,
          columnIndices.destLat !== -1 ? parseFloat(values[columnIndices.destLat]) : 43.9320
        ],
        appointmentTime: columnIndices.appointmentTime !== -1 ? 
          formatTime(values[columnIndices.appointmentTime]) : '08:00',
        duration: columnIndices.duration !== -1 ? parseInt(values[columnIndices.duration]) || 0 : 0, // 0 means no return needed
        returnTime: columnIndices.returnTime !== -1 ? 
          formatTime(values[columnIndices.returnTime]) : null, // for future return trip support
        isReturnTrip: false, // Mark if this is a return course
        originalCourseId: null, // Reference to original course if this is a return
        vehicleType: columnIndices.vehicleType !== -1 ? values[columnIndices.vehicleType] : 'VSL' // Vehicle type requirement
      };

      courses.push(course);
    } catch (error) {
      console.warn(`Erreur lors du parsing de la ligne ${i + 1}:`, error.message);
    }
  }

  return courses;
}

/**
 * Parse JSON content into course objects
 */
function parseJSON(jsonContent) {
  try {
    const data = JSON.parse(jsonContent);
    
    // Handle different JSON structures
    let courses = [];
    
    if (Array.isArray(data)) {
      courses = data;
    } else if (data.courses && Array.isArray(data.courses)) {
      courses = data.courses;
    } else if (data.data && Array.isArray(data.data)) {
      courses = data.data;
    } else {
      throw new Error('Format JSON non reconnu');
    }

    // Normalize course objects
    return courses.map((course, index) => {
      // Handle patient name from separate fields or combined field
      let patientName = '';
      if (course.patient) {
        patientName = course.patient;
      } else if (course.nom || course.patient_name) {
        patientName = course.nom || course.patient_name;
      } else {
        const firstName = course.prenom || course.first_name || course.firstName || '';
        const lastName = course.nom_famille || course.last_name || course.lastName || '';
        // Correct order: firstName lastName
        patientName = [firstName, lastName].filter(n => n && n.trim()).join(' ') || `Patient ${index + 1}`;
      }

      return {
        id: course.id || index + 1,
        patient: patientName,
        pickup: course.pickup || course.depart || course.lieu_depart || 'Lieu non spécifié',
        destination: course.destination || course.arrivee || course.hopital || 'Destination non spécifiée',
        coordinates: course.coordinates || [
          course.pickup_lng || course.lng_depart || 4.9072,
          course.pickup_lat || course.lat_depart || 44.1142
        ],
        destinationCoords: course.destinationCoords || [
          course.dest_lng || course.lng_arrivee || 4.8050,
          course.dest_lat || course.lat_arrivee || 43.9320
        ],
        appointmentTime: formatTime(course.appointmentTime || course.heure_rdv || course.time || '08:00'),
        duration: course.duration !== undefined ? course.duration : (course.duree !== undefined ? course.duree : 0),
        returnTime: course.returnTime || course.heure_retour || course.fin_rdv || null,
        isReturnTrip: course.isReturnTrip || false,
        originalCourseId: course.originalCourseId || null,
        vehicleType: course.vehicleType || course.type_vehicule || 'VSL'
      };
    });
  } catch (error) {
    throw new Error(`Erreur lors du parsing JSON: ${error.message}`);
  }
}

/**
 * Parse custom text format (key-value pairs)
 */
function parseCustomText(textContent) {
  const lines = textContent.trim().split('\n');
  const courses = [];
  let currentCourse = {};
  let courseId = 1;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines or comments
    if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
      continue;
    }

    // New course marker
    if (trimmedLine.startsWith('---') || trimmedLine.toLowerCase().includes('course')) {
      if (Object.keys(currentCourse).length > 0) {
        courses.push(normalizeCourse(currentCourse, courseId++));
        currentCourse = {};
      }
      continue;
    }

    // Parse key-value pairs
    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex !== -1) {
      const key = trimmedLine.substring(0, colonIndex).trim().toLowerCase();
      const value = trimmedLine.substring(colonIndex + 1).trim();
      
      // Map various key formats
      const keyMappings = {
        'patient': ['patient', 'nom', 'prenom', 'name'],
        'pickup': ['pickup', 'depart', 'departure', 'lieu_depart'],
        'destination': ['destination', 'arrivee', 'arrival', 'hopital'],
        'pickup_coords': ['pickup_coords', 'coords_depart', 'depart_coordinates'],
        'dest_coords': ['dest_coords', 'coords_arrivee', 'destination_coordinates'],
        'appointment_time': ['appointment_time', 'heure', 'time', 'rdv'],
        'duration': ['duration', 'duree', 'duree_rdv']
      };

      let mappedKey = null;
      for (const [standardKey, variations] of Object.entries(keyMappings)) {
        if (variations.some(variation => key.includes(variation))) {
          mappedKey = standardKey;
          break;
        }
      }

      if (mappedKey) {
        currentCourse[mappedKey] = value;
      }
    }
  }

  // Add the last course
  if (Object.keys(currentCourse).length > 0) {
    courses.push(normalizeCourse(currentCourse, courseId));
  }

  return courses;
}

/**
 * Normalize course object from parsed data
 */
function normalizeCourse(rawCourse, id) {
  // Parse coordinates
  const parseCoords = (coordsStr) => {
    if (typeof coordsStr === 'string') {
      const coords = coordsStr.split(',').map(c => parseFloat(c.trim()));
      return coords.length === 2 ? coords : [4.9072, 44.1142];
    }
    return [4.9072, 44.1142];
  };

  return {
    id: id,
    patient: rawCourse.patient || `Patient ${id}`,
    pickup: rawCourse.pickup || 'Lieu non spécifié',
    destination: rawCourse.destination || 'Destination non spécifiée',
    coordinates: rawCourse.pickup_coords ? parseCoords(rawCourse.pickup_coords) : [4.9072, 44.1142],
    destinationCoords: rawCourse.dest_coords ? parseCoords(rawCourse.dest_coords) : [4.8050, 43.9320],
    appointmentTime: formatTime(rawCourse.appointment_time || '08:00'),
    duration: parseInt(rawCourse.duration) || 0
  };
}

/**
 * Format time string to HH:MM format
 */
function formatTime(timeStr) {
  if (!timeStr) return '08:00';
  
  // Handle various time formats
  const timeRegex = /(\d{1,2})[:\-\.](\d{2})/;
  const match = timeStr.match(timeRegex);
  
  if (match) {
    const hours = parseInt(match[1]).toString().padStart(2, '0');
    const minutes = parseInt(match[2]).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  // Handle time without separator (e.g., "0800")
  if (/^\d{3,4}$/.test(timeStr)) {
    const timeNum = timeStr.padStart(4, '0');
    const hours = timeNum.substring(0, 2);
    const minutes = timeNum.substring(2, 4);
    return `${hours}:${minutes}`;
  }
  
  return '08:00';
}

/**
 * Detect file format based on content
 */
function detectFileFormat(content) {
  const trimmedContent = content.trim();
  
  // Check for JSON
  if ((trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) ||
      (trimmedContent.startsWith('[') && trimmedContent.endsWith(']'))) {
    return 'json';
  }
  
  // Check for CSV (commas in first line)
  const firstLine = trimmedContent.split('\n')[0];
  if (firstLine && firstLine.includes(',') && firstLine.split(',').length > 2) {
    return 'csv';
  }
  
  // Default to custom text format
  return 'text';
}

/**
 * Main function to read and parse course file
 */
export async function readCourseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        const format = detectFileFormat(content);
        
        let courses = [];
        
        switch (format) {
          case 'json':
            courses = parseJSON(content);
            break;
          case 'csv':
            courses = parseCSV(content);
            break;
          case 'text':
            courses = parseCustomText(content);
            break;
          default:
            throw new Error('Format de fichier non supporté');
        }
        
        resolve({
          courses,
          format,
          filename: file.name,
          count: courses.length
        });
      } catch (error) {
        reject(new Error(`Erreur lors de la lecture du fichier: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Validate course data
 */
export function validateCourses(courses) {
  const errors = [];
  const warnings = [];
  
  courses.forEach((course, index) => {
    const courseNum = index + 1;
    
    // Required fields
    if (!course.patient || course.patient.trim() === '') {
      errors.push(`Course ${courseNum}: Nom du patient manquant`);
    }
    
    if (!course.pickup || course.pickup.trim() === '') {
      warnings.push(`Course ${courseNum}: Lieu de départ manquant`);
    }
    
    if (!course.destination || course.destination.trim() === '') {
      warnings.push(`Course ${courseNum}: Destination manquante`);
    }
    
    // Coordinates validation
    if (!Array.isArray(course.coordinates) || course.coordinates.length !== 2) {
      warnings.push(`Course ${courseNum}: Coordonnées de départ invalides`);
    } else {
      const [lng, lat] = course.coordinates;
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        warnings.push(`Course ${courseNum}: Coordonnées de départ hors limites`);
      }
    }
    
    if (!Array.isArray(course.destinationCoords) || course.destinationCoords.length !== 2) {
      warnings.push(`Course ${courseNum}: Coordonnées de destination invalides`);
    }
    
    // Time validation
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(course.appointmentTime)) {
      warnings.push(`Course ${courseNum}: Format d'heure invalide (${course.appointmentTime})`);
    }
    
    // Duration validation
    if (course.duration && (course.duration < 5 || course.duration > 480)) {
      warnings.push(`Course ${courseNum}: Durée inhabituelle (${course.duration} minutes)`);
    }
  });
  
  return { errors, warnings };
}

/**
 * Generate example files for download
 */
export const generateExampleFiles = {
  csv: () => {
    const csvContent = `id,prenom,nom,pickup,destination,pickup_lng,pickup_lat,dest_lng,dest_lat,appointment_time,duration,vehicule_type
1,Jean,Dupont,Carpentras Centre,CHU Avignon,5.0481,44.2550,4.8050,43.9320,08:30,60,VSL
2,Marie,Martin,Monteux,Clinique Avignon,5.0089,44.0381,4.8150,43.9300,09:15,45,Ambulance
3,Pierre,Leroy,Pernes-les-Fontaines,CHU Marseille,5.0589,44.0061,5.3950,43.2784,10:00,0,VSL
4,Sophie,Blanc,L'Isle-sur-la-Sorgue,Hôpital Carpentras,5.0514,43.9189,5.0520,44.2580,14:30,30,Taxi`;
    
    return new Blob([csvContent], { type: 'text/csv' });
  },
  
  json: () => {
    const jsonData = {
      courses: [
        {
          id: 1,
          prenom: "Jean",
          nom: "Dupont",
          pickup: "Carpentras Centre",
          destination: "CHU Avignon",
          coordinates: [5.0481, 44.2550],
          destinationCoords: [4.8050, 43.9320],
          appointmentTime: "08:30",
          duration: 60
        },
        {
          id: 2,
          patient: "Marie Martin", // Alternative format
          pickup: "Monteux",
          destination: "Clinique Avignon",
          coordinates: [5.0089, 44.0381],
          destinationCoords: [4.8150, 43.9300],
          appointmentTime: "09:15",
          duration: 45
        },
        {
          id: 3,
          prenom: "Pierre",
          nom: "Leroy",
          pickup: "Pernes-les-Fontaines",
          destination: "CHU Marseille",
          coordinates: [5.0589, 44.0061],
          destinationCoords: [5.3950, 43.2784],
          appointmentTime: "10:00",
          duration: 90
        }
      ]
    };
    
    return new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
  },
  
  text: () => {
    const textContent = `# Fichier de courses AmbuSched
# Format: clé: valeur

--- Course 1 ---
prenom: Jean
nom: Dupont
pickup: Carpentras Centre
destination: CHU Avignon
pickup_coords: 5.0481, 44.2550
dest_coords: 4.8050, 43.9320
appointment_time: 08:30
duration: 60

--- Course 2 ---
patient: Marie Martin
pickup: Monteux
destination: Clinique Avignon
pickup_coords: 5.0089, 44.0381
dest_coords: 4.8150, 43.9300
appointment_time: 09:15
duration: 45

--- Course 3 ---
prenom: Pierre
nom: Leroy
pickup: Pernes-les-Fontaines
destination: CHU Marseille
pickup_coords: 5.0589, 44.0061
dest_coords: 5.3950, 43.2784
appointment_time: 10:00
duration: 90`;
    
    return new Blob([textContent], { type: 'text/plain' });
  }
};

export default {
  readCourseFile,
  validateCourses,
  generateExampleFiles
};
