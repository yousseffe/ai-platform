import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { OnModuleInit, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { FraudService } from './services/fraud.service';

@Processor('fraud-queue')
export class FraudProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(FraudProcessor.name);

  constructor(
    private readonly fraudService: FraudService,
    @InjectQueue('fraud-queue') private readonly fraudQueue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.fraudQueue.add(
        'scan-fraud',
        {},
        {
          repeat: { pattern: '*/2 * * * *' },
          jobId: 'scan-fraud',
        },
      );
      this.logger.log('Scheduled repeatable scan-fraud job (every 2m).');
    } catch (err: unknown) {
      this.logger.error(
        `Failed to schedule scan-fraud: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async process(job: Job): Promise<void> {
    if (job.name !== 'scan-fraud') return;
    const recorded = await this.fraudService.scanAll();
    if (recorded > 0) {
      this.logger.warn(`Fraud scan recorded ${recorded} risk event(s).`);
    }
  }
}
