import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { StockTakesService } from './stock-takes.service';
import { CreateStockTakeDto } from './dto/create-stock-take.dto';
import { SubmitStockTakeDto } from './dto/submit-stock-take.dto';
import { JwtAuthGuard } from 'src/common/guards';

@Controller('stock-takes')
@UseGuards(JwtAuthGuard)
export class StockTakesController {
  constructor(private readonly stockTakesService: StockTakesService) {}

  @Post()
  async create(@Body() createStockTakeDto: CreateStockTakeDto, @Req() req: any) {
    const result = await this.stockTakesService.create(createStockTakeDto, req.user.id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Get()
  async findAll(@Query('branch_id') branchId: string) {
    const result = await this.stockTakesService.findAll(branchId);
    return {
      message: result.message,
      data: result.datas,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.stockTakesService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Post(':id/submit')
  async submit(@Param('id') id: string, @Body() submitStockTakeDto: SubmitStockTakeDto) {
    const result = await this.stockTakesService.submit(id, submitStockTakeDto);
    return {
      message: result.message,
      data: result.data,
    };
  }
}
