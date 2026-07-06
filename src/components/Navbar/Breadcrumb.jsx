import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { useMode } from '../../contexts/ModeContext';
import { useServers } from '../../contexts/ServerContext';

/**
 * Breadcrumb — navbar row 1, left (contract §2). Replaces the labeling role the old Host/Zone
 * selector dropdowns played: `Datacenter ▸ Host ▸ Machine`, reflecting the current selection.
 * Ancestor crumbs navigate up; the last (current) crumb is inert.
 *
 * - Aggregated: leads with the Datacenter crumb (datacenter_label).
 * - Direct: no Datacenter crumb (single-host, no aggregate root) — starts at the host.
 */
const Breadcrumb = () => {
  const navigate = useNavigate();
  const { isDirect } = useMode();
  const { currentServer, currentMachine } = useServers();
  const { datacenterLabel } = useAuth();

  const crumbs = [];
  if (!isDirect) {
    crumbs.push({
      icon: 'fas fa-sitemap',
      label: datacenterLabel || 'Datacenter',
      to: '/ui/dashboard',
    });
  }
  if (currentServer) {
    crumbs.push({
      icon: 'fas fa-server',
      label: currentServer.entityName || currentServer.hostname,
      to: '/ui/hosts',
    });
  }
  if (currentMachine) {
    crumbs.push({ icon: 'fab fa-hive', label: currentMachine, to: null });
  }

  if (crumbs.length === 0) {
    return null;
  }

  return (
    <nav aria-label="breadcrumb" className="d-flex align-items-center flex-wrap">
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <span key={crumb.icon} className="d-inline-flex align-items-center">
            {idx > 0 && <i className="fas fa-angle-right mx-1 text-body-secondary small" />}
            {isLast || !crumb.to ? (
              <span className="d-inline-flex align-items-center gap-1 fw-semibold">
                <i className={crumb.icon} />
                <span className="text-truncate">{crumb.label}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => navigate(crumb.to)}
                className="btn btn-link btn-sm p-0 text-decoration-none d-inline-flex align-items-center gap-1"
              >
                <i className={crumb.icon} />
                <span className="text-truncate">{crumb.label}</span>
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
