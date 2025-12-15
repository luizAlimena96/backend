"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeFSMTool = executeFSMTool;
exports.hasTools = hasTools;
exports.parseStateTools = parseStateTools;
async function executeFSMTool(toolName, args, context) {
    console.log(`[FSM Tools] Executing tool (STUB): ${toolName}`, { args, context });
    return {
        success: false,
        error: 'Tool execution not implemented in backend yet',
        message: `Ferramenta '${toolName}' ainda não está disponível no backend.`
    };
}
function hasTools(state) {
    return state.tools && state.tools !== 'null' && state.tools !== '';
}
function parseStateTools(state) {
    if (!hasTools(state))
        return [];
    try {
        const tools = typeof state.tools === 'string' ? JSON.parse(state.tools) : state.tools;
        return Array.isArray(tools) ? tools : [];
    }
    catch (error) {
        console.error('[FSM Tools] Error parsing tools:', error);
        return [];
    }
}
//# sourceMappingURL=tools-handler.js.map