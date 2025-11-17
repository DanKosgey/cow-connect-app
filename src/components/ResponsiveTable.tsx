import React, { ReactNode } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { useScreenSize } from '@/utils/responsive';

interface ColumnDefinition<T> {
  key: string;
  title: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  getKey: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
}

const ResponsiveTable = <T,>({
  data,
  columns,
  getKey,
  onRowClick,
  emptyMessage = 'No data available',
  className = ''
}: ResponsiveTableProps<T>) => {
  const screenSize = useScreenSize();
  const isMobile = screenSize === 'xs' || screenSize === 'sm';

  if (isMobile) {
    // Mobile view - card-based layout
    return (
      <div className={`space-y-4 ${className}`}>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          data.map((item) => (
            <Card 
              key={getKey(item)} 
              className={`cursor-pointer hover:shadow-md transition-shadow ${onRowClick ? 'hover:bg-accent' : ''}`}
              onClick={() => onRowClick?.(item)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {columns.map((column) => (
                    <div key={column.key} className="flex justify-between items-start">
                      <div className="font-medium text-sm text-muted-foreground">
                        {column.title}:
                      </div>
                      <div className="text-right max-w-[60%]">
                        {column.render ? column.render(item) : (item as any)[column.key]}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  }

  // Desktop view - traditional table
  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow 
                key={getKey(item)} 
                className={onRowClick ? 'cursor-pointer hover:bg-accent' : ''}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.render ? column.render(item) : (item as any)[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default ResponsiveTable;