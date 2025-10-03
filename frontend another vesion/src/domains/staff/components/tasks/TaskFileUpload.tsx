import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { UploadCloud, X, FileImage, File } from 'lucide-react';

interface TaskFileUploadProps {
  onUpload: (files: File[]) => Promise<void>;
}

export function TaskFileUpload({ onUpload }: TaskFileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
      
      // Generate previews for images
      newFiles.forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreview(prev => [...prev, reader.result as string]);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    try {
      await onUpload(files);
      setFiles([]);
      setPreview([]);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreview(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Upload Evidence</Label>
          {files.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFiles([]);
                setPreview([]);
              }}
            >
              Clear All
            </Button>
          )}
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="flex flex-col items-center justify-center space-y-2">
            <UploadCloud className="h-8 w-8 text-gray-400" />
            <div className="text-center">
              <Label
                htmlFor="file-upload"
                className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80"
              >
                <span>Click to upload</span>
                <Input
                  id="file-upload"
                  type="file"
                  className="sr-only"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                />
              </Label>
              <p className="text-xs text-gray-500">
                Images, PDFs, or Documents up to 10MB each
              </p>
            </div>
          </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Files</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="relative group border rounded-lg p-2"
                >
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute -right-2 -top-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {file.type.startsWith('image/') ? (
                    <div className="relative aspect-square">
                      <img
                        src={preview[index]}
                        alt={file.name}
                        className="absolute inset-0 w-full h-full object-cover rounded"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center aspect-square bg-gray-100 rounded">
                      {file.name.endsWith('.pdf') ? (
                        <File className="h-8 w-8 text-red-500" />
                      ) : (
                        <FileImage className="h-8 w-8 text-blue-500" />
                      )}
                    </div>
                  )}
                  <p className="mt-1 text-xs truncate">{file.name}</p>
                </div>
              ))}
            </div>

            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full mt-4"
            >
              {uploading ? 'Uploading...' : 'Upload Files'}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
