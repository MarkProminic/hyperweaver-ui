import PropTypes from 'prop-types';

import { isFieldVisible } from '../../utils/settingsUtils';

const FieldRenderer = ({
  field,
  values,
  sslFiles,
  uploadingFiles,
  loading,
  onFieldChange,
  onSslFileUpload,
}) => {
  // SSL file field renderer for certificate, key, and CA files
  const renderSSLFileField = sslField => {
    // Skip field if conditional logic says to hide it
    if (!isFieldVisible(sslField, values)) {
      return null;
    }

    const currentValue =
      values[sslField.path] !== undefined ? values[sslField.path] : sslField.value;
    const isUploading = uploadingFiles[sslField.path];
    const uploadedFile = sslFiles[sslField.path];

    // Determine SSL file type and appropriate settings
    const getSSLFileConfig = path => {
      if (path.includes('ssl_key_path')) {
        return {
          type: 'Private Key',
          icon: 'fas fa-key',
          color: 'danger',
          accept: '.key,.pem',
          description: 'Private key file (.key or .pem format)',
        };
      } else if (path.includes('ssl_cert_path')) {
        return {
          type: 'Certificate',
          icon: 'fas fa-certificate',
          color: 'success',
          accept: '.crt,.pem,.cer',
          description: 'SSL certificate file (.crt, .pem, or .cer format)',
        };
      } else if (
        path.includes('ssl_ca_path') ||
        path.includes('ca_cert') ||
        path.includes('ca_certificate')
      ) {
        return {
          type: 'CA Certificate',
          icon: 'fas fa-shield-alt',
          color: 'info',
          accept: '.ca,.crt,.pem,.cer',
          description: 'Certificate Authority file (.ca, .crt, .pem, or .cer format)',
        };
      }
      return {
        type: 'SSL File',
        icon: 'fas fa-file',
        color: 'primary',
        accept: '.pem,.crt,.key,.cer,.ca',
        description: 'SSL certificate file',
      };
    };

    const config = getSSLFileConfig(sslField.path);

    const handleFileInputChange = e => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        onSslFileUpload(sslField.path, selectedFile);
      }
    };

    return (
      <div className="mb-4" key={sslField.path}>
        <label className="form-label" htmlFor={sslField.path}>
          <i className={`${config.icon} text-${config.color} me-2`} />
          {sslField.label}
        </label>

        {/* File path input - always visible */}
        <div className="mb-2">
          <label className="form-label small" htmlFor={`${sslField.path}-input`}>
            File Path:
          </label>
          <input
            id={`${sslField.path}-input`}
            className="form-control form-control-sm"
            type="text"
            value={currentValue || ''}
            onChange={e => onFieldChange(sslField.path, e.target.value)}
            placeholder={sslField.placeholder || 'Enter file path...'}
            disabled={loading}
          />
          <p className="form-text">
            Specify where the uploaded file should be saved. The upload will update this path
            automatically.
          </p>
        </div>

        {/* File upload */}
        <input
          id={`${sslField.path}-file`}
          className="form-control"
          type="file"
          accept={config.accept}
          onChange={handleFileInputChange}
          disabled={loading || isUploading}
        />
        {isUploading && (
          <p className="form-text">
            <i className="fas fa-spinner fa-pulse me-1" />
            Uploading {config.type}…
          </p>
        )}

        {/* File status and info */}
        {uploadedFile && (
          <div className="alert alert-success p-2 mt-2">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="small mb-0">
                  <strong>{uploadedFile.name}</strong> ({(uploadedFile.size / 1024).toFixed(1)} KB)
                </p>
                <p className="small text-muted mb-0">
                  Uploaded to: <code>{uploadedFile.uploadedPath}</code>
                </p>
              </div>
              <i className="fas fa-check-circle text-success" />
            </div>
          </div>
        )}

        {sslField.description && (
          <p className="form-text text-muted">
            {sslField.description}
            <br />
            <small>
              <strong>Supported formats:</strong> {config.accept.replace(/\./g, '').toUpperCase()}
            </small>
          </p>
        )}
      </div>
    );
  };

  // Dynamic field renderer based on metadata type
  const renderField = fieldToRender => {
    // Skip field if conditional logic says to hide it
    if (!isFieldVisible(fieldToRender, values)) {
      return null;
    }

    const currentValue =
      values[fieldToRender.path] !== undefined ? values[fieldToRender.path] : fieldToRender.value;

    const handleInputChange = e => {
      const inputValue = fieldToRender.type === 'boolean' ? e.target.checked : e.target.value;
      onFieldChange(fieldToRender.path, inputValue);
    };

    const fieldProps = {
      key: fieldToRender.path,
      id: fieldToRender.path,
      value: currentValue || '',
      onChange: handleInputChange,
      placeholder: fieldToRender.placeholder,
      required: fieldToRender.required,
      disabled: loading,
    };

    let inputElement;

    if (fieldToRender.type === 'boolean') {
      inputElement = (
        <div className="form-check form-switch">
          <input
            id={fieldToRender.path}
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={!!currentValue}
            onChange={fieldProps.onChange}
            disabled={fieldProps.disabled}
          />
          <label className="form-check-label" htmlFor={fieldToRender.path}>
            {fieldToRender.label}
          </label>
        </div>
      );
    } else if (fieldToRender.type === 'integer') {
      inputElement = (
        <input
          className="form-control"
          type="number"
          {...fieldProps}
          min={fieldToRender.validation?.min}
          max={fieldToRender.validation?.max}
        />
      );
    } else if (fieldToRender.type === 'password') {
      inputElement = <input className="form-control" type="password" {...fieldProps} />;
    } else if (fieldToRender.type === 'email') {
      inputElement = <input className="form-control" type="email" {...fieldProps} />;
    } else if (fieldToRender.type === 'select') {
      inputElement = (
        <select className="form-select" {...fieldProps}>
          {fieldToRender.options &&
            fieldToRender.options
              .map(option => {
                // Handle both string and object options
                const optionValue = typeof option === 'object' ? option.value : option;
                let optionLabel = typeof option === 'object' ? option.label : option;

                // Skip empty/null values unless they're intentionally empty strings
                if (optionValue === null || optionValue === undefined) {
                  return null;
                }

                // Special handling for CORS allow_origin field
                if (fieldToRender.path === 'security.cors.allow_origin') {
                  if (optionValue === true) {
                    optionLabel = 'Allow all origins in whitelist';
                  } else if (optionValue === false) {
                    optionLabel = 'Deny all origins';
                  } else if (optionValue === 'specific') {
                    optionLabel = 'Use exact whitelist matching';
                  }
                }

                // Use a combination of value and label for unique key
                const uniqueKey = `${optionValue}-${optionLabel}`;

                return (
                  <option key={uniqueKey} value={optionValue}>
                    {optionLabel}
                  </option>
                );
              })
              .filter(Boolean)}
        </select>
      );
    } else if (fieldToRender.type === 'textarea') {
      inputElement = (
        <textarea
          className="form-control"
          {...fieldProps}
          rows={fieldToRender.validation?.rows || 3}
        />
      );
    } else if (fieldToRender.type === 'array') {
      const arrayValue = Array.isArray(currentValue) ? currentValue.join('\n') : currentValue || '';

      const handleArrayChange = e => {
        onFieldChange(fieldToRender.path, e.target.value.split('\n'));
      };

      inputElement = (
        <textarea
          id={fieldToRender.path}
          className="form-control"
          value={arrayValue}
          onChange={handleArrayChange}
          placeholder={fieldToRender.placeholder || 'One item per line'}
          disabled={fieldProps.disabled}
          rows={fieldToRender.validation?.rows || 4}
        />
      );
    } else {
      // default: 'string', 'host', etc.
      inputElement = <input className="form-control" type="text" {...fieldProps} />;
    }

    return (
      <div className="mb-3" key={fieldToRender.path}>
        {fieldToRender.type !== 'boolean' && (
          <label className="form-label" htmlFor={fieldToRender.path}>
            {fieldToRender.label}
          </label>
        )}
        {inputElement}
        {fieldToRender.description && (
          <p className="form-text text-muted">{fieldToRender.description}</p>
        )}
      </div>
    );
  };

  // Check if field is SSL type
  if (field.type === 'ssl') {
    return renderSSLFileField(field);
  }

  return renderField(field);
};

FieldRenderer.propTypes = {
  field: PropTypes.shape({
    path: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    label: PropTypes.string,
    value: PropTypes.any,
    placeholder: PropTypes.string,
    required: PropTypes.bool,
    description: PropTypes.string,
    options: PropTypes.array,
    validation: PropTypes.object,
    conditional: PropTypes.object,
  }).isRequired,
  values: PropTypes.object.isRequired,
  sslFiles: PropTypes.object.isRequired,
  uploadingFiles: PropTypes.object.isRequired,
  loading: PropTypes.bool.isRequired,
  onFieldChange: PropTypes.func.isRequired,
  onSslFileUpload: PropTypes.func.isRequired,
};

export default FieldRenderer;
