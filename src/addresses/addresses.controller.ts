import {
  Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UseGuards,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto } from './dtos/address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.addressesService.findAll(req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(req.user.id, dto);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.addressesService.update(id, req.user.id, dto);
  }

  @Patch(':id/default')
  setDefault(@Req() req: any, @Param('id') id: string) {
    return this.addressesService.setDefault(id, req.user.id);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.addressesService.delete(id, req.user.id);
  }
}
