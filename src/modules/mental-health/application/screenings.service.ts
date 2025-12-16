import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { SuccessResponse } from '@/common/utils/response.util';
import { ErrorHandlerUtil } from '@/common/utils/error-handler.util';
import {
  ServiceErrorHandler,
  BaseService,
} from '@/common/decorators/service-error-handler.decorator';

// import { NotificationsService } from '@/modules/notifications/application/notifications.service';
import { IUserRequest } from '@/modules/auth/strategies/jwt.strategy';

import type {
  CreateScreeningDto,
  GetScreeningsQuery,
} from '../domain/screenings/dto/screening.dto';
import { DassUtilityService } from '../utils/dass-utility.service';

import { ScreeningsRepository } from '@modules/mental-health/infrastructure/screenings.repository';

@Injectable()
export class ScreeningsService extends BaseService {
  protected readonly logger = new Logger(ScreeningsService.name);

  constructor(
    private readonly screeningsRepository: ScreeningsRepository,
    // private readonly notificationsService: NotificationsService,
    private readonly dassUtilityService: DassUtilityService,
    errorHandler: ErrorHandlerUtil,
  ) {
    super(errorHandler);
  }

  validateScreeningPayload(dto: CreateScreeningDto): void {
    if (!Array.isArray(dto.answers)) {
      throw new BadRequestException('Answers must be an array');
    }

    if (dto.answers.length !== 21) {
      throw new BadRequestException(
        'DASS-21 assessment requires exactly 21 answers',
      );
    }

    const invalidAnswers = dto.answers.filter(
      (answer) => !Number.isInteger(answer) || answer < 0 || answer > 3,
    );

    if (invalidAnswers.length > 0) {
      throw new BadRequestException(
        'All answers must be integers between 0 and 3',
      );
    }
  }

  @ServiceErrorHandler('Create mental health screening')
  async createScreening(
    dto: CreateScreeningDto,
    user: IUserRequest['user'],
  ): Promise<SuccessResponse> {
    this.logger.log(`Creating mental health screening for user: ${user.id}`);

    this.validateScreeningPayload(dto);

    const assessmentResult = this.dassUtilityService.calculateDassScores(
      dto.answers,
    );

    const screeningStatus = this.dassUtilityService.mapToScreeningStatus(
      assessmentResult.riskLevel,
    );

    const screening = await this.screeningsRepository.createScreening({
      userId: user.id,
      answers: dto.answers,
      screeningStatus,
      depressionScore: assessmentResult.depression.score,
      anxietyScore: assessmentResult.anxiety.score,
      stressScore: assessmentResult.stress.score,
      depressionCategory: assessmentResult.depression.severity,
      anxietyCategory: assessmentResult.anxiety.severity,
      stressCategory: assessmentResult.stress.severity,
      overallRisk: assessmentResult.overallRisk,
    });

    // await this.sendRiskNotification(user, assessmentResult.riskLevel);

    const response = {
      ...screening,
      assessment: assessmentResult,
    };

    return SuccessResponse.success(
      response,
      'Mental health screening completed successfully',
    );
  }

  @ServiceErrorHandler('Get user screenings')
  async getUserScreenings(
    userId: string,
    query: GetScreeningsQuery,
  ): Promise<SuccessResponse> {
    this.logger.log(`Retrieving screenings for user: ${userId}`);

    const result = await this.screeningsRepository.getUserScreenings(
      userId,
      query,
    );

    return SuccessResponse.success(
      result,
      'User screenings retrieved successfully',
    );
  }

  @ServiceErrorHandler('Get screening by ID')
  async getScreeningById(id: string): Promise<SuccessResponse> {
    this.logger.log(`Retrieving screening: ${id}`);

    const screening = await this.screeningsRepository.getScreeningById(id);

    if (!screening) {
      throw new NotFoundException('Screening not found');
    }

    return SuccessResponse.success(
      screening,
      'Screening retrieved successfully',
    );
  }

  @ServiceErrorHandler('Get organization screenings')
  async getOrganizationScreenings(
    organizationId: string,
    query: GetScreeningsQuery,
  ): Promise<SuccessResponse> {
    this.logger.log(
      `Retrieving screenings for organization: ${organizationId}`,
    );

    const result = await this.screeningsRepository.getOrganizationScreenings(
      organizationId,
      query,
    );

    return SuccessResponse.success(
      result,
      'Organization screenings retrieved successfully',
    );
  }

  @ServiceErrorHandler('Get screening analytics')
  async getScreeningAnalytics(
    organizationId: string,
    timeframe?: { from: Date; to: Date },
  ): Promise<SuccessResponse> {
    this.logger.log(
      `Retrieving screening analytics for organization: ${organizationId}`,
    );

    const analytics = await this.screeningsRepository.getScreeningAnalytics(
      organizationId,
      timeframe,
    );

    return SuccessResponse.success(
      analytics,
      'Screening analytics retrieved successfully',
    );
  }

  // private async sendRiskNotification(
  //   user: IUserRequest['user'],
  //   riskLevel: 'low' | 'medium' | 'high' | 'critical',
  // ): Promise<void> {
  //   let title: string;
  //   let message: string;
  //   let shouldNotifyOrg = false;

  //   switch (riskLevel) {
  //     case 'critical':
  //       title = '🚨 Urgent Mental Health Support Needed';
  //       message =
  //         'Your screening indicates you may need immediate professional support. Please reach out to a counselor.';
  //       shouldNotifyOrg = true;
  //       break;
  //     case 'high':
  //       title = '⚠️ Mental Health Support Recommended';
  //       message =
  //         'Your screening suggests you might benefit from counseling support. Consider scheduling a session.';
  //       shouldNotifyOrg = true;
  //       break;
  //     case 'medium':
  //       title = '💙 Mental Health Check Complete';
  //       message =
  //         'Your screening shows some areas to monitor. Self-care and mindfulness practices may be helpful.';
  //       break;
  //     case 'low':
  //     default:
  //       title = '✅ Mental Health Check Complete';
  //       message =
  //         'Your screening shows stable mental health. Keep up the good work!';
  //   }

  //   const recipientIds = [user.id];

  //   // if (shouldNotifyOrg && user.organizationId) {
  //   //   // if the user is part of an organization, notify the organization as well
  //   // }

  //   await this.notificationsService.createNotification(
  //     {
  //       recipientIds,
  //       title,
  //       message,
  //       type: 'system',
  //       subType: 'general',
  //       // additional: {
  //       //   orgTitle: shouldNotifyOrg ? 'Mental Health Alert' : title,
  //       //   orgMessage: shouldNotifyOrg
  //       //     ? `High-risk screening detected for user.`
  //       //     : message,
  //       //   psychologistTitle: title,
  //       //   psychologistMessage: message,
  //       // },
  //     },
  //     user,
  //   );

  //   this.logger.log(
  //     `Risk notification sent for screening with risk level: ${riskLevel}`,
  //   );
  // }
}
