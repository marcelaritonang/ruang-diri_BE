import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Query,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ZodPipe } from '@/common/pipes/zod-validation.pipe';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { multerConfigFactory } from '@/config/multer.config';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CloudStorageService } from '@/common/cloud-storage/cloud-storage.service';

import type { IUserRequest } from '@/modules/auth/strategies/jwt.strategy';

import {
  allowedDocumentTypes,
  allowedImageTypes,
  uploadSizes,
} from '@/common/constants/attachments.constant';

import { ChatService } from '../application/chat.service';
import {
  chatMessageDto,
  chatFileUploadDto,
  getChatHistoryDto,
  getChatHistoriesDto,
  ablyTokenRequestDto,
  updateUserPresenceDto,
  markMessageAsReadDto,
  typingIndicatorDto,
  type ChatMessageDto,
  type ChatFileUploadDto,
  type GetChatHistoryDto,
  type GetChatHistoriesDto,
  type AblyTokenRequestDto,
  type UpdateUserPresenceDto,
  type MarkMessageAsReadDto,
  type TypingIndicatorDto,
} from '../domain/dto/chat.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Chat')
@ApiBearerAuth()
@Controller({
  version: '1',
  path: 'chat',
})
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly cloudStorageService: CloudStorageService,
  ) {}

  @Post('sessions/check-overdue')
  @Roles('super_admin', 'psychologist')
  async checkOverdueSessions(@CurrentUser() user: IUserRequest['user']) {
    await this.chatService.checkAndActivateOverdueSessions();
    return { success: true, message: 'Checked and activated overdue sessions' };
  }

  @Post('sessions/:sessionId/force-activate')
  @Roles('super_admin', 'psychologist')
  async forceActivateSession(
    @CurrentUser() user: IUserRequest['user'],
    @Param('sessionId') sessionId: string,
  ) {
    await this.chatService.forceActivateSession(sessionId);
    return { success: true, message: 'Session force activated' };
  }

  @Get('ably-token')
  @Roles('client', 'student', 'employee', 'psychologist')
  async getAblyToken(
    @CurrentUser() user: IUserRequest['user'],
    @Query(new ZodPipe(ablyTokenRequestDto)) tokenRequest: AblyTokenRequestDto,
  ) {
    return this.chatService.generateAblyToken(user.id, tokenRequest);
  }

  @Post('messages')
  @Roles('client', 'student', 'employee', 'psychologist')
  async sendMessage(
    @CurrentUser() user: IUserRequest['user'],
    @Body(new ZodPipe(chatMessageDto)) messageDto: ChatMessageDto,
  ) {
    return this.chatService.sendMessage(
      { userId: user.id, userFullname: user.fullName },
      messageDto,
    );
  }

  @Post('messages/upload')
  @Roles('client', 'student', 'employee', 'psychologist')
  @UseInterceptors(
    FileInterceptor(
      'file',
      multerConfigFactory(
        'chat-attachments',
        [...allowedImageTypes, ...allowedDocumentTypes],
        uploadSizes['15MB'],
        3,
      ),
    ),
  )
  async sendFileMessage(
    @CurrentUser() user: IUserRequest['user'],
    @UploadedFile() file: Express.Multer.File,
    @Body(new ZodPipe(chatFileUploadDto)) fileDto: ChatFileUploadDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required for file/image messages');
    }

    return this.chatService.sendFileMessage(
      { userId: user.id, userFullname: user.fullName },
      fileDto,
      file,
      this.cloudStorageService,
    );
  }

  @Get('history')
  @Roles('client', 'student', 'employee', 'psychologist')
  async getChatHistory(
    @CurrentUser() user: IUserRequest['user'],
    @Query(new ZodPipe(getChatHistoryDto)) historyDto: GetChatHistoryDto,
  ) {
    return this.chatService.getChatHistory(user.id, historyDto);
  }

  @Get('histories')
  @Roles('client', 'student', 'employee', 'psychologist')
  async getChatHistories(
    @CurrentUser() user: IUserRequest['user'],
    @Query(new ZodPipe(getChatHistoriesDto)) query: GetChatHistoriesDto,
  ) {
    return this.chatService.searchChatHistories(
      user.id,
      query.search,
      query.limit,
      query.page,
    );
  }

  @Get('sessions/active')
  @Roles('client', 'student', 'employee', 'psychologist')
  async getActiveSessions(@CurrentUser() user: IUserRequest['user']) {
    return this.chatService.getUserActiveSessions(user.id, user.role);
  }

  @Post('typing')
  @Roles('client', 'student', 'employee', 'psychologist')
  async sendTypingIndicator(
    @CurrentUser() user: IUserRequest['user'],
    @Body(new ZodPipe(typingIndicatorDto)) body: TypingIndicatorDto,
  ) {
    await this.chatService.handleTypingIndicator(
      user.id,
      user.fullName,
      body.sessionId,
      body.isTyping,
    );
    return { success: true };
  }

  @Get('unread-count/total')
  @Roles('client', 'student', 'employee', 'psychologist')
  async getTotalUnreadCount(@CurrentUser() user: IUserRequest['user']) {
    return this.chatService.getTotalUnreadCount(user.id, user.role);
  }

  @Get('sessions/:sessionId/unread-count')
  @Roles('client', 'student', 'employee', 'psychologist')
  async getUnreadMessageCount(
    @CurrentUser() user: IUserRequest['user'],
    @Param('sessionId') sessionId: string,
  ) {
    return this.chatService.getUnreadMessageCount(user.id, sessionId);
  }

  @Get('session/:sessionId/attachments')
  @Roles('client', 'student', 'employee', 'psychologist')
  async getAttachmentsBySessionId(@Param('sessionId') sessionId: string) {
    return this.chatService.getAttachmentsBySessionId(sessionId);
  }

  @Put('sessions/:sessionId/end')
  @Roles('psychologist')
  async endChatSession(
    @CurrentUser() user: IUserRequest['user'],
    @Param('sessionId') sessionId: string,
  ) {
    return this.chatService.endChatSession(user.id, sessionId);
  }

  @Put('sessions/:sessionId/enable')
  @Roles('psychologist', 'super_admin')
  async enableChatSession(
    @CurrentUser() user: IUserRequest['user'],
    @Param('sessionId') sessionId: string,
  ) {
    await this.chatService.enableChatForSession(sessionId);
    return { success: true, message: 'Chat session enabled successfully' };
  }

  @Get('sessions/:sessionId/status')
  @Roles('client', 'student', 'employee', 'psychologist', 'super_admin')
  async getChatSessionStatus(
    @CurrentUser() user: IUserRequest['user'],
    @Param('sessionId') sessionId: string,
  ) {
    return this.chatService.getChatSessionStatus(user.id, sessionId);
  }

  @Put('sessions/:sessionId/read')
  @Roles('client', 'student', 'employee', 'psychologist')
  async markMessagesAsRead(
    @CurrentUser() user: IUserRequest['user'],
    @Param('sessionId') sessionId: string,
  ) {
    return this.chatService.markMessagesAsRead(user.id, sessionId);
  }

  @Put('sessions/:sessionId/presence')
  @Roles('client', 'student', 'employee', 'psychologist')
  async updateUserPresence(
    @CurrentUser() user: IUserRequest['user'],
    @Param('sessionId') sessionId: string,
    @Body(new ZodPipe(updateUserPresenceDto)) body: UpdateUserPresenceDto,
  ) {
    return this.chatService.updateUserPresence(
      sessionId,
      user.id,
      user.fullName,
      body.status,
    );
  }

  @Put('sessions/:sessionId/messages/read')
  @Roles('client', 'student', 'employee', 'psychologist')
  async markMessageAsRead(
    @CurrentUser() user: IUserRequest['user'],
    @Param('sessionId') sessionId: string,
    @Body(new ZodPipe(markMessageAsReadDto)) body: MarkMessageAsReadDto,
  ) {
    return this.chatService.markMessagesAsRead(user.id, sessionId);
  }

  @Get('sessions/:sessionId/channel-history')
  @Roles('client', 'student', 'employee', 'psychologist')
  async getChannelHistory(
    @CurrentUser() user: IUserRequest['user'],
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: string,
  ) {
    const historyLimit = limit ? parseInt(limit) : 10;
    return this.chatService.getChannelHistory(user.id, sessionId, historyLimit);
  }

  @Post('sessions/:sessionId/upload-url')
  @Roles('client', 'student', 'employee', 'psychologist')
  async generatePresignedUploadUrl(
    @CurrentUser() user: IUserRequest['user'],
    @Param('sessionId') sessionId: string,
    @Body()
    body: {
      fileId: string;
      contentType: string;
      fileSize: number;
    },
  ) {
    if (!body.fileId || !body.contentType || !body.fileSize) {
      throw new BadRequestException(
        'fileId, contentType, and fileSize are required',
      );
    }

    return this.chatService.generatePresignedUploadUrl(user.id, sessionId, {
      fileId: body.fileId,
      contentType: body.contentType,
      fileSize: body.fileSize,
    });
  }
}
