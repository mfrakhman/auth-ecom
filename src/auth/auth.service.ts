import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UpdateProfileDto } from '../users/dtos/update-profile.dto';
import { StorageService } from '../storage/storage.service';
import { RedisService } from '../redis/redis.service';
import { NotificationService } from '../notification/notification.service';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function otpEmailHtml(code: string, action: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2>Your ${action} code</h2>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p>
      <p>Valid for <strong>5 minutes</strong>. Do not share this code.</p>
      <p style="color:#888;font-size:12px">If you didn't request this, ignore this email. Check your spam folder if you can't find it.</p>
    </div>
  `;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly storageService: StorageService,
    private readonly redisService: RedisService,
    private readonly notificationService: NotificationService,
  ) {}

  private signTokens(user: { id: string; role: string; username: string; email: string }) {
    return Promise.all([
      this.jwtService.signAsync(
        { sub: user.id, role: user.role, username: user.username, email: user.email },
        { expiresIn: '1h' },
      ),
      this.jwtService.signAsync({ sub: user.id, type: 'refresh' }, { expiresIn: '7d' }),
    ]);
  }

  async register({ email, username, password }: { email: string; username: string; password: string }) {
    const emailExist = await this.userRepository.findByEmail(email);
    if (emailExist) throw new ConflictException('Email already in use');

    const usernameExist = await this.userRepository.findByUsername(username);
    if (usernameExist) throw new ConflictException('Username already in use');

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.userRepository.createUser({ email, username, password: hashedPassword, role: 'USER' });

    // Auto-send verification OTP — fire and forget, don't fail registration
    this.sendVerificationOtp(email).catch(() => {});

    return { message: 'Registration successful. Please check your email for a verification code.' };
  }

  // ── Email verification ────────────────────────────────────────────────────

  async sendVerificationOtp(email: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    if (user.isEmailVerified) throw new BadRequestException('Email is already verified');

    const key = `otp:verify:${user.id}`;
    const existing = await this.redisService.getOtp(key);

    if (existing) {
      const elapsed = Date.now() - existing.sentAt;
      if (elapsed < 60_000) {
        const secondsLeft = Math.ceil((60_000 - elapsed) / 1000);
        throw new BadRequestException(`Please wait ${secondsLeft} seconds before requesting again`);
      }
    }

    const code = generateOtp();
    await this.redisService.setOtp(key, { code, attempts: 0, sentAt: Date.now() }, 300);

    this.logger.log(`Sending OTP to ${user.email}`);
    try {
      await this.notificationService.sendEmail(
        user.email,
        'Verify your email',
        otpEmailHtml(code, 'email verification'),
      );
      this.logger.log(`OTP sent successfully to ${user.email}`);
    } catch {
      await this.redisService.deleteOtp(key);
      throw new InternalServerErrorException('Failed to send OTP, please try again');
    }

    return { message: 'Verification code sent to your email' };
  }

  async verifyEmail(email: string, code: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    if (user.isEmailVerified) throw new BadRequestException('Email is already verified');

    const key = `otp:verify:${user.id}`;
    const otp = await this.redisService.getOtp(key);
    if (!otp) throw new BadRequestException('OTP expired or not found, please request a new one');

    if (otp.code !== code) {
      otp.attempts += 1;
      if (otp.attempts >= 3) {
        await this.redisService.deleteOtp(key);
        throw new BadRequestException('Too many wrong attempts, please request a new code');
      }
      await this.redisService.updateOtp(key, otp);
      throw new BadRequestException(`Invalid code, ${3 - otp.attempts} attempt(s) remaining`);
    }

    await this.redisService.deleteOtp(key);
    await this.userRepository.updateUser(user.id, { isEmailVerified: true } as any);

    const [access_token, refresh_token] = await this.signTokens(user);
    return { message: 'Email verified successfully', access_token, refresh_token };
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    const { password: _, ...profile } = user;
    return profile;
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    const updated = await this.userRepository.updateUser(userId, dto as any);
    const { password: _, ...profile } = updated!;
    return profile;
  }

  async deleteProfilePhoto(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    if (user.profilePhotoUrl) {
      const ext = user.profilePhotoUrl.split('.').pop() ?? 'jpg';
      await this.storageService.delete(`avatars/${userId}/profile.${ext}`);
    }
    const updated = await this.userRepository.updateUser(userId, { profilePhotoUrl: null } as any);
    const { password: _, ...profile } = updated!;
    return profile;
  }

  async uploadProfilePhoto(userId: string, file: Express.Multer.File) {
    if (!file.mimetype.startsWith('image/'))
      throw new BadRequestException('File must be an image');

    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const objectName = `avatars/${userId}/profile.${ext}`;
    const url = await this.storageService.upload(objectName, file.buffer, file.mimetype);

    const updated = await this.userRepository.updateUser(userId, { profilePhotoUrl: url } as any);
    const { password: _, ...profile } = updated!;
    return profile;
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login({ email, password }: { email: string; password: string }) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const [access_token, refresh_token] = await this.signTokens(user);
    return { access_token, refresh_token };
  }

  async refresh(token: string) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid token type');

    const user = await this.userRepository.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    const access_token = await this.jwtService.signAsync(
      { sub: user.id, role: user.role, username: user.username, email: user.email },
      { expiresIn: '1h' },
    );
    return { access_token };
  }
}
