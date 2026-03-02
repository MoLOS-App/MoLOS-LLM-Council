import { describe, it, expect } from "vitest";
import {
  safeJsonParse,
  RepositoryError,
  handleDatabaseError,
} from "../src/server/repositories/repository-error-handler.js";

describe("Repository Error Handler", () => {
  describe("safeJsonParse", () => {
    it("should parse valid JSON", () => {
      const result = safeJsonParse('{"foo":"bar"}', { foo: "default" }, "test");
      expect(result).toEqual({ foo: "bar" });
    });

    it("should return fallback on invalid JSON", () => {
      const result = safeJsonParse("invalid json", { foo: "default" }, "test");
      expect(result).toEqual({ foo: "default" });
    });

    it("should return fallback on null input", () => {
      const result = safeJsonParse(null, { foo: "default" }, "test");
      expect(result).toEqual({ foo: "default" });
    });

    it("should return fallback on undefined input", () => {
      const result = safeJsonParse(undefined, { foo: "default" }, "test");
      expect(result).toEqual({ foo: "default" });
    });

    it("should handle empty arrays", () => {
      const result = safeJsonParse("[]", ["default"], "test");
      expect(result).toEqual([]);
    });
  });

  describe("handleDatabaseError", () => {
    it("should throw RepositoryError for UNIQUE constraint", () => {
      const error = new Error("UNIQUE constraint failed: councilPersonas.name");
      expect(() => handleDatabaseError(error, "test")).toThrow(RepositoryError);
      expect(() => handleDatabaseError(error, "test")).toThrow(
        "Record already exists: test",
      );
    });

    it("should throw RepositoryError for FOREIGN KEY constraint", () => {
      const error = new Error("FOREIGN KEY constraint failed");
      expect(() => handleDatabaseError(error, "test")).toThrow(RepositoryError);
      expect(() => handleDatabaseError(error, "test")).toThrow(
        "Invalid reference in test",
      );
    });

    it("should throw RepositoryError for NOT NULL constraint", () => {
      const error = new Error("NOT NULL constraint failed");
      expect(() => handleDatabaseError(error, "test")).toThrow(RepositoryError);
      expect(() => handleDatabaseError(error, "test")).toThrow(
        "Missing required field in test",
      );
    });

    it("should throw RepositoryError for SQLITE_BUSY", () => {
      const error = new Error("SQLITE_BUSY");
      expect(() => handleDatabaseError(error, "test")).toThrow(RepositoryError);
      expect(() => handleDatabaseError(error, "test")).toThrow(
        "Database is busy, please try again: test",
      );
    });

    it("should throw generic RepositoryError for unknown errors", () => {
      const error = new Error("Unknown database error");
      expect(() => handleDatabaseError(error, "test")).toThrow(RepositoryError);
      expect(() => handleDatabaseError(error, "test")).toThrow(
        "An unexpected error occurred: test",
      );
    });
  });

  describe("RepositoryError", () => {
    it("should create error with message", () => {
      const error = new RepositoryError("Test error");
      expect(error.message).toBe("Test error");
      expect(error.name).toBe("RepositoryError");
    });

    it("should store original error", () => {
      const original = new Error("Original error");
      const error = new RepositoryError("Test error", original);
      expect(error.originalError).toBe(original);
    });

    it("should handle null original error", () => {
      const error = new RepositoryError("Test error");
      expect(error.originalError).toBeUndefined();
    });
  });
});
