import PropTypes from 'prop-types';
import { useState, useRef, useEffect } from 'react';

import { useServers } from '../../../../../contexts/ServerContext';
import FormModal from '../../../../common/FormModal';

const ArtifactUploadModal = ({ server, storagePaths, onClose, onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    storage_path_id: '',
    checksum: '',
    checksum_algorithm: 'sha256',
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errors, setErrors] = useState({});
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const nextFileId = useRef(0);
  const { makeAgentRequest } = useServers();

  const enabledStoragePaths = storagePaths.filter(path => path.enabled);

  // Set default storage path if only one is available
  useEffect(() => {
    if (enabledStoragePaths.length === 1 && !formData.storage_path_id) {
      setFormData(prev => ({
        ...prev,
        storage_path_id: enabledStoragePaths[0].id,
      }));
    }
  }, [enabledStoragePaths, formData.storage_path_id]);

  const validateForm = () => {
    const newErrors = {};

    if (selectedFiles.length === 0) {
      newErrors.files = 'At least one file is required';
    }

    if (!formData.storage_path_id) {
      newErrors.storage_path_id = 'Storage location is required';
    }

    if (formData.checksum.trim() && !formData.checksum_algorithm) {
      newErrors.checksum_algorithm = 'Checksum algorithm is required when checksum is provided';
    }

    const validExtensions = ['.iso', '.img', '.vmdk', '.vhd', '.vhdx', '.qcow2'];

    for (const entry of selectedFiles) {
      const extension = entry.file.name.toLowerCase().substring(entry.file.name.lastIndexOf('.'));
      if (!validExtensions.includes(extension)) {
        newErrors.files = `File "${entry.file.name}" has an unsupported file type. Supported: ${validExtensions.join(', ')}`;
        break;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleFileSelect = files => {
    const fileArray = Array.from(files).map(file => {
      const id = nextFileId.current;
      nextFileId.current += 1;
      return { id, file };
    });
    setSelectedFiles(fileArray);

    if (errors.files) {
      setErrors(prev => ({
        ...prev,
        files: '',
      }));
    }
  };

  const handleFileInputChange = e => {
    handleFileSelect(e.target.files);
  };

  const handleDragOver = e => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = e => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = e => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = fileId => {
    setSelectedFiles(prev => prev.filter(entry => entry.id !== fileId));
  };

  const formatFileSize = bytes => {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const getProgressTagClass = progressStatus => {
    if (progressStatus === 'completed') {
      return 'text-bg-success';
    }
    if (progressStatus === 'error') {
      return 'text-bg-danger';
    }
    return 'text-bg-info';
  };

  const uploadFile = async (file, onProgress) => {
    try {
      // Step 1: Prepare upload with JSON metadata
      const prepareData = {
        filename: file.name,
        size: file.size,
        storage_path_id: formData.storage_path_id,
        overwrite_existing: false,
      };

      // Only add checksum fields if user actually provides a checksum
      if (formData.checksum.trim()) {
        prepareData.checksum = formData.checksum.trim();
        prepareData.checksum_algorithm = formData.checksum_algorithm;
      }

      const prepareResult = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'artifacts/upload/prepare',
        'POST',
        prepareData
      );

      if (!prepareResult.success || !prepareResult.data?.task_id) {
        throw new Error(`Prepare upload failed: ${prepareResult.message || 'No task ID received'}`);
      }

      const taskId = prepareResult.data.task_id;

      // Step 2: Upload file using task ID
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const uploadResult = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `artifacts/upload/${taskId}`,
        'POST',
        formDataUpload,
        null,
        false,
        onProgress
      );

      return uploadResult;
    } catch (uploadErr) {
      throw new Error(`Upload failed: ${uploadErr.message}`);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setUploadProgress({});

      const results = await Promise.all(
        selectedFiles.map(({ file }) => {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: { status: 'uploading', progress: 0 },
          }));

          return uploadFile(file, progressEvent => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: {
                status: 'uploading',
                progress: percent,
                loaded: progressEvent.loaded,
                total: progressEvent.total,
              },
            }));
          })
            .then(result => {
              if (result.success) {
                setUploadProgress(prev => ({
                  ...prev,
                  [file.name]: { status: 'completed', progress: 100 },
                }));
                return {
                  file: file.name,
                  success: true,
                  task_id: result.data?.task_id,
                  data: result.data,
                };
              }

              setUploadProgress(prev => ({
                ...prev,
                [file.name]: {
                  status: 'error',
                  progress: 0,
                  error: result.message,
                },
              }));
              return {
                file: file.name,
                success: false,
                error: result.message,
              };
            })
            .catch(fileErr => {
              setUploadProgress(prev => ({
                ...prev,
                [file.name]: {
                  status: 'error',
                  progress: 0,
                  error: fileErr.message,
                },
              }));
              return {
                file: file.name,
                success: false,
                error: fileErr.message,
              };
            });
        })
      );

      // Check if any uploads succeeded
      const successfulUploads = results.filter(r => r.success);
      if (successfulUploads.length > 0) {
        onSuccess(results);
      } else {
        onError('All uploads failed. Please check the files and try again.');
      }
    } catch (submitErr) {
      onError(`Error during upload: ${submitErr.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedStoragePath = enabledStoragePaths.find(p => p.id === formData.storage_path_id);

  if (enabledStoragePaths.length === 0) {
    return (
      <FormModal
        isOpen
        onClose={onClose}
        title="Upload Files"
        icon="fas fa-upload"
        submitText="Close"
        submitVariant="is-info"
      >
        <div className="alert alert-warning">
          <p>
            <strong>No enabled storage locations available.</strong>
          </p>
          <p>
            You need at least one enabled storage location before you can upload artifacts. Please
            create or enable a storage location first.
          </p>
        </div>
      </FormModal>
    );
  }

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Upload Files"
      icon="fas fa-upload"
      submitText={loading ? 'Uploading...' : 'Upload Files'}
      submitVariant="is-primary"
      submitIcon="fas fa-upload"
      loading={loading}
      disabled={selectedFiles.length === 0}
      showCancelButton
    >
      <div className="mb-3">
        <label htmlFor="upload-storage-location" className="form-label">
          Storage Location
        </label>
        <select
          id="upload-storage-location"
          value={formData.storage_path_id}
          onChange={e => handleInputChange('storage_path_id', e.target.value)}
          disabled={loading}
          className={`form-select ${errors.storage_path_id ? 'is-invalid' : ''}`}
        >
          <option value="">Select storage location...</option>
          {enabledStoragePaths.map(path => (
            <option key={path.id} value={path.id}>
              {path.name} ({path.type}) - {path.path}
            </option>
          ))}
        </select>
        {errors.storage_path_id && (
          <p className="form-text text-danger">{errors.storage_path_id}</p>
        )}
        <p className="form-text text-muted">Where to store the uploaded files</p>
      </div>

      <div className="mb-3">
        <label htmlFor="artifact-upload-file-input" className="form-label">
          Files
        </label>
        <div
          className={`border rounded p-4 text-center ${dragOver ? 'border-primary bg-body-tertiary' : ''} ${errors.files ? 'bg-danger-subtle' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              void e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <div className="mb-2">
            <i className="fas fa-upload" />
          </div>
          <div className="mb-3">
            {dragOver ? 'Drop files here' : 'Choose files or drag and drop'}
          </div>
          <input
            id="artifact-upload-file-input"
            ref={fileInputRef}
            className="form-control"
            type="file"
            multiple
            accept=".iso,.img,.vmdk,.vhd,.vhdx,.qcow2"
            onChange={handleFileInputChange}
            disabled={loading}
          />
        </div>
        {errors.files && <p className="form-text text-danger">{errors.files}</p>}
        <p className="form-text text-muted">Supported formats: ISO, IMG, VMDK, VHD, VHDX, QCOW2</p>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="mb-3">
          <span className="form-label">Selected Files ({selectedFiles.length})</span>
          <div className="card">
            <div className="card-body">
              {selectedFiles.map(({ id, file }) => {
                const progress = uploadProgress[file.name];
                return (
                  <div key={id}>
                    <div>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div>
                            <strong>{file.name}</strong>
                            <br />
                            <small>{formatFileSize(file.size)}</small>
                          </div>
                        </div>
                        <div className="d-flex align-items-center">
                          {!loading && (
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => removeFile(id)}
                            >
                              <span>
                                <i className="fas fa-times" />
                              </span>
                            </button>
                          )}
                          {progress && (
                            <span className={`badge ms-2 ${getProgressTagClass(progress.status)}`}>
                              {progress.status === 'uploading' && `${progress.progress}%`}
                              {progress.status === 'completed' && 'Complete'}
                              {progress.status === 'error' && 'Error'}
                            </span>
                          )}
                        </div>
                      </div>
                      {progress && progress.status === 'uploading' && (
                        <div className="mt-2">
                          <div className="progress" style={{ height: '0.5rem' }} role="progressbar">
                            <div
                              className="progress-bar bg-primary"
                              style={{ width: `${progress.progress}%` }}
                            />
                          </div>
                          <div className="small text-muted">
                            {progress.loaded && progress.total && (
                              <span>
                                {formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {progress && progress.status === 'error' && (
                        <div className="alert alert-danger mt-2">{progress.error}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="artifact-checksum-input" className="form-label">
          Checksum (Optional)
        </label>
        <div className="input-group">
          <input
            id="artifact-checksum-input"
            className="form-control"
            type="text"
            placeholder="Expected checksum for verification"
            value={formData.checksum}
            onChange={e => handleInputChange('checksum', e.target.value)}
            disabled={loading}
          />
          <select
            className="form-select"
            value={formData.checksum_algorithm}
            onChange={e => handleInputChange('checksum_algorithm', e.target.value)}
            disabled={loading || !formData.checksum.trim()}
          >
            <option value="md5">MD5</option>
            <option value="sha1">SHA1</option>
            <option value="sha256">SHA256</option>
          </select>
        </div>
        <p className="form-text text-muted">
          Optional checksum for file integrity verification (applies to all files)
        </p>
      </div>

      {selectedStoragePath && (
        <div className="alert alert-info">
          <div>
            <p>
              <strong>Upload Destination:</strong>
            </p>
            <ul>
              <li>
                <strong>Name:</strong> {selectedStoragePath.name}
              </li>
              <li>
                <strong>Path:</strong> {selectedStoragePath.path}
              </li>
              <li>
                <strong>Type:</strong> {selectedStoragePath.type.toUpperCase()}
              </li>
              <li>
                <strong>Current Files:</strong> {selectedStoragePath.file_count || 0}
              </li>
            </ul>
          </div>
        </div>
      )}
    </FormModal>
  );
};

ArtifactUploadModal.propTypes = {
  server: PropTypes.object.isRequired,
  storagePaths: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default ArtifactUploadModal;
