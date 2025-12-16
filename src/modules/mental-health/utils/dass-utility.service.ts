import { Injectable } from '@nestjs/common';
import { SEVERITY_LEVELS } from '../constants/dass21.constant';

export interface DassScore {
  score: number;
  category: string;
  severity: string;
  color: string;
}

export interface DassAssessmentSummary {
  depression: DassScore;
  anxiety: DassScore;
  stress: DassScore;
  overallRisk: string;
  totalScore: number;
  recommendedAction: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class DassUtilityService {
  calculateDassScores(answers: number[]): DassAssessmentSummary {
    if (answers.length !== 21) {
      throw new Error('DASS-21 requires exactly 21 answers');
    }

    const depressionIndices = [0, 1, 2, 3, 4, 5, 6];
    const anxietyIndices = [7, 8, 9, 10, 11, 12, 13];
    const stressIndices = [14, 15, 16, 17, 18, 19, 20];

    const depressionScore = this.sumScores(answers, depressionIndices);
    const anxietyScore = this.sumScores(answers, anxietyIndices);
    const stressScore = this.sumScores(answers, stressIndices);

    const depression = this.getSeverityInfo('depression', depressionScore);
    const anxiety = this.getSeverityInfo('anxiety', anxietyScore);
    const stress = this.getSeverityInfo('stress', stressScore);

    const totalScore = depressionScore + anxietyScore + stressScore;
    const overallRisk = this.determineOverallRisk([
      depression.severity,
      anxiety.severity,
      stress.severity,
    ]);
    const riskLevel = this.determineRiskLevel(overallRisk);
    const recommendedAction = this.getRecommendedAction(riskLevel, {
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

  private sumScores(answers: number[], indices: number[]): number {
    return indices.reduce((sum, index) => sum + (answers[index] || 0), 0);
  }

  private getSeverityInfo(
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

  private determineOverallRisk(severities: string[]): string {
    if (severities.includes('Sangat Mengkhawatirkan'))
      return 'Sangat Mengkhawatirkan';
    if (severities.includes('Mengkhawatirkan')) return 'Mengkhawatirkan';
    if (severities.includes('Sedang')) return 'Sedang';
    if (severities.includes('Ringan')) return 'Ringan';
    return 'Stabil';
  }

  private determineRiskLevel(
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

  private getRecommendedAction(
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

  generateDetailedReport(assessment: DassAssessmentSummary): string {
    const report = [
      '=== DASS-21 Assessment Report ===',
      '',
      `Overall Risk Level: ${assessment.overallRisk} (${assessment.riskLevel.toUpperCase()})`,
      `Total Score: ${assessment.totalScore}/126`,
      '',
      '--- Category Breakdown ---',
      `Depression: ${assessment.depression.score}/42 - ${assessment.depression.severity}`,
      `Anxiety: ${assessment.anxiety.score}/42 - ${assessment.anxiety.severity}`,
      `Stress: ${assessment.stress.score}/42 - ${assessment.stress.severity}`,
      '',
      '--- Recommendations ---',
      assessment.recommendedAction,
      '',
      '--- Clinical Notes ---',
      this.generateClinicalNotes(assessment),
      '',
      `Report generated: ${new Date().toISOString()}`,
    ];

    return report.join('\n');
  }

  private generateClinicalNotes(assessment: DassAssessmentSummary): string {
    const notes: string[] = [];

    if (
      assessment.riskLevel === 'critical' ||
      assessment.riskLevel === 'high'
    ) {
      notes.push(
        '⚠️ HIGH PRIORITY: Immediate professional intervention recommended',
      );
    }

    if (assessment.depression.severity === 'Sangat Mengkhawatirkan') {
      notes.push(
        'Severe depression symptoms detected - monitor for self-harm risk',
      );
    }
    if (assessment.anxiety.severity === 'Sangat Mengkhawatirkan') {
      notes.push('Severe anxiety symptoms - may impact daily functioning');
    }
    if (assessment.stress.severity === 'Sangat Mengkhawatirkan') {
      notes.push('Extreme stress levels - burnout risk assessment needed');
    }

    if (assessment.riskLevel === 'low') {
      notes.push('Results indicate stable mental health status');
    }

    if (assessment.riskLevel !== 'low') {
      notes.push('Follow-up screening recommended in 2-4 weeks');
    }

    return notes.length > 0
      ? notes.join('\n')
      : 'No specific clinical concerns noted.';
  }

  mapToScreeningStatus(
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
}
