import PropTypes from 'prop-types';
import Dropdown from 'react-bootstrap/Dropdown';
import { useTranslation } from 'react-i18next';

/** One row's action buttons — lifecycle, provision, and the gear menu.
 *  Moved out of MachineListPanel for the 500-line rule. */
const RowActions = ({
  row,
  status,
  rowIsUtm,
  singular,
  loading,
  canOperate,
  pauseAvailable,
  suspendAvailable,
  cloneAvailable,
  provisionerRef,
  onSelect,
  onLifecycle,
  onClone,
}) => {
  const { t } = useTranslation();
  return (
    <div className="d-flex gap-1">
      <button
        type="button"
        className="btn btn-sm btn-outline-info"
        title={t('machine.machineListPanel.viewTooltip', {
          noun: singular.toLowerCase(),
        })}
        onClick={() => onSelect(row.name)}
      >
        <i className="fas fa-eye" />
      </button>
      {canOperate && status !== 'running' && status !== 'paused' && (
        <button
          type="button"
          className="btn btn-sm btn-outline-success"
          title={t('machine.machineListPanel.startTooltip')}
          onClick={() => onLifecycle(row, 'start')}
          disabled={loading}
        >
          <i className="fas fa-play" />
        </button>
      )}
      {canOperate && status === 'running' && (
        <>
          {pauseAvailable && !rowIsUtm && (
            <button
              type="button"
              className="btn btn-sm btn-outline-warning"
              title={t('machine.machineListPanel.pauseTooltip')}
              onClick={() => onLifecycle(row, 'pause')}
              disabled={loading}
            >
              <i className="fas fa-pause" />
            </button>
          )}
          {(suspendAvailable || rowIsUtm) && (
            <button
              type="button"
              className="btn btn-sm btn-outline-warning"
              title={t('machine.machineListPanel.suspendTooltip')}
              onClick={() => onLifecycle(row, 'suspend')}
              disabled={loading}
            >
              <i className="fas fa-moon" />
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            title={t('machine.machineListPanel.shutdownTooltip')}
            onClick={() => onLifecycle(row, 'stop')}
            disabled={loading}
          >
            <i className="fas fa-stop" />
          </button>
        </>
      )}
      {canOperate &&
        (status === 'paused' || status === 'suspended') &&
        (pauseAvailable || suspendAvailable || rowIsUtm) && (
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            title={t('machine.machineListPanel.resumeTooltip')}
            onClick={() => onLifecycle(row, 'resume')}
            disabled={loading}
          >
            <i className="fas fa-play-circle" />
          </button>
        )}
      {canOperate && provisionerRef && (
        <button
          type="button"
          className="btn btn-sm btn-outline-warning"
          title={t('machine.machineListPanel.provisionTooltip')}
          onClick={() => onLifecycle(row, 'provision')}
          disabled={loading}
        >
          <i className="fas fa-cogs" />
        </button>
      )}
      {(canOperate || cloneAvailable) && (
        <Dropdown align="end">
          <Dropdown.Toggle
            variant="outline-secondary"
            size="sm"
            title={t('machine.machineListPanel.moreActionsTooltip')}
          >
            <i className="fas fa-gear" />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {canOperate && status === 'running' && (
              <Dropdown.Item as="button" type="button" onClick={() => onLifecycle(row, 'restart')}>
                <i className="fas fa-redo text-warning me-2" />
                {t('machine.machineListPanel.restartItem')}
              </Dropdown.Item>
            )}
            {cloneAvailable && (
              <Dropdown.Item as="button" type="button" onClick={() => onClone(row)}>
                <i className="fas fa-clone me-2" />
                {t('machine.machineListPanel.cloneItem')}
              </Dropdown.Item>
            )}
            <Dropdown.Item as="button" type="button" onClick={() => onSelect(row.name)}>
              <i className="fas fa-eye text-info me-2" />
              {t('machine.machineListPanel.openItem')}
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      )}
    </div>
  );
};

RowActions.propTypes = {
  row: PropTypes.object.isRequired,
  status: PropTypes.string.isRequired,
  rowIsUtm: PropTypes.bool,
  singular: PropTypes.string.isRequired,
  loading: PropTypes.bool,
  canOperate: PropTypes.bool,
  pauseAvailable: PropTypes.bool,
  suspendAvailable: PropTypes.bool,
  cloneAvailable: PropTypes.bool,
  provisionerRef: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  onLifecycle: PropTypes.func.isRequired,
  onClone: PropTypes.func.isRequired,
};

export default RowActions;
