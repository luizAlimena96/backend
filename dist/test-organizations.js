"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function testOrganizations() {
    try {
        console.log('Testing organizations endpoint...\n');
        const orgs = await prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
            },
        });
        console.log(`Found ${orgs.length} organizations:`);
        orgs.forEach((org, idx) => {
            console.log(`${idx + 1}. ${org.name} (${org.id})`);
        });
        if (orgs.length === 0) {
            console.log('\n❌ No organizations found in database!');
            return;
        }
        const firstOrg = orgs[0];
        console.log(`\n\nTesting findOne for: ${firstOrg.name}`);
        const fullOrg = await prisma.organization.findUnique({
            where: { id: firstOrg.id },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        allowedTabs: true,
                        createdAt: true,
                    },
                },
                _count: {
                    select: {
                        users: true,
                        agents: true,
                        leads: true,
                        conversations: true,
                    },
                },
            },
        });
        console.log('\nOrganization data:');
        console.log(JSON.stringify({
            id: fullOrg.id,
            name: fullOrg.name,
            email: fullOrg.email,
            phone: fullOrg.phone,
            userCount: fullOrg._count.users,
            users: fullOrg.users,
        }, null, 2));
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
testOrganizations();
//# sourceMappingURL=test-organizations.js.map