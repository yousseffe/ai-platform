import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PipelineRunnerService } from '../services/pipeline-runner.service';
import { RunPipelineJobPayload } from '../interfaces/queue-payload.interface';

/**
 * BullMQ processor that executes pipeline runs in the background, mirroring
 * the build/deploy queue pattern used for model containerization.
 */
@Processor('pipeline-queue', { concurrency: 5 })
export class PipelineProcessor extends WorkerHost {
  private readonly logger = new Logger(PipelineProcessor.name);

  constructor(private readonly pipelineRunnerService: PipelineRunnerService) {
    super();
  }

  /**
   * Processes a single `run-pipeline` background job.
   *
   * @param job - The background job carrying the target {@link PipelineRun} ID.
   */
  async process(job: Job<RunPipelineJobPayload, void, string>): Promise<void> {
    const { runId } = job.data;
    this.logger.log(`Starting pipeline run ${runId}`);
    try {
      await this.pipelineRunnerService.runPipeline(runId);
      this.logger.log(`Finished pipeline run ${runId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Pipeline run ${runId} crashed: ${message}`);
    }
  }
}
