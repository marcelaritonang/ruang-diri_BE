// import { Injectable, Logger } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';

// import {
//   sanitizeTrainingSession,
//   formatAsJSONL,
//   encryptForAnalytics,
//   validateTrainingData,
//   DEFAULT_COUNSELING_SANITIZATION_RULES,
//   type TrainingSession,
//   type SanitizationRules,
// } from '../utils/training-sanitization.util';

// @Injectable()
// export class TrainingExportWorker {
//   private readonly logger = new Logger(TrainingExportWorker.name);

//   constructor(
//     private readonly configService: ConfigService,
//   ) {}

//   /**
//    * Process pending training export jobs
//    */
//   async processPendingExports(): Promise<void> {
//     try {
//       const pendingJobs =
//         await this.e2eRepository.getPendingTrainingExportJobs();

//       this.logger.log(`Processing ${pendingJobs.length} pending export jobs`);

//       for (const job of pendingJobs) {
//         try {
//           await this.processExportJob(job.id);
//         } catch (error) {
//           this.logger.error(
//             `Failed to process export job ${job.id}: ${error.message}`,
//           );
//           await this.e2eRepository.updateTrainingExportJobStatus(
//             job.id,
//             'failed',
//           );
//         }
//       }
//     } catch (error) {
//       this.logger.error(`Failed to process pending exports: ${error.message}`);
//     }
//   }

//   /**
//    * Process a single export job
//    */
//   async processExportJob(jobId: string): Promise<void> {
//     const job = await this.e2eRepository.getTrainingExportJob(jobId);
//     if (!job) {
//       throw new Error(`Export job ${jobId} not found`);
//     }

//     if (job.status !== 'pending') {
//       this.logger.warn(
//         `Export job ${jobId} is not pending (status: ${job.status})`,
//       );
//       return;
//     }

//     // Mark as in progress
//     await this.e2eRepository.updateTrainingExportJobStatus(
//       jobId,
//       'in_progress',
//     );

//     this.logger.log(
//       `Processing export job ${jobId} for session ${job.sessionId}`,
//     );

//     try {
//       let trainingData: TrainingSession;

//       if (job.exportType === 'client_side') {
//         // For client-side exports, we expect the client to have already uploaded the data
//         // This is just a placeholder - in practice, the client would handle this
//         throw new Error('Client-side exports should be handled by the client');
//       } else if (job.exportType === 'trusted_compute') {
//         // Server-side decryption and sanitization
//         trainingData = await this.performTrustedComputeExport(
//           job.sessionId,
//           job.sanitizationRules as SanitizationRules,
//         );
//       } else {
//         throw new Error(`Unknown export type: ${job.exportType}`);
//       }

//       // Validate the sanitized data
//       const validation = validateTrainingData([trainingData]);
//       if (!validation.isValid) {
//         throw new Error(
//           `Data validation failed: ${validation.errors.join(', ')}`,
//         );
//       }

//       // Format as JSONL
//       const jsonlData = formatAsJSONL([trainingData]);

//       // Encrypt for analytics
//       const encryptedData = await encryptForAnalytics(
//         jsonlData,
//         job.analyticsPublicKey,
//       );

//       // Upload to the presigned URL (placeholder implementation)
//       await this.uploadToAnalytics(job.uploadUrl || '', encryptedData);

//       // Mark as completed
//       await this.e2eRepository.updateTrainingExportJobStatus(
//         job.id,
//         'completed',
//         new Date(),
//       );

//       this.logger.log(`Export job ${jobId} completed successfully`);
//     } catch (error) {
//       this.logger.error(`Export job ${jobId} failed: ${error.message}`);
//       await this.e2eRepository.updateTrainingExportJobStatus(jobId, 'failed');
//       throw error;
//     }
//   }

//   /**
//    * Perform trusted compute export (server-side decryption)
//    * This should only be used in secure, audited environments
//    */
//   private async performTrustedComputeExport(
//     sessionId: string,
//     sanitizationRules: SanitizationRules,
//   ): Promise<TrainingSession> {
//     this.logger.warn(
//       `Performing trusted compute export for session ${sessionId} - ensure secure environment`,
//     );

//     // Get all envelopes for the session
//     const { envelopes } = await this.e2eRepository.getSessionEnvelopes(
//       sessionId,
//       1000,
//     );

//     if (envelopes.length === 0) {
//       throw new Error(`No envelopes found for session ${sessionId}`);
//     }

//     // Get session chains (we'd need the private keys to decrypt - this is a placeholder)
//     const sessionChains = await this.e2eRepository.getSessionChains(sessionId);

