import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Filter, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Collection {
  id: string;
  farmer_id: string;
  collection_id: string;
  collection_date: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  status: string;
  approved_for_payment?: boolean;
  approved_at?: string;
  approved_by?: string;
  staff_id?: string;
  created_at: string;
  updated_at: string;
  credit_used?: number;
  collection_payments?: {
    credit_used?: number;
    net_payment?: number;
    collector_fee?: number;
  }[];
  farmers: {
    id: string;
    user_id: string;
    bank_account_name: string;
    bank_account_number: string;
    bank_name: string;
    profiles: {
      full_name: string;
      phone: string;
      id: string;
    };
  };
}

interface PaidCollectionsSectionProps {
  collections: Collection[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
}

const PaidCollectionsSection: React.FC<PaidCollectionsSectionProps> = ({
  collections,
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus
}) => {
  // Filter collections to show only paid ones
  const paidCollections = collections.filter(
    collection => collection.status === 'Paid'
  );

  // Apply search and filter
  const filteredCollections = paidCollections.filter(collection => {
    const matchesSearch = searchTerm 
      ? collection.farmers?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        collection.collection_id?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    
    const matchesStatus = filterStatus !== 'all' 
      ? collection.status === filterStatus 
      : true;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            Search and Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Collections
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by farmer name or collection ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status Filter
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paid Collections Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Paid Farmer Collections
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Collections that have been successfully paid
          </p>
        </CardHeader>
        <CardContent>
          {filteredCollections.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Collection ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Liters</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Credit Used</TableHead>
                    <TableHead>Collector Fee</TableHead>
                    <TableHead>Net Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCollections.map((collection) => {
                    const paymentInfo = collection.collection_payments?.[0] || {};
                    return (
                      <TableRow key={collection.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="font-medium">
                            {collection.farmers?.profiles?.full_name || 'Unknown Farmer'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {collection.farmers?.profiles?.phone || 'No phone'}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {collection.collection_id}
                        </TableCell>
                        <TableCell>
                          {new Date(collection.collection_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {collection.liters.toFixed(2)}L
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(collection.total_amount)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(paymentInfo.credit_used || 0)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(paymentInfo.collector_fee || 0)}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(paymentInfo.net_payment || collection.total_amount)}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Paid
                          </span>
                        </TableCell>
                        <TableCell>
                          {collection.updated_at 
                            ? new Date(collection.updated_at).toLocaleDateString() 
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No paid collections found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaidCollectionsSection;