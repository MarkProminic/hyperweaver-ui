export const bytesToGb = bytes => {
  if (!bytes || isNaN(bytes)) {
    return 0;
  }
  return bytes / 1024 ** 3;
};

export const safeBytesToGb = bytes => {
  const result = bytesToGb(bytes);
  return isNaN(result) ? 0 : result;
};

export const safeParseFloat = value => {
  if (!value || value === '') {
    return null;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

export const formatGbValue = value => {
  const parsed = safeParseFloat(value);
  return parsed !== null ? parsed.toFixed(2) : null;
};

export const formatBytes = bytes => {
  if (!bytes) {
    return '0 B';
  }
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`;
};

export const getValidationColor = (errors, warnings) => {
  if (errors && errors.length > 0) {
    return 'danger';
  }
  if (warnings && warnings.length > 0) {
    return 'warning';
  }
  return 'success';
};

export const computeSliderBackground = (value, min, max, color) => {
  if (!value) {
    return 'linear-gradient(to right, #ccc 0%, #ccc 100%)';
  }
  const pct = ((parseFloat(value) - min) / (max - min)) * 100;
  return `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #ccc ${pct}%, #ccc 100%)`;
};
