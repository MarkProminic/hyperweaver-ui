import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import FormModal from '../../common/FormModal';

import { formatFileSize } from './FileManagerTransforms';
import PermissionEditor from './PermissionEditor';

/**
 * Current vs new properties comparison display
 */
const PropertiesComparison = ({
  file,
  selectedUser,
  selectedUserObj,
  selectedGroup,
  selectedGroupObj,
  currentOctal,
}) => (
  <div className="mb-3">
    <div className="alert alert-info">
      <div className="row">
        <div className="col">
          <strong>Current:</strong>
          <br />
          User: {file._hwMetadata?.uid || 'Unknown'}
          <br />
          Group: {file._hwMetadata?.gid || 'Unknown'}
          <br />
          Mode: {file._hwMetadata?.permissions?.octal || 'Unknown'}
        </div>
        <div className="col">
          <strong>New:</strong>
          <br />
          User: {selectedUser ? `${selectedUserObj?.username} (${selectedUser})` : 'No change'}
          <br />
          Group: {selectedGroup ? `${selectedGroupObj?.groupname} (${selectedGroup})` : 'No change'}
          <br />
          Mode: {currentOctal}
        </div>
      </div>
    </div>
  </div>
);

PropertiesComparison.propTypes = {
  file: PropTypes.object.isRequired,
  selectedUser: PropTypes.string.isRequired,
  selectedUserObj: PropTypes.object,
  selectedGroup: PropTypes.string.isRequired,
  selectedGroupObj: PropTypes.object,
  currentOctal: PropTypes.string.isRequired,
};

/**
 * File Properties Modal Component
 * Allows viewing and editing file permissions, ownership, and metadata
 */
