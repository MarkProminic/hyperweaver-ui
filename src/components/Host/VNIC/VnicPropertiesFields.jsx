import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const commonProperties = [
  'maxbw',
  'priority',
  'cpus',
  'protection',
  'allowed-ips',
  'allowed-dhcp-cids',
  'rxrings',
  'txrings',
  'mtu',
  'cos',
  'pvid',
  'ethertype',
];

const propertyValueOptions = {
  priority: ['low', 'medium', 'high'],
  protection: ['mac-nospoof', 'restricted', 'ip-nospoof', 'dhcp-nospoof'],
  cos: ['0', '1', '2', '3', '4', '5', '6', '7'],
  ethertype: ['0x0800', '0x86dd', '0x0806', '0x8100', '0x8137', '0x809b', '0x8863', '0x8864'],
  maxbw: ['10M', '100M', '1G', '10G', '25G', '40G', '100G'],
  rxrings: ['1', '2', '4', '8', '16'],
  txrings: ['1', '2', '4', '8', '16'],
  mtu: ['1500', '9000', '9216', '1514', '1518'],
};

const VnicPropertiesFields = ({ properties, onAddProperty, onRemoveProperty, disabled }) => {
  const { t } = useTranslation();
  const [propertyKey, setPropertyKey] = useState('');
  const [propertyValue, setPropertyValue] = useState('');

  const handleAdd = () => {
    if (propertyKey.trim() && propertyValue.trim()) {
      onAddProperty(propertyKey.trim(), propertyValue.trim());
      setPropertyKey('');
      setPropertyValue('');
    }
  };

  const getPropertyValueInput = () => {
    if (propertyValueOptions[propertyKey]) {
      return (
        <select
          className="form-select"
          value={propertyValue}
          onChange={e => setPropertyValue(e.target.value)}
          disabled={disabled}
        >
          <option value="">
            {t('hostTools.VnicPropertiesFields.selectPropertyValueOption', { propertyKey })}
          </option>
          {propertyValueOptions[propertyKey].map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        className="form-control"
        type="text"
        placeholder={t('hostTools.VnicPropertiesFields.propertyValuePlaceholder')}
        value={propertyValue}
        onChange={e => setPropertyValue(e.target.value)}
        disabled={disabled}
      />
    );
  };

  return (
    <div className="mb-3">
      <label className="form-label" htmlFor="vnic-create-prop-key">
        {t('hostTools.VnicPropertiesFields.additionalPropertiesLabel')}
      </label>
      <div className="input-group">
        <select
          id="vnic-create-prop-key"
          className="form-select"
          value={propertyKey}
          onChange={e => setPropertyKey(e.target.value)}
          disabled={disabled}
        >
          <option value="">{t('hostTools.VnicPropertiesFields.selectPropertyOption')}</option>
          {commonProperties
            .filter(prop => !properties[prop])
            .map(prop => (
              <option key={prop} value={prop}>
                {prop}
              </option>
            ))}
        </select>
        {getPropertyValueInput()}
        <button
          type="button"
          className="btn btn-info"
          onClick={handleAdd}
          disabled={!propertyKey.trim() || !propertyValue.trim() || disabled}
        >
          {t('hostTools.VnicPropertiesFields.addButton')}
        </button>
      </div>

      {Object.keys(properties).length > 0 && (
        <div className="mt-3">
          <p>
            <strong>{t('hostTools.VnicPropertiesFields.currentPropertiesHeading')}</strong>
          </p>
          <div className="d-flex flex-wrap gap-2">
            {Object.entries(properties).map(([key, value]) => (
              <span key={key} className="badge text-bg-info d-inline-flex align-items-center gap-1">
                {key}={value}
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label={t('hostTools.VnicPropertiesFields.removeAriaLabel')}
                  onClick={() => onRemoveProperty(key)}
                  disabled={disabled}
                />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

VnicPropertiesFields.propTypes = {
  properties: PropTypes.object.isRequired,
  onAddProperty: PropTypes.func.isRequired,
  onRemoveProperty: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

export default VnicPropertiesFields;
