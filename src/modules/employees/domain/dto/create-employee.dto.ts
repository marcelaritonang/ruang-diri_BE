import { z } from 'zod';

export const EmployeeProfileUploadSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  department: z.string().min(1, { message: 'Departemen tidak boleh kosong' }),
  position: z.string().min(1, { message: 'Posisi tidak boleh kosong' }),
  gender: z.enum(['male', 'female']),
  yearsOfService: z.coerce
    .number()
    .int()
    .min(0, { message: 'Tahun bekerja tidak boleh negatif' }),
  birthDate: z.date().optional(),
});

export type EmployeeProfileUploadDto = z.infer<
  typeof EmployeeProfileUploadSchema
>;
