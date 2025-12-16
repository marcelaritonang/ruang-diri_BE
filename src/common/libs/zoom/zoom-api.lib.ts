import { catchError, firstValueFrom } from 'rxjs';
import type { AxiosError } from 'axios';

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

import { env } from '@/config/env.config';

@Injectable()
export class ZoomApiService {
  private readonly logger = new Logger(ZoomApiService.name);
  constructor(private readonly http: HttpService) {}

  async createMeeting(opts: {
    topic: string;
    type: number;
    start_time: string;
    duration: number;
  }) {
    const token = await this.getToken();

    const { data } = await firstValueFrom(
      this.http
        .post(`${env.ZOOM_API_BASE_URL}/users/me/meetings`, opts, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            if (error.response) {
              this.logger.error(
                `Zoom API error: ${error.response.status} - ${error.response.data}`,
              );
              throw 'An error happened!';
            } else {
              this.logger.error(`Zoom API error: ${error.message}`);
              throw 'An error happened!';
            }
          }),
        ),
    );

    this.logger.log(`Created Zoom meeting: ${data.id} - ${data.join_url}`);

    return data;
  }

  private async getToken(): Promise<string> {
    const {
      ZOOM_CLIENT_ID,
      ZOOM_CLIENT_SECRET,
      ZOOM_OAUTH_ENDPOINT,
      ZOOM_ACCOUNT_ID,
    } = env;

    const url = new URL(ZOOM_OAUTH_ENDPOINT);
    url.searchParams.set('grant_type', 'account_credentials');
    url.searchParams.set('account_id', ZOOM_ACCOUNT_ID);

    const basic = Buffer.from(
      `${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`,
    ).toString('base64');

    const { data } = await firstValueFrom(
      this.http
        .post(url.toString(), null, {
          headers: { Authorization: `Basic ${basic}` },
          timeout: 5000,
        })
        .pipe(
          catchError((err: AxiosError) => {
            this.logger.error(
              `Zoom OAuth token fetch failed: ${err.response?.status} – ${JSON.stringify(err.response?.data)}`,
            );
            throw new Error('Failed to fetch Zoom OAuth token');
          }),
        ),
    );

    return data.access_token;
  }
}
