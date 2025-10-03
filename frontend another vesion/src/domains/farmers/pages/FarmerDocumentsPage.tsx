import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Trash2, 
  CheckCircle,
  AlertCircle,
  Clock,
  File
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: Date;
  status: 'pending' | 'approved' | 'rejected';
}

const FarmerDocumentsPage = () => {
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      name: 'National ID Front',
      type: 'image/jpeg',
      size: '2.4 MB',
      uploadDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      status: 'approved'
    },
    {
      id: '2',
      name: 'National ID Back',
      type: 'image/jpeg',
      size: '1.8 MB',
      uploadDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      status: 'approved'
    },
    {
      id: '3',
      name: 'Farm Registration Certificate',
      type: 'application/pdf',
      size: '1.2 MB',
      uploadDate: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      status: 'pending'
    },
    {
      id: '4',
      name: 'Veterinary Health Certificate',
      type: 'application/pdf',
      size: '850 KB',
      uploadDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 1 week ago
      status: 'rejected'
    }
  ]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          
          // Add the new document
          const newDocument: Document = {
            id: (documents.length + 1).toString(),
            name: file.name,
            type: file.type,
            size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
            uploadDate: new Date(),
            status: 'pending'
          };
          
          setDocuments(prevDocs => [newDocument, ...prevDocs]);
          return 0;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleDeleteDocument = (id: string) => {
    const confirmed = confirm('Are you sure you want to delete this document?');
    if (confirmed) {
      setDocuments(documents.filter(doc => doc.id !== id));
    }
  };

  const handleDownloadDocument = (id: string) => {
    // Simulate download
    alert(`Downloading document ${id}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Pending Review';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
  };

  const requiredDocuments = [
    {
      name: 'National ID',
      description: 'Front and back copies of your national identification card',
      status: 'completed'
    },
    {
      name: 'Farm Registration',
      description: 'Official farm registration certificate from local authorities',
      status: 'pending'
    },
    {
      name: 'Veterinary Certificate',
      description: 'Health certificate for your livestock from a licensed veterinarian',
      status: 'pending'
    },
    {
      name: 'Bank Account Details',
      description: 'Proof of bank account for payment processing',
      status: 'pending'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Upload and manage your farm documents</p>
        </div>

        {/* Required Documents */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-green-600" />
              Required Documents
            </CardTitle>
            <CardDescription>
              Please ensure all required documents are uploaded and approved
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {requiredDocuments.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{doc.name}</h3>
                    <p className="text-sm text-gray-600">{doc.description}</p>
                  </div>
                  <div className="flex items-center">
                    {doc.status === 'completed' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="h-4 w-4 mr-1" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2 text-green-600" />
              Upload New Document
            </CardTitle>
            <CardDescription>
              Upload documents related to your farm and dairy operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isUploading ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <File className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Uploading Document</h3>
                <p className="text-gray-600 mb-4">Please wait while we process your document</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-green-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 mt-2">{uploadProgress}% Complete</p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload a document</h3>
                <p className="text-gray-600 mb-4">
                  Drag and drop files here or click to browse your device
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Supported formats: PDF, JPG, PNG. Max file size: 10MB
                </p>
                <label className="cursor-pointer">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Upload className="h-4 w-4 mr-2" />
                    Select Files
                  </Button>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileUpload}
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                  />
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Uploaded Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <File className="h-5 w-5 mr-2 text-green-600" />
              Uploaded Documents
            </CardTitle>
            <CardDescription>
              Manage your uploaded documents and track their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No documents uploaded</h3>
                <p className="text-gray-500">
                  Upload your first document to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((document) => (
                  <div key={document.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="bg-gray-100 p-3 rounded-lg mr-4">
                        <FileText className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{document.name}</h3>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <span>{document.type}</span>
                          <span className="mx-2">•</span>
                          <span>{document.size}</span>
                          <span className="mx-2">•</span>
                          <span>{document.uploadDate.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(document.status)}`}>
                        {getStatusIcon(document.status)}
                        <span className="ml-1">{getStatusText(document.status)}</span>
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDownloadDocument(document.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteDocument(document.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FarmerDocumentsPage;