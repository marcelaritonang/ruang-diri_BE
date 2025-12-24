import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import dayjs from 'dayjs';

import type { PsychologistQuerySchema } from './interfaces/http/queries/psychologist.query';
import { Success, SuccessResponse } from '@/common/utils/response.util';

import { PsychologistRepository } from './psychologist-profile.repository';
import {
  expertiseAreas,
  specializationTypes,
} from './psychologist-profile.schema';
import { AvailabilityService } from './services/availability.service';
import type {
  PsychologistCardResponse,
  PsychologistListResponse,
} from './interfaces/http/responses/psychologist.response';

const TZ_MAP: Record<string, string> = {
  WIB: 'Asia/Jakarta', // UTC+7
  WITA: 'Asia/Makassar', // UTC+8
  WIT: 'Asia/Jayapura', // UTC+9
  'Asia/Jakarta': 'Asia/Jakarta',
  'Asia/Makassar': 'Asia/Makassar',
  'Asia/Jayapura': 'Asia/Jayapura',
};

// Helper function to normalize timezone
const normalizeTimezone = (timezone: string | null): string => {
  if (!timezone) return 'Asia/Jakarta';
  return TZ_MAP[timezone] || timezone;
};

@Injectable()
export class PsychologistsService {
  private readonly logger = new Logger(PsychologistsService.name);

  constructor(
    private psychologistRepository: PsychologistRepository,
    private availabilityService: AvailabilityService,
  ) {}

  async getLocations(): Promise<{ locations: string; address: string }[]> {
    try {
      const locations = await this.psychologistRepository.getLocations();

      return locations
        .map((loc) => ({
          locations: loc.location,
          address: loc.address,
        }))
        .filter(
          (loc): loc is { locations: string; address: string } =>
            typeof loc === 'object',
        );
    } catch (error) {
      throw new NotFoundException('No locations found for psychologists');
    }
  }

  async getExpertiseAreas(): Promise<Success<string[]>> {
    try {
      return SuccessResponse.success(
        [...expertiseAreas],
        'Expertise areas retrieved successfully',
      );
    } catch (error) {
      this.logger.error('Error retrieving expertise areas:', error);
      throw new NotFoundException('Failed to retrieve expertise areas');
    }
  }

  async getSpecializations(): Promise<Success<string[]>> {
    try {
      return SuccessResponse.success(
        [...specializationTypes],
        'Specializations retrieved successfully',
      );
    } catch (error) {
      this.logger.error('Error retrieving specializations:', error);
      throw new NotFoundException('Failed to retrieve specializations');
    }
  }

  async getPsychologists(
    query: PsychologistQuerySchema,
  ): Promise<Success<PsychologistListResponse>> {
    try {
      const psychologists =
        await this.psychologistRepository.getPsychologists(query);

      if (!psychologists.data.length) {
        return SuccessResponse.success(
          {
            data: [],
            metadata: {
              page: query.page || 1,
              limit: query.limit || 10,
              total: 0,
              hasNext: false,
              hasPrev: false,
            },
          },
          'No psychologists found',
        );
      }

      const cards: PsychologistCardResponse[] = psychologists.data.map(
        (psych) => ({
          id: psych.id,
          name: psych.fullName || '',
          titles: this.extractTitles(psych.fullName),
          avatar: psych.profilePicture,
          primarySpecialty:
            psych.primarySpecialty || psych.specialization || 'General',
          specialties: psych.fieldOfExpertise
            ? this.parseSpecialties(psych.fieldOfExpertise)
            : [],
          yearsOfPractice: psych.yearsOfPractice || 0,
          licenseNumber: psych.sippNumber || psych.registrationNumber,
          isActive: psych.isActive,
          hasAvailability: psych.hasAvailability || false,
          nextAvailableAt: psych.nextAvailableAt,
          sessionTypes: this.parseSessionTypes(psych.counselingMethod),
          pricePerSession: psych.pricePerSession,
          location: psych.location,
          address: psych.address,
        }),
      );

      const response: PsychologistListResponse = {
        data: cards,
        metadata: {
          page: psychologists.metadata.page,
          limit: psychologists.metadata.limit,
          total: psychologists.metadata.totalData,
          hasNext: psychologists.metadata.hasNextPage,
          hasPrev: psychologists.metadata.hasPreviousPage,
        },
      };

      return SuccessResponse.success(
        response,
        'Psychologists retrieved successfully',
      );
    } catch (error) {
      this.logger.error('Error in getPsychologists:', error);
      throw new NotFoundException(
        error instanceof Error
          ? error.message
          : 'An error occurred while fetching psychologists',
      );
    }
  }

