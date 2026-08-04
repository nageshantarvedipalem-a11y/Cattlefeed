export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const getExportFilename = (response, fallback) => {
  const disposition = response.headers['content-disposition'];
  if (disposition) {
    const match = disposition.match(/filename="(.+)"/);
    if (match?.[1]) return match[1];
  }
  return fallback;
};
