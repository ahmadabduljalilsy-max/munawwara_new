import { lazy } from 'react';

const loaders = {
  dashboard: () => import('../components/Dashboard').then(m => ({ default: m.Dashboard })),
  fleet: () => import('../components/FleetList').then(m => ({ default: m.FleetList })),
  monitoring: () => import('../components/WorkerList').then(m => ({ default: m.WorkerList })),
  drivers: () => import('../components/CompanyDriversList').then(m => ({ default: m.CompanyDriversList })),
  reports: () => import('../components/AdministrativeReports').then(m => ({ default: m.AdministrativeReports })),
  salaries: () => import('../components/SalaryList').then(m => ({ default: m.SalaryList })),
  admin: () => import('../components/AdminPanel').then(m => ({ default: m.AdminPanel })),
  locations: () => import('../components/WorkLocationsDashboard').then(m => ({ default: m.WorkLocationsDashboard })),
  publicResponse: () => import('../components/PublicDriverResponsePage').then(m => ({ default: m.PublicDriverResponsePage })),
  auth: () => import('../components/AuthPage').then(m => ({ default: m.AuthPage })),
  busForm: () => import('../components/BusForm').then(m => ({ default: m.BusForm })),
  workerForm: () => import('../components/WorkerForm').then(m => ({ default: m.WorkerForm })),
  companyDriverForm: () => import('../components/CompanyDriverFormModal').then(m => ({ default: m.CompanyDriverFormModal })),
  driverResponseModal: () => import('../components/DriverResponseModal').then(m => ({ default: m.DriverResponseModal })),
  reportTemplate: () => import('../components/ReportTemplates').then(m => ({ default: m.ReportTemplate })),
  welcomeAnnouncement: () => import('../components/WelcomeAnnouncementModal').then(m => ({ default: m.WelcomeAnnouncementModal }))
};

export const LazyDashboard = lazy(loaders.dashboard);
export const LazyFleetList = lazy(loaders.fleet);
export const LazyWorkerList = lazy(loaders.monitoring);
export const LazyCompanyDriversList = lazy(loaders.drivers);
export const LazyAdministrativeReports = lazy(loaders.reports);
export const LazySalaryList = lazy(loaders.salaries);
export const LazyAdminPanel = lazy(loaders.admin);
export const LazyWorkLocationsDashboard = lazy(loaders.locations);
export const LazyPublicDriverResponsePage = lazy(loaders.publicResponse);
export const LazyAuthPage = lazy(loaders.auth);
export const LazyBusForm = lazy(loaders.busForm);
export const LazyWorkerForm = lazy(loaders.workerForm);
export const LazyCompanyDriverFormModal = lazy(loaders.companyDriverForm);
export const LazyDriverResponseModal = lazy(loaders.driverResponseModal);
export const LazyReportTemplate = lazy(loaders.reportTemplate);
export const LazyWelcomeAnnouncementModal = lazy(loaders.welcomeAnnouncement);

const prefetched = new Set<string>();

export function prefetchTab(tabId: string): void {
  if (prefetched.has(tabId)) return;
  const loader = loaders[tabId as keyof typeof loaders];
  if (loader) {
    prefetched.add(tabId);
    void loader().catch(() => {
      prefetched.delete(tabId);
    });
  }
}
