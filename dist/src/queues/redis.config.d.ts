import { ConnectionOptions } from 'bullmq';
export declare const redisConnection: ConnectionOptions;
export declare function validateRedisConfig(): void;
export declare const redisEventHandlers: {
    onConnect: () => void;
    onReady: () => void;
    onError: (error: Error) => void;
    onClose: () => void;
    onReconnecting: () => void;
    onEnd: () => void;
};
