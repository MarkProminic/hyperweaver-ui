import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { formatBytes, parseSize } from './StorageUtils';

const DatasetsTable = ({
  storageDatasets,
  datasetSort,
  handleDatasetSort,
  getSortIcon,
  resetDatasetSort,
  sectionsCollapsed,
  toggleSection,
}) => {
  const { t } = useTranslation();

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <button
              className="fs-5 fw-bold mb-0 cursor-pointer btn btn-link p-0"
              onClick={resetDatasetSort}
              title={t('host.datasetsTable.resetSortTitle')}
              type="button"
            >
              <i className="fas fa-folder-tree me-2" />
              <span>
                {t('host.datasetsTable.titleWithCount', { count: storageDatasets.length })}
              </span>
              {datasetSort.length > 1 && <i className="fas fa-sort-amount-down text-info ms-2" />}
            </button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-sm btn-link"
              onClick={() => toggleSection('datasets')}
              title={
                sectionsCollapsed.datasets
                  ? t('host.datasetsTable.expand')
                  : t('host.datasetsTable.collapse')
              }
            >
              <i
                className={`fas ${sectionsCollapsed.datasets ? 'fa-chevron-down' : 'fa-chevron-up'}`}
              />
            </button>
          </div>
        </div>
        {!sectionsCollapsed.datasets && (
          <>
            {storageDatasets.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped table-hover table-sm">
                  <thead>
                    <tr>
                      <th
                        className="cursor-pointer"
                        onClick={e => handleDatasetSort('name', e)}
                        title={t('host.datasetsTable.sortNameTitle')}
                      >
                        {t('host.datasetsTable.nameHeader')}{' '}
                        <i className={`fas ${getSortIcon(datasetSort, 'name')}`} />
                      </th>
                      <th
                        className="cursor-pointer"
                        onClick={e => handleDatasetSort('type', e)}
                        title={t('host.datasetsTable.sortTypeTitle')}
                      >
                        {t('host.datasetsTable.typeHeader')}{' '}
                        <i className={`fas ${getSortIcon(datasetSort, 'type')}`} />
                      </th>
                      <th
                        className="cursor-pointer"
                        onClick={e => handleDatasetSort('used', e)}
                        title={t('host.datasetsTable.sortUsedTitle')}
                      >
                        {t('host.datasetsTable.usedHeader')}{' '}
                        <i className={`fas ${getSortIcon(datasetSort, 'used')}`} />
                      </th>
                      <th
                        className="cursor-pointer"
                        onClick={e => handleDatasetSort('available', e)}
                        title={t('host.datasetsTable.sortAvailableTitle')}
                      >
                        {t('host.datasetsTable.availableHeader')}{' '}
                        <i className={`fas ${getSortIcon(datasetSort, 'available')}`} />
                      </th>
                      <th
                        className="cursor-pointer"
                        onClick={e => handleDatasetSort('referenced', e)}
                        title={t('host.datasetsTable.sortReferencedTitle')}
                      >
                        {t('host.datasetsTable.referencedHeader')}{' '}
                        <i className={`fas ${getSortIcon(datasetSort, 'referenced')}`} />
                      </th>
                      <th
                        className="cursor-pointer"
                        onClick={e => handleDatasetSort('compression', e)}
                        title={t('host.datasetsTable.sortCompressionTitle')}
                      >
                        {t('host.datasetsTable.compressionHeader')}{' '}
                        <i className={`fas ${getSortIcon(datasetSort, 'compression')}`} />
                      </th>
                      <th
                        className="cursor-pointer"
                        onClick={e => handleDatasetSort('mountpoint', e)}
                        title={t('host.datasetsTable.sortMountpointTitle')}
                      >
                        {t('host.datasetsTable.mountpointHeader')}{' '}
                        <i className={`fas ${getSortIcon(datasetSort, 'mountpoint')}`} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {storageDatasets.map(dataset => (
                      <tr key={dataset.name || dataset.dataset}>
                        <td>
                          <code className="small">{dataset.name || dataset.dataset}</code>
                        </td>
                        <td>
                          <span className="badge text-bg-info">
                            {dataset.type || t('host.datasetsTable.filesystemType')}
                          </span>
                        </td>
                        <td>{formatBytes(dataset.used_bytes || parseSize(dataset.used))}</td>
                        <td>
                          {formatBytes(dataset.available_bytes || parseSize(dataset.available))}
                        </td>
                        <td>
                          {formatBytes(dataset.referenced_bytes || parseSize(dataset.referenced))}
                        </td>
                        <td>
                          <span className="badge text-bg-secondary">
                            {dataset.compression ||
                              dataset.compressRatio ||
                              t('host.datasetsTable.compressionOff')}
                          </span>
                        </td>
                        <td>
                          <code className="small">
                            {dataset.mountpoint ||
                              dataset.mount ||
                              t('host.datasetsTable.notAvailable')}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-info">
                <p>{t('host.datasetsTable.empty')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

DatasetsTable.propTypes = {
  storageDatasets: PropTypes.array.isRequired,
  datasetSort: PropTypes.array.isRequired,
  handleDatasetSort: PropTypes.func.isRequired,
  getSortIcon: PropTypes.func.isRequired,
  resetDatasetSort: PropTypes.func.isRequired,
  sectionsCollapsed: PropTypes.object.isRequired,
  toggleSection: PropTypes.func.isRequired,
};

export default DatasetsTable;
