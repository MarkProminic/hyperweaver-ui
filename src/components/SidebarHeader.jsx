import { useContext } from 'react';
import { useTranslation } from 'react-i18next';

import { UserSettings } from '../contexts/UserSettingsContext';

const SidebarHeader = () => {
  const { t } = useTranslation();
  const userContext = useContext(UserSettings);

  const handleClick = () => {
    if (userContext.sidebarMinimized) {
      userContext.setSidebarMinimized(false);
      userContext.setSidebarWidth(260);
    } else {
      userContext.setSidebarMinimized(true);
    }
  };

  const isIconOnly = userContext.sidebarMinimized || userContext.sidebarWidth <= 38;

  const getHeaderContent = () => {
    if (isIconOnly) {
      return (
        <span title={t('chrome.sidebarHeader.expandSidebar')}>
          <img
            src="/ui/images/hyperweaver-glyph.svg"
            alt={t('chrome.sidebarHeader.hyperweaver')}
            className="logo-lg"
          />
        </span>
      );
    }
    return (
      <>
        <span className="flex-grow-0">
          <img
            src="/ui/images/hyperweaver-glyph.svg"
            alt={t('chrome.sidebarHeader.hyperweaver')}
            className="logo-lg"
          />
        </span>
        <span>{t('chrome.sidebarHeader.hyperweaver')}</span>
      </>
    );
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`btn w-100 d-flex align-items-center gap-2 ${isIconOnly ? 'justify-content-center px-0' : 'justify-content-start hw-sidebar-brand'}`}
      role="button"
      tabIndex={0}
    >
      {getHeaderContent()}
    </div>
  );
};
export default SidebarHeader;
