import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OpenAIService } from '../../ai/services/openai.service';

@Injectable()
export class ConversationSummaryService {
    // Debounce map to prevent excessive summary generation
    private pendingSummaries: Map<string, NodeJS.Timeout> = new Map();
    private readonly DEBOUNCE_MS = 30000; // 30 seconds

    constructor(
        @Inject(PrismaService) private prisma: PrismaService,
        private openaiService: OpenAIService,
    ) { }

    /**
     * Schedule a summary update with debounce
     * Called after each new message
     */
    async scheduleSummaryUpdate(conversationId: string): Promise<void> {
        // Clear existing timeout if any
        const existingTimeout = this.pendingSummaries.get(conversationId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Schedule new update
        const timeout = setTimeout(async () => {
            try {
                await this.generateAndSaveSummary(conversationId);
                this.pendingSummaries.delete(conversationId);
            } catch (error) {
                console.error('[Summary] Error generating summary:', error);
            }
        }, this.DEBOUNCE_MS);

        this.pendingSummaries.set(conversationId, timeout);
        console.log(`[Summary] 📝 Scheduled summary update for conversation ${conversationId} in ${this.DEBOUNCE_MS}ms`);
    }

    /**
     * Generate and save summary immediately
     */
    async generateAndSaveSummary(conversationId: string): Promise<string | null> {
        console.log(`[Summary] 🔍 Generating summary for conversation ${conversationId}`);

        try {
            // Get conversation with lead and organization (for API key)
            const conversation = await this.prisma.conversation.findUnique({
                where: { id: conversationId },
                include: {
                    lead: true,
                    messages: {
                        orderBy: { timestamp: 'desc' },
                        take: 20, // Last 20 messages
                    },
                    organization: {
                        select: { openaiApiKey: true }
                    }
                },
            });

            if (!conversation || !conversation.lead) {
                console.log('[Summary] No conversation or lead found');
                return null;
            }

            if (conversation.messages.length < 3) {
                console.log('[Summary] Not enough messages to generate summary');
                return null;
            }

            // Format messages for GPT
            const messagesText = conversation.messages
                .reverse() // Chronological order
                .map(m => `${m.fromMe ? 'Assistente' : 'Cliente'}: ${m.content}`)
                .join('\n');

            // Generate summary with GPT
            const prompt = `Analise a conversa abaixo e gere um resumo conciso (máximo 150 caracteres) para um vendedor/closer entender rapidamente o contexto e interesse do cliente.

Conversa:
${messagesText}

Resumo (foque no interesse principal, objeções e próximos passos):`;

            // Get API key from organization
            const apiKey = conversation.organization?.openaiApiKey;
            if (!apiKey) {
                console.log('[Summary] No OpenAI API key configured');
                return null;
            }

            const summary = await this.openaiService.chat(
                apiKey,
                [{ role: 'user', content: prompt }],
                'gpt-4o-mini'
            );

            if (!summary) {
                console.log('[Summary] GPT returned empty summary');
                return null;
            }

            // Clean and truncate summary
            const cleanSummary = summary
                .replace(/^["']|["']$/g, '') // Remove quotes
                .replace(/\n/g, ' ') // Single line
                .trim()
                .substring(0, 150);

            // Save to lead
            await this.prisma.lead.update({
                where: { id: conversation.lead.id },
                data: { conversationSummary: cleanSummary },
            });

            console.log(`[Summary] ✅ Summary saved for lead ${conversation.lead.id}: "${cleanSummary.substring(0, 50)}..."`);
            return cleanSummary;

        } catch (error) {
            console.error('[Summary] ❌ Error generating summary:', error);
            return null;
        }
    }

    /**
     * Force generate summary for a lead (on-demand)
     */
    async generateSummaryForLead(leadId: string): Promise<string | null> {
        const conversation = await this.prisma.conversation.findFirst({
            where: { leadId },
            orderBy: { updatedAt: 'desc' },
        });

        if (!conversation) {
            return null;
        }

        return this.generateAndSaveSummary(conversation.id);
    }
}
