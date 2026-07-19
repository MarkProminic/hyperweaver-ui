import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../contexts/ServerContext';
import { hasFeature } from '../../utils/capabilities';

/**
 * Provisioning tool availability — SHI's SystemInfoBox/footer prerequisite
 * display recreated (Mark's order, 2026-07-06): which tools the host has for
 * provisioning. One shared contract: GET /provisioning/status answers a flat
 * {tool: bool} map on BOTH agents (verified in zoneweaver's
 * ProvisioningController.getProvisioningStatus and the Go agent's
 * handleProvisioningStatus). Renders as rows for the SystemInfo table; hides
 * itself where `provisioning` isn't advertised.
 */
const ProvisioningTools = ({ currentServer }) => {
  const { t } = useTranslation();
  const { makeAgentRequest } = useServers();
  const [tools, setTools] = useState(null);

  const available = hasFeature(currentServer, 'provisioning');

  useEffect(() => {
    setTools(null);
    if (!currentServer || !available) {
      return;
    }
    makeAgentRequest(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      'provisioning/status'
    ).then(result => {
      if (result.success && result.data && typeof result.data === 'object') {
        setTools(result.data);
      }
    });
  }, [currentServer, available, makeAgentRequest]);

  if (!available || !tools) {
    return null;
  }

  const entries = Object.entries(tools).filter(
    ([tool, value]) => typeof value === 'boolean' && tool !== 'builtin_sync'
  );
  if (entries.length === 0) {
    return null;
  }
  // rsync/scp are SOFT prerequisites since the Go agent's transport ladder
  // (sync 2026-07-07): its embedded pure-Go rsync/SFTP cover folder sync
  // when the binaries are absent (builtin_sync: true). Only genuinely hard
  // tools drive the warning; soft ones show yellow, not red.
  const soft = tool => (tool === 'rsync' || tool === 'scp') && tools.builtin_sync === true;
  const missingHard = entries.filter(([tool, installed]) => !installed && !soft(tool));

  const badgeClass = (tool, installed) => {
    if (installed) {
      return 'text-bg-success';
    }
    return soft(tool) ? 'text-bg-warning' : 'text-bg-danger';
  };

  return (
    <tr>
      <td>
        <strong>{t('host.provisioningTools.title')}</strong>
      </td>
      <td>
        <div className="d-flex flex-wrap gap-1">
          {entries.map(([tool, installed]) => {
            let toolTitle;
            if (installed) {
              toolTitle = t('host.provisioningTools.toolInstalled', { tool });
            } else if (soft(tool)) {
              toolTitle = t('host.provisioningTools.toolMissingSoft', { tool });
            } else {
              toolTitle = t('host.provisioningTools.toolMissing', { tool });
            }
            return (
              <span key={tool} className={`badge ${badgeClass(tool, installed)}`} title={toolTitle}>
                {tool}
              </span>
            );
          })}
        </div>
        {missingHard.length > 0 && (
          <p className="small text-warning mb-0 mt-1">
            {t('host.provisioningTools.missingHardWarning', { count: missingHard.length })}
          </p>
        )}
      </td>
    </tr>
  );
};

ProvisioningTools.propTypes = {
  currentServer: PropTypes.object,
};

export default ProvisioningTools;
