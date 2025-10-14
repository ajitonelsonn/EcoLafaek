/**
 * Export utilities for downloading data in various formats
 */

export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);

  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(data: any, filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printReport(elementId: string) {
  const printContent = document.getElementById(elementId);
  if (!printContent) {
    alert('Content not found');
    return;
  }

  const windowPrint = window.open('', '', 'width=900,height=650');
  if (!windowPrint) {
    alert('Popup blocked. Please allow popups for this site.');
    return;
  }

  windowPrint.document.write('<html><head><title>Print Report</title>');
  windowPrint.document.write('<style>');
  windowPrint.document.write(`
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; font-weight: bold; }
    h1, h2 { color: #333; }
    .no-print { display: none; }
  `);
  windowPrint.document.write('</style></head><body>');
  windowPrint.document.write(printContent.innerHTML);
  windowPrint.document.write('</body></html>');

  windowPrint.document.close();
  windowPrint.focus();

  setTimeout(() => {
    windowPrint.print();
    windowPrint.close();
  }, 250);
}
