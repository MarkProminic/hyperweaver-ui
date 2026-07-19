import PropTypes from 'prop-types';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getHostsYml, putHostsYml } from '../../api/provisioningAPI';
import { FormModal } from '../common';

// Lazy on purpose: CodeMirror is a sizeable chunk — it downloads only when
// the editor actually opens, never with the page (the RDP-viewer pattern).
const HostsYmlEditor = lazy(() => import('./HostsYmlEditor'));

/**
 * Raw Hosts.yml editor (frozen hosts-yml contract) — the emergency hatch:
 * the WHOLE stored document as YAML, saved verbatim with key order
 * preserved. Live YAML lint as you type; a 400 lands the cursor on the
 * offending line; warnings are advisory and never block the save.
 */
const HostsYmlModal = ({ isOpen, onClose, currentServer, machineName, onSaved }) => {
  const { t } = useTranslation();
  const [yaml, setYaml] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [savedNote, setSavedNote] = useState('');
  const editorRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !currentServer || !machineName) {
      return;
    }
    setYaml('');
    setOriginal('');
    setError('');
    setWarnings([]);
    setSavedNote('');
    setLoading(true);
    getHostsYml(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName
    ).then(result => {
      setLoading(false);
      if (result.success) {
        const text = result.data?.yaml ?? '';
        setYaml(text);
        setOriginal(text);
      } else {
        setError(t('provisioning.hostsYmlModal.failedToLoad', { message: result.message }));
      }
    });
  }, [isOpen, currentServer, machineName, t]);

  const dirty = yaml !== original;

  const editorFallback = (
    <div className="d-flex align-items-center justify-content-center py-5 text-muted">
      <i className="fas fa-spinner fa-pulse me-2" />
      <span>{t('provisioning.hostsYmlModal.loadingEditor')}</span>
    </div>
  );

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setWarnings([]);
    setSavedNote('');
    const result = await putHostsYml(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName,
      yaml
    );
    setLoading(false);
    if (!result.success) {
      const line = result.data?.line;
      const column = result.data?.column;
      const position = line
        ? ` ${
            column
              ? t('provisioning.hostsYmlModal.lineColumnSuffix', { line, column })
              : t('provisioning.hostsYmlModal.lineSuffix', { line })
          }`
        : '';
      setError(`${result.data?.error || result.message}${position}`);
      editorRef.current?.jumpTo(line, column);
      return;
    }
    setOriginal(yaml);
    const advisories = Array.isArray(result.data?.warnings) ? result.data.warnings : [];
    onSaved(t('provisioning.hostsYmlModal.documentSaved', { machineName }));
    if (advisories.length > 0) {
      setWarnings(advisories);
      setSavedNote(t('provisioning.hostsYmlModal.savedWithAdvisories'));
      return;
    }
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSave}
      title={t('provisioning.hostsYmlModal.modalTitle', { machineName })}
      icon="fas fa-file-code"
      submitText={t('provisioning.hostsYmlModal.saveButton')}
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {savedNote && (
        <div className="alert alert-warning py-2">
          {savedNote}
          <ul className="mb-0">
            {warnings.map(warning => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      {dirty && (
        <p className="mb-2">
          <span className="badge text-bg-warning">
            {t('provisioning.hostsYmlModal.unsavedChanges')}
          </span>
        </p>
      )}
      <div className="border rounded overflow-hidden">
        <Suspense fallback={editorFallback}>
          <HostsYmlEditor ref={editorRef} value={yaml} onChange={setYaml} disabled={loading} />
        </Suspense>
      </div>
      <p className="form-text text-muted mb-0">
        {t('provisioning.hostsYmlModal.footerExplanation')}
      </p>
    </FormModal>
  );
};

HostsYmlModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  onSaved: PropTypes.func.isRequired,
};

export default HostsYmlModal;
