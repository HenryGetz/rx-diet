export declare const SCHEMA_VERSION: "5";
export declare const GRAMMAR_VERSION: 1;
export interface ValidationResult {
    valid: boolean;
    errors?: Array<{
        path: string;
        message: string;
    }>;
}
export declare function validateResume(data: unknown): ValidationResult;
export declare function validateResumeLenient(data: unknown): ValidationResult;
//# sourceMappingURL=index.d.ts.map