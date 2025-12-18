import { IsUrl, IsIn, IsNotEmpty, Matches, IsOptional } from 'class-validator';

export class ProxyRequestDto {
    @IsUrl({ require_protocol: true, protocols: ['https'] })
    @Matches(/^https:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|10\.|172\.16\.|192\.168\.)/, {
        message: 'URL must be external HTTPS only, internal IPs not allowed'
    })
    url: string;

    @IsIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
    method: string;

    @IsNotEmpty()
    headers: Record<string, string>;

    @IsOptional()
    body?: any;
}
