import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import type { Role } from '@/modules/auth/decorators/roles.decorator';

type Primitive = string | number | boolean | symbol | null | undefined;

interface ApiParameter<T = Primitive> {
  name: string;
  description?: string;
  required?: boolean;
  type?: Type<T> | Function | [Function] | string;
  example?: T;
}

interface ApiDocsOptions<ReqDto extends object, ResDto extends object> {
  summary: string;
  requestDto?: Type<ReqDto>;
  successResponseDto: Type<ResDto>;
  successStatus?: number;
  extraResponses?: { status: number; description: string }[];
  roles?: Role[];
  params?: ApiParameter[];
  queries?: ApiParameter[];
  headers?: ApiParameter[];
}

export function ApiStandardDocs<ReqDto extends object, ResDto extends object>(
  options: ApiDocsOptions<ReqDto, ResDto>,
) {
  const {
    summary,
    roles,
    requestDto,
    successResponseDto,
    successStatus = 200,
    extraResponses = [],
    params = [],
    queries = [],
    headers = [],
  } = options;

  const roleSummary =
    roles && roles.length > 0 ? `[Roles: ${roles.join(', ')}] ` : '';

  const decorators = [
    ApiOperation({ summary: roleSummary + summary }),
    ApiResponse({
      status: successStatus,
      description: 'Successful response',
      type: successResponseDto,
    }),
  ];

  if (requestDto) {
    decorators.push(ApiBody({ type: requestDto }));
  }

  extraResponses.forEach(({ status, description }) => {
    decorators.push(ApiResponse({ status, description }));
  });

  params.forEach((param) => {
    decorators.push(ApiParam(param));
  });

  queries.forEach((query) => {
    decorators.push(ApiQuery(query));
  });

  headers.forEach((header) => {
    decorators.push(ApiHeader(header));
  });

  return applyDecorators(...decorators);
}

export function authorizationHeaderDocs() {
  return {
    name: 'Authorization',
    description: 'Bearer token',
    required: true,
    type: String,
    example: 'Bearer <token>',
  };
}
