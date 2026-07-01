import PropTypes from 'prop-types';

import SectionField from '../SectionField';

const StandardSectionRenderer = ({
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
    {section.fields.map(field => (
      <div
        key={field.path}
        className={
          field.type === 'textarea' || field.type === 'array' || field.type === 'collection'
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
    ))}
  </div>
);

StandardSectionRenderer.propTypes = {
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

export default StandardSectionRenderer;
