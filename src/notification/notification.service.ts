import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly notifUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.notifUrl = this.configService.get<string>(
      'NOTIFICATION_SERVICE_URL',
      'http://notification-service:3005',
    );
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    this.logger.log(`→ POST ${this.notifUrl}/email to=${to} subject="${subject}"`);
    try {
      await axios.post(`${this.notifUrl}/email`, { to, subject, html });
      this.logger.log(`✓ notification-service accepted email to=${to}`);
    } catch (err: any) {
      this.logger.error(`✗ notification-service failed to=${to}: ${err.message}`);
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}
