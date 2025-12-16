import { Injectable, Logger } from '@nestjs/common';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import * as fs from 'fs';
import * as path from 'path';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { EmployeeDTO, PdfGenerationOptions } from '../domain/dto/employee.dto';

(pdfMake as any).vfs = pdfFonts.vfs;

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);
  private logoBase64: string | null = null;

  constructor() {
    this.loadLogo();
  }

  private loadLogo(): void {
    try {
      const logoPath = path.join(
        process.cwd(),
        'assets',
        'images',
        'rd-main.png',
      );
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        this.logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        this.logger.log('Logo loaded successfully');
      } else {
        this.logger.warn('Logo file not found at:', logoPath);
      }
    } catch (error) {
      this.logger.error('Error loading logo:', error);
    }
  }

  async generateRiskPdf(
    employees: EmployeeDTO[],
    options?: PdfGenerationOptions,
  ): Promise<Buffer> {
    try {
      this.logger.log(`Generating PDF for ${employees.length} employees`);

      const currentDate = new Date();
      const formattedDate = this.formatIndonesianDate(currentDate);

      const logoToUse = this.logoBase64;

      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        background: logoToUse
          ? {
              image: logoToUse,
              width: 300,
              opacity: 0.2,
              absolutePosition: { x: 150, y: 300 },
            }
          : undefined,
        content: this.buildDocumentContent(employees, formattedDate, options),
        footer: () => {
          return {
            columns: [
              {
                text: 'Jl. Bintaro Raya, RT.4/RW.10, Bintaro, \n Kec. Pesanggrahan, Jakarta Selatan 12330',
                alignment: 'left',
                margin: [40, 0, 0, 30],
                fontSize: 12,
                color: '#000000',
                bold: true,
              },
            ],
          };
        },
        styles: {
          subheader: {
            fontSize: 12,
            alignment: 'right',
            margin: [0, 0, 0, 15],
          },
          title: {
            fontSize: 14,
            bold: true,
            alignment: 'center',
            margin: [0, 10, 0, 5],
          },
          tableHeader: {
            fontSize: 11,
            bold: true,
            fillColor: '#f5f5f5',
            alignment: 'center',
          },
          tableCell: {
            fontSize: 10,
            margin: [5, 5, 5, 5],
          },
          footer: {
            fontSize: 9,
            alignment: 'center',
            margin: [0, 20, 0, 0],
            color: '#666666',
          },
        },
        defaultStyle: {
          font: 'Roboto',
          fontSize: 10,
        },
      };

      return new Promise((resolve, reject) => {
        const pdfDoc = pdfMake.createPdf(docDefinition);
        pdfDoc.getBuffer((buffer: Buffer) => {
          if (buffer) {
            this.logger.log(
              `PDF generated successfully - ${buffer.length} bytes`,
            );
            resolve(buffer);
          } else {
            reject(new Error('Failed to generate PDF buffer'));
          }
        });
      });
    } catch (error) {
      this.logger.error('Error generating PDF:', error);
      throw error;
    }
  }

  private buildDocumentContent(
    employees: EmployeeDTO[],
    formattedDate: string,
    options?: PdfGenerationOptions,
  ): Content[] {
    const content: Content[] = [
      {
        text: `Diunduh pada: ${formattedDate}`,
        style: 'subheader',
      },
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: `${options?.title || 'RuangDiri - Format Download PDF'}`,
                style: 'title',
                alignment: 'center',
                border: [false, false, false, true],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: (i: number) => (i === 1 ? 1 : 0),
          vLineWidth: () => 0,
          hLineColor: () => '#000000',
        },
        margin: [0, 10, 0, 15],
      },
      this.buildEmployeeTable(employees),
    ];

    return content;
  }

  private buildEmployeeTable(employees: EmployeeDTO[]): any {
    const tableBody = [
      [
        { text: 'Nama', style: 'tableHeader' },
        { text: 'Departemen', style: 'tableHeader' },
        { text: 'Jenis Kelamin', style: 'tableHeader' },
        { text: 'Usia', style: 'tableHeader' },
      ],
    ];

    employees.forEach((employee) => {
      tableBody.push([
        { text: employee.name || '-', style: 'tableCell' },
        { text: employee.department || '-', style: 'tableCell' },
        {
          text: employee.gender || '-',
          style: 'tableCell',
          alignment: 'center',
        } as any,
        {
          text: employee.age?.toString() || '-',
          style: 'tableCell',
          alignment: 'center',
        } as any,
      ]);
    });

    return {
      table: {
        headerRows: 1,
        widths: ['30%', '30%', '20%', '20%'],
        body: tableBody,
      },
      layout: {
        fillColor: (rowIndex: number) => {
          return rowIndex === 0 ? '#ffffff' : null;
        },
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => '#000000',
        vLineColor: () => '#000000',
      },
      margin: [0, 0, 0, 20],
    };
  }

  private formatIndonesianDate(date: Date): string {
    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day} ${month} ${year}, ${hours}:${minutes} WIB`;
  }

  private formatTimestamp(date: Date): string {
    return (
      date.toISOString().replace(/[:.]/g, '-').split('T')[0] +
      '_' +
      date.toTimeString().split(' ')[0].replace(/:/g, '')
    );
  }

  generateFilename(prefix: string = 'ruangdiri_report'): string {
    const timestamp = this.formatTimestamp(new Date());
    return `${prefix}_${timestamp}.pdf`;
  }
}
