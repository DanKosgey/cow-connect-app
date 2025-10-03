import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

const TaskMarketplace = () => {
  const availableTasks = [
    {
      id: 1,
      title: 'Quality Assurance Audit',
      reward: 500,
      deadline: '24h',
      priority: 'High',
      skills: ['Quality Control', 'Documentation'],
      description: 'Conduct comprehensive quality audit of dairy processing units.'
    },
    {
      id: 2,
      title: 'Supply Chain Optimization',
      reward: 800,
      deadline: '48h',
      priority: 'Urgent',
      skills: ['Logistics', 'Analysis'],
      description: 'Analyze and optimize milk collection routes for maximum efficiency.'
    },
    {
      id: 3,
      title: 'Equipment Maintenance Review',
      reward: 600,
      deadline: '36h',
      priority: 'Medium',
      skills: ['Technical', 'Maintenance'],
      description: 'Review and document maintenance procedures for processing equipment.'
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Task Marketplace</h2>
        <div className="space-x-2">          <Badge variant="secondary" className="text-lg">
            Available Balance: $2,450
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {availableTasks.map((task) => (
          <Card key={task.id} className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold mb-2">{task.title}</h3>
                <p className="text-gray-600 mb-4">{task.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {task.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary-600">
                  ${task.reward}
                </div>
                <Badge 
                  variant={
                    task.priority === 'High' ? 'destructive' : 
                    task.priority === 'Urgent' ? 'destructive' : 
                    'default'
                  }
                  className="mt-2"
                >
                  {task.priority}
                </Badge>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                Deadline: {task.deadline}
              </div>
              <div className="space-x-2">
                <Button variant="outline">View Details</Button>
                <Button>Claim Task</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TaskMarketplace;
