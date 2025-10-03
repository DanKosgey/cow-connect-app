export type TaskStatus = 'pending' | 'approved' | 'in_progress' | 'evidence_submitted' | 'completed' | 'rejected';

export interface Task {
  id: string;
  title: string;
  description: string;
  location: string;
  budget: number;
  status: TaskStatus;
  createdBy: string;
  approvedBy?: string;
  evidenceUrls: string[];
  createdAt: string;
  updatedAt: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  deadline?: string;
  comments?: TaskComment[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userRole: 'staff' | 'admin';
  content: string;
  createdAt: string;
}

export interface TaskEvidence {
  id: string;
  taskId: string;
  fileUrl: string;
  fileType: string;
  uploadedBy: string;
  uploadedAt: string;
  description?: string;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  status: TaskStatus;
  changedBy: string;
  changedAt: string;
  comment?: string;
}

export interface TaskFormData {
  title: string;
  description: string;
  location: string;
  budget: number;
}
