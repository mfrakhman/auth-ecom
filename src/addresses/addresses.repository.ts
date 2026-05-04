import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './entities/address.entity';

@Injectable()
export class AddressesRepository {
  constructor(
    @InjectRepository(Address)
    private readonly repo: Repository<Address>,
  ) {}

  findByUserId(userId: string) {
    return this.repo.find({ where: { userId }, order: { isDefault: 'DESC', createdAt: 'ASC' } });
  }

  findOne(id: string, userId: string) {
    return this.repo.findOne({ where: { id, userId } });
  }

  async create(userId: string, data: Partial<Address>) {
    const address = this.repo.create({ ...data, userId });
    return this.repo.save(address);
  }

  async update(id: string, data: Partial<Address>) {
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id } });
  }

  delete(id: string) {
    return this.repo.delete(id);
  }

  async clearDefault(userId: string) {
    await this.repo.update({ userId, isDefault: true }, { isDefault: false });
  }
}
