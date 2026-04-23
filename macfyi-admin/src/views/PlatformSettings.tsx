import React, { useState } from 'react';
import { 
  Shield, Server, Lock, Bell, Zap, Database, 
  Save, RotateCcw, ChevronDown, Check, AlertCircle, Trash2
} from 'lucide-react';
import { cn } from '../utils/cn';

interface SettingFieldProps {
  label: string;
  description: string;
  type: 'toggle' | 'number' | 'text' | 'json';
  value: any;
  onChange: (val: any) => void;
  defaultValue?: any;
}

const SettingField: React.FC<SettingFieldProps> = ({ 
  label, description, type, value, onChange, defaultValue 
}) => {
  return (
    <div className="py-6 border-b border-white/[0.03] last:border-0 group">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-xl">
          <h4 className="text-sm font-bold text-white mb-1 group-hover:text-red-500 transition-colors">
            {label}
          </h4>
          <p className="text-[11px] text-white/30 font-medium leading-relaxed">
            {description}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {type === 'toggle' && (
            <button
              onClick={() => onChange(!value)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300",
                value ? "bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)]" : "bg-white/10"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300",
                  value ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          )}

          {type === 'number' && (
            <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
              <button 
                onClick={() => onChange(Math.max(0, value - 1))}
                className="p-2 hover:bg-white/5 text-white/40 hover:text-white transition-colors border-r border-white/5"
              >
                <RotateCcw size={14} className="rotate-180" />
              </button>
              <input 
                type="number" 
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                className="w-16 bg-transparent text-center text-sm font-bold text-white focus:outline-none"
              />
              <button 
                onClick={() => onChange(value + 1)}
                className="p-2 hover:bg-white/5 text-white/40 hover:text-white transition-colors border-l border-white/5"
              >
                <ChevronDown size={14} className="rotate-180" />
              </button>
            </div>
          )}

          {type === 'text' && (
            <input 
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-sm font-medium text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all w-64"
            />
          )}

          {defaultValue !== undefined && value !== defaultValue && (
            <button 
              onClick={() => onChange(defaultValue)}
              className="p-2 text-white/20 hover:text-red-500 transition-colors"
              title="Reset ke Default"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>
      
      {type === 'json' && (
        <div className="mt-4">
          <textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
              } catch {
                onChange(e.target.value);
              }
            }}
            rows={5}
            className="w-full bg-[#0E0E11] border border-white/10 rounded-xl p-4 font-mono text-xs text-red-400/80 focus:outline-none focus:border-red-500/30 transition-all custom-scrollbar"
          />
        </div>
      )}
    </div>
  );
};

