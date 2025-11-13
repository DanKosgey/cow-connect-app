import React from 'react';
import { User, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CreditRequestCardProps {
  request: {
    id: string;
    farmer_id: string;
    farmers: {
      full_name: string;
      phone_number: string;
    };
    products: {
      name: string;
      unit: string;
    };
    quantity: number;
    unit_price: number;
    total_amount: number;
    status: string;
    notes?: string;
    created_at: string;
    processed_by?: string;
    processed_at?: string;
  };
  onDisburse: (id: string) => void;
  onReject: (id: string) => void;
  getStatusColor: (status: string) => string;
}

const getStatusIcon = (status: string) => {
  switch(status) {
    case 'pending': return <Clock className="w-4 h-4" />;
    case 'disbursed': return <CheckCircle className="w-4 h-4" />;
    case 'rejected': return <AlertCircle className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

const CreditRequestCard: React.FC<CreditRequestCardProps> = ({
  request,
  onDisburse,
  onReject,
  getStatusColor
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start space-x-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <User className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{request.farmers.full_name}</h3>
              <p className="text-sm text-gray-600">Farmer ID: {request.farmer_id}</p>
              <p className="text-sm text-gray-600">Phone: {request.farmers.phone_number}</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
              {getStatusIcon(request.status)}
              <span className="capitalize">{request.status}</span>
            </span>
            <p className="text-xs text-gray-500 mt-2">
              {new Date(request.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">Product</p>
            <p className="font-semibold text-gray-800">{request.products.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Quantity</p>
            <p className="font-semibold text-gray-800">{request.quantity} {request.products.unit}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Unit Price</p>
            <p className="font-semibold text-gray-800">KES {request.unit_price.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="font-semibold text-green-600 text-lg">KES {request.total_amount.toLocaleString()}</p>
          </div>
        </div>

        {request.notes && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-800">Notes:</p>
            <p className="text-sm text-blue-700">{request.notes}</p>
          </div>
        )}

        {request.status === 'disbursed' && request.processed_at && (
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              <span className="font-medium">Disbursed on:</span> {new Date(request.processed_at).toLocaleString()}
            </p>
          </div>
        )}

        {request.status === 'rejected' && request.processed_at && (
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-red-800">
              <span className="font-medium">Rejected on:</span> {new Date(request.processed_at).toLocaleString()}
            </p>
          </div>
        )}

        {request.status === 'pending' && (
          <div className="flex space-x-3 mt-4">
            <Button
              onClick={() => onDisburse(request.id)}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Disburse Product
            </Button>
            <Button
              onClick={() => onReject(request.id)}
              variant="destructive"
              className="flex-1"
            >
              <AlertCircle className="w-5 h-5 mr-2" />
              Reject Request
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default CreditRequestCard;