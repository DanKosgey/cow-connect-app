import axios from 'axios';
import { Task } from '@/types/task';

const API_URL = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// Add auth headers to all requests
axios.interceptors.request.use((config) => {
  // Get token from localStorage
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export const TasksAPI = {
  // Get tasks with optional status filter
  getTasks: async (status?: string) => {
    const params = status ? { status } : {};
    const response = await axios.get(`${API_URL}/api/tasks`, { params });
    return response.data;
  },

  // Create a new task
  createTask: async (taskData: Partial<Task>) => {
    const response = await axios.post(`${API_URL}/api/tasks`, taskData);
    return response.data;
  },

  // Update a task
  updateTask: async (taskId: string, updates: Partial<Task>) => {
    const response = await axios.put(`${API_URL}/api/tasks/${taskId}`, updates);
    return response.data;
  },

  // Add a comment to a task
  addComment: async (taskId: string, content: string) => {
    const response = await axios.post(`${API_URL}/api/tasks/${taskId}/comments`, { content });
    return response.data;
  }
};
