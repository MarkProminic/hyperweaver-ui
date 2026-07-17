import PropTypes from 'prop-types';

import { OptionalBoolSelect } from './ProvisioningVarRows';

/**
 * The Transport tab — the document's guest-communicator keys (settings.*),
 * first-class instead of Raw-JSON-only (Mark's ask 2026-07-17). The agents
 * accept BOTH spellings (Mark-approved aliases) and prefer the NEW one;
 * this editor WRITES the new spellings only and never rewrites a stored
 * vagrant_* twin — when one exists the agents narrate the shadowed key.
 * ssh is the default; winrm is for Windows guests (folders, ansible-local,
 * and docker skip loudly over winrm — §5 matrix).
 */

const TRANSPORTS = ['negotiate', 'ssl', 'ntlm', 'plaintext', 'kerberos'];

const ProvisioningTransportTab = ({ settings, onChange, disabled }) => {
  const communicator = settings?.communicator ?? settings?.vagrant_communicator ?? '';
  const port = settings?.winrm_port ?? settings?.vagrant_winrm_port ?? '';
  const transport = settings?.winrm_transport ?? settings?.vagrant_winrm_transport ?? '';
  const sslVerify =
    settings?.winrm_ssl_peer_verification ?? settings?.vagrant_winrm_ssl_peer_verification;
  const hasOldSpelling = [
    'vagrant_communicator',
    'vagrant_winrm_port',
    'vagrant_winrm_transport',
    'vagrant_winrm_ssl_peer_verification',
  ].some(key => settings?.[key] !== undefined);

  return (
    <div>
      <p className="form-text text-muted mt-0 mb-2">
        How the agent reaches the guest. <code>ssh</code> (the default) carries everything;{' '}
        <code>winrm</code> is for Windows guests — folder sync, ansible-local, and docker skip
        loudly over it, remote playbooks and scripts ride host-side ansible. Credentials stay the
        machine&apos;s SSH user/password (Machine Settings → Credentials).
      </p>

      <div className="hw-rc-fields">
        <span className="hw-field">
          <label htmlFor="prov-transport-communicator">communicator</label>
          <select
            id="prov-transport-communicator"
            className="form-select form-select-sm w-auto"
            value={communicator}
            disabled={disabled}
            onChange={e => onChange('communicator', e.target.value || undefined)}
          >
            <option value="">(default — ssh)</option>
            <option value="ssh">ssh</option>
            <option value="winrm">winrm</option>
          </select>
        </span>

        {communicator === 'winrm' && (
          <>
            <span className="hw-field">
              <label htmlFor="prov-transport-port">winrm port</label>
              <input
                id="prov-transport-port"
                className="form-control form-control-sm hw-field-tiny"
                type="number"
                min="1"
                max="65535"
                placeholder={transport === 'ssl' ? '5986' : '5985'}
                value={port}
                disabled={disabled}
                onChange={e =>
                  onChange('winrm_port', e.target.value === '' ? undefined : Number(e.target.value))
                }
              />
            </span>
            <span className="hw-field">
              <label htmlFor="prov-transport-mode">winrm transport</label>
              <select
                id="prov-transport-mode"
                className="form-select form-select-sm w-auto"
                value={transport}
                disabled={disabled}
                onChange={e => onChange('winrm_transport', e.target.value || undefined)}
              >
                <option value="">(default — negotiate)</option>
                {TRANSPORTS.map(mode => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </span>
            <OptionalBoolSelect
              id="prov-transport-sslverify"
              label="ssl peer verification"
              value={sslVerify}
              disabled={disabled}
              onChange={value => onChange('winrm_ssl_peer_verification', value)}
            />
          </>
        )}
      </div>

      {hasOldSpelling && (
        <p className="form-text text-muted mb-0">
          This document also carries the old <code>vagrant_*</code> spelling of one or more of these
          keys — it stays verbatim (documents are never rewritten); the agents use the new spelling
          and narrate the shadowed key.
        </p>
      )}
    </div>
  );
};

ProvisioningTransportTab.propTypes = {
  settings: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default ProvisioningTransportTab;
