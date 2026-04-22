import React, { useState, useEffect } from 'react';
import { 
  Save, Shield, Globe, Lock, Cpu, Flag, Eye, EyeOff, Copy, RotateCcw, 
  Link as LinkIcon, Mail, DollarSign, Users, Clock, AlertTriangle, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type TabType = 'business' | 'links' | 'secrets' | 'ai-proxy' | 'flags';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('business');
  const [isDirty, setIsDirty] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [revealSecrets, setRevealSecrets] = useState<Record<string, boolean>>({});

  // Mock data state
  const [settings, setSettings] = useState({
    business: {
      appName: 'MacFYI Admin',
      supportEmail: 'support@macfyi.com',
      currency: 'IDR',
      tax: 11,
      trialDays: 7,
      maxDevices: 3,
      autoRevoke: true,
    },
    links: {
      landingUrl: 'https://macfyi.com',
      docsUrl: 'https://docs.macfyi.com',
      supportUrl: 'https://macfyi.com/support',
      tosUrl: 'https://macfyi.com/terms',
      privacyUrl: 'https://macfyi.com/privacy',
    },
    secrets: {
      stripeKey: 'sk_test_51Mz...789',
      webhookSecret: 'whsec_...abc',
      aiProxyKey: 'proxy_...xyz',
    },
    aiProxy: {
      endpoint: 'https://api.macfyi.ai/v1',
      model: 'gpt-4o',
      rateLimit: 100,
    }
  });

  const handleInputChange = () => {
    setIsDirty(true);
  };

  const handleSave = () => {
    setIsDirty(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const toggleReveal = (id: string) => {
    setRevealSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'business':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase">Nama Aplikasi</label>
                <input 
                  type="text" 
                  defaultValue={settings.business.appName}
                  onChange={handleInputChange}
                  className="w-full bg-[#0E0E11] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase">Email Dukungan</label>
                <input 
                  type="email" 
                  defaultValue={settings.business.supportEmail}
                  onChange={handleInputChange}
                  className="w-full bg-[#0E0E11] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase">Mata Uang Default</label>
                <select 
                  className="w-full bg-[#0E0E11] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 appearance-none"
                  onChange={handleInputChange}
                >
                  <option value="IDR">IDR - Rupiah Indonesia</option>
                  <option value="USD">USD - US Dollar</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase">Persentase Pajak (%)</label>
                <input 
                  type="number" 
                  defaultValue={settings.business.tax}
                  onChange={handleInputChange}
                  className="w-full bg-[#0E0E11] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase">Durasi Trial (Hari)</label>
                <input 
                  type="number" 
                  defaultValue={settings.business.trialDays}
                  onChange={handleInputChange}
                  className="w-full bg-[#0E0E11] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase">Maks Perangkat per Lisensi</label>
                <input 
                  type="number" 
                  defaultValue={settings.business.maxDevices}
                  onChange={handleInputChange}
                  className="w-full bg-[#0E0E11] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div>
                <p className="font-medium text-sm">Cabut Lisensi Otomatis Saat Kedaluwarsa</p>
                <p className="text-xs text-white/40">Menonaktifkan akses segera setelah tanggal kedaluwarsa.</p>
              </div>
              <button 
                onClick={() => {
                  setSettings(s => ({ ...s, business: { ...s.business, autoRevoke: !s.business.autoRevoke }}));
                  setIsDirty(true);
                }}
                className={`w-12 h-6 rounded-full relative transition-colors ${settings.business.autoRevoke ? 'bg-red-600' : 'bg-white/10'}`}
              >
                <motion.div 
                  animate={{ x: settings.business.autoRevoke ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
                />
              </button>
            </div>
          </motion.div>
        );

      case 'links':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-6">
              {[
                { label: 'URL Landing Page', key: 'landingUrl', icon: Globe },
                { label: 'URL Dokumentasi', key: 'docsUrl', icon: Lock },
                { label: 'URL Dukungan/Bantuan', key: 'supportUrl', icon: Mail },
                { label: 'URL Syarat & Ketentuan', key: 'tosUrl', icon: Shield },
                { label: 'URL Kebijakan Privasi', key: 'privacyUrl', icon: Shield },
              ].map((link) => (
                <div key={link.key} className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase flex items-center gap-2">
                    <link.icon size={12} />
                    {link.label}
                  </label>
                  <input 
                    type="text" 
                    defaultValue={(settings.links as any)[link.key]}
                    onChange={handleInputChange}
                    className="w-full bg-[#0E0E11] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 font-mono"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        );

      case 'secrets':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {[
              { label: 'Stripe API Key', key: 'stripeKey' },
              { label: 'Stripe Webhook Secret', key: 'webhookSecret' },
              { label: 'AI Proxy Key', key: 'aiProxyKey' },
            ].map((secret) => (
              <div key={secret.key} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white/40 uppercase">{secret.label}</label>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60">
                      <RotateCcw size={14} />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60">
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[#0E0E11] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono flex items-center justify-between">
                    <span>
                      {revealSecrets[secret.key] 
                        ? (settings.secrets as any)[secret.key] 
                        : `••••••••••••${(settings.secrets as any)[secret.key].slice(-4)}`
                      }
                    </span>
                    <button 
                      onClick={() => toggleReveal(secret.key)}
                      className="text-white/40 hover:text-white transition-colors"
                    >
                      {revealSecrets[secret.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        );

      case 'ai-proxy':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase">Endpoint AI Proxy</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    defaultValue={settings.aiProxy.endpoint}
                    onChange={handleInputChange}
                    className="flex-1 bg-[#0E0E11] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 font-mono"
                  />
                  <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all">
                    Tes Koneksi
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">Model Default</label>
                  <input 
                    type="text" 
                    defaultValue={settings.aiProxy.model}
                    className="w-full bg-[#0E0E11] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">Batas Rate (Req/min)</label>
                  <input 
                    type="number" 
                    defaultValue={settings.aiProxy.rateLimit}
                    className="w-full bg-[#0E0E11] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase">Konfigurasi Model (JSON)</label>
                <textarea 
                  rows={6}
                  defaultValue={JSON.stringify({ 
                    temperature: 0.7, 
                    max_tokens: 2048,
                    top_p: 1,
                    frequency_penalty: 0,
                    presence_penalty: 0
                  }, null, 2)}
                  className="w-full bg-[#0E0E11] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-red-500/50 resize-none"
                />
              </div>
            </div>
          </motion.div>
        );

      case 'flags':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {[
              { id: 'f1', name: 'Mode Pemeliharaan', desc: 'Matikan akses publik ke dashboard', status: false },
              { id: 'f2', name: 'Registrasi Baru', desc: 'Izinkan pengguna baru untuk mendaftar', status: true },
              { id: 'f3', name: 'Mode Debug', desc: 'Aktifkan log mendetail di sisi klien', status: false },
              { id: 'f4', name: 'Analitik Real-time', desc: 'Gunakan stream WebSocket untuk data analitik', status: true, planned: true },
            ].map((flag) => (
              <div key={flag.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${flag.status ? 'bg-red-500/10 text-red-500' : 'bg-white/5 text-white/40'}`}>
                    <Flag size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{flag.name}</p>
                      {flag.planned && (
                        <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold rounded border border-yellow-500/20 uppercase">Coming Soon</span>
                      )}
                    </div>
                    <p className="text-xs text-white/40">{flag.desc}</p>
                  </div>
                </div>
                <button 
                  disabled={flag.planned}
                  className={`w-12 h-6 rounded-full relative transition-colors ${flag.status ? 'bg-red-600' : 'bg-white/10'} ${flag.planned ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <motion.div 
                    animate={{ x: flag.status ? 24 : 4 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
                  />
                </button>
              </div>
            ))}
          </motion.div>
        );
    }
  };

  return (
    <div className="space-y-8 pb-20 relative">
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-10 left-1/2 z-50 px-6 py-3 bg-green-500 text-white rounded-full shadow-2xl flex items-center gap-3 font-bold"
          >
            <Check size={20} />
            Konfigurasi berhasil disimpan!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">App Settings</h1>
          <p className="text-white/40 mt-1">Konfigurasi perilaku dan parameter aplikasi.</p>
        </div>
        
        <AnimatePresence>
          {isDirty && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-4 bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-xl"
            >
              <div className="flex items-center gap-2 text-yellow-500 text-sm font-bold">
                <AlertTriangle size={16} />
                Ada perubahan yang belum disimpan
              </div>
              <button 
                onClick={handleSave}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-black transition-all shadow-[0_0_15px_rgba(225,6,0,0.3)] flex items-center gap-2"
              >
                <Save size={14} />
                SIMPAN
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-1 bg-[#16161C] p-2 rounded-2xl border border-white/5 h-fit">
          {[
            { id: 'business', label: 'Bisnis', icon: DollarSign },
            { id: 'links', label: 'Tautan', icon: LinkIcon },
            { id: 'secrets', label: 'Rahasia', icon: Lock },
            { id: 'ai-proxy', label: 'AI Proxy', icon: Cpu },
            { id: 'flags', label: 'Flags', icon: Flag },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(225,6,0,0.2)]' 
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3">
          <div className="bg-[#16161C] border border-white/5 rounded-3xl p-8 min-h-[500px] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-[100px] pointer-events-none" />
            <h3 className="text-xl font-bold mb-8 flex items-center gap-2 capitalize">
              {activeTab.replace('-', ' ')}
            </h3>
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};
