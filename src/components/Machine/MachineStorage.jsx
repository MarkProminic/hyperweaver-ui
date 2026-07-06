import PropTypes from 'prop-types';

const MachineStorage = ({ configuration }) => {
  if (!configuration || (!configuration.diskif && !configuration.bootdisk && !configuration.disk)) {
    return null;
  }

  return (
    <div className="card mb-0">
      <div className="card-body">
        <h4 className="fs-6 fw-bold mb-3">
          <i className="fas fa-hdd me-2" />
          Storage Configuration
        </h4>

        {/* Disk Interface Only */}
        <div className="mb-3">
          <div className="table-responsive">
            <table className="table table-striped small">
              <tbody>
                <tr>
                  <td className="px-3 py-2">
                    <strong>Disk Interface Driver</strong>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-muted font-monospace">
                      {configuration.diskif || 'N/A'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Boot Disk */}
        {configuration.bootdisk && (
          <div className="mb-3">
            <h5 className="fs-6 text-muted mb-2">Boot Disk</h5>
            <div className="table-responsive">
              <table className="table table-striped small">
                <thead>
                  <tr>
                    <th className="px-3 py-2">NAME</th>
                    <th className="px-3 py-2">BLOCKSIZE</th>
                    <th className="px-3 py-2">SPARSE</th>
                    <th className="px-3 py-2">SIZE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2">
                      <span className="text-muted small font-monospace">
                        {configuration.bootdisk.path}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-muted font-monospace">
                        {configuration.bootdisk.blocksize}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-muted font-monospace">
                        {configuration.bootdisk.sparse}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-muted font-monospace">
                        {configuration.bootdisk.size}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Data Disks */}
        {configuration.disk && configuration.disk.length > 0 && (
          <div>
            <h5 className="fs-6 text-muted mb-2">Data Disks</h5>
            <div className="table-responsive">
              <table className="table table-striped small">
                <thead>
                  <tr>
                    <th className="px-3 py-2">NAME</th>
                    <th className="px-3 py-2">BLOCKSIZE</th>
                    <th className="px-3 py-2">SPARSE</th>
                    <th className="px-3 py-2">SIZE</th>
                  </tr>
                </thead>
                <tbody>
                  {(configuration.disk || [])
                    .filter(disk => disk !== null && disk !== undefined)
                    .map((disk, index) => (
                      <tr key={disk.path || index}>
                        <td className="px-3 py-2">
                          <span className="text-muted small font-monospace">
                            {disk?.path || 'N/A'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-muted font-monospace">
                            {disk?.blocksize || 'N/A'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-muted font-monospace">{disk?.sparse || 'N/A'}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-muted font-monospace">{disk?.size || 'N/A'}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

MachineStorage.propTypes = {
  configuration: PropTypes.shape({
    diskif: PropTypes.string,
    bootdisk: PropTypes.shape({
      path: PropTypes.string,
      blocksize: PropTypes.string,
      sparse: PropTypes.string,
      size: PropTypes.string,
    }),
    disk: PropTypes.arrayOf(
      PropTypes.shape({
        path: PropTypes.string,
        blocksize: PropTypes.string,
        sparse: PropTypes.string,
        size: PropTypes.string,
      })
    ),
  }),
};

export default MachineStorage;
