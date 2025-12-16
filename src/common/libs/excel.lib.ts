import * as xlsx from 'xlsx';
import { BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ExcelLib {
  static convertExcelToJson<T>(file: Buffer): T[] {
    const workbook = xlsx.read(file, {
      type: 'buffer',
      cellFormula: false,
      cellText: false,
      cellNF: false,
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert semua cell formula ke nilai literal
    for (const key in worksheet) {
      const cell = worksheet[key];
      if (cell && typeof cell === 'object' && 'f' in cell && 'v' in cell) {
        // buang formula, pake value-nya aja
        delete cell.f;
      }
    }

    return xlsx.utils
      .sheet_to_json(worksheet, { defval: null })
      .filter((row: any) =>
        Object.values(row).some(
          (val) =>
            val !== null && val !== undefined && String(val).trim() !== '',
        ),
      ) as T[];
  }

  /**
   * Normalize and map keys from Excel column names
   */
  static normalizeKeys<T>(row: unknown, keyMap: Record<string, keyof T>): T {
    return Object.fromEntries(
      Object.entries(row as Record<string, any>).map(([key, value]) => {
        const cleanKey = key.replace(/[^a-zA-Z0-9_\s]/g, '');

        const normalizedKey = cleanKey
          .trim()
          .replace(/\s+/g, '_')
          .toLowerCase();

        const mappedKey = keyMap[normalizedKey] || normalizedKey;
        return [mappedKey, value];
      }),
    ) as T;
  }

  /**
   * Parse and validate Excel data in a generic, reusable way
   */
  static parseExcel<T>({
    buffer,
    keyMap,
    valueTranslator,
    schema,
    label,
  }: {
    buffer: Buffer;
    keyMap: Record<string, keyof T>;
    valueTranslator?: (row: any) => any;
    schema: ZodSchema<T>;
    label: string;
  }): T[] {
    const rawRows = this.convertExcelToJson<any>(buffer);
    const validated: T[] = [];

    // Filter out completely empty rows
    const nonEmptyRows = rawRows.filter((row) => {
      return Object.values(row).some(
        (val) => val !== null && val !== undefined,
      );
    });

    for (const [i, row] of nonEmptyRows.entries()) {
      try {
        const normalized = this.normalizeKeys<T>(row, keyMap);
        const translated = valueTranslator
          ? valueTranslator(normalized)
          : normalized;

        const parsed = schema.safeParse(translated);

        if (!parsed.success) {
          throw new BadRequestException(
            `${label} Row ${i + 2}: ${JSON.stringify(parsed.error.issues)}`,
          );
        }

        validated.push(parsed.data);
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(
          `${label} Row ${i + 2}: Error processing row - ${error.message}`,
        );
      }
    }

    return validated;
  }

  /**
   * Translate gender from 'L' / 'P' to 'male' / 'female'
   */
  static translateGender(gender: string): 'male' | 'female' | undefined {
    if (gender === 'L') return 'male';
    if (gender === 'P') return 'female';
    return undefined;
  }

  /**
   * Translate screening status (in Indonesian) to English enum
   */
  static translateScreeningStatus(
    status: string,
  ): 'stable' | 'at_risk' | 'monitored' | 'not_screened' | undefined {
    const map: Record<string, string> = {
      Stabil: 'stable',
      Berisiko: 'at_risk',
      'Dalam Pemantauan': 'monitored',
      'Belum Disaring': 'not_screened',
    };
    return map[status] as any;
  }

  /**
   * Translate counseling status (Sudah = true)
   */
  static translateCounselingStatus(status: string): boolean {
    return status?.trim()?.toLowerCase() === 'sudah';
  }

  static excelDateToTimestamp(excelDate: any): string | undefined {
    if (!excelDate) return undefined;

    if (typeof excelDate === 'number') {
      const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
      return date.toISOString(); // "YYYY-MM-DDTHH:mm:ss.sssZ"
    }

    if (excelDate instanceof Date && !isNaN(excelDate.getTime())) {
      return excelDate.toISOString();
    }

    const parsed = new Date(excelDate);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }

    return undefined;
  }

  static parseDateStringToTimestamp(dateStr: string): string | undefined {
    const [day, month, year] = dateStr.split('/').map(Number);
    if (!day || !month || !year) return undefined;

    const date = new Date(year, month - 1, day);
    return !isNaN(date.getTime()) ? date.toISOString() : undefined;
  }
}
