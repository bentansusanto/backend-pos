import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  CloudinaryService,
  MulterFile,
} from '../cloudinary/cloudinary.service';
import { MulterService } from '../multers/multer.service';

@Controller('files')
export class FilesController {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly multerService: MulterService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|gif|pdf|doc|docx)$/,
          }),
        ],
      }),
    )
    file: MulterFile,
  ) {
    try {
      const uploadedUrl = await this.cloudinaryService.uploadFile(file);
      return {
        message: 'File uploaded successfully',
        url: uploadedUrl,
        originalName: file.originalname,
        size: file.size,
      };
    } catch (error) {
      throw new BadRequestException('Failed to upload file');
    }
  }

  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadMultipleFiles(@UploadedFiles() files: MulterFile[]) {
    try {
      const uploadedUrls =
        await this.cloudinaryService.uploadMultipleFiles(files);
      return {
        message: 'Files uploaded successfully',
        urls: uploadedUrls,
        count: files.length,
      };
    } catch (error) {
      throw new BadRequestException('Failed to upload files');
    }
  }
}
