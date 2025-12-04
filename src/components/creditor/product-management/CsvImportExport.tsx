import React, { useState } from 'react';
import { Upload, Download, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { AgrovetProduct } from '@/services/agrovet-inventory-service';
import { productsToCsv, parseCsvFile, downloadCsv } from '@/utils/csvUtils';
import { AgrovetInventoryService } from '@/services/agrovet-inventory-service';

interface CsvImportExportProps {
  products: AgrovetProduct[];
  onProductsImported: () => void;
}

const CsvImportExport: React.FC<CsvImportExportProps> = ({ products, onProductsImported }) => {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<Partial<AgrovetProduct>[]>([]);
  const [importStats, setImportStats] = useState<{ valid: number; invalid: number }>({ valid: 0, invalid: 0 });
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      previewImportFile(file);
    }
  };

  const previewImportFile = async (file: File) => {
    try {
      const products = await parseCsvFile(file);
      setImportPreview(products);
      
      // Calculate stats
      const valid = products.filter(p => p.name && p.category && p.unit && p.supplier).length;
      const invalid = products.length - valid;
      setImportStats({ valid, invalid });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse CSV file. Please check the file format.",
        variant: "destructive"
      });
      setImportFile(null);
    }
  };

  const handleImport = async () => {
    if (!importFile || importPreview.length === 0) return;
    
    setIsImporting(true);
    
    try {
      // Filter valid products
      const validProducts = importPreview.filter(p => p.name && p.category && p.unit && p.supplier);
      
      // Import products
      const importedProducts = [];
      for (const product of validProducts) {
        try {
          const importedProduct = await AgrovetInventoryService.createInventoryItem(product);
          importedProducts.push(importedProduct);
        } catch (error) {
          console.warn("Failed to import product:", product.name, error);
        }
      }
      
      toast({
        title: "Success",
        description: `Imported ${importedProducts.length} products successfully`
      });
      
      // Reset state
      setImportFile(null);
      setImportPreview([]);
      setImportStats({ valid: 0, invalid: 0 });
      setIsImportDialogOpen(false);
      onProductsImported();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import products",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = () => {
    try {
      const csvString = productsToCsv(products);
      downloadCsv(csvString, `products-${new Date().toISOString().slice(0, 10)}.csv`);
      
      toast({
        title: "Success",
        description: "Products exported successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export products",
        variant: "destructive"
      });
    }
  };

  const clearImportFile = () => {
    setImportFile(null);
    setImportPreview([]);
    setImportStats({ valid: 0, invalid: 0 });
  };

  return (
    <div className="flex gap-2">
      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Products</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import products. The file should contain columns for product details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <FileText className="w-12 h-12 mx-auto text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                {importFile ? importFile.name : "Drag and drop a CSV file here, or click to select"}
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label 
                htmlFor="csv-upload" 
                className="mt-2 inline-block px-4 py-2 bg-blue-50 text-blue-600 rounded-md cursor-pointer hover:bg-blue-100 transition-colors"
              >
                Select File
              </label>
              
              {importFile && (
                <div className="mt-2 flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-sm truncate">{importFile.name}</span>
                  <button 
                    onClick={clearImportFile}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            
            {importPreview.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900">Import Preview</h4>
                <div className="mt-2 text-sm text-gray-600">
                  <p>{importStats.valid} valid products</p>
                  {importStats.invalid > 0 && (
                    <p className="text-red-600">{importStats.invalid} invalid products will be skipped</p>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsImportDialogOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!importFile || isImporting || importStats.valid === 0}
            >
              {isImporting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Importing...
                </>
              ) : (
                `Import ${importStats.valid} Products`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Export Button */}
      <Button 
        variant="outline" 
        className="flex items-center gap-2"
        onClick={handleExport}
      >
        <Download className="w-4 h-4" />
        Export
      </Button>
    </div>
  );
};

export default CsvImportExport;