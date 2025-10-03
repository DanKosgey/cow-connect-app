import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { logger } from "./logger";

export function cn(...inputs: ClassValue[]) {
  logger.debug("Merging class names", { inputs });
  const result = clsx(inputs);
  logger.debug("Merged class names result", { result });
  return result;
}

// Add logging to other utility functions
export const formatDate = (date: Date) => {
  logger.debug("Formatting date", { input: date });
  try {
    const result = date.toLocaleDateString();
    logger.debug("Date formatted successfully", { result });
    return result;
  } catch (error) {
    logger.error("Error formatting date", error);
    throw error;
  }
};

// Add logging wrapper for async operations
export const withLogging = async <T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> => {
  logger.time(operationName);
  try {
    const result = await operation();
    logger.info(`${operationName} completed successfully`);
    return result;
  } catch (error) {
    logger.error(`${operationName} failed`, error);
    throw error;
  } finally {
    logger.timeEnd(operationName);
  }
};
