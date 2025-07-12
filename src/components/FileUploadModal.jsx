import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle, AlertTriangle, X, Eye } from 'lucide-react';
import { readCourseFile, validateCourses, generateExampleFiles } from '../utils/fileReader';
import ImportConfirmationModal from './ImportConfirmationModal';

const FileUploadModal = ({ isOpen, onClose, onCoursesImported, currentCourses = [] }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle', 'uploading', 'success', 'error'
  const [uploadedData, setUploadedData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = [...e.dataTransfer.files];
    if (files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFileSelect = async (e) => {
    const files = [...e.target.files];
    if (files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFile = async (file) => {
    setUploadStatus('uploading');
    setUploadedData(null);
    setValidationResult(null);
    setPreviewData(null);

    try {
      const result = await readCourseFile(file);
      const validation = validateCourses(result.courses);
      
      setUploadedData(result);
      setValidationResult(validation);
      setPreviewData(result.courses.slice(0, 5)); // Show first 5 courses for preview
      setUploadStatus('success');
    } catch (error) {
      console.error('Error reading file:', error);
      setUploadStatus('error');
      setValidationResult({ errors: [error.message], warnings: [] });
    }
  };

  const handleImport = () => {
    if (uploadedData && uploadedData.courses && uploadedData.courses.length > 0) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmImport = () => {
    if (uploadedData && uploadedData.courses) {
      onCoursesImported(uploadedData.courses);
      setShowConfirmation(false);
      onClose();
      resetState();
    }
  };

  const resetState = () => {
    setUploadStatus('idle');
    setUploadedData(null);
    setValidationResult(null);
    setPreviewData(null);
    setShowConfirmation(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadExample = (format) => {
    const blob = generateExampleFiles[format]();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exemple_courses.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">              <div>
                <h3 className="text-lg font-semibold text-gray-900">Importer des courses</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Importez vos courses depuis un fichier CSV, JSON ou texte personnalisé
                </p>
                <div className="mt-2 text-xs text-gray-500">
                  <strong>Champs supportés:</strong> nom/prénom du patient, lieu de départ, destination, 
                  coordonnées (lat/lng), heure RDV, durée du rendez-vous
                </div>
              </div>
            <button
              onClick={() => {
                onClose();
                resetState();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Upload Area */}
          {uploadStatus === 'idle' && (
            <div>
              {/* Drag & Drop Zone */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Glissez votre fichier ici ou cliquez pour sélectionner
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Formats supportés: CSV, JSON, TXT (jusqu'à 10MB)
                </p>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
                >
                  Sélectionner un fichier
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".csv,.json,.txt"
                  className="hidden"
                />
              </div>

              {/* Example Files */}
              <div className="mt-6">
                <h5 className="text-sm font-medium text-gray-900 mb-3">
                  📄 Fichiers d'exemple à télécharger:
                </h5>
                <div className="flex gap-3">
                  <button
                    onClick={() => downloadExample('csv')}
                    className="flex items-center gap-2 bg-green-100 hover:bg-green-200 text-green-800 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Exemple CSV
                  </button>
                  <button
                    onClick={() => downloadExample('json')}
                    className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Exemple JSON
                  </button>
                  <button
                    onClick={() => downloadExample('text')}
                    className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-800 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Exemple TXT
                  </button>
                </div>
              </div>

              {/* Format Information */}
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h5 className="text-sm font-medium text-gray-900 mb-2">
                  📋 Champs requis/optionnels:
                </h5>
                <div className="text-xs text-gray-600 space-y-1">
                  <div><strong>Requis:</strong> nom_patient, lieu_depart, destination, heure_rdv</div>
                  <div><strong>Optionnels:</strong> coordonnées (lng/lat), durée_rdv</div>
                  <div><strong>Formats acceptés:</strong> Colonnes flexibles, plusieurs variantes de noms acceptées</div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {uploadStatus === 'uploading' && (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Lecture du fichier...</h4>
              <p className="text-sm text-gray-600">Analyse et validation en cours</p>
            </div>
          )}

          {/* Success State */}
          {uploadStatus === 'success' && uploadedData && (
            <div>
              {/* Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center mb-3">
                  <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                  <h4 className="text-lg font-medium text-green-900">
                    Fichier importé avec succès!
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-green-800">Fichier:</span>
                    <br />
                    <span className="text-green-700">{uploadedData.filename}</span>
                  </div>
                  <div>
                    <span className="font-medium text-green-800">Format:</span>
                    <br />
                    <span className="text-green-700 uppercase">{uploadedData.format}</span>
                  </div>
                  <div>
                    <span className="font-medium text-green-800">Courses:</span>
                    <br />
                    <span className="text-green-700">{uploadedData.count} trouvées</span>
                  </div>
                </div>
              </div>

              {/* Validation Results */}
              {validationResult && (
                <div className="mb-6">
                  {validationResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                        <h5 className="font-medium text-red-900">
                          Erreurs ({validationResult.errors.length})
                        </h5>
                      </div>
                      <ul className="text-sm text-red-700 space-y-1">
                        {validationResult.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {validationResult.warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                        <h5 className="font-medium text-yellow-900">
                          Avertissements ({validationResult.warnings.length})
                        </h5>
                      </div>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        {validationResult.warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Preview */}
              {previewData && (
                <div className="mb-6">
                  <div className="flex items-center mb-3">
                    <Eye className="w-5 h-5 text-gray-600 mr-2" />
                    <h5 className="font-medium text-gray-900">
                      Aperçu des données (5 premiers)
                    </h5>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-2 px-2">Patient</th>
                          <th className="text-left py-2 px-2">Départ</th>
                          <th className="text-left py-2 px-2">Destination</th>
                          <th className="text-left py-2 px-2">Heure RDV</th>
                          <th className="text-left py-2 px-2">Durée</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((course, index) => (
                          <tr key={index} className="border-b border-gray-200">
                            <td className="py-2 px-2 font-medium">{course.patient}</td>
                            <td className="py-2 px-2">{course.pickup}</td>
                            <td className="py-2 px-2">{course.destination}</td>
                            <td className="py-2 px-2">{course.appointmentTime}</td>
                            <td className="py-2 px-2">{course.duration}min</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {uploadedData.count > 5 && (
                      <p className="text-center text-gray-500 mt-2">
                        ... et {uploadedData.count - 5} autres courses
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {uploadStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-red-900 mb-2">
                Erreur lors de l'importation
              </h4>
              {validationResult && validationResult.errors.length > 0 && (
                <div className="text-sm text-red-700 mb-4">
                  {validationResult.errors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              )}
              <button
                onClick={resetState}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium"
              >
                Réessayer
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {(uploadStatus === 'success' || uploadStatus === 'error') && (
          <div className="p-6 border-t flex justify-end gap-3">
            <button
              onClick={() => {
                onClose();
                resetState();
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Annuler
            </button>
            {uploadStatus === 'success' && validationResult?.errors.length === 0 && (
              <button
                onClick={handleImport}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Importer {uploadedData.count} course{uploadedData.count > 1 ? 's' : ''}
              </button>
            )}
            {uploadStatus === 'error' && (
              <button
                onClick={resetState}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Réessayer
              </button>
            )}
          </div>
        )}
      </div>

      {/* Import Confirmation Modal */}
      <ImportConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmImport}
        importData={uploadedData}
        currentCourses={currentCourses}
      />
    </div>
  );
};

export default FileUploadModal;
