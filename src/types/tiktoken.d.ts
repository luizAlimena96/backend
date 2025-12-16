declare module 'tiktoken' {
    export interface Tiktoken {
        encode(text: string): Uint32Array;
        decode(tokens: Uint32Array): string;
        free(): void;
    }

    export interface TiktokenModel {
        // Add known models if needed
    }

    export function encoding_for_model(model: string): Tiktoken;
    export function get_encoding(encoding: string): Tiktoken;
}
