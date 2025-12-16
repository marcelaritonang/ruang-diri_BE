export interface CreateScreeningPayload {
  answers: number[];
}

export interface ScreeningResponse {
  id: string;
  userId: string;
  date: string;
  screeningStatus: 'stable' | 'at_risk' | 'monitored' | 'not_screened';
  depressionScore: number;
  anxietyScore: number;
  stressScore: number;
  depressionCategory: string;
  anxietyCategory: string;
  stressCategory: string;
  overallRisk: string;
  answers: number[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export type CreateScreeningResponse = ApiResponse<ScreeningResponse>;

export const ANSWER_VALUES = {
  NEVER: 0,
  SOMETIMES: 1,
  OFTEN: 2,
  ALMOST_ALWAYS: 3,
} as const;

export const ANSWER_LABELS = {
  0: 'Tidak Pernah',
  1: 'Terkadang',
  2: 'Sering',
  3: 'Sangat Sering',
} as const;

export const RISK_CATEGORIES = {
  STABLE: 'Stabil',
  MILD: 'Ringan',
  MODERATE: 'Sedang',
  CONCERNING: 'Mengkhawatirkan',
  EXTREMELY_CONCERNING: 'Sangat Mengkhawatirkan',
} as const;

export const SCREENING_STATUS = {
  STABLE: 'stable',
  AT_RISK: 'at_risk',
  MONITORED: 'monitored',
  NOT_SCREENED: 'not_screened',
} as const;

export const DASS21_QUESTION_MAPPING = {
  DEPRESSION_INDICES: [0, 1, 2, 3, 4, 5, 6],
  ANXIETY_INDICES: [7, 8, 9, 10, 11, 12, 13],
  STRESS_INDICES: [14, 15, 16, 17, 18, 19, 20],
  TOTAL_QUESTIONS: 21,
} as const;

export function validateAnswers(answers: number[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Array.isArray(answers)) {
    errors.push('Answers must be an array');
    return { valid: false, errors };
  }

  if (answers.length !== DASS21_QUESTION_MAPPING.TOTAL_QUESTIONS) {
    errors.push(
      `DASS-21 assessment requires exactly ${DASS21_QUESTION_MAPPING.TOTAL_QUESTIONS} answers`,
    );
  }

  answers.forEach((answer, index) => {
    if (!Number.isInteger(answer) || answer < 0 || answer > 3) {
      errors.push(
        `Answer at index ${index} must be an integer between 0 and 3`,
      );
    }
  });

  return { valid: errors.length === 0, errors };
}

export const SAMPLE_PAYLOADS = {
  LOW_RISK: {
    answers: [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1],
  },
  MODERATE_RISK: {
    answers: [1, 2, 1, 2, 1, 1, 0, 2, 1, 2, 1, 2, 1, 1, 2, 2, 2, 1, 2, 1, 2],
  },
  HIGH_RISK: {
    answers: [3, 3, 2, 3, 2, 3, 2, 2, 3, 2, 3, 3, 2, 3, 3, 3, 3, 2, 3, 2, 3],
  },
} as const;
