import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { Response } from 'express';

@Catch(HttpException)
export class ErrorsService implements ExceptionFilter {
  catch(exception: HttpException | any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // --- 🧩 HTTP EXCEPTION HANDLING ---
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      // Handle our custom error format
      if (res && typeof res === 'object' && 'Error' in res) {
        response.status(status).json({
          Status: status,
          Message: this.getMessageByStatus(status),
          Error: res.Error,
        });
        return;
      }

      let payload: any =
        typeof res === 'object' ? ((res as any).message ?? res) : res;

      // If payload is a JSON string (e.g., stringified array), try to parse it
      if (typeof payload === 'string') {
        const trimmed = payload.trim();
        if (
          (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
          (trimmed.startsWith('{') && trimmed.endsWith('}'))
        ) {
          try {
            payload = JSON.parse(trimmed);
          } catch {
            // leave as string if not parseable
          }
        }
      }

      // Normalize to array of { field, body } supporting class-validator ValidationError[]
      const normalizedErrors = this.normalizeValidationPayload(payload).map(
        (e) => ({
          field: e.field,
          body: String(e.body),
        }),
      );

      // Pastikan format tetap seragam seperti Zod
      const errorResponse =
        normalizedErrors.length === 1 ? normalizedErrors[0] : normalizedErrors;

      response.status(status).json({
        Status: status,
        Message: this.getMessageByStatus(status),
        Error: errorResponse,
      });
      return;
    }

    // --- 🧩 FALLBACK UNTUK ERROR TAK TERDUGA ---
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    response.status(status).json({
      Status: status,
      Message: 'Internal server error',
      Error: exception?.message || 'Unexpected error',
    });
  }

  // helper message dinamis
  private getMessageByStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Validation error';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Access denied';
      case HttpStatus.NOT_FOUND:
        return 'Resource not found';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'Internal server error';
      default:
        return 'Request failed';
    }
  }

  // Normalize various payload shapes into { field, body }[]
  private normalizeValidationPayload(
    payload: any,
  ): Array<{ field: string; body: string }> {
    // Case 1: default ValidationPipe returns string[]
    if (Array.isArray(payload) && payload.every((p) => typeof p === 'string')) {
      return (payload as string[]).map((msg) => ({
        field: 'general',
        body: msg,
      }));
    }

    // Case 2: custom exceptionFactory returns ValidationError[]
    if (
      Array.isArray(payload) &&
      payload.some((p) => this.looksLikeValidationError(p))
    ) {
      return this.flattenValidationErrors(payload as ValidationError[]);
    }

    // Case 3: single object with message/field/body
    if (payload && typeof payload === 'object') {
      const field =
        (payload as any).field || (payload as any).property || 'general';
      const body =
        (payload as any).body ||
        (payload as any).message ||
        JSON.stringify(payload);
      return [{ field, body: String(body) }];
    }

    // Fallback
    return [{ field: 'general', body: String(payload) }];
  }

  private looksLikeValidationError(val: any): boolean {
    return (
      val &&
      typeof val === 'object' &&
      ('constraints' in val || 'children' in val) &&
      'property' in val
    );
  }

  private flattenValidationErrors(
    errors: ValidationError[],
    parentPath: string[] = [],
  ): Array<{ field: string; body: string }> {
    const result: Array<{ field: string; body: string }> = [];
    for (const err of errors) {
      const path = [...parentPath, err.property].filter(Boolean);
      if (err.constraints && typeof err.constraints === 'object') {
        for (const key of Object.keys(err.constraints)) {
          result.push({
            field: path.join('.') || 'general',
            body: err.constraints[key],
          });
        }
      }
      if (Array.isArray(err.children) && err.children.length) {
        result.push(
          ...this.flattenValidationErrors(
            err.children as ValidationError[],
            path,
          ),
        );
      }
    }
    return result.length
      ? result
      : [
          {
            field: parentPath.join('.') || 'general',
            body: 'Validation failed',
          },
        ];
  }
}
