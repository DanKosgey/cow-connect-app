import React from 'react';
import { Card } from '@/components/ui/card';
import {
  Bot,
  FileCheck,
  Users,
  Milk,
  ChartBar,
  Shield,
  MessageSquare,
  ClipboardCheck,
  Bell,
  Upload,
  DollarSign,
  BarChart3,
} from 'lucide-react';

export default function Features() {
  const features = [
    {
      title: 'AI-Powered Intelligence',
      description: 'Advanced AI assistance for dairy management and decision making',
      icon: Bot,
      category: 'Technology',
    },
    {
      title: 'Task Management',
      description: 'Complete workflow for task creation, approval, and evidence submission',
      icon: ClipboardCheck,
      category: 'Operations',
    },
    {
      title: 'Staff Portal',
      description: 'Dedicated portal for staff with task management and communication tools',
      icon: Users,
      category: 'Staff Management',
    },
    {
      title: 'Collections Tracking',
      description: 'Efficient milk collection and quality control system',
      icon: Milk,
      category: 'Operations',
    },
    {
      title: 'Real-time Analytics',
      description: 'Comprehensive analytics and reporting dashboard',
      icon: ChartBar,
      category: 'Analytics',
    },
    {
      title: 'KYC Management',
      description: 'Secure farmer verification and documentation system',
      icon: Shield,
      category: 'Security',
    },
    {
      title: 'Real-time Chat',
      description: 'Instant communication between staff and management',
      icon: MessageSquare,
      category: 'Communication',
    },
    {
      title: 'Evidence Management',
      description: 'File upload and evidence tracking for tasks and operations',
      icon: FileCheck,
      category: 'Operations',
    },
    {
      title: 'Notifications',
      description: 'Real-time alerts and notifications for important updates',
      icon: Bell,
      category: 'Communication',
    },
    {
      title: 'File Management',
      description: 'Secure file upload and storage system',
      icon: Upload,
      category: 'Technology',
    },
    {
      title: 'Payment Processing',
      description: 'Integrated payment system for farmers and staff',
      icon: DollarSign,
      category: 'Finance',
    },
    {
      title: 'Performance Metrics',
      description: 'Staff and operations performance tracking',
      icon: BarChart3,
      category: 'Analytics',
    },
  ];

  const categories = [...new Set(features.map(feature => feature.category))];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          DairyChain Pro Features
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Discover our comprehensive suite of tools designed to revolutionize dairy management
        </p>
      </div>

      {categories.map(category => (
        <div key={category} className="mb-16">
          <h2 className="text-2xl font-semibold text-gray-800 mb-8 border-b pb-2">
            {category}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features
              .filter(feature => feature.category === category)
              .map(feature => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="p-3 bg-green-100 rounded-lg">
                          <Icon className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
