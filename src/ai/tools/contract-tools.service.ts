import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ZapSignService } from '../../integrations/zapsign/zapsign.service';
import { WhatsAppIntegrationService } from '../../integrations/whatsapp/whatsapp-integration.service';
import * as crypto from 'crypto';

@Injectable()
export class ContractToolsService {
    constructor(
        private prisma: PrismaService,
        private zapSignService: ZapSignService,
        private whatsappService: WhatsAppIntegrationService,
    ) { }

    /**
     * Tool para gerenciar envio de contratos via ZapSign
     * Pode ser chamada pela IA através do FSM
     */
    async gerenciarContrato(
        acao: 'verificar_dados' | 'enviar_contrato',
        params: {
            organizationId: string;
            leadId: string;
            campos_obrigatorios?: string[]; // Ex: ['nome', 'cpf', 'rg', 'endereco']
        }
    ): Promise<{
        success: boolean;
        contrato_enviado?: boolean;
        campos_faltantes?: string[];
        link_assinatura?: string;
        mensagem: string;
    }> {
        console.log(`[Contract Tools] Ação: ${acao}`, params);

        switch (acao) {
            case 'verificar_dados':
                return this.verificarDadosContrato(params);
            case 'enviar_contrato':
                return this.enviarContrato(params);
            default:
                return { success: false, mensagem: `Ação desconhecida: ${acao}` };
        }
    }

    /**
     * Verifica se todos os dados obrigatórios estão preenchidos
     */
    private async verificarDadosContrato(params: {
        organizationId: string;
        leadId: string;
        campos_obrigatorios?: string[];
    }): Promise<{
        success: boolean;
        campos_faltantes?: string[];
        mensagem: string;
    }> {
        try {
            const lead = await this.prisma.lead.findUnique({
                where: { id: params.leadId },
                include: {
                    agent: {
                        include: { organization: true }
                    }
                }
            });

            if (!lead) {
                return { success: false, mensagem: 'Lead não encontrado' };
            }

            const extractedData = lead.extractedData as Record<string, any> || {};
            const camposObrigatorios = params.campos_obrigatorios || ['nome', 'cpf'];
            const camposFaltantes: string[] = [];

            // Resolve nested field values (e.g., dados_cliente.cpf)
            for (const campo of camposObrigatorios) {
                const valor = this.resolveNestedValue(extractedData, campo);
                if (!valor || valor === '') {
                    camposFaltantes.push(campo);
                }
            }

            if (camposFaltantes.length > 0) {
                return {
                    success: true,
                    campos_faltantes: camposFaltantes,
                    mensagem: `Faltam os seguintes dados: ${camposFaltantes.join(', ')}`
                };
            }

            return {
                success: true,
                campos_faltantes: [],
                mensagem: 'Todos os dados obrigatórios estão preenchidos. Pode enviar o contrato.'
            };
        } catch (error: any) {
            console.error('[Contract Tools] Error checking data:', error);
            return { success: false, mensagem: `Erro ao verificar dados: ${error.message}` };
        }
    }

