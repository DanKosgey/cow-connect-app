import React, { useState } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { TaskFormData } from '@/types/task';

interface NewTaskFormProps {
  onSubmit: (data: TaskFormData) => void;
  isLoading?: boolean;
}

export function NewTaskForm({ onSubmit, isLoading = false }: NewTaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    location: '',
    budget: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'budget' ? parseFloat(value) || 0 : value
    }));
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Create New Task Request</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            name="title"
            placeholder="Task Title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <Textarea
            name="description"
            placeholder="Describe what needs to be done..."
            value={formData.description}
            onChange={handleChange}
            required
            className="min-h-[100px]"
          />
        </div>

        <div>
          <Input
            name="location"
            placeholder="Location"
            value={formData.location}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <Input
            name="budget"
            type="number"
            min="0"
            step="0.01"
            placeholder="Budget Amount"
            value={formData.budget || ''}
            onChange={handleChange}
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Submitting...' : 'Submit Task Request'}
        </Button>
      </form>
    </Card>
  );
}
