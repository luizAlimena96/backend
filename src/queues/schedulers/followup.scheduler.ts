import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FollowupsService } from '../../followups/followups.service';

/**
 * Automatic Followup Scheduler
 * Runs every 15 minutes to check and send followups
 */
@Injectable()
export class FollowupScheduler {
    constructor(private followupsService: FollowupsService) { }

    /**
     * Check and send followups every 15 minutes
     */
    @Cron(CronExpression.EVERY_10_MINUTES)
    async handleFollowups() {
        console.log('[Followup Scheduler] Running automatic followup check...');

        try {
            const result = await this.followupsService.checkAgentFollowUps();

            console.log('[Followup Scheduler] ✅ Automatic check completed', {
                processed: result.processed,
                rulesChecked: result.rulesChecked,
            });
        } catch (error) {
            console.error('[Followup Scheduler] ❌ Error in automatic check:', error);
        }
    }

    /**
     * Daily cleanup of old followup logs (runs at 3 AM)
     */
    @Cron('0 3 * * *')
    async cleanupOldLogs() {
        console.log('[Followup Scheduler] Running daily cleanup...');

        // TODO: Implement cleanup logic
        // Delete followup logs older than 90 days
    }
}
