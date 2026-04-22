import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AlertCircle } from 'lucide-react';

// --- Lazy Loading Pages ---
const Dashboard = lazy(() => import('./views/Dashboard').then(m => ({ default: m.Dashboard })));
const Analytics = lazy(() => import('./views/Analytics').then(m => ({ default: m.Analytics })));
const Licenses = lazy(() => import('./views/Licenses').then(m => ({ default: m.Licenses })));
const Transactions = lazy(() => import('./views/Transactions').then(m => ({ default: m.Transactions })));
const CRM = lazy(() => import('./views/CRM').then(m => ({ default: m.CRM })));
const Settings = lazy(() => import('./views/Settings').then(m => ({ default: m.Settings })));
const Withdrawals = lazy(() => import('./views/Withdrawals').then(m => ({ default: m.Withdrawals })));
const Affiliates = lazy(() => import('./views/Affiliates').then(m => ({ default: m.Affiliates })));
const PromoPricing = lazy(() => import('./views/PromoPricing').then(m => ({ default: m.PromoPricing })));
const LandingEditor = lazy(() => import('./views/LandingEditor').then(m => ({ default: m.LandingEditor })));
const PlatformSettings = lazy(() => import('./views/PlatformSettings').then(m => ({ default: m.PlatformSettings })));
const EdgeMonitor = lazy(() => import('./views/EdgeMonitor').then(m => ({ default: m.EdgeMonitor })));
const Logs = lazy(() => import('./views/Logs').then(m => ({ default: m.Logs })));
const AdminUsers = lazy(() => import('./views/AdminUsers').then(m => ({ default: m.AdminUsers })));

// --- Components ---

const PageSkeleton = () => (
  <div className="p-8 space-y-6 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-white/5 rounded"></div>
        <div className="h-4 w-64 bg-white/5 rounded"></div>
      </div>
      <div className="h-10 w-32 bg-white/5 rounded"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-32 bg-[#16161C] border border-white/5 rounded-xl"></div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 h-80 bg-[#16161C] border border-white/5 rounded-xl"></div>
      <div className="h-80 bg-[#16161C] border border-white/5 rounded-xl"></div>
    </div>
  </div>
);

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Terjadi Kesalahan</h2>
          <p className="text-gray-400 mb-6 max-w-md">Gagal memuat halaman. Mohon segarkan halaman atau hubungi dukungan teknis jika masalah berlanjut.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#E10600] text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Segarkan Halaman
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Placeholder for missing views
const Placeholder = ({ name }: { name: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
    <div className="w-24 h-24 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-8 shadow-[0_0_30px_rgba(225,6,0,0.1)]">
      <span className="text-5xl font-black italic">M</span>
    </div>
    <h1 className="text-4xl font-black text-white mb-4">{name}</h1>
    <p className="text-white/30 max-w-lg font-medium leading-relaxed">
      Modul ini sedang dalam tahap optimalisasi untuk pengalaman premium yang baru. 
      Nantikan visualisasi data dan kontrol yang lebih canggih dalam waktu dekat.
    </p>
    <div className="mt-10 h-1.5 w-48 bg-white/5 rounded-full overflow-hidden">
      <div className="h-full w-1/3 bg-red-600 rounded-full animate-[progress_2s_ease-in-out_infinite]" />
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Layout>
        <ErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/licenses" element={<Licenses />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/withdrawals" element={<Withdrawals />} />
              <Route path="/affiliates" element={<Affiliates />} />
              <Route path="/promo" element={<PromoPricing />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/platform" element={<PlatformSettings />} />
              <Route path="/edge-monitor" element={<EdgeMonitor />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/admin-users" element={<AdminUsers />} />
              
              <Route path="/live" element={<Placeholder name="Aktivitas Langsung" />} />
              <Route path="/landing" element={<LandingEditor />} />
              <Route path="/config" element={<Placeholder name="Konfigurasi Publik" />} />
              <Route path="/announcements" element={<Placeholder name="Pengumuman" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Layout>
    </Router>
  );
}

export default App;
