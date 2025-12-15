export declare function delay(ms: number): Promise<void>;
export declare function calculateBackoff(attempt: number): number;
export declare function formatDate(date: Date): string;
export declare function parseJSON<T>(json: string, fallback: T): T;
export declare function generateRandomString(length: number): string;
