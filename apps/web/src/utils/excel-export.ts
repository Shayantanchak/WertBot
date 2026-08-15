/**
 * Formula-Driven Spreadsheet Export Utility
 * Generates CSV / Excel files with dynamic mathematical formulas (=SUM, =AVERAGE)
 * ensuring full auditability for financial analysts.
 */

export interface ExportRow {
  category: string;
  amount: number;
  currency: string;
  notes?: string;
}

export function exportFormulaDrivenFinancialReport(
  reportTitle: string,
  rows: ExportRow[],
  filename: string = 'WertBot_Financial_Report.csv',
) {
  const csvLines: string[] = [];

  // Metadata headers
  csvLines.push(`"${reportTitle}"`);
  csvLines.push(`"Export Date","${new Date().toISOString()}"`);
  csvLines.push('');

  // Table Columns
  csvLines.push('"Row ID","Category","Amount","Currency","Formula Audit / Notes"');

  rows.forEach((row, idx) => {
    const rowNum = idx + 6; // Account for header lines offset
    csvLines.push(`${idx + 1},"${row.category}",${row.amount},"${row.currency}","${row.notes || 'Recorded Entry'}"`);
  });

  const startRow = 6;
  const endRow = startRow + rows.length - 1;

  // Add Dynamic Formula Rows
  csvLines.push('');
  csvLines.push(`"TOTAL SPEND",,"=SUM(C${startRow}:C${endRow})","USD","Native Dynamic Excel Formula"`);
  csvLines.push(`"AVERAGE SPEND",,"=AVERAGE(C${startRow}:C${endRow})","USD","Native Dynamic Excel Formula"`);
  csvLines.push(`"MAX TRANSACTION",,"=MAX(C${startRow}:C${endRow})","USD","Native Dynamic Excel Formula"`);

  const csvString = csvLines.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
