import { useState, useEffect } from 'react';
import { TaskCard } from '@/components/TaskCard';
import { NewTaskForm } from '@/components/NewTaskForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Task, TaskStatus } from '@/types/task';
import { useAuth } from '@/contexts/AuthContext';
import apiService from '@/services/ApiService';
import { logger } from '@/lib/logger';

// Remove the dummyTasks array and replace with real API calls

export default function TasksPage() {
  const { user } = useAuth();
  const [userRole] = useState<'staff' | 'admin'>(() => {
    // Determine role based on user data
    return user?.is_admin ? 'admin' : 'staff';
  });
  const [activeTab, setActiveTab] = useState<TaskStatus>('pending');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch tasks based on role and status
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        // In a real implementation, you would fetch tasks from your API
        // For now, we'll use an empty array and simulate loading
        logger.info(`Fetching tasks for user role: ${userRole}, status: ${activeTab}`);
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        // Return empty array for now - in a real implementation, this would come from the API
        setTasks([]);
      } catch (error) {
        logger.error('Error fetching tasks:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch tasks. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [userRole, activeTab, toast]);

  const handleTaskAction = async (action: string, task: Task) => {
    try {
      // In a real implementation, you would call your API to update the task
      logger.info(`Performing action ${action} on task ${task.id}`);
      toast({
        title: 'Success',
        description: `Task ${action} successfully.`,
      });
    } catch (error) {
      logger.error(`Error performing action ${action} on task:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action} task. Please try again.`,
        variant: 'destructive',
      });
    }
  };

  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'evidenceUrls'>) => {
    try {
      // In a real implementation, you would call your API to create the task
      logger.info('Creating new task:', taskData);
      toast({
        title: 'Success',
        description: 'Task created successfully.',
      });
    } catch (error) {
      logger.error('Error creating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to create task. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Task Management</h1>
          <p className="text-gray-600">Manage and track your dairy farm tasks</p>
        </div>
        <NewTaskForm onSubmit={handleCreateTask} />
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TaskStatus)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="evidence_submitted">Evidence Submitted</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{activeTab.replace('_', ' ').toUpperCase()} Tasks</CardTitle>
              <CardDescription>Manage your {activeTab.replace('_', ' ')} tasks</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No tasks found</p>
                  <Button 
                    onClick={() => setActiveTab('pending')} 
                    variant="outline" 
                    className="mt-4"
                  >
                    View Pending Tasks
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      userRole={userRole}
                      onActionClick={handleTaskAction}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}