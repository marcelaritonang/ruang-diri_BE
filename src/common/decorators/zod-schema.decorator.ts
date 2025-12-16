import { ZodSchema } from 'zod';

export function ZodSchemaDecorator(schema: ZodSchema) {
  return function (target: any) {
    Reflect.defineMetadata('zodSchema', schema, target);
  };
}
