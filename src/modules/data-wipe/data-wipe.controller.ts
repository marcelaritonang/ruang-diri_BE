import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

import type { IUserRequest } from '@/modules/auth/strategies/jwt.strategy';

import { DataWipeService } from './data-wipe.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Data Wipe Operations')
@ApiBearerAuth()
@Controller({
  version: '1',
  path: 'data-wipe',
})
export class DataWipeController {
  constructor(private readonly dataWipeService: DataWipeService) {}

  @Get('preview/:organizationId')
  @Roles('super_admin')
  @ApiOperation({
    summary: 'Preview data that will be wiped for an organization',
    description:
      'Shows what screening and counseling data will be deleted for users in the specified organization, without actually deleting anything.',
  })
  @ApiResponse({
    status: 200,
    description: 'Preview data retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Wipe preview generated successfully',
        data: {
          organizationId: 'ad6fb6dd-fa6f-46c5-ba76-9a2e5c6bcbcc',
          totalUsers: 15,
          usersByRole: {
            employees: 12,
            students: 3,
            others: 0,
          },
          screeningsCount: 45,
          counselingsCount: 8,
          users: [
            {
              id: 'user-123',
              fullName: 'John Doe',
              email: 'john@company.com',
              role: 'employee',
              screeningsCount: 3,
              counselingsCount: 1,
            },
          ],
        },
      },
    },
  })
  async previewWipeData(@Param('organizationId') organizationId: string) {
    return this.dataWipeService.previewWipeData(organizationId);
  }

  @Delete('execute/:organizationId')
  @Roles('super_admin')
  @ApiOperation({
    summary: '🚨 DANGER: Execute data wipe for an organization',
    description:
      'PERMANENTLY DELETES all screening and counseling data for users in the specified organization. This action cannot be undone!',
  })
  @ApiResponse({
    status: 200,
    description: 'Data wipe executed successfully',
    schema: {
      example: {
        success: true,
        message:
          'Successfully wiped screening data for organization ad6fb6dd-fa6f-46c5-ba76-9a2e5c6bcbcc',
        data: {
          organizationId: 'ad6fb6dd-fa6f-46c5-ba76-9a2e5c6bcbcc',
          deletedData: {
            screenings: 45,
            counselings: 8,
          },
          affectedUsers: 15,
          timestamp: '2024-01-15T10:30:00.000Z',
        },
      },
    },
  })
  async executeWipe(@Param('organizationId') organizationId: string) {
    return this.dataWipeService.executeWipe(organizationId);
  }

  @Get('stats/:organizationId')
  @Roles('super_admin', 'organization')
  @ApiOperation({
    summary: 'Get screening statistics for an organization',
    description:
      'Retrieves current statistics about screening and counseling data for users in the specified organization.',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization statistics retrieved successfully',
  })
  async getOrganizationStats(@Param('organizationId') organizationId: string) {
    return this.dataWipeService.getOrganizationStats(organizationId);
  }

  @Get('preview/current-org')
  @Roles('organization')
  @ApiOperation({
    summary: "Preview data that will be wiped for current user's organization",
    description:
      "Shows what screening and counseling data will be deleted for users in the current user's organization.",
  })
  async previewCurrentOrgWipeData(@CurrentUser() user: IUserRequest['user']) {
    if (!user.organizationId) {
      throw new Error('User must be associated with an organization');
    }
    return this.dataWipeService.previewWipeData(user.organizationId);
  }

  @Get('stats/current-org')
  @Roles('organization')
  @ApiOperation({
    summary: "Get screening statistics for current user's organization",
    description:
      "Retrieves current statistics about screening and counseling data for the current user's organization.",
  })
  async getCurrentOrgStats(@CurrentUser() user: IUserRequest['user']) {
    if (!user.organizationId) {
      throw new Error('User must be associated with an organization');
    }
    return this.dataWipeService.getOrganizationStats(user.organizationId);
  }

  // Special endpoint for the specific organization ID mentioned in the task
  @Get('preview/target-organization')
  @Roles('super_admin')
  @ApiOperation({
    summary:
      'Preview data for the target organization (ad6fb6dd-fa6f-46c5-ba76-9a2e5c6bcbcc)',
    description:
      'Convenience endpoint to preview wipe data for the organization ID specified in the task.',
  })
  async previewTargetOrgData() {
    const targetOrgId = 'ad6fb6dd-fa6f-46c5-ba76-9a2e5c6bcbcc';
    return this.dataWipeService.previewWipeData(targetOrgId);
  }

  @Delete('execute/target-organization')
  @Roles('super_admin')
  @ApiOperation({
    summary:
      '🚨 DANGER: Execute wipe for target organization (ad6fb6dd-fa6f-46c5-ba76-9a2e5c6bcbcc)',
    description:
      'PERMANENTLY DELETES all screening and counseling data for the organization ID specified in the task. This action cannot be undone!',
  })
  async executeTargetOrgWipe() {
    const targetOrgId = 'ad6fb6dd-fa6f-46c5-ba76-9a2e5c6bcbcc';
    return this.dataWipeService.executeWipe(targetOrgId);
  }

  @Get('stats/target-organization')
  @Roles('super_admin')
  @ApiOperation({
    summary:
      'Get statistics for target organization (ad6fb6dd-fa6f-46c5-ba76-9a2e5c6bcbcc)',
    description:
      'Get current statistics for the organization ID specified in the task.',
  })
  async getTargetOrgStats() {
    const targetOrgId = 'ad6fb6dd-fa6f-46c5-ba76-9a2e5c6bcbcc';
    return this.dataWipeService.getOrganizationStats(targetOrgId);
  }
}
