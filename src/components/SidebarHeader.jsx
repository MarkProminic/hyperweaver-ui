import { useContext } from 'react';

import { UserSettings } from '../contexts/UserSettingsContext';

const SidebarHeader = () => {
  const userContext = useContext(UserSettings);

  const handleClick = () => {
    if (userContext.sidebarMinimized) {
      userContext.setSidebarMinimized(false);
      userContext.setSidebarWidth(240);
    } else {
      userContext.setSidebarMinimized(true);
    }
  };

  const isIconOnly = userContext.sidebarMinimized || userContext.sidebarWidth <= 38;

  const getHeaderContent = () => {
    if (isIconOnly) {
      return (
        <span title="Expand Sidebar">
          <img src="/images/hyperweaver-glyph.svg" alt="Hyperweaver" className="logo-lg" />
        </span>
      );
    }
    return (
      <>
        <span className="flex-grow-0">
          <img src="/images/hyperweaver-glyph.svg" alt="Hyperweaver" className="logo-lg" />
        </span>
        <span>Hyperweaver</span>
        <span className="ms-auto flex-grow-0 pe-2">
          <i className="fa fa-angle-left" />
        </span>
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
      className={`btn w-100 d-flex align-items-center gap-2 ${isIconOnly ? 'justify-content-center px-0' : 'justify-content-between'}`}
      role="button"
      tabIndex={0}
    >
      {getHeaderContent()}
    </div>
  );
};
export default SidebarHeader;
