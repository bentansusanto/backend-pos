import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreatePurchaseReceivingDto } from './dto/create-purchase_receiving.dto';
import { UpdatePurchaseReceivingDto } from './dto/update-purchase_receiving.dto';
import { PurchaseReceivingsService } from './purchase_receivings.service';

@Controller('purchase-receivings')
export class PurchaseReceivingsController {
  constructor(
    private readonly purchaseReceivingsService: PurchaseReceivingsService,
  ) {}

  @Post()
  create(@Body() createPurchaseReceivingDto: CreatePurchaseReceivingDto) {
    return this.purchaseReceivingsService.create(createPurchaseReceivingDto);
  }

  @Get()
  findAll() {
    return this.purchaseReceivingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseReceivingsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePurchaseReceivingDto: UpdatePurchaseReceivingDto,
  ) {
    return this.purchaseReceivingsService.update(
      id,
      updatePurchaseReceivingDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.purchaseReceivingsService.remove(id);
  }
}
