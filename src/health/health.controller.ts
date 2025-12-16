import { Controller, Get } from '@nestjs/common';
import { DrizzleService } from '@/common/drizzle/drizzle.service';

@Controller('health')
export class HealthController {
  constructor(private readonly drizzleService: DrizzleService) {}

  @Get()
  async getHealth() {
    try {
      await this.drizzleService.db.execute('SELECT 1');

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: 'connected',
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error.message,
      };
    }
  }
}
