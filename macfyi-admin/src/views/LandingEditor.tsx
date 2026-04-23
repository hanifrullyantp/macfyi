import React, { useState } from 'react';
import { 
  GripVertical, Eye, EyeOff, Plus, Trash2, Layout, 
  Image as ImageIcon, Check, Save, RotateCcw, Monitor
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

type SectionType = 'hero' | 'features' | 'faq' | 'cta' | 'footer' | 'generic';

interface Section {
  id: string;
  type: SectionType;
  name: string;
  visible: boolean;
  data: any;
}

const SECTION_TEMPLATES: Record<SectionType, any> = {
  hero: {
    headline: 'Bersihkan Mac Anda dalam Sekejap',
    subheadline: 'Solusi satu klik untuk mengoptimalkan performa dan membersihkan file sampah di macOS Anda.',
    ctaText: 'Coba Gratis Sekarang',
    ctaUrl: '#',
    bgImage: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80',
    badge: 'Versi 2.0 Telah Hadir'
  },
  features: {
    title: 'Fitur Utama',
    items: [
      { id: '1', title: 'Pembersih Cerdas', desc: 'Menghapus cache dan file log sistem.' },
      { id: '2', title: 'Optimasi Memori', desc: 'Melepaskan RAM yang tidak digunakan.' }
    ]
  },
  faq: {
    title: 'Pertanyaan Umum',
    items: [
      { id: 'q1', q: 'Apakah aman untuk macOS terbaru?', a: 'Ya, aplikasi kami sepenuhnya kompatibel dengan macOS Sequoia.' },
      { id: 'q2', q: 'Bagaimana cara kerjanya?', a: 'Kami memindai lokasi file sampah yang aman untuk dihapus.' }
    ]
  },
  cta: {
    title: 'Siap untuk memulai?',
    subtitle: 'Bergabunglah dengan ribuan pengguna yang telah mempercepat Mac mereka.',
    buttonText: 'Unduh MacFYI',
    buttonUrl: '/download'
  },
  footer: {
    copyright: '© 2026 MacFYI. Hak Cipta Dilindungi.',
    links: [
      { label: 'Tentang Kami', url: '/about' },
      { label: 'Hubungi Kami', url: '/contact' }
    ]
  },
  generic: {
    title: 'Bagian Kustom',
    content: 'Tulis konten kustom Anda di sini.'
  }
};

export const LandingEditor: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([
    { id: '1', type: 'hero', name: 'Hero Section', visible: true, data: { ...SECTION_TEMPLATES.hero } },
    { id: '2', type: 'features', name: 'Key Features', visible: true, data: { ...SECTION_TEMPLATES.features } },
    { id: '3', type: 'cta', name: 'Main CTA', visible: true, data: { ...SECTION_TEMPLATES.cta } },
    { id: '4', type: 'footer', name: 'Site Footer', visible: true, data: { ...SECTION_TEMPLATES.footer } },
  ]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>('1');
  const [isDirty, setIsDirty] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const activeSection = sections.find(s => s.id === activeSectionId);

  const handleUpdateData = (newData: any) => {
    setSections(prev => prev.map(s => s.id === activeSectionId ? { ...s, data: newData } : s));
    setIsDirty(true);
  };

  const toggleVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSections(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
    setIsDirty(true);
  };

  const removeSection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSections(prev => prev.filter(s => s.id !== id));
    if (activeSectionId === id) setActiveSectionId(null);
    setIsDirty(true);
  };

  const addSection = (type: SectionType) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newSection: Section = {
      id: newId,
      type,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      visible: true,
      data: { ...SECTION_TEMPLATES[type] }
    };
    setSections(prev => [...prev, newSection]);
    setActiveSectionId(newId);
    setIsDirty(true);
  };

  const handlePublish = () => {
    setIsDirty(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col gap-6 relative">
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-10 left-1/2 z-50 px-6 py-3 bg-red-600 text-white rounded-full shadow-2xl flex items-center gap-3 font-bold"
          >
            <Check size={20} />
            Halaman berhasil dipublikasikan!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Landing Editor</h1>
          <p className="text-white/40 mt-1">Kelola konten dan tata letak halaman utama.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-2 ${isDirty ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
            <div className={`w-2 h-2 rounded-full ${isDirty ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
            {isDirty ? 'Ada Perubahan' : 'Terpublikasi'}
          </div>
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
            <Monitor size={14} />
            Preview
          </button>
          <button 
            onClick={handlePublish}
            disabled={!isDirty}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${isDirty ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(225,6,0,0.4)] hover:bg-red-500' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
          >
            <Save size={14} />
            PUBLIKASIKAN
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Section Manager */}
        <div className="w-80 bg-[#16161C] border border-white/5 rounded-3xl p-4 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-bold text-sm uppercase tracking-wider text-white/40">Struktur Halaman</h3>
            <span className="text-[10px] font-black bg-white/5 px-2 py-0.5 rounded-full">{sections.length} Bagian</span>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            <Reorder.Group axis="y" values={sections} onReorder={setSections} className="space-y-2">
              {sections.map((section) => (
                <Reorder.Item 
                  key={section.id} 
                  value={section}
                  className={`group flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                    activeSectionId === section.id 
                    ? 'bg-red-500/10 border-red-500/50' 
                    : 'bg-[#0E0E11] border-white/5 hover:border-white/10'
                  }`}
                  onClick={() => setActiveSectionId(section.id)}
                >
                  <GripVertical size={16} className="text-white/20 group-hover:text-white/40" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${activeSectionId === section.id ? 'text-red-500' : 'text-white'}`}>
                      {section.name}
                    </p>
                    <p className="text-[10px] text-white/40 uppercase tracking-tighter">{section.type}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => toggleVisibility(section.id, e)}
                      className={`p-1.5 rounded-lg transition-colors ${section.visible ? 'text-white/40 hover:text-white' : 'text-red-500 bg-red-500/10'}`}
                    >
                      {section.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button 
                      onClick={(e) => removeSection(section.id, e)}
                      className="p-1.5 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
            <button 
              onClick={() => addSection('hero')}
              className="flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black transition-all border border-white/5"
            >
              <Plus size={12} /> HERO
            </button>
            <button 
              onClick={() => addSection('faq')}
              className="flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black transition-all border border-white/5"
            >
              <Plus size={12} /> FAQ
            </button>
          </div>
        </div>

        {/* Section Editor */}
        <div className="flex-1 bg-[#16161C] border border-white/5 rounded-3xl overflow-hidden flex flex-col">
          {activeSection ? (
            <>
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-3">
                    Edit: {activeSection.name}
                    <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] rounded uppercase">{activeSection.type}</span>
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-white/40 hover:text-white transition-colors"><RotateCcw size={18} /></button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {activeSection.type === 'hero' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">Headline</label>
                      <input 
                        type="text" 
                        value={activeSection.data.headline}
                        onChange={(e) => handleUpdateData({ ...activeSection.data, headline: e.target.value })}
                        className="w-full bg-[#0E0E11] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">Sub-headline</label>
                      <textarea 
                        rows={3}
                        value={activeSection.data.subheadline}
                        onChange={(e) => handleUpdateData({ ...activeSection.data, subheadline: e.target.value })}
                        className="w-full bg-[#0E0E11] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase">Teks Tombol CTA</label>
                        <input 
                          type="text" 
                          value={activeSection.data.ctaText}
                          onChange={(e) => handleUpdateData({ ...activeSection.data, ctaText: e.target.value })}
                          className="w-full bg-[#0E0E11] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase">Link Tombol CTA</label>
                        <input 
                          type="text" 
                          value={activeSection.data.ctaUrl}
                          onChange={(e) => handleUpdateData({ ...activeSection.data, ctaUrl: e.target.value })}
                          className="w-full bg-[#0E0E11] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">URL Gambar Latar</label>
                      <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-xl bg-[#0E0E11] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                          {activeSection.data.bgImage ? (
                            <img src={activeSection.data.bgImage} className="w-full h-full object-cover" alt="Preview" />
                          ) : (
                            <ImageIcon size={24} className="text-white/10" />
                          )}
                        </div>
                        <input 
                          type="text" 
                          value={activeSection.data.bgImage}
                          onChange={(e) => handleUpdateData({ ...activeSection.data, bgImage: e.target.value })}
                          className="flex-1 bg-[#0E0E11] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 self-end"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeSection.type === 'faq' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">Judul Seksi</label>
                      <input 
                        type="text" 
                        value={activeSection.data.title}
                        onChange={(e) => handleUpdateData({ ...activeSection.data, title: e.target.value })}
                        className="w-full bg-[#0E0E11] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-xs font-bold text-white/40 uppercase">Daftar Pertanyaan</label>
                      {activeSection.data.items.map((item: any, idx: number) => (
                        <div key={item.id} className="p-4 bg-[#0E0E11] border border-white/5 rounded-2xl space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">FAQ #{idx + 1}</span>
                            <button className="text-white/20 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                          </div>
                          <input 
                            type="text" 
                            placeholder="Pertanyaan"
                            value={item.q}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 font-bold"
                          />
                          <textarea 
                            rows={2}
                            placeholder="Jawaban"
                            value={item.a}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 resize-none text-white/60"
                          />
                        </div>
                      ))}
                      <button className="w-full py-3 border border-dashed border-white/10 hover:border-red-500/50 hover:bg-red-500/5 rounded-2xl text-xs font-bold text-white/40 hover:text-red-500 transition-all flex items-center justify-center gap-2">
                        <Plus size={14} /> TAMBAH PERTANYAAN
                      </button>
                    </div>
                  </div>
                )}

                {/* Generic fallback for other types */}
                {!['hero', 'faq'].includes(activeSection.type) && (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                      <Layout size={32} />
                    </div>
                    <div>
                      <p className="font-bold">Editor untuk tipe {activeSection.type} sedang dikembangkan</p>
                      <p className="text-sm text-white/40">Gunakan editor JSON untuk pengeditan tingkat lanjut.</p>
                    </div>
                    <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all">
                      Buka Editor JSON
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-white/10">
                <Layout size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Pilih seksi untuk mengedit</h3>
                <p className="text-white/40 text-sm max-w-xs mx-auto">Klik pada salah satu bagian di panel kiri untuk mulai mengubah konten atau pengaturan visualnya.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
