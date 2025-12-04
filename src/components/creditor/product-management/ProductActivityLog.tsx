import React, { useState } from 'react';
import { History, Package, CreditCard, Layers, Edit, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface ActivityLogEntry {
  id: string;
  productId: string;
  productName: string;
  action: 'created' | 'updated' | 'deleted' | 'stock_adjusted' | 'credit_toggled';
  details: string;
  timestamp: Date;
  userId: string;
  userName: string;
}

interface ProductActivityLogProps {
  productId: string;
  productName: string;
}

const ProductActivityLog: React.FC<ProductActivityLogProps> = ({ productId, productName }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Mock activity data - in a real app this would come from an API
  const mockActivityLogs: ActivityLogEntry[] = [
    {
      id: '1',
      productId,
      productName,
      action: 'created',
      details: 'Product created in inventory',
      timestamp: new Date(Date.now() - 86400000 * 3), // 3 days ago
      userId: 'user1',
      userName: 'Admin User'
    },
    {
      id: '2',
      productId,
      productName,
      action: 'stock_adjusted',
      details: 'Stock increased by 50 units (Received new shipment)',
      timestamp: new Date(Date.now() - 86400000 * 2), // 2 days ago
      userId: 'user2',
      userName: 'Inventory Manager'
    },
    {
      id: '3',
      productId,
      productName,
      action: 'credit_toggled',
      details: 'Credit eligibility enabled',
      timestamp: new Date(Date.now() - 86400000 * 1), // 1 day ago
      userId: 'user1',
      userName: 'Admin User'
    },
    {
      id: '4',
      productId,
      productName,
      action: 'updated',
      details: 'Updated selling price from KES 500 to KES 550',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      userId: 'user2',
      userName: 'Inventory Manager'
    }
  ];

  const getActionIcon = (action: ActivityLogEntry['action']) => {
    switch (action) {
      case 'created':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'updated':
        return <Edit className="w-4 h-4 text-blue-500" />;
      case 'deleted':
        return <Minus className="w-4 h-4 text-red-500" />;
      case 'stock_adjusted':
        return <Layers className="w-4 h-4 text-purple-500" />;
      case 'credit_toggled':
        return <CreditCard className="w-4 h-4 text-yellow-500" />;
      default:
        return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionText = (action: ActivityLogEntry['action']) => {
    switch (action) {
      case 'created':
        return 'Created';
      case 'updated':
        return 'Updated';
      case 'deleted':
        return 'Deleted';
      case 'stock_adjusted':
        return 'Stock Adjusted';
      case 'credit_toggled':
        return 'Credit Status Changed';
      default:
        return 'Activity';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <History className="w-4 h-4" />
          Activity Log
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Activity Log for {productName}</DialogTitle>
          <DialogDescription>
            View all activities related to this product
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {mockActivityLogs
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
              .map((log) => (
                <div 
                  key={log.id} 
                  className="flex gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 pt-1">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-gray-900">
                        {getActionText(log.action)}
                      </h4>
                      <span className="text-sm text-gray-500 whitespace-nowrap">
                        {format(log.timestamp, 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {log.details}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">
                        By {log.userName}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            
            {mockActivityLogs.length === 0 && (
              <div className="text-center py-8">
                <History className="w-12 h-12 mx-auto text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No activity yet</h3>
                <p className="mt-1 text-gray-500">
                  Activity logs for this product will appear here
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ProductActivityLog;