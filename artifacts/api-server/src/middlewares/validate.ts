import type { Request, Response, NextFunction } from "express";
import { type ZodSchema, ZodError } from "zod";

interface ValidationTarget {
  schema: ZodSchema;
  source: "body" | "query" | "params";
}

export function validate(...targets: ValidationTarget[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Array<{ source: string; message: string; path: (string | number)[] }> = [];

    for (const { schema, source } of targets) {
      const data = req[source];
      const result = schema.safeParse(data);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            source,
            message: issue.message,
            path: issue.path,
          });
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any)[source] = result.data;
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        error: "Validation failed",
        details: errors,
      });
      return;
    }

    next();
  };
}

export type { ZodSchema };
