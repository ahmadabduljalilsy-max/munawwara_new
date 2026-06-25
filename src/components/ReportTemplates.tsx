import React from 'react';
import { Bus, Worker, SalaryRecord } from '../types';
import { useLogo } from '../lib/LogoContext';

interface ReportProps {
  title: string;
  buses?: Bus[];
  workers?: Worker[];
  salaries?: SalaryRecord[];
  generatedBy: string;
  stats?: any;
}

export const ReportTemplate: React.FC<ReportProps> = ({ title, buses, workers, salaries, generatedBy, stats }) => {
  const { logoURL } = useLogo();
  const now = new Date().toLocaleString('ar-SA');

  const totalBase = salaries ? salaries.reduce((sum, s) => sum + (s.baseSalary || 0), 0) : 0;
  const totalExtra = salaries ? salaries.reduce((sum, s) => sum + (s.extraHoursValue || 0), 0) : 0;
  const totalMorabata = salaries ? salaries.reduce((sum, s) => sum + (s.morabata || 0), 0) : 0;
  const grandTotal = salaries ? salaries.reduce((sum, s) => sum + (s.totalSalary || 0), 0) : 0;

  return (
    <div id="pdf-report" className="p-10 bg-white w-[800px] text-right font-sans" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-primary pb-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center p-1 border border-border">
            <img 
              src={logoURL || "/artifact/5567c9fe-a90f-48d6-96df-71a74d533423"} 
              alt="Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#111827]">درة المنورة لنقل الحجاج والمعتمرين</h1>
            <p className="text-sm font-bold text-[#6B7280]">مكتب التشغيل - فريق تشغيل درة المنورة</p>
          </div>
        </div>
        <div className="text-left">
          <p className="text-xs font-bold text-[#9CA3AF]">تاريخ التقرير: {now}</p>
          <p className="text-xs font-bold text-[#9CA3AF]">بواسطة: {generatedBy}</p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-center mb-8 bg-[#F9FAFB] py-3 rounded-xl border border-[#E5E7EB]">
        {title}
      </h2>

      {/* Summary Stats if available */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {Object.entries(stats).map(([label, value]: [string, any]) => (
            <div key={label} className="p-4 border border-[#E5E7EB] rounded-2xl text-center">
              <p className="text-[10px] text-[#6B7280] font-bold uppercase mb-1">{label}</p>
              <p className="text-lg font-black text-[#111827]">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table for multiple buses */}
      {buses && buses.length > 1 && (
        <table className="w-full border-collapse border border-[#E5E7EB] text-sm">
          <thead>
            <tr className="bg-[#F9FAFB]">
              <th className="border border-[#E5E7EB] p-3 text-right">رقم التشغيل</th>
              <th className="border border-[#E5E7EB] p-3 text-right">رقم اللوحة</th>
              <th className="border border-[#E5E7EB] p-3 text-right">الفئة</th>
              <th className="border border-[#E5E7EB] p-3 text-right">اللون</th>
              <th className="border border-[#E5E7EB] p-3 text-right">الموديل</th>
              <th className="border border-[#E5E7EB] p-3 text-right">الموقع</th>
              <th className="border border-[#E5E7EB] p-3 text-right">الحالة</th>
              <th className="border border-[#E5E7EB] p-3 text-right">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {buses.map((bus) => (
              <tr key={bus.id}>
                <td className="border border-[#E5E7EB] p-3 font-bold">{bus.operationalNumber}</td>
                <td className="border border-[#E5E7EB] p-3">{bus.plateNumber}</td>
                <td className="border border-[#E5E7EB] p-3">{bus.category}</td>
                <td className="border border-[#E5E7EB] p-3">{bus.color || '-'}</td>
                <td className="border border-[#E5E7EB] p-3">{bus.model}</td>
                <td className="border border-[#E5E7EB] p-3">{bus.location}</td>
                <td className="border border-[#E5E7EB] p-3">{bus.technicalStatus}</td>
                <td className="border border-[#E5E7EB] p-3 text-[10px] text-[#6B7280]">{bus.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Detail view for single bus */}
      {buses && buses.length === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB]">
                <p className="text-[10px] text-[#6B7280] font-bold uppercase mb-1">رقم التشغيل</p>
                <p className="text-lg font-black text-primary">{buses[0].operationalNumber}</p>
              </div>
              <div className="p-4 border border-[#E5E7EB] rounded-2xl">
                <p className="text-[10px] text-[#6B7280] font-bold uppercase mb-1">رقم اللوحة</p>
                <p className="text-base font-bold text-[#111827]">{buses[0].plateNumber}</p>
              </div>
              <div className="p-4 border border-[#E5E7EB] rounded-2xl">
                <p className="text-[10px] text-[#6B7280] font-bold uppercase mb-1">الموديل</p>
                <p className="text-base font-bold text-[#111827]">{buses[0].model}</p>
              </div>
              <div className="p-4 border border-[#E5E7EB] rounded-2xl">
                <p className="text-[10px] text-[#6B7280] font-bold uppercase mb-1">اللون</p>
                <p className="text-base font-bold text-[#111827]">{buses[0].color || '-'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 border border-[#E5E7EB] rounded-2xl">
                <p className="text-[10px] text-[#6B7280] font-bold uppercase mb-1">الموقع الحالي</p>
                <p className="text-base font-bold text-[#111827]">{buses[0].location}</p>
              </div>
              <div className="p-4 border border-[#E5E7EB] rounded-2xl">
                <p className="text-[10px] text-[#6B7280] font-bold uppercase mb-1">الحالة الفنية</p>
                <p className="text-base font-bold text-[#111827]">{buses[0].technicalStatus}</p>
              </div>
              <div className="p-4 border border-[#E5E7EB] rounded-2xl">
                <p className="text-[10px] text-[#6B7280] font-bold uppercase mb-1">الفئة</p>
                <p className="text-base font-bold text-[#111827]">{buses[0].category}</p>
              </div>
            </div>
          </div>
          
          {buses[0].notes && (
            <div className="p-6 border border-[#E5E7EB] rounded-2xl bg-[#F9FAFB]/50">
              <p className="text-[10px] text-[#6B7280] font-bold uppercase mb-2 border-b border-[#E5E7EB] pb-2">ملاحظات إضافية وسجل المواقع</p>
              <div className="text-sm text-[#374151] whitespace-pre-wrap leading-relaxed font-medium">
                {buses[0].notes}
              </div>
            </div>
          )}
        </div>
      )}

      {workers && (
        <table className="w-full border-collapse border border-[#E5E7EB] text-sm">
          <thead>
            <tr className="bg-[#F9FAFB]">
              <th className="border border-[#E5E7EB] p-3 text-right">اسم العامل</th>
              <th className="border border-[#E5E7EB] p-3 text-right">رقم الإقامة</th>
              <th className="border border-[#E5E7EB] p-3 text-right">المكان</th>
              <th className="border border-[#E5E7EB] p-3 text-right">الحافلة المرتبطة</th>
              <th className="border border-[#E5E7EB] p-3 text-right">الحافلات السابقة</th>
              <th className="border border-[#E5E7EB] p-3 text-right">البداية</th>
              <th className="border border-[#E5E7EB] p-3 text-right">النهاية</th>
              <th className="border border-[#E5E7EB] p-3 text-right">العميل</th>
              <th className="border border-[#E5E7EB] p-3 text-right">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => (
              <tr key={worker.id}>
                <td className="border border-[#E5E7EB] p-3 font-bold">{worker.name}</td>
                <td className="border border-[#E5E7EB] p-3">{worker.iqamaNumber}</td>
                <td className="border border-[#E5E7EB] p-3">{worker.workplace}</td>
                <td className="border border-[#E5E7EB] p-3 font-bold text-primary">{worker.assignedBusOperationalNumber || '-'}</td>
                <td className="border border-[#E5E7EB] p-3 font-medium text-indigo-700">{worker.previousBuses || '-'}</td>
                <td className="border border-[#E5E7EB] p-3 font-mono">{worker.startDate}</td>
                <td className="border border-[#E5E7EB] p-3 font-mono">{worker.endDate}</td>
                <td className="border border-[#E5E7EB] p-3 font-bold">{worker.clientName}</td>
                <td className="border border-[#E5E7EB] p-3 text-[10px] text-[#6B7280]">{worker.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {salaries && (
        <table className="w-full border-collapse border border-[#CBD5E1] text-[11px] shadow-sm rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-[#F1F5F9] text-right text-[#334155] border-b-2 border-[#94A3B8]">
              <th className="border border-[#CBD5E1] p-2.5 text-center font-bold w-10">م</th>
              <th className="border border-[#CBD5E1] p-2.5 text-right font-bold">الموظف / الرقم الوظيفي</th>
              <th className="border border-[#CBD5E1] p-2.5 text-right font-bold">موقع العمل</th>
              <th className="border border-[#CBD5E1] p-2.5 text-center font-bold">الراتب الأساسي</th>
              <th className="border border-[#CBD5E1] p-2.5 text-center font-bold">العمل الإضافي</th>
              <th className="border border-[#CBD5E1] p-2.5 text-center font-bold">بدل المرابطة</th>
              <th className="border border-[#CBD5E1] p-2.5 text-center font-black">إجمالي المستحق</th>
              <th className="border border-[#CBD5E1] p-2.5 text-center font-bold">الحالة</th>
              <th className="border border-[#CBD5E1] p-2.5 text-right font-bold">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {salaries.map((salary, index) => (
              <tr key={salary.id || salary.workerId} className={index % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-50'}>
                <td className="border border-[#CBD5E1] p-2 text-center text-slate-500 font-mono font-bold">
                  {index + 1}
                </td>
                <td className="border border-[#CBD5E1] p-2 font-bold">
                  <div className="font-bold text-[#1F2937]">{salary.workerName}</div>
                  <div className="text-[9px] text-[#4B5563] font-mono mt-0.5">{salary.workerNumber}</div>
                </td>
                <td className="border border-[#CBD5E1] p-2 text-[#475569] font-semibold">
                  {salary.workLocation || '-'}
                </td>
                <td className="border border-[#CBD5E1] p-2 text-center font-semibold text-slate-700">
                  {salary.baseSalary.toLocaleString()} ريال
                </td>
                <td className="border border-[#CBD5E1] p-2 text-center">
                  <div className="font-semibold text-slate-700">
                    {salary.extraHoursValue.toLocaleString()} ريال
                  </div>
                  {salary.extraHours > 0 && (
                    <div className="text-[9px] text-slate-500 mt-0.5">({salary.extraHours} ساعة)</div>
                  )}
                </td>
                <td className="border border-[#CBD5E1] p-2 text-center font-semibold text-slate-700">
                  {salary.morabata > 0 ? `${salary.morabata.toLocaleString()} ريال` : '-'}
                </td>
                <td className="border border-[#CBD5E1] p-2 text-center font-bold text-primary bg-primary/[0.01]">
                  {salary.totalSalary.toLocaleString()} ريال
                </td>
                <td className="border border-[#CBD5E1] p-2 text-center font-bold">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black tracking-wide ${
                    salary.status === 'paid' 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {salary.status === 'paid' ? 'تم الصرف' : 'قيد الانتظار'}
                  </span>
                </td>
                <td className="border border-[#CBD5E1] p-2 text-right text-[10px] text-slate-500 max-w-[120px] truncate" title={salary.notes}>
                  {salary.notes || '-'}
                </td>
              </tr>
            ))}

            {/* Totals Row */}
            <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-800">
              <td colSpan={3} className="border border-[#CBD5E1] p-2.5 text-right font-black text-slate-700 bg-slate-100">
                إجمالي الكشف المالي ({salaries.length} موظف مستحق)
              </td>
              <td className="border border-[#CBD5E1] p-2.5 text-center font-black text-slate-800 bg-slate-100">
                {totalBase.toLocaleString()} ريال
              </td>
              <td className="border border-[#CBD5E1] p-2.5 text-center font-black text-slate-800 bg-slate-100">
                {totalExtra.toLocaleString()} ريال
              </td>
              <td className="border border-[#CBD5E1] p-2.5 text-center font-black text-slate-800 bg-slate-100">
                {totalMorabata.toLocaleString()} ريال
              </td>
              <td className="border border-[#CBD5E1] p-2.5 text-center font-black text-emerald-700 bg-emerald-50">
                {grandTotal.toLocaleString()} ريال
              </td>
              <td colSpan={2} className="border border-[#CBD5E1] p-2.5 bg-slate-100"></td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Approval Section */}
      <div className="mt-16 mb-8 flex justify-between items-end px-4">
        <div className="text-right">
          <p className="text-xs text-slate-500 font-bold mb-12">توقيع محاسب الموقع:</p>
          <div className="w-40 border-b border-dashed border-slate-400"></div>
        </div>
        <div className="text-left">
          <p className="text-sm text-slate-800 font-extrabold mb-12">اعتماد مدير مكتب التشغيل:</p>
          <div className="w-48 border-b border-dashed border-slate-400"></div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-[#E5E7EB] flex justify-between items-center text-[10px] text-[#9CA3AF] font-bold">
        <p>© {new Date().getFullYear()} شركة درة المنورة - جميع الحقوق محفوظة</p>
        <p>فريق تشغيل درة المنورة</p>
      </div>
    </div>
  );
};
