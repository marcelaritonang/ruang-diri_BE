import { ApiProperty } from '@nestjs/swagger';

type ScreeningStatus = 'monitored' | 'at_risk' | 'stable' | 'not_screened';

type GenderType = 'male' | 'female';

const SCREENING_STATUS_ENUM = [
  'monitored',
  'at_risk',
  'stable',
  'not_screened',
];

const GENDER_ENUM = ['male', 'female'];

export class OrganizationDto {
  @ApiProperty({ example: 'Jl. Sudirman No. 123, Jakarta' })
  address: string;

  @ApiProperty({ example: '+62 812-3456-7890' })
  phone: string;

  @ApiProperty({ example: 'https://example.com/profile.jpg' })
  profilePicture: string;

  @ApiProperty({ example: 'SMA Negeri 1 Jakarta' })
  fullName: string;
}

class StudentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  classroom: string;

  @ApiProperty()
  grade: string;

  @ApiProperty({ enum: GENDER_ENUM })
  gender: GenderType;

  @ApiProperty()
  nis: string;

  @ApiProperty({ enum: SCREENING_STATUS_ENUM })
  screeningStatus: ScreeningStatus;

  @ApiProperty()
  counselingStatus: boolean;

  @ApiProperty()
  iqScore: number;
}

class EmployeeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  department: string;

  @ApiProperty()
  position: string;

  @ApiProperty({ enum: GENDER_ENUM })
  gender: GenderType;

  @ApiProperty({ nullable: true, type: Number })
  age: number | null;

  @ApiProperty()
  yearsOfService: number;

  @ApiProperty({ enum: SCREENING_STATUS_ENUM })
  screeningStatus: ScreeningStatus;

  @ApiProperty()
  counselingStatus: boolean;
}

class OrganizationMetadataDto {
  @ApiProperty()
  totalData: number;

  @ApiProperty()
  totalPage: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty({
    type: 'object',
    properties: {
      male: { type: 'number' },
      female: { type: 'number' },
    },
  })
  byGender: {
    male: number;
    female: number;
  };
}

export class SchoolDocsResponseDto {
  @ApiProperty()
  status: string;

  @ApiProperty({
    type: 'object',
    properties: {
      students: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '26248af3-7b92-40f1-9b78-aa96efbd0cde',
            },
            fullName: { type: 'string', example: 'Backend' },
            classroom: { type: 'string', example: 'X' },
            grade: { type: 'string', example: 'A' },
            gender: {
              type: 'string',
              enum: GENDER_ENUM,
              example: 'male',
            },
            nis: { type: 'string', example: '123' },
            screeningStatus: {
              type: 'string',
              enum: SCREENING_STATUS_ENUM,
              example: 'monitored',
            },
            counselingStatus: { type: 'boolean', example: false },
            iqScore: { type: 'number', example: 0 },
          },
        },
      },
    },
  })
  data: {
    students: StudentDto[];
  };

  @ApiProperty({ type: OrganizationMetadataDto })
  metadata: OrganizationMetadataDto;

  @ApiProperty()
  message: string;
}

export class CompanyDocsResponseDto {
  @ApiProperty()
  status: string;

  @ApiProperty({
    type: 'object',
    properties: {
      employees: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'e1234567-89ab-cdef-0123-456789abcdef',
            },
            fullName: { type: 'string', example: 'John Doe' },
            department: { type: 'string', example: 'HR' },
            position: { type: 'string', example: 'Manager' },
            gender: {
              type: 'string',
              enum: GENDER_ENUM,
              example: 'male',
            },
            age: { type: 'number', nullable: true, example: 30 },
            yearsOfService: { type: 'number', example: 5 },
            screeningStatus: {
              type: 'string',
              enum: SCREENING_STATUS_ENUM,
              example: 'monitored',
            },
            counselingStatus: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  data: {
    employees: EmployeeDto[];
  };

  @ApiProperty({ type: OrganizationMetadataDto })
  metadata: OrganizationMetadataDto;

  @ApiProperty()
  message: string;
}
