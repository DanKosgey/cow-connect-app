import { AgrovetProduct } from '@/services/agrovet-inventory-service';

/**
 * Convert products array to CSV string
 */
export const productsToCsv = (products: AgrovetProduct[]): string => {
  // Define CSV headers
  const headers = [
    'ID',
    'Name',
    'Description',
    'Category',
    'Unit',
    'Current Stock',
    'Reorder Level',
    'Supplier',
    'Cost Price',
    'Selling Price',
    'Credit Eligible',
    'Image URL',
    'Image Alt Text'
  ];

  // Create header row
  const csvRows = [headers.join(',')];

  // Add data rows
  for (const product of products) {
    const values = [
      product.id,
      `"${product.name}"`,
      `"${product.description || ''}"`,
      `"${product.category}"`,
      `"${product.unit}"`,
      product.current_stock,
      product.reorder_level,
      `"${product.supplier}"`,
      product.cost_price,
      product.selling_price,
      product.is_credit_eligible ? 'Yes' : 'No',
      `"${product.image_url || ''}"`,
      `"${product.image_alt_text || ''}"`
    ];
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

/**
 * Parse CSV string to products array
 */
export const csvToProducts = (csvString: string): Partial<AgrovetProduct>[] => {
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
  const products: Partial<AgrovetProduct>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(value => value.trim().replace(/"/g, ''));
    if (values.length !== headers.length) continue;

    const product: Partial<AgrovetProduct> = {};
    
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = values[j];
      
      switch (header.toLowerCase()) {
        case 'id':
          product.id = value;
          break;
        case 'name':
          product.name = value;
          break;
        case 'description':
          product.description = value || undefined;
          break;
        case 'category':
          product.category = value;
          break;
        case 'unit':
          product.unit = value;
          break;
        case 'current stock':
          product.current_stock = parseFloat(value) || 0;
          break;
        case 'reorder level':
          product.reorder_level = parseFloat(value) || 0;
          break;
        case 'supplier':
          product.supplier = value;
          break;
        case 'cost price':
          product.cost_price = parseFloat(value) || 0;
          break;
        case 'selling price':
          product.selling_price = parseFloat(value) || 0;
          break;
        case 'credit eligible':
          product.is_credit_eligible = value.toLowerCase() === 'yes' || value === '1' || value.toLowerCase() === 'true';
          break;
        case 'image url':
          product.image_url = value || undefined;
          break;
        case 'image alt text':
          product.image_alt_text = value || undefined;
          break;
      }
    }
    
    // Only add product if it has required fields
    if (product.name && product.category && product.unit && product.supplier) {
      products.push(product);
    }
  }

  return products;
};

/**
 * Download CSV file
 */
export const downloadCsv = (csvString: string, filename: string = 'products.csv') => {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Parse CSV file to products array
 */
export const parseCsvFile = (file: File): Promise<Partial<AgrovetProduct>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvString = event.target?.result as string;
        const products = csvToProducts(csvString);
        resolve(products);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};