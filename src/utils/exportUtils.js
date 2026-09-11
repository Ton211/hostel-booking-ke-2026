/**
 * Export utilities for the Hostel Management System
 * Supports CSV, Excel, and PDF exports
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Export data to CSV file
 * @param {Array<Object>} data - Array of objects to export
 * @param {string} filename - Filename without extension
 */
export function exportToCSV(data, filename) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export data to Excel file
 * @param {Array<Object>} data - Array of objects to export
 * @param {string} filename - Filename without extension
 */
export function exportToExcel(data, filename) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

  // Auto-width columns
  const colWidths = Object.keys(data[0]).map((key) => {
    const maxLength = Math.max(
      key.length,
      ...data.map((row) => String(row[key] || '').length)
    );
    return { wch: Math.min(maxLength + 2, 40) };
  });
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export data to PDF file
 * @param {Array<Object>} data - Array of objects to export
 * @param {string} filename - Filename without extension
 * @param {string} title - PDF title
 * @param {Array<Object>} columns - Column config: [{ header, dataKey }]
 */
export function exportToPDF(data, filename, title, columns) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

  // Table
  const tableColumns = columns.map((col) => ({
    header: col.header,
    dataKey: col.dataKey,
  }));

  doc.autoTable({
    startY: 35,
    columns: tableColumns,
    body: data,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { top: 35 },
  });

  doc.save(`${filename}.pdf`);
}
