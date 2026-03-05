import { JobRepository } from '../repositories/job.repository';

export class JobService {
  public constructor(private readonly jobs: JobRepository) {}

  public async setActiveJob(userId: number, jobName: string): Promise<void> {
    await this.jobs.activateJob(userId, jobName);
  }

  public async getActiveJob(userId: number): Promise<string | null> {
    return this.jobs.getActiveJob(userId);
  }
}
