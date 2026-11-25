import React from 'react';
import { useLogo } from '../lib/LogoContext';
import dmtcOfficialSvg from '../assets/images/dmtc_official_logo.svg';

interface DmtcLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'full' | 'horizontal' | 'emblem';
  showBadge?: boolean;
}

export const DmtcLogo: React.FC<DmtcLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'full',
  showBadge = false
}) => {
  const { logoURL } = useLogo();
  const currentLogoSrc = logoURL || dmtcOfficialSvg;

  // Dimensions for full vertical lockup (matching du (1).png)
  const fullDimensions = {
    xs: 'w-16 h-16',
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-40 h-40',
    xl: 'w-48 h-48',
    '2xl': 'w-60 h-60'
  }[size];

  // Dimensions for horizontal lockup (for top bars)
  const horizontalDimensions = {
    xs: { img: 'w-7 h-7', title: 'text-xs', sub: 'text-[8px]', dmtc: 'text-[9px]' },
    sm: { img: 'w-9 h-9', title: 'text-sm', sub: 'text-[9px]', dmtc: 'text-[10px]' },
    md: { img: 'w-12 h-12', title: 'text-base', sub: 'text-[10px]', dmtc: 'text-xs' },
    lg: { img: 'w-16 h-16', title: 'text-lg', sub: 'text-xs', dmtc: 'text-sm' },
    xl: { img: 'w-20 h-20', title: 'text-xl', sub: 'text-sm', dmtc: 'text-base' },
    '2xl': { img: 'w-24 h-24', title: 'text-2xl', sub: 'text-base', dmtc: 'text-lg' }
  }[size];

  if (variant === 'horizontal') {
    const dim = horizontalDimensions;
    return (
      <div className={`inline-flex items-center gap-3 select-none ${className}`} dir="rtl">
        <div className={`relative ${dim.img} shrink-0 flex items-center justify-center`}>
          <img 
            src={currentLogoSrc} 
            alt="DMTC Logo" 
            className="w-full h-full object-contain filter drop-shadow-sm select-none"
            loading="eager"
          />
        </div>
        <div className="flex flex-col text-right leading-none">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`font-black tracking-wider text-[#311B92] dark:text-[#A855F7] font-sans ${dim.dmtc}`}>
              DMTC
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <span className={`font-black text-[#4A148C] dark:text-[#C084FC] tracking-tight ${dim.title}`}>
            درة المنورة
          </span>
          <span className={`font-black text-slate-600 dark:text-slate-400 mt-0.5 ${dim.sub}`}>
            للنقليات • نقل العمال
          </span>
        </div>
      </div>
    );
  }

  // Default: Full official lockup (exact representation of du (1).png)
  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`} dir="rtl">
      <div className={`relative ${fullDimensions} flex items-center justify-center transition-transform hover:scale-[1.02] duration-300`}>
        <img 
          src={currentLogoSrc} 
          alt="شركة درة المنورة للنقليات - DMTC" 
          className="w-full h-full object-contain filter drop-shadow-md select-none"
          loading="eager"
        />
      </div>

      {showBadge && (
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900 text-[10px] font-black text-primary shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>قسم التشغيل ونقل العمال</span>
        </div>
      )}
    </div>
  );
};
