import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { Readable } from 'stream';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: Client;
  private bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT')!,
      port:     this.configService.get<number>('MINIO_PORT'),
      useSSL:   this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY')!,
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY')!,
    });
    this.bucket = this.configService.get<string>('MINIO_BUCKET')!;
  }

  async onModuleInit() {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Bucket "${this.bucket}" created`);
    }
    // Make bucket public so profile photos are accessible without auth
    await this.client.setBucketPolicy(this.bucket, JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${this.bucket}/*`],
      }],
    }));
  }

  async upload(objectName: string, buffer: Buffer, mimeType: string): Promise<string> {
    const stream = Readable.from(buffer);
    await this.client.putObject(this.bucket, objectName, stream, buffer.length, {
      'Content-Type': mimeType,
    });
    return this.getUrl(objectName);
  }

  async delete(objectName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, objectName);
    } catch {
      // ignore if already gone
    }
  }

  getUrl(objectName: string): string {
    const publicUrl = this.configService.get<string>('MINIO_PUBLIC_URL');
    if (publicUrl) return `${publicUrl}/${this.bucket}/${objectName}`;
    const useSSL   = this.configService.get<string>('MINIO_USE_SSL') === 'true';
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT');
    const port     = this.configService.get<number>('MINIO_PORT');
    return `${useSSL ? 'https' : 'http'}://${endpoint}:${port}/${this.bucket}/${objectName}`;
  }
}
