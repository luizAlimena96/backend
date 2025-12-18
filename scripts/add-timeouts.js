/**
 * Script para adicionar timeouts em todos os serviços HTTP
 * 
 * Este script adiciona automaticamente:
 * - timeout: 30000
 * - signal: AbortSignal.timeout(30000)
 * 
 * Em todos os arquivos de serviços de integração
 */

const fs = require('fs');
const path = require('path');

const TIMEOUT_CONFIG = `timeout: 30000,
                        signal: AbortSignal.timeout(30000),`;

const filesToUpdate = [
    'src/integrations/crm/crm-integration.service.ts',
    'src/integrations/google/google-calendar.service.ts',
    'src/integrations/zapsign/zapsign.service.ts',
    'src/common/services/media-processor.service.ts',
    'src/common/services/email.service.ts',
    'src/knowledge/document.service.ts',
    'src/webhooks/whatsapp/whatsapp-message.service.ts',
    'src/queues/processors/crm-sync.processor.ts',
];

function addTimeoutsToFile(filePath) {
    const fullPath = path.join(__dirname, '..', filePath);

    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
        return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    // Padrão para encontrar httpService calls sem timeout
    const patterns = [
        // POST requests
        /this\.httpService\.post\(([\s\S]*?)\{(\s*headers:[\s\S]*?)\}(\s*)\)/g,
        // GET requests
        /this\.httpService\.get\(([\s\S]*?)\{(\s*headers:[\s\S]*?)\}(\s*)\)/g,
        // PUT requests
        /this\.httpService\.put\(([\s\S]*?)\{(\s*headers:[\s\S]*?)\}(\s*)\)/g,
        // DELETE requests
        /this\.httpService\.delete\(([\s\S]*?)\{(\s*headers:[\s\S]*?)\}(\s*)\)/g,
        // REQUEST generic
        /this\.httpService\.request\(([\s\S]*?)\{([\s\S]*?timeout:\s*\d+,[\s\S]*?)\}(\s*)\)/g,
    ];

    patterns.forEach(pattern => {
        content = content.replace(pattern, (match) => {
            // Verifica se já tem timeout
            if (match.includes('timeout:') && match.includes('signal:')) {
                return match;
            }

            // Adiciona timeout antes do fechamento do objeto de configuração
            const modifiedMatch = match.replace(/(\}\s*\))$/, (closingMatch) => {
                const indent = '                        ';
                return `${indent}timeout: 30000,\n${indent}signal: AbortSignal.timeout(30000),\n                    })`;
            });

            modified = true;
            return modifiedMatch;
        });
    });

    if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Atualizado: ${filePath}`);
    } else {
        console.log(`ℹ️  Sem mudanças: ${filePath}`);
    }
}

console.log('🔧 Adicionando timeouts aos serviços HTTP...\n');

filesToUpdate.forEach(file => {
    addTimeoutsToFile(file);
});

console.log('\n✅ Script concluído!');
console.log('\n⚠️  IMPORTANTE: Revise manualmente os arquivos modificados para garantir que os timeouts foram adicionados corretamente.');
