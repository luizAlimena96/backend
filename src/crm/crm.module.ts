import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CRMController } from './crm.controller';
import { CRMService } from './crm.service';
import { CRMProxyController } from './crm-proxy.controller';
import { CRMTemplatesController } from './crm-templates.controller';
import { CrmConfigsModule } from '../crm-configs/crm-configs.module';
import { CrmTemplatesModule } from '../crm-templates/crm-templates.module';
import { CrmAutomationsModule } from '../crm-automations/crm-automations.module';

@Module({
  imports: [
    HttpModule,
    CrmConfigsModule,
    CrmTemplatesModule,
    CrmAutomationsModule,
  ],
  controllers: [CRMController, CRMProxyController, CRMTemplatesController],
  providers: [CRMService],
  exports: [CRMService],
})
export class CRMModule { }
