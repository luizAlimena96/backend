import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { WhatsAppMessageService } from '../src/webhooks/whatsapp/whatsapp-message.service';
import { PrismaService } from '../src/database/prisma.service';

async function bootstrap() {
    try {
        const app = await NestFactory.createApplicationContext(AppModule);
        const whatsappService = app.get(WhatsAppMessageService);
        const prisma = app.get(PrismaService);

        console.log('🚀 Starting Media Receive Test...');

        // 1. Mock Webhook Payload for an IMAGE message
        const mockImagePayload = {
            instance: 'TestInstance',
            data: {
                key: {
                    remoteJid: '5511999999999@s.whatsapp.net',
                    id: 'TEST_MSG_IMAGE_01',
                    fromMe: false
                },
                pushName: 'Media Tester',
                message: {
                    imageMessage: {
                        caption: 'Foto de teste',
                        url: 'https://example.com/image.jpg', // Simulando URL
                        mimetype: 'image/jpeg'
                    }
                }
            }
        };

        // Ensure Agent exists for TestInstance
        // We need a seeded agent or we create one on the fly?
        // Let's assert we have an agent.
        let agent = await prisma.agent.findUnique({ where: { instance: 'TestInstance' } });
        if (!agent) {
            console.log('Cannot find Agent TestInstance. Using DEMO agent if checks...');
            // Hack: let's try to list agents and pick one
            const firstAgent = await prisma.agent.findFirst();
            if (firstAgent) {
                console.log(`Redirecting test to instance: ${firstAgent.instance}`);
                mockImagePayload.instance = firstAgent.instance;
            } else {
                throw new Error("No agents found in DB to test with.");
            }
        }

        console.log('Sending Mock Image Payload...');
        await whatsappService.processIncomingMessage(mockImagePayload);

        console.log('✅ Payload processed. Checking DB...');

        // Wait a bit for db write
        await new Promise(r => setTimeout(r, 2000));

        // Check Message Table for the latest message from this phone
        const msg = await prisma.message.findFirst({
            where: {
                conversation: { whatsapp: '5511999999999' }
            },
            orderBy: { timestamp: 'desc' },
            include: { conversation: true } // Debug
        });

        if (msg) {
            console.log('Found Message:', msg.id, 'Type:', msg.type);
            console.log('MediaUrl:', msg.mediaUrl);

            if (msg.mediaType === 'image/jpeg' || msg.type === 'IMAGE') {
                console.log('✅ SUCCESS: Image Message found in DB!');
            } else {
                console.log('⚠️ WARNING: Message found but type might be wrong (Stored as TEXT?).');
            }
        } else {
            console.error('❌ FAILURE: Message not found.');
        }

        await app.close();
    } catch (e) {
        console.error("Critical error:", e);
        process.exit(1);
    }
}

bootstrap();
