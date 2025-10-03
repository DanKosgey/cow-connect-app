import ExcelJS from 'exceljs';

interface ExportOptions {
  fileName: string;
  sheetName?: string;
  headers?: { [key: string]: string };
}

export async function exportToExcel<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions
) {
  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(options.sheetName || 'Sheet1');

  // Transform data if headers mapping is provided
  const transformedData = data.map((item) => {
    if (!options.headers) return item;

    const transformed: Record<string, any> = {};
    Object.entries(options.headers).forEach(([key, label]) => {
      transformed[label] = item[key];
    });
    return transformed;
  });

  // Set headers and columns
  if (transformedData.length > 0) {
    const headers = Object.keys(transformedData[0]);
    worksheet.columns = headers.map(header => ({
      header,
      key: header,
      width: 15
    }));
  }

  // Add rows
  worksheet.addRows(transformedData);

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Create blob and download
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${options.fileName}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
}