import { Module } from '@nestjs/common';
import { RoundsService } from './rounds.service';
import { RoundsController } from '@interfaces/rest/rounds.controller';
import { InfrastructureModule } from '@infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule],
  controllers: [RoundsController],
  providers: [RoundsService],
  exports: [RoundsService],
})
export class RoundsModule {}