//     if (sessionChains.length === 0) {
//       throw new Error(`No session chains found for session ${sessionId}`);
//     }

//     // For trusted compute, we'd need access to the private keys
//     // This is a significant security consideration and should only be done
//     // in highly controlled environments with proper key management

//     // Placeholder: In a real implementation, you'd:
//     // 1. Retrieve device private keys from secure key management system
//     // 2. Unwrap the chain keys using the device private keys
//     // 3. Decrypt each envelope using the appropriate chain key

//     const messages: Array<{
//       role: 'user' | 'assistant';
//       content: string;
//       timestamp: string;
//     }> = [];

//     for (const envelope of envelopes) {
//       try {
//         // Placeholder decryption - in reality, you'd use the actual keys
//         const decryptedContent = `[Decrypted message ${envelope.seqNumber}]`;

//         // Determine role based on sender (this would need proper mapping)
//         const role = envelope.senderDeviceId.includes('psych')
//           ? 'assistant'
//           : 'user';

//         messages.push({
//           role: role as 'user' | 'assistant',
//           content: decryptedContent,
//           timestamp: envelope.sentAt.toISOString(),
//         });
//       } catch (error) {
//         this.logger.warn(
//           `Failed to decrypt envelope ${envelope.id}: ${error.message}`,
//         );
//       }
//     }

//     // Create the training session data
//     const sessionData = {
//       session_id: sessionId,
//       started_at: messages[0]?.timestamp || new Date().toISOString(),
//       ended_at:
//         messages[messages.length - 1]?.timestamp || new Date().toISOString(),
//       context: {
//         channel: 'counseling' as const,
//         locale: 'en',
//         consent: 'granted_at_registration' as const,
//       },
//       messages,
//       labels: {
//         intent: ['counseling'],
//         techniques: ['active_listening'],
//         outcome: 'completed',
//       },
//     };

//     // Apply sanitization
//     const sanitizedSession = sanitizeTrainingSession(
//       sessionData,
//       sanitizationRules,
//     );

//     return sanitizedSession;
//   }

//   /**
//    * Upload encrypted training data to analytics system
//    */
//   private async uploadToAnalytics(
//     uploadUrl: string,
//     encryptedData: string,
//   ): Promise<void> {
//     try {
//       // This is a placeholder implementation
//       // In practice, you'd use the actual upload URL and proper HTTP client

//       this.logger.log(
//         `Uploading ${encryptedData.length} bytes to analytics system`,
//       );

//       // Simulate upload delay
//       await new Promise((resolve) => setTimeout(resolve, 1000));

//       this.logger.log('Upload completed successfully');
//     } catch (error) {
//       throw new Error(`Failed to upload to analytics: ${error.message}`);
//     }
//   }

//   /**
//    * Create an export job for a completed session
//    */
//   async scheduleExportForSession(sessionId: string): Promise<void> {
//     try {
//       const analyticsPublicKey =
//         this.configService.get<string>('ANALYTICS_PUBLIC_KEY') ||
//         'placeholder_key';
//       const uploadUrl = `https://analytics.ruangdiri.com/upload/${sessionId}_${Date.now()}`;
//       const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

//       await this.e2eRepository.createTrainingExportJob({
//         sessionId,
//         exportType: 'trusted_compute',
//         status: 'pending',
//         sanitizationRules: DEFAULT_COUNSELING_SANITIZATION_RULES,
//         analyticsPublicKey,
//         uploadUrl,
//         expiresAt,
//       });

//       this.logger.log(`Export job scheduled for session ${sessionId}`);
//     } catch (error) {
//       this.logger.error(
//         `Failed to schedule export for session ${sessionId}: ${error.message}`,
//       );
//       throw error;
//     }
//   }

//   /**
//    * Cleanup expired export jobs
//    */
//   async cleanupExpiredJobs(): Promise<void> {
//     try {
//       const deletedCount = await this.e2eRepository.cleanupExpiredExportJobs();
//       if (deletedCount > 0) {
//         this.logger.log(`Cleaned up ${deletedCount} expired export jobs`);
//       }
//     } catch (error) {
//       this.logger.error(`Failed to cleanup expired jobs: ${error.message}`);
//     }
//   }

//   /**
//    * Generate export statistics
//    */
//   async getExportStatistics(): Promise<{
//     totalJobs: number;
//     pendingJobs: number;
//     completedJobs: number;
//     failedJobs: number;
//   }> {
//     // This would require additional repository methods to count jobs by status
//     // For now, return placeholder data
//     return {
//       totalJobs: 0,
//       pendingJobs: 0,
//       completedJobs: 0,
//       failedJobs: 0,
//     };
//   }
// }
