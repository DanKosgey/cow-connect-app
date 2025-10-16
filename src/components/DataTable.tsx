import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface DataTableProps {
  headers: string[];
  data: any[];
  renderRow: (item: any, index: number) => ReactNode;
  emptyMessage?: string;
  className?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export const DataTable = ({ 
  headers, 
  data, 
  renderRow, 
  emptyMessage = "No data found", 
  className = "",
  pagination
}: DataTableProps) => {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            {headers.map((header, index) => (
              <th 
                key={index} 
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => renderRow(item, index))
          )}
        </tbody>
      </table>
      
      {pagination && data.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {data.length} records
          </p>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => pagination.onPageChange(Math.max(1, pagination.currentPage - 1))}
              disabled={pagination.currentPage === 1}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.currentPage + 1))}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};