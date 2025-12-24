import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CRMEventsService } from './crm-events.service';

@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
    namespace: '/crm',
})
export class CRMGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(private crmEventsService: CRMEventsService) { }

    afterInit(server: Server) {
        this.crmEventsService.setServer(server);
        console.log('[CRM Gateway] WebSocket Gateway initialized');
    }

    handleConnection(client: Socket) {
        console.log(`[CRM Gateway] Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`[CRM Gateway] Client disconnected: ${client.id}`);
    }

    /**
     * Client joins organization room to receive updates
     */
    @SubscribeMessage('join:organization')
    handleJoinOrganization(
        @MessageBody() data: { organizationId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const room = `org:${data.organizationId}`;
        client.join(room);
        console.log(`[CRM Gateway] Client ${client.id} joined room: ${room}`);
        return { success: true, room };
    }

    /**
     * Client leaves organization room
     */
    @SubscribeMessage('leave:organization')
    handleLeaveOrganization(
        @MessageBody() data: { organizationId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const room = `org:${data.organizationId}`;
        client.leave(room);
        console.log(`[CRM Gateway] Client ${client.id} left room: ${room}`);
        return { success: true };
    }
}
