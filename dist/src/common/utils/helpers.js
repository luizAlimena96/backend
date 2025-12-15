"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = delay;
exports.calculateBackoff = calculateBackoff;
exports.formatDate = formatDate;
exports.parseJSON = parseJSON;
exports.generateRandomString = generateRandomString;
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function calculateBackoff(attempt) {
    return Math.min(1000 * Math.pow(2, attempt), 10000);
}
function formatDate(date) {
    return date.toISOString();
}
function parseJSON(json, fallback) {
    try {
        return JSON.parse(json);
    }
    catch {
        return fallback;
    }
}
function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
//# sourceMappingURL=helpers.js.map