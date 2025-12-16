import { z } from 'zod';

export const psychologistUpdateSchema = z.object({
  licenseNumber: z.string().max(100).optional(),
  specialization: z.string().max(255).optional(),
  yearsOfExperience: z.string().optional(),
  bio: z.string().max(500).optional(),
  isExternal: z.boolean().optional(),
  location: z.string().max(255).optional(),
});

export const employeeUpdateSchema = z.object({
  employeeId: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),
  age: z.string().optional(),
  yearsOfService: z.string().optional(),
  guardianName: z.string().optional(),
  guardianContact: z.string().optional(),
  birthDate: z.string().optional(),
  birthPlace: z.string().optional(),
});

export const studentUpdateSchema = z.object({
  grade: z.string().optional(),
  classroom: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),
  nis: z.string().optional(),
  iqScore: z.string().optional(),
  iqCategory: z.string().optional(),
  guardianName: z.string().optional(),
  guardianContact: z.string().optional(),
  birthDate: z.string().optional(),
  birthPlace: z.string().optional(),
});

export const organizationUpdateSchema = z.object({
  type: z.enum(['school', 'company']).optional(),
  
  // ✅ Pastikan ini ada dan benar
  address: z.string()
    .max(500)
    .optional()
    .nullable()
    .transform(val => {
      if (!val || val.trim() === '') return null;
      return val.trim();
    }),
  
  phone: z.string()
    .max(20)
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        const cleaned = val.replace(/[\s\-\(\)]/g, '');
        return /^(\+?62|0)[0-9]{9,13}$/.test(cleaned);
      },
      { message: 'Invalid phone number format' }
    )
    .transform(val => {
      if (!val) return null;
      return val.replace(/[\s\-\(\)]/g, '');
    }),
});

export const baseUserUpdateSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email().optional(),
  profilePicture: z.string().optional(),
  password: z.string().min(6).optional(),
  isOnboarded: z.preprocess(
  (val) => {
    console.log('🔍 [DTO] isOnboarded input value:', val, 'type:', typeof val);
    
    if (typeof val === 'string') {
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === '1') {
        console.log('✅ [DTO] Converting string to true');
        return true;
      }
      if (lower === 'false' || lower === '0') {
        console.log('✅ [DTO] Converting string to false');
        return false;
      }
      console.log('⚠️ [DTO] Invalid string value, returning undefined');
      return undefined;
    }
    
    if (typeof val === 'number') {
      console.log('✅ [DTO] Converting number to boolean');
      return val === 1;
    }
    
    console.log('✅ [DTO] Returning value as-is:', val);
    return val;
  },
  z.boolean().optional()
),
});
