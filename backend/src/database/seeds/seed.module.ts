import { Module } from '@nestjs/common';
import { SampleDataSeedService } from './sample-data-seed.service.js';
import { AdminBootstrapService } from './admin-bootstrap.service.js';

@Module({
  providers: [SampleDataSeedService, AdminBootstrapService],
})
export class SeedModule {}