  /**
   * Extract titles from full name (e.g., "Dr. Sarah Wijaya, M.Psi" -> "Dr., M.Psi")
   */
  private extractTitles(fullName: string | null): string {
    if (!fullName) return '';

    const titlePatterns = [
      /^(Dr\.|Prof\.|Drs\.|Drg\.)/i,
      /(M\.Psi|M\.Si|S\.Psi|S\.Si|Ph\.D|M\.A|M\.S)\.?/gi,
      /(Psikolog)/i,
    ];

    const titles: string[] = [];

    titlePatterns.forEach((pattern) => {
      const matches = fullName.match(pattern);
      if (matches) {
        titles.push(...matches);
      }
    });

    return titles.join(', ');
  }

  /**
   * Parse specialties from JSON field
   */
  private parseSpecialties(fieldOfExpertise: any): string[] {
    if (!fieldOfExpertise) return [];

    let specialties: string[] = [];

    if (typeof fieldOfExpertise === 'string') {
      try {
        specialties = JSON.parse(fieldOfExpertise);
      } catch {
        specialties = [fieldOfExpertise];
      }
    } else if (Array.isArray(fieldOfExpertise)) {
      specialties = fieldOfExpertise;
    }

    return specialties.filter((s) => typeof s === 'string');
  }

  /**
   * Parse counseling method JSON to session types array
   */
  private parseSessionTypes(
    counselingMethod: any,
  ): ('online' | 'chat' | 'offline')[] {
    if (!counselingMethod) return [];

    let methods: string[] = [];

    if (typeof counselingMethod === 'string') {
      try {
        methods = JSON.parse(counselingMethod);
      } catch {
        methods = [counselingMethod];
      }
    } else if (Array.isArray(counselingMethod)) {
      methods = counselingMethod;
    }

    const validTypes: ('online' | 'chat' | 'offline')[] = [];

    methods.forEach((method) => {
      const lowerMethod = method.toLowerCase();
      if (
        lowerMethod === 'online' ||
        lowerMethod === 'chat' ||
        lowerMethod === 'offline'
      ) {
        validTypes.push(lowerMethod as 'online' | 'chat' | 'offline');
      }
    });

    return validTypes;
  }

  async getPsychologistDetails(psychologistId: string): Promise<Success<any>> {
    try {
      const psychologist =
        await this.psychologistRepository.getPsychologistById(psychologistId);

      if (!psychologist) {
        throw new NotFoundException(
          `Psychologist with ID ${psychologistId} not found`,
        );
      }

      const fromDate = dayjs().format('YYYY-MM-DD');
      const toDate = dayjs().add(30, 'days').format('YYYY-MM-DD');

      const availabilityInfo =
        await this.availabilityService.getDetailedAvailability(
          psychologistId,
          fromDate,
          toDate,
        );

      const detailedPsychologist = {
        id: psychologist.id,
        name: psychologist.fullName,
        titles: this.extractTitles(psychologist.fullName),
        avatar: psychologist.profilePicture,
        bio: psychologist.bio,
        specialization: psychologist.specialization,
        specialties: psychologist.fieldOfExpertise
          ? this.parseSpecialties(psychologist.fieldOfExpertise)
          : [],
        yearsOfPractice: psychologist.yearsOfExperience || 0,
        licenseNumber:
          psychologist.sippNumber || psychologist.registrationNumber,
        registrationNumber: psychologist.registrationNumber,
        isActive: psychologist.isActive,
        isExternal: psychologist.isExternal,
        location: psychologist.location,
        address: psychologist.address,
        sessionTypes: this.parseSessionTypes(psychologist.counselingMethod),
        pricePerSession: psychologist.pricePerSession,
        licenseValidUntil: psychologist.licenseValidUntil,
        practiceStartDate: psychologist.practiceStartDate,
        availability: availabilityInfo,
        createdAt: psychologist.createdAt,
        updatedAt: psychologist.updatedAt,
      };

      return SuccessResponse.success(
        detailedPsychologist,
        'Psychologist details retrieved successfully',
      );
    } catch (error) {
      this.logger.error('Error in getPsychologistDetails:', error);
      throw new NotFoundException(
        error instanceof Error
          ? error.message
          : 'An error occurred while fetching psychologist details',
      );
    }
  }

