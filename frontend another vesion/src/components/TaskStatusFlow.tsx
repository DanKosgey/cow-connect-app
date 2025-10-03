import React from 'react';
import { Check, Clock, FileCheck, ThumbsUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskStatus } from '@/types/task';

interface TaskStatusFlowProps {
  currentStatus: TaskStatus;
}

const statusSteps = [
  { status: 'pending', label: 'Pending Approval', icon: Clock },
  { status: 'approved', label: 'Approved', icon: ThumbsUp },
  { status: 'in_progress', label: 'In Progress', icon: AlertCircle },
  { status: 'evidence_submitted', label: 'Evidence Submitted', icon: FileCheck },
  { status: 'completed', label: 'Completed', icon: Check },
];

export function TaskStatusFlow({ currentStatus }: TaskStatusFlowProps) {
  const currentStepIndex = statusSteps.findIndex(step => step.status === currentStatus);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {statusSteps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index <= currentStepIndex;
          const isCurrentStep = step.status === currentStatus;

          return (
            <React.Fragment key={step.status}>
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                    isActive
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-400',
                    isCurrentStep && 'ring-4 ring-green-100'
                  )}
                >
                  <StepIcon className="w-5 h-5" />
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs text-center max-w-[80px]',
                    isActive ? 'text-green-600 font-medium' : 'text-gray-400'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < statusSteps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 transition-colors',
                    index < currentStepIndex
                      ? 'bg-green-600'
                      : 'bg-gray-200'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
