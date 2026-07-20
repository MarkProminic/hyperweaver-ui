import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

/**
 * The staged-rewire tray + apply-results tray. Each bhyve row carries an
 * editable target-VLAN field so a drop on a bare carrier can retarget to ANY
 * (carrier, vlan) combo — not just ones that already have a network card.
 */
const TopologyTray = ({
  pendingMoves,
  applyBusy,
  onApply,
  onDiscard,
  onRetargetVlan,
  onRenameNic,
  applyResults,
  onClearResults,
}) => {
  const { t } = useTranslation();
  return (
    <>
      {pendingMoves.length > 0 && (
        <div className="hw-topo-tray">
          <div className="hw-topo-tray-head">
            <span className="fw-semibold">
              {t('hostTools.topology.stagedHeading', { count: pendingMoves.length })}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-warning ms-auto"
              disabled={applyBusy}
              onClick={onApply}
            >
              {applyBusy ? (
                <i className="fas fa-spinner fa-spin" />
              ) : (
                t('hostTools.topology.applyChanges')
              )}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-light"
              disabled={applyBusy}
              onClick={onDiscard}
            >
              {t('hostTools.topology.discard')}
            </button>
          </div>
          {pendingMoves.map(move => (
            <div
              key={`${move.machineName}|${move.link}`}
              className={`hw-topo-tray-row hw-topo-mono d-flex align-items-center gap-2 flex-wrap ${
                move.isRemove ? 'hw-topo-tray-remove' : ''
              }`}
            >
              <span>
                {move.isRemove
                  ? t('hostTools.topology.removeLine', {
                      machine: move.machineName,
                      link: move.link,
                    })
                  : t(move.isAdd ? 'hostTools.topology.addLine' : 'hostTools.topology.moveLine', {
                      machine: move.machineName,
                      link: move.link,
                      carrier: move.toCarrier,
                      vlan: '',
                    })}
              </span>
              {move.isAdd && move.hostKind !== 'vbox' && (
                <input
                  type="text"
                  className="form-control form-control-sm hw-topo-tray-name"
                  placeholder={t('hostTools.topology.trayName')}
                  value={move.newName || ''}
                  onChange={event => onRenameNic(move, event.target.value)}
                  aria-label={t('hostTools.topology.trayName')}
                />
              )}
              {!move.isRemove && move.hostKind !== 'vbox' && (
                <>
                  <span className="hw-topo-card-meta">{t('hostTools.topology.trayVlan')}</span>
                  <input
                    type="number"
                    className="form-control form-control-sm hw-topo-tray-vlan"
                    min={move.fromVlanId > 0 ? 1 : 0}
                    max={4094}
                    value={move.toVlanId}
                    onChange={event => onRetargetVlan(move, event.target.value)}
                    title={t('hostTools.topology.trayVlanTitle')}
                    aria-label={t('hostTools.topology.trayVlan')}
                  />
                </>
              )}
            </div>
          ))}
          <div className="hw-topo-tray-note">{t('hostTools.topology.trayNote')}</div>
        </div>
      )}

      {applyResults.length > 0 && (
        <div className="hw-topo-tray">
          {applyResults.map(result => (
            <div
              key={result.machineName + result.message}
              className={`hw-topo-tray-row ${result.ok ? '' : 'hw-topo-tray-fail'}`}
            >
              <span className="fw-semibold">{result.machineName}</span> — {result.message}
            </div>
          ))}
          <button type="button" className="btn btn-sm btn-light mt-1" onClick={onClearResults}>
            {t('hostTools.topology.closeDrill')}
          </button>
        </div>
      )}
    </>
  );
};

TopologyTray.propTypes = {
  pendingMoves: PropTypes.array.isRequired,
  applyBusy: PropTypes.bool.isRequired,
  onApply: PropTypes.func.isRequired,
  onDiscard: PropTypes.func.isRequired,
  onRetargetVlan: PropTypes.func.isRequired,
  onRenameNic: PropTypes.func.isRequired,
  applyResults: PropTypes.array.isRequired,
  onClearResults: PropTypes.func.isRequired,
};

export default TopologyTray;