  async getAllPsychologistAvailability(): Promise<Success<any>> {
    try {
      const [availability] = await Promise.all([
        this.psychologistRepository.getAllPsychologistAvailability(),
      ]);

      if (!availability.length) {
        throw new NotFoundException('No psychologist availability found');
      }

      const fromUtc = dayjs().utc().startOf('day');
      const toUtc = dayjs().utc().add(30, 'days').endOf('day'); // untuk 30 hari ke depan

      const sessionsByPsy: Record<
        string,
        Array<{
          psychologistId: string;
          startDateTime: string | Date;
          endDateTime: string | Date;
        }>
      > = {};
      // for (const s of scheduledSessions) {
      //   const id = s.psychologistId;
      //   if (!sessionsByPsy[id]) sessionsByPsy[id] = [];
      //   sessionsByPsy[id].push(s);
      // }

      const datesForDowInTz = (dow: number, tz: string) => {
        const out: string[] = [];
        let curTz = fromUtc.clone().tz(tz).startOf('day');
        const endTz = toUtc.clone().tz(tz).endOf('day');
        while (curTz.isBefore(endTz)) {
          if (curTz.day() === dow) out.push(curTz.format('YYYY-MM-DD'));
          curTz = curTz.add(1, 'day');
        }
        return out;
      };

      const overlaps = (
        dateISO: string,
        slotStart: string,
        slotEnd: string,
        sesStartISO: string | Date,
        sesEndISO: string | Date,
        tz: string,
      ) => {
        const s1Utc = dayjs
          .tz(`${dateISO} ${slotStart}`, 'YYYY-MM-DD HH:mm:ss', tz)
          .utc();
        const e1Utc = dayjs
          .tz(`${dateISO} ${slotEnd}`, 'YYYY-MM-DD HH:mm:ss', tz)
          .utc();
        const s2Utc = dayjs.utc(sesStartISO);
        const e2Utc = dayjs.utc(sesEndISO);
        return s1Utc.isBefore(e2Utc) && s2Utc.isBefore(e1Utc);
      };

      const weekIndexFor = (dISO: string, tz: string) => {
        const startWeekTz = fromUtc.clone().tz(tz).startOf('week');
        const diffDays = dayjs
          .tz(dISO + ' 00:00:00', 'YYYY-MM-DD HH:mm:ss', tz)
          .diff(startWeekTz, 'day');
        return Math.floor(diffDays / 7);
      };

      const expanded: Array<{
        date: string;
        weekIndex: number;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        timezone: string;
        psychologist: { id: string; fullName: string };
        scheduledSessions: Array<{
          psychologistId: string;
          startDateTime: string | Date;
          endDateTime: string | Date;
        }>;
        hasScheduledSessions: boolean;
      }> = [];

      const seen = new Set<string>();

      for (const slot of availability) {
        const { dayOfWeek, startTime, endTime, timezone, psychologist } = slot;
        const psyId = psychologist?.id;
        if (!psyId) continue;

        const tz = normalizeTimezone(timezone as string | null);
        const dowNumber =
          typeof dayOfWeek === 'number'
            ? dayOfWeek
            : Object.values(dayOfWeek || {})[0] || 0;
        const dates = datesForDowInTz(dowNumber, tz as string);
        const psySessions = sessionsByPsy[psyId] || [];

        for (const dISO of dates) {
          const key = `${psyId}|${tz}|${dISO}|${startTime}|${endTime}`;
          if (seen.has(key)) continue;

          const matched = psySessions.filter((s) =>
            overlaps(
              dISO,
              startTime as string,
              endTime as string,
              s.startDateTime,
              s.endDateTime,
              tz as string,
            ),
          );

          expanded.push({
            date: dISO,
            weekIndex: weekIndexFor(dISO, tz as string),
            dayOfWeek: dayOfWeek as unknown as number,
            startTime,
            endTime,
            timezone: tz as string,
            psychologist: psychologist as any,
            scheduledSessions: matched,
            hasScheduledSessions: matched.length > 0,
          });

          seen.add(key);
        }
      }

      const aggregatedResponse = this.aggregateAvailabilityBySlot(expanded);

      return SuccessResponse.success(
        {
          ...aggregatedResponse,
          dateRange: {
            from: fromUtc.format('YYYY-MM-DD'),
            to: toUtc.format('YYYY-MM-DD'),
          },
        },
        'Psychologist availability with scheduled sessions, next 4 weeks',
      );
    } catch (error) {
      throw new NotFoundException(
        error instanceof Error
          ? error.message
          : 'Error while fetching psychologist availability',
      );
    }
  }

