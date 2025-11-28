import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
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

  async login({ email, password }: { email: string; password: string }) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
    });
    return { access_token: token };
  }
}
