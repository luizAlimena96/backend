import { AuthService, LoginDto, RefreshTokenDto } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
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
    getMe(req: any): Promise<{
        id: string;
        email: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
        organizationId: string | null;
        organizationName: string | null;
        allowedTabs: string[];
    }>;
    refresh(refreshTokenDto: RefreshTokenDto): Promise<{
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
    logout(req: any): Promise<{
        message: string;
    }>;
    getSession(req: any): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
            organizationId: string | null;
            organizationName: string | null;
            allowedTabs: string[];
        };
    }>;
    forgotPassword(body: {
        email: string;
    }): Promise<{
        message: string;
    }>;
    resetPassword(body: {
        token: string;
        password: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
}
