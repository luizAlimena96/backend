import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ProcessedMedia {
    url: string;
    base64?: string;
    mimeType: string;
    fileName: string;
    type: 'image' | 'video' | 'document' | 'audio';
}

@Injectable()
export class MediaProcessorService {
    constructor(private httpService: HttpService) { }

    /**
     * Detect media type from URL or MIME type
     */
    detectMediaType(url: string, mimeType?: string): 'image' | 'video' | 'document' | 'audio' {
        const mime = mimeType?.toLowerCase() || '';
        const urlLower = url.toLowerCase();

        // Check MIME type first
        if (mime.startsWith('image/')) return 'image';
        if (mime.startsWith('video/')) return 'video';
        if (mime.startsWith('audio/')) return 'audio';
        if (mime.includes('pdf') || mime.includes('document')) return 'document';

        // Fallback to URL extension
        if (urlLower.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) return 'image';
        if (urlLower.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/)) return 'video';
        if (urlLower.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/)) return 'audio';
        if (urlLower.match(/\.(pdf|doc|docx|xls|xlsx|txt)$/)) return 'document';

        // Default to document
        return 'document';
    }

    /**
     * Convert Google Drive URL to direct download URL
     */
    convertGoogleDriveUrl(url: string): string {
        // Check if it's a Google Drive URL
        const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (driveMatch) {
            const fileId = driveMatch[1];
            return `https://drive.google.com/uc?export=download&id=${fileId}`;
        }

        // Check for alternative Google Drive formats
        const viewMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
        if (viewMatch) {
            const fileId = viewMatch[1];
            return `https://drive.google.com/uc?export=download&id=${fileId}`;
        }

        // Return original URL if not a Google Drive URL
        return url;
    }

    /**
     * Download file and convert to base64
     */
    async downloadAndConvertToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
        try {
            console.log('[MediaProcessor] Downloading file from:', url);

            const response = await firstValueFrom(
                this.httpService.get(url, {
                    responseType: 'arraybuffer',
                    maxRedirects: 5,
                    timeout: 30000 // 30 seconds timeout
                })
            );

            const buffer = Buffer.from(response.data);
            const base64 = buffer.toString('base64');
            const mimeType = response.headers['content-type'] || 'application/octet-stream';

            console.log('[MediaProcessor] Downloaded successfully, size:', buffer.length, 'bytes, MIME:', mimeType);

            return { base64, mimeType };
        } catch (error) {
            console.error('[MediaProcessor] Error downloading file:', error);
            throw new Error(`Failed to download file from ${url}: ${error.message}`);
        }
    }

    /**
     * Extract filename from URL
     */
    extractFileName(url: string): string {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const segments = pathname.split('/');
            const lastSegment = segments[segments.length - 1];

            if (lastSegment && lastSegment.length > 0) {
                return decodeURIComponent(lastSegment);
            }
        } catch (error) {
            // Invalid URL, continue to fallback
        }

        // Fallback: generate a filename
        return `file_${Date.now()}`;
    }

    /**
     * Process media URL: convert Google Drive URLs and optionally download
     */
    async processMediaUrl(
        url: string,
        options: {
            convertToBase64?: boolean;
            type?: 'image' | 'video' | 'document' | 'audio';
        } = {}
    ): Promise<ProcessedMedia> {
        // Convert Google Drive URL to direct download URL
        const directUrl = this.convertGoogleDriveUrl(url);

        // Extract filename
        const fileName = this.extractFileName(directUrl);

        // If base64 conversion is requested
        if (options.convertToBase64) {
            const { base64, mimeType } = await this.downloadAndConvertToBase64(directUrl);
            const type = options.type || this.detectMediaType(directUrl, mimeType);

            return {
                url: directUrl,
                base64,
                mimeType,
                fileName,
                type
            };
        }

        // Otherwise, just return the URL with detected type
        const type = options.type || this.detectMediaType(directUrl);

        return {
            url: directUrl,
            mimeType: 'application/octet-stream', // Unknown without downloading
            fileName,
            type
        };
    }

    /**
     * Validate MIME type is allowed
     */
    isValidMimeType(mimeType: string): boolean {
        const allowedTypes = [
            // Images
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
            // Videos
            'video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska',
            // Audio
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/flac',
            // Documents
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain'
        ];

        return allowedTypes.includes(mimeType.toLowerCase());
    }
}
