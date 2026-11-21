import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  PageBreak,
  HeadingLevel
} from 'docx';
import type { OperationalReportData } from './operationalReportService';

// Palette Constants
const COLOR_PRIMARY_NAVY = '07152B';
const COLOR_SECONDARY_NAVY = '112746';
const COLOR_BLUE_ACCENT = '2563EB';
const COLOR_EMERALD = '0D9488';
const COLOR_AMBER = 'D97706';
const COLOR_ROSE = 'E11D48';
const COLOR_BG_LIGHT = 'F1F5F9';
const COLOR_BG_ALT = 'F8FAFC';
const COLOR_TEXT_DARK = '0F172A';
const COLOR_TEXT_MUTED = '475569';
const COLOR_BORDER = 'CBD5E1';
const COLOR_WHITE = 'FFFFFF';

const FONT_FAMILY = 'Arial';

const defaultCellBorder = {
  top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER }
};

const cellMargins = { top: 120, bottom: 120, left: 140, right: 140 };

function createTitleParagraph(text: string, size = 36, color = COLOR_PRIMARY_NAVY): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    spacing: { before: 280, after: 140 },
    children: [
      new TextRun({
        text,
        bold: true,
        font: FONT_FAMILY,
        size,
        color
      })
    ]
  });
}

function createChapterHeader(chapterNum: number, title: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    spacing: { before: 360, after: 180 },
    children: [
      new TextRun({
        text: `الفصل ${chapterNum} : `,
        bold: true,
        font: FONT_FAMILY,
        size: 30,
        color: COLOR_BLUE_ACCENT
      }),
      new TextRun({
        text: title,
        bold: true,
        font: FONT_FAMILY,
        size: 30,
        color: COLOR_PRIMARY_NAVY
      })
    ]
  });
}

function createSubheader(title: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text: `▪  ${title}`,
        bold: true,
        font: FONT_FAMILY,
        size: 24,
        color: COLOR_SECONDARY_NAVY
      })
    ]
  });
}

function createBodyParagraph(text: string, bold = false, color = COLOR_TEXT_DARK): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    spacing: { before: 80, after: 80, line: 280 },
    children: [
      new TextRun({
        text,
        bold,
        font: FONT_FAMILY,
        size: 21,
        color
      })
    ]
  });
}

function createCalloutBox(title: string, content: string, borderColor = COLOR_BLUE_ACCENT, bgFill = 'EFF6FF'): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.SINGLE, size: 24, color: borderColor }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 140, bottom: 140, left: 160, right: 180 },
            shading: { fill: bgFill },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: title,
                    bold: true,
                    size: 22,
                    color: COLOR_PRIMARY_NAVY,
                    font: FONT_FAMILY
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                children: [
                  new TextRun({
                    text: content,
                    size: 20,
                    color: COLOR_TEXT_MUTED,
                    font: FONT_FAMILY
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

function createHeaderCell(text: string, widthPercent?: number): TableCell {
  return new TableCell({
    width: widthPercent ? { size: widthPercent, type: WidthType.PERCENTAGE } : undefined,
    margins: cellMargins,
    borders: defaultCellBorder,
    shading: { fill: COLOR_PRIMARY_NAVY },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        children: [
          new TextRun({
            text,
            bold: true,
            font: FONT_FAMILY,
            size: 20,
            color: COLOR_WHITE
          })
        ]
      })
    ]
  });
}

function createDataCell(
  text: string | number,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.RIGHT,
  isAlt = false,
  bold = false,
  color = COLOR_TEXT_DARK,
  widthPercent?: number
): TableCell {
  return new TableCell({
    width: widthPercent ? { size: widthPercent, type: WidthType.PERCENTAGE } : undefined,
    margins: cellMargins,
    borders: defaultCellBorder,
    shading: { fill: isAlt ? COLOR_BG_ALT : COLOR_WHITE },
    children: [
      new Paragraph({
        alignment: align,
        bidirectional: true,
        children: [
          new TextRun({
            text: String(text ?? '—'),
            bold,
            font: FONT_FAMILY,
            size: 19,
            color
          })
        ]
      })
    ]
  });
}

export interface DocxGenerationOptions {
  includeMasterTables?: boolean;
  selectedChapters?: number[]; // If provided, filters chapters
  authorName?: string;
}

/**
 * Builds the complete Microsoft Word DOCX document with all 16 chapters
 */
