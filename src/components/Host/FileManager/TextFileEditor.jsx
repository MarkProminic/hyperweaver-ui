import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import FormModal from '../../common/FormModal';

import { isTextFile } from './FileManagerTransforms';

/**
 * Text File Editor Modal Component
 * Provides a modal interface for editing text files
 */
const TextFileEditor = ({ file, api, onClose, onSave }) => {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const loadFileContent = useCallback(async () => {
    if (!file || !isTextFile(file)) {
      setError('This file cannot be edited as text');
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
        setError(result.message || 'Failed to load file content');
      }
    } catch (err) {
      console.error('Error loading file content:', err);
      setError(`Failed to load file content: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [api, file]);

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
      setError(`Failed to save file: ${err.message}`);
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
        message: 'File size exceeds 100MB. Large files may cause performance issues.',
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
      title={`Edit: ${file?.name || 'Unknown File'}`}
      icon="fas fa-edit"
      submitText={hasChanges ? 'Save Changes' : 'Close'}
      submitVariant={hasChanges ? 'is-primary' : 'is-info'}
      submitIcon={hasChanges ? 'fas fa-save' : null}
      loading={loading}
      disabled={false}
      showCancelButton={hasChanges}
      cancelText="Cancel"
    >
      <div className="mb-3">
        {/* File info */}
        <div className="alert alert-secondary mb-4">
          <div className="row">
            <div className="col">
              <strong>File:</strong> {file?.path || 'Unknown'}
            </div>
            <div className="col">
              <strong>Size:</strong> {file?.size ? `${Math.round(file.size / 1024)} KB` : 'Unknown'}
            </div>
            <div className="col">
              <strong>Modified:</strong>{' '}
              {file?.updatedAt ? new Date(file.updatedAt).toLocaleString() : 'Unknown'}
            </div>
          </div>

          {hasChanges && (
            <div className="alert alert-warning small mt-2">
              <strong>Unsaved Changes:</strong> You have made changes to this file.
            </div>
          )}
        </div>

        {/* Size warning */}
        {sizeInfo.warning && (
          <div className="alert alert-warning mb-4">
            <strong>Warning:</strong> {sizeInfo.message}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="alert alert-danger mb-4">
            <button type="button" className="btn-close" onClick={() => setError('')} />
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Content editor */}
        <label className="form-label" htmlFor="file-content-textarea">
          File Content
        </label>
        <div>
          <textarea
            id="file-content-textarea"
            className="form-control"
            rows="25"
            value={content}
            onChange={handleContentChange}
            placeholder="File content will appear here..."
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
          Lines: {content.split('\n').length} | Characters: {content.length} | Size: ~
          {Math.round(new Blob([content]).size / 1024)} KB
        </p>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="mb-3">
        <div className="alert alert-info">
          <div className="small">
            <strong>Keyboard Shortcuts:</strong>
            <br />
            <div className="row">
              <div className="col">
                <kbd>Ctrl</kbd> + <kbd>S</kbd> - Save
                <br />
                <kbd>Ctrl</kbd> + <kbd>Z</kbd> - Undo
              </div>
              <div className="col">
                <kbd>Ctrl</kbd> + <kbd>Y</kbd> - Redo
                <br />
                <kbd>Ctrl</kbd> + <kbd>A</kbd> - Select All
              </div>
              <div className="col">
                <kbd>Ctrl</kbd> + <kbd>F</kbd> - Find
                <br />
                <kbd>Tab</kbd> - Insert tab
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
                <strong>Detected Type:</strong> {file._hwMetadata.mimeType || 'text/plain'}
              </div>
              {file._hwMetadata.syntax && (
                <div className="col">
                  <strong>Syntax:</strong> {file._hwMetadata.syntax}
                </div>
              )}
              <div className="col">
                <strong>Permissions:</strong> {file._hwMetadata.permissions?.octal || 'Unknown'}
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
          title="Unsaved Changes"
          icon="fas fa-exclamation-triangle"
          submitText="Discard Changes"
          submitVariant="is-danger"
          cancelText="Keep Editing"
        >
          <div className="alert alert-warning">
            <p>
              <strong>Warning:</strong> You have unsaved changes that will be lost.
            </p>
          </div>
          <p>Are you sure you want to close without saving?</p>
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
