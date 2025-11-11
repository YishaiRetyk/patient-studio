import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * Custom Validation Pipe (T053)
 * Extends NestJS validation with custom error messages
 * Used globally in main.ts
 */
@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const messages = errors.map((error) => ({
        field: error.property,
        constraints: error.constraints,
        value: error.value,
      }));

      throw new BadRequestException({
        message: 'Validation failed',
        errors: messages,
      });
    }

    return value;
  }

  private toValidate(metatype: { new (...args: any[]): any }): boolean {
    const types: Array<{ new (...args: any[]): any }> = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
