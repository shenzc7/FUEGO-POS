/**
 * Minimalist Export Utilities
 * Uses vanilla JS for CSV (Excel) and browser printing for PDF.
 * Hard to break, zero dependencies.
 */

export const exportToCSV = (data, filename) => {
  if (!data || !data.length) return;

  const headers = Object.keys(data[0]);
  const csvRows = [];
  const safeFilename = Array.from(String(filename || 'export'))
    .map((character) => {
      const codePoint = character.charCodeAt(0);
      const isControlCharacter = codePoint >= 0 && codePoint <= 31;
      return isControlCharacter || /[<>:"/\\|?*]/.test(character) ? '_' : character;
    })
    .join('')
    .trim();
  
  // Add headers
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] ?? '';
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = `\uFEFF${csvRows.join('\r\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${safeFilename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const printReport = () => {
  window.print();
};
