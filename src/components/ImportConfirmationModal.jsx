import React from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

const ImportConfirmationModal = ({ isOpen, onClose, onConfirm, importData, currentCourses }) => {
  if (!isOpen || !importData) return null;

  const { courses } = importData;
  const existingCount = currentCourses.length;
  
  // Check for duplicates
  const duplicates = [];
  const uniqueNewCourses = [];
  
  courses.forEach(newCourse => {
    const isDuplicate = currentCourses.some(existing => 
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
  
  const newCount = uniqueNewCourses.length;
  const duplicateCount = duplicates.length;
  const totalAfterImport = existingCount + newCount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Confirmer l'importation</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Import Summary */}
          <div className="mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Résumé de l'importation</h4>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-blue-700 font-medium">{existingCount}</div>
                  <div className="text-blue-600">Courses actuelles</div>
                </div>
                <div>
                  <div className="text-green-700 font-medium">+{newCount}</div>
                  <div className="text-green-600">Nouvelles courses</div>
                </div>
                {duplicateCount > 0 && (
                  <div>
                    <div className="text-orange-700 font-medium">{duplicateCount}</div>
                    <div className="text-orange-600">Doublons ignorés</div>
                  </div>
                )}
                <div>
                  <div className="text-gray-700 font-medium">{totalAfterImport}</div>
                  <div className="text-gray-600">Total après import</div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview of first few courses */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">
              Aperçu des courses à importer ({Math.min(5, newCount)} sur {newCount})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {uniqueNewCourses.slice(0, 5).map((course, index) => (
                <div key={index} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">{course.patient}</div>
                      <div className="text-sm text-gray-600">
                        {course.pickup} → {course.destination}
                      </div>
                      <div className="text-sm text-blue-600">
                        RDV: {course.appointmentTime}
                        {course.duration && ` (${course.duration}min)`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {newCount > 5 && (
                <div className="text-center text-sm text-gray-500 py-2">
                  ... et {newCount - 5} autres courses
                </div>
              )}
            </div>
          </div>

          {/* Warning about merge behavior */}
          <div className="mb-6">
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <div className="font-medium text-amber-900">Mode d'importation</div>
                <div className="text-sm text-amber-800 mt-1">
                  Les nouvelles courses seront ajoutées à votre liste existante. 
                  {duplicateCount > 0 && (
                    <span className="block mt-1">
                      <strong>{duplicateCount} doublon{duplicateCount > 1 ? 's' : ''}</strong> détecté{duplicateCount > 1 ? 's' : ''} 
                      (même patient, lieu et heure) et sera ignoré{duplicateCount > 1 ? 's' : ''}.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2 rounded-md font-medium ${
              newCount > 0 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={newCount === 0}
          >
            {newCount > 0 
              ? `Importer ${newCount} course${newCount > 1 ? 's' : ''}` 
              : 'Aucune nouvelle course à importer'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportConfirmationModal;
