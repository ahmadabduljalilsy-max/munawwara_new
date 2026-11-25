import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  Plus,
  FileDown,
  Download,
  Upload,
  RefreshCw,
  ChevronDown,
  X,
  AlertTriangle,
  BarChart3,
  MoreVertical,
  Columns3,
  RotateCcw
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Worker } from '../types';
import { differenceInDays, parseISO } from 'date-fns';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { WorkerDetailsModal } from './WorkerDetailsModal';
import { normalizeBusLocation } from '../lib/excelService';

interface WorkerListProps {
  workers: Worker[];
  isAdmin: boolean;
  canEdit?: boolean;
  onAdd?: () => void;
  onEdit?: (worker: Worker) => void;
  onDelete?: (id: string) => void;
  onDeleteAll?: () => void;
  onExportExcel: (data: Worker[]) => void;
  onExportPdf: (data: Worker[]) => void;
  onImport?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRenumberWorkers?: () => void;
}

type ContractQuickFilter = 'none' | 'expiring_soon' | 'expired_active';

interface RegionItem {
  name: string;
  count: number;
}

interface RegionNode {
  type: 'group' | 'single';
  key: string;
  label: string;
  totalCount: number;
  items: RegionItem[];
}

const formatWorkerName = (name?: string) => {
  if (!name) return '';
  const cleaned = name.replace(/(?:^|\s)أسد(?:\s|$)/g, ' ').trim();
  return cleaned.replace(/[A-Za-z]+/g, (word) =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
};

const sanitizeText = (val?: string) => {
  return (val || '').replace(/(?:^|\s)أسد(?:\s|$)/g, ' ').trim();
};

const formatDateUnified = (dateStr?: string) => {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();
  if (!trimmed) return '';
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return trimmed;
};

const DEFAULT_FILTERS = {
  busStatus: 'all' as 'all' | 'linked' | 'unlinked',
  workerStatus: 'active' as 'active' | 'all' | 'terminated',
  workplace: '',
  clientName: '',
  recruitmentCompany: ''
};

export const WorkerList: React.FC<WorkerListProps> = ({
  workers,
  isAdmin,
  canEdit = isAdmin,
  onAdd,
  onEdit,
  onDelete,
  onDeleteAll,
  onExportExcel,
  onExportPdf,
  onImport,
  onRenumberWorkers
}) => {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [contractQuickFilter, setContractQuickFilter] = useState<ContractQuickFilter>('none');
  const [showFilters, setShowFilters] = useState(false);
  const [sortOption, setSortOption] = useState<'workplace' | 'name' | 'startDate' | 'workerNumber'>('workplace');

  const [expandedRegionGroups, setExpandedRegionGroups] = useState<Set<string>>(new Set());
  const hasAutoOpenedFirstGroup = useRef(false);

  const [sortField, setSortField] = useState<keyof Worker>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string | null;
    name?: string;
  }>({ isOpen: false, id: null });
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isRenumberConfirmOpen, setIsRenumberConfirmOpen] = useState(false);
  const [selectedWorkerForDetails, setSelectedWorkerForDetails] = useState<Worker | null>(null);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const columnsMenuRef = useRef<HTMLDivElement>(null);

  const [optionalColumns, setOptionalColumns] = useState({
    workplace: false,
    company: false,
    endDate: false,
    contractStatus: false,
    previousBuses: false,
    category: false
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(e.target as Node)) {
        setIsColumnsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const getRemainingDays = (endDate?: string) => {
    if (!endDate) return null;
    try {
      const targetDate = parseISO(endDate);
      const todayDate = parseISO(today);
      return differenceInDays(targetDate, todayDate);
    } catch {
      return null;
    }
  };

  const calculateDays = (start?: string, end?: string) => {
    try {
      if (!start) return 0;
      const startDate = parseISO(start);
      const endDate = end ? parseISO(end) : parseISO(today);
      const days = differenceInDays(endDate, startDate);
      return days > 0 ? days : 0;
    } catch {
      return 0;
    }
  };

  // Distinct dropdown lists
  const workplaces = useMemo(() => {
    const set = new Set<string>();
    workers.forEach(w => set.add(normalizeBusLocation(w.workplace)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [workers]);

  const clients = useMemo(() => {
    return Array.from(new Set<string>(workers.map(w => sanitizeText(w.clientName)).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'ar')
    );
  }, [workers]);

  const companies = useMemo(() => {
    return Array.from(new Set<string>(workers.map(w => sanitizeText(w.recruitmentCompany)).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'ar')
    );
  }, [workers]);

  const activeWorkers = useMemo(() => {
    return workers.filter(w => !w.endDate || w.endDate >= today);
  }, [workers, today]);

  const formerWorkers = useMemo(() => {
    return workers.filter(w => !!w.endDate && w.endDate < today);
  }, [workers, today]);

  const activeExpiredContracts = useMemo(() => {
    return activeWorkers.filter(w => {
      const contractEnd = (w as any).contractEndDate;
      return typeof contractEnd === 'string' && contractEnd.trim() !== '' && contractEnd < today;
    });
  }, [activeWorkers, today]);

  const activeLinkedCount = useMemo(
    () => activeWorkers.filter(w => !!w.assignedBusId).length,
    [activeWorkers]
  );

  const activeUnlinkedCount = useMemo(
    () => activeWorkers.filter(w => !w.assignedBusId).length,
    [activeWorkers]
  );

  const activeCompanies = useMemo(() => {
    const map = new Map<string, number>();
    activeWorkers.forEach(w => {
      const c = sanitizeText(w.recruitmentCompany);
      if (c) map.set(c, (map.get(c) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [activeWorkers]);

  const hasDuplicateNumbers = useMemo(() => {
    const seen = new Set<string>();
    for (const w of workers) {
      if (!w.workerNumber) continue;
      if (seen.has(w.workerNumber)) return true;
      seen.add(w.workerNumber);
    }
    return false;
  }, [workers]);

  const duplicateIqamasList = useMemo(() => {
    const map = new Map<string, string[]>();
    workers.forEach(w => {
      const key = (w.iqamaNumber || w.nationalId || '').trim();
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(formatWorkerName(w.name));
    });
    const dupes: { id: string; count: number; names: string[] }[] = [];
    map.forEach((names, id) => {
      if (names.length > 1) dupes.push({ id, count: names.length, names });
    });
    return dupes;
  }, [workers]);

  // Base pool reflecting workerStatus + clientName + recruitmentCompany (so sidebar region counts stay accurate)
  const sidebarPoolWorkers = useMemo(() => {
    return workers.filter(w => {
      const isTerminated = !!w.endDate && w.endDate < today;
      if (filters.workerStatus === 'active' && isTerminated) return false;
      if (filters.workerStatus === 'terminated' && !isTerminated) return false;
      if (filters.clientName && sanitizeText(w.clientName) !== filters.clientName) return false;
      if (filters.recruitmentCompany && sanitizeText(w.recruitmentCompany) !== filters.recruitmentCompany) return false;
      return true;
    });
  }, [workers, filters.workerStatus, filters.clientName, filters.recruitmentCompany, today]);

  // Build collapsible region tree
  const regionTree = useMemo<RegionNode[]>(() => {
    const counts = new Map<string, number>();
    sidebarPoolWorkers.forEach(w => {
      const wp = normalizeBusLocation(w.workplace);
      counts.set(wp, (counts.get(wp) || 0) + 1);
    });

    const prefixGroups = new Map<string, RegionItem[]>();
    counts.forEach((count, wp) => {
      if (count === 0) return;
      const parts = wp.split(/\s*[-–/]\s*/);
      const base = parts[0].trim();
      if (!prefixGroups.has(base)) prefixGroups.set(base, []);
      prefixGroups.get(base)!.push({ name: wp, count });
    });

    const nodes: RegionNode[] = [];
    prefixGroups.forEach((items, base) => {
      const totalCount = items.reduce((acc, item) => acc + item.count, 0);
      if (items.length > 1) {
        const sortedItems = [...items].sort((a, b) => {
          if (a.name === base) return -1;
          if (b.name === base) return 1;
          return b.count - a.count;
        });
        nodes.push({
          type: 'group',
          key: base,
          label: base,
          totalCount,
          items: sortedItems
        });
      } else {
        nodes.push({
          type: 'single',
          key: items[0].name,
          label: items[0].name,
          totalCount,
          items
        });
      }
    });

    return nodes.sort((a, b) => {
      if (a.key === 'في الشركة' && b.key !== 'في الشركة') return 1;
      if (b.key === 'في الشركة' && a.key !== 'في الشركة') return -1;
      if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
      return a.label.localeCompare(b.label, 'ar');
    });
  }, [sidebarPoolWorkers]);

  // Automatically expand the first collapsible region group on load
  useEffect(() => {
    if (hasAutoOpenedFirstGroup.current || regionTree.length === 0) return;
    hasAutoOpenedFirstGroup.current = true;
    const firstGroup = regionTree.find(n => n.type === 'group');
    if (firstGroup) {
      setExpandedRegionGroups(new Set([firstGroup.key]));
    }
  }, [regionTree]);

  // Ensure parent group expands if filters.workplace is changed to a child inside a group
  useEffect(() => {
    if (!filters.workplace) return;
    const parentGroup = regionTree.find(
      n => n.type === 'group' && n.items.some(i => i.name === filters.workplace)
    );
    if (parentGroup) {
      setExpandedRegionGroups(prev => {
        if (prev.has(parentGroup.key)) return prev;
        const next = new Set(prev);
        next.add(parentGroup.key);
        return next;
      });
    }
  }, [filters.workplace, regionTree]);

  // Region-filtered workers (before busStatus / contractQuickFilter / search)
  const regionWorkers = useMemo(() => {
    if (!filters.workplace) return sidebarPoolWorkers;
    return sidebarPoolWorkers.filter(w => normalizeBusLocation(w.workplace) === filters.workplace);
  }, [sidebarPoolWorkers, filters.workplace]);

  // Quick filter counts
  const regionCounts = useMemo(() => {
    const all = regionWorkers.length;
    const unlinked = regionWorkers.filter(w => !w.assignedBusId).length;
    const expiringSoon = regionWorkers.filter(w => {
      const target = (w as any).contractEndDate || w.endDate;
      const days = getRemainingDays(target);
      return days !== null && days >= 0 && days <= 30;
    }).length;
    return { all, unlinked, expiringSoon };
  }, [regionWorkers, today]);

  // Final filtered & sorted workers
  const filteredWorkers = useMemo(() => {
    const searchTerm = search.toLowerCase().trim();

    return regionWorkers
      .filter(w => {
        if (filters.busStatus === 'linked' && !w.assignedBusId) return false;
        if (filters.busStatus === 'unlinked' && w.assignedBusId) return false;

        if (contractQuickFilter === 'expiring_soon') {
          const target = (w as any).contractEndDate || w.endDate;
          const days = getRemainingDays(target);
          if (days === null || days < 0 || days > 30) return false;
        }
        if (contractQuickFilter === 'expired_active') {
          const contractEnd = (w as any).contractEndDate;
          if (!contractEnd || contractEnd >= today) return false;
        }

        if (!searchTerm) return true;

        return (
          w.name.toLowerCase().includes(searchTerm) ||
          (w.iqamaNumber && w.iqamaNumber.toLowerCase().includes(searchTerm)) ||
          (w.nationalId && w.nationalId.toLowerCase().includes(searchTerm)) ||
          (w.workerNumber && w.workerNumber.toLowerCase().includes(searchTerm)) ||
          (w.mobileNumber && w.mobileNumber.toLowerCase().includes(searchTerm)) ||
          (w.assignedBusOperationalNumber &&
            w.assignedBusOperationalNumber.toLowerCase().includes(searchTerm))
        );
      })
      .sort((a, b) => {
        if (sortField === 'workerNumber') {
          const numA = parseInt(a.workerNumber, 10);
          const numB = parseInt(b.workerNumber, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            return sortOrder === 'asc' ? numA - numB : numB - numA;
          }
        }
        if (sortField === 'workplace') {
          const wpCmp = normalizeBusLocation(a.workplace).localeCompare(
            normalizeBusLocation(b.workplace),
            'ar'
          );
          if (wpCmp !== 0) return sortOrder === 'asc' ? wpCmp : -wpCmp;
          return a.name.localeCompare(b.name, 'ar');
        }
        const valA = String(a[sortField] || '');
        const valB = String(b[sortField] || '');
        const cmp = valA.localeCompare(valB, 'ar');
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [regionWorkers, filters.busStatus, contractQuickFilter, search, sortField, sortOrder, today]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.busStatus !== 'all') count += 1;
    if (filters.workerStatus !== 'active') count += 1;
    if (filters.workplace !== '') count += 1;
    if (filters.clientName !== '') count += 1;
    if (filters.recruitmentCompany !== '') count += 1;
    if (contractQuickFilter !== 'none') count += 1;
    return count;
  }, [filters, contractQuickFilter]);

  const totalPages = Math.ceil(filteredWorkers.length / PAGE_SIZE);
  const paginatedWorkers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredWorkers.slice(start, start + PAGE_SIZE);
  }, [filteredWorkers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filters, contractQuickFilter]);

  const regionActiveCount = useMemo(
    () => regionWorkers.filter(w => !w.endDate || w.endDate >= today).length,
    [regionWorkers, today]
  );

  const regionAverageDays = useMemo(() => {
    const withStart = regionWorkers.filter(w => !!w.startDate);
    if (withStart.length === 0) return 0;
    const total = withStart.reduce((acc, w) => acc + calculateDays(w.startDate, w.endDate), 0);
    return Math.round(total / withStart.length);
  }, [regionWorkers, today]);

  const workplaceChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeWorkers.forEach(w => {
      const wp = normalizeBusLocation(w.workplace);
      counts[wp] = (counts[wp] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [activeWorkers]);

  const busLinkageChartData = useMemo(
    () => [
      { name: 'سائقون بحافلات', value: activeLinkedCount, color: '#0066F6' },
      { name: 'بدون حافلة', value: activeUnlinkedCount, color: '#EA580C' }
    ],
    [activeLinkedCount, activeUnlinkedCount]
  );

  const companyChartData = useMemo(() => {
    return activeCompanies.slice(0, 5);
  }, [activeCompanies]);

  const toggleSort = (field: keyof Worker) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSortDropdownChange = (val: 'workplace' | 'name' | 'startDate' | 'workerNumber') => {
    setSortOption(val);
    setSortField(val);
    setSortOrder('asc');
  };

  const toggleRegionGroup = (groupKey: string) => {
    setExpandedRegionGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const resetAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setContractQuickFilter('none');
    setSearch('');
  };

  const handleKpiClick = (target: 'active' | 'linked' | 'unlinked' | 'companies') => {
    if (target === 'active') {
      setFilters({ ...DEFAULT_FILTERS, workerStatus: 'active', busStatus: 'all' });
      setContractQuickFilter('none');
    } else if (target === 'linked') {
      setFilters(f => ({ ...f, workerStatus: 'active', busStatus: 'linked', workplace: '' }));
      setContractQuickFilter('none');
    } else if (target === 'unlinked') {
      setFilters(f => ({ ...f, workerStatus: 'active', busStatus: 'unlinked', workplace: '' }));
      setContractQuickFilter('none');
    } else if (target === 'companies') {
      setShowFilters(true);
    }
  };

  const optionalColumnDefs: { key: keyof typeof optionalColumns; label: string }[] = [
    { key: 'workplace', label: 'مكان العمل' },
    { key: 'company', label: 'شركة الاستخدام' },
    { key: 'endDate', label: 'نهاية العمل' },
    { key: 'contractStatus', label: 'حالة انتهاء العقد' },
    { key: 'previousBuses', label: 'الحافلات السابقة' },
    { key: 'category', label: 'الفئة' }
  ];

  const totalColumnsCount = 4 + Object.values(optionalColumns).filter(Boolean).length;
  const selectedRegionLabel = filters.workplace || 'كل المناطق';

  return (
    <div className="space-y-5 text-right text-text-main" dir="rtl">
      {/* Data Integrity Alerts */}
      {hasDuplicateNumbers && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-900 dark:text-red-200 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>تم كشف تكرار في أرقام بعض العمال. يرجى إعادة الترقيم التسلسلي لتصحيح الأرقام.</span>
          </div>
          {onRenumberWorkers && (
            <button
              type="button"
              onClick={() => setIsRenumberConfirmOpen(true)}
              className="min-h-[44px] px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              إعادة ترقيم تسلسلي
            </button>
          )}
        </div>
      )}

      {duplicateIqamasList.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 px-4 py-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-amber-900 dark:text-amber-200 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            تكرار في أرقام الإقامة/الهوية ({duplicateIqamasList.length} حالة):{' '}
            {duplicateIqamasList.map(d => `${d.id} (${d.names.join(' / ')})`).slice(0, 2).join(' · ')}
          </span>
        </div>
      )}

      {/* 1. Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-text-main flex items-center gap-2">
            <span>الرقابة</span>
            <span className="text-primary font-bold">والمتابعة</span>
          </h2>
          <p className="text-xs font-semibold text-text-muted mt-1">
            متابعة السائقين والعمال الميدانيين، الحافلات المرتبطة، وحالة العقود حسب المنطقة
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(prev => !prev)}
              className="min-h-[44px] px-4 inline-flex items-center gap-2 bg-surface border border-border text-text-main rounded-xl text-xs font-bold hover:bg-background transition-colors shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              aria-expanded={isMoreMenuOpen}
            >
              <MoreVertical className="w-4 h-4 text-text-muted" />
              <span>المزيد</span>
              <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMoreMenuOpen && (
              <div
                className="absolute left-0 mt-2 w-60 bg-surface border border-border rounded-2xl shadow-lg py-1.5 z-50"
                dir="rtl"
              >
                {canEdit && onImport && (
                  <label className="min-h-[44px] w-full flex items-center gap-2.5 px-4 text-xs font-bold text-text-main hover:bg-background transition-colors cursor-pointer">
                    <Upload className="w-4 h-4 text-primary shrink-0" />
                    <span>استيراد Excel</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      className="hidden"
                      onChange={e => {
                        setIsMoreMenuOpen(false);
                        onImport(e);
                      }}
                    />
                  </label>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onExportExcel(filteredWorkers);
                  }}
                  className="min-h-[44px] w-full flex items-center gap-2.5 px-4 text-xs font-bold text-text-main hover:bg-background transition-colors text-right outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>تصدير Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onExportPdf(filteredWorkers);
                  }}
                  className="min-h-[44px] w-full flex items-center gap-2.5 px-4 text-xs font-bold text-text-main hover:bg-background transition-colors text-right outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                  <span>تصدير PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setShowAnalytics(prev => !prev);
                  }}
                  className="min-h-[44px] w-full flex items-center gap-2.5 px-4 text-xs font-bold text-text-main hover:bg-background transition-colors text-right outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                >
                  <BarChart3 className="w-4 h-4 text-primary shrink-0" />
                  <span>{showAnalytics ? 'إخفاء التحليلات' : 'مؤشرات الرقابة والتحليلات'}</span>
                </button>

                {isAdmin && onRenumberWorkers && (
                  <>
                    <div className="my-1 border-t border-border" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setIsRenumberConfirmOpen(true);
                      }}
                      className="min-h-[44px] w-full flex items-center gap-2.5 px-4 text-xs font-bold text-primary hover:bg-primary-light transition-colors text-right outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 shrink-0" />
                      <span>إعادة ترقيم تسلسلي</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {canEdit && onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="min-h-[44px] px-5 inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-primary/20 outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عامل جديد</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Single 4-cell Stats Bar */}
      <section
        aria-label="ملخص أرقام العمال"
        className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden"
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-x-reverse divide-border">
          <button
            type="button"
            onClick={() => handleKpiClick('active')}
            className={`min-h-[44px] p-4 sm:px-6 text-right transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary cursor-pointer ${
              filters.workerStatus === 'active' &&
              filters.busStatus === 'all' &&
              !filters.recruitmentCompany &&
              contractQuickFilter === 'none'
                ? 'bg-primary-light/60'
                : 'hover:bg-background/60'
            }`}
          >
            <p className="text-xs font-bold text-text-muted">العمال النشطون</p>
            <p className="text-2xl font-black text-text-main tabular-nums mt-1">
              {activeWorkers.length}
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleKpiClick('linked')}
            className={`min-h-[44px] p-4 sm:px-6 text-right transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary cursor-pointer ${
              filters.workerStatus === 'active' && filters.busStatus === 'linked'
                ? 'bg-primary-light/60'
                : 'hover:bg-background/60'
            }`}
          >
            <p className="text-xs font-bold text-text-muted">سائقون بحافلات</p>
            <p className="text-2xl font-black text-text-main tabular-nums mt-1">
              {activeLinkedCount}
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleKpiClick('unlinked')}
            className={`min-h-[44px] p-4 sm:px-6 text-right transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary cursor-pointer ${
              filters.workerStatus === 'active' && filters.busStatus === 'unlinked'
                ? 'bg-orange-50 dark:bg-orange-950/30'
                : 'hover:bg-orange-50/50 dark:hover:bg-orange-950/20'
            }`}
          >
            <p className="text-xs font-bold text-orange-700 dark:text-orange-400">بدون حافلة</p>
            <p className="text-2xl font-black text-orange-700 dark:text-orange-400 tabular-nums mt-1">
              {activeUnlinkedCount}
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleKpiClick('companies')}
            className={`min-h-[44px] p-4 sm:px-6 text-right transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary cursor-pointer ${
              filters.recruitmentCompany ? 'bg-primary-light/60' : 'hover:bg-background/60'
            }`}
          >
            <p className="text-xs font-bold text-text-muted">شركات الاستخدام</p>
            <p className="text-2xl font-black text-text-main tabular-nums mt-1">
              {activeCompanies.length}
            </p>
          </button>
        </div>
      </section>

      {/* 3. Calm Single-Line Contract Status Alert */}
      {activeExpiredContracts.length > 0 ? (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-2.5 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              يوجد <span className="font-bold tabular-nums">{activeExpiredContracts.length}</span> عقد منتهٍ بين العمال النشطين.
              {formerWorkers.length > 0 && (
                <>
                  {' '}
                  كما توجد <span className="font-bold tabular-nums">{formerWorkers.length}</span> عقود منتهية تخص عمالًا سابقين.
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setFilters(f => ({ ...f, workerStatus: 'active', workplace: '' }));
                setContractQuickFilter('expired_active');
              }}
              className="min-h-[44px] px-2 text-xs font-bold text-amber-900 dark:text-amber-200 underline hover:text-amber-700 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded cursor-pointer"
            >
              عرض النشطين المنتهية عقودهم
            </button>
            {formerWorkers.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFilters(f => ({
                    ...f,
                    workerStatus: f.workerStatus === 'terminated' ? 'active' : 'terminated'
                  }));
                  setContractQuickFilter('none');
                }}
                className="min-h-[44px] px-2 text-xs font-bold text-primary hover:underline outline-none focus-visible:ring-2 focus-visible:ring-primary rounded cursor-pointer"
              >
                {filters.workerStatus === 'terminated' ? 'العودة للعمال النشطين' : 'عرض العمال السابقين'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted shadow-xs">
          <div className="flex items-center gap-2.5 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
            <span>
              لا توجد عقود منتهية بين العمال النشطين.
              {formerWorkers.length > 0 && (
                <>
                  {' '}
                  <span className="tabular-nums text-text-main font-bold">
                    {formerWorkers.length} عقدًا منتهيًا تخص عمالًا سابقين
                  </span>
                </>
              )}
            </span>
          </div>
          {formerWorkers.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilters(f => ({
                  ...f,
                  workerStatus: f.workerStatus === 'terminated' ? 'active' : 'terminated'
                }));
                setContractQuickFilter('none');
              }}
              className="min-h-[44px] px-2 text-xs font-bold text-primary hover:underline outline-none focus-visible:ring-2 focus-visible:ring-primary rounded cursor-pointer"
            >
              {filters.workerStatus === 'terminated' ? 'العودة للعمال النشطين' : 'عرض العمال السابقين'}
            </button>
          )}
        </div>
      )}

      {/* Optional Analytics Panel */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-1">
              <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-text-main">توزيع العمال حسب المنطقة</h3>
                  <span className="text-xs text-text-muted tabular-nums">{workplaceChartData.length} منطقة</span>
                </div>
                <div className="h-56 w-full text-xs">
                  {workplaceChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={workplaceChartData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={90} tickLine={false} axisLine={false} style={{ fontSize: '12px' }} />
                        <Tooltip formatter={value => [`${value} عامل`, 'العدد']} />
                        <Bar dataKey="count" fill="#0066F6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-text-muted">لا تتوفر بيانات</div>
                  )}
                </div>
              </div>

              <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-text-main">الارتباط بالحافلات</h3>
                  <span className="text-xs font-bold text-primary tabular-nums">
                    {Math.round((activeLinkedCount / (activeWorkers.length || 1)) * 100)}%
                  </span>
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={busLinkageChartData} cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={4} dataKey="value">
                        {busLinkageChartData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={value => [`${value} عامل`, 'العدد']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-around text-xs pt-2 border-t border-border tabular-nums">
                  <span className="font-semibold text-text-main">بحافلة: {activeLinkedCount}</span>
                  <span className="text-orange-700 dark:text-orange-400 font-bold">بدون حافلة: {activeUnlinkedCount}</span>
                </div>
              </div>

              <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-text-main">أبرز شركات الاستخدام</h3>
                  <span className="text-xs text-text-muted">أعلى 5</span>
                </div>
                <div className="h-56 w-full text-xs">
                  {companyChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={companyChartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                        <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: '12px' }} />
                        <YAxis hide />
                        <Tooltip formatter={value => [`${value} عامل`, 'العدد']} />
                        <Bar dataKey="count" fill="#0066F6" radius={[4, 4, 0, 0]} barSize={26} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-text-muted">لا تتوفر بيانات</div>
                  )}
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* 4. Two-Column Main Workspace */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Mobile Region Dropdown */}
        <div className="w-full md:hidden">
          <label htmlFor="mobile-region-select" className="sr-only">
            اختر المنطقة
          </label>
          <select
            id="mobile-region-select"
            value={filters.workplace}
            onChange={e => setFilters(f => ({ ...f, workplace: e.target.value }))}
            className="w-full min-h-[44px] px-3.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-main outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
          >
            <option value="">كل المناطق ({sidebarPoolWorkers.length})</option>
            {regionTree.map(node =>
              node.type === 'group' ? (
                <optgroup key={node.key} label={`${node.label} (${node.totalCount})`}>
                  {node.items.map(item => (
                    <option key={item.name} value={item.name}>
                      {item.name} ({item.count})
                    </option>
                  ))}
                </optgroup>
              ) : (
                <option key={node.key} value={node.key}>
                  {node.label} ({node.totalCount})
                </option>
              )
            )}
          </select>
        </div>

        {/* Right Sidebar: Regions List (270px on desktop) */}
        <aside
          aria-label="قائمة المناطق"
          className="hidden md:block w-[270px] shrink-0 bg-surface border border-border rounded-2xl shadow-xs p-2.5"
        >
          <div className="px-2.5 py-2 flex items-center justify-between border-b border-border mb-1.5">
            <span className="text-xs font-bold text-text-muted">المناطق</span>
            {sidebarPoolWorkers.length > 0 && (
              <span className="text-xs font-bold text-text-muted tabular-nums">
                {sidebarPoolWorkers.length}
              </span>
            )}
          </div>

          <nav className="space-y-0.5 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setFilters(f => ({ ...f, workplace: '' }))}
              className={`w-full min-h-[44px] px-3 rounded-xl flex items-center justify-between gap-2 text-right text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                filters.workplace === ''
                  ? 'bg-primary-light text-primary font-bold'
                  : 'text-text-main hover:bg-background font-semibold'
              }`}
            >
              <span className="truncate">كل المناطق</span>
              {sidebarPoolWorkers.length > 0 && (
                <span className="text-xs tabular-nums shrink-0">{sidebarPoolWorkers.length}</span>
              )}
            </button>

            {regionTree.map(node => {
              if (node.type === 'single') {
                const isSelected = filters.workplace === node.key;
                return (
                  <button
                    key={node.key}
                    type="button"
                    onClick={() => setFilters(f => ({ ...f, workplace: node.key }))}
                    className={`w-full min-h-[44px] px-3 rounded-xl flex items-center justify-between gap-2 text-right text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                      isSelected
                        ? 'bg-primary-light text-primary font-bold'
                        : 'text-text-main hover:bg-background font-semibold'
                    }`}
                  >
                    <span className="truncate">{node.label}</span>
                    <span className="text-xs tabular-nums shrink-0">{node.totalCount}</span>
                  </button>
                );
              }

              const isExpanded = expandedRegionGroups.has(node.key);
              const hasSelectedChild = node.items.some(i => i.name === filters.workplace);

              return (
                <div key={node.key} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => toggleRegionGroup(node.key)}
                    aria-expanded={isExpanded}
                    className={`w-full min-h-[44px] px-3 rounded-xl flex items-center justify-between gap-2 text-right text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                      hasSelectedChild && !isExpanded
                        ? 'bg-primary-light text-primary font-bold'
                        : 'text-text-main hover:bg-background font-bold'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <ChevronDown
                        className={`w-4 h-4 text-text-muted shrink-0 transition-transform ${
                          isExpanded ? '' : 'rotate-90'
                        }`}
                      />
                      <span className="truncate">{node.label}</span>
                    </span>
                    <span className="text-xs tabular-nums text-text-muted shrink-0">
                      {node.totalCount}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="pr-5 space-y-0.5">
                      {node.items.map(item => {
                        const isSelected = filters.workplace === item.name;
                        return (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => setFilters(f => ({ ...f, workplace: item.name }))}
                            className={`w-full min-h-[44px] px-3 rounded-xl flex items-center justify-between gap-2 text-right text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                              isSelected
                                ? 'bg-primary-light text-primary font-bold'
                                : 'text-text-muted hover:text-text-main hover:bg-background font-semibold'
                            }`}
                          >
                            <span className="truncate">{item.name}</span>
                            <span className="tabular-nums shrink-0">{item.count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {regionTree.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-text-muted">
                لا توجد مناطق متاحة
              </p>
            )}
          </nav>
        </aside>

        {/* Left Main Panel */}
        <main className="flex-1 min-w-0 w-full bg-surface border border-border rounded-2xl shadow-xs overflow-hidden flex flex-col">
          {/* Search + Filter Toolbar + Collapsible Advanced Filters Panel */}
          <div className="p-4 border-b border-border space-y-3">
            {/* Row 1: Sort + Search + Funnel Filter Button + Refresh Button */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
              {/* Sort selector */}
              <div className="flex items-center gap-2 px-3 min-h-[44px] bg-background border border-border rounded-xl shrink-0">
                <span className="text-xs font-bold text-text-muted whitespace-nowrap">ترتيب حسب:</span>
                <select
                  value={sortOption}
                  onChange={e => handleSortDropdownChange(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary rounded cursor-pointer"
                >
                  <option value="workplace">المنطقة (مكان العمل)</option>
                  <option value="name">اسم العامل</option>
                  <option value="startDate">تاريخ البدء</option>
                  <option value="workerNumber">الرقم الوظيفي</option>
                </select>
              </div>

              {/* Search Input */}
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ابحث بالاسم، رقم الإقامة، أو رقم الحافلة..."
                  className="w-full min-h-[44px] pr-10 pl-10 bg-background border border-border focus:border-primary rounded-xl text-sm text-text-main placeholder:text-text-muted outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors shadow-2xs"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="مسح البحث"
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 text-text-muted hover:text-red-500 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter Button (Blue funnel icon) + Circular Refresh Button */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFilters(prev => !prev)}
                  aria-expanded={showFilters}
                  title="الفلاتر المتقدمة"
                  className={`relative min-h-[44px] px-3.5 inline-flex items-center gap-2 rounded-xl border text-xs font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                    showFilters
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-surface text-primary border-border hover:bg-primary-light/60 shadow-2xs'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">الفلاتر</span>
                  {activeFilterCount > 0 && (
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                        showFilters
                          ? 'bg-white/20 text-white'
                          : 'bg-primary-light text-primary'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          showFilters ? 'bg-white' : 'bg-primary'
                        }`}
                        aria-hidden="true"
                      />
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  title="تحديث البيانات"
                  aria-label="تحديث البيانات"
                  className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center bg-surface border border-border text-text-muted hover:text-primary hover:bg-background rounded-full transition-colors shadow-2xs outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Row 2: Quick Filters (الكل، بدون حافلة، عقود تنتهي قريبًا) + Columns + Reset when active */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFilters(f => ({ ...f, busStatus: 'all' }));
                    setContractQuickFilter('none');
                  }}
                  className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold border transition-colors tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                    filters.busStatus === 'all' && contractQuickFilter === 'none'
                      ? 'bg-primary-light text-primary border-primary/30'
                      : 'bg-surface text-text-main border-border hover:bg-background'
                  }`}
                >
                  الكل{regionCounts.all > 0 ? ` (${regionCounts.all})` : ''}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFilters(f => ({
                      ...f,
                      busStatus: f.busStatus === 'unlinked' ? 'all' : 'unlinked'
                    }));
                    setContractQuickFilter('none');
                  }}
                  className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold border transition-colors tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                    filters.busStatus === 'unlinked'
                      ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800'
                      : 'bg-surface text-text-main border-border hover:bg-background'
                  }`}
                >
                  بدون حافلة{regionCounts.unlinked > 0 ? ` (${regionCounts.unlinked})` : ''}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setContractQuickFilter(prev =>
                      prev === 'expiring_soon' ? 'none' : 'expiring_soon'
                    )
                  }
                  className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold border transition-colors tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                    contractQuickFilter === 'expiring_soon'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                      : 'bg-surface text-text-main border-border hover:bg-background'
                  }`}
                >
                  عقود تنتهي قريبًا{regionCounts.expiringSoon > 0 ? ` (${regionCounts.expiringSoon})` : ''}
                </button>

                {/* Visible Reset Filters button even when Advanced Panel is closed */}
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="min-h-[44px] px-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary-light/70 hover:bg-primary-light rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>إعادة ضبط الفلاتر</span>
                  </button>
                )}
              </div>

              <div className="relative" ref={columnsMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsColumnsMenuOpen(prev => !prev)}
                  className={`min-h-[44px] px-3.5 inline-flex items-center gap-1.5 rounded-xl text-xs font-bold border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                    isColumnsMenuOpen
                      ? 'bg-primary-light text-primary border-primary/30'
                      : 'bg-surface text-text-main border-border hover:bg-background'
                  }`}
                >
                  <Columns3 className="w-4 h-4 text-primary" />
                  <span>الأعمدة</span>
                </button>

                {isColumnsMenuOpen && (
                  <div
                    className="absolute left-0 mt-2 w-56 bg-surface border border-border rounded-2xl shadow-lg p-2 z-40 space-y-0.5"
                    dir="rtl"
                  >
                    <p className="px-2 py-1.5 text-xs font-bold text-text-muted border-b border-border mb-1">
                      أعمدة إضافية
                    </p>
                    {optionalColumnDefs.map(col => (
                      <label
                        key={col.key}
                        className="min-h-[44px] flex items-center gap-2.5 px-2 rounded-xl hover:bg-background cursor-pointer text-xs font-semibold text-text-main"
                      >
                        <input
                          type="checkbox"
                          checked={optionalColumns[col.key]}
                          onChange={() =>
                            setOptionalColumns(prev => ({ ...prev, [col.key]: !prev[col.key] }))
                          }
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span>{col.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible Advanced Filters Panel (Closed by default) */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden border-t border-border pt-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3" dir="rtl">
                    {/* 1. حالة الحافلة */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-text-muted">
                        حالة الحافلة
                      </label>
                      <div className="flex bg-background border border-border rounded-xl p-1 min-h-[44px]">
                        <button
                          type="button"
                          onClick={() => setFilters(f => ({ ...f, busStatus: 'all' }))}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                            filters.busStatus === 'all'
                              ? 'bg-primary text-white shadow-2xs'
                              : 'text-text-muted hover:text-text-main'
                          }`}
                        >
                          الكل
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilters(f => ({ ...f, busStatus: 'linked' }))}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                            filters.busStatus === 'linked'
                              ? 'bg-primary text-white shadow-2xs'
                              : 'text-text-muted hover:text-text-main'
                          }`}
                        >
                          مرتبط
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilters(f => ({ ...f, busStatus: 'unlinked' }))}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                            filters.busStatus === 'unlinked'
                              ? 'bg-primary text-white shadow-2xs'
                              : 'text-text-muted hover:text-text-main'
                          }`}
                        >
                          غير مرتبط
                        </button>
                      </div>
                    </div>

                    {/* 2. حالة العمال */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-text-muted">
                        حالة العمال
                      </label>
                      <select
                        value={filters.workerStatus}
                        onChange={e =>
                          setFilters(f => ({ ...f, workerStatus: e.target.value as any }))
                        }
                        className="w-full min-h-[44px] px-3 bg-background border border-border rounded-xl outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary text-xs font-bold text-text-main cursor-pointer"
                      >
                        <option value="active">العمال النشطين فقط</option>
                        <option value="all">الكل (نشط + منتهي)</option>
                        <option value="terminated">المنتهية عقودهم</option>
                      </select>
                    </div>

                    {/* 3. مكان العمل (synced with right sidebar) */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-text-muted">
                        مكان العمل
                      </label>
                      <select
                        value={filters.workplace}
                        onChange={e => setFilters(f => ({ ...f, workplace: e.target.value }))}
                        className="w-full min-h-[44px] px-3 bg-background border border-border rounded-xl outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary text-xs font-semibold text-text-main cursor-pointer"
                      >
                        <option value="">الكل</option>
                        {workplaces.map(w => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 4. العميل */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-text-muted">
                        العميل
                      </label>
                      <select
                        value={filters.clientName}
                        onChange={e => setFilters(f => ({ ...f, clientName: e.target.value }))}
                        className="w-full min-h-[44px] px-3 bg-background border border-border rounded-xl outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary text-xs font-semibold text-text-main cursor-pointer"
                      >
                        <option value="">الكل</option>
                        {clients.map(c => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 5. شركة الاستخدام */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-text-muted">
                        شركة الاستخدام
                      </label>
                      <select
                        value={filters.recruitmentCompany}
                        onChange={e =>
                          setFilters(f => ({ ...f, recruitmentCompany: e.target.value }))
                        }
                        className="w-full min-h-[44px] px-3 bg-background border border-border rounded-xl outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary text-xs font-semibold text-text-main cursor-pointer"
                      >
                        <option value="">الكل</option>
                        {companies.map(c => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end mt-3">
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="min-h-[44px] px-3.5 text-xs font-bold text-primary hover:underline bg-primary-light/70 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                    >
                      إعادة ضبط الفلاتر
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Region Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-text-main">
                  {selectedRegionLabel}
                  {filters.workerStatus === 'terminated'
                    ? ' — عمال سابقون'
                    : filters.workerStatus === 'all'
                      ? ' — جميع السجلات'
                      : ''}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-text-muted tabular-nums">
                {filters.workerStatus === 'active' && regionActiveCount > 0 && (
                  <span>{regionActiveCount} عامل نشط</span>
                )}
                {filters.workerStatus !== 'active' && regionWorkers.length > 0 && (
                  <span>{regionWorkers.length} عامل</span>
                )}
                {((filters.workerStatus === 'active' && regionActiveCount > 0) ||
                  (filters.workerStatus !== 'active' && regionWorkers.length > 0)) &&
                  regionAverageDays > 0 && <span aria-hidden="true">·</span>}
                {regionAverageDays > 0 && (
                  <span>متوسط مدة العمل: {regionAverageDays} يوم</span>
                )}
              </div>
            </div>
          </div>

          {/* 5. Single Table View (4 Default Columns) */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-background/60 border-b border-border">
                  <th className="px-4 py-3 text-xs font-bold text-text-muted whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className="min-h-[44px] inline-flex items-center gap-1 hover:text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary rounded cursor-pointer"
                    >
                      <span>العامل</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-text-muted whitespace-nowrap">
                    الجوال
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-text-muted whitespace-nowrap">
                    الحافلة الحالية
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-text-muted whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleSort('startDate')}
                      className="min-h-[44px] inline-flex items-center gap-1 hover:text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary rounded cursor-pointer"
                    >
                      <span>بدء العمل</span>
                    </button>
                  </th>

                  {optionalColumns.workplace && (
                    <th className="px-4 py-3 text-xs font-bold text-text-muted whitespace-nowrap">
                      مكان العمل
                    </th>
                  )}
                  {optionalColumns.company && (
                    <th className="px-4 py-3 text-xs font-bold text-text-muted whitespace-nowrap">
                      شركة الاستخدام
                    </th>
                  )}
                  {optionalColumns.endDate && (
                    <th className="px-4 py-3 text-xs font-bold text-text-muted whitespace-nowrap">
                      نهاية العمل
                    </th>
                  )}
                  {optionalColumns.contractStatus && (
                    <th className="px-4 py-3 text-xs font-bold text-text-muted whitespace-nowrap">
                      حالة العقد
                    </th>
                  )}
                  {optionalColumns.previousBuses && (
                    <th className="px-4 py-3 text-xs font-bold text-text-muted whitespace-nowrap">
                      الحافلات السابقة
                    </th>
                  )}
                  {optionalColumns.category && (
                    <th className="px-4 py-3 text-xs font-bold text-text-muted whitespace-nowrap">
                      الفئة
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedWorkers.length > 0 ? (
                  paginatedWorkers.map(worker => {
                    const displayName = formatWorkerName(worker.name);
                    const iqamaVal = worker.iqamaNumber || worker.nationalId || '';
                    const subMeta = [worker.workerNumber, iqamaVal].filter(Boolean).join(' · ');
                    const startFormatted = formatDateUnified(worker.startDate);
                    const endFormatted = formatDateUnified(worker.endDate);
                    const workDays = calculateDays(worker.startDate, worker.endDate);

                    const contractTarget = (worker as any).contractEndDate || worker.endDate;
                    const daysRemaining = getRemainingDays(contractTarget);
                    const isExpired = daysRemaining !== null && daysRemaining < 0;
                    const isExpiringSoon = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30;

                    return (
                      <tr
                        key={worker.id}
                        onClick={() => setSelectedWorkerForDetails(worker)}
                        className="hover:bg-background/70 transition-colors cursor-pointer"
                      >
                        {/* 1. العامل */}
                        <td className="px-4 py-3.5 align-top">
                          <div className="space-y-0.5">
                            <div className="text-sm font-bold text-text-main">
                              {displayName}
                            </div>
                            {subMeta && (
                              <div className="text-xs font-medium text-text-muted tabular-nums">
                                {subMeta}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 2. الجوال */}
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <span
                            className="text-sm font-semibold text-text-main tabular-nums"
                            dir="ltr"
                          >
                            {worker.mobileNumber || '—'}
                          </span>
                        </td>

                        {/* 3. الحافلة الحالية */}
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          {worker.assignedBusId ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold tabular-nums">
                              حافلة {worker.assignedBusOperationalNumber}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 text-xs font-bold">
                              بدون حافلة
                            </span>
                          )}
                        </td>

                        {/* 4. بدء العمل */}
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <div className="space-y-0.5">
                            <div className="text-sm font-semibold text-text-main tabular-nums">
                              {startFormatted || '—'}
                            </div>
                            {workDays > 0 && (
                              <div className="text-xs font-medium text-text-muted tabular-nums">
                                {workDays} يوم
                              </div>
                            )}
                            {(isExpired || isExpiringSoon) && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold border ${
                                  isExpired
                                    ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                }`}
                              >
                                {isExpired
                                  ? 'منتهٍ'
                                  : daysRemaining === 0
                                    ? 'ينتهي اليوم'
                                    : `ينتهي خلال ${daysRemaining} يوم`}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Optional Columns */}
                        {optionalColumns.workplace && (
                          <td className="px-4 py-3.5 align-top whitespace-nowrap text-xs font-semibold text-text-main">
                            {normalizeBusLocation(worker.workplace)}
                          </td>
                        )}
                        {optionalColumns.company && (
                          <td className="px-4 py-3.5 align-top whitespace-nowrap text-xs font-semibold text-text-main">
                            {sanitizeText(worker.recruitmentCompany) || '—'}
                          </td>
                        )}
                        {optionalColumns.endDate && (
                          <td className="px-4 py-3.5 align-top whitespace-nowrap text-xs font-semibold text-text-main tabular-nums">
                            {endFormatted || '—'}
                          </td>
                        )}
                        {optionalColumns.contractStatus && (
                          <td className="px-4 py-3.5 align-top whitespace-nowrap">
                            {isExpired ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-bold">
                                منتهٍ
                              </span>
                            ) : isExpiringSoon ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold">
                                خلال {daysRemaining} يوم
                              </span>
                            ) : (
                              <span className="text-xs text-text-muted">—</span>
                            )}
                          </td>
                        )}
                        {optionalColumns.previousBuses && (
                          <td className="px-4 py-3.5 align-top whitespace-nowrap text-xs text-text-muted tabular-nums">
                            {worker.previousBuses || '—'}
                          </td>
                        )}
                        {optionalColumns.category && (
                          <td className="px-4 py-3.5 align-top whitespace-nowrap text-xs text-text-main">
                            {sanitizeText(worker.clientName) || '—'}
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={totalColumnsCount} className="px-4 py-16 text-center">
                      <p className="text-sm font-bold text-text-muted">
                        لا يوجد عمال يطابقون معايير البحث الحالية
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-border flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-semibold text-text-muted tabular-nums">
                صفحة {currentPage} من {totalPages} · {filteredWorkers.length} سجل
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="min-h-[44px] px-4 bg-surface border border-border rounded-xl text-xs font-bold text-text-main disabled:opacity-45 hover:bg-background transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                >
                  السابق
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="min-h-[44px] px-4 bg-surface border border-border rounded-xl text-xs font-bold text-text-main disabled:opacity-45 hover:bg-background transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Side Drawer */}
      <WorkerDetailsModal
        worker={selectedWorkerForDetails}
        isOpen={!!selectedWorkerForDetails}
        onClose={() => setSelectedWorkerForDetails(null)}
        canEdit={canEdit}
        onEdit={onEdit}
        isAdmin={isAdmin}
        onDelete={
          onDelete
            ? w => setDeleteModal({ isOpen: true, id: w.id, name: formatWorkerName(w.name) })
            : undefined
        }
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={() => {
          if (deleteModal.id && onDelete) {
            onDelete(deleteModal.id);
          }
        }}
        title="حذف بيانات عامل"
        message="هل أنت متأكد من رغبتك في حذف بيانات العامل:"
        itemName={deleteModal.name}
      />

      <DeleteConfirmModal
        isOpen={isDeleteAllModalOpen}
        onClose={() => setIsDeleteAllModalOpen(false)}
        onConfirm={onDeleteAll}
        title="تأكيد حذف جميع العمال"
        message="هل أنت متأكد من رغبتك في حذف جميع بيانات العمال من النظام؟"
      />

      {isRenumberConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs" dir="rtl">
          <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-text-main">
                تأكيد إعادة الترقيم التسلسلي
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                سيؤدي هذا الإجراء إلى إعادة تعيين الأرقام الوظيفية لجميع العمال بشكل متسلسل يبدأ من الرقم 1، مما سيُحدّث الأرقام الحالية في السجلات والتقارير.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsRenumberConfirmOpen(false)}
                className="min-h-[44px] px-4 text-xs font-bold bg-surface border border-border text-text-main rounded-xl hover:bg-background transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRenumberConfirmOpen(false);
                  if (onRenumberWorkers) onRenumberWorkers();
                }}
                className="min-h-[44px] px-4 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              >
                تأكيد إعادة الترقيم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
