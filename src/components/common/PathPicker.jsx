import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { makeAgentRequest } from '../../api/serverUtils';
import { hasFeature } from '../../utils/capabilities';

import FormModal from './FormModal';

// Browse the AGENT HOST's filesystem (GET /filesystem, `file-browser`
// token) to pick a directory or file path. Fields stay hand-typeable —
// this only kills the type-a-path-blind pain.

const parentOf = path => {
  const cut = path.lastIndexOf('/');
  if (cut <= 0) {
    return '/';
  }
  return path.slice(0, cut);
};

export const PathPickerModal = ({ isOpen, onClose, server, onPick, title, mode, initialPath }) => {
  const { t } = useTranslation();
  const [path, setPath] = useState('/');
  const [typed, setTyped] = useState('/');
  const [entries, setEntries] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const browse = useCallback(
    async target => {
      setLoading(true);
      setError('');
      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'filesystem',
        'GET',
        null,
        { path: target, show_hidden: false, sort_by: 'name', sort_order: 'asc' }
      );
      setLoading(false);
      if (result.success && Array.isArray(result.data?.items)) {
        const items = [...result.data.items].sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) {
            return a.isDirectory ? -1 : 1;
          }
          return String(a.name).localeCompare(String(b.name));
        });
        setEntries(items);
        setPath(target);
        setTyped(target);
        setSelectedFile('');
        return true;
      }
      setError(`Cannot browse ${target}: ${result.message}`);
      return false;
    },
    [server]
  );

  useEffect(() => {
    if (!isOpen || !server) {
      return;
    }
    // A file-mode initial value points AT a file — open its parent.
    const trimmed = (initialPath || '').trim();
    let openAt = '/';
    if (mode === 'file' && trimmed.includes('/')) {
      openAt = parentOf(trimmed);
    } else if (trimmed.startsWith('/')) {
      openAt = trimmed;
    }
    browse(openAt).then(ok => {
      if (!ok && openAt !== '/') {
        browse('/');
      }
    });
  }, [isOpen, server, browse, initialPath, mode]);

  const handlePick = () => {
    if (mode === 'file') {
      if (!selectedFile) {
        setError(t('common.pathPickerModal.selectFile'));
        return;
      }
      onPick(selectedFile);
    } else {
      onPick(path);
    }
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handlePick}
      title={title}
      icon="fas fa-folder-open"
      submitText={
        mode === 'file'
          ? t('common.pathPickerModal.pickFile')
          : t('common.pathPickerModal.pickFolder')
      }
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="input-group input-group-sm mb-2">
        <button
          type="button"
          className="btn btn-outline-secondary"
          title={t('common.pathPickerModal.upOneLevel')}
          onClick={() => browse(parentOf(path))}
          disabled={loading || path === '/'}
        >
          <i className="fas fa-arrow-up" />
        </button>
        <input
          className="form-control font-monospace"
          aria-label={t('common.pathPickerModal.path')}
          value={typed}
          onChange={e => setTyped(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              browse(typed.trim() || '/');
            }
          }}
          disabled={loading}
        />
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => browse(typed.trim() || '/')}
          disabled={loading}
        >
          {t('common.pathPickerModal.go')}
        </button>
      </div>
      <div className="border rounded" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
        {entries.length === 0 && !loading && (
          <p className="text-muted small m-2 mb-2">{t('common.pathPickerModal.emptyDirectory')}</p>
        )}
        {entries.map(entry => {
          const clickable = entry.isDirectory || mode === 'file';
          return (
            <button
              type="button"
              className={`d-flex align-items-center gap-2 w-100 text-start border-0 bg-transparent px-2 py-1 ${
                selectedFile === entry.path ? 'bg-primary-subtle' : ''
              } ${clickable ? '' : 'text-muted'}`}
              key={entry.path}
              onClick={() => {
                if (entry.isDirectory) {
                  browse(entry.path);
                } else if (mode === 'file') {
                  setSelectedFile(entry.path);
                }
              }}
              disabled={loading || !clickable}
            >
              <i
                className={`fas ${entry.isDirectory ? 'fa-folder text-warning' : 'fa-file text-muted'}`}
              />
              <span className="small">{entry.name}</span>
            </button>
          );
        })}
      </div>
      <p className="form-text text-muted mb-0 mt-2">
        {mode === 'file' ? (
          <>
            {t('common.pathPickerModal.selected')}:{' '}
            <code>{selectedFile || t('common.pathPickerModal.none')}</code>
          </>
        ) : (
          <>
            {t('common.pathPickerModal.picking')}: <code>{path}</code>
          </>
        )}
      </p>
    </FormModal>
  );
};

PathPickerModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object,
  onPick: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  mode: PropTypes.oneOf(['directory', 'file']),
  initialPath: PropTypes.string,
};

/**
 * Text input + Browse button (input-group). The button renders only when
 * the agent advertises `file-browser`; the field always stays typeable.
 */
export const PathInput = ({
  id,
  value,
  onChange,
  server,
  mode = 'directory',
  disabled = false,
  placeholder,
  className = 'form-control',
  pickTitle,
  list,
}) => {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const browsable = !!server && hasFeature(server, 'file-browser');
  return (
    <>
      <div className="input-group">
        <input
          id={id}
          className={className}
          type="text"
          list={list}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
        />
        {browsable && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            title={
              mode === 'file'
                ? t('common.pathInput.browseFile')
                : t('common.pathInput.browseFolder')
            }
            onClick={() => setPickerOpen(true)}
            disabled={disabled}
          >
            <i className="fas fa-folder-open" />
          </button>
        )}
      </div>
      {browsable && pickerOpen && (
        <PathPickerModal
          isOpen
          onClose={() => setPickerOpen(false)}
          server={server}
          mode={mode}
          initialPath={value}
          title={
            pickTitle ||
            (mode === 'file' ? t('common.pathInput.pickFile') : t('common.pathInput.pickFolder'))
          }
          onPick={onChange}
        />
      )}
    </>
  );
};

PathInput.propTypes = {
  id: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  server: PropTypes.object,
  mode: PropTypes.oneOf(['directory', 'file']),
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  pickTitle: PropTypes.string,
  list: PropTypes.string,
};
