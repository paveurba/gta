import { JobRepository } from '../repositories/job.repository.js';

export class JobService {
    constructor(private readonly jobs: JobRepository) {}

    async setActiveJob(userId: number, jobName: string): Promise<void> {
        await this.jobs.activateJob(userId, jobName);
    }

    async getActiveJob(userId: number): Promise<string | null> {
        return this.jobs.getActiveJob(userId);
    }
}
