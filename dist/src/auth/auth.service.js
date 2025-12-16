"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../database/prisma.service");
const email_service_1 = require("../email/email.service");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcryptjs"));
let AuthService = class AuthService {
    prisma;
    jwtService;
    emailService;
    configService;
    constructor(prisma, jwtService, emailService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.configService = configService;
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { organization: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        }
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            organizationName: user.organization?.name || null,
        };
        const tokens = await this.generateTokens(payload);
        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                organizationId: user.organizationId,
                organizationName: user.organization?.name || null,
                allowedTabs: user.allowedTabs || [],
            },
        };
    }
    async generateTokens(payload) {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, { expiresIn: '15m' }),
            this.jwtService.signAsync(payload, { expiresIn: '7d' }),
        ]);
        return {
            accessToken,
            refreshToken,
        };
    }
    async refreshToken(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken);
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
                include: { organization: true },
            });
            if (!user) {
                throw new common_1.UnauthorizedException('Usuário não encontrado');
            }
            const newPayload = {
                sub: user.id,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
                organizationName: user.organization?.name || null,
            };
            const tokens = await this.generateTokens(newPayload);
            return {
                ...tokens,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    organizationId: user.organizationId,
                    organizationName: user.organization?.name || null,
                    allowedTabs: user.allowedTabs || [],
                },
            };
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Token inválido ou expirado');
        }
    }
    async validateUser(userId) {
        if (!userId) {
            throw new common_1.UnauthorizedException('ID de usuário inválido');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { organization: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Usuário não encontrado');
        }
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
            organizationName: user.organization?.name || null,
            allowedTabs: user.allowedTabs || [],
        };
    }
    async forgotPassword(email) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return { message: 'Se o email existir, você receberá instruções para redefinir sua senha.' };
        }
        const resetToken = this.jwtService.sign({ sub: user.id, email: user.email, type: 'password-reset' }, { expiresIn: '1h' });
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
        const resetLink = `${frontendUrl}/redefinir-senha?token=${resetToken}`;
        await this.emailService.sendPasswordResetEmail(user.email, resetLink, user.name);
        console.log('Password reset token:', resetToken);
        console.log('User:', user.email);
        console.log('Reset link:', resetLink);
        return { message: 'Se o email existir, você receberá instruções para redefinir sua senha.' };
    }
    async resetPassword(token, newPassword) {
        try {
            const payload = this.jwtService.verify(token);
            if (payload.type !== 'password-reset') {
                throw new common_1.UnauthorizedException('Token inválido');
            }
            if (newPassword.length < 8) {
                throw new common_1.UnauthorizedException('A senha deve ter no mínimo 8 caracteres');
            }
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
            });
            if (!user) {
                throw new common_1.UnauthorizedException('Usuário não encontrado');
            }
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await this.prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword },
            });
            console.log(`[Reset Password] Password reset successful for user: ${user.email}`);
            return {
                success: true,
                message: 'Senha redefinida com sucesso!',
            };
        }
        catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new common_1.UnauthorizedException('Token expirado. Solicite um novo link de recuperação.');
            }
            if (error.name === 'JsonWebTokenError') {
                throw new common_1.UnauthorizedException('Token inválido');
            }
            throw error;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        email_service_1.EmailService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map