import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DollarSign, 
  Users, 
  Calendar, 
  CheckCircle, 
  Clock,
  FileText,
  Search,
  Filter
} from 'lucide-react';
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

interface PendingCollectionsSectionProps {
  collections: Collection[];
  markAsPaid: (collectionId: string, farmerId: string) => void;
  approveCollectionsForPayment: (farmerId: string, collectionIds: string[]) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
}

const PendingCollectionsSection: React.FC<PendingCollectionsSectionProps> = ({
  collections,
  markAsPaid,
  approveCollectionsForPayment,
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus
}) => {
  // Filter collections to show only pending ones (not paid)
  const pendingCollections = collections.filter(
    collection => collection.status !== 'Paid'
  );

  // Apply search and filter
  const filteredCollections = pendingCollections.filter(collection => {
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
                <option value="Pending">Pending</option>
                <option value="Collected">Collected</option>
                <option value="Verified">Verified</option>
                <option value="Approved">Approved</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Collections Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            Pending Farmer Collections
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Collections awaiting payment processing
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
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCollections.map((collection) => (
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          collection.status === 'Paid' ? 'bg-green-100 text-green-800' :
                          collection.status === 'Verified' ? 'bg-blue-100 text-blue-800' :
                          collection.status === 'Collected' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {collection.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {collection.approved_for_payment ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            No
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!collection.approved_for_payment && (
                            <Button
                              size="sm"
                              onClick={() => approveCollectionsForPayment(
                                collection.farmer_id, 
                                [collection.id]
                              )}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Approve
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => markAsPaid(collection.id, collection.farmer_id)}
                            disabled={!collection.approved_for_payment || collection.status === 'Paid'}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
                          >
                            Mark Paid
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No pending collections found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingCollectionsSection;