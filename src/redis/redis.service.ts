import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface OtpPayload {
  code: string;
  attempts: number;
  sentAt: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'redis'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
    });
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  async setOtp(key: string, payload: OtpPayload, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(payload), 'EX', ttlSeconds);
  }

  async getOtp(key: string): Promise<OtpPayload | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    return JSON.parse(data) as OtpPayload;
  }

  async deleteOtp(key: string): Promise<void> {
    await this.client.del(key);
  }

  async updateOtp(key: string, payload: OtpPayload): Promise<void> {
    const ttl = await this.client.ttl(key);
    if (ttl > 0) {
      await this.client.set(key, JSON.stringify(payload), 'EX', ttl);
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
