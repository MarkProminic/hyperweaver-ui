import { useState } from 'react';

const createSortHandler = (setSortState, defaultColumn, defaultDirection) => (column, event) => {
  setSortState(prevSort => {
    const existingIndex = prevSort.findIndex(sort => sort.column === column);

    if (!event?.ctrlKey && !event?.metaKey) {
      if (existingIndex >= 0) {
        const currentSort = prevSort[existingIndex];
        if (currentSort.direction === 'asc') {
          return [{ column, direction: 'desc' }];
        }
        return [{ column: defaultColumn, direction: defaultDirection }];
      }
      return [{ column, direction: 'asc' }];
    }

    if (existingIndex >= 0) {
      const newSort = [...prevSort];
      if (newSort[existingIndex].direction === 'asc') {
        newSort[existingIndex].direction = 'desc';
      } else {
        newSort.splice(existingIndex, 1);
      }
      return newSort.length > 0
        ? newSort
        : [{ column: defaultColumn, direction: defaultDirection }];
    }
    return [...prevSort, { column, direction: 'asc' }];
  });
};

const createSortReset = (setSortState, defaultColumn, defaultDirection) => () => {
  setSortState([{ column: defaultColumn, direction: defaultDirection }]);
};

export const getSortIcon = (currentSortArray, column) => {
  const sortIndex = currentSortArray.findIndex(sort => sort.column === column);
  if (sortIndex === -1) {
    return 'fa-sort';
  }

  const sort = currentSortArray[sortIndex];
  const baseIcon = sort.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down';

  return baseIcon + (currentSortArray.length > 1 ? ` ${sortIndex + 1}` : '');
};

export const useStorageSorting = () => {
  const [poolSort, setPoolSort] = useState([{ column: 'pool', direction: 'asc' }]);
  const [datasetSort, setDatasetSort] = useState([{ column: 'name', direction: 'asc' }]);
  const [diskSort, setDiskSort] = useState([{ column: 'device_name', direction: 'asc' }]);
  const [diskIOSort, setDiskIOSort] = useState([{ column: 'totalMbps', direction: 'desc' }]);

  const handlePoolSort = createSortHandler(setPoolSort, 'pool', 'asc');
  const handleDatasetSort = createSortHandler(setDatasetSort, 'name', 'asc');
  const handleDiskSort = createSortHandler(setDiskSort, 'device_name', 'asc');
  const handleDiskIOSort = createSortHandler(setDiskIOSort, 'totalMbps', 'desc');

  const resetPoolSort = createSortReset(setPoolSort, 'pool', 'asc');
  const resetDatasetSort = createSortReset(setDatasetSort, 'name', 'asc');
  const resetDiskSort = createSortReset(setDiskSort, 'device_name', 'asc');
  const resetDiskIOSort = createSortReset(setDiskIOSort, 'totalMbps', 'desc');

  return {
    poolSort,
    handlePoolSort,
    resetPoolSort,
    datasetSort,
    handleDatasetSort,
    resetDatasetSort,
    diskSort,
    handleDiskSort,
    resetDiskSort,
    diskIOSort,
    handleDiskIOSort,
    resetDiskIOSort,
  };
};
