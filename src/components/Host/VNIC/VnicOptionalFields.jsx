import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const VnicOptionalFields = ({ vlanId, macAddress, onChange, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="row g-3">
      <div className="col">
        <div className="mb-3">
          <label className="form-label" htmlFor="vnic-create-vlan">
            {t('hostTools.VnicOptionalFields.vlanIdLabel')}
          </label>
          <input
            id="vnic-create-vlan"
            className="form-control"
            type="number"
            min="1"
            max="4094"
            placeholder={t('hostTools.VnicOptionalFields.vlanIdPlaceholder')}
            value={vlanId}
            onChange={e => onChange('vlan_id', e.target.value)}
            disabled={disabled}
          />
          <p className="form-text text-muted">{t('hostTools.VnicOptionalFields.vlanIdHelp')}</p>
        </div>
      </div>
      <div className="col">
        <div className="mb-3">
          <label className="form-label" htmlFor="vnic-create-mac">
            {t('hostTools.VnicOptionalFields.macAddressLabel')}
          </label>
          <input
            id="vnic-create-mac"
            className="form-control"
            type="text"
            placeholder={t('hostTools.VnicOptionalFields.macAddressPlaceholder')}
            value={macAddress}
            onChange={e => onChange('mac_address', e.target.value)}
            disabled={disabled}
          />
          <p className="form-text text-muted">{t('hostTools.VnicOptionalFields.macAddressHelp')}</p>
        </div>
      </div>
    </div>
  );
};

VnicOptionalFields.propTypes = {
  vlanId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  macAddress: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

export default VnicOptionalFields;
