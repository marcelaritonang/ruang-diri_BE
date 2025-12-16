import { ApiProperty } from '@nestjs/swagger';

export class StudentAcademicInfoDto {
  @ApiProperty({
    description: 'Information about grades and classrooms of students',
    example: {
      classrooms: ['X', 'XI', 'XII'],
      grades: ['A', 'B', 'C', 'D'],
    },
  })
  data: {
    classrooms: string[];
    grades: string[];
  };
}

export class StudentDashboardMetricsDto {
  @ApiProperty({
    description:
      'Metrics for students in a specific year, grade, and classroom',
    example: {
      summary: {
        atRisk: {
          count: 23,
          total: 36,
        },
        notScreened: {
          count: 0,
          total: 36,
        },
        notCounseled: {
          count: 1,
          total: 23,
        },
      },
      mentalHealth: {
        overall: {
          atRisk: 7,
          monitored: 12,
          stable: 2,
          notScreened: 10,
        },
        byMonth: [
          {
            month: 'Feb',
            atRisk: 0,
            monitored: 0,
            stable: 1,
          },
          {
            month: 'Mar',
            atRisk: 2,
            monitored: 1,
            stable: 2,
          },
          {
            month: 'Apr',
            atRisk: 1,
            monitored: 0,
            stable: 1,
          },
        ],
      },
      status: {
        screening: {
          completed: 17,
          notCompleted: 19,
        },
        counseling: {
          completed: 0,
          notCompleted: 7,
        },
      },
    },
  })
  data: {
    summary: {
      atRisk: { count: number; total: number };
      notScreened: { count: number; total: number };
      notCounseled: { count: number; total: number };
    };
    mentalHealth: {
      overall: {
        atRisk: number;
        monitored: number;
        stable: number;
        notScreened: number;
      };
      byMonth: Array<{
        month: string;
        atRisk: number;
        monitored: number;
        stable: number;
      }>;
    };
    status: {
      screening: {
        completed: number;
        notCompleted: number;
      };
      counseling: {
        completed: number;
        notCompleted: number;
      };
    };
  };
}

export class StudentDetailDto {
  @ApiProperty({
    description: 'Detailed information about a student',
    example: {
      id: '63d4405c-d2fd-4bd8-8afe-90bb67cbbf5c',
      email: 'student13@example.com',
      profilePicture:
        'https://improved-mammal-humane.ngrok-free.app/uploads/students/profilePicture-1747900509537-783722953.jpeg',
      fullName: 'Ursasi',
      role: 'student',
      studentProfile: {
        grade: 'D',
        classroom: 'XI',
        gender: 'female',
        nis: '11335789',
        screeningStatus: 'stable',
        counselingStatus: false,
        iqScore: 190,
        guardianName: 'Parent 13',
        guardianContact: null,
        birthDate: '2009-01-01T00:00:00.000Z',
        birthPlace: 'City Center',
        iqCategory: 'very_below_average',
      },
      mentalHealthHistories: [
        {
          id: '951df749-c5b7-4f13-9bb0-0d3a4005ef38',
          type: 'screening',
          date: '2025-03-22T07:37:56.211Z',
          status: 'stable',
          notes: null,
        },
        {
          id: '3a13391a-bc68-4797-8c91-83ce5d7f4e40',
          type: 'screening',
          date: '2025-04-15T07:30:59.466Z',
          status: 'not_screened',
          notes: null,
        },
        {
          id: 'd19eb847-345f-41be-8112-52c13f8f908a',
          type: 'screening',
          date: '2025-03-26T07:30:59.466Z',
          status: 'stable',
          notes: null,
        },
      ],
    },
  })
  data: {
    id: string;
    email: string;
    profilePicture: string;
    fullName: string;
    role: string;
    studentProfile: {
      grade: string;
      classroom: string;
      gender: string;
      nis: string;
      screeningStatus: string;
      counselingStatus: boolean;
      iqScore: number;
      guardianName: string;
      guardianContact: string | null;
      birthDate: string;
      birthPlace: string;
      iqCategory: string;
    };
    mentalHealthHistories: Array<{
      id: string;
      type: string;
      date: string;
      status: string;
      notes: string | null;
    }>;
  };
}
