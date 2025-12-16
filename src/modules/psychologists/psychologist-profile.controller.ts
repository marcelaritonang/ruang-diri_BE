import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { ZodPipe } from '@/common/pipes/zod-validation.pipe';

import { PsychologistsService } from './psychologist-profile.service';
import {
  type PsychologistQuerySchema,
  psychologistQuerySchema,
} from './interfaces/http/queries/psychologist.query';

@ApiTags('Psychologists')
@Controller({
  version: '1',
  path: 'psychologists',
})
export class PsychologistsController {
  constructor(private readonly psychologistsService: PsychologistsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get psychologists with enhanced filtering',
    description: `
      Get a list of psychologists with comprehensive filtering and enhanced card data.
      
      **New Features:**
      - Date-based availability filtering
      - Years of experience filtering  
      - Specialty-based filtering
      - Session type filtering
      - Rich card data with availability info
      - Primary specialty badges
      - Active status with license validation
      - Price per session information
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Enhanced psychologist cards with availability info',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'uuid' },
                  name: { type: 'string', example: 'Dr. Sarah Wijaya' },
                  titles: { type: 'string', example: 'Dr., M.Psi' },
                  avatar: { type: 'string', nullable: true },
                  primarySpecialty: {
                    type: 'string',
                    example: 'Psikolog Klinis Dewasa',
                  },
                  specialties: { type: 'array', items: { type: 'string' } },
                  yearsOfPractice: { type: 'number', example: 8 },
                  licenseNumber: { type: 'string', example: 'PSY001-2024' },
                  isActive: { type: 'boolean', example: true },
                  hasAvailability: { type: 'boolean', example: true },
                  nextAvailableAt: { type: 'string', nullable: true },
                  sessionTypes: {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: ['online', 'chat', 'offline'],
                    },
                  },
                  pricePerSession: { type: 'number', example: 150000 },
                  location: { type: 'string', example: 'Jakarta Pusat' },
                  address: { type: 'string', example: 'Jl. Sudirman No. 1' },
                },
              },
            },
            metadata: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                hasNext: { type: 'boolean' },
                hasPrev: { type: 'boolean' },
              },
            },
          },
        },
        message: {
          type: 'string',
          example: 'Psychologists retrieved successfully',
        },
      },
    },
  })
  async getPsychologists(
    @Query(new ZodPipe(psychologistQuerySchema))
    params: PsychologistQuerySchema,
  ) {
    return this.psychologistsService.getPsychologists(params);
  }

  @Get('locations')
  async getLocations() {
    return this.psychologistsService.getLocations();
  }

  @Get('expertise')
  @ApiOperation({ summary: 'Get all available expertise areas' })
  @ApiResponse({
    status: 200,
    description:
      'List of all expertise areas that psychologists can specialize in',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'Stress, Burnout, & Kecemasan',
            'Gangguan mood (depresi, bipolar)',
            'Gangguan Kecemasan',
          ],
        },
        message: {
          type: 'string',
          example: 'Expertise areas retrieved successfully',
        },
      },
    },
  })
  async getExpertiseAreas() {
    return this.psychologistsService.getExpertiseAreas();
  }

  @Get('specializations')
  @ApiOperation({ summary: 'Get all available specialization types' })
  @ApiResponse({
    status: 200,
    description: 'List of all psychologist specialization types',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'Psikolog Klinis Dewasa',
            'Psikolog Klinis Anak',
            'Psikolog Pendidikan',
            'Psikolog Umum',
          ],
        },
        message: {
          type: 'string',
          example: 'Specializations retrieved successfully',
        },
      },
    },
  })
  async getSpecializations() {
    return this.psychologistsService.getSpecializations();
  }

  @Get('availability')
  async getAllPsychologistAvailability() {
    return this.psychologistsService.getAllPsychologistAvailability();
  }

  @Get(':id/availability')
  async getPsychologistAvailability(@Param('id') psychologistId: string) {
    return this.psychologistsService.getPsychologistAvailability(
      psychologistId,
    );
  }

  @Get(':id/details')
  @ApiOperation({
    summary: 'Get detailed psychologist information',
    description:
      'Get comprehensive psychologist details including availability, specialties, and booking info',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed psychologist information',
  })
  async getPsychologistDetails(@Param('id') psychologistId: string) {
    return this.psychologistsService.getPsychologistDetails(psychologistId);
  }
}