export async function generateOperationalReportDocxBlob(
  data: OperationalReportData,
  options: DocxGenerationOptions = {}
): Promise<Blob> {
  const { includeMasterTables = true, selectedChapters, authorName = 'إدارة مكتب التشغيل والمتابعة' } = options;

  const isChapterSelected = (num: number) => {
    if (!selectedChapters || selectedChapters.length === 0) return true;
    return selectedChapters.includes(num);
  };

  const children: (Paragraph | Table)[] = [];

  // =========================================================================
  // CHAPTER 1: OFFICIAL COVER PAGE & REPORT METADATA (الغلاف الرسمي)
  // =========================================================================
  if (isChapterSelected(1)) {
    // Header decorative spacing
    children.push(new Paragraph({ spacing: { before: 500, after: 100 } }));

    // Company Organization Heading
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: 'المملكة العربية السعودية',
          bold: true,
          font: FONT_FAMILY,
          size: 24,
          color: COLOR_SECONDARY_NAVY
        })
      ]
    }));

    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'شركة درة المنورة للنقليات — إدارة التشغيل ونقل العمال',
          bold: true,
          font: FONT_FAMILY,
          size: 28,
          color: COLOR_PRIMARY_NAVY
        })
      ]
    }));

    // Main Report Title
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { before: 300, after: 120 },
      children: [
        new TextRun({
          text: 'التقرير الإداري والتشغيلي الشامل',
          bold: true,
          font: FONT_FAMILY,
          size: 44,
          color: COLOR_PRIMARY_NAVY
        })
      ]
    }));

    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 360 },
      children: [
        new TextRun({
          text: 'لأسطول الحافلات والكوادر والسائقين ومواقع العمل الميدانية',
          bold: true,
          font: FONT_FAMILY,
          size: 30,
          color: COLOR_BLUE_ACCENT
        })
      ]
    }));

    // Report Summary Tag
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: '« تقرير رسمي معتمد للمراجعة الإدارية والأرشفة والمتابعة التشغيلية الفورية »',
          bold: true,
          font: FONT_FAMILY,
          size: 20,
          color: COLOR_EMERALD
        })
      ]
    }));

    // Metadata Table on Cover Page
    const metadataRows: [string, string][] = [
      ['اسم التقرير الرسمي', 'التقرير الإداري والتشغيلي الشامل لأسطول الحافلات والسائقين'],
      ['الجهة المصدرة', 'شركة درة المنورة للنقليات — قسم التشغيل ونقل العمال'],
      ['تاريخ الإصدار', `${data.verification.generatedDateFormatted} (${data.verification.generatedTimeFormatted})`],
      ['مصدر البيانات الفعلي', 'قاعدة بيانات العمليات والتشغيل اللحظية (Cloud Firestore)'],
      ['إجمالي السجلات المدققة', `${data.verification.totalRecordsExtracted} سجلاً تشغيلياً`],
      ['مؤشر الجاهزية الفنية', `${data.fleet.readinessRate}% — ${data.fleet.readinessRating}`],
      ['إجمالي الحافلات النشطة', `${data.fleet.totalBuses} حافلة مسجلة بالأسطول`],
      ['إجمالي السائقين الفعليين', `${data.drivers.operationalTotal} سائقاً تشغيلياً معتمداً`],
      ['مواقع العمل المغطاة', `${data.locations.totalLocations} موقع عمل تشغيلي`],
      ['درجة أمان البيانات والخصوصية', 'معتمدة 100% (تطبيق قائمة السماح Allowlist وحظر البيانات المالية والشخصية)'],
      ['المسؤول عن التوليد والمصادقة', authorName]
    ];

    const metaTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: metadataRows.map(([label, value], idx) => (
        new TableRow({
          children: [
            createDataCell(label, AlignmentType.RIGHT, idx % 2 === 1, true, COLOR_SECONDARY_NAVY, 35),
            createDataCell(value, AlignmentType.RIGHT, idx % 2 === 1, false, COLOR_TEXT_DARK, 65)
          ]
        })
      ))
    });

    children.push(metaTable);
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // =========================================================================
  // CHAPTER 2: TABLE OF CONTENTS (فهرس المحتويات)
  // =========================================================================
  if (isChapterSelected(2)) {
    children.push(createChapterHeader(2, 'فهرس المحتويات والتقارير التنفيذية'));
    children.push(createBodyParagraph('يتضمن هذا التقرير الشامل الفصول والتحليلات التالية المستخرجة مباشرة من قاعدة بيانات التشغيل:'));

    const tocEntries: [number, string, string][] = [
      [1, 'الغلاف الرسمي وبيانات التقرير والمصادقة', 'بيانات المنظومة والاعتماد الرسمي والتدقيق الأمني'],
      [2, 'فهرس المحتويات', 'دليل موضوعات وفصول التقرير الشامل'],
      [3, 'الملخص التنفيذي ورسالة التشغيل', 'خلاصة الأداء ومستهدفات الجاهزية التشغيلية للمنظومة'],
      [4, 'المؤشرات التشغيلية العامة (KPIs)', 'المؤشرات المركزية للأداء الميداني والجاهزية الفنية'],
      [5, 'التقرير التفصيلي لأسطول الحافلات', 'إحصائيات الأسطول، الفئات، الصانع، الموديلات، والأعمار'],
      [6, 'التقرير التفصيلي للسائقين والكوادر', 'توزيع الكوادر، الصفة النظامية، وحالات العمل والجاهزية'],
      [7, 'تقرير تصنيفات السائقين ونوع العمل', 'التوزيع التشغيلي (نقل عمال، مدرسي، عمرة، دولي، خروج نهائي)'],
      [8, 'تقرير الإقامة ومتابعة صلاحية الوثائق', 'متابعة الوثائق السارية والمنتهية والتنبيهات الإدارية العاجلة'],
      [9, 'تقرير مواقع العمل التشغيلية', 'كثافة الأسطول وتوزيع الكوادر حسب فروع ومواقع المنظومة'],
      [10, 'تقرير الجاهزية التشغيلية للأسطول', 'معادلة الجاهزية، الحافلات المتاحة، وسجلات الصيانة الدورية'],
      [11, 'تقرير توزيع الموارد الميدانية بين المواقع', 'توازن توزيع الحافلات والكوادر الاحتياطية بالمناطق'],
      [12, 'العلاقات والترابط بين الحافلات والسائقين', 'الحافلات المكلفة، الكوادر الشاغرة، وتتبع حركة الردود اليومية'],
      [13, 'تدقيق جودة واكتمال البيانات الميدانية', 'فحص السجلات غير المكتملة ومؤشر سلامة البيانات'],
      [14, 'النتائج والتوصيات الإدارية والميدانية', 'خطة العمل المقترحة لرفع كفاءة الأسطول ومعالجة الملاحظات'],
      [15, 'الملاحق والجداول التفصيلية الكاملة', 'كشوفات تفصيلية كاملة للحافلات والسائقين ومواقع العمل'],
      [16, 'ملخص التحقق من اكتمال استخراج البيانات', 'شهادة التدقيق الفني وقائمة السماح الأمنية لسجلات Firestore']
    ];

    const tocTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('الفصل', 10),
            createHeaderCell('عنوان التقرير والفصل', 45),
            createHeaderCell('الوصف والمحتوى التشغيلي', 45)
          ]
        }),
        ...tocEntries.map(([num, title, desc], idx) => (
          new TableRow({
            children: [
              createDataCell(`الفصل ${num}`, AlignmentType.CENTER, idx % 2 === 1, true, COLOR_BLUE_ACCENT, 10),
              createDataCell(title, AlignmentType.RIGHT, idx % 2 === 1, true, COLOR_PRIMARY_NAVY, 45),
              createDataCell(desc, AlignmentType.RIGHT, idx % 2 === 1, false, COLOR_TEXT_MUTED, 45)
            ]
          })
        ))
      ]
    });

    children.push(tocTable);
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // =========================================================================
  // CHAPTER 3: EXECUTIVE SUMMARY (الملخص التنفيذي)
  // =========================================================================
  if (isChapterSelected(3)) {
    children.push(createChapterHeader(3, 'الملخص التنفيذي ورسالة إدارة التشغيل'));

    children.push(createCalloutBox(
      'بيان إدارة مكتب التشغيل والمتابعة — شركة درة المنورة للنقليات',
      '« بفضل الله وتوفيقه وإشراف مباشر من إدارة مكتب التشغيل، تم إعداد هذا التقرير الشامل ليعكس الوضع الميداني والإداري الفعلي لأسطول الحافلات وسائقي الشركة، بهدف إحكام الرقابة، وتنظيم توزيع الموارد التشغيلية، ومتابعة الردود اليومية وحالات الوثائق الرسمية، ورفع كفاءة الأداء وسرعة الإنجاز والتقارير. »',
      COLOR_EMERALD,
      'F0FDF4'
    ));

    children.push(createSubheader('نظرة عامة على الموقف التشغيلي الراهن'));
    children.push(createBodyParagraph(
      `تم استخراج هذا التقرير بالكامل من قاعدة البيانات الفعلية (Cloud Firestore) بتاريخ ${data.verification.generatedDateFormatted}، ويغطي أسطولاً يتألف من ${data.fleet.totalBuses} حافلة موزعة على ${data.locations.totalLocations} موقعاً تشغيلياً، بإشراف قوة تشغيلية تبلغ ${data.drivers.operationalTotal} سائقاً معتمداً. حققت المنظومة مؤشر جاهزية فنية استثنائي بلغ ${data.fleet.readinessRate}% (${data.fleet.readinessRating})، مع استمرار العمليات على مدار الساعة في نقل العمال، والنقل المدرسي، وخدمة المعتمرين والزوار، وخطوط النقل الدولي.`
    ));

    // Summary Highlights Table
    const summaryHighlights = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('المحور التشغيلي', 30),
            createHeaderCell('العدد / النسبة', 20),
            createHeaderCell('الحالة والتقييم الإداري', 50)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('الجاهزية الفنية للأسطول', AlignmentType.RIGHT, false, true, COLOR_SECONDARY_NAVY),
            createDataCell(`${data.fleet.readinessRate}%`, AlignmentType.CENTER, false, true, COLOR_EMERALD),
            createDataCell(`${data.fleet.activeCount} حافلة جاهزة للعمل مقابل ${data.fleet.maintenanceCount} حافلة بالصيانة`, AlignmentType.RIGHT, false)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('القوة العاملة من السائقين', AlignmentType.RIGHT, true, true, COLOR_SECONDARY_NAVY),
            createDataCell(`${data.drivers.operationalTotal} سائق`, AlignmentType.CENTER, true, true, COLOR_BLUE_ACCENT),
            createDataCell(`نسبة الوفرة والجاهزية ${data.drivers.availabilityRate}% (${data.drivers.activeCount} سائق نشط)`, AlignmentType.RIGHT, true)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('مواقع العمل الميدانية', AlignmentType.RIGHT, false, true, COLOR_SECONDARY_NAVY),
            createDataCell(`${data.locations.totalLocations} موقع`, AlignmentType.CENTER, false, true, COLOR_AMBER),
            createDataCell(`تتصدرها "${data.fleet.locationDistribution[0]?.name || 'العاديات'}" بعدد ${data.fleet.locationDistribution[0]?.count || 0} حافلة`, AlignmentType.RIGHT, false)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('متابعة الوثائق والإقامات', AlignmentType.RIGHT, true, true, COLOR_SECONDARY_NAVY),
            createDataCell(`${data.documents.validityRate}% سارية`, AlignmentType.CENTER, true, true, data.documents.expiredCount > 0 ? COLOR_ROSE : COLOR_EMERALD),
            createDataCell(`${data.documents.validCount} وثيقة سارية، ${data.documents.expiringUrgentCount} قريبة الانتهاء، ${data.documents.expiredCount} منتهية`, AlignmentType.RIGHT, true)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('نسبة تغطية الحافلات بالسائقين', AlignmentType.RIGHT, false, true, COLOR_SECONDARY_NAVY),
            createDataCell(`${data.fleet.driverCoverageRate}%`, AlignmentType.CENTER, false, true, COLOR_PRIMARY_NAVY),
            createDataCell(`${data.fleet.busesWithDrivers} حافلة مخصصة لسائقين معتمدين مقابل ${data.fleet.busesWithoutDrivers} حافلة شاغرة`, AlignmentType.RIGHT, false)
          ]
        })
      ]
    });

    children.push(summaryHighlights);
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // =========================================================================
  // CHAPTER 4: GENERAL OPERATIONAL KPIS (المؤشرات التشغيلية العامة)
  // =========================================================================
  if (isChapterSelected(4)) {
    children.push(createChapterHeader(4, 'المؤشرات التشغيلية العامة ومقاييس الأداء'));
    children.push(createBodyParagraph('توضح المؤشرات أدناه مصفوفة الأداء اللحظي المباشر لمكتب العمليات والتشغيل:'));

    const kpiTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('رمز المؤشر', 15),
            createHeaderCell('اسم المؤشر التشغيلي', 35),
            createHeaderCell('القيمة الفعلية', 20),
            createHeaderCell('الملاحظات والدلالة التشغيلية', 30)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('KPI-01', AlignmentType.CENTER, false, true, COLOR_BLUE_ACCENT),
            createDataCell('إجمالي حافلات الأسطول المسجلة', AlignmentType.RIGHT, false, true),
            createDataCell(data.fleet.totalBuses, AlignmentType.CENTER, false, true, COLOR_PRIMARY_NAVY),
            createDataCell('الأسطول الفعلي الموثق بقاعدة البيانات', AlignmentType.RIGHT)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('KPI-02', AlignmentType.CENTER, true, true, COLOR_BLUE_ACCENT),
            createDataCell('الحافلات الجاهزة للعمل المباشر', AlignmentType.RIGHT, true, true),
            createDataCell(data.fleet.activeCount, AlignmentType.CENTER, true, true, COLOR_EMERALD),
            createDataCell(`تمثل ${Math.round((data.fleet.activeCount / (data.fleet.totalBuses || 1)) * 100)}% من الأسطول`, AlignmentType.RIGHT, true)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('KPI-03', AlignmentType.CENTER, false, true, COLOR_BLUE_ACCENT),
            createDataCell('الحافلات الخاضعة للصيانة أو الفحص', AlignmentType.RIGHT, false, true),
            createDataCell(data.fleet.maintenanceCount, AlignmentType.CENTER, false, true, COLOR_ROSE),
            createDataCell('تتطلب متابعة فنية بالورش المركزية', AlignmentType.RIGHT)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('KPI-04', AlignmentType.CENTER, true, true, COLOR_BLUE_ACCENT),
            createDataCell('مؤشر الجاهزية الفنية العام', AlignmentType.RIGHT, true, true),
            createDataCell(`${data.fleet.readinessRate}%`, AlignmentType.CENTER, true, true, COLOR_EMERALD),
            createDataCell(data.fleet.readinessRating, AlignmentType.RIGHT, true)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('KPI-05', AlignmentType.CENTER, false, true, COLOR_BLUE_ACCENT),
            createDataCell('إجمالي السائقين التشغيليين الفعليين', AlignmentType.RIGHT, false, true),
            createDataCell(data.drivers.operationalTotal, AlignmentType.CENTER, false, true, COLOR_PRIMARY_NAVY),
            createDataCell(`يضاف إليهم ${data.drivers.finalExitCount} سائق خروج نهائي مؤرشف`, AlignmentType.RIGHT)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('KPI-06', AlignmentType.CENTER, true, true, COLOR_BLUE_ACCENT),
            createDataCell('السائقون المتاحون للعمل الفوري (نشط)', AlignmentType.RIGHT, true, true),
            createDataCell(data.drivers.activeCount, AlignmentType.CENTER, true, true, COLOR_EMERALD),
            createDataCell(`نسبة توفر ${data.drivers.availabilityRate}% من إجمالي السائقين`, AlignmentType.RIGHT, true)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('KPI-07', AlignmentType.CENTER, false, true, COLOR_BLUE_ACCENT),
            createDataCell('السائقون في إجازات دورية أو مرضية', AlignmentType.RIGHT, false, true),
            createDataCell(data.drivers.onLeaveCount, AlignmentType.CENTER, false, true, COLOR_AMBER),
            createDataCell('إجازات نظامية مجدولة', AlignmentType.RIGHT)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('KPI-08', AlignmentType.CENTER, true, true, COLOR_BLUE_ACCENT),
            createDataCell('نسبة الربط والتطابق مع الرقابة والمتابعة', AlignmentType.RIGHT, true, true),
            createDataCell(`${data.drivers.operationalTotal > 0 ? Math.round((data.drivers.activeInMonitoringCount / data.drivers.operationalTotal) * 100) : 100}%`, AlignmentType.CENTER, true, true, COLOR_EMERALD),
            createDataCell(`${data.drivers.activeInMonitoringCount} سائق مطابق لسجلات المتابعة`, AlignmentType.RIGHT, true)
          ]
        })
      ]
    });

    children.push(kpiTable);
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // =========================================================================
  // CHAPTER 5: BUS FLEET DETAILED REPORT (التقرير التفصيلي لأسطول الحافلات)
  // =========================================================================
  if (isChapterSelected(5)) {
    children.push(createChapterHeader(5, 'التقرير التفصيلي لأسطول الحافلات والمركبات'));
    children.push(createBodyParagraph(
      `يتكون أسطول شركة درة المنورة من ${data.fleet.totalBuses} حافلة، تم فحص وتدقيق حالتها التشغيلية ومواقع تواجدها وسنوات صنعها على النحو التالي:`
    ));

    children.push(createSubheader('1. توزيع الأسطول حسب الحالة الفنية والتشغيلية'));
    const statusRows = Object.entries(data.fleet.statusBreakdown).map(([status, count], idx) => {
      const isMaint = status.includes('صيانة') || status.includes('متوقف') || status.includes('عطل');
      const pct = data.fleet.totalBuses > 0 ? Math.round((count / data.fleet.totalBuses) * 100) : 0;
      return new TableRow({
        children: [
          createDataCell(status, AlignmentType.RIGHT, idx % 2 === 1, true, isMaint ? COLOR_ROSE : COLOR_PRIMARY_NAVY, 40),
          createDataCell(count, AlignmentType.CENTER, idx % 2 === 1, true, isMaint ? COLOR_ROSE : COLOR_EMERALD, 30),
          createDataCell(`${pct}%`, AlignmentType.CENTER, idx % 2 === 1, false, COLOR_TEXT_MUTED, 30)
        ]
      });
    });

    const statusTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('الحالة الفنية المسجلة', 40),
            createHeaderCell('عدد الحافلات', 30),
            createHeaderCell('النسبة المئوية من الأسطول', 30)
          ]
        }),
        ...statusRows
      ]
    });
    children.push(statusTable);

    children.push(createSubheader('2. توزيع الأسطول حسب الصانع والموديل والعمر التشغيلي'));
    children.push(createBodyParagraph(
      `أبرز الشركات المصنعة بالأسطول: ${data.fleet.mostCommonBrand}، ويبلغ متوسط العمر التشغيلي التقريبي للأسطول حوالي ${data.fleet.avgAgeYears} سنوات، وأحدث موديل مسجل هو ${data.fleet.newestModel} وأقدم موديل هو ${data.fleet.oldestModel}.`
    ));

    const brandRows = Object.entries(data.fleet.manufacturerBreakdown).map(([brand, count], idx) => {
      const pct = data.fleet.totalBuses > 0 ? Math.round((count / data.fleet.totalBuses) * 100) : 0;
      return new TableRow({
        children: [
          createDataCell(brand, AlignmentType.RIGHT, idx % 2 === 1, true, COLOR_SECONDARY_NAVY, 50),
          createDataCell(count, AlignmentType.CENTER, idx % 2 === 1, true, COLOR_BLUE_ACCENT, 25),
          createDataCell(`${pct}%`, AlignmentType.CENTER, idx % 2 === 1, false, COLOR_TEXT_MUTED, 25)
        ]
      });
    });

    const brandTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('الشركة المصنعة (Brand)', 50),
            createHeaderCell('عدد الحافلات', 25),
            createHeaderCell('النسبة المئوية', 25)
          ]
        }),
        ...brandRows
      ]
    });
    children.push(brandTable);
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // =========================================================================
  // CHAPTER 6: DRIVERS & STAFF DETAILED REPORT (التقرير التفصيلي للسائقين)
  // =========================================================================
  if (isChapterSelected(6)) {
    children.push(createChapterHeader(6, 'التقرير التفصيلي لكوادر وسائقي الشركة'));
    children.push(createBodyParagraph(
      `يبلغ إجمالي السائقين المسجلين في المنظومة ${data.drivers.totalRegistered} سائقاً، من بينهم ${data.drivers.operationalTotal} سائقاً في الخدمة التشغيلية المباشرة، و ${data.drivers.finalExitCount} سائقاً مصنفين بحالة "خروج نهائي" ومؤرشفة سجلاتهم بالكامل.`
    ));

    children.push(createSubheader('1. الحالة التشغيلية والوفرة الميدانية'));
    const driverStatusTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('الحالة التشغيلية', 40),
            createHeaderCell('العدد', 30),
            createHeaderCell('النسبة من السائقين التشغيليين', 30)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('نشط (جاهز ومتاح للعمل الفوري)', AlignmentType.RIGHT, false, true, COLOR_EMERALD),
            createDataCell(data.drivers.activeCount, AlignmentType.CENTER, false, true, COLOR_EMERALD),
            createDataCell(`${data.drivers.operationalTotal > 0 ? Math.round((data.drivers.activeCount / data.drivers.operationalTotal) * 100) : 0}%`, AlignmentType.CENTER)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('في إجازة (سنوية أو دورية أو مرضية)', AlignmentType.RIGHT, true, true, COLOR_AMBER),
            createDataCell(data.drivers.onLeaveCount, AlignmentType.CENTER, true, true, COLOR_AMBER),
            createDataCell(`${data.drivers.operationalTotal > 0 ? Math.round((data.drivers.onLeaveCount / data.drivers.operationalTotal) * 100) : 0}%`, AlignmentType.CENTER, true)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('خروج نهائي (سجل مقفل ومستثنى من العمليات)', AlignmentType.RIGHT, false, true, COLOR_ROSE),
            createDataCell(data.drivers.finalExitCount, AlignmentType.CENTER, false, true, COLOR_ROSE),
            createDataCell('أرشيف إداري مستقل', AlignmentType.CENTER)
          ]
        })
      ]
    });
    children.push(driverStatusTable);

    children.push(createSubheader('2. توزيع السائقين حسب الصفة النظامية والوثائق'));
    const legalTypeTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('الصفة النظامية للمستند', 40),
            createHeaderCell('العدد', 30),
            createHeaderCell('النسبة المئوية', 30)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('مقيم (إقامة نظامية سارية)', AlignmentType.RIGHT, false, true, COLOR_PRIMARY_NAVY),
            createDataCell(data.drivers.legalTypes.resident, AlignmentType.CENTER, false, true, COLOR_PRIMARY_NAVY),
            createDataCell(`${data.drivers.operationalTotal > 0 ? Math.round((data.drivers.legalTypes.resident / data.drivers.operationalTotal) * 100) : 0}%`, AlignmentType.CENTER)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('موسمي (دخول برقم حدود)', AlignmentType.RIGHT, true, true, COLOR_AMBER),
            createDataCell(data.drivers.legalTypes.seasonal, AlignmentType.CENTER, true, true, COLOR_AMBER),
            createDataCell(`${data.drivers.operationalTotal > 0 ? Math.round((data.drivers.legalTypes.seasonal / data.drivers.operationalTotal) * 100) : 0}%`, AlignmentType.CENTER, true)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('مؤقت (عقود تشغيل محددة المدة)', AlignmentType.RIGHT, false, true, COLOR_SECONDARY_NAVY),
            createDataCell(data.drivers.legalTypes.temporary, AlignmentType.CENTER, false, true, COLOR_SECONDARY_NAVY),
            createDataCell(`${data.drivers.operationalTotal > 0 ? Math.round((data.drivers.legalTypes.temporary / data.drivers.operationalTotal) * 100) : 0}%`, AlignmentType.CENTER)
          ]
        })
      ]
    });
    children.push(legalTypeTable);

    children.push(createSubheader('3. توزيع السائقين حسب الجنسيات'));
    const natRows = data.drivers.nationalities.map((nat, idx) => (
      new TableRow({
        children: [
          createDataCell(nat.name, AlignmentType.RIGHT, idx % 2 === 1, true, COLOR_PRIMARY_NAVY, 35),
          createDataCell(nat.count, AlignmentType.CENTER, idx % 2 === 1, true, COLOR_BLUE_ACCENT, 20),
          createDataCell(`${nat.percentage}%`, AlignmentType.CENTER, idx % 2 === 1, false, COLOR_TEXT_MUTED, 15),
          createDataCell(nat.resident, AlignmentType.CENTER, idx % 2 === 1, false, COLOR_TEXT_DARK, 15),
          createDataCell(nat.seasonal, AlignmentType.CENTER, idx % 2 === 1, false, COLOR_TEXT_DARK, 15)
        ]
      })
    ));

    const natTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('الجنسية', 35),
            createHeaderCell('الإجمالي', 20),
            createHeaderCell('النسبة %', 15),
            createHeaderCell('مقيم', 15),
            createHeaderCell('موسمي', 15)
          ]
        }),
        ...natRows
      ]
    });
    children.push(natTable);
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // =========================================================================
  // CHAPTER 7: DRIVER CLASSIFICATIONS (تصنيفات السائقين ونوع العمل)
  // =========================================================================
  if (isChapterSelected(7)) {
    children.push(createChapterHeader(7, 'تقرير تصنيفات السائقين وطبيعة العمل التشغيلي'));
    children.push(createBodyParagraph(
      'تعتمد شركة درة المنورة تصنيفاً دقيقاً للسائقين مرتبطاً بالتوزيع الميداني ومطابقة مهام الرقابة والمتابعة:'
    ));

    const classTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('التصنيف التشغيلي المعتمد', 35),
            createHeaderCell('عدد السائقين', 20),
            createHeaderCell('نسبة المشاركة', 20),
            createHeaderCell('نطاق العمل وطبيعة التشغيل', 25)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('نقل عمال', AlignmentType.RIGHT, false, true, COLOR_BLUE_ACCENT),
            createDataCell(data.drivers.classifications.laborTransport, AlignmentType.CENTER, false, true, COLOR_BLUE_ACCENT),
            createDataCell(`${data.drivers.operationalTotal > 0 ? Math.round((data.drivers.classifications.laborTransport / data.drivers.operationalTotal) * 100) : 0}%`, AlignmentType.CENTER),
            createDataCell('عقود الشركات والمنشآت الصناعية', AlignmentType.RIGHT)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('النقل المدرسي', AlignmentType.RIGHT, true, true, COLOR_SECONDARY_NAVY),
            createDataCell(data.drivers.classifications.schoolTransport, AlignmentType.CENTER, true, true, COLOR_SECONDARY_NAVY),
            createDataCell(`${data.drivers.operationalTotal > 0 ? Math.round((data.drivers.classifications.schoolTransport / data.drivers.operationalTotal) * 100) : 0}%`, AlignmentType.CENTER, true),
            createDataCell('مسارات المدارس (ينبع، محايل عسير، القصيم)', AlignmentType.RIGHT, true)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('عمرة وزيارة', AlignmentType.RIGHT, false, true, COLOR_EMERALD),
            createDataCell(data.drivers.classifications.umrah, AlignmentType.CENTER, false, true, COLOR_EMERALD),
            createDataCell(`${data.drivers.operationalTotal > 0 ? Math.round((data.drivers.classifications.umrah / data.drivers.operationalTotal) * 100) : 0}%`, AlignmentType.CENTER),
            createDataCell('خدمات المعتمرين بين مكة والمدينة وجدة', AlignmentType.RIGHT)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('النقل الدولي — سوريا', AlignmentType.RIGHT, true, true, COLOR_PRIMARY_NAVY),
            createDataCell(data.drivers.classifications.intlSyria, AlignmentType.CENTER, true, true, COLOR_PRIMARY_NAVY),
            createDataCell(`${data.drivers.operationalTotal > 0 ? Math.round((data.drivers.classifications.intlSyria / data.drivers.operationalTotal) * 100) : 0}%`, AlignmentType.CENTER, true),
            createDataCell('الرحلات والخطوط الدولية البرية لسوريا', AlignmentType.RIGHT, true)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('النقل الدولي — اليمن', AlignmentType.RIGHT, false, true, COLOR_PRIMARY_NAVY),
            createDataCell(data.drivers.classifications.intlYemen, AlignmentType.CENTER, false, true, COLOR_PRIMARY_NAVY),
            createDataCell(`${data.drivers.operationalTotal > 0 ? Math.round((data.drivers.classifications.intlYemen / data.drivers.operationalTotal) * 100) : 0}%`, AlignmentType.CENTER),
            createDataCell('الرحلات والخطوط الدولية البرية لليمن', AlignmentType.RIGHT)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('خروج نهائي (أرشيف مقفل)', AlignmentType.RIGHT, true, true, COLOR_ROSE),
            createDataCell(data.drivers.classifications.finalExit, AlignmentType.CENTER, true, true, COLOR_ROSE),
            createDataCell('مستبعد من العمليات', AlignmentType.CENTER, true),
            createDataCell('انتهاء تعاقد ومغادرة نهائية للمملكة', AlignmentType.RIGHT, true)
          ]
        })
      ]
    });

    children.push(classTable);
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // =========================================================================
  // CHAPTER 8: RESIDENCY & DOCUMENT TRACKING (تقرير الإقامة ومتابعة الوثائق)
  // =========================================================================
  if (isChapterSelected(8)) {
    children.push(createChapterHeader(8, 'تقرير الإقامة ومتابعة صلاحية الوثائق والتراخيص'));
    children.push(createBodyParagraph(
      'يُعنى هذا القسم بمتابعة تواريخ انتهاء الوثائق الرسمية وسجلات الرقابة لضمان الامتثال النظامي الكامل، مع حماية سرية الهويات وأرقام الإقامات باستعمال المعرفات التشغيلية.'
    ));

    const docSummaryTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('حالة الوثيقة النظامية', 35),
            createHeaderCell('العدد', 20),
            createHeaderCell('النسبة المئوية', 20),
            createHeaderCell('الإجراء الإداري المطلوب', 25)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('سارية الصلاحية (أكثر من 60 يوماً)', AlignmentType.RIGHT, false, true, COLOR_EMERALD),
            createDataCell(data.documents.validCount, AlignmentType.CENTER, false, true, COLOR_EMERALD),
            createDataCell(`${data.documents.totalDocuments > 0 ? Math.round((data.documents.validCount / data.documents.totalDocuments) * 100) : 0}%`, AlignmentType.CENTER),
            createDataCell('وضع نظامي سليم ومستقر', AlignmentType.RIGHT)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('قاربت على الانتهاء (31 - 60 يوماً)', AlignmentType.RIGHT, true, true, COLOR_AMBER),
            createDataCell(data.documents.expiringMediumCount, AlignmentType.CENTER, true, true, COLOR_AMBER),
            createDataCell(`${data.documents.totalDocuments > 0 ? Math.round((data.documents.expiringMediumCount / data.documents.totalDocuments) * 100) : 0}%`, AlignmentType.CENTER, true),
            createDataCell('البدء في إجراءات التجديد الروتينية', AlignmentType.RIGHT, true)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('عاجلة جداً (أقل من 30 يوماً)', AlignmentType.RIGHT, false, true, COLOR_ROSE),
            createDataCell(data.documents.expiringUrgentCount, AlignmentType.CENTER, false, true, COLOR_ROSE),
            createDataCell(`${data.documents.totalDocuments > 0 ? Math.round((data.documents.expiringUrgentCount / data.documents.totalDocuments) * 100) : 0}%`, AlignmentType.CENTER),
            createDataCell('متابعة عاجلة لمنع الغرامات أو الإيقاف', AlignmentType.RIGHT)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('منتهية الصلاحية (تتطلب تصحيح فوري)', AlignmentType.RIGHT, true, true, COLOR_ROSE),
            createDataCell(data.documents.expiredCount, AlignmentType.CENTER, true, true, COLOR_ROSE),
            createDataCell(`${data.documents.totalDocuments > 0 ? Math.round((data.documents.expiredCount / data.documents.totalDocuments) * 100) : 0}%`, AlignmentType.CENTER, true),
            createDataCell('إيقاف فوري عن الرحلات وسداد الرسوم', AlignmentType.RIGHT, true)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('غير محددة التاريخ في السجل', AlignmentType.RIGHT, false, true, COLOR_TEXT_MUTED),
            createDataCell(data.documents.missingDateCount, AlignmentType.CENTER, false, true, COLOR_TEXT_MUTED),
            createDataCell(`${data.documents.totalDocuments > 0 ? Math.round((data.documents.missingDateCount / data.documents.totalDocuments) * 100) : 0}%`, AlignmentType.CENTER),
            createDataCell('استكمال البيانات من ملفات الموظفين', AlignmentType.RIGHT)
          ]
        })
      ]
    });
    children.push(docSummaryTable);

    // Follow-up Table preview (Top urgent records)
    if (data.documents.followUpList.length > 0) {
      children.push(createSubheader('قائمة المتابعة الإدارية العاجلة (عينة من أبرز الوثائق المستحقة)'));
      const sampleFollowUp = data.documents.followUpList.slice(0, 15);
      const followUpRows = sampleFollowUp.map((item, idx) => {
        const isExpired = item.urgencyLevel === 'منتهية';
        return new TableRow({
          children: [
            createDataCell(item.operationalId, AlignmentType.CENTER, idx % 2 === 1, true, COLOR_PRIMARY_NAVY, 15),
            createDataCell(item.name, AlignmentType.RIGHT, idx % 2 === 1, false, COLOR_TEXT_DARK, 25),
            createDataCell(item.workplace, AlignmentType.RIGHT, idx % 2 === 1, false, COLOR_TEXT_MUTED, 25),
            createDataCell(item.endDate, AlignmentType.CENTER, idx % 2 === 1, false, COLOR_TEXT_DARK, 15),
            createDataCell(item.urgencyLevel, AlignmentType.CENTER, idx % 2 === 1, true, isExpired ? COLOR_ROSE : COLOR_AMBER, 20)
          ]
        });
      });

      const followUpTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              createHeaderCell('الرمز التشغيلي', 15),
              createHeaderCell('اسم الكادر / العامل', 25),
              createHeaderCell('موقع العمل', 25),
              createHeaderCell('تاريخ الانتهاء', 15),
              createHeaderCell('مستوى الأولوية', 20)
            ]
          }),
          ...followUpRows
        ]
      });
      children.push(followUpTable);
    }
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // =========================================================================
  // CHAPTER 9: WORKPLACES & LOCATIONS (تقرير مواقع العمل)
  // =========================================================================
  if (isChapterSelected(9)) {
    children.push(createChapterHeader(9, 'تقرير مواقع وفروع العمل والتشغيل الميداني'));
    children.push(createBodyParagraph(
      `تغطي عمليات شركة درة المنورة ${data.locations.totalLocations} موقعاً رئيسياً ومساراً تشغيلياً بالمملكة، وفيما يلي تحليل توزيع الأسطول والكوادر ونسب الجاهزية بكل موقع:`
    ));

    const locRows = data.locations.list.map((loc, idx) => (
      new TableRow({
        children: [
          createDataCell(loc.name, AlignmentType.RIGHT, idx % 2 === 1, true, COLOR_PRIMARY_NAVY, 30),
          createDataCell(loc.busCount, AlignmentType.CENTER, idx % 2 === 1, true, COLOR_BLUE_ACCENT, 15),
          createDataCell(loc.driverCount, AlignmentType.CENTER, idx % 2 === 1, true, COLOR_SECONDARY_NAVY, 15),
          createDataCell(`${loc.readinessRate}%`, AlignmentType.CENTER, idx % 2 === 1, true, loc.readinessRate >= 90 ? COLOR_EMERALD : COLOR_AMBER, 15),
          createDataCell(loc.activityType, AlignmentType.RIGHT, idx % 2 === 1, false, COLOR_TEXT_MUTED, 25)
        ]
      })
    ));

    const locTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('موقع العمل الميداني', 30),
            createHeaderCell('عدد الحافلات', 15),
            createHeaderCell('عدد السائقين', 15),
            createHeaderCell('الجاهزية الفنية', 15),
            createHeaderCell('طبيعة النشاط التشغيلي', 25)
          ]
        }),
        ...locRows
      ]
    });
    children.push(locTable);
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // =========================================================================
  // CHAPTER 10: OPERATIONAL READINESS REPORT (تقرير الجاهزية التشغيلية)
  // =========================================================================
  if (isChapterSelected(10)) {
    children.push(createChapterHeader(10, 'تقرير الجاهزية التشغيلية والفنية المباشرة'));
    children.push(createBodyParagraph(
      `تم احتساب مؤشر الجاهزية الفنية استناداً إلى البيانات اللحظية المباشرة لأسطول الحافلات بالمعادلة المعتمدة: ((إجمالي الحافلات - حافلات الصيانة والأعطال) ÷ إجمالي الحافلات) × 100.`
    ));

    children.push(createCalloutBox(
      'المؤشر الفني المعتمد للجاهزية',
      `نسبة الجاهزية الفعلية الحالية: ${data.fleet.readinessRate}% | التصنيف التشغيلي: ${data.fleet.readinessRating} | إجمالي الحافلات الجاهزة: ${data.fleet.activeCount} من أصل ${data.fleet.totalBuses} حافلة.`,
      COLOR_EMERALD,
      'F0FDF4'
    ));

    children.push(createSubheader('تحليل أسباب عدم الجاهزية وسجلات الصيانة'));
    children.push(createBodyParagraph(
      `يبلغ عدد الحافلات غير الجاهزة حالياً ${data.fleet.maintenanceCount} حافلة، وتتوزع أسباب التوقف المسجلة بين أعمال الصيانة الدورية، وتغيير الإطارات والزيوت، وفحص التكييف ومتابعة الفحص الدوري.`
    ));

    const readinessComparisonTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('عنصر التقييم الفني', 35),
            createHeaderCell('العدد المتاح', 20),
            createHeaderCell('العدد غير المتاح', 20),
            createHeaderCell('معدل الكفاءة والجاهزية', 25)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('جاهزية أسطول الحافلات', AlignmentType.RIGHT, false, true),
            createDataCell(`${data.fleet.activeCount} حافلة`, AlignmentType.CENTER, false, true, COLOR_EMERALD),
            createDataCell(`${data.fleet.maintenanceCount} حافلة`, AlignmentType.CENTER, false, true, COLOR_ROSE),
            createDataCell(`${data.fleet.readinessRate}%`, AlignmentType.CENTER, false, true, COLOR_PRIMARY_NAVY)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('جاهزية الكوادر والسائقين', AlignmentType.RIGHT, true, true),
            createDataCell(`${data.drivers.activeCount} سائق`, AlignmentType.CENTER, true, true, COLOR_EMERALD),
            createDataCell(`${data.drivers.onLeaveCount} بإجازة`, AlignmentType.CENTER, true, true, COLOR_AMBER),
            createDataCell(`${data.drivers.availabilityRate}%`, AlignmentType.CENTER, true, true, COLOR_PRIMARY_NAVY)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('جاهزية الوثائق والتراخيص', AlignmentType.RIGHT, false, true),
            createDataCell(`${data.documents.validCount} سارية`, AlignmentType.CENTER, false, true, COLOR_EMERALD),
            createDataCell(`${data.documents.expiredCount + data.documents.expiringUrgentCount} للمتابعة`, AlignmentType.CENTER, false, true, COLOR_ROSE),
            createDataCell(`${data.documents.validityRate}%`, AlignmentType.CENTER, false, true, COLOR_PRIMARY_NAVY)
          ]
        })
      ]
    });
    children.push(readinessComparisonTable);
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // =========================================================================
  // CHAPTER 11: RESOURCE DISTRIBUTION (توزيع الموارد الميدانية بين المواقع)
  // =========================================================================
  if (isChapterSelected(11)) {
    children.push(createChapterHeader(11, 'تقرير توزيع الموارد التشغيلية بين المواقع'));
    children.push(createBodyParagraph(
      'يوضح هذا الفصل مدى التوازن التشغيلي في توزيع الحافلات والكوادر بالمقارنة بين المواقع ذات الكثافة العالية والمواقع الميدانية الأخرى:'
    ));

    const top5Locs = data.locations.list.slice(0, 8);
    const resourceDistRows = top5Locs.map((loc, idx) => {
      const busToDriverRatio = loc.driverCount > 0 ? (loc.busCount / loc.driverCount).toFixed(2) : '—';
      let balanceStatus = 'توازن مثالي';
      if (loc.busCount > loc.driverCount * 1.3) balanceStatus = 'فائض حافلات / طلب سائقين';
      else if (loc.driverCount > loc.busCount * 1.3) balanceStatus = 'فائض كوادر احتياطية';

      return new TableRow({
        children: [
          createDataCell(loc.name, AlignmentType.RIGHT, idx % 2 === 1, true, COLOR_PRIMARY_NAVY, 30),
          createDataCell(loc.busCount, AlignmentType.CENTER, idx % 2 === 1, true, COLOR_BLUE_ACCENT, 15),
          createDataCell(loc.driverCount, AlignmentType.CENTER, idx % 2 === 1, true, COLOR_SECONDARY_NAVY, 15),
          createDataCell(busToDriverRatio, AlignmentType.CENTER, idx % 2 === 1, false, COLOR_TEXT_DARK, 15),
          createDataCell(balanceStatus, AlignmentType.RIGHT, idx % 2 === 1, true, balanceStatus === 'توازن مثالي' ? COLOR_EMERALD : COLOR_AMBER, 25)
        ]
      });
    });

    const resourceDistTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('الموقع التشغيلي', 30),
            createHeaderCell('الحافلات', 15),
            createHeaderCell('السائقون', 15),
            createHeaderCell('معدل حافلة/سائق', 15),
            createHeaderCell('حالة التوازن والملاحظات', 25)
          ]
        }),
        ...resourceDistRows
      ]
    });
    children.push(resourceDistTable);
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // =========================================================================
  // CHAPTER 12: DRIVER-BUS RELATIONSHIPS (العلاقات بين السائقين والحافلات)
  // =========================================================================
  if (isChapterSelected(12)) {
    children.push(createChapterHeader(12, 'العلاقات والترابط بين السائقين والحافلات والمواقع'));
    children.push(createBodyParagraph(
      `تم إجراء تدقيق ربط شامل بين أرقام الحافلات التشغيلية وأرقام اللوحات وسجلات السائقين المعتمدين:`
    ));

    const relationshipTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('حالة الارتباط والتخصيص', 40),
            createHeaderCell('العدد الفعلي', 20),
            createHeaderCell('النسبة المئوية', 20),
            createHeaderCell('التصنيف والوضع الميداني', 20)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('حافلات مخصصة لسائقين معتمدين', AlignmentType.RIGHT, false, true, COLOR_EMERALD),
            createDataCell(data.fleet.busesWithDrivers, AlignmentType.CENTER, false, true, COLOR_EMERALD),
            createDataCell(`${data.fleet.driverCoverageRate}%`, AlignmentType.CENTER),
            createDataCell('ارتباط تشغيلي نشط', AlignmentType.CENTER)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('حافلات شاغرة (بدون سائق مباشر)', AlignmentType.RIGHT, true, true, COLOR_AMBER),
            createDataCell(data.fleet.busesWithoutDrivers, AlignmentType.CENTER, true, true, COLOR_AMBER),
            createDataCell(`${100 - data.fleet.driverCoverageRate}%`, AlignmentType.CENTER, true),
            createDataCell('حافلات احتياط أو تشغيل دوري', AlignmentType.CENTER, true)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('سائقون بدون حافلة ثابتة معينة', AlignmentType.RIGHT, false, true, COLOR_SECONDARY_NAVY),
            createDataCell(data.drivers.driversWithoutBus, AlignmentType.CENTER, false, true, COLOR_SECONDARY_NAVY),
            createDataCell(`${data.drivers.operationalTotal > 0 ? Math.round((data.drivers.driversWithoutBus / data.drivers.operationalTotal) * 100) : 0}%`, AlignmentType.CENTER),
            createDataCell('كوادر مناوبة وتشغيل تبادلي', AlignmentType.CENTER)
          ]
        })
      ]
    });
    children.push(relationshipTable);

    // Responses activity section
    children.push(createSubheader('حركة الردود الميدانية المسجلة'));
    children.push(createBodyParagraph(
      `تم رصد ${data.drivers.responsesSummary.totalResponses} رداً تشغيلياً مسجلاً في بطاقات السائقين عبر بوابات الردود الميدانية:`
    ));

    const responseRows = Object.entries(data.drivers.responsesSummary.byType).map(([respType, count], idx) => (
      new TableRow({
        children: [
          createDataCell(respType, AlignmentType.RIGHT, idx % 2 === 1, true, COLOR_PRIMARY_NAVY, 50),
          createDataCell(count, AlignmentType.CENTER, idx % 2 === 1, true, COLOR_BLUE_ACCENT, 25),
          createDataCell(`${data.drivers.responsesSummary.totalResponses > 0 ? Math.round((count / data.drivers.responsesSummary.totalResponses) * 100) : 0}%`, AlignmentType.CENTER, idx % 2 === 1, false, COLOR_TEXT_MUTED, 25)
        ]
      })
    ));

    const responseTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('نوع الرد التشغيلي والوجهة', 50),
            createHeaderCell('عدد الردود المسجلة', 25),
            createHeaderCell('النسبة المئوية', 25)
          ]
        }),
        ...responseRows
      ]
    });
    children.push(responseTable);
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // =========================================================================
  // CHAPTER 13: DATA QUALITY AUDIT (مشكلات جودة البيانات)
  // =========================================================================
  if (isChapterSelected(13)) {
    children.push(createChapterHeader(13, 'تدقيق سلامة واكتمال البيانات الميدانية'));
    children.push(createBodyParagraph(
      `أظهر الفحص الآلي لجودة السجلات بقاعدة البيانات مؤشر سلامة إجمالي بلغ ${data.dataQuality.dataQualityScore}%، مع تفصيل الحقول غير المكتملة أدناه:`
    ));

    const qualityTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('عنصر الفحص والتدقيق', 45),
            createHeaderCell('عدد السجلات الناقصة', 25),
            createHeaderCell('التقييم والأثر التشغيلي', 30)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('حافلات لا تحتوي على أرقام لوحات رسمية', AlignmentType.RIGHT, false, true),
            createDataCell(data.dataQuality.busesMissingPlate, AlignmentType.CENTER, false, true, data.dataQuality.busesMissingPlate > 0 ? COLOR_ROSE : COLOR_EMERALD),
            createDataCell(data.dataQuality.busesMissingPlate === 0 ? 'مكتمل بنسبة 100%' : 'يتطلب استكمال اللوحات', AlignmentType.RIGHT)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('حافلات غير محددة الفئة', AlignmentType.RIGHT, true, true),
            createDataCell(data.dataQuality.busesMissingCategory, AlignmentType.CENTER, true, true, data.dataQuality.busesMissingCategory > 0 ? COLOR_AMBER : COLOR_EMERALD),
            createDataCell(data.dataQuality.busesMissingCategory === 0 ? 'مكتمل بنسبة 100%' : 'تحديد فئة الحافلة وسعتها', AlignmentType.RIGHT, true)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('حافلات غير مرتبطة بموقع محدد', AlignmentType.RIGHT, false, true),
            createDataCell(data.dataQuality.busesMissingLocation, AlignmentType.CENTER, false, true, data.dataQuality.busesMissingLocation > 0 ? COLOR_AMBER : COLOR_EMERALD),
            createDataCell(data.dataQuality.busesMissingLocation === 0 ? 'مكتمل بنسبة 100%' : 'تحديث موقع التمركز', AlignmentType.RIGHT)
          ]
        }),
        new TableRow({
          children: [
            createDataCell('وثائق عمالية بدون تاريخ انتهاء مسجل', AlignmentType.RIGHT, true, true),
            createDataCell(data.dataQuality.workersMissingEndDate, AlignmentType.CENTER, true, true, data.dataQuality.workersMissingEndDate > 0 ? COLOR_ROSE : COLOR_EMERALD),
            createDataCell('مراجعة إدارة شؤون الموظفين', AlignmentType.RIGHT, true)
          ]
        })
      ]
    });
    children.push(qualityTable);
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // =========================================================================
  // CHAPTER 14: FINDINGS & RECOMMENDATIONS (النتائج والتوصيات الإدارية)
  // =========================================================================
  if (isChapterSelected(14)) {
    children.push(createChapterHeader(14, 'النتائج والتوصيات الإدارية وخطة التطوير'));

    children.push(createSubheader('1. أبرز النتائج الإيجابية للمنظومة'));
    data.dataQuality.findings.forEach(finding => {
      children.push(createBodyParagraph(`✔  ${finding}`, false, COLOR_TEXT_DARK));
    });

    children.push(createSubheader('2. التوصيات الإدارية ذات الأولوية العالية'));
    data.dataQuality.recommendations.forEach((rec, idx) => {
      children.push(createBodyParagraph(`${idx + 1}.  ${rec}`, true, COLOR_SECONDARY_NAVY));
    });

    children.push(createCalloutBox(
      'توجيه الإدارة العامة للتشغيل',
      'يُوصى باعتماد هذا التقرير وتعميمه على مشرفي الفروع والمواقع للعمل بموجب مخرجاته، وتفعيل التحديث الدوري الأسبوعي لكافة السجلات.',
      COLOR_BLUE_ACCENT,
      'EFF6FF'
    ));

    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // =========================================================================
  // CHAPTER 15: APPENDICES & MASTER TABLES (الملاحق والجداول التفصيلية)
  // =========================================================================
  if (isChapterSelected(15)) {
    children.push(createChapterHeader(15, 'الملاحق والجداول التفصيلية للأسطول والسائقين'));

    if (includeMasterTables) {
      children.push(createSubheader('الملحق (أ) : كشف أسطول الحافلات التفصيلي الكامل'));
      children.push(createBodyParagraph(`يتضمن الكشف التالي بيانات ${data.sanitizedBuses.length} حافلة بالحقول الإدارية والتشغيلية المعتمدة:`));

      const busTableRows = data.sanitizedBuses.map((bus, idx) => (
        new TableRow({
          children: [
            createDataCell(bus.operationalNumber, AlignmentType.CENTER, idx % 2 === 1, true, COLOR_PRIMARY_NAVY, 12),
            createDataCell(bus.plateNumber, AlignmentType.CENTER, idx % 2 === 1, false, COLOR_TEXT_DARK, 16),
            createDataCell(bus.category, AlignmentType.RIGHT, idx % 2 === 1, false, COLOR_TEXT_MUTED, 14),
            createDataCell(bus.manufacturer, AlignmentType.RIGHT, idx % 2 === 1, false, COLOR_TEXT_DARK, 14),
            createDataCell(bus.model, AlignmentType.CENTER, idx % 2 === 1, false, COLOR_TEXT_MUTED, 10),
            createDataCell(bus.technicalStatus, AlignmentType.CENTER, idx % 2 === 1, true, bus.technicalStatus.includes('صيانة') ? COLOR_ROSE : COLOR_EMERALD, 14),
            createDataCell(bus.location, AlignmentType.RIGHT, idx % 2 === 1, false, COLOR_TEXT_DARK, 20)
          ]
        })
      ));

      const fullBusTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              createHeaderCell('رقم التشغيل', 12),
              createHeaderCell('رقم اللوحة', 16),
              createHeaderCell('الفئة', 14),
              createHeaderCell('الصانع', 14),
              createHeaderCell('الموديل', 10),
              createHeaderCell('الحالة الفنية', 14),
              createHeaderCell('موقع التمركز', 20)
            ]
          }),
          ...busTableRows
        ]
      });
      children.push(fullBusTable);

      children.push(new Paragraph({ spacing: { before: 240, after: 120 } }));
      children.push(createSubheader('الملحق (ب) : كشف كوادر وسائقي الشركة المعتمدين'));
      children.push(createBodyParagraph(
        `يتضمن الكشف التالي بيانات ${data.sanitizedDrivers.length} سائقاً برقم التسلسل التشغيلي والتصنيف والحالة (مع استبعاد الهويات وأرقام الهواتف):`
      ));

      const driverTableRows = data.sanitizedDrivers.map((driver, idx) => {
        const isFinal = driver.status === 'خروج نهائي';
        return new TableRow({
          children: [
            createDataCell(`#${driver.serialNumber}`, AlignmentType.CENTER, idx % 2 === 1, true, COLOR_PRIMARY_NAVY, 10),
            createDataCell(driver.name, AlignmentType.RIGHT, idx % 2 === 1, false, COLOR_TEXT_DARK, 25),
            createDataCell(driver.nationality, AlignmentType.CENTER, idx % 2 === 1, false, COLOR_TEXT_MUTED, 15),
            createDataCell(driver.driverType, AlignmentType.CENTER, idx % 2 === 1, false, COLOR_TEXT_DARK, 12),
            createDataCell(driver.classification, AlignmentType.RIGHT, idx % 2 === 1, true, COLOR_BLUE_ACCENT, 18),
            createDataCell(driver.status, AlignmentType.CENTER, idx % 2 === 1, true, isFinal ? COLOR_ROSE : COLOR_EMERALD, 10),
            createDataCell(driver.busNumber, AlignmentType.CENTER, idx % 2 === 1, false, COLOR_TEXT_DARK, 10)
          ]
        });
      });

      const fullDriverTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              createHeaderCell('التسلسل', 10),
              createHeaderCell('اسم السائق', 25),
              createHeaderCell('الجنسية', 15),
              createHeaderCell('الصفة', 12),
              createHeaderCell('التصنيف التشغيلي', 18),
              createHeaderCell('الحالة', 10),
              createHeaderCell('الحافلة', 10)
            ]
          }),
          ...driverTableRows
        ]
      });
      children.push(fullDriverTable);
    } else {
      children.push(createBodyParagraph('تم إخفاء الجداول التفصيلية الموسعة بناءً على خيارات التصدير المحددة.'));
    }

    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // =========================================================================
  // CHAPTER 16: VERIFICATION & AUDIT SUMMARY (ملخص التحقق واكتمال البيانات)
  // =========================================================================
  if (isChapterSelected(16)) {
    children.push(createChapterHeader(16, 'ملخص التحقق والتدقيق الأمني لاكتمال استخراج البيانات'));
    children.push(createBodyParagraph(
      'يؤكد هذا القسم نجاح عملية استخراج ومعالجة كافة سجلات المنظومة الحقيقية دون أي بيانات وهمية أو تجريبية، مع تطبيق معايير الأمان والخصوصية الصارمة:'
    ));

    const auditRows = data.verification.extractedCollections.map((col, idx) => (
      new TableRow({
        children: [
          createDataCell(col.name, AlignmentType.RIGHT, idx % 2 === 1, true, COLOR_PRIMARY_NAVY, 25),
          createDataCell(col.description, AlignmentType.RIGHT, idx % 2 === 1, false, COLOR_TEXT_DARK, 40),
          createDataCell(`${col.recordCount} سجلاً`, AlignmentType.CENTER, idx % 2 === 1, true, COLOR_BLUE_ACCENT, 15),
          createDataCell(col.status, AlignmentType.CENTER, idx % 2 === 1, true, COLOR_EMERALD, 20)
        ]
      })
    ));

    const auditTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('المجموعة المستخرجة (Collection)', 25),
            createHeaderCell('الوصف الإداري للمجموعة', 40),
            createHeaderCell('عدد السجلات', 15),
            createHeaderCell('حالة الاستخراج', 20)
          ]
        }),
        ...auditRows
      ]
    });
    children.push(auditTable);

    children.push(createSubheader('المجموعات والبيانات المستبعدة التزاماً بالسرية'));
    const excludedRows = data.verification.excludedCollections.map((ex, idx) => (
      new TableRow({
        children: [
          createDataCell(ex.name, AlignmentType.RIGHT, idx % 2 === 1, true, COLOR_ROSE, 30),
          createDataCell(ex.reason, AlignmentType.RIGHT, idx % 2 === 1, false, COLOR_TEXT_MUTED, 70)
        ]
      })
    ));

    const excludedTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('المجموعة المستبعدة نهائياً', 30),
            createHeaderCell('سبب الاستبعاد وسياسة الخصوصية المطبقة', 70)
          ]
        }),
        ...excludedRows
      ]
    });
    children.push(excludedTable);

    children.push(createSubheader('شهادة الاعتماد والمصادقة النهائية'));
    children.push(createCalloutBox(
      'شهادة اكتمال وصحة التقرير الإداري',
      `نقر نحن إدارة العمليات والتشغيل بشركة درة المنورة للنقليات بأن البيانات والإحصائيات الواردة في هذا التقرير (Dorra_Operational_Administrative_Report.docx) تعبر بدقة تامة عن الواقع الميداني المسجل بقاعدة البيانات بتاريخ ${data.verification.generatedDateFormatted}، دون إغفال أو زيادة، وتصلح للمراجعة والطباعة والأرشفة الرسمية.`,
      COLOR_EMERALD,
      'F0FDF4'
    ));

    // Signatures Table
    const signatureTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
        left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        right: { style: BorderStyle.NONE, size: 0, color: 'auto' }
      },
      rows: [
        new TableRow({
          children: [
            createDataCell('إعداد وتدقيق البيانات الميدانية\nمكتب المتابعة التشغيلية', AlignmentType.CENTER, false, true, COLOR_SECONDARY_NAVY, 50),
            createDataCell('المصادقة والاعتماد الإداري\nمدير إدارة مكتب التشغيل', AlignmentType.CENTER, false, true, COLOR_PRIMARY_NAVY, 50)
          ]
        })
      ]
    });
    children.push(signatureTable);
  }

  // Create the final Document with headers, footers, and RTL support
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 inch
              bottom: 720,
              left: 720,
              right: 720
            }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                border: {
                  bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BLUE_ACCENT, space: 4 }
                },
                children: [
                  new TextRun({
                    text: 'شركة درة المنورة للنقليات — قسم التشغيل ونقل العمال',
                    bold: true,
                    size: 17,
                    font: FONT_FAMILY,
                    color: COLOR_SECONDARY_NAVY
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                border: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER, space: 4 }
                },
                children: [
                  new TextRun({
                    text: 'التقرير الإداري والتشغيلي لأسطول الحافلات والسائقين  |  صفحة ',
                    size: 16,
                    font: FONT_FAMILY,
                    color: COLOR_TEXT_MUTED
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    bold: true,
                    font: FONT_FAMILY,
                    color: COLOR_PRIMARY_NAVY
                  }),
                  new TextRun({
                    text: ' من ',
                    size: 16,
                    font: FONT_FAMILY,
                    color: COLOR_TEXT_MUTED
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    bold: true,
                    font: FONT_FAMILY,
                    color: COLOR_PRIMARY_NAVY
                  })
                ]
              })
            ]
          })
        },
        children
      }
    ]
  });

  return await Packer.toBlob(doc);
}
