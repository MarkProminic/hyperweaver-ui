import PropTypes from 'prop-types';
import Dropdown from 'react-bootstrap/Dropdown';
import { useTranslation } from 'react-i18next';

import { useOrgFilter } from '../contexts/OrgFilterContext';

import { ContentModal } from './common';

const ROLE_BADGES = {
  OWNER: 'text-bg-danger',
  ADMIN: 'text-bg-warning',
  MEMBER: 'text-bg-secondary',
};

/**
 * OrgSwitcherMenuItem - the profile-dropdown trigger (BoxVault's navbar
 * "Organization" item): building icon + the active org's name, opening the
 * switcher. Renders nothing when the filter is unavailable (Direct mode or
 * no orgs).
 */
export const OrgSwitcherMenuItem = ({ onOpen }) => {
  const { t } = useTranslation();
  const { available, activeOrgRow } = useOrgFilter();
  if (!available) {
    return null;
  }
  return (
    <Dropdown.Item
      as="button"
      type="button"
      onClick={onOpen}
      className="d-flex align-items-center gap-2"
    >
      <i className="fas fa-building" />
      <span className="text-truncate">
        {activeOrgRow?.name || activeOrgRow?.uuid || t('chrome.orgSwitcher.allOrganizations')}
      </span>
    </Dropdown.Item>
  );
};

OrgSwitcherMenuItem.propTypes = {
  onOpen: PropTypes.func.isRequired,
};

/**
 * OrgSwitcherModal - the BoxVault-style organization picker on the house modal:
 * list-group rows, name + primary note left, role badges + green check right,
 * primary-border highlight on the active row; picking switches and closes
 * immediately. Row one is "All organizations" (the filter's off state).
 */
const OrgSwitcherModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { orgs, activeOrg, setActiveOrg } = useOrgFilter();

  const pick = uuid => {
    setActiveOrg(uuid);
    onClose();
  };

  return (
    <ContentModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('chrome.orgSwitcher.title')}
      icon="fas fa-building"
    >
      {orgs.length === 0 ? (
        <div className="alert alert-info mb-0">{t('chrome.orgSwitcher.noOrgs')}</div>
      ) : (
        <div className="list-group">
          <button
            type="button"
            className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
              activeOrg === '' ? 'border-primary border-2' : ''
            }`}
            onClick={() => pick('')}
          >
            <span className="d-inline-flex align-items-center gap-2">
              <i className="fas fa-layer-group" />
              <span className="fw-semibold">{t('chrome.orgSwitcher.allOrganizations')}</span>
            </span>
            {activeOrg === '' && <i className="fas fa-check-circle text-success" />}
          </button>
          {orgs.map(org => (
            <button
              key={org.uuid}
              type="button"
              className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                activeOrg === org.uuid ? 'border-primary border-2' : ''
              }`}
              onClick={() => pick(org.uuid)}
            >
              <span className="d-inline-flex align-items-center gap-2">
                <i className="fas fa-building" />
                <span className="d-flex flex-column text-start lh-sm">
                  <span className="fw-semibold">{org.name || org.uuid}</span>
                  {org.primary && (
                    <span className="small text-primary">
                      {t('chrome.orgSwitcher.primaryOrganization')}
                    </span>
                  )}
                </span>
              </span>
              <span className="d-inline-flex align-items-center gap-2">
                {org.roles.map(role => (
                  <span key={role} className={`badge ${ROLE_BADGES[role] || 'text-bg-secondary'}`}>
                    {role}
                  </span>
                ))}
                {activeOrg === org.uuid && <i className="fas fa-check-circle text-success" />}
              </span>
            </button>
          ))}
        </div>
      )}
    </ContentModal>
  );
};

OrgSwitcherModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default OrgSwitcherModal;
