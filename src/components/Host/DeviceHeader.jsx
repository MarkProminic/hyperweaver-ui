import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import HostPageHeader from './HostPageHeader';

const DeviceHeader = ({ selectedServer, loading, loadDeviceData }) => {
  const { t } = useTranslation();

  return (
    <HostPageHeader title={t('host.deviceHeader.title')}>
      <button
        type="button"
        className="btn btn-sm btn-info"
        onClick={() => selectedServer && loadDeviceData(selectedServer)}
        disabled={loading}
      >
        {loading && (
          <span
            className="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          />
        )}
        <i className="fas fa-sync me-2" />
        {t('host.deviceHeader.refresh')}
      </button>
    </HostPageHeader>
  );
};

DeviceHeader.propTypes = {
  selectedServer: PropTypes.shape({
    hostname: PropTypes.string,
  }),
  loading: PropTypes.bool.isRequired,
  loadDeviceData: PropTypes.func.isRequired,
};

export default DeviceHeader;
