import { Injectable, PipeTransform, ArgumentMetadata } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class XssSanitizerPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body' || !value || typeof value !== 'object') {
      return value;
    }

    return this.sanitizeObject(value);
  }

  private sanitizeObject(obj: any): any {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeHtml(obj[key], {
          allowedTags: [], // Strip all tags for most inputs
          allowedAttributes: {},
        });
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.sanitizeObject(obj[key]);
      }
    }
    return obj;
  }
}
