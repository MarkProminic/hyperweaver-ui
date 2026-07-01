import PropTypes from 'prop-types';
import { useCallback } from 'react';

import { isFieldVisible } from '../../../utils/settingsUtils';
import SectionField from '../SectionField';

const SubsectionRenderer = ({
  sectionName,
  subsectionName,
  subsection,
  section,
  isCollapsed,
  toggleSubsection,
  values,
  sslFiles,
  uploadingFiles,
  onFieldChange,
  onSslFileUpload,
  setMsg,
  setRequiresRestart,
  loading,
}) => {
  const handleToggle = useCallback(() => {
    toggleSubsection(sectionName, subsectionName);
  }, [sectionName, subsectionName, toggleSubsection]);

  const handleKeyDown = useCallback(
    e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  // Only the fields whose conditional currently applies to the configuration.
  const visibleFields = (subsection.fields || []).filter(field => isFieldVisible(field, values));

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div
          className="cursor-pointer pb-2"
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-expanded={!isCollapsed}
        >
          <h3 className="fs-6 fw-bold mb-2">
            <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'} me-2`} />
            <i className={`${section.icon} me-2`} />
            {subsection.title}
            <span className="badge text-bg-light ms-2">
              {visibleFields.length} setting
              {visibleFields.length !== 1 ? 's' : ''}
            </span>
          </h3>
        </div>

        {/* Collapsible Content */}
        {!isCollapsed && (
          <div className="mt-3">
            <div className="row g-3">
              {visibleFields.map(field => (
                <div
                  key={field.path}
                  className={
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
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

SubsectionRenderer.propTypes = {
  sectionName: PropTypes.string.isRequired,
  subsectionName: PropTypes.string.isRequired,
  subsection: PropTypes.object.isRequired,
  section: PropTypes.object.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  toggleSubsection: PropTypes.func.isRequired,
  values: PropTypes.object.isRequired,
  sslFiles: PropTypes.object.isRequired,
  uploadingFiles: PropTypes.object.isRequired,
  onFieldChange: PropTypes.func.isRequired,
  onSslFileUpload: PropTypes.func.isRequired,
  setMsg: PropTypes.func.isRequired,
  setRequiresRestart: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default SubsectionRenderer;
