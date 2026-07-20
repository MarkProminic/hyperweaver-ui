import PropTypes from 'prop-types';
import React from 'react';
import { withTranslation } from 'react-i18next';

/**
 * Top-level error boundary — a render crash or a failed lazy chunk no longer
 * white-screens the app. Chunk-load failures are the EXPECTED post-deploy
 * event under the no-cache-busting rule (stale index.html referencing gone
 * assets), so those get a "new version deployed — reload" treatment; real
 * render errors show the message with the same reload escape hatch.
 */
const isChunkError = error => {
  const text = `${error?.name || ''} ${error?.message || ''}`;
  return (
    text.includes('ChunkLoadError') ||
    text.includes('Failed to fetch dynamically imported module') ||
    text.includes('Importing a module script failed') ||
    text.includes('error loading dynamically imported module')
  );
};

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('AppErrorBoundary caught:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    const { t, children } = this.props;
    if (!error) {
      return children;
    }
    const chunk = isChunkError(error);
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 p-4">
        <div className="card" style={{ maxWidth: '480px' }}>
          <div className="card-body text-center">
            <i
              className={`fas ${chunk ? 'fa-rotate' : 'fa-triangle-exclamation'} fs-1 mb-3 ${chunk ? 'text-info' : 'text-warning'}`}
            />
            <h1 className="fs-5 fw-bold">
              {chunk ? t('app.errorBoundary.chunkTitle') : t('app.errorBoundary.crashTitle')}
            </h1>
            <p className="text-muted">
              {chunk ? t('app.errorBoundary.chunkBody') : t('app.errorBoundary.crashBody')}
            </p>
            {!chunk && (
              <pre className="small text-start border rounded p-2 overflow-auto">
                {String(error?.message || error)}
              </pre>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              <i className="fas fa-rotate me-2" />
              {t('app.errorBoundary.reload')}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

AppErrorBoundary.propTypes = {
  t: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export default withTranslation()(AppErrorBoundary);
