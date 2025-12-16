import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
    private uploadDir: string;

    constructor() {
        // Ensure uploads directory exists
        this.uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async saveFile(buffer: Buffer, originalName: string, mimeType: string): Promise<string> {
        const fileExt = path.extname(originalName) || this.getExtensionFromMime(mimeType);
        const fileName = `${crypto.randomUUID()}${fileExt}`;
        const filePath = path.join(this.uploadDir, fileName);

        await fs.promises.writeFile(filePath, buffer);

        // Return relative path or URL. For now, assuming static serve from /uploads
        // In production, this would return an S3 URL.
        return `/uploads/${fileName}`;
    }

    async getFile(relativePath: string): Promise<Buffer> {
        const filePath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(filePath)) {
            return fs.promises.readFile(filePath);
        }
        throw new Error('File not found');
    }

    private getExtensionFromMime(mimeType: string): string {
        const map: Record<string, string> = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'audio/ogg': '.ogg',
            'audio/mpeg': '.mp3',
            'audio/mp4': '.m4a',
            'application/pdf': '.pdf',
            'video/mp4': '.mp4',
        };
        return map[mimeType] || '';
    }
}
