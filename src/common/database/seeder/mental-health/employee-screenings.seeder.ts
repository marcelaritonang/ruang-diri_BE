import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { InferInsertModel } from 'drizzle-orm';

import { env } from '@/config/env.config';
import { users } from '@/modules/users/domain/users.schema';
import { screenings } from '@/modules/mental-health/domain/screenings/screenings.schema';
import { SEVERITY_LEVELS } from '@/modules/mental-health/constants/dass21.constant';

if (env.NODE_ENV !== 'production') {
  const dotenv = require('dotenv');
  dotenv.config({
    path: `${process.cwd()}/.env.${env.NODE_ENV ?? 'development'}`,
  });
}

const SCREENING_SAMPLES = {
  STABLE_LOW: [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1],
  STABLE_NORMAL: [
    0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0,
  ],
  MILD_RISK: [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  MODERATE_RISK: [
    1, 2, 1, 2, 1, 1, 0, 2, 1, 2, 1, 2, 1, 1, 2, 2, 2, 1, 2, 1, 2,
  ],
  HIGH_STRESS: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 3, 2, 3, 2, 3, 2, 3],
  HIGH_ANXIETY: [1, 1, 1, 1, 1, 1, 1, 2, 3, 2, 3, 2, 3, 2, 1, 1, 1, 1, 1, 1, 1],
  HIGH_DEPRESSION: [
    2, 3, 2, 3, 2, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  ],
  CRITICAL_RISK: [
    3, 3, 2, 3, 2, 3, 2, 2, 3, 2, 3, 3, 2, 3, 3, 3, 3, 2, 3, 2, 3,
  ],
} as const;

interface DassScore {
  score: number;
  category: string;
  severity: string;
  color: string;
}

