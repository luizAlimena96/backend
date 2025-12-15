"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FSMEngineError = void 0;
class FSMEngineError extends Error {
    code;
    details;
    recoverable;
    constructor(code, message, details, recoverable = false) {
        super(message);
        this.name = 'FSMEngineError';
        this.code = code;
        this.details = details;
        this.recoverable = recoverable;
    }
}
exports.FSMEngineError = FSMEngineError;
//# sourceMappingURL=types.js.map