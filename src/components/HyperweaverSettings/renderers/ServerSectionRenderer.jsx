import PropTypes from 'prop-types';

import SectionField from '../SectionField';

const ServerSectionRenderer = ({
  section,
  values,
  sslFiles,
  uploadingFiles,
  loading,
  onFieldChange,
  onSslFileUpload,
  setMsg,
  setRequiresRestart,
}) => (
  <div className="row g-3">
    {section.fields.map(field => {
      // Check if this is an SSL certificate field (kept for layout purposes - SSL fields take full width)
      const isSSLField =
        field.type === 'ssl' ||
        (field.path.includes('ssl_') &&
          (field.path.includes('_path') ||
            field.path.includes('_cert') ||
            field.path.includes('_key'))) ||
        field.path.includes('ca_cert') ||
        field.path.includes('ca_certificate') ||
        (field.type === 'string' &&
          (field.path.includes('cert') || field.path.includes('key')) &&
          (field.path.includes('path') ||
            field.description?.toLowerCase().includes('certificate') ||
            field.description?.toLowerCase().includes('key')));

      return (
        <div
          key={field.path}
          className={
            isSSLField ||
            field.type === 'textarea' ||
            field.type === 'array' ||
            field.type === 'collection'
              ? 'col-12'
              : 'col-12 col-lg-6'
          }
        >
          <SectionField
            field={field}
            values={values}
            sslFiles={sslFiles}
            uploadingFiles={uploadingFiles}
            loading={loading}
            onFieldChange={onFieldChange}
            onSslFileUpload={onSslFileUpload}
            setMsg={setMsg}
            setRequiresRestart={setRequiresRestart}
          />
        </div>
      );
    })}
  </div>
);

ServerSectionRenderer.propTypes = {
  section: PropTypes.object.isRequired,
  values: PropTypes.object.isRequired,
  sslFiles: PropTypes.object.isRequired,
  uploadingFiles: PropTypes.object.isRequired,
  loading: PropTypes.bool.isRequired,
  onFieldChange: PropTypes.func.isRequired,
  onSslFileUpload: PropTypes.func.isRequired,
  setMsg: PropTypes.func.isRequired,
  setRequiresRestart: PropTypes.func.isRequired,
};

export default ServerSectionRenderer;
