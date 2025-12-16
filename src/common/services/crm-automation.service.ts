import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ZapSignService } from '../../integrations/zapsign/zapsign.service';

@Injectable()
export class CRMAutomationService {
    constructor(
        private prisma: PrismaService,
        private zapSignService: ZapSignService
    ) { }

    async executeAutomationsForState(leadId: string, stageId: string): Promise<void> {
        console.log(`[CRM Automation] Checking automations for lead ${leadId} in stage ${stageId}`);

        try {
            const lead = await this.prisma.lead.findUnique({
                where: { id: leadId },
                include: {
                    agent: {
                        include: {
                            organization: true
                        }
                    }
                }
            });

            if (!lead || !lead.agent) {
                console.log('[CRM Automation] Lead or Agent not found');
                return;
            }

            // 1. Check ZapSign Trigger
            if (lead.agent.zapSignTriggerCrmStageId === stageId) {
                await this.handleZapSignTrigger(lead, stageId);
            }

            // 2. Check Generic Actions (Future Implementation)
            // const automations = await this.prisma.cRMAutomation.findMany({ ... })

        } catch (error) {
            console.error('[CRM Automation] Error executing automations:', error);
        }
    }

    private async handleZapSignTrigger(lead: any, stageId: string) {
        console.log('[CRM Automation] Triggering ZapSign flow for lead:', lead.id);

        const agent = lead.agent;
        const org = agent.organization;

        if (!org.zapSignApiToken || !org.zapSignTemplateId) {
            console.error('[CRM Automation] ZapSign not configured for organization');
            return;
        }

        const mapping = agent.zapSignFieldMapping as any[];
        if (!mapping || mapping.length === 0) {
            console.error('[CRM Automation] No ZapSign field mapping for agent');
            return;
        }

        // Map fields
        const signersData = {
            name: lead.name || 'Sem Nome', // Required by ZapSign? Usually yes.
            email: lead.email || '', // Optional?
            // ZapSign usually requires 'signers' array.
            // But 'createDocument' might abstract it or we send raw payload.
            // Let's assume we map custom fields into a flat object or nested as per config.
            // The mapping generally maps Template Variable -> Lead Value.
        };

        // Construct the full payload for ZapSign
        // ZapSign V1 usually needs:
        // {
        //   template_id: ...,
        //   signer_name: ..., 
        //   email: ...,
        //   data: [ { de: "variable", para: "value" } ]
        // }
        // OR if using the map directly.
        // Let's check how the mapping is structured in frontend:
        // { templateField: '{{ $json.nome }}', leadField: '{{ lead.name }}' }

        // We need to resolve values.
        const customData = mapping.map(m => {
            const value = this.resolveValue(m.leadField, lead);
            // templateField usually is like "{{ $json.nome }}". We need just "nome"?
            // Or ZapSign API takes the full object?
            // Re-checking ZapSignService... it sends `...data`.
            // Standard ZapSign create from template uses `signers` array.
            return {
                variable: m.templateField.replace('{{ $json.', '').replace(' }}', '').trim(),
                value: value
            };
        });

        // Simplified payload assuming standard single signer flow often used
        // We might need to adjust based on exact ZapSign API requirements for the template.
        // Usually: data: [ { de: "nome", para: "John" } ]

        // Let's construct a safe payload
        const payload = {
            signers: [{
                name: lead.name,
                email: lead.email,
                send_automatic_email: false,
                send_automatic_whatsapp: false // We send via our own bot usually
            }],
            data: customData.map(d => ({
                de: d.variable,
                para: d.value
            }))
        };

        try {
            const doc = await this.zapSignService.createDocument(org.zapSignApiToken, org.zapSignTemplateId, payload);
            console.log('[CRM Automation] ZapSign document created:', doc.uuid);
            // Optionally save doc link to lead or notify
        } catch (err) {
            console.error('[CRM Automation] Failed to create ZapSign doc:', err);
        }
    }

    private resolveValue(path: string, context: any): string {
        try {
            // Remove {{ }}
            const cleanPath = path.replace(/{{|}}/g, '').trim();

            // Handle specific cases
            if (cleanPath === 'currentDate') return new Date().toLocaleDateString('pt-BR');
            if (cleanPath === 'lead.name') return context.name || '';
            if (cleanPath === 'lead.email') return context.email || '';
            if (cleanPath === 'lead.phone') return context.phone || '';
            if (cleanPath === 'lead.cpf') return context.cpf || ''; // Assuming extracted/root
            if (cleanPath === 'lead.rg') return context.rg || '';

            // Handle lead.extractedData.field
            if (cleanPath.startsWith('lead.extractedData.')) {
                const field = cleanPath.split('lead.extractedData.')[1];
                return context.extractedData?.[field] || '';
            }

            return '';
        } catch (e) {
            return '';
        }
    }

    async createAutomation(data: any): Promise<any> {
        console.log('[CRM Automation] Would create automation:', data.name);
        return { id: 'placeholder', ...data };
    }
}
