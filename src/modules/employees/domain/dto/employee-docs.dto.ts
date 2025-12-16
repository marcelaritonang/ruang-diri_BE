import { ApiProperty } from '@nestjs/swagger';

export class EmployeeRolesDto {
  @ApiProperty({
    description: 'Information about roles and departments of employees',
    example: {
      departments: [
        'Human Resources',
        'Engineering',
        'Marketing',
        'Sales',
        'Finance',
      ],
      position: [
        'Manager',
        'Software Engineer',
        'Marketing Specialist',
        'Sales Executive',
        'Accountant',
      ],
    },
  })
  data: {
    departments: string[];
    positions: string[];
  };
}

export class EmployeeDashboardMetricsDto {
  @ApiProperty({
    description: 'Metrics for employees in a specific year, and department',
    example: {
      summary: {
        atRisk: {
          count: 2,
          total: 3,
        },
        notScreened: {
          count: 0,
          total: 3,
        },
        notCounseled: {
          count: 0,
          total: 2,
        },
      },
      mentalHealth: {
        overall: {
          atRisk: 0,
          monitored: 1,
          stable: 1,
          notScreened: 0,
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
            stable: 1,
          },
          {
            month: 'Apr',
            atRisk: 1,
            monitored: 0,
            stable: 0,
          },
          {
            month: 'May',
            atRisk: 0,
            monitored: 1,
            stable: 1,
          },
        ],
      },
      status: {
        screening: {
          completed: 2,
          notCompleted: 1,
        },
        counseling: {
          completed: 0,
          notCompleted: 0,
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

export class EmployeeDetailDto {
  @ApiProperty({
    description: 'Detailed information about an employee',
    example: {
      id: '7665717b-031b-4508-817c-92aa0423c09b',
      email: 'employee5@example.com',
      profilePicture:
        'https://b1fbf745df68d22238d898899f1e0a87.serveo.net/uploads/organizations/profilePicture-1747884491936-759900585.jpg',
      fullName: 'Lewis Hamilton',
      role: 'employee',
      employeeProfile: {
        employeeId: '',
        department: 'Sales',
        position: 'Engineer',
        gender: 'male',
        age: 26,
        yearsOfService: 1,
        screeningStatus: 'stable',
        counselingStatus: false,
        guardianName: 'Parent 5',
        guardianContact: '081231001',
        birthDate: '2002-01-01T00:00:00.000Z',
        birthPlace: 'City Center',
      },
      mentalHealthHistories: [
        {
          id: 'f69db26f-befc-47a4-8e23-61352e1374b8',
          type: 'screening',
          date: '2025-03-09T04:30:02.459Z',
          status: 'stable',
          notes: null,
        },
        {
          id: '7a796386-576f-438f-a3a1-d147ea95ace0',
          type: 'screening',
          date: '2025-03-05T07:30:59.467Z',
          status: 'stable',
          notes: null,
        },
        {
          id: '2ceca994-4b97-41dc-ae70-c85da43e123d',
          type: 'screening',
          date: '2025-05-11T07:30:59.467Z',
          status: 'monitored',
          notes: null,
        },
        {
          id: '2f43dbcd-198d-4211-b4b3-962b114b6f97',
          type: 'screening',
          date: '2025-04-04T07:30:59.467Z',
          status: 'monitored',
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
    employeeProfile: {
      employeeId: string;
      department: string;
      position: string;
      gender: string;
      age: number;
      yearsOfService: number;
      screeningStatus: string;
      counselingStatus: boolean;
      guardianName: string;
      guardianContact: string | null;
      birthDate: string;
      birthPlace: string;
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
