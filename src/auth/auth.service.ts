import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UpdateProfileDto } from '../users/dtos/update-profile.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly storageService: StorageService,
  ) {}

  async register({
    email,
    username,
    password,
  }: {
    email: string;
    username: string;
    password: string;
  }) {
    const emailExist = await this.userRepository.findByEmail(email);
    if (emailExist) {
      throw new ConflictException('Email already in use');
    }
    const usernameExist = await this.userRepository.findByUsername(username);
    if (usernameExist) {
      throw new ConflictException('Username already in use');
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    await this.userRepository.createUser({
      email: email,
      username: username,
      password: hashedPassword,
      role: 'USER',
    });
    return { message: 'User Registered Successfully' };
  }

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

  async login({ email, password }: { email: string; password: string }) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync({ sub: user.id, role: user.role, username: user.username, email: user.email }, { expiresIn: '1h' }),
      this.jwtService.signAsync({ sub: user.id, type: 'refresh' }, { expiresIn: '7d' }),
    ]);
    return { access_token, refresh_token };
  }

  async refresh(token: string) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }
    const user = await this.userRepository.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');
    const access_token = await this.jwtService.signAsync(
      { sub: user.id, role: user.role },
      { expiresIn: '1h' },
    );
    return { access_token };
  }
}
