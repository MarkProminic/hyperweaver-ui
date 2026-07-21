import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import OrgAssignmentModal from '../Host/OrgAssignmentModal';

/**
 * MachineOrgAccess - the machine settings' organization-assignment surface (D15).
 * Renders nothing in Direct mode: org assignment lives on the Hyperweaver Server,
 * keyed by the agent's registry id.
 */
const MachineOrgAccess = ({ currentServer, machineName, disabled, onDone }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!currentServer || currentServer.id === 'self') {
    return null;
  }

  return (
    <>
      <div className="d-flex justify-content-end mb-2">
        <button
          type="button"
          className="btn btn-sm btn-outline-info"
          onClick={() => setOpen(true)}
          disabled={disabled}
        >
          <i className="fas fa-building-user me-2" />
          {t('machineEdit.machineSettings.orgAccess')}
        </button>
      </div>
      {open && (
        <OrgAssignmentModal
          isOpen
          onClose={saved => {
            if (saved) {
              onDone({
                text: t('machineEdit.machineSettings.orgsUpdated', { machineName }),
                warning: false,
              });
            }
            setOpen(false);
          }}
          serverId={currentServer.id}
          machineName={machineName}
          targetLabel={machineName}
        />
      )}
    </>
  );
};

MachineOrgAccess.propTypes = {
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  disabled: PropTypes.bool,
  onDone: PropTypes.func.isRequired,
};

export default MachineOrgAccess;
