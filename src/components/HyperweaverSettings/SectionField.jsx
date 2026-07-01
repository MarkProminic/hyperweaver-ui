import PropTypes from 'prop-types';

import CollectionManager from './CollectionManager';
import FieldRenderer from './FieldRenderer';

/**
 * SectionField - dispatches a single config field to the right renderer:
 * `type: collection` fields are managed by CollectionManager (list + CRUD via the
 * dedicated collection endpoints); everything else renders through FieldRenderer.
 * Keeps the collection-vs-scalar decision in one place so every section renderer
 * stays uniform.
 */
const SectionField = ({
  field,
  values,
  sslFiles,
  uploadingFiles,
  loading,
  onFieldChange,
  onSslFileUpload,
  setMsg,
  setRequiresRestart,
}) => {
  if (field.type === 'collection') {
    return (
      <CollectionManager
        field={field}
        setMsg={setMsg}
        setRequiresRestart={setRequiresRestart}
        loading={loading}
      />
    );
  }

  return (
    <FieldRenderer
      field={field}
      values={values}
      sslFiles={sslFiles}
      uploadingFiles={uploadingFiles}
      loading={loading}
      onFieldChange={onFieldChange}
      onSslFileUpload={onSslFileUpload}
    />
  );
};

SectionField.propTypes = {
  field: PropTypes.object.isRequired,
  values: PropTypes.object.isRequired,
  sslFiles: PropTypes.object.isRequired,
  uploadingFiles: PropTypes.object.isRequired,
  loading: PropTypes.bool.isRequired,
  onFieldChange: PropTypes.func.isRequired,
  onSslFileUpload: PropTypes.func.isRequired,
  setMsg: PropTypes.func.isRequired,
  setRequiresRestart: PropTypes.func.isRequired,
};

export default SectionField;
