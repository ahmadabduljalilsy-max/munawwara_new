/**
 * حاسبة رواتب السائقين وفقاً لقواعد سلم الرواتب:
 * 1. الراتب الأساسي مدخل مسبقاً.
 * 2. احتساب عدد أيام العمل:
 *    - إذا كانت بداية عمل السائق في نفس الشهر، نحسب من بداية عمله حتى نهاية الشهر.
 *    - إذا كانت بداية عمل السائق في الشهر السابق (أو قبله)، نحسب الراتب باعتبار بدايته بداية الشهر الحالي (1 من الشهر).
 *    - اعتبار نهاية الشهر هو 30 من كل شهر إذا لم يوجد تاريخ نهاية عمل محدد (أو إذا كان تاريخ النهاية في شهر لاحق).
 *    - إذا كان تاريخ نهاية العمل في نفس الشهر، يحسب حتى ذلك اليوم (بحد أقصى 30).
 * 3. احتساب مجمل الراتب عند المجموع:
 *    - الراتب المستحق الفعلي للأيام = (الراتب الأساسي / 30) * عدد أيام العمل
 *    - المجموع الإجمالي = الراتب المستحق الفعلي + قيمة الإضافي + بدل المرابطة
 */

export interface WorkingDaysCalculation {
  workingDays: number;
  startDay: number;
  endDay: number;
  isStartedThisMonth: boolean;
  isEndedThisMonth: boolean;
  isNotStartedYet: boolean;
  isContractExpired: boolean;
  explanation: string;
}

export interface SalaryComponents {
  baseSalary: number;
  workingDays: number;
  earnedBaseSalary: number;
  extraHoursValue: number;
  morabata: number;
  totalSalary: number;
  dailyRate: number;
}

/**
 * تحليل تاريخ بالصيغة YYYY-MM-DD أو YYYY/MM/DD
 */
