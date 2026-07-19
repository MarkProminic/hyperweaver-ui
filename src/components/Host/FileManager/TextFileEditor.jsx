import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import FormModal from '../../common/FormModal';

import { isTextFile } from './FileManagerTransforms';

/**
 * Text File Editor Modal Component
 * Provides a modal interface for editing text files
 */
const TextFileEditor = ({ file, api, onClose, onSave }) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const loadFileContent = useCallback(async () => {
    if (!file || !isTextFile(file)) {
      setError(t('fileManager.textFileEditor.cannotEditAsText'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.getFileContent(file);

      if (result.success && result.data) {
        const fileContent = result.data.content || '';
        setContent(fileContent);
        setOriginalContent(fileContent);
      } else {
        setError(result.message || t('fileManager.textFileEditor.failedToLoadContent'));
      }
    } catch (err) {
      console.error('Error loading file content:', err);
      setError(t('fileManager.textFileEditor.failedToLoadContentDetail', { message: err.message }));
    } finally {
      setLoading(false);
    }
  }, [api, file, t]);

  // Load file content on mount
  useEffect(() => {
    loadFileContent();
  }, [loadFileContent]);

  // Track changes
  useEffect(() => {
    setHasChanges(content !== originalContent);
  }, [content, originalContent]);

  const handleSave = async e => {
    e.preventDefault();

    if (!hasChanges) {
      onClose();
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave(content);
      // onSave will handle closing the modal and error handling
    } catch (err) {
      console.error('Error saving file:', err);
      setError(t('fileManager.textFileEditor.failedToSaveDetail', { message: err.message }));
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowCloseConfirm(true);
      return;
    }

    onClose();
  };

  const confirmClose = () => {
    setShowCloseConfirm(false);
    onClose();
  };

  const handleContentChange = e => {
    setContent(e.target.value);
  };

  // Get file size info
  const getFileSizeInfo = () => {
    const bytes = new Blob([content]).size;
    if (bytes > 100 * 1024 * 1024) {
      // 100MB limit for text editing
      return {
        warning: true,
        message: t('fileManager.textFileEditor.fileSizeExceeds'),
      };
    }
    return { warning: false, message: '' };
  };

  const sizeInfo = getFileSizeInfo();

  return (
    <FormModal
      isOpen
      onClose={handleClose}
      onSubmit={handleSave}
      title={t('fileManager.textFileEditor.editTitle', {
        name: file?.name || t('fileManager.textFileEditor.unknownFile'),
      })}
      icon="fas fa-edit"
      submitText={
        hasChanges
          ? t('fileManager.textFileEditor.saveChanges')
          : t('fileManager.textFileEditor.close')
      }
      submitVariant={hasChanges ? 'is-primary' : 'is-info'}
      submitIcon={hasChanges ? 'fas fa-save' : null}
      loading={loading}
      disabled={false}
      showCancelButton={hasChanges}
      cancelText={t('fileManager.textFileEditor.cancel')}
    >
      <div className="mb-3">
        {/* File info */}
        <div className="alert alert-secondary mb-4">
          <div className="row">
            <div className="col">
              <strong>{t('fileManager.textFileEditor.fileLabel')}</strong>{' '}
              {file?.path || t('fileManager.textFileEditor.unknown')}
            </div>
            <div className="col">
              <strong>{t('fileManager.textFileEditor.sizeLabel')}</strong>{' '}
              {file?.size
                ? `${Math.round(file.size / 1024)} KB`
                : t('fileManager.textFileEditor.unknown')}
            </div>
            <div className="col">
              <strong>{t('fileManager.textFileEditor.modifiedLabel')}</strong>{' '}
              {file?.updatedAt
                ? new Date(file.updatedAt).toLocaleString()
                : t('fileManager.textFileEditor.unknown')}
            </div>
          </div>

          {hasChanges && (
            <div className="alert alert-warning small mt-2">
              <strong>{t('fileManager.textFileEditor.unsavedChangesLabel')}</strong>{' '}
              {t('fileManager.textFileEditor.unsavedChangesText')}
            </div>
          )}
        </div>

        {/* Size warning */}
        {sizeInfo.warning && (
          <div className="alert alert-warning mb-4">
            <strong>{t('fileManager.textFileEditor.warningLabel')}</strong> {sizeInfo.message}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="alert alert-danger mb-4">
            <button type="button" className="btn-close" onClick={() => setError('')} />
            <strong>{t('fileManager.textFileEditor.errorLabel')}</strong> {error}
          </div>
        )}

        {/* Content editor */}
        <label className="form-label" htmlFor="file-content-textarea">
          {t('fileManager.textFileEditor.fileContentLabel')}
        </label>
        <div>
          <textarea
            id="file-content-textarea"
            className="form-control"
            rows="25"
            value={content}
            onChange={handleContentChange}
            placeholder={t('fileManager.textFileEditor.fileContentPlaceholder')}
            disabled={loading || !!error}
            style={{
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              fontSize: '13px',
              lineHeight: '1.4',
            }}
          />
        </div>

        {/* Content stats */}
        <p className="form-text text-muted">
          {t('fileManager.textFileEditor.contentStats', {
            lines: content.split('\n').length,
            characters: content.length,
            size: Math.round(new Blob([content]).size / 1024),
          })}
        </p>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="mb-3">
        <div className="alert alert-info">
          <div className="small">
            <strong>{t('fileManager.textFileEditor.keyboardShortcutsLabel')}</strong>
            <br />
            <div className="row">
              <div className="col">
                <kbd>Ctrl</kbd> + <kbd>S</kbd> - {t('fileManager.textFileEditor.save')}
                <br />
                <kbd>Ctrl</kbd> + <kbd>Z</kbd> - {t('fileManager.textFileEditor.undo')}
              </div>
              <div className="col">
                <kbd>Ctrl</kbd> + <kbd>Y</kbd> - {t('fileManager.textFileEditor.redo')}
                <br />
                <kbd>Ctrl</kbd> + <kbd>A</kbd> - {t('fileManager.textFileEditor.selectAll')}
              </div>
              <div className="col">
                <kbd>Ctrl</kbd> + <kbd>F</kbd> - {t('fileManager.textFileEditor.find')}
                <br />
                <kbd>Tab</kbd> - {t('fileManager.textFileEditor.insertTab')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File type detection info */}
      {file?._hwMetadata && (
        <div className="mb-3">
          <div className="alert alert-secondary small">
            <div className="row align-items-center">
              <div className="col">
                <strong>{t('fileManager.textFileEditor.detectedTypeLabel')}</strong>{' '}
                {file._hwMetadata.mimeType || 'text/plain'}
              </div>
              {file._hwMetadata.syntax && (
                <div className="col">
                  <strong>{t('fileManager.textFileEditor.syntaxLabel')}</strong>{' '}
                  {file._hwMetadata.syntax}
                </div>
              )}
              <div className="col">
                <strong>{t('fileManager.textFileEditor.permissionsLabel')}</strong>{' '}
                {file._hwMetadata.permissions?.octal || t('fileManager.textFileEditor.unknown')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Confirmation Modal */}
      {showCloseConfirm && (
        <FormModal
          isOpen
          onClose={() => setShowCloseConfirm(false)}
          onSubmit={confirmClose}
          title={t('fileManager.textFileEditor.unsavedChangesTitle')}
          icon="fas fa-exclamation-triangle"
          submitText={t('fileManager.textFileEditor.discardChanges')}
          submitVariant="is-danger"
          cancelText={t('fileManager.textFileEditor.keepEditing')}
        >
          <div className="alert alert-warning">
            <p>
              <strong>{t('fileManager.textFileEditor.warningLabel')}</strong>{' '}
              {t('fileManager.textFileEditor.unsavedChangesWarning')}
            </p>
          </div>
          <p>{t('fileManager.textFileEditor.confirmClose')}</p>
        </FormModal>
      )}
    </FormModal>
  );
};

TextFileEditor.propTypes = {
  file: PropTypes.shape({
    name: PropTypes.string,
    path: PropTypes.string,
    size: PropTypes.number,
    updatedAt: PropTypes.string,
    _hwMetadata: PropTypes.shape({
      mimeType: PropTypes.string,
      syntax: PropTypes.string,
      permissions: PropTypes.shape({
        octal: PropTypes.string,
      }),
    }),
  }).isRequired,
  api: PropTypes.shape({
    getFileContent: PropTypes.func.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default TextFileEditor;