  private aggregateAvailabilityBySlot(
    expanded: Array<{
      date: string;
      weekIndex: number;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      timezone: string;
      psychologist: { id: string; fullName: string };
      scheduledSessions: Array<{
        psychologistId: string;
        startDateTime: string | Date;
        endDateTime: string | Date;
      }>;
      hasScheduledSessions: boolean;
    }>,
  ) {
    const slotAggregation = new Map<
      string,
      {
        date: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        timezone: string;
        totalPsychologists: number;
        availablePsychologists: number;
        bookedPsychologists: number;
        availablePsychologistIds: string[];
        bookedPsychologistIds: string[];
      }
    >();

    expanded.forEach((slot) => {
      const slotKey = `${slot.date}|${slot.startTime}|${slot.endTime}`;

      if (!slotAggregation.has(slotKey)) {
        slotAggregation.set(slotKey, {
          date: slot.date,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          timezone: slot.timezone,
          totalPsychologists: 0,
          availablePsychologists: 0,
          bookedPsychologists: 0,
          availablePsychologistIds: [],
          bookedPsychologistIds: [],
        });
      }

      const aggregated = slotAggregation.get(slotKey)!;

      aggregated.totalPsychologists++;

      if (slot.hasScheduledSessions) {
        aggregated.bookedPsychologists++;
        aggregated.bookedPsychologistIds.push(slot.psychologist.id);
      } else {
        aggregated.availablePsychologists++;
        aggregated.availablePsychologistIds.push(slot.psychologist.id);
      }
    });

    const availability = Array.from(slotAggregation.values()).sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

    const availabilityByDate = new Map<string, typeof availability>();
    availability.forEach((slot) => {
      if (!availabilityByDate.has(slot.date)) {
        availabilityByDate.set(slot.date, []);
      }
      availabilityByDate.get(slot.date)!.push(slot);
    });

    return {
      availability: Array.from(availabilityByDate.entries()).map(
        ([date, slots]) => ({
          date,
          dayOfWeek: slots[0].dayOfWeek,
          timeSlots: slots.map((slot) => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            timezone: slot.timezone,
            totalPsychologists: slot.totalPsychologists,
            availablePsychologists: slot.availablePsychologists,
            bookedPsychologists: slot.bookedPsychologists,
            availablePsychologistIds: slot.availablePsychologistIds, // ✅ ADDED: Return available psychologist IDs
            bookedPsychologistIds: slot.bookedPsychologistIds, // ✅ ADDED: Return booked psychologist IDs
          })),
        }),
      ),
    };
  }

  async getPsychologistAvailability(
    psychologistId: string,
  ): Promise<Success<any>> {
    try {
      const startTime = Date.now();

      const result =
        await this.psychologistRepository.getPsychologistAvailabilityWithSchedules(
          psychologistId,
        );

      const queryTime = Date.now() - startTime;

      if (!result.availability.length) {
        throw new NotFoundException(
          `No availability found for psychologist ${psychologistId}`,
        );
      }

      const scheduledSessionsByPsychologist = result.scheduledSessions.reduce(
        (acc, session) => {
          if (!acc[session.psychologistId]) {
            acc[session.psychologistId] = [];
          }
          acc[session.psychologistId].push(session);
          return acc;
        },
        {} as Record<string, typeof result.scheduledSessions>,
      );

      const enhancedAvailability = result.availability.map((slot) => {
        const psychologistId = slot.psychologist?.id;
        const psychologistSessions = psychologistId
          ? scheduledSessionsByPsychologist[psychologistId] || []
          : [];

        return {
          ...slot,
          scheduledSessions: psychologistSessions,
          hasScheduledSessions: psychologistSessions.length > 0,
        };
      });

      const today = dayjs().startOf('day');
      const fourWeeksAhead = dayjs().add(4, 'weeks').endOf('day');

      this.logger.log({
        psychologistId,
        performance: {
          parallelQueryTimeMs: queryTime,
        },
        dateRange: {
          from: today.format('YYYY-MM-DD'),
          to: fourWeeksAhead.format('YYYY-MM-DD'),
        },
        availabilityCount: result.availability.length,
        scheduledSessionsCount: result.scheduledSessions.length,
      });

      return SuccessResponse.success(
        {
          psychologistId,
          availability: enhancedAvailability,
          scheduledSessions: result.scheduledSessions,
          dateRange: {
            from: today.format('YYYY-MM-DD'),
            to: fourWeeksAhead.format('YYYY-MM-DD'),
          },
        },
        `Availability for psychologist ${psychologistId} (next 4 weeks) retrieved successfully`,
      );
    } catch (error) {
      throw new NotFoundException(
        error instanceof Error
          ? error.message
          : `An error occurred while fetching availability for psychologist ${psychologistId}`,
      );
    }
  }
}
