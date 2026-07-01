import PropTypes from 'prop-types';

import ArtifactCopyModal from './components/modals/ArtifactCopyModal';
import ArtifactDetailsModal from './components/modals/ArtifactDetailsModal';
import ArtifactDownloadModal from './components/modals/ArtifactDownloadModal';
import ArtifactMoveModal from './components/modals/ArtifactMoveModal';
import ArtifactUploadModal from './components/modals/ArtifactUploadModal';
import StoragePathCreateModal from './components/modals/StoragePathCreateModal';
import StoragePathEditModal from './components/modals/StoragePathEditModal';

/**
 * All modals used in ArtifactManagement, extracted to keep the main file small.
 */
const ArtifactStorageModals = ({
  server,
  storagePaths,
  selectedStoragePath,
  selectedArtifact,
  artifactDetails,
  showStoragePathCreateModal,
  showStoragePathEditModal,
  showArtifactUploadModal,
  showArtifactDownloadModal,
  showArtifactDetailsModal,
  showArtifactMoveModal,
  showArtifactCopyModal,
  onCloseStoragePathCreate,
  onSuccessStoragePathCreate,
  onCloseStoragePathEdit,
  onSuccessStoragePathEdit,
  onCloseArtifactUpload,
  onSuccessArtifactUpload,
  onCloseArtifactDownload,
  onSuccessArtifactDownload,
  onCloseArtifactDetails,
  onCloseArtifactMove,
  onSuccessArtifactMove,
  onCloseArtifactCopy,
  onSuccessArtifactCopy,
  onError,
  loadArtifacts,
}) => (
  <>
    {showStoragePathCreateModal && (
      <StoragePathCreateModal
        server={server}
        onClose={onCloseStoragePathCreate}
        onSuccess={onSuccessStoragePathCreate}
        onError={onError}
      />
    )}

    {showStoragePathEditModal && selectedStoragePath && (
      <StoragePathEditModal
        server={server}
        storagePath={selectedStoragePath}
        onClose={onCloseStoragePathEdit}
        onSuccess={onSuccessStoragePathEdit}
        onError={onError}
      />
    )}

    {showArtifactUploadModal && (
      <ArtifactUploadModal
        server={server}
        storagePaths={storagePaths}
        onClose={onCloseArtifactUpload}
        onSuccess={onSuccessArtifactUpload}
        onError={onError}
      />
    )}

    {showArtifactDownloadModal && (
      <ArtifactDownloadModal
        server={server}
        storagePaths={storagePaths}
        onClose={onCloseArtifactDownload}
        onSuccess={onSuccessArtifactDownload}
        onError={onError}
      />
    )}

    {showArtifactDetailsModal && selectedArtifact && artifactDetails && (
      <ArtifactDetailsModal
        artifact={selectedArtifact}
        details={artifactDetails}
        server={server}
        onClose={onCloseArtifactDetails}
      />
    )}

    {showArtifactMoveModal && selectedArtifact && (
      <ArtifactMoveModal
        server={server}
        artifact={selectedArtifact}
        storagePaths={storagePaths}
        onClose={onCloseArtifactMove}
        onSuccess={() => {
          onSuccessArtifactMove();
          loadArtifacts();
        }}
        onError={onError}
      />
    )}

    {showArtifactCopyModal && selectedArtifact && (
      <ArtifactCopyModal
        server={server}
        artifact={selectedArtifact}
        storagePaths={storagePaths}
        onClose={onCloseArtifactCopy}
        onSuccess={() => {
          onSuccessArtifactCopy();
          loadArtifacts();
        }}
        onError={onError}
      />
    )}
  </>
);

ArtifactStorageModals.propTypes = {
  server: PropTypes.object.isRequired,
  storagePaths: PropTypes.array.isRequired,
  selectedStoragePath: PropTypes.object,
  selectedArtifact: PropTypes.object,
  artifactDetails: PropTypes.object,
  showStoragePathCreateModal: PropTypes.bool.isRequired,
  showStoragePathEditModal: PropTypes.bool.isRequired,
  showArtifactUploadModal: PropTypes.bool.isRequired,
  showArtifactDownloadModal: PropTypes.bool.isRequired,
  showArtifactDetailsModal: PropTypes.bool.isRequired,
  showArtifactMoveModal: PropTypes.bool.isRequired,
  showArtifactCopyModal: PropTypes.bool.isRequired,
  onCloseStoragePathCreate: PropTypes.func.isRequired,
  onSuccessStoragePathCreate: PropTypes.func.isRequired,
  onCloseStoragePathEdit: PropTypes.func.isRequired,
  onSuccessStoragePathEdit: PropTypes.func.isRequired,
  onCloseArtifactUpload: PropTypes.func.isRequired,
  onSuccessArtifactUpload: PropTypes.func.isRequired,
  onCloseArtifactDownload: PropTypes.func.isRequired,
  onSuccessArtifactDownload: PropTypes.func.isRequired,
  onCloseArtifactDetails: PropTypes.func.isRequired,
  onCloseArtifactMove: PropTypes.func.isRequired,
  onSuccessArtifactMove: PropTypes.func.isRequired,
  onCloseArtifactCopy: PropTypes.func.isRequired,
  onSuccessArtifactCopy: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
  loadArtifacts: PropTypes.func.isRequired,
};

export default ArtifactStorageModals;
