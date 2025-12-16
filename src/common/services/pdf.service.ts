import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SmartParser = require('pdf-parse-new/lib/SmartPDFParser');

@Injectable()
export class PdfService {
    async extractText(buffer: Buffer): Promise<string> {
        try {
            const parser = new SmartParser(buffer);
            const data = await parser.parse();
            return data.text;
        } catch (error) {
            console.error('[PdfService] Error parsing PDF:', error);
            throw new Error('Failed to extract text from PDF');
        }
    }
}
