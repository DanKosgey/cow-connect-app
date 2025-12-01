export class CollectorEarningsError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'CollectorEarningsError';
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CollectorEarningsError);
    }
  }
}

export class CollectorNotFoundError extends CollectorEarningsError {
  constructor(collectorId: string) {
    super(`Collector with ID ${collectorId} not found`, 'COLLECTOR_NOT_FOUND');
    this.name = 'CollectorNotFoundError';
  }
}

export class DatabaseError extends CollectorEarningsError {
  constructor(
    message: string,
    public readonly operation: string,
    cause?: Error
  ) {
    super(`Database operation failed: ${message}`, 'DATABASE_ERROR', cause);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends CollectorEarningsError {
  constructor(message: string) {
    super(`Validation failed: ${message}`, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class CalculationError extends CollectorEarningsError {
  constructor(message: string) {
    super(`Calculation error: ${message}`, 'CALCULATION_ERROR');
    this.name = 'CalculationError';
  }
}