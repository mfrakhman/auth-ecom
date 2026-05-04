import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AddressesRepository } from './addresses.repository';
import { CreateAddressDto, UpdateAddressDto } from './dtos/address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly repo: AddressesRepository) {}

  async findAll(userId: string) {
    return this.repo.findByUserId(userId);
  }

  async create(userId: string, dto: CreateAddressDto) {
    const existing = await this.repo.findByUserId(userId);
    const isDefault = dto.isDefault ?? existing.length === 0;
    if (isDefault) await this.repo.clearDefault(userId);
    return this.repo.create(userId, { ...dto, isDefault });
  }

  async update(id: string, userId: string, dto: UpdateAddressDto) {
    const address = await this.repo.findOne(id, userId);
    if (!address) throw new NotFoundException('Address not found');
    if (dto.isDefault) await this.repo.clearDefault(userId);
    return this.repo.update(id, dto);
  }

  async setDefault(id: string, userId: string) {
    const address = await this.repo.findOne(id, userId);
    if (!address) throw new NotFoundException('Address not found');
    await this.repo.clearDefault(userId);
    return this.repo.update(id, { isDefault: true });
  }

  async delete(id: string, userId: string) {
    const address = await this.repo.findOne(id, userId);
    if (!address) throw new NotFoundException('Address not found');
    await this.repo.delete(id);
  }
}
