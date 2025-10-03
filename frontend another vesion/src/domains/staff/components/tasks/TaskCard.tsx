import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Task } from '@/types/task';
import { TaskStatusFlow } from './TaskStatusFlow';
import { TaskFileUpload } from './TaskFileUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import {
  Clock,
  MapPin,
  DollarSign,
  CheckCircle2,
  XCircle,
  FileImage,
  MessageCircle,
  AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TaskCardProps {
  task: Task;
  userRole: 'staff' | 'admin';
  onActionClick?: (action: 'approve' | 'reject' | 'start' | 'submit' | 'complete', task: Task) => void;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  evidence_submitted: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

export function TaskCard({ task, userRole, onActionClick }: TaskCardProps) {
  const [showFileUpload, setShowFileUpload] = useState(false);

  const handleFileUpload = async (files: File[]) => {
    // Here you would typically upload the files to your backend
    const mockUrls = files.map(file => URL.createObjectURL(file));
    onActionClick?.('submit', {
      ...task,
      evidenceUrls: [...task.evidenceUrls, ...mockUrls],
    });
    setShowFileUpload(false);
  };

  const getActionButtons = () => {
    if (userRole === 'admin') {
      switch (task.status) {
        case 'pending':
          return (
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => onActionClick?.('approve', task)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Approve & Fund
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onActionClick?.('reject', task)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          );
        case 'approved':
          return (
            <Button
              variant="default"
              size="sm"
              onClick={() => onActionClick?.('start', task)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Start Task
            </Button>
          );
        case 'evidence_submitted':
          return (
            <Button
              variant="success"
              size="sm"
              onClick={() => onActionClick?.('complete', task)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Complete & Pay
            </Button>
          );
        default:
          return null;
      }
    } else if (userRole === 'staff' && task.status === 'in_progress') {
      return (
        <Dialog open={showFileUpload} onOpenChange={setShowFileUpload}>
          <DialogTrigger asChild>
            <Button
              variant="default"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FileImage className="w-4 h-4 mr-1" />
              Submit Evidence
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Task Evidence</DialogTitle>
            </DialogHeader>
            <TaskFileUpload onUpload={handleFileUpload} />
          </DialogContent>
        </Dialog>
      );
    }
    return null;
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold">{task.title}</h3>
            <p className="text-gray-600 mt-1">{task.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={statusColors[task.status]}>
              {task.status.replace('_', ' ').toUpperCase()}
            </Badge>
            {task.priority && (
              <Badge className={priorityColors[task.priority]}>
                {task.priority.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        {/* Status Flow */}
        <TaskStatusFlow currentStatus={task.status} />

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            {task.location}
          </div>
          <div className="flex items-center text-gray-600">
            <DollarSign className="w-4 h-4 mr-2" />
            Ksh {task.budget.toLocaleString()}
          </div>
          {task.deadline && (
            <div className="flex items-center text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              Due: {formatDistanceToNow(new Date(task.deadline), { addSuffix: true })}
            </div>
          )}
          {task.comments && (
            <div className="flex items-center text-gray-600">
              <MessageCircle className="w-4 h-4 mr-2" />
              {task.comments.length} comments
            </div>
          )}
        </div>

        {/* Evidence Preview */}
        {task.evidenceUrls.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Evidence</h4>
            <div className="grid grid-cols-4 gap-2">
              {task.evidenceUrls.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Evidence ${index + 1}`}
                  className="h-20 w-20 object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
          </div>
          {getActionButtons()}
        </div>
      </div>
    </Card>
  );
}
