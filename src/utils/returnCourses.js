/**
 * Return Course Generator for AmbuSched
 * Handles automatic generation of return trips for patients
 */

/**
 * Calculate the exit time for a course based on appointment time and duration
 */
function calculateExitTime(appointmentTime, duration) {
  const [hours, minutes] = appointmentTime.split(':').map(Number);
  const appointmentMinutes = hours * 60 + minutes;
  const exitMinutes = appointmentMinutes + duration;
  
  const exitHours = Math.floor(exitMinutes / 60);
  const exitMins = exitMinutes % 60;
  
  return `${exitHours.toString().padStart(2, '0')}:${exitMins.toString().padStart(2, '0')}`;
}

/**
 * Calculate the earliest pickup time for return trip (exit + buffer time)
 */
function calculateReturnPickupTime(exitTime, bufferMinutes = 15) {
  const [hours, minutes] = exitTime.split(':').map(Number);
  const exitMinutes = hours * 60 + minutes;
  const returnMinutes = exitMinutes + bufferMinutes;
  
  const returnHours = Math.floor(returnMinutes / 60);
  const returnMins = returnMinutes % 60;
  
  return `${returnHours.toString().padStart(2, '0')}:${returnMins.toString().padStart(2, '0')}`;
}

/**
 * Generate return course for a given course
 */
export function generateReturnCourse(originalCourse, newId) {
  // Calculate exit time from appointment time and duration
  const exitTime = originalCourse.returnTime || 
    calculateExitTime(originalCourse.appointmentTime, originalCourse.duration);
  
  // Calculate earliest return pickup time (exit + 15 minutes buffer)
  const returnPickupTime = calculateReturnPickupTime(exitTime, 15);
  
  return {
    id: newId,
    patient: originalCourse.patient,
    pickup: originalCourse.destination, // Switch: destination becomes pickup
    destination: originalCourse.pickup, // Switch: pickup becomes destination
    coordinates: [...originalCourse.destinationCoords], // Switch coordinates
    destinationCoords: [...originalCourse.coordinates], // Switch coordinates
    appointmentTime: exitTime, // For return courses, this is when patient is available for pickup
    duration: 30, // Default return duration
    returnTime: null, // No return for return trips
    isReturnTrip: true,
    originalCourseId: originalCourse.id,
    vehicleType: originalCourse.vehicleType || 'VSL',
    exitTime: exitTime, // When patient finished appointment
    earliestPickupTime: returnPickupTime, // Earliest we can pick up (with buffer)
    maxWaitTime: 240 // Maximum wait time in minutes (4 hours - mandatory pickup)
  };
}

/**
 * Generate return courses for an array of courses
 */
export function generateReturnCourses(courses) {
  const returnCourses = [];
  let maxId = Math.max(...courses.map(c => c.id), 0);
  
  courses.forEach(course => {
    // Only generate return for non-return courses that have duration > 0 or explicit return time that's not "00:00"
    const hasValidDuration = course.duration && course.duration > 0;
    const hasValidReturnTime = course.returnTime && course.returnTime !== '00:00' && course.returnTime !== '0:00';
    
    console.log(`🔍 Checking course ${course.id} (${course.patient}):`, {
      duration: course.duration,
      returnTime: course.returnTime,
      hasValidDuration,
      hasValidReturnTime,
      isReturnTrip: course.isReturnTrip
    });
    
    if (!course.isReturnTrip && (hasValidDuration || hasValidReturnTime)) {
      console.log(`✅ Generating return course for ${course.id}`);
      const returnCourse = generateReturnCourse(course, ++maxId);
      console.log(`📝 Return course ${returnCourse.id} details:`, {
        exitTime: returnCourse.exitTime,
        earliestPickupTime: returnCourse.earliestPickupTime,
        appointmentTime: returnCourse.appointmentTime,
        maxWaitTime: returnCourse.maxWaitTime
      });
      returnCourses.push(returnCourse);
    } else {
      console.log(`❌ No return course for ${course.id}: isReturnTrip=${course.isReturnTrip}, validDuration=${hasValidDuration}, validReturnTime=${hasValidReturnTime}`);
    }
  });
  
  return returnCourses;
}

/**
 * Process courses and auto-generate returns
 */
export function processCoursesWithReturns(courses) {
  const returnCourses = generateReturnCourses(courses);
  return [...courses, ...returnCourses];
}

/**
 * Calculate waiting time for a return course given actual pickup time
 */
export function calculateWaitingTime(returnCourse, actualPickupTime) {
  if (!returnCourse.isReturnTrip || !returnCourse.exitTime) {
    return 0;
  }
  
  const [exitHours, exitMinutes] = returnCourse.exitTime.split(':').map(Number);
  const [pickupHours, pickupMinutes] = actualPickupTime.split(':').map(Number);
  
  const exitTotalMinutes = exitHours * 60 + exitMinutes;
  const pickupTotalMinutes = pickupHours * 60 + pickupMinutes;
  
  return Math.max(0, pickupTotalMinutes - exitTotalMinutes);
}

/**
 * Check if a return course exceeds maximum wait time
 */
export function isWaitTimeExcessive(returnCourse, actualPickupTime) {
  const waitTime = calculateWaitingTime(returnCourse, actualPickupTime);
  return waitTime > (returnCourse.maxWaitTime || 60);
}

/**
 * Format waiting time for display
 */
export function formatWaitingTime(minutes) {
  if (minutes === 0) return 'Aucune attente';
  if (minutes < 60) return `${minutes} min d'attente`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h d'attente`;
  }
  return `${hours}h${remainingMinutes.toString().padStart(2, '0')} d'attente`;
}

export default {
  generateReturnCourse,
  generateReturnCourses,
  processCoursesWithReturns,
  calculateWaitingTime,
  isWaitTimeExcessive,
  formatWaitingTime
};
