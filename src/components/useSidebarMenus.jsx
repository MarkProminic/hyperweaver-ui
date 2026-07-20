import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useServers } from '../contexts/ServerContext';
import {
  hasConsole,
  hasFeature,
  hasManageSurface,
  hasNetworkingSurface,
} from '../utils/capabilities';
import {
  canCreateMachines,
  canDestroyMachines,
  canPowerOffHosts,
  canRestartMachines,
  canStartStopMachines,
} from '../utils/permissions';
import { resourceLabel } from '../utils/resourceLabel';

import { ConfirmModal, FormModal } from './common';
import SidebarContextMenu from './SidebarContextMenu';

/**
 * The sidebar tree's right-click machinery: builds the machine/host context
 * menus (capability + role gated), owns the floating-menu state, and carries
 * the DESTRUCTIVE verbs behind their confirm dialogs (force-kill, destroy
 * with the cleanup-disks choice, host restart/power-off). Split from
 * SidebarTree for the 500-line rule.
 */
export const useSidebarMenus = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    currentServer,
    selectServer,
    selectMachine,
    startMachine,
    stopMachine,
    restartMachine,
    deleteMachine,
    restartHost,
    shutdownHost,
  } = useServers();
  const { user } = useAuth();
  const [menu, setMenu] = useState(null);
  const [danger, setDanger] = useState(null);
  const [dangerBusy, setDangerBusy] = useState(false);
  const [dangerError, setDangerError] = useState('');
  const [cleanupDisks, setCleanupDisks] = useState(true);

  const focusMachine = (server, name) => {
    if (currentServer?.id !== server.id) {
      selectServer(server);
    }
    selectMachine(name);
  };

  const machineDoor = (server, name, to) => () => {
    focusMachine(server, name);
    navigate(to);
  };

  const openDanger = (kind, server, name = null) => {
    setDangerError('');
    setCleanupDisks(true);
    setDanger({ kind, server, name });
  };

  const runDanger = async () => {
    const { kind, server, name } = danger;
    setDangerBusy(true);
    setDangerError('');
    let result;
    if (kind === 'kill') {
      result = await stopMachine(server.hostname, server.port, server.protocol, name, true);
    } else if (kind === 'destroy') {
      result = await deleteMachine(
        server.hostname,
        server.port,
        server.protocol,
        name,
        true,
        cleanupDisks
      );
    } else if (kind === 'host-restart') {
      result = await restartHost(server.hostname, server.port, server.protocol);
    } else {
      result = await shutdownHost(server.hostname, server.port, server.protocol);
    }
    setDangerBusy(false);
    if (result?.success) {
      setDanger(null);
    } else {
      setDangerError(result?.message || t('hostTools.topology.applyFail'));
    }
  };

  const handleMachineMenu = (event, { server, name, running }) => {
    const role = user?.role;
    const items = [
      {
        key: 'open',
        icon: 'fas fa-arrow-up-right-from-square',
        label: t('hostTools.topology.openMachine'),
        onClick: machineDoor(server, name, '/ui/machines'),
      },
    ];
    if (hasFeature(server, 'machine-modify') && canCreateMachines(role)) {
      items.push({
        key: 'settings',
        icon: 'fas fa-sliders',
        label: t('hostTools.topology.openSettings'),
        onClick: machineDoor(server, name, '/ui/machines?tab=settings'),
      });
    }
    if (canStartStopMachines(role)) {
      items.push({ divider: true });
      if (running) {
        items.push({
          key: 'stop',
          icon: 'fas fa-stop',
          danger: true,
          label: t('navbar.navbar.shutdown'),
          onClick: () => stopMachine(server.hostname, server.port, server.protocol, name),
        });
        if (canRestartMachines(role)) {
          items.push({
            key: 'restart',
            icon: 'fas fa-redo',
            label: t('navbar.navbar.restart'),
            onClick: () => restartMachine(server.hostname, server.port, server.protocol, name),
          });
        }
      } else {
        items.push({
          key: 'start',
          icon: 'fas fa-play',
          label: t('navbar.navbar.powerOn'),
          onClick: () => startMachine(server.hostname, server.port, server.protocol, name),
        });
      }
    }
    const doors = [];
    if (hasConsole(server, 'vnc')) {
      doors.push({
        key: 'vnc',
        icon: 'fas fa-display',
        label: t('chrome.sidebarMenu.vncConsole'),
        onClick: machineDoor(server, name, `/ui/machines?vnc=${encodeURIComponent(name)}`),
      });
    }
    if (hasConsole(server, 'zlogin')) {
      doors.push({
        key: 'zlogin',
        icon: 'fas fa-terminal',
        label: t('chrome.sidebarMenu.zloginConsole'),
        onClick: machineDoor(server, name, `/ui/machines?zlogin=${encodeURIComponent(name)}`),
      });
    }
    if (hasFeature(server, 'machine-snapshots') && canCreateMachines(role)) {
      doors.push({
        key: 'snapshot',
        icon: 'fas fa-camera',
        label: t('navbar.navbar.snapshot'),
        onClick: machineDoor(server, name, '/ui/machines?tab=snapshots&take=1'),
      });
    }
    if (hasFeature(server, 'machine-create') && canCreateMachines(role)) {
      doors.push({
        key: 'clone',
        icon: 'fas fa-clone',
        label: t('navbar.navbar.clone'),
        onClick: machineDoor(server, name, '/ui/machines?clone=1'),
      });
    }
    if (hasFeature(server, 'provisioning') && canStartStopMachines(role)) {
      doors.push({
        key: 'provision',
        icon: 'fas fa-cogs',
        label: t('navbar.navbar.provision'),
        onClick: machineDoor(server, name, '/ui/machines?tab=provisioning&run=provision'),
      });
    }
    if (doors.length > 0) {
      items.push({ divider: true }, ...doors);
    }
    if (canDestroyMachines(role)) {
      items.push({ divider: true });
      if (running) {
        items.push({
          key: 'kill',
          icon: 'fas fa-skull',
          danger: true,
          label: t('navbar.navbar.forceKill'),
          onClick: () => openDanger('kill', server, name),
        });
      }
      items.push({
        key: 'destroy',
        icon: 'fas fa-trash',
        danger: true,
        label: t('navbar.navbar.destroy'),
        onClick: () => openDanger('destroy', server, name),
      });
    }
    setMenu({ x: event.clientX, y: event.clientY, title: name, items });
  };

  const handleHostMenu = (event, server) => {
    const role = user?.role;
    const doors = [
      {
        key: 'overview',
        icon: 'fas fa-gauge',
        label: t('navbar.contextTabs.overview'),
        to: '/ui/hosts',
      },
      ...(hasManageSurface(server)
        ? [
            {
              key: 'manage',
              icon: 'fas fa-gear',
              label: t('navbar.contextTabs.manage'),
              to: '/ui/host-manage',
            },
          ]
        : []),
      ...(hasNetworkingSurface(server)
        ? [
            {
              key: 'networking',
              icon: 'fas fa-sitemap',
              label: t('navbar.contextTabs.networking'),
              to: '/ui/host-networking',
            },
          ]
        : []),
      ...(hasFeature(server, 'devices')
        ? [
            {
              key: 'devices',
              icon: 'fab fa-usb',
              label: t('navbar.contextTabs.devices'),
              to: '/ui/host-devices',
            },
          ]
        : []),
      ...(hasFeature(server, 'zfs')
        ? [
            {
              key: 'storage',
              icon: 'fas fa-hard-drive',
              label: t('navbar.contextTabs.storage'),
              to: '/ui/host-storage',
            },
          ]
        : []),
      {
        key: 'agent',
        icon: 'fas fa-database',
        label: t('navbar.contextTabs.agent'),
        to: '/ui/settings/agent',
      },
    ].map(door => ({
      ...door,
      onClick: () => {
        selectServer(server);
        navigate(door.to);
      },
    }));
    const items = [...doors];
    if (
      hasFeature(server, 'machine-create') &&
      hasFeature(server, 'provisioner-registry') &&
      canCreateMachines(role)
    ) {
      items.push(
        { divider: true },
        {
          key: 'new',
          icon: 'fas fa-plus',
          label: t('navbar.navbar.newMachineButton', {
            noun: resourceLabel(server, { plural: false }),
          }),
          onClick: () => {
            selectServer(server);
            navigate('/ui/machines?create=1');
          },
        }
      );
    }
    if (canPowerOffHosts(role) && hasFeature(server, 'host-power')) {
      items.push(
        { divider: true },
        {
          key: 'host-restart',
          icon: 'fas fa-redo',
          danger: true,
          label: t('navbar.navbar.restartHost'),
          onClick: () => openDanger('host-restart', server),
        },
        {
          key: 'host-shutdown',
          icon: 'fas fa-power-off',
          danger: true,
          label: t('navbar.navbar.powerOffHost'),
          onClick: () => openDanger('host-shutdown', server),
        }
      );
    }
    setMenu({
      x: event.clientX,
      y: event.clientY,
      title: server.entityName || server.hostname,
      items,
    });
  };

  const noun = danger ? resourceLabel(danger.server, { plural: false }) : '';
  const dangerTarget = danger ? danger.name || danger.server.hostname : '';
  const elements = (
    <>
      {menu && <SidebarContextMenu menu={menu} onClose={() => setMenu(null)} />}
      {danger && danger.kind === 'destroy' && (
        <FormModal
          isOpen
          onClose={() => setDanger(null)}
          onSubmit={runDanger}
          title={`${t('navbar.navbar.destroy')} — ${dangerTarget}`}
          icon="fas fa-trash"
          submitText={t('navbar.navbar.destroy')}
          submitVariant="danger"
          loading={dangerBusy}
          showCancelButton
        >
          <div className="alert alert-danger">
            {t('navbar.navbar.machineDestroyMessage', { noun: noun.toLowerCase() })}
          </div>
          <div className="form-check mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="ctx-destroy-cleanup-disks"
              checked={cleanupDisks}
              onChange={event => setCleanupDisks(event.target.checked)}
            />
            <label className="form-check-label" htmlFor="ctx-destroy-cleanup-disks">
              {t('navbar.navbar.destroyCleanupDisks', { noun: noun.toLowerCase() })}
            </label>
          </div>
          {dangerError && <p className="text-danger mb-0">{dangerError}</p>}
        </FormModal>
      )}
      {danger && danger.kind !== 'destroy' && (
        <ConfirmModal
          isOpen
          onClose={() => setDanger(null)}
          onConfirm={runDanger}
          title={
            danger.kind === 'kill'
              ? `${t('navbar.navbar.forceKill')} — ${dangerTarget}`
              : `${
                  danger.kind === 'host-restart'
                    ? t('navbar.navbar.restartHost')
                    : t('navbar.navbar.powerOffHost')
                } — ${dangerTarget}`
          }
          message={
            dangerError ||
            (danger.kind === 'kill'
              ? t('navbar.navbar.machineActionMessage', { noun: noun.toLowerCase() })
              : t('navbar.navbar.hostActionWarning'))
          }
          confirmText={
            danger.kind === 'kill'
              ? t('navbar.navbar.forceKill')
              : t('navbar.navbar.confirmTitle', {
                  mode: 'host',
                  action: danger.kind === 'host-restart' ? 'restart' : 'shutdown',
                })
          }
          loading={dangerBusy}
        />
      )}
    </>
  );

  return { handleMachineMenu, handleHostMenu, elements };
};

export default useSidebarMenus;