const FilePropertiesModal = ({ isOpen, onClose, file, api, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [systemUsers, setSystemUsers] = useState([]);
  const [systemGroups, setSystemGroups] = useState([]);

  // Permission state
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [permissions, setPermissions] = useState({
    owner: { read: true, write: true, execute: false },
    group: { read: true, write: false, execute: false },
    other: { read: true, write: false, execute: false },
  });
  const [customMode, setCustomMode] = useState('');
  const [useCustomMode, setUseCustomMode] = useState(false);
  const [applyRecursively, setApplyRecursively] = useState(false);

  // Define functions before useEffect
  const loadSystemData = useCallback(async () => {
    try {
      const [usersResult, groupsResult] = await Promise.all([
        api.getSystemUsers(),
        api.getSystemGroups(),
      ]);

      if (usersResult.success && usersResult.data?.users) {
        setSystemUsers(usersResult.data.users);
      }

      if (groupsResult.success && groupsResult.data?.groups) {
        setSystemGroups(groupsResult.data.groups);
      }
    } catch {
      // System data loading failed silently
    }
  }, [api]);

  const initializePermissions = useCallback(() => {
    if (!file?._hwMetadata?.permissions) {
      return;
    }

    const perms = file._hwMetadata.permissions;
    setCustomMode(perms.octal || '644');

    setSelectedUser(file._hwMetadata.uid?.toString() || '1000');
    setSelectedGroup(file._hwMetadata.gid?.toString() || '1000');

    const octal = perms.octal || '644';
    const parseOctal = digit => ({
      read: (parseInt(digit) & 4) !== 0,
      write: (parseInt(digit) & 2) !== 0,
      execute: (parseInt(digit) & 1) !== 0,
    });

    if (octal.length === 3) {
      setPermissions({
        owner: parseOctal(octal[0]),
        group: parseOctal(octal[1]),
        other: parseOctal(octal[2]),
      });
    }
  }, [file]);

  // Load system users and groups on mount
  useEffect(() => {
    if (isOpen) {
      loadSystemData();
      initializePermissions();
    }
  }, [isOpen, loadSystemData, initializePermissions]);

  const calculateOctalFromCheckboxes = () => {
    const calcDigit = perms =>
      (perms.read ? 4 : 0) + (perms.write ? 2 : 0) + (perms.execute ? 1 : 0);

    return `${calcDigit(permissions.owner)}${calcDigit(permissions.group)}${calcDigit(permissions.other)}`;
  };

  const handlePermissionChange = (category, permission, value) => {
    setPermissions(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [permission]: value,
      },
    }));
    setUseCustomMode(false);
  };

  const handleCustomModeChange = value => {
    setCustomMode(value);
    setUseCustomMode(true);
  };

  const handleSubmit = async e => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      const permissionData = {
        uid: selectedUser ? parseInt(selectedUser) : undefined,
        gid: selectedGroup ? parseInt(selectedGroup) : undefined,
        mode: useCustomMode ? customMode : calculateOctalFromCheckboxes(),
        recursive: applyRecursively && file.isDirectory,
      };

      // Remove undefined values
      Object.keys(permissionData).forEach(
        key => permissionData[key] === undefined && delete permissionData[key]
      );

      const result = await api.updatePermissions(file, permissionData);

      if (result.success) {
        onSuccess(result);
        onClose();
      } else {
        setError(result.message || 'Failed to update permissions');
      }
    } catch (submitErr) {
      setError(`Failed to update permissions: ${submitErr.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!file) {
    return null;
  }

  const currentOctal = useCustomMode ? customMode : calculateOctalFromCheckboxes();
  const selectedUserObj = systemUsers.find(u => u.uid.toString() === selectedUser);
  const selectedGroupObj = systemGroups.find(g => g.gid.toString() === selectedGroup);
  const isWindows = api.isWindowsAgent();

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Properties: ${file.name}`}
      icon="fas fa-cog"
      submitText="Apply Changes"
      submitVariant="is-primary"
      submitIcon="fas fa-save"
      loading={loading}
      showCancelButton
    >
      {/* File info */}
      <div className="mb-3">
        <div className="alert alert-dark">
          <div className="row">
            <div className="col">
              <strong>Name:</strong> {file.name}
              <br />
              <strong>Path:</strong> {file.path}
              <br />
              <strong>Type:</strong> {file.isDirectory ? 'Directory' : 'File'}
            </div>
            <div className="col">
              <strong>Size:</strong> {formatFileSize(file.size)}
              <br />
              <strong>Modified:</strong>{' '}
              {file.updatedAt ? new Date(file.updatedAt).toLocaleString() : 'Unknown'}
              <br />
              <strong>MIME Type:</strong> {file._hwMetadata?.mimeType || 'Unknown'}
            </div>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="alert alert-danger">
          <button type="button" className="btn-close" onClick={() => setError('')} />
          {error}
        </div>
      )}

      <div className="row">
        {/* Ownership — POSIX only; a Windows agent rejects uid/gid. */}
        {!isWindows && (
          <div className="col">
            <h5 className="h6">Ownership</h5>

            {/* User selection */}
            <div className="mb-3">
              <label htmlFor="file-props-user" className="form-label">
                User
              </label>
              <div>
                <select
                  id="file-props-user"
                  className="form-select"
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                >
                  <option value="">Keep current</option>
                  {systemUsers.map(user => (
                    <option key={user.uid} value={user.uid.toString()}>
                      {user.username} ({user.uid})
                    </option>
                  ))}
                </select>
              </div>
              <p className="form-text text-muted">
                Current: {selectedUserObj?.username || 'Unknown'} (
                {selectedUser || file._hwMetadata?.uid || 'Unknown'})
              </p>
            </div>

            {/* Group selection */}
            <div className="mb-3">
              <label htmlFor="file-props-group" className="form-label">
                Group
              </label>
              <div>
                <select
                  id="file-props-group"
                  className="form-select"
                  value={selectedGroup}
                  onChange={e => setSelectedGroup(e.target.value)}
                >
                  <option value="">Keep current</option>
                  {systemGroups.map(group => (
                    <option key={group.gid} value={group.gid.toString()}>
                      {group.groupname} ({group.gid})
                    </option>
                  ))}
                </select>
              </div>
              <p className="form-text text-muted">
                Current: {selectedGroupObj?.groupname || 'Unknown'} (
                {selectedGroup || file._hwMetadata?.gid || 'Unknown'})
              </p>
            </div>
          </div>
        )}

        {/* Permissions - extracted component */}
        <PermissionEditor
          permissions={permissions}
          onPermissionChange={handlePermissionChange}
          useCustomMode={useCustomMode}
          setUseCustomMode={setUseCustomMode}
          customMode={customMode}
          currentOctal={currentOctal}
          onCustomModeChange={handleCustomModeChange}
          originalOctal={file._hwMetadata?.permissions?.octal}
          setPermissions={setPermissions}
        />
      </div>

      {/* Recursive option for directories */}
      {file.isDirectory && (
        <div className="mb-3">
          <div className="form-check">
            <input
              id="file-props-recursive"
              type="checkbox"
              className="form-check-input"
              checked={applyRecursively}
              onChange={e => setApplyRecursively(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="file-props-recursive">
              Apply changes recursively to all contents
            </label>
          </div>
          <p className="form-text text-warning">
            Warning: Recursive changes will affect all files and subdirectories
          </p>
        </div>
      )}

      {/* Current vs new comparison */}
      <PropertiesComparison
        file={file}
        selectedUser={selectedUser}
        selectedUserObj={selectedUserObj}
        selectedGroup={selectedGroup}
        selectedGroupObj={selectedGroupObj}
        currentOctal={currentOctal}
      />

      {/* Permission explanation */}
      <div className="mb-3">
        <div className="alert alert-dark small">
          <div className="small">
            <strong>Permission Guide:</strong>
            <br />
            <strong>Read (r)</strong> - View file contents or list directory
            <br />
            <strong>Write (w)</strong> - Modify file or create/delete in directory
            <br />
            <strong>Execute (x)</strong> - Run file as program or enter directory
            <br />
            <strong>Common modes:</strong> 644 (files), 755 (directories/executables), 600 (private
            files)
          </div>
        </div>
      </div>
    </FormModal>
  );
};

FilePropertiesModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  file: PropTypes.object,
  api: PropTypes.object.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

export default FilePropertiesModal;
