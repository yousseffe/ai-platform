import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * Root application controller exposing basic health check endpoints.
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health check endpoint returning a welcome greeting.
   * @returns Greeting string.
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
