import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
export interface LoginDto {
    email: string;
    password: string;
}
export interface RefreshTokenDto {
    refreshToken: string;
}
export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    organizationId: string | null;
    organizationName: string | null;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
export declare class AuthService {
    private prisma;
    private jwtService;
    private emailService;
    private configService;
    constructor(prisma: PrismaService, jwtService: JwtService, emailService: EmailService, configService: ConfigService);
    login(loginDto: LoginDto): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
            organizationId: string | null;
            organizationName: string | null;
            allowedTabs: string[];
        };
        accessToken: string;
        refreshToken: string;
    }>;
    generateTokens(payload: JwtPayload): Promise<AuthTokens>;
    refreshToken(refreshToken: string): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
            organizationId: string | null;
            organizationName: string | null;
            allowedTabs: string[];
        };
        accessToken: string;
        refreshToken: string;
    }>;
    validateUser(userId: string): Promise<{
        id: string;
        email: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
        organizationId: string | null;
        organizationName: string | null;
        allowedTabs: string[];
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
