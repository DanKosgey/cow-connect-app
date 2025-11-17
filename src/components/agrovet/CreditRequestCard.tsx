import React, { useState } from 'react';
import { User, CheckCircle, AlertCircle, Clock, Package, Calendar, CreditCard, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatCurrency } from '@/utils/formatters';

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
    rejection_reason?: string;
    available_credit_at_request?: number;
    credit_profile?: {
      max_credit_amount: number;
      current_credit_balance: number;
    };
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
  const [showDetails, setShowDetails] = useState(false);

  const handleDisburse = () => {
    // Check if farmer has enough credit
    if (request.available_credit_at_request !== undefined && 
        request.available_credit_at_request < request.total_amount) {
      if (window.confirm('Warning: Farmer may not have enough credit. Do you want to proceed anyway?')) {
        onDisburse(request.id);
      }
    } else {
      onDisburse(request.id);
    }
  };

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
            <Badge className={`${getStatusColor(request.status)} capitalize`}>
              <div className="flex items-center gap-1">
                {getStatusIcon(request.status)}
                <span>{request.status}</span>
              </div>
            </Badge>
            <p className="text-xs text-gray-500 mt-2">
              {new Date(request.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">Product</p>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-500" />
              <p className="font-semibold text-gray-800">{request.products.name}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Quantity</p>
            <p className="font-semibold text-gray-800">{request.quantity} {request.products.unit}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Unit Price</p>
            <p className="font-semibold text-gray-800">{formatCurrency(request.unit_price)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="font-semibold text-green-600 text-lg">{formatCurrency(request.total_amount)}</p>
          </div>
        </div>

        {request.available_credit_at_request !== undefined && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-blue-800">Available Credit at Request:</p>
              <p className={`text-sm font-semibold ${request.available_credit_at_request >= request.total_amount ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(request.available_credit_at_request)}
              </p>
            </div>
            {request.available_credit_at_request < request.total_amount && (
              <div className="flex items-center gap-1 mt-1 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs">Insufficient credit</span>
              </div>
            )}
          </div>
        )}

        {request.notes && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-800">Notes:</p>
            <p className="text-sm text-blue-700">{request.notes}</p>
          </div>
        )}

        {request.status === 'disbursed' && request.processed_at && (
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex justify-between">
              <p className="text-sm text-green-800">
                <span className="font-medium">Disbursed on:</span> {new Date(request.processed_at).toLocaleString()}
              </p>
              {request.processed_by && (
                <p className="text-sm text-green-800">
                  <span className="font-medium">By:</span> {request.processed_by}
                </p>
              )}
            </div>
          </div>
        )}

        {request.status === 'rejected' && request.processed_at && (
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="flex justify-between">
              <p className="text-sm text-red-800">
                <span className="font-medium">Rejected on:</span> {new Date(request.processed_at).toLocaleString()}
              </p>
              {request.rejection_reason && (
                <p className="text-sm text-red-800">
                  <span className="font-medium">Reason:</span> {request.rejection_reason}
                </p>
              )}
            </div>
          </div>
        )}

        {request.status === 'pending' && (
          <div className="flex space-x-3 mt-4">
            <Button
              onClick={handleDisburse}
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
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Details
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Credit Request Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Farmer</p>
                      <p className="font-semibold">{request.farmers.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-semibold">{request.farmers.phone_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Product</p>
                      <p className="font-semibold">{request.products.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Quantity</p>
                      <p className="font-semibold">{request.quantity} {request.products.unit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Unit Price</p>
                      <p className="font-semibold">{formatCurrency(request.unit_price)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="font-semibold text-green-600">{formatCurrency(request.total_amount)}</p>
                    </div>
                  </div>
                  
                  {request.available_credit_at_request !== undefined && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">Credit Information</p>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <p className="text-sm text-gray-600">Available at Request</p>
                          <p className={`font-semibold ${request.available_credit_at_request >= request.total_amount ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(request.available_credit_at_request)}
                          </p>
                        </div>
                        {request.credit_profile && (
                          <>
                            <div>
                              <p className="text-sm text-gray-600">Credit Limit</p>
                              <p className="font-semibold">{formatCurrency(request.credit_profile.max_credit_amount)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Current Balance</p>
                              <p className="font-semibold">{formatCurrency(request.credit_profile.current_credit_balance)}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {request.notes && (
                    <div>
                      <p className="text-sm text-gray-600">Notes</p>
                      <p className="font-semibold">{request.notes}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm text-gray-600">Requested On</p>
                    <p className="font-semibold">{new Date(request.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </Card>
  );
};

export default CreditRequestCard;