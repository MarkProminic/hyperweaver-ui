import PropTypes from 'prop-types';
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import { UserSettings } from '../contexts/UserSettingsContext';

const getExpandedState = (title, hostsExpanded, zonesExpanded, settingsExpanded) => {
  if (title === 'Hosts') {
    return hostsExpanded;
  }
  if (title === 'Zones') {
    return zonesExpanded;
  }
  return settingsExpanded;
};

const DashEntryDropDown = ({ title, icon }) => {
  const navigate = useNavigate();
  const userContext = useContext(UserSettings);
  const {
    hostsExpanded,
    setHostsExpanded,
    zonesExpanded,
    setZonesExpanded,
    settingsExpanded,
    setSettingsExpanded,
  } = userContext;

  const handleToggle = e => {
    e.stopPropagation();
    if (title === 'Hosts') {
      setHostsExpanded(!hostsExpanded);
      if (!hostsExpanded) {
        setZonesExpanded(false);
        setSettingsExpanded(false);
      }
    } else if (title === 'Zones') {
      setZonesExpanded(!zonesExpanded);
      if (!zonesExpanded) {
        setHostsExpanded(false);
        setSettingsExpanded(false);
      }
    } else if (title === 'Settings') {
      setSettingsExpanded(!settingsExpanded);
      if (!settingsExpanded) {
        setHostsExpanded(false);
        setZonesExpanded(false);
      }
    }
  };

  const handleNavigate = () => {
    if (title === 'Hosts') {
      navigate('/ui/hosts');
    } else if (title === 'Zones') {
      navigate('/ui/zones');
    } else if (title === 'Settings') {
      navigate('/ui/settings/hyperweaver');
    }
  };

  const isExpanded = getExpandedState(title, hostsExpanded, zonesExpanded, settingsExpanded);

  if (!userContext.sidebarMinimized) {
    return (
      <div className="d-flex w-100 mb-0">
        <button
          type="button"
          className="btn flex-grow-1 d-flex align-items-center justify-content-start gap-2"
          onClick={handleNavigate}
        >
          <i className={icon} />
          <span>{title}</span>
        </button>
        <button type="button" className="btn pe-2" onClick={handleToggle}>
          <i className={`fas fa-angle-${isExpanded ? 'up' : 'down'}`} aria-hidden="true" />
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      className="btn w-100 d-flex justify-content-center"
      onClick={handleToggle}
    >
      <i className={icon} />
    </button>
  );
};

DashEntryDropDown.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
};

export default DashEntryDropDown;
