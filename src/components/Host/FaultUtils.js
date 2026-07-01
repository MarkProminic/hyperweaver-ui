const getSeverityTagClass = severity => {
  const level = severity?.toLowerCase();
  if (level === 'critical') {
    return 'text-bg-danger';
  }
  if (level === 'major') {
    return 'text-bg-warning';
  }
  if (level === 'minor') {
    return 'text-bg-info';
  }
  return 'text-bg-secondary';
};

export { getSeverityTagClass };
