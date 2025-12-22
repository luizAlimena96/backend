
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const agents = await prisma.agent.findMany({
        include: {
            states: true
        }
    });

    const output = agents.map(agent => ({
        name: agent.name,
        id: agent.id,
        states: agent.states.map(state => ({
            name: state.name,
            dataKey: state.dataKey,
            availableRoutes: state.availableRoutes
        }))
    }));

    fs.writeFileSync('states_dump.json', JSON.stringify(output, null, 2));
    console.log('Dumped to states_dump.json');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
