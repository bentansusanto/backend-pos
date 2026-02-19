import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { MulterModule } from '../multers/multer.module';
import { FilesController } from './files.controller';

@Module({
  imports: [CloudinaryModule, MulterModule],
  controllers: [FilesController],
})
export class FilesModule {}