const SectionCard = ({ icon: Icon, title, description, children, onSave, isDirty }: any) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="bg-[#16161C] border border-white/[0.05] rounded-[2.5rem] overflow-hidden mb-6 shadow-2xl group/card">
      <div 
        className="p-8 flex items-center justify-between cursor-pointer border-b border-white/[0.02]"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/20 flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(225,6,0,0.1)] group-hover/card:scale-110 transition-transform duration-500">
            <Icon size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">{title}</h3>
            <p className="text-xs text-white/30 font-bold uppercase tracking-widest mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isDirty && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse border border-red-500/20">
              <AlertCircle size={10} />
              Perubahan Belum Disimpan
            </span>
          )}
          <button 
            className={cn(
              "p-2 text-white/20 transition-transform duration-300",
              isCollapsed ? "rotate-180" : ""
            )}
          >
            <ChevronDown size={20} />
          </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="p-8 space-y-2">
          {children}
          <div className="pt-6 flex justify-end">
            <button 
              disabled={!isDirty}
              onClick={onSave}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300",
                isDirty 
                  ? "bg-red-600 text-white shadow-[0_0_30px_rgba(225,6,0,0.3)] hover:scale-105 active:scale-95" 
                  : "bg-white/5 text-white/20 cursor-not-allowed"
              )}
            >
              <Save size={14} />
              Simpan Perubahan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const PlatformSettings: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [dirtySections, setDirtySections] = useState<Record<string, boolean>>({});

  // Mock Settings State
  const [settings, setSettings] = useState({
    general: {
      version: 'v2.4.1',
      env: 'Production',
      maintenance: false,
      debug: false
    },
    auth: {
      timeout: 60,
      maxAttempts: 5,
      require2FA: true,
      allowedDomains: ['macfyi.com', 'admin.macfyi.com']
    },
    notifications: {
      emailEnabled: true,
      webhookUrl: 'https://api.macfyi.com/v1/webhooks',
      slackUrl: 'https://hooks.slack.com/services/T000.../B000...',
      events: ['license.created', 'payment.success', 'withdrawal.request']
    },
    rateLimit: {
      api: 100,
      auth: 5,
      export: 10
    }
  });

  const updateSetting = (section: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev as any)[section],
        [field]: value
      }
    }));
    setDirtySections(prev => ({ ...prev, [section]: true }));
  };

  const handleSave = (section: string) => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setDirtySections(prev => ({ ...prev, [section]: false }));
    }, 800);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-600 shadow-[0_0_20px_rgba(225,6,0,0.1)]">
              <Shield size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Sistem & Keamanan</span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2">
            Pengaturan <span className="text-red-600 italic">Platform</span>
          </h1>
          <p className="text-white/30 font-medium max-w-xl">
            Konfigurasi tingkat sistem, keamanan, otentikasi, dan pembatasan laju data untuk stabilitas infrastruktur MacFYI.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 pb-20">
        {/* General */}
        <SectionCard 
          icon={Server} 
          title="Umum" 
          description="Infrastruktur & Lingkungan"
          onSave={() => handleSave('general')}
          isDirty={dirtySections.general}
        >
          <div className="py-6 border-b border-white/[0.03]">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Versi Aplikasi</h4>
                <p className="text-[11px] text-white/30 font-medium leading-relaxed">Build saat ini yang berjalan di server.</p>
              </div>
              <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-black text-white/50">{settings.general.version}</span>
            </div>
          </div>
          <div className="py-6 border-b border-white/[0.03]">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Lingkungan</h4>
                <p className="text-[11px] text-white/30 font-medium leading-relaxed">Status deployment server pusat.</p>
              </div>
              <span className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] font-black text-red-500 uppercase tracking-widest">{settings.general.env}</span>
            </div>
          </div>
          <SettingField 
            label="Mode Pemeliharaan" 
            description="Mengalihkan seluruh trafik ke halaman status maintenance. Hanya admin yang dapat mengakses dasbor."
            type="toggle"
            value={settings.general.maintenance}
            onChange={(val) => updateSetting('general', 'maintenance', val)}
          />
          <SettingField 
            label="Mode Debug" 
            description="Aktifkan logging verbose dan source maps untuk troubleshoot masalah pada server."
            type="toggle"
            value={settings.general.debug}
            onChange={(val) => updateSetting('general', 'debug', val)}
          />
        </SectionCard>

        {/* Authentication */}
        <SectionCard 
          icon={Lock} 
          title="Otentikasi" 
          description="Keamanan Akses Admin"
          onSave={() => handleSave('auth')}
          isDirty={dirtySections.auth}
        >
          <SettingField 
            label="Waktu Sesi Berakhir" 
            description="Durasi (menit) sebelum token admin kedaluwarsa dan memerlukan login ulang."
            type="number"
            value={settings.auth.timeout}
            onChange={(val) => updateSetting('auth', 'timeout', val)}
          />
          <SettingField 
            label="Batas Percobaan Login" 
            description="Jumlah maksimal kegagalan login sebelum akun dikunci selama 30 menit."
            type="number"
            value={settings.auth.maxAttempts}
            onChange={(val) => updateSetting('auth', 'maxAttempts', val)}
          />
          <SettingField 
            label="Wajib 2FA (Otentikasi Dua Faktor)" 
            description="Semua akun admin wajib mengaktifkan Google Authenticator atau sejenisnya."
            type="toggle"
            value={settings.auth.require2FA}
            onChange={(val) => updateSetting('auth', 'require2FA', val)}
          />
          <SettingField 
            label="Domain Email yang Diizinkan" 
            description="Hanya email dengan domain ini yang dapat didaftarkan sebagai admin."
            type="json"
            value={settings.auth.allowedDomains}
            onChange={(val) => updateSetting('auth', 'allowedDomains', val)}
          />
        </SectionCard>

        {/* Notifications */}
        <SectionCard 
          icon={Bell} 
          title="Notifikasi & Webhook" 
          description="Integrasi Sistem Luar"
          onSave={() => handleSave('notifications')}
          isDirty={dirtySections.notifications}
        >
          <SettingField 
            label="Notifikasi Email" 
            description="Kirim ringkasan harian dan alert sistem kritis ke email admin."
            type="toggle"
            value={settings.notifications.emailEnabled}
            onChange={(val) => updateSetting('notifications', 'emailEnabled', val)}
          />
          <SettingField 
            label="Master Webhook URL" 
            description="Endpoint utama untuk meneruskan semua event sistem ke server analitik pihak ketiga."
            type="text"
            value={settings.notifications.webhookUrl}
            onChange={(val) => updateSetting('notifications', 'webhookUrl', val)}
          />
          <SettingField 
            label="Slack Webhook URL" 
            description="Kirim alert keamanan dan penarikan saldo langsung ke channel Slack."
            type="text"
            value={settings.notifications.slackUrl}
            onChange={(val) => updateSetting('notifications', 'slackUrl', val)}
          />
        </SectionCard>

        {/* Rate Limiting */}
        <SectionCard 
          icon={Zap} 
          title="Pembatasan Laju" 
          description="Perlindungan API & DDOS"
          onSave={() => handleSave('rateLimit')}
          isDirty={dirtySections.rateLimit}
        >
          <SettingField 
            label="Limit API Publik" 
            description="Maksimal permintaan per menit per IP address untuk API publik."
            type="number"
            value={settings.rateLimit.api}
            onChange={(val) => updateSetting('rateLimit', 'api', val)}
          />
          <SettingField 
            label="Limit Otentikasi" 
            description="Maksimal upaya login per menit per IP untuk mencegah brute force."
            type="number"
            value={settings.rateLimit.auth}
            onChange={(val) => updateSetting('rateLimit', 'auth', val)}
          />
          <SettingField 
            label="Limit Ekspor Data" 
            description="Maksimal ekspor CSV/JSON per jam untuk menghindari beban berat pada database."
            type="number"
            value={settings.rateLimit.export}
            onChange={(val) => updateSetting('rateLimit', 'export', val)}
          />
        </SectionCard>
      </div>

      {/* Global Save Indicator */}
      {Object.values(dirtySections).some(v => v) && (
        <div className="fixed bottom-10 right-10 z-[60] animate-in slide-in-from-right-10 duration-500">
          <div className="bg-[#16161C] border border-red-500/30 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(225,6,0,0.2)] flex items-center gap-6 backdrop-blur-xl">
            <div className="flex flex-col">
              <span className="text-white font-black text-sm tracking-tight">Perubahan Terdeteksi</span>
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Pastikan simpan sebelum keluar</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setDirtySections({})}
                className="px-5 py-2.5 rounded-xl border border-white/10 text-white/40 hover:text-white hover:bg-white/5 text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Batalkan Semua
              </button>
              <button 
                onClick={() => {
                  Object.keys(dirtySections).forEach(handleSave);
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(225,6,0,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <Check size={14} />
                Simpan Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
