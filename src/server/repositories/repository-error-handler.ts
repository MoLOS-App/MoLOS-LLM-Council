/**
 * Repository Error Handling Utilities
 * Provides safe JSON parsing and standardized error handling for repositories
 */

export class RepositoryError extends Error {
  constructor(
    message: string,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}

/**
 * Safely parse JSON with error handling
 * @param jsonString JSON string to parse
 * @param fallback Fallback value if parsing fails
 * @param context Context string for error messages
 * @returns Parsed value or fallback
 */
export function safeJsonParse<T>(
  jsonString: string | null | undefined,
  fallback: T,
  context?: string,
): T {
  if (!jsonString) {
    return fallback;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    const contextMsg = context ? ` [${context}]` : "";
    console.error(
      `[RepositoryError] Failed to parse JSON${contextMsg}:`,
      error,
    );
    if (error instanceof Error) {
      console.error(
        `[RepositoryError] JSON content:`,
        jsonString.substring(0, 200),
      );
    }
    return fallback;
  }
}

/**
 * Handle database errors with specific messages
 * @param error Error object
 * @param context Context string for error messages
 * @throws RepositoryError with user-friendly message
 */
export function handleDatabaseError(error: unknown, context: string): never {
  if (error instanceof Error) {
    // SQLite/Drizzle specific errors
    if (error.message.includes("UNIQUE constraint")) {
      throw new RepositoryError(`Record already exists: ${context}`, error);
    }
    if (error.message.includes("FOREIGN KEY constraint")) {
      throw new RepositoryError(`Invalid reference in ${context}`, error);
    }
    if (error.message.includes("NOT NULL constraint")) {
      throw new RepositoryError(`Missing required field in ${context}`, error);
    }
    if (error.message.includes("SQLITE_BUSY")) {
      throw new RepositoryError(
        `Database is busy, please try again: ${context}`,
        error,
      );
    }
  }

  console.error(`[RepositoryError] Unexpected error in ${context}:`, error);
  throw new RepositoryError(
    `An unexpected error occurred: ${context}`,
    error as Error,
  );
}

/**
 * Wrap a repository method with try-catch
 * @param fn Function to wrap
 * @param context Context string for error messages
 * @returns Wrapped function with error handling
 */
export function withErrorHandling<T, R>(
  fn: (...args: T[]) => Promise<R>,
  context: string,
): (...args: T[]) => Promise<R> {
  return async (...args: T[]): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      // Re-throw RepositoryErrors as-is
      if (error instanceof RepositoryError) {
        throw error;
      }
      // Wrap other errors
      handleDatabaseError(error, context);
    }
  };
}
