import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

export interface CRMEvent {
    type: 'lead_created' | 'lead_updated' | 'lead_deleted' | 'lead_moved' |
    'tag_added' | 'tag_removed' | 'message_received' | 'stage_updated';
    organizationId: string;
    agentId?: string;
    data?: any;
}

@Injectable()
export class CRMEventsService {
    private server: Server | null = null;

    setServer(server: Server) {
        this.server = server;
        console.log('[CRM Events] WebSocket server initialized');
    }

    /**
     * Emit CRM event to all connected clients of an organization
     */
    emitToOrganization(organizationId: string, event: CRMEvent) {
        if (!this.server) {
            console.warn('[CRM Events] Server not initialized');
            return;
        }

        const room = `org:${organizationId}`;
        this.server.to(room).emit('crm:update', event);
        console.log(`[CRM Events] Emitted ${event.type} to ${room}`);
    }

    /**
     * Emit lead created event
     */
    leadCreated(organizationId: string, lead: any, agentId?: string) {
        this.emitToOrganization(organizationId, {
            type: 'lead_created',
            organizationId,
            agentId,
            data: { leadId: lead.id, lead }
        });
    }

    /**
     * Emit lead updated event
     */
    leadUpdated(organizationId: string, lead: any, agentId?: string) {
        this.emitToOrganization(organizationId, {
            type: 'lead_updated',
            organizationId,
            agentId,
            data: { leadId: lead.id, lead }
        });
    }

    /**
     * Emit lead deleted event
     */
    leadDeleted(organizationId: string, leadId: string, agentId?: string) {
        this.emitToOrganization(organizationId, {
            type: 'lead_deleted',
            organizationId,
            agentId,
            data: { leadId }
        });
    }

    /**
     * Emit lead moved to different stage
     */
    leadMoved(organizationId: string, leadId: string, newStageId: string, agentId?: string) {
        this.emitToOrganization(organizationId, {
            type: 'lead_moved',
            organizationId,
            agentId,
            data: { leadId, newStageId }
        });
    }

    /**
     * Emit tag added to conversation
     */
    tagAdded(organizationId: string, conversationId: string, tagId: string) {
        this.emitToOrganization(organizationId, {
            type: 'tag_added',
            organizationId,
            data: { conversationId, tagId }
        });
    }

    /**
     * Emit tag removed from conversation
     */
    tagRemoved(organizationId: string, conversationId: string, tagId: string) {
        this.emitToOrganization(organizationId, {
            type: 'tag_removed',
            organizationId,
            data: { conversationId, tagId }
        });
    }

    /**
     * Emit new message received
     */
    messageReceived(organizationId: string, conversationId: string, leadId: string) {
        this.emitToOrganization(organizationId, {
            type: 'message_received',
            organizationId,
            data: { conversationId, leadId }
        });
    }

    /**
     * Emit stage updated
     */
    stageUpdated(organizationId: string, agentId: string) {
        this.emitToOrganization(organizationId, {
            type: 'stage_updated',
            organizationId,
            agentId,
            data: {}
        });
    }
}
