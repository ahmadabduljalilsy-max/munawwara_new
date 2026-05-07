import React from 'react';
import { Bus, Worker } from '../types';
import { useLogo } from '../lib/LogoContext';

interface ReportProps {
  title: string;
  buses?: Bus[];
  workers?: Worker[];
  generatedBy: string;
  stats?: any;
}

export const ReportTemplate: React.FC<ReportProps> = ({ title, buses, workers, generatedBy, stats }) => {
  const { logoURL } = useLogo();
  const now = new Date().toLocaleString('ar-SA');

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
            <p className="text-sm font-bold text-[#6B7280]">مكتب التشغيل - مكتب نقل العمال</p>
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

      {/* Table */}
      {buses && (
        <table className="w-full border-collapse border border-[#E5E7EB] text-sm">
          <thead>
            <tr className="bg-[#F9FAFB]">
              <th className="border border-[#E5E7EB] p-3 text-right">رقم التشغيل</th>
              <th className="border border-[#E5E7EB] p-3 text-right">رقم اللوحة</th>
              <th className="border border-[#E5E7EB] p-3 text-right">الفئة</th>
              <th className="border border-[#E5E7EB] p-3 text-right">الموديل</th>
              <th className="border border-[#E5E7EB] p-3 text-right">الموقع</th>
              <th className="border border-[#E5E7EB] p-3 text-right">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {buses.map((bus) => (
              <tr key={bus.id}>
                <td className="border border-[#E5E7EB] p-3 font-bold">{bus.operationalNumber}</td>
                <td className="border border-[#E5E7EB] p-3">{bus.plateNumber}</td>
                <td className="border border-[#E5E7EB] p-3">{bus.category}</td>
                <td className="border border-[#E5E7EB] p-3">{bus.model}</td>
                <td className="border border-[#E5E7EB] p-3">{bus.location}</td>
                <td className="border border-[#E5E7EB] p-3">{bus.technicalStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {workers && (
        <table className="w-full border-collapse border border-[#E5E7EB] text-sm">
          <thead>
            <tr className="bg-[#F9FAFB]">
              <th className="border border-[#E5E7EB] p-3 text-right">اسم العامل</th>
              <th className="border border-[#E5E7EB] p-3 text-right">رقم الإقامة</th>
              <th className="border border-[#E5E7EB] p-3 text-right">المكان</th>
              <th className="border border-[#E5E7EB] p-3 text-right">الحافلة المرتبطة</th>
              <th className="border border-[#E5E7EB] p-3 text-right">البداية</th>
              <th className="border border-[#E5E7EB] p-3 text-right">النهاية</th>
              <th className="border border-[#E5E7EB] p-3 text-right">العميل</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => (
              <tr key={worker.id}>
                <td className="border border-[#E5E7EB] p-3 font-bold">{worker.name}</td>
                <td className="border border-[#E5E7EB] p-3">{worker.iqamaNumber}</td>
                <td className="border border-[#E5E7EB] p-3">{worker.workplace}</td>
                <td className="border border-[#E5E7EB] p-3 font-bold text-primary">{worker.assignedBusOperationalNumber || '-'}</td>
                <td className="border border-[#E5E7EB] p-3 font-mono">{worker.startDate}</td>
                <td className="border border-[#E5E7EB] p-3 font-mono">{worker.endDate}</td>
                <td className="border border-[#E5E7EB] p-3 font-bold">{worker.clientName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-[#E5E7EB] flex justify-between items-center text-[10px] text-[#9CA3AF] font-bold">
        <p>© {new Date().getFullYear()} شركة درة المنورة - جميع الحقوق محفوظة</p>
        <p>نظام إدارة الأسطول الذكي</p>
      </div>
    </div>
  );
};