export function parseDateParts(dateStr?: string | null): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const clean = dateStr.trim().replace(/\//g, '-');
  const parts = clean.split('-');
  if (parts.length < 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/**
 * حساب عدد أيام العمل لشهر محدد (YYYY-MM)
 */
export function calculateWorkerWorkingDays(
  startDateStr: string | undefined | null,
  endDateStr: string | undefined | null,
  selectedMonth: string // YYYY-MM
): WorkingDaysCalculation {
  const [selYearStr, selMonthStr] = selectedMonth.split('-');
  const selYear = parseInt(selYearStr, 10);
  const selMonth = parseInt(selMonthStr, 10);
  const selMonthIndex = selYear * 12 + selMonth; // لسهولة المقارنة الزمنية

  const startParsed = parseDateParts(startDateStr);
  const endParsed = parseDateParts(endDateStr);

  let isNotStartedYet = false;
  let isContractExpired = false;
  let isStartedThisMonth = false;
  let isEndedThisMonth = false;

  let startDay = 1;
  let endDay = 30; // افتراضياً نهاية الشهر 30 إذا لا توجد نهاية عمل

  // 1. تحديد يوم البداية
  if (startParsed) {
    const startMonthIndex = startParsed.year * 12 + startParsed.month;
    if (startMonthIndex > selMonthIndex) {
      // لم يبدأ في هذا الشهر
      isNotStartedYet = true;
    } else if (startMonthIndex === selMonthIndex) {
      // بدأ في نفس الشهر
      isStartedThisMonth = true;
      startDay = Math.min(Math.max(startParsed.day, 1), 30);
    } else {
      // بدأ في شهر سابق -> نعتبر البداية 1 من الشهر الحالي
      isStartedThisMonth = false;
      startDay = 1;
    }
  } else {
    // لم يحدد تاريخ بدء -> افتراض بداية الشهر
    startDay = 1;
  }

  // 2. تحديد يوم النهاية
  if (endParsed) {
    const endMonthIndex = endParsed.year * 12 + endParsed.month;
    if (endMonthIndex < selMonthIndex) {
      // انتهى عقده قبل هذا الشهر
      isContractExpired = true;
    } else if (endMonthIndex === selMonthIndex) {
      // انتهى عقده في نفس الشهر
      isEndedThisMonth = true;
      endDay = Math.min(Math.max(endParsed.day, 1), 30);
    } else {
      // ينتهي في شهر لاحق -> نعتبر نهاية الشهر 30
      endDay = 30;
    }
  } else {
    // لا يوجد نهاية عمل -> اعتبار نهاية الشهر هو 30
    endDay = 30;
  }

  // 3. حساب عدد الأيام الفعلية
  let workingDays = 0;
  let explanation = '';

  if (isNotStartedYet) {
    workingDays = 0;
    explanation = 'لم يبدأ العمل بعد خلال هذا الشهر';
  } else if (isContractExpired) {
    workingDays = 0;
    explanation = 'انتهى العمل قبل بداية هذا الشهر';
  } else if (startDay > endDay) {
    workingDays = 0;
    explanation = 'تاريخ البداية بعد تاريخ النهاية';
  } else {
    workingDays = Math.max(0, Math.min(30, endDay - startDay + 1));
    if (isStartedThisMonth && isEndedThisMonth) {
      explanation = `بدأ في ${startDay} وانتهى في ${endDay} (${workingDays} يوم)`;
    } else if (isStartedThisMonth) {
      explanation = `بدأ في ${startDay} من هذا الشهر (${workingDays} من 30 يوم)`;
    } else if (isEndedThisMonth) {
      explanation = `انتهى في ${endDay} من هذا الشهر (${workingDays} من 30 يوم)`;
    } else {
      explanation = `شهر كامل (30 يوم عمل)`;
    }
  }

  return {
    workingDays,
    startDay,
    endDay,
    isStartedThisMonth,
    isEndedThisMonth,
    isNotStartedYet,
    isContractExpired,
    explanation
  };
}

/**
 * جبر الأرقام التي تحتوي على فواصل إلى أقرب 5 (دائماً للأعلى)
 * مثال: 1213.33 تصبح 1215
 */
export function roundUpToNearest5(value: number): number {
  if (!value || isNaN(value) || value <= 0) return 0;
  
  // فحص الكسر العشري مع تجنب أخطاء الدقة العشرية لـ JavaScript
  const roundedToCents = Math.round(value * 100) / 100;
  const hasDecimals = Math.abs(roundedToCents - Math.round(roundedToCents)) > 0.001;
  
  if (hasDecimals) {
    return Math.ceil(roundedToCents / 5) * 5;
  }
  
  return roundedToCents;
}

/**
 * حساب تفاصيل ومجموع الراتب بناءً على الراتب الأساسي وأيام العمل والإضافي والمرابطة
 */
export function calculateSalaryComponents(
  baseSalary: number,
  workingDays: number,
  extraHoursValue: number = 0,
  morabata: number = 0
): SalaryComponents {
  const validBase = Math.max(0, Number(baseSalary) || 0);
  const validDays = Math.max(0, Math.min(30, Number(workingDays) || 0));
  const validExtra = Math.max(0, Number(extraHoursValue) || 0);
  const validMorabata = Math.max(0, Number(morabata) || 0);

  const dailyRate = validBase > 0 ? validBase / 30 : 0;
  
  // إذا كانت الأيام 30 يوماً، فالراتب المستحق يساوي الأساسي تماماً دون فوارق تقريب (مع جبر الفواصل إذا كان الأساسي يحتوي على فواصل)
  let earnedBaseSalary = 0;
  if (validDays === 30) {
    earnedBaseSalary = roundUpToNearest5(validBase);
  } else if (validDays === 0) {
    earnedBaseSalary = 0;
  } else {
    // حساب الراتب المستحق الفعلي للأيام مع جبر الفواصل دائماً إلى أقرب 5 (مثال: 1213.33 تصبح 1215)
    const rawEarned = dailyRate * validDays;
    earnedBaseSalary = roundUpToNearest5(rawEarned);
  }

  const extraRounded = roundUpToNearest5(validExtra);
  const morabataRounded = roundUpToNearest5(validMorabata);

  const rawTotal = earnedBaseSalary + extraRounded + morabataRounded;
  const totalSalary = roundUpToNearest5(rawTotal);

  return {
    baseSalary: validBase,
    workingDays: validDays,
    earnedBaseSalary,
    extraHoursValue: validExtra,
    morabata: validMorabata,
    totalSalary,
    dailyRate: Math.round(dailyRate * 100) / 100
  };
}