interface DassAssessmentSummary {
  depression: DassScore;
  anxiety: DassScore;
  stress: DassScore;
  overallRisk: string;
  totalScore: number;
  recommendedAction: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

function calculateDassScoresWithService(
  answers: number[],
): DassAssessmentSummary {
  if (answers.length !== 21) {
    throw new Error('DASS-21 requires exactly 21 answers');
  }

  const depressionIndices = [0, 1, 2, 3, 4, 5, 6];
  const anxietyIndices = [7, 8, 9, 10, 11, 12, 13];
  const stressIndices = [14, 15, 16, 17, 18, 19, 20];

  const depressionScore = sumScores(answers, depressionIndices);
  const anxietyScore = sumScores(answers, anxietyIndices);
  const stressScore = sumScores(answers, stressIndices);

  const depression = getSeverityInfo('depression', depressionScore);
  const anxiety = getSeverityInfo('anxiety', anxietyScore);
  const stress = getSeverityInfo('stress', stressScore);

  const totalScore = depressionScore + anxietyScore + stressScore;
  const overallRisk = determineOverallRisk([
    depression.severity,
    anxiety.severity,
    stress.severity,
  ]);
  const riskLevel = determineRiskLevel(overallRisk);
  const recommendedAction = getRecommendedAction(riskLevel, {
    depression,
    anxiety,
    stress,
  });

  return {
    depression,
    anxiety,
    stress,
    overallRisk,
    totalScore,
    recommendedAction,
    riskLevel,
  };
}

function sumScores(answers: number[], indices: number[]): number {
  return indices.reduce((sum, index) => sum + (answers[index] || 0), 0);
}

function getSeverityInfo(
  category: keyof typeof SEVERITY_LEVELS,
  score: number,
): DassScore {
  const levels = SEVERITY_LEVELS[category];
  const severityLevel =
    levels.find(
      (level) => score >= level.range[0] && score <= level.range[1],
    ) || levels[levels.length - 1];

  return {
    score,
    category,
    severity: severityLevel.label,
    color: severityLevel.color,
  };
}

function determineOverallRisk(severities: string[]): string {
  if (severities.includes('Sangat Mengkhawatirkan'))
    return 'Sangat Mengkhawatirkan';
  if (severities.includes('Mengkhawatirkan')) return 'Mengkhawatirkan';
  if (severities.includes('Sedang')) return 'Sedang';
  if (severities.includes('Ringan')) return 'Ringan';
  return 'Stabil';
}

function determineRiskLevel(
  overallRisk: string,
): 'low' | 'medium' | 'high' | 'critical' {
  switch (overallRisk) {
    case 'Sangat Mengkhawatirkan':
      return 'critical';
    case 'Mengkhawatirkan':
      return 'high';
    case 'Sedang':
      return 'medium';
    case 'Ringan':
    case 'Stabil':
    default:
      return 'low';
  }
}

function getRecommendedAction(
  riskLevel: 'low' | 'medium' | 'high' | 'critical',
  scores: { depression: DassScore; anxiety: DassScore; stress: DassScore },
): string {
  switch (riskLevel) {
    case 'critical':
      return 'Segera hubungi konselor atau profesional kesehatan mental. Anda memerlukan dukungan profesional sesegera mungkin.';
    case 'high':
      return 'Sangat disarankan untuk berkonsultasi dengan konselor. Jadwalkan sesi konseling dalam waktu dekat.';
    case 'medium':
      return 'Pertimbangkan untuk berbicara dengan konselor. Praktik self-care dan mindfulness dapat membantu.';
    case 'low':
    default:
      return 'Pertahankan kebiasaan sehat Anda. Tetap jaga kesehatan mental dengan self-care rutin.';
  }
}

function mapToScreeningStatus(
  riskLevel: 'low' | 'medium' | 'high' | 'critical',
): 'stable' | 'monitored' | 'at_risk' {
  switch (riskLevel) {
    case 'critical':
    case 'high':
      return 'at_risk';
    case 'medium':
      return 'monitored';
    case 'low':
    default:
      return 'stable';
  }
}

const DASS_ANSWER_MAP: Record<string, number> = {
  'Tidak Pernah': 0,
  Terkadang: 1,
  Sering: 2,
  'Sangat Sering': 3,
};

const employeesData = [
  {
    fullName: 'Nia Sara',
    gender: 'female',
    department: 'Teknologi Informasi (IT)',
    position: 'Staff',
    yearsOfService: 7,
    // Answers set to mostly 'Sering' and 'Sangat Sering' to ensure high/critical risk
    answers: [
      'Sering',
      'Sering',
      'Sering',
      'Sangat Sering',
      'Sering',
      'Sering',
      'Sering',
      'Sangat Sering',
      'Sering',
      'Sering',
      'Sangat Sering',
      'Sering',
      'Sering',
      'Sering',
      'Sangat Sering',
      'Sering',
      'Sering',
      'Sangat Sering',
      'Sering',
      'Sering',
      'Sangat Sering',
    ],
  },
  {
    fullName: 'Dedi Iskandar',
    gender: 'male',
    department: 'Sumber Daya Manusia (HRD)',
    position: 'Staf',
    yearsOfService: 11,
    answers: [
      'Sering',
      'Sering',
      'Sering',
      'Sangat Sering',
      'Sering',
      'Sering',
      'Sering',
      'Sangat Sering',
      'Sering',
      'Sering',
      'Sangat Sering',
      'Sering',
      'Sering',
      'Sering',
      'Sangat Sering',
      'Sering',
      'Sering',
      'Sangat Sering',
      'Sering',
      'Sering',
      'Sangat Sering',
    ],
  },
  {
    fullName: 'Fitriani Anwar',
    gender: 'female',
    department: 'Teknologi Informasi (IT)',
    position: 'Staf',
    yearsOfService: 7,
    answers: [
      'Sering',
      'Sering',
      'Sering',
      'Sangat Sering',
      'Sering',
      'Sering',
      'Sering',
      'Sangat Sering',
      'Sering',
      'Sering',
      'Sangat Sering',
      'Sering',
      'Sering',
      'Sering',
      'Sangat Sering',
      'Sering',
      'Sering',
      'Sangat Sering',
      'Sering',
      'Sering',
      'Sangat Sering',
    ],
  },
];

const EMPLOYEE_MANUAL_ANSWERS: Record<string, number[]> = Object.fromEntries(
  employeesData.map((e) => [
    e.fullName,
    e.answers.map((ans) => DASS_ANSWER_MAP[ans] ?? 0),
  ]),
);

async function main() {
  console.log('🔄 Seeding employee mental health screenings...');

  const pool = new Pool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: false,
  });

  const db = drizzle(pool, {
    schema: {
      users,
      screenings,
    },
  });

  try {
    const employeeUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.role, 'employee'));

    console.log(`Found ${employeeUsers.length} employee users`);

    const screeningData: InferInsertModel<typeof screenings>[] = [];

    for (const employee of employeeUsers) {
      const manualAnswers = employee.fullName
        ? EMPLOYEE_MANUAL_ANSWERS[employee.fullName]
        : null;

      if (!manualAnswers) {
        continue;
      }

      const answers = manualAnswers;

      const assessmentResult = calculateDassScoresWithService(answers);
      const screeningStatus = mapToScreeningStatus(assessmentResult.riskLevel);
      const now = new Date();

      screeningData.push({
        id: uuidv4(),
        userId: employee.id,
        date: now,
        screeningStatus: screeningStatus,
        depressionScore: assessmentResult.depression.score,
        anxietyScore: assessmentResult.anxiety.score,
        stressScore: assessmentResult.stress.score,
        depressionCategory: assessmentResult.depression.severity,
        anxietyCategory: assessmentResult.anxiety.severity,
        stressCategory: assessmentResult.stress.severity,
        overallRisk: assessmentResult.overallRisk,
        answers: answers,
        notes: null,
      });
    }

    screeningData.sort(
      (a, b) =>
        (a.date || new Date()).getTime() - (b.date || new Date()).getTime(),
    );

    const batchSize = 50;
    let insertedCount = 0;

    for (let i = 0; i < screeningData.length; i += batchSize) {
      const batch = screeningData.slice(i, i + batchSize);
      await db.insert(screenings).values(batch);
      insertedCount += batch.length;
      console.log(
        `✅ Inserted ${insertedCount}/${screeningData.length} screenings...`,
      );
    }

    const stats = screeningData.reduce(
      (acc, screening) => {
        if (screening.screeningStatus) {
          acc[screening.screeningStatus] =
            (acc[screening.screeningStatus] || 0) + 1;
        }
        if (screening.overallRisk) {
          acc.riskLevels[screening.overallRisk] =
            (acc.riskLevels[screening.overallRisk] || 0) + 1;
        }
        return acc;
      },
      {
        stable: 0,
        monitored: 0,
        at_risk: 0,
        riskLevels: {} as Record<string, number>,
      },
    );

    console.log('\n📊 Screening Summary:');
    console.log(`Total screenings created: ${screeningData.length}`);
    console.log(`Employees with screenings: ${employeeUsers.length}`);
    console.log('\nStatus Distribution:');
    console.log(`  Stable: ${stats.stable}`);
    console.log(`  Monitored: ${stats.monitored}`);
    console.log(`  At Risk: ${stats.at_risk}`);
    console.log('\nRisk Level Distribution:');
    Object.entries(stats.riskLevels).forEach(([level, count]) => {
      console.log(`  ${level}: ${count}`);
    });

    console.log('Employee mental health screenings seeded successfully!');
  } catch (error) {
    console.error('Error seeding employee screenings:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('Database connection closed');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