    /**
     * Envia o contrato via ZapSign
     */
    private async enviarContrato(params: {
        organizationId: string;
        leadId: string;
        campos_obrigatorios?: string[];
    }): Promise<{
        success: boolean;
        contrato_enviado?: boolean;
        link_assinatura?: string;
        campos_faltantes?: string[];
        mensagem: string;
    }> {
        try {
            const lead = await this.prisma.lead.findUnique({
                where: { id: params.leadId },
                include: {
                    agent: {
                        include: { organization: true }
                    }
                }
            });

            if (!lead || !lead.agent) {
                return { success: false, contrato_enviado: false, mensagem: 'Lead ou agente não encontrado' };
            }

            const org = lead.agent.organization;
            const agent = lead.agent;

            // Check ZapSign configuration
            if (!org.zapSignApiToken || !org.zapSignTemplateId) {
                return {
                    success: false,
                    contrato_enviado: false,
                    mensagem: 'ZapSign não está configurado. Configure o token e template na página de integrações.'
                };
            }

            // Get field mapping
            const mapping = agent.zapSignFieldMapping as any[];
            if (!mapping || mapping.length === 0) {
                return {
                    success: false,
                    contrato_enviado: false,
                    mensagem: 'Mapeamento de campos ZapSign não configurado para este agente.'
                };
            }

            const extractedData = lead.extractedData as Record<string, any> || {};

            // Build custom data from mapping
            const customData = mapping.map(m => {
                const value = this.resolveFieldValue(m.leadField, lead, extractedData);
                return {
                    variable: m.templateField.replace('{{ $json.', '').replace(' }}', '').trim(),
                    value: value
                };
            });

            // Construct payload
            const payload = {
                signers: [{
                    name: lead.name || extractedData.nome || extractedData.dados_cliente?.nome || 'Cliente',
                    email: lead.email || extractedData.email || extractedData.dados_cliente?.email || '',
                    send_automatic_email: false,
                    send_automatic_whatsapp: false
                }],
                data: customData.map(d => ({
                    de: d.variable,
                    para: d.value
                }))
            };

            console.log('[Contract Tools] Creating ZapSign document with payload:', JSON.stringify(payload, null, 2));

            // Create document
            const doc = await this.zapSignService.createDocument(org.zapSignApiToken, org.zapSignTemplateId, payload);
            console.log('[Contract Tools] ZapSign document created:', doc.uuid);

            // Update lead with document ID
            await this.prisma.lead.update({
                where: { id: lead.id },
                data: {
                    zapSignDocumentId: doc.uuid,
                    zapSignStatus: 'CREATED'
                }
            });

            // Get signer link
            const signer = doc.signers?.find((s: any) => s.email === lead.email || s.phone_number === lead.phone);
            const signUrl = signer?.sign_url || doc.signers?.[0]?.sign_url;

            if (signUrl) {
                const leadName = lead.name || extractedData.nome || extractedData.dados_cliente?.nome || 'Cliente';
                const message = `Olá ${leadName}, aqui está o seu contrato para assinatura: ${signUrl}`;

                // Get conversation and send via WhatsApp
                const conversation = await this.prisma.conversation.findFirst({
                    where: { leadId: lead.id, organizationId: params.organizationId }
                });

                if (conversation && org.evolutionInstanceName) {
                    // Save message to DB
                    await this.prisma.message.create({
                        data: {
                            conversationId: conversation.id,
                            content: message,
                            fromMe: true,
                            type: 'TEXT',
                            messageId: crypto.randomUUID(),
                            thought: 'Envio de Contrato (Tool ZapSign)'
                        }
                    });

                    // Send via WhatsApp
                    await this.whatsappService.sendMessage(
                        org.evolutionInstanceName,
                        lead.phone,
                        message
                    );

                    console.log('[Contract Tools] Contract link sent via WhatsApp');
                }

                return {
                    success: true,
                    contrato_enviado: true,
                    link_assinatura: signUrl,
                    mensagem: `Contrato enviado com sucesso! Link: ${signUrl}`
                };
            }

            return {
                success: true,
                contrato_enviado: true,
                mensagem: 'Contrato criado, mas não foi possível obter o link de assinatura.'
            };

        } catch (error: any) {
            console.error('[Contract Tools] Error sending contract:', error);
            return {
                success: false,
                contrato_enviado: false,
                mensagem: `Erro ao enviar contrato: ${error.message}`
            };
        }
    }

    /**
     * Resolve nested value from object (e.g., dados_cliente.cpf)
     */
    private resolveNestedValue(obj: any, path: string): string {
        try {
            const parts = path.split('.');
            let value = obj;

            for (const part of parts) {
                if (value === undefined || value === null) return '';
                value = value[part];
            }

            if (typeof value === 'object') {
                return JSON.stringify(value);
            }

            return value?.toString() || '';
        } catch {
            return '';
        }
    }

    /**
     * Resolve field value for ZapSign mapping
     */
    private resolveFieldValue(path: string, lead: any, extractedData: Record<string, any>): string {
        try {
            const cleanPath = path.replace(/{{|}}/g, '').trim();

            // Handle specific lead fields
            if (cleanPath === 'currentDate') return new Date().toLocaleDateString('pt-BR');
            if (cleanPath === 'lead.name') return lead.name || '';
            if (cleanPath === 'lead.email') return lead.email || '';
            if (cleanPath === 'lead.phone') return lead.phone || '';
            if (cleanPath === 'lead.cpf') return lead.cpf || '';
            if (cleanPath === 'lead.rg') return lead.rg || '';

            // Handle extractedData (supports nested objects)
            if (cleanPath.startsWith('lead.extractedData.')) {
                const fieldPath = cleanPath.split('lead.extractedData.')[1];
                return this.resolveNestedValue(extractedData, fieldPath);
            }

            return '';
        } catch {
            return '';
        }
    }
}
