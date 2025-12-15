import { FollowupsService } from '../../followups/followups.service';
export declare class FollowupScheduler {
    private followupsService;
    constructor(followupsService: FollowupsService);
    handleFollowups(): Promise<void>;
    cleanupOldLogs(): Promise<void>;
}
