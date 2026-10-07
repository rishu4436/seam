export type ValidationSeverity = "error";

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
  severity: ValidationSeverity;
}

export function issue(path: string, code: string, message: string): ValidationIssue {
  return { path, code, message, severity: "error" };
}
