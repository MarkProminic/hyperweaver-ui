import PropTypes from 'prop-types';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getServerOrgs,
  setServerOrgs,
  getMachineOrgs,
  setMachineOrgs,
  getKnownOrgs,
} from '../../api/orgAccessAPI';
import FormModal from '../common/FormModal';

const UUID_PATTERN = /^[0-9a-fA-F-]{8,}$/;

/**
 * OrgAssignmentModal - assign owning orgs to a registered agent (no machineName) or to
 * a single machine (machineName set). Options come from every org source the user can
 * reach; uuids outside that list stay editable as raw rows so a narrower-scoped manager
 * never silently drops another org's assignment.
 */
const OrgAssignmentModal = ({ isOpen, onClose, serverId, machineName = null, targetLabel }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [knownOrgs, setKnownOrgs] = useState([]);
  const [selected, setSelected] = useState([]);
  const [manualUuid, setManualUuid] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    const [assignment, known] = await Promise.all([
      machineName === null ? getServerOrgs(serverId) : getMachineOrgs(serverId, machineName),
      getKnownOrgs(),
    ]);
    if (assignment.success) {
      setSelected(assignment.orgs || []);
    } else if (assignment.status === 403) {
      setForbidden(true);
    } else {
      setError(assignment.message || t('host.orgAssignment.loadFailed'));
    }
    setKnownOrgs(known);
    setLoading(false);
  }, [serverId, machineName, t]);

  useEffect(() => {
    if (isOpen) {
      load();
    } else {
      setSelected([]);
      setManualUuid('');
      setError(null);
      setForbidden(false);
    }
  }, [isOpen, load]);

  const options = useMemo(() => {
    const rows = [...knownOrgs];
    const knownUuids = new Set(knownOrgs.map(org => org.uuid));
    for (const uuid of selected) {
      if (!knownUuids.has(uuid)) {
        rows.push({ uuid, name: null, roles: [], primary: false });
      }
    }
    return rows;
  }, [knownOrgs, selected]);

  const toggle = uuid => {
    setSelected(current =>
      current.includes(uuid) ? current.filter(item => item !== uuid) : [...current, uuid]
    );
  };

  const addManual = () => {
    const uuid = manualUuid.trim();
    if (!UUID_PATTERN.test(uuid)) {
      setError(t('host.orgAssignment.invalidUuid'));
      return;
    }
    setError(null);
    if (!selected.includes(uuid)) {
      setSelected(current => [...current, uuid]);
    }
    setManualUuid('');
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    const result =
      machineName === null
        ? await setServerOrgs(serverId, selected)
        : await setMachineOrgs(serverId, machineName, selected);
    setSaving(false);
    if (result.success) {
      onClose(true);
    } else if (result.status === 403) {
      setForbidden(true);
    } else {
      setError(result.message || t('host.orgAssignment.saveFailed'));
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={() => onClose(false)}
      onSubmit={handleSubmit}
      title={
        machineName === null
          ? t('host.orgAssignment.agentTitle', { target: targetLabel })
          : t('host.orgAssignment.machineTitle', { target: targetLabel })
      }
      icon="fas fa-building-user"
      submitText={t('host.orgAssignment.save')}
      loading={saving}
      disabled={loading || forbidden}
      showCancelButton
      cancelText={t('host.orgAssignment.cancel')}
    >
      {error && <div className="alert alert-danger">{error}</div>}
      {forbidden && <div className="alert alert-warning">{t('host.orgAssignment.forbidden')}</div>}
      <p className="text-muted">
        {machineName === null
          ? t('host.orgAssignment.agentHelp')
          : t('host.orgAssignment.machineHelp')}
      </p>
      {loading ? (
        <div className="text-center py-3">
          <span
            className="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          />
          {t('host.orgAssignment.loading')}
        </div>
      ) : (
        <>
          {options.length === 0 && (
            <p className="text-muted fst-italic">{t('host.orgAssignment.noKnownOrgs')}</p>
          )}
          {options.map(org => (
            <div className="form-check" key={org.uuid}>
              <input
                className="form-check-input"
                type="checkbox"
                id={`org-${org.uuid}`}
                checked={selected.includes(org.uuid)}
                onChange={() => toggle(org.uuid)}
                disabled={forbidden}
              />
              <label className="form-check-label" htmlFor={`org-${org.uuid}`}>
                {org.name || <code>{org.uuid}</code>}
                {org.name && <code className="ms-2 small text-muted">{org.uuid}</code>}
                {org.primary && (
                  <span className="badge text-bg-info ms-2">{t('host.orgAssignment.primary')}</span>
                )}
              </label>
            </div>
          ))}
          <div className="input-group mt-3">
            <input
              type="text"
              className="form-control"
              placeholder={t('host.orgAssignment.manualUuidPlaceholder')}
              value={manualUuid}
              onChange={e => setManualUuid(e.target.value)}
              disabled={forbidden}
              aria-label={t('host.orgAssignment.manualUuidPlaceholder')}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={addManual}
              disabled={forbidden || !manualUuid.trim()}
            >
              <i className="fas fa-plus me-1" />
              {t('host.orgAssignment.addUuid')}
            </button>
          </div>
          {machineName === null && selected.length === 0 && (
            <div className="alert alert-info mt-3 mb-0">
              {t('host.orgAssignment.openAgentNote')}
            </div>
          )}
        </>
      )}
    </FormModal>
  );
};

OrgAssignmentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  serverId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  machineName: PropTypes.string,
  targetLabel: PropTypes.string.isRequired,
};

export default OrgAssignmentModal;
