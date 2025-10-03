import { type WorkflowDefinition, type WorkflowAction, type WorkflowTrigger } from './workflow-definitions';
import { type NotificationType } from '../types/farmer.types';

export class WorkflowError extends Error {
  constructor(
    message: string,
    public workflowName: string,
    public actionName: string,
    public context: Record<string, any>
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

export class WorkflowService {
  private static instance: WorkflowService;
  private actionHandlers: Map<string, (action: WorkflowAction, context: any) => Promise<void>>;
  private validationHandlers: Map<string, (value: any, rule: any) => boolean>;
  private activeWorkflows: Map<string, Set<string>>;

  private constructor() {
    this.actionHandlers = new Map();
    this.validationHandlers = new Map();
    this.activeWorkflows = new Map();
    this.registerDefaultHandlers();
  }

  static getInstance(): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService();
    }
    return WorkflowService.instance;
  }

  private registerDefaultHandlers() {
    // Register action handlers
    this.actionHandlers.set('notification', async (action, context) => {
      const { type, title, priority } = action.data;
      // Integration point: Notification service
      await this.queueNotification({
        type: type as NotificationType,
        target: action.target,
        title,
        priority,
        context
      });
    });

    this.actionHandlers.set('status_update', async (action, context) => {
      const { status } = action.data;
      // Integration point: Database service
      await this.updateEntityStatus(action.target, context.id, status);
    });

    // Register validation handlers
    this.validationHandlers.set('fileType', (value, allowed) => {
      const extension = value.toLowerCase().split('.').pop();
      return allowed.includes(extension);
    });

    this.validationHandlers.set('fileSize', (size, maxSize) => {
      return size <= maxSize;
    });
  }

  async startWorkflow(
    workflow: WorkflowDefinition,
    context: Record<string, any>
  ): Promise<void> {
    const workflowId = `${workflow.name}-${Date.now()}`;
    
    try {
      // Check if workflow can start
      if (!this.canTriggerWorkflow(workflow.trigger, context)) {
        throw new WorkflowError(
          'Workflow trigger conditions not met',
          workflow.name,
          'trigger',
          context
        );
      }

      // Start workflow tracking
      this.trackWorkflow(workflowId, workflow.name);

      // Run validations if any
      if (workflow.validations) {
        const validationErrors = await this.runValidations(
          workflow.validations,
          context
        );
        if (validationErrors.length > 0) {
          throw new WorkflowError(
            'Validation failed: ' + validationErrors.join(', '),
            workflow.name,
            'validation',
            context
          );
        }
      }

      // Execute actions
      for (const action of workflow.actions) {
        await this.executeAction(action, context, workflow);
      }

      // Set up SLA monitoring if defined
      if (workflow.sla) {
        this.monitorSLA(workflow, workflowId, context);
      }
    } catch (error) {
      // Handle errors based on workflow definition
      await this.handleWorkflowError(error as Error, workflow, context);
    } finally {
      // Clean up workflow tracking
      this.completeWorkflow(workflowId, workflow.name);
    }
  }

  private canTriggerWorkflow(trigger: WorkflowTrigger, context: any): boolean {
    return Object.entries(trigger.conditions).every(
      ([key, value]) => context[key] === value
    );
  }

  private async runValidations(validations: any[], context: any): Promise<string[]> {
    const errors: string[] = [];
    
    for (const validation of validations) {
      for (const rule of validation.rules) {
        const handler = this.validationHandlers.get(rule.type);
        if (handler) {
          const isValid = handler(context[validation.field], rule.value);
          if (!isValid) {
            errors.push(rule.message);
          }
        }
      }
    }
    
    return errors;
  }

  private async executeAction(
    action: WorkflowAction,
    context: any,
    workflow: WorkflowDefinition
  ): Promise<void> {
    const handler = this.actionHandlers.get(action.type);
    if (!handler) {
      throw new WorkflowError(
        `No handler registered for action type: ${action.type}`,
        workflow.name,
        action.type,
        context
      );
    }

    try {
      await handler(action, context);
    } catch (error) {
      throw new WorkflowError(
        `Action execution failed: ${(error as Error).message}`,
        workflow.name,
        action.type,
        context
      );
    }
  }

  private trackWorkflow(workflowId: string, workflowName: string): void {
    if (!this.activeWorkflows.has(workflowName)) {
      this.activeWorkflows.set(workflowName, new Set());
    }
    this.activeWorkflows.get(workflowName)?.add(workflowId);
  }

  private completeWorkflow(workflowId: string, workflowName: string): void {
    this.activeWorkflows.get(workflowName)?.delete(workflowId);
  }

  private async handleWorkflowError(
    error: Error,
    workflow: WorkflowDefinition,
    context: any
  ): Promise<void> {
    if (workflow.errorHandling) {
      const { retryCount, retryDelay, fallbackAction } = workflow.errorHandling;
      
      // Implement retry logic
      if (retryCount > 0) {
        // Integration point: Queue service
        await this.queueRetry(workflow, context, {
          remainingRetries: retryCount,
          delay: retryDelay
        });
      }

      // Execute fallback action if defined
      if (fallbackAction) {
        await this.executeAction(fallbackAction, context, workflow);
      }
    }

    // Log the error
    console.error('Workflow error:', {
      workflow: workflow.name,
      error: error.message,
      context
    });
  }

  private monitorSLA(
    workflow: WorkflowDefinition,
    workflowId: string,
    context: any
  ): void {
    if (!workflow.sla) return;

    const { duration, escalationAction } = workflow.sla;
    
    // Set up SLA timer
    setTimeout(async () => {
      // Check if workflow is still active
      if (this.activeWorkflows.get(workflow.name)?.has(workflowId)) {
        // Execute escalation action
        await this.executeAction(escalationAction, context, workflow);
      }
    }, duration * 3600 * 1000); // Convert hours to milliseconds
  }

  // Integration point stubs
  private async queueNotification(notification: any): Promise<void> {
    // Integration with notification service
  }

  private async updateEntityStatus(
    entity: string,
    id: string,
    status: string
  ): Promise<void> {
    // Integration with database service
  }

  private async queueRetry(
    workflow: WorkflowDefinition,
    context: any,
    retryConfig: { remainingRetries: number; delay: number }
  ): Promise<void> {
    // Integration with queue service
  }
}