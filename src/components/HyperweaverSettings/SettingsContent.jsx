import PropTypes from 'prop-types';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { isFieldVisible } from '../../utils/settingsUtils';

import LoggingSectionRenderer from './renderers/LoggingSectionRenderer';
import ServerSectionRenderer from './renderers/ServerSectionRenderer';
import StandardSectionRenderer from './renderers/StandardSectionRenderer';
import SubsectionRenderer from './renderers/SubsectionRenderer';

const SettingsContent = ({
  activeTab,
  sections,
  values,
  collapsedSubsections,
  setCollapsedSubsections,
  sslFiles,
  uploadingFiles,
  loading,
  onFieldChange,
  onSslFileUpload,
  setMsg,
  setRequiresRestart,
}) => {
  const { t } = useTranslation();
  const toggleSubsection = useCallback(
    (sectionName, subsectionName) => {
      const key = `${sectionName}-${subsectionName}`;
      setCollapsedSubsections(prev => ({
        ...prev,
        [key]: !prev[key],
      }));
    },
    [setCollapsedSubsections]
  );

  const isSubsectionCollapsed = useCallback(
    (sectionName, subsectionName) => {
      const key = `${sectionName}-${subsectionName}`;
      return collapsedSubsections[key] || false;
    },
    [collapsedSubsections]
  );

  const shouldShowSubsection = useCallback(
    subsection =>
      // Show a subsection only if at least one of its fields applies to the
      // current configuration (the rest are conditionally hidden).
      (subsection.fields || []).some(field => isFieldVisible(field, values)),
    [values]
  );

  const renderSectionFields = useCallback(
    (sectionName, section) => {
      if (sectionName === 'Logging') {
        return (
          <LoggingSectionRenderer
            values={values}
            handleFieldChange={onFieldChange}
            loading={loading}
          />
        );
      }

      if (sectionName === 'Server') {
        return (
          <ServerSectionRenderer
            section={section}
            values={values}
            sslFiles={sslFiles}
            uploadingFiles={uploadingFiles}
            loading={loading}
            onFieldChange={onFieldChange}
            onSslFileUpload={onSslFileUpload}
            setMsg={setMsg}
            setRequiresRestart={setRequiresRestart}
          />
        );
      }

      return (
        <StandardSectionRenderer
          section={section}
          values={values}
          sslFiles={sslFiles}
          uploadingFiles={uploadingFiles}
          loading={loading}
          onFieldChange={onFieldChange}
          onSslFileUpload={onSslFileUpload}
          setMsg={setMsg}
          setRequiresRestart={setRequiresRestart}
        />
      );
    },
    [
      values,
      sslFiles,
      uploadingFiles,
      onFieldChange,
      onSslFileUpload,
      loading,
      setMsg,
      setRequiresRestart,
    ]
  );

  return (
    <>
      {/* Dynamic Configuration Sections */}
      {Object.entries(sections).map(
        ([sectionName, section]) =>
          activeTab === sectionName && (
            <div key={sectionName}>
              {/* Main Section Fields */}
              {section.fields.length > 0 && (
                <div className="card mb-4">
                  <div className="card-body">
                    <h2 className="fs-5 fw-bold">
                      <i className={`${section.icon} me-2`} />
                      {t('settings.settingsContent.sectionSettings', { title: section.title })}
                      <span className="badge text-bg-light ms-2">
                        {t('settings.settingsContent.settingCount', {
                          count: section.fields.length,
                        })}
                      </span>
                    </h2>

                    {/* Section description from config */}
                    {section.description && (
                      <p className="text-muted mt-2 mb-4">{section.description}</p>
                    )}

                    {renderSectionFields(sectionName, section)}
                  </div>
                </div>
              )}

              {/* Subsections with Collapsible Cards */}
              {Object.entries(section.subsections || {}).map(([subsectionName, subsection]) => {
                // Skip subsection if none of its fields apply right now
                if (!shouldShowSubsection(subsection)) {
                  return null;
                }

                const isCollapsed = isSubsectionCollapsed(sectionName, subsectionName);

                return (
                  <SubsectionRenderer
                    key={subsectionName}
                    sectionName={sectionName}
                    subsectionName={subsectionName}
                    subsection={subsection}
                    section={section}
                    isCollapsed={isCollapsed}
                    toggleSubsection={toggleSubsection}
                    values={values}
                    sslFiles={sslFiles}
                    uploadingFiles={uploadingFiles}
                    onFieldChange={onFieldChange}
                    onSslFileUpload={onSslFileUpload}
                    setMsg={setMsg}
                    setRequiresRestart={setRequiresRestart}
                    loading={loading}
                  />
                );
              })}

              {/* Show default message if section has no fields or subsections */}
              {section.fields.length === 0 &&
                Object.keys(section.subsections || {}).length === 0 && (
                  <div className="card mb-4">
                    <div className="card-body">
                      <h2 className="fs-5 fw-bold">
                        <i className={`${section.icon} me-2`} />
                        {t('settings.settingsContent.sectionSettings', { title: section.title })}
                      </h2>

                      {section.description && (
                        <p className="text-muted mb-4">{section.description}</p>
                      )}

                      <div className="alert alert-info">
                        <p>{t('settings.settingsContent.noSettings')}</p>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )
      )}
    </>
  );
};

SettingsContent.propTypes = {
  activeTab: PropTypes.string.isRequired,
  sections: PropTypes.object.isRequired,
  values: PropTypes.object.isRequired,
  collapsedSubsections: PropTypes.object.isRequired,
  setCollapsedSubsections: PropTypes.func.isRequired,
  sslFiles: PropTypes.object.isRequired,
  uploadingFiles: PropTypes.object.isRequired,
  loading: PropTypes.bool.isRequired,
  onFieldChange: PropTypes.func.isRequired,
  onSslFileUpload: PropTypes.func.isRequired,
  setMsg: PropTypes.func.isRequired,
  setRequiresRestart: PropTypes.func.isRequired,
};

export default SettingsContent;
