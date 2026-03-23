    // =========================
    // SUPABASE CONFIG (defaults di js/config.js → window.MONEFYI_CONFIG)
    // =========================
    const CFG = window.MONEFYI_CONFIG || {};
    const SUPABASE_URL = String(CFG.supabaseUrl || '').trim();
    const SUPABASE_ANON_KEY = String(CFG.supabaseAnonKey || '').trim();
    const SUPABASE_FN_PARSE = CFG.fnParse || 'asfin-parse-transaction';
    const SUPABASE_FN_COACH = CFG.fnCoach || 'ai-user-coach';

    // Checkout links (fallback jika app_config tidak set)
    const MONTHLY_CHECKOUT_URL = String(CFG.checkoutMonthly || 'https://lynk.id/asfin-ai/9zexz9z5wom1/checkout');
    const LIFETIME_CHECKOUT_URL = String(CFG.checkoutLifetime || 'https://lynk.id/asfin-ai/j3q0x5ke3g49/checkout');

    // =========================
    // PDF Export (Print report)
    // =========================
    // Uses native browser Print-to-PDF. For best result, use Chrome/Safari.

    // =========================
    // Admin & Global App Config
    // =========================
    const ADMIN_EMAILS = Array.isArray(CFG.adminEmails) && CFG.adminEmails.length ? CFG.adminEmails : ['admin@asfin.app'];

    // =========================
    // Utilities
    // =========================
    const $ = (sel, root=document) => root.querySelector(sel);
    const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

    const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

    function pad(n){ return String(n).padStart(2,'0'); }
    function toISODate(d){
      const dt = (d instanceof Date) ? d : new Date(d);
      return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
    }
    function toMonthKey(d){
      const dt = (d instanceof Date) ? d : new Date(d);
      return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}`;
    }
    function startOfMonth(monthKey){
      const [y,m]=monthKey.split('-').map(Number);
      return new Date(y, m-1, 1);
    }
    function endOfMonth(monthKey){
      const [y,m]=monthKey.split('-').map(Number);
      return new Date(y, m, 0, 23,59,59,999);
    }
    function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

    // Date helpers
    function differenceInDays(a, b){
      // a,b are Date
      const ms = a.getTime() - b.getTime();
      return Math.floor(ms / (24*60*60*1000));
    }

    function formatIDR(amount){
      const n = Number(amount||0);
      return new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits: 0 }).format(n);
    }
    function formatCompactIDR(amount){
      const n = Number(amount||0);
      const abs = Math.abs(n);
      if (abs >= 1_000_000_000) return `${(n/1_000_000_000).toFixed(abs>=10_000_000_000?0:1)} M`;
      if (abs >= 1_000_000) return `${(n/1_000_000).toFixed(abs>=10_000_000?0:1)} jt`;
      if (abs >= 1_000) return `${(n/1_000).toFixed(abs>=10_000?0:1)} rb`;
      return String(Math.round(n));
    }

    function uuid(){
      if (window.crypto?.randomUUID) return 'tx_' + crypto.randomUUID();
      return 'tx_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);
    }

    function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

    function parseNumberInput(v){
      return Number(String(v||'').replace(/[^0-9]/g,'')) || 0;
    }

    function normalizeText(t){
      return (t||'').toLowerCase().replace(/\s+/g,' ').trim();
    }
async function loadBudgets(){
  // Pastikan koneksi database aktif
  if (!STATE.db.enabled || !STATE.db.user) return {};
  
  const supa = STATE.db.supa;
  // Ambil periode bulan (anchor)
  const anchor = toMonthKey(STATE.period.end);
  const months = lastNMonths(12, anchor);
  const min = months[0];

  const { data, error } = await supa
    .from('budgets') // Sesuaikan nama tabel di Supabase Anda
    .select('*')
    .gte('month', min)
    .order('month', { ascending: false });

  if (error) {
    console.warn('budgets fetch error', error);
    return {};
  }

  const out = {};
  for (const b of (data||[])) {
    out[b.month] = {
      income: Number(b.income||0),
      categories: b.categories || {}, // Ini berisi { rows: [...] }
      updated_at: b.updated_at || null,
    };
  }
  
  // Masukkan data ke memori STATE agar bisa dipakai dropdown
  STATE.budgetsByMonth = out; 
  return out;
}
    // =========================
    // Data & Settings
    // =========================
    const DEFAULT_SETTINGS = {
      theme: 'dark',
      lang: 'id',
      showKPI: true,
      showBudget: true,
      showTrend: true,
      showCategory: true,
      showWeek: true,

      // AI
      geminiKey: '',
      useGemini: false,

      // Accounts
      accounts: ['Cash','BCA','GoPay','OVO','DANA'],
    };

    // =========================
    // i18n (ID/EN)
    // =========================
    const I18N = {
      id: {
        // Common
        'common.close': 'Tutup',
        'common.save': 'Simpan',
        'common.update': 'Update',
        'common.delete': 'Hapus',
        'common.reset': 'Reset',
        'common.net': 'Net',
        'common.period_prefix': 'Periode:',
        'common.currency_idr': 'IDR',

        // Settings
        'settings.lang.title': 'Bahasa',
        'settings.lang.desc': 'Mengubah seluruh bahasa aplikasi.',
        'settings.theme.title': 'Mode terang',
        'settings.theme.desc': 'Ubah tema tampilan.',

        // Auth
        'auth.signin': 'Masuk',
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.show': 'Lihat',
        'auth.hide': 'Sembunyikan',
        'auth.forgot': 'Lupa password?',
        'auth.pass_hint': 'Password dikirim ke email setelah pembayaran. Cek password di email kamu.',
        'auth.contact_admin': 'Jika email belum terdaftar atau belum menerima akses, silakan hubungi admin.',

        // Header saldo
        'saldo.title': 'Saldo (estimasi)',
        'dashboard.compact': 'ringkas',
        'dashboard.full': 'lengkap',
        'saldo.tap_open': 'Tap untuk membuka ringkasan lengkap.',
        'saldo.tap_close': 'Tap untuk menutup ringkasan lengkap.',
        'saldo.period_net_open': 'Periode net {{net}} • Tap untuk lihat detail.',
        'saldo.period_net_close': 'Periode net {{net}} • Tap untuk tutup.',
        'saldo.calculating': 'Menghitung…',

        // Period
        'period.filter_title': 'Filter periode',
        'period.choose': 'Pilih periode',
        'period.this_month': 'Bulan ini',
        'period.last_month': 'Bulan lalu',
        'period.this_week': 'Minggu ini',
        'period.today': 'Hari ini',
        'period.yesterday': 'Kemarin',
        'period.custom': 'Rentang tanggal',
        'period.range': 'Rentang tanggal',
        'period.start': 'Mulai',
        'period.end': 'Sampai',
        'period.apply': 'Terapkan',
        'period.close': 'Tutup',
        'period.filters_hint': 'Filter (search/tipe/kategori/akun) muncul saat panel periode dibuka.',
        'period.range_days_1': '1 hari',
        'period.range_days': 'Rentang: {{label}}',
        'period.pick_range_hint': 'Pilih tanggal mulai & sampai.',
        'period.fill_range_hint': 'Isi tanggal mulai & sampai.',
        'period.preset_hint': '—',

        // Filters
        'filters.search_ph': 'Cari merchant / catatan…',
        'filters.reset': 'Reset',
        'filters.tip': 'Tip: filter ini mempengaruhi list transaksi dan grafik tren.',
        'filters.all_types': 'Semua tipe',
        'filters.expense': 'Pengeluaran',
        'filters.income': 'Pemasukan',
        'filters.transfer': 'Transfer',
        'filters.all_categories': 'Semua kategori',
        'filters.all_accounts': 'Semua akun',

        // Accounts
        'accounts.title': 'Akun',
        'accounts.sheet_title': 'Saldo per akun',
        'accounts.view_all': 'Lihat semua ›',
        'accounts.hint': 'Tap akun untuk lihat detail.',
        'accounts.hint_balances': 'Saldo estimasi per akun.',
        'accounts.none': 'Belum ada akun.',
        'accounts.balance_upto': 'Saldo estimasi sampai {{date}}',

        // KPI
        'kpi.income': 'Pemasukan (periode)',
        'kpi.expense': 'Pengeluaran (periode)',
        'kpi.net': 'Surplus / Defisit',
        'kpi.saving': 'Saving rate',
        'kpi.need_income': 'Butuh data pemasukan',
        'kpi.net_sub': 'Net: {{net}} (Income − Expense)',
        'kpi.period_sub': 'Periode: {{label}}',

        // Budget
        'budget.title': 'Budgeting',
        'budget.desc': 'Atur budget per kategori. Ada rekomendasi berdasarkan pola bulan-bulan sebelumnya.',
        'budget.button': 'Atur Budget',
        'budget.planned': 'Budget',
        'budget.actual': 'Realisasi',
        'budget.diff': 'Selisih',
        'budget.progress': 'Progress',
        'budget.not_set': 'Belum di-set',
        'budget.set_hint': 'Klik “Atur Budget” untuk mengatur budget per kategori.',
        'budget.remaining': 'Sisa budget: {{amount}}.',
        'budget.used_pct': '{{pct}}% terpakai',

        // Charts
        'chart.trend.title': 'Tren (sesuai filter)',
        'chart.trend.desc': 'Otomatis menyesuaikan periode dan filter (tipe/kategori/akun/pencarian).',
        'chart.category.title': 'Kategori (periode)',
        'chart.category.reset': 'Reset fokus',
        'chart.week.title': 'Pengeluaran per hari (minggu)',
        'chart.week.desc': 'Membantu lihat hari paling boros (berdasarkan minggu dari akhir periode).',
        'chart.label.income': 'Pemasukan',
        'chart.label.expense': 'Pengeluaran',

        // Transactions
        'tx.title': 'Transaksi',
        'tx.count': '{{n}} transaksi',
        'tx.focus': ' • fokus: {{cat}}',
        'tx.empty_html': 'Belum ada transaksi. Tap tombol <span class="font-semibold">+ Transaksi</span> untuk menambah.',

        // Add transaction
        'add.title': 'Tambah transaksi',
        'add.subtitle': 'Input cepat (mobile-first)',
        'tab.quick': 'Cepat (AI)',
        'tab.manual': 'Manual',
        'tab.receipt': 'Foto Struk',
        'quick.label': 'Tulis seperti chat. Bisa lebih dari 1 transaksi: pisahkan per baris (contoh: “makan siang 50k di warteg pake gopay”)',
        'quick.placeholder': 'Contoh:\n1) makan siang 50k di warteg pake gopay\n2) parkir 5k cash',
        'quick.process': 'Proses Transaksi',
        'quick.clear': 'Bersihkan',

        // Manual form
        'manual.date': 'Tanggal',
        'manual.type': 'Tipe',
        'manual.amount': 'Jumlah (IDR)',
        'manual.category': 'Kategori',
        'manual.account_from': 'Akun (dari)',
        'manual.account_to': 'Akun (ke)',
        'manual.method': 'Metode',
        'manual.merchant': 'Merchant',
        'manual.notes': 'Catatan',
        'manual.save': 'Simpan',

        // Receipt
        'receipt.title': 'Foto Struk → OCR → Simpan',
        'receipt.desc': 'Pilih foto dari kamera/galeri (HP) atau file (desktop). Bisa pilih lebih dari satu foto. Setelah OCR selesai, transaksi otomatis disiapkan untuk disimpan.',
        'receipt.pick': 'Pilih foto',
        'receipt.detected': 'Transaksi terdeteksi',
        'receipt.save': 'Simpan transaksi',
        'receipt.clear': 'Bersihkan',

        // Advisor
        'advisor.title': 'Monevisor',
        'advisor.subtitle': 'Insight & Rekomendasi',
        'advisor.generate': 'Generate',
        'advisor.summary_title': 'Ringkasan',
        'advisor.summary_hint_html': 'Tap <span class="font-semibold">Generate</span> untuk membuat insight dari data transaksi kamu pada periode terpilih.',
        'advisor.insights_title': 'Insight utama',
        'advisor.no_insight': 'Belum ada insight.',
        'advisor.budget_title': 'Rekomendasi budget (bulan depan)',
        'advisor.planned': 'planned',
        'advisor.based_on_pattern': 'berdasarkan pola spending kamu',

        // Menu
        'menu.title': 'Menu',
        'menu.subtitle': 'Tutorial & Settings',
        'menu.tutorial': 'Tutorial cepat',
        'menu.tutorial.1': 'Tap tombol + untuk input transaksi.',
        'menu.tutorial.2': 'Pakai tab Cepat (AI) untuk parsing kalimat bebas.',
        'menu.tutorial.3': 'Pakai Foto Struk untuk OCR dan simpan otomatis.',
        'menu.tutorial.4': 'Tap transaksi untuk edit / hapus.',
        'menu.tutorial.5': 'Untuk filter/search/periode, klik bulan di saldo.',
        'menu.open_tx': 'Tambah transaksi',
        'menu.open_budget': 'Atur budget',
        'menu.open_advisor': 'Buka Advisor',

        // User
        'user.logout': 'Log Out',

        // Print
        'print.button': 'Cetak laporan (PDF)',
        'print.preparing': 'Menyiapkan laporan…',
        'print.popup_blocked': 'Popup diblokir. Izinkan pop-up untuk mencetak.',
        'print.title': 'Laporan Keuangan',
        'print.generated': 'Dibuat pada',
        'print.filters': 'Filter',
        'print.section.kpi': 'KPI Keuangan',
        'print.section.accounts': 'Akun',
        'print.section.budget': 'Rencana vs Realisasi',
        'print.section.charts': 'Grafik',
        'print.section.txs': 'Transaksi',

        // Days
        'days.today': 'Hari ini',
        'days.yesterday': 'Kemarin',
        'days.tomorrow': 'Besok',
      },
      en: {
        // Common
        'common.close': 'Close',
        'common.save': 'Save',
        'common.update': 'Update',
        'common.delete': 'Delete',
        'common.reset': 'Reset',
        'common.net': 'Net',
        'common.period_prefix': 'Period:',
        'common.currency_idr': 'IDR',

        // Settings
        'settings.lang.title': 'Language',
        'settings.lang.desc': 'Change the app language.',
        'settings.theme.title': 'Light mode',
        'settings.theme.desc': 'Switch the appearance theme.',

        // Auth
        'auth.signin': 'Sign in',
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.show': 'Show',
        'auth.hide': 'Hide',
        'auth.forgot': 'Forgot password?',
        'auth.pass_hint': 'Password is sent to your email after payment. Please check your email.',
        'auth.contact_admin': 'If your email is not registered or you have not received access, please contact admin.',

        // Header saldo
        'saldo.title': 'Balance (estimate)',
        'dashboard.compact': 'compact',
        'dashboard.full': 'full',
        'saldo.tap_open': 'Tap to open full summary.',
        'saldo.tap_close': 'Tap to close full summary.',
        'saldo.period_net_open': 'Period net {{net}} • Tap to view details.',
        'saldo.period_net_close': 'Period net {{net}} • Tap to close.',
        'saldo.calculating': 'Calculating…',

        // Period
        'period.filter_title': 'Period filter',
        'period.choose': 'Choose period',
        'period.this_month': 'This month',
        'period.last_month': 'Last month',
        'period.this_week': 'This week',
        'period.today': 'Today',
        'period.yesterday': 'Yesterday',
        'period.custom': 'Date range',
        'period.range': 'Date range',
        'period.start': 'Start',
        'period.end': 'End',
        'period.apply': 'Apply',
        'period.close': 'Close',
        'period.filters_hint': 'Filters (search/type/category/account) appear when the period panel is open.',
        'period.range_days_1': '1 day',
        'period.range_days': 'Range: {{label}}',
        'period.pick_range_hint': 'Pick start & end date.',
        'period.fill_range_hint': 'Fill start & end date.',
        'period.preset_hint': '—',

        // Filters
        'filters.search_ph': 'Search merchant / notes…',
        'filters.reset': 'Reset',
        'filters.tip': 'Tip: filters affect the transaction list and the trend chart.',
        'filters.all_types': 'All types',
        'filters.expense': 'Expense',
        'filters.income': 'Income',
        'filters.transfer': 'Transfer',
        'filters.all_categories': 'All categories',
        'filters.all_accounts': 'All accounts',

        // Accounts
        'accounts.title': 'Accounts',
        'accounts.sheet_title': 'Balances by account',
        'accounts.view_all': 'View all ›',
        'accounts.hint': 'Tap an account to view details.',
        'accounts.hint_balances': 'Estimated balance per account.',
        'accounts.none': 'No accounts yet.',
        'accounts.balance_upto': 'Estimated balance up to {{date}}',

        // KPI
        'kpi.income': 'Income (period)',
        'kpi.expense': 'Expense (period)',
        'kpi.net': 'Surplus / Deficit',
        'kpi.saving': 'Saving rate',
        'kpi.need_income': 'Need income data',
        'kpi.net_sub': 'Net: {{net}} (Income − Expense)',
        'kpi.period_sub': 'Period: {{label}}',

        // Budget
        'budget.title': 'Budgeting',
        'budget.desc': 'Set budgets per category. There are recommendations based on previous months.',
        'budget.button': 'Set Budget',
        'budget.planned': 'Budget',
        'budget.actual': 'Actual',
        'budget.diff': 'Diff',
        'budget.progress': 'Progress',
        'budget.not_set': 'Not set',
        'budget.set_hint': 'Tap “Set Budget” to set budgets per category.',
        'budget.remaining': 'Remaining budget: {{amount}}.',
        'budget.used_pct': '{{pct}}% used',

        // Charts
        'chart.trend.title': 'Trend (with filters)',
        'chart.trend.desc': 'Automatically follows the active period and filters (type/category/account/search).',
        'chart.category.title': 'Categories (period)',
        'chart.category.reset': 'Reset focus',
        'chart.week.title': 'Daily expense (week)',
        'chart.week.desc': 'Helps you see which day you spend the most (based on the week ending at period end).',
        'chart.label.income': 'Income',
        'chart.label.expense': 'Expense',

        // Transactions
        'tx.title': 'Transactions',
        'tx.count': '{{n}} transactions',
        'tx.focus': ' • focus: {{cat}}',
        'tx.empty_html': 'No transactions yet. Tap <span class="font-semibold">+ Transaction</span> to add.',

        // Add transaction
        'add.title': 'Add transaction',
        'add.subtitle': 'Quick input (mobile-first)',
        'tab.quick': 'Quick (AI)',
        'tab.manual': 'Manual',
        'tab.receipt': 'Receipt',
        'quick.label': 'Write like a chat. You can add more than one transaction: one per line (e.g. “lunch 50k at warteg using gopay”)',
        'quick.placeholder': 'Example:\n1) lunch 50k at warteg using gopay\n2) parking 5k cash',
        'quick.process': 'Process',
        'quick.clear': 'Clear',

        // Manual form
        'manual.date': 'Date',
        'manual.type': 'Type',
        'manual.amount': 'Amount (IDR)',
        'manual.category': 'Category',
        'manual.account_from': 'Account (from)',
        'manual.account_to': 'Account (to)',
        'manual.method': 'Method',
        'manual.merchant': 'Merchant',
        'manual.notes': 'Notes',
        'manual.save': 'Save',

        // Receipt
        'receipt.title': 'Receipt photo → OCR → Save',
        'receipt.desc': 'Pick photos from camera/gallery (mobile) or files (desktop). You can pick multiple photos. After OCR, transactions will be prepared for saving.',
        'receipt.pick': 'Pick photos',
        'receipt.detected': 'Detected transactions',
        'receipt.save': 'Save transactions',
        'receipt.clear': 'Clear',

        // Advisor
        'advisor.title': 'Monevisor',
        'advisor.subtitle': 'Insights & Recommendations',
        'advisor.generate': 'Generate',
        'advisor.summary_title': 'Summary',
        'advisor.summary_hint_html': 'Tap <span class="font-semibold">Generate</span> to generate insights from your transactions for the selected period.',
        'advisor.insights_title': 'Key insights',
        'advisor.no_insight': 'No insights yet.',
        'advisor.budget_title': 'Budget recommendation (next month)',
        'advisor.planned': 'planned',
        'advisor.based_on_pattern': 'based on your spending pattern',

        // Menu
        'menu.title': 'Menu',
        'menu.subtitle': 'Tutorial & Settings',
        'menu.tutorial': 'Quick tutorial',
        'menu.tutorial.1': 'Tap + to add a transaction.',
        'menu.tutorial.2': 'Use Quick (AI) to parse free text.',
        'menu.tutorial.3': 'Use Receipt to OCR and auto-save.',
        'menu.tutorial.4': 'Tap a transaction to edit / delete.',
        'menu.tutorial.5': 'For filters/search/period, tap the month chip next to the balance.',
        'menu.open_tx': 'Add transaction',
        'menu.open_budget': 'Set budget',
        'menu.open_advisor': 'Open Advisor',

        // User
        'user.logout': 'Log Out',

        // Print
        'print.button': 'Print report (PDF)',
        'print.preparing': 'Preparing report…',
        'print.popup_blocked': 'Popup blocked. Allow pop-ups to print.',
        'print.title': 'Financial Report',
        'print.generated': 'Generated at',
        'print.filters': 'Filters',
        'print.section.kpi': 'Financial KPIs',
        'print.section.accounts': 'Accounts',
        'print.section.budget': 'Plan vs Actual',
        'print.section.charts': 'Charts',
        'print.section.txs': 'Transactions',

        // Days
        'days.today': 'Today',
        'days.yesterday': 'Yesterday',
        'days.tomorrow': 'Tomorrow',
      }
    };

    function t(key, vars){
      const lang = (STATE.settings?.lang || 'id');
      let str = (I18N[lang]?.[key]) ?? (I18N.id?.[key]) ?? key;
      if (vars && typeof str === 'string') {
        for (const [k,v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        }
      }
      return str;
    }

    // Language is applied only when user explicitly saves (to avoid UI glitches).
    // We store selected language in settings, persist to Supabase, then reload.
    function applyLanguageAndReload(){
      location.reload();
    }

    function applyLanguageToUI(){
      // Safe: update known UI strings only.
      const lang = (STATE.settings?.lang || 'id');
      document.documentElement.lang = lang;

      // ===== Auth =====
      $('#authTitle') && ($('#authTitle').textContent = t('auth.signin'));
      $('#authEmailLabel') && ($('#authEmailLabel').textContent = t('auth.email'));
      $('#authPassLabel') && ($('#authPassLabel').textContent = t('auth.password'));
      $('#btnForgotPass') && ($('#btnForgotPass').textContent = t('auth.forgot'));
      $('#btnAuthSubmit') && ($('#btnAuthSubmit').textContent = t('auth.signin'));

      const passInp = $('#authPass');
      if ($('#btnToggleAuthPass') && passInp) {
        $('#btnToggleAuthPass').textContent = (passInp.type === 'password') ? t('auth.show') : t('auth.hide');
      }
      $('#authPassHint') && ($('#authPassHint').textContent = t('auth.pass_hint'));
      $('#authContactHint') && ($('#authContactHint').textContent = t('auth.contact_admin'));

      $('#authEmail')?.setAttribute('placeholder', lang === 'en' ? 'name@email.com' : 'nama@email.com');
      $('#authPass')?.setAttribute('placeholder', 'password');

      // ===== Header saldo =====
      $('#saldoTitle') && ($('#saldoTitle').textContent = t('saldo.title'));

      // ===== Period popover =====
      $('#periodFilterTitle') && ($('#periodFilterTitle').textContent = t('period.filter_title'));
      $('#periodChooseLabel') && ($('#periodChooseLabel').textContent = t('period.choose'));
      $('#rangeCardTitle') && ($('#rangeCardTitle').textContent = t('period.range'));
      $('#rangeStartLabel') && ($('#rangeStartLabel').textContent = t('period.start'));
      $('#rangeEndLabel') && ($('#rangeEndLabel').textContent = t('period.end'));
      $('#btnApplyRange') && ($('#btnApplyRange').textContent = t('period.apply'));
      $('#btnMonthClose') && ($('#btnMonthClose').textContent = t('period.close'));
      $('#periodFiltersHint') && ($('#periodFiltersHint').textContent = t('period.filters_hint'));

      const preset = $('#presetSelect');
      if (preset) {
        const map = {
          this_month: t('period.this_month'),
          last_month: t('period.last_month'),
          this_week: t('period.this_week'),
          today: t('period.today'),
          yesterday: t('period.yesterday'),
          custom: t('period.custom'),
        };
        for (const opt of preset.options) opt.textContent = map[opt.value] || opt.textContent;
      }
      $('#presetHint') && ($('#presetHint').textContent = t('period.preset_hint'));

      // ===== Filters =====
      $('#qSearch')?.setAttribute('placeholder', t('filters.search_ph'));
      $('#btnClearFilters') && ($('#btnClearFilters').textContent = t('filters.reset'));
      const fType = $('#fType');
      if (fType) {
        if (fType.options[0]) fType.options[0].textContent = t('filters.all_types');
        if (fType.options[1]) fType.options[1].textContent = t('filters.expense');
        if (fType.options[2]) fType.options[2].textContent = t('filters.income');
        if (fType.options[3]) fType.options[3].textContent = t('filters.transfer');
      }
      const fCat = $('#fCategory');
      if (fCat?.options?.[0]) fCat.options[0].textContent = t('filters.all_categories');
      const fAcc = $('#fAccount');
      if (fAcc?.options?.[0]) fAcc.options[0].textContent = t('filters.all_accounts');
      const filtersTip = $('#filtersWrap .text-xs.app-muted');
      if (filtersTip) filtersTip.textContent = t('filters.tip');
      $('#btnPrintReport') && ($('#btnPrintReport').textContent = t('print.button'));

      // ===== Accounts (dashboard) =====
      const accH2 = $('#accountsBalancesSection h2');
      if (accH2) accH2.textContent = t('accounts.title');
      $('#btnMoreAccounts') && ($('#btnMoreAccounts').textContent = t('accounts.view_all'));
      $('#accountsBalancesHint') && ($('#accountsBalancesHint').textContent = t('accounts.hint'));

      // ===== KPI labels =====
      const kpiWrap = $('#kpiSection');
      if (kpiWrap && kpiWrap.children?.length >= 4) {
        const map = [t('kpi.income'), t('kpi.expense'), t('kpi.net'), t('kpi.saving')];
        for (let i=0;i<4;i++) {
          const card = kpiWrap.children[i];
          const labelEl = card?.querySelector('div.text-xs');
          if (labelEl) labelEl.textContent = map[i];
        }
      }

      // ===== Budget card =====
      const bTitle = $('#budgetSection h2');
      if (bTitle) bTitle.textContent = t('budget.title');
      const bDesc = $('#budgetSection h2')?.parentElement?.querySelector('div.mt-1');
      if (bDesc) bDesc.textContent = t('budget.desc');
      $('#btnEditBudget') && ($('#btnEditBudget').textContent = t('budget.button'));

      // Budget mini chips labels
      const bGrid = $('#budgetSection .grid.grid-cols-3');
      if (bGrid && bGrid.children?.length >= 3) {
        const labels = [t('budget.planned'), t('budget.actual'), t('budget.diff')];
        for (let i=0;i<3;i++) {
          const lab = bGrid.children[i]?.querySelector('div.text-xs');
          if (lab) lab.textContent = labels[i];
        }
      }
      // Budget progress label
      const bProgRow = $('#budgetSection .mt-3 .flex.items-center.justify-between.text-xs');
      if (bProgRow?.children?.[0]) bProgRow.children[0].textContent = t('budget.progress');

      // ===== Charts =====
      const trendH2 = $('#cardTrend h2');
      if (trendH2) trendH2.textContent = t('chart.trend.title');
      const trendHint = $('#cardTrend .mt-2.text-xs');
      if (trendHint) trendHint.textContent = t('chart.trend.desc');

      const catH2 = $('#cardCategory h2');
      if (catH2) catH2.textContent = t('chart.category.title');
      $('#btnFocusCategory') && ($('#btnFocusCategory').textContent = t('chart.category.reset'));

      const weekH2 = $('#cardWeek h2');
      if (weekH2) weekH2.textContent = t('chart.week.title');
      const weekHint = $('#cardWeek .mt-3.text-xs');
      if (weekHint) weekHint.textContent = t('chart.week.desc');

      // ===== Main =====
      $('#txTitle') && ($('#txTitle').textContent = t('tx.title'));
      if ($('#txEmpty')) {
        $('#txEmpty').innerHTML = t('tx.empty_html');
      }

      // ===== Add sheet =====
      $('#addSheetTitle') && ($('#addSheetTitle').textContent = t('add.title'));
      $('#addSheetSubtitle') && ($('#addSheetSubtitle').textContent = t('add.subtitle'));
      $$('.tabBtn').forEach(b => {
        const k = b.dataset.tab;
        if (k === 'quick') b.textContent = t('tab.quick');
        if (k === 'manual') b.textContent = t('tab.manual');
        if (k === 'receipt') b.textContent = t('tab.receipt');
      });
      const quickLab = $('label[for="quickText"]');
      if (quickLab) quickLab.textContent = t('quick.label');
      $('#quickText')?.setAttribute('placeholder', t('quick.placeholder'));
      $('#btnParse') && ($('#btnParse').textContent = t('quick.process'));
      $('#btnQuickClear') && ($('#btnQuickClear').textContent = t('quick.clear'));

      // Manual labels
      const setLabelNear = (inputId, txt) => {
        const el = $(`#${inputId}`);
        const lab = el?.closest('div')?.querySelector('label');
        if (lab) lab.textContent = txt;
      };
      setLabelNear('mDate', t('manual.date'));
      setLabelNear('mType', t('manual.type'));
      setLabelNear('mAmount', t('manual.amount'));
      setLabelNear('mCategory', t('manual.category'));
      setLabelNear('mAccount', t('manual.account_from'));
      setLabelNear('mToAccount', t('manual.account_to'));
      setLabelNear('mPayment', t('manual.method'));
      setLabelNear('mMerchant', t('manual.merchant'));
      setLabelNear('mNotes', t('manual.notes'));
      $('#btnSaveManual') && ($('#btnSaveManual').textContent = t('manual.save'));

      // Receipt
      const receiptPanel = $('[data-tab-panel="receipt"]');
      if (receiptPanel) {
        const titleEl = receiptPanel.querySelector('div.text-sm.font-semibold');
        if (titleEl) titleEl.textContent = t('receipt.title');
        const descEl = receiptPanel.querySelector('p.text-xs');
        if (descEl) descEl.textContent = t('receipt.desc');
      }
      $('#btnPickReceipt') && ($('#btnPickReceipt').textContent = t('receipt.pick'));
      const receiptDetected = $('#receiptTxWrap > div.text-xs');
      if (receiptDetected) receiptDetected.textContent = t('receipt.detected');
      $('#btnSaveReceiptAuto') && ($('#btnSaveReceiptAuto').textContent = t('receipt.save'));
      $('#btnClearReceipt') && ($('#btnClearReceipt').textContent = t('receipt.clear'));

      // ===== Advisor =====
      const advHead = $('#advisorSheet .sheet-head');
      if (advHead) {
        const t1 = advHead.querySelector('div.text-xs');
        const t2 = advHead.querySelector('div.text-base.font-semibold');
        if (t1) t1.textContent = t('advisor.title');
        if (t2) t2.textContent = t('advisor.subtitle');
      }
      $('#btnGenerateInsights') && ($('#btnGenerateInsights').textContent = t('advisor.generate'));
      const aSummaryTitle = $('#advisorContent .app-card:nth-child(1) .text-sm.font-semibold');
      if (aSummaryTitle) aSummaryTitle.textContent = t('advisor.summary_title');
      if ($('#advisorSummary')) $('#advisorSummary').innerHTML = t('advisor.summary_hint_html');
      const aInsightsTitle = $('#advisorContent .app-card:nth-child(2) .text-sm.font-semibold');
      if (aInsightsTitle) aInsightsTitle.textContent = t('advisor.insights_title');
      const aNo = $('#advisorBullets li.app-muted');
      if (aNo) aNo.textContent = t('advisor.no_insight');
      const aBudgetTitle = $('#advisorContent .app-card:nth-child(3) .text-sm.font-semibold');
      if (aBudgetTitle) aBudgetTitle.textContent = t('advisor.budget_title');
      const aPlanned = $('#advisorContent .app-card:nth-child(3) .text-xs.app-muted');
      if (aPlanned) aPlanned.textContent = t('advisor.planned');

      // ===== Menu =====
      $('#menuSheetTitle') && ($('#menuSheetTitle').textContent = t('menu.title'));
      $('#menuSheetSubtitle') && ($('#menuSheetSubtitle').textContent = t('menu.subtitle'));
      const mt = $('#menuSheet .sheet-body .app-card .text-sm.font-semibold');
      if (mt) mt.textContent = t('menu.tutorial');
      const lis = $$('#menuSheet ol li');
      const steps = [t('menu.tutorial.1'), t('menu.tutorial.2'), t('menu.tutorial.3'), t('menu.tutorial.4'), t('menu.tutorial.5')];
      for (let i=0;i<Math.min(lis.length, steps.length);i++) lis[i].textContent = steps[i];
      $('#btnOpenQuick') && ($('#btnOpenQuick').textContent = t('menu.open_tx'));
      $('#btnOpenBudget') && ($('#btnOpenBudget').textContent = t('menu.open_budget'));
      $('#btnOpenAdvisor') && ($('#btnOpenAdvisor').textContent = t('menu.open_advisor'));
document.getElementById('btnOpenAdminPanel')?.addEventListener('click', () => {
  if (!isAdmin()) {
    const hint = document.getElementById('adminPanelHint');
    if (hint) hint.textContent = 'Hanya admin yang bisa membuka panel ini.';
    return;
  }
  openAdminPanel();
});
      // ===== Settings labels (existing data-i18n) =====
      $$('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) el.textContent = t(key);
      });
      if ($('#langSelect')) $('#langSelect').value = lang;

      // ===== Accounts sheet =====
      const accSheetTitle = $('#accountsSheet .sheet-head .text-base.font-semibold');
      if (accSheetTitle) accSheetTitle.textContent = t('accounts.sheet_title');
      const accSheetHint = $('#accountsSheet .sheet-head .mt-2.text-xs');
      if (accSheetHint) accSheetHint.textContent = t('accounts.hint');

      // ===== Close buttons =====
      $$('[data-close="true"], [data-close-menu="true"], [data-close-advisor="true"], [data-close-budget="true"], [data-close-user="true"], [data-close-accounts="true"], [data-close-account-detail="true"], [data-close-edit="true"]').forEach(btn => {
        if (btn.tagName === 'BUTTON') btn.textContent = t('common.close');
      });

      // ===== User =====
      $('#btnSignOut') && ($('#btnSignOut').textContent = t('user.logout'));
    }

    const STATE = {
      transactions: [],
      selectedMonth: toMonthKey(new Date()), // anchor month for budgets
      period: {
        preset: 'this_month',
        start: toISODate(startOfMonth(toMonthKey(new Date()))),
        end: toISODate(endOfMonth(toMonthKey(new Date()))),
        label: '',
      },
      filters: { q:'', type:'', category:'', account:'' },
      parsedDraft: null,
      receiptDraft: null,
      editId: null,
      focusCategory: null,
      ui: {
        dashboardOpen: false,
        monthPopoverOpen: false,
        receiptPickerOpened: false,
        receiptOcrRunning: false,
        accountDetailOpen: false,
      },
      accountDetail: {
        account: null,
      },
      settings: { ...DEFAULT_SETTINGS },
      user: { name: 'User', email: '' },
      budgetsByMonth: {},
      budgetDraft: null,
      appConfig: null,
      subscription: {
        planType: 'none',
        planExpiresAt: null,
        daysLeft: null,
        expired: false,
      },
      advisorCache: {
        fingerprint: null,
        periodKey: null,
        generatedAt: null,
      },
      db: {
        enabled: false,
        supa: null,
        session: null,
        user: null,
        profile: null,
        saldoCache: {},
        saldoLoading: false,
      }
    };

    function applyTheme(){
      document.body.classList.toggle('theme-light', STATE.settings.theme === 'light');
      destroyCharts();
    }

    function ensureAccountRegistered(name){
      const v = String(name||'').trim();
      if (!v) return;
      if (!STATE.settings.accounts.includes(v)) {
        STATE.settings.accounts.push(v);
        STATE.settings.accounts = [...new Set(STATE.settings.accounts)].sort((a,b)=>a.localeCompare(b));
        saveSettings().catch(()=>{});
      }
    }

    function monthLabel(mk){
      const [y,m]=mk.split('-').map(Number);
      const lang = STATE.settings?.lang || 'id';
      const mnId = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      const mnEn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const mn = (lang === 'en') ? mnEn[m-1] : mnId[m-1];
      return `${mn} ${y}`;
    }

    function dateLabelRange(startISO, endISO){
      if (startISO === endISO) return startISO;
      return `${startISO}–${endISO}`;
    }

    function setPeriod({ preset, startISO, endISO, label }){
      const start = new Date(startISO); start.setHours(0,0,0,0);
      const end = new Date(endISO); end.setHours(23,59,59,999);
      const s = toISODate(start);
      const e = toISODate(end);
      if (new Date(s) > new Date(e)) {
        STATE.period.start = e;
        STATE.period.end = s;
      } else {
        STATE.period.start = s;
        STATE.period.end = e;
      }
      STATE.period.preset = preset || 'custom';
      STATE.selectedMonth = toMonthKey(STATE.period.end);
      STATE.period.label = label || dateLabelRange(STATE.period.start, STATE.period.end);

      // sync inputs (range only)
      if ($('#rangeStart')) $('#rangeStart').value = STATE.period.start;
      if ($('#rangeEnd')) $('#rangeEnd').value = STATE.period.end;
      if ($('#rangeHint')) $('#rangeHint').textContent = STATE.period.start === STATE.period.end ? '1 hari' : `Rentang: ${STATE.period.label}`;

      STATE.focusCategory = null;
      rerender();
      refreshTransactionsRange().catch(()=>{});
      loadBudgets().then(b => { STATE.budgetsByMonth = b; rerender(); }).catch(()=>{});
      updateSaldoAsync().catch(()=>{});
    }

    function initDefaultPeriod(){
      const mk = toMonthKey(new Date());
      STATE.selectedMonth = mk;
      setPeriod({ preset:'this_month', startISO: toISODate(startOfMonth(mk)), endISO: toISODate(endOfMonth(mk)), label: monthLabel(mk) });
    }

    // =========================
    // Supabase init + profile
    // =========================
    async function initSupabase(){
      // IMPORTANT: Auth will not work from file://
      if (location.protocol === 'file:') {
        $('#authOverlay').classList.remove('hidden');
        $('#authStatus').textContent = 'Aplikasi harus dibuka lewat URL https:// (bukan file://).';
        $('#btnAuthSubmit').disabled = true;
        return;
      }

      const { createClient } = window.supabase;
      STATE.db.supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      STATE.db.enabled = true;

      const { data } = await STATE.db.supa.auth.getSession();
      STATE.db.session = data.session;
      STATE.db.user = data.session?.user || null;

      STATE.db.supa.auth.onAuthStateChange(async (_event, session) => {
        STATE.db.session = session;
        STATE.db.user = session?.user || null;
        if (STATE.db.user) {
          await bootstrapAuthed();
          hideAuth();
        } else {
          showAuth();
        }
      });

      // Try load global app config for branding (even before login)
      await loadAppConfig();

      if (STATE.db.user) {
        await bootstrapAuthed();
        hideAuth();
      } else {
        showAuth();
      }
    }
async function loadBrandingFromConfig() {
  try {
    // sesuaikan nama tabel & kolom dengan yang kamu pakai
    const { data, error } = await supabase
      .from('app_config')
      .select('logo_url')
      .eq('id', 'global')
      .maybeSingle();

    if (error) {
      console.warn('Gagal load branding:', error.message);
      return;
    }

    const logoUrl = data?.logo_url;
    if (!logoUrl) return;

    // Set ke semua logo img
    const imgIds = ['appLogoImg', 'authLogoImg', 'sidebarLogoImg'];
    imgIds.forEach((id) => {
      const img = document.getElementById(id);
      if (img) {
        img.src = logoUrl;
        img.classList.remove('hidden');
      }
    });
function applyAdminUI() {
  // Kalau STATE / STATE.db belum ada, jangan lakukan apa-apa dulu
  if (!window.STATE || !STATE.db) return;

  const admin = isAdmin();

  const branding = document.getElementById('adminBrandingCard');
  if (branding) branding.classList.toggle('hidden', !admin);

  const launcher = document.getElementById('adminPanelLauncher');
  if (launcher) launcher.classList.toggle('hidden', !admin);
}
    // Sembunyikan fallback huruf
    const fallbackIds = ['appLogoFallback', 'authLogoFallback', 'sidebarLogoFallback'];
    fallbackIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  } catch (e) {
    console.error('Error loadBrandingFromConfig:', e);
  }
}
    async function ensureProfile(){
      const supa = STATE.db.supa;
      const u = STATE.db.user;
      if (!supa || !u) return null;

      const { data: existing, error } = await supa
        .from('profiles')
        .select('id,name,settings,gemini_key,plan_type,plan_expires_at,role,updated_at')
        .eq('id', u.id)
        .maybeSingle();

      if (!error && existing) return existing;

      const nameGuess = (u.user_metadata?.name) || (u.email ? u.email.split('@')[0] : 'User');
      // NOTE: subscription fields are optional. If your `profiles` table
      // doesn't have these columns yet, insert will fallback without them.
      const rowBase = {
        id: u.id,
        name: nameGuess,
        settings: DEFAULT_SETTINGS,
        gemini_key: '',
        updated_at: new Date().toISOString(),
      };
      const rowWithPlan = {
        ...rowBase,
        plan_type: 'none',
        plan_expires_at: null,
      };

      // Try create profile with plan fields; fallback if schema not updated.
      let inserted = null;
      {
        const r1 = await supa.from('profiles').upsert(rowWithPlan).select('*').single();
        if (!r1.error) {
          inserted = r1.data;
        } else {
          const r2 = await supa.from('profiles').upsert(rowBase).select('*').single();
          inserted = r2.data || rowBase;
        }
      }

      return inserted || rowWithPlan;
    }

    async function loadAppConfig(){
      // Optional global config table. If not exists or RLS denies, silently ignore.
      if (!STATE.db.enabled) return null;
      try {
        const supa = STATE.db.supa;
        const { data, error } = await supa.from('app_config').select('*').eq('id', 'global').maybeSingle();
        if (error) return null;
        STATE.appConfig = data || null;
        applyAppBranding();
        return data;
      } catch {
        return null;
      }
    }

    function applyAppBranding() {
  const logoUrl = STATE.appConfig?.logo_url ? String(STATE.appConfig.logo_url) : '';

  const show = (imgEl, fallbackEl) => {
    if (!imgEl || !fallbackEl) return;
    if (logoUrl) {
      imgEl.src = logoUrl;
      imgEl.classList.remove('hidden');
      fallbackEl.classList.add('hidden');
    } else {
      imgEl.classList.add('hidden');
      fallbackEl.classList.remove('hidden');
    }
  };

  // Header mobile
  show($('#appLogoImg'), $('#appLogoFallback'));

  // Auth overlay
  show($('#authLogoImg'), $('#authLogoFallback'));

  // Sidebar desktop (TAMBAHAN)
  show($('#sidebarLogoImg'), $('#sidebarLogoFallback'));
}

    function isAdmin(){
  const role = String(STATE?.db?.profile?.role || '').toLowerCase();
  if (role === 'admin') return true;

  const email = (STATE?.db?.user?.email || '').toLowerCase();
  if (!email || !Array.isArray(ADMIN_EMAILS)) return false;

  return ADMIN_EMAILS.some(e => e.toLowerCase() === email);
}

async function initApp() {
  // ... kode inisialisasi lain (cek auth, load data, dsb)
  await loadBrandingFromConfig();
  // ... lanjut rerender dashboard / 
  applyAdminUI();
}
    function computeSubscriptionStatus(profile){
      const planType = (profile?.plan_type || 'none');
      const expiresRaw = profile?.plan_expires_at || null;
      const planExpiresAt = expiresRaw ? new Date(expiresRaw) : null;

      let expired = false;
      let daysLeft = null;
      if (planType === 'monthly' && planExpiresAt) {
        const now = new Date();
        if (now.getTime() >= planExpiresAt.getTime()) {
          expired = true;
          daysLeft = 0;
        } else {
          daysLeft = differenceInDays(planExpiresAt, now);
          // if within same day but still valid, floor might be 0; treat as 1 day left
          if (daysLeft <= 0) daysLeft = 1;
        }
      }

      return { planType, planExpiresAt, expired, daysLeft };
    }

    function applySubscriptionUI(){
      const sub = STATE.subscription;

      // Aff button (always visible for members; opens modal)
      const btnAff = $('#btnAff');
      if (btnAff) {
        btnAff.classList.remove('hidden');
        btnAff.onclick = () => openAffModal();
      }

      // Expired overlay
      const expiredOverlay = $('#expiredOverlay');
      if (expiredOverlay) {
        expiredOverlay.classList.toggle('hidden', !sub.expired);
      }
      if (sub.expired) {
        // lock scroll
        document.body.style.overflow = 'hidden';
      }

      // Banner H-3
      const banner = $('#planBanner');
      if (banner) {
        const show = (sub.planType === 'monthly' && !sub.expired && typeof sub.daysLeft === 'number' && sub.daysLeft > 0 && sub.daysLeft <= 3);
        banner.classList.toggle('hidden', !show);
        if (show) {
          $('#planBannerText').innerHTML = `Masa aktif Monefyi kamu akan berakhir dalam <span style="color: rgba(34,197,94,.95)">${sub.daysLeft} hari</span>.`;
          $('#planBannerSub').textContent = 'Perpanjang sekarang supaya akses tidak terputus.';
          $('#planBannerBtn').textContent = 'Perpanjang Sekarang';
        }
      }

      // Hook expired logout
      const btnExpiredLogout = $('#btnExpiredLogout');
      if (btnExpiredLogout) {
        btnExpiredLogout.onclick = async () => {
          try { await STATE.db.supa.auth.signOut(); } catch {}
          location.reload();
        };
      }

      // Renew link (monthly)
      const monthlyUrl = String(STATE.appConfig?.checkout_monthly_url || MONTHLY_CHECKOUT_URL || 'https://monefyi.com#paket');
      $('#btnRenewPlan')?.setAttribute('href', monthlyUrl);
      $('#planBannerBtn')?.setAttribute('href', monthlyUrl);
    }

    async function loadProfileAndSettings(){
      const p = await ensureProfile();
      STATE.db.profile = p;

      const email = STATE.db.user?.email || '';
      STATE.user.email = email;
      STATE.user.name = (p?.name) || (email ? email.split('@')[0] : 'User');

      const merged = { ...DEFAULT_SETTINGS, ...(p?.settings || {}) };
      if (!Array.isArray(merged.accounts)) merged.accounts = [...DEFAULT_SETTINGS.accounts];
      merged.accounts = [...new Set(merged.accounts.map(s => String(s||'').trim()).filter(Boolean))];
      if (!merged.accounts.length) merged.accounts = ['Cash'];

      // gemini key (stored separately)
      merged.geminiKey = p?.gemini_key || merged.geminiKey || '';

      STATE.settings = merged;
      applyTheme();
      // apply language (no reload here)
      try { applyLanguageToUI(); } catch {}

      // subscription status
      const sub = computeSubscriptionStatus(p);
      STATE.subscription.planType = sub.planType;
      STATE.subscription.planExpiresAt = sub.planExpiresAt;
      STATE.subscription.expired = sub.expired;
      STATE.subscription.daysLeft = sub.daysLeft;
      applySubscriptionUI();
    }

    async function saveProfile(partial){
      if (!STATE.db.enabled || !STATE.db.user) return;
      const supa = STATE.db.supa;
      const patch = { id: STATE.db.user.id, ...partial, updated_at: new Date().toISOString() };
      const { data, error } = await supa.from('profiles').upsert(patch).select('*').single();
      if (error) throw error;
      STATE.db.profile = data;
      return data;
    }

    async function saveSettings(){
      if (!STATE.db.enabled || !STATE.db.user) return;
      const settingsToSave = { ...STATE.settings };
      delete settingsToSave.geminiKey;
      await saveProfile({ settings: settingsToSave, gemini_key: STATE.settings.geminiKey || '' });
    }

    // =========================
    // DB: Transactions & Budgets
    // =========================
    function lastNMonths(n, fromMonthKey){
      const [y,m]=fromMonthKey.split('-').map(Number);
      const base = new Date(y, m-1, 1);
      const keys=[];
      for (let i=n-1;i>=0;i--) {
        const d = new Date(base);
        d.setMonth(d.getMonth()-i);
        keys.push(toMonthKey(d));
      }
      return keys;
    }

    async function refreshTransactionsRange(){
      if (!STATE.db.enabled || !STATE.db.user) return;
      const supa = STATE.db.supa;

      const anchor = toMonthKey(STATE.period.end);
      const months = lastNMonths(6, anchor);
      const minTrendISO = toISODate(startOfMonth(months[0]));

      const startISO = STATE.period.start;
      const endISO = STATE.period.end;

      const minISO = (new Date(startISO) < new Date(minTrendISO)) ? startISO : minTrendISO;
      const maxISO = endISO;

      const { data, error } = await supa
        .from('transactions')
        .select('*')
        .gte('date', minISO)
        .lte('date', maxISO)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('transactions fetch error', error);
        return;
      }
      STATE.transactions = (data || []).map(t => ({
        ...t,
        amount: Number(t.amount||0),
        meta: (t.meta && typeof t.meta === 'object') ? t.meta : (t.meta ? JSON.parse(t.meta) : {})
      }));
      ensureSelectOptions();
      rerender();
      updateSaldoAsync();
    }

    async function dbUpsertTransaction(tx){
      const supa = STATE.db.supa;
      const row = {
        id: tx.id,
        user_id: STATE.db.user.id,
        date: tx.date,
        type: tx.type,
        amount: Number(tx.amount||0),
        currency: tx.currency || 'IDR',
        category: tx.category || 'Lainnya',
        subcategory: tx.subcategory || '',
        account: tx.account || 'Cash',
        merchant: tx.merchant || '',
        payment_method: tx.payment_method || tx.account || 'Cash',
        notes: tx.notes || '',
        created_at: tx.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        meta: tx.meta || {},
      };

      const { data, error } = await supa.from('transactions').upsert(row).select('*').single();
      if (error) throw error;

      const i = STATE.transactions.findIndex(t => t.id === data.id);
      const normalized = { ...data, amount: Number(data.amount||0), meta: data.meta || {} };
      if (i >= 0) STATE.transactions[i] = normalized;
      else STATE.transactions.push(normalized);

      ensureAccountRegistered(normalized.account);
      return normalized;
    }

    // Fungsi untuk menghapus data real di Supabase
async function dbDeleteTransaction(id) {
  if (!STATE.db.enabled || !STATE.db.user) return;
  
  const { error } = await STATE.db.supa
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Fungsi Update (Upsert) - versi duplikat (dinonaktifkan untuk menghindari deklarasi ganda)
async function upsertTransaction_legacy_local(tx) {
  // 1. UPDATE MEMORI LOKAL (STATE) - Ini rahasianya agar refresh instan
  const i = STATE.transactions.findIndex(t => t.id === tx.id);
  if (i >= 0) {
    STATE.transactions[i] = tx; // Update data lama
  } else {
    STATE.transactions.unshift(tx); // Tambah data baru ke paling ATAS
  }

  // 2. URUTKAN ULANG (Berdasarkan tanggal terbaru)
  STATE.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 3. PANGGIL RERENDER (Menggambar ulang layar)
  if (typeof rerender === 'function') {
    rerender();
    console.log("UI telah di-rerender.");
  }

  // 4. SIMPAN KE DATABASE (Berjalan di latar belakang)
  if (STATE.db.enabled && STATE.db.user) {
    try {
      // Pastikan fungsi dbUpsertTransaction Anda benar
      await dbUpsertTransaction(tx); 
    } catch (e) {
      console.error("Gagal simpan ke database", e);
    }
  }
}

    async function saveBudgetMonth(mk, income, categories){
      const supa = STATE.db.supa;
      const row = {
        user_id: STATE.db.user.id,
        month: mk,
        income: Number(income||0),
        categories: categories || {},
        updated_at: new Date().toISOString(),
      };
      const { error } = await supa.from('budgets').upsert(row);
      if (error) throw error;
      STATE.budgetsByMonth[mk] = { income: Number(income||0), categories: categories||{}, updated_at: row.updated_at };
    }

    async function updateSaldoAsync(){
      if (!STATE.db.enabled || !STATE.db.user) return;
      const key = STATE.period.end;
      if (STATE.db.saldoLoading) return;
      STATE.db.saldoLoading = true;

      const endISO = STATE.period.end;
      try {
        const { data, error } = await STATE.db.supa.rpc('asfin_saldo_upto', { p_date: endISO });
        if (!error && data !== null && data !== undefined) {
          STATE.db.saldoCache[key] = Number(data||0);
        } else {
          const { data: txs, error: e2 } = await STATE.db.supa
            .from('transactions')
            .select('type,amount,date')
            .lte('date', endISO);
          if (!e2) {
            const s = sumByType((txs||[]).map(x => ({ type:x.type, amount:Number(x.amount||0), date:x.date })));
            STATE.db.saldoCache[key] = s.net;
          }
        }
      } catch (e) {
        console.warn('saldo error', e);
      } finally {
        STATE.db.saldoLoading = false;
        renderSaldo();
      }
    }

    async function bootstrapAuthed(){
      $('#appShell').classList.remove('hidden');
      await loadAppConfig();
      await loadProfileAndSettings();
      STATE.budgetsByMonth = await loadBudgets();
      await refreshTransactionsRange();
      // init coach chat area (empty)
      initCoachChat({ reset: true });
      rerender();
    }

    // =========================
    // Auth UI actions (sign-in only)
    // =========================
    function showAuth(){
      $('#authOverlay').classList.remove('hidden');
      $('#appShell').classList.add('hidden');
      document.body.style.overflow = 'hidden';
      $('#authStatus').textContent = '';
    }

    function hideAuth(){
      $('#authOverlay').classList.add('hidden');
      document.body.style.overflow = '';
    }

    // Toggle show/hide password (login)
    $('#btnToggleAuthPass')?.addEventListener('click', () => {
      const inp = $('#authPass');
      if (!inp) return;
      const isPass = inp.type === 'password';
      inp.type = isPass ? 'text' : 'password';
      const btn = $('#btnToggleAuthPass');
      if (btn) btn.textContent = isPass ? t('auth.hide') : t('auth.show');
    });

    // Forgot password (send reset link)
    $('#btnForgotPass')?.addEventListener('click', async () => {
      if (!STATE.db.enabled) return;
      const email = ($('#authEmail')?.value || '').trim();
      if (!email) {
        $('#authStatus').textContent = 'Masukkan email dulu.';
        return;
      }
      $('#authStatus').textContent = 'Mengirim link reset…';
      try {
        const redirectTo = location.origin + location.pathname;
        const { error } = await STATE.db.supa.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        $('#authStatus').textContent = 'Link reset dikirim. Cek email kamu.';
      } catch (e) {
        $('#authStatus').textContent = 'Gagal kirim link reset. Hubungi admin.';
      }
    });

    $('#btnAuthSubmit')?.addEventListener('click', async () => {
      if (!STATE.db.enabled) return;
      const email = ($('#authEmail')?.value || '').trim();
      const pass = ($('#authPass')?.value || '').trim();

      if (!email || !pass) { $('#authStatus').textContent = 'Email & password wajib diisi.'; return; }

      $('#authStatus').textContent = 'Masuk…';
      try {
        const { data, error } = await STATE.db.supa.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        // success
        $('#authStatus').textContent = '';
      } catch (e) {
        const msg = String(e?.message || '').toLowerCase();
        const code = (e && typeof e === 'object') ? (e.status || e.code || '') : '';

        // Network errors
        if (msg.includes('failed to fetch') || msg.includes('fetch')) {
          $('#authStatus').textContent = 'Gagal terhubung. Coba refresh / ganti jaringan.';
          return;
        }

        // Common Supabase Auth errors
        if (msg.includes('invalid login credentials')) {
          $('#authStatus').textContent = 'Email belum terdaftar atau password salah. Cek password di email atau klik “Lupa password?”.';
          return;
        }
        if (msg.includes('email not confirmed')) {
          $('#authStatus').textContent = 'Email belum dikonfirmasi. Hubungi admin.';
          return;
        }
        if (msg.includes('too many requests')) {
          $('#authStatus').textContent = 'Terlalu banyak percobaan. Coba lagi beberapa menit.';
          return;
        }

        // Fallback (keep simple)
        $('#authStatus').textContent = 'Gagal masuk. Cek password di email atau hubungi admin.';
      }
    });

    // =========================
    // Parsing (heuristic)
    // =========================
    const CATEGORY_RULES = [
      { key: 'Gaji', words: ['gaji', 'salary', 'payroll'] },
      { key: 'Makanan & Minuman', words: ['makan', 'warteg', 'kopi', 'cafe', 'resto', 'ayam', 'bakso', 'nasi', 'minum', 'boba', 'starbucks'] },
      { key: 'Transport', words: ['grab', 'gojek', 'gocar', 'goride', 'mrt', 'krl', 'transjakarta', 'tol', 'bensin', 'pertamina', 'parkir', 'ojek'] },
      { key: 'Belanja Harian', words: ['indomaret', 'alfamart', 'supermarket', 'sayur', 'buah', 'laundry', 'galon'] },
      { key: 'Kesehatan', words: ['apotek', 'dokter', 'rs', 'rumah sakit', 'vitamin'] },
      { key: 'Hiburan', words: ['nonton', 'xxi', 'bioskop', 'game', 'steam', 'mlbb', 'spotify', 'netflix'] },
      { key: 'Langganan', words: ['netflix', 'spotify', 'subscription', 'langganan', 'icloud', 'google one'] },
      { key: 'Pendidikan', words: ['kursus', 'bootcamp', 'kelas', 'buku', 'udemy'] },
      { key: 'Elektronik', words: ['tokopedia', 'shopee', 'laptop', 'headset', 'hp', 'gadget'] },
      { key: 'Lainnya', words: [] },
    ];

    const PAYMENT_RULES = [
      { key: 'GoPay', words: ['gopay'] },
      { key: 'OVO', words: ['ovo'] },
      { key: 'DANA', words: ['dana'] },
      { key: 'ShopeePay', words: ['shopeepay', 'spay'] },
      { key: 'QRIS', words: ['qris'] },
      { key: 'Cash', words: ['cash', 'tunai'] },
      { key: 'Debit', words: ['debit'] },
      { key: 'Kartu Kredit', words: ['kredit', 'cc', 'credit'] },
      { key: 'Transfer', words: ['transfer'] },
    ];

    const INCOME_HINTS = ['gaji','bonus','refund','kembalian','income','dibayar','transfer masuk','salary'];
    const EXPENSE_HINTS = ['beli','bayar','makan','ngopi','belanja','top up','isi saldo','expense'];

    function parseIDRAmount(text){
      const t = normalizeText(text);
      const tokens = t.match(/\d+[\d.,\s]*(?:k|rb|ribu|jt|juta|m|miliar)?/g);
      if (!tokens) return null;

      let best = null;
      for (const tok0 of tokens) {
        const tok = tok0.replace(/\s+/g,'');
        const unitMatch = tok.match(/(k|rb|ribu|jt|juta|m|miliar)$/);
        const unit = unitMatch ? unitMatch[1] : '';
        let numStr = tok.replace(/(k|rb|ribu|jt|juta|m|miliar)$/,'');
        numStr = numStr.replace(/,/g,'.');

        let value;
        if (unit) {
          value = Number(numStr);
          if (Number.isNaN(value)) continue;
          const mul = (unit==='k' || unit==='rb' || unit==='ribu') ? 1_000
                    : (unit==='jt' || unit==='juta') ? 1_000_000
                    : (unit==='m' || unit==='miliar') ? 1_000_000_000
                    : 1;
          value = Math.round(value * mul);
        } else {
          const cleaned = numStr.replace(/\./g,'');
          value = Number(cleaned);
          if (Number.isNaN(value)) continue;
        }

        if (value > 0 && (!best || value > best)) best = value;
      }
      return best;
    }

    function guessType(text){
      const t = normalizeText(text);
      const hasIncome = INCOME_HINTS.some(w => t.includes(w));
      const hasExpense = EXPENSE_HINTS.some(w => t.includes(w));
      if (hasIncome && !hasExpense) return 'income';
      if (hasExpense && !hasIncome) return 'expense';
      if (t.includes('masuk') || t.includes('terima') || t.includes('dibayar')) return 'income';
      return 'expense';
    }

    function guessCategory(text){
      const t = normalizeText(text);
      for (const rule of CATEGORY_RULES) {
        if (rule.words.some(w => t.includes(w))) return rule.key;
      }
      return 'Lainnya';
    }

    function guessPayment(text){
      const t = normalizeText(text);
      for (const rule of PAYMENT_RULES) {
        if (rule.words.some(w => t.includes(w))) return rule.key;
      }
      if (t.includes('bca') || t.includes('bri') || t.includes('mandiri') || t.includes('bni')) return 'Transfer';
      return 'Cash';
    }

    function guessAccount(text, payment){
      const t = normalizeText(text);
      const banks = ['bca','bri','mandiri','bni','jago','cimb','seabank'];
      for (const b of banks) {
        if (t.includes(b)) return b.toUpperCase();
      }
      if (/gopay/.test(t)) return 'GoPay';
      if (/ovo/.test(t)) return 'OVO';
      if (/dana/.test(t)) return 'DANA';
      if (/shopeepay|spay/.test(t)) return 'ShopeePay';
      if (/cash|tunai/.test(t)) return 'Cash';
      return payment || 'Cash';
    }

    function titleCase(s){
      return (s||'').split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
    }

    function guessMerchant(text){
      const t = normalizeText(text);
      const m1 = t.match(/\bdi\s+([a-z0-9&._-]{2,}(?:\s+[a-z0-9&._-]{2,}){0,3})/i);
      if (m1) return titleCase(m1[1].replace(/\b(pake|pakai|via|dengan)\b.*$/,'').trim());

      const known = ['indomaret','alfamart','tokopedia','shopee','grab','gojek','xxi','spotify','netflix','shell','pertamina'];
      for (const k of known) {
        if (t.includes(k)) return titleCase(k);
      }
      return '';
    }

    function parseDateFromText(text){
      const t = normalizeText(text);
      const now = new Date();
      if (t.includes('hari ini')) return toISODate(now);
      if (t.includes('kemarin')) { const d=new Date(now); d.setDate(d.getDate()-1); return toISODate(d); }

      const m = t.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
      if (m) {
        const dd = Number(m[1]);
        const mm = Number(m[2]);
        let yy = m[3] ? Number(m[3]) : now.getFullYear();
        if (yy < 100) yy += 2000;
        const d = new Date(yy, mm-1, dd);
        if (!isNaN(d.getTime())) return toISODate(d);
      }

      const m2 = t.match(/\b(?:tgl|tanggal)\s*(\d{1,2})\b/);
      if (m2) {
        const dd = clamp(Number(m2[1]), 1, 31);
        const d = new Date(now.getFullYear(), now.getMonth(), dd);
        return toISODate(d);
      }
      return toISODate(now);
    }

    function parseTransactionTextHeuristic(text, {source='quick'}={}){
      const amount = parseIDRAmount(text);
      const type = guessType(text);
      const category = guessCategory(text);
      const payment_method = guessPayment(text);
      const account = guessAccount(text, payment_method);
      const merchant = guessMerchant(text);
      const date = parseDateFromText(text);

      const notes = (text||'').trim();
      return {
        id: uuid(),
        date,
        type,
        amount: amount ?? 0,
        currency: 'IDR',
        category,
        subcategory: '',
        account,
        merchant,
        payment_method,
        notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        meta: { source, parsed: true, provider: 'heuristic' }
      };
    }

    // =========================
    // AI via Supabase Edge Function
    // =========================
    async function fetchAIParsedTransactionViaSupabase(text, mode='text'){
      if (!STATE.db.enabled || !STATE.db.session?.access_token) throw new Error('Not authed');
      const url = `${SUPABASE_URL.replace(/\/+$/,'')}/functions/v1/${SUPABASE_FN_PARSE}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${STATE.db.session.access_token}`
        },
        body: JSON.stringify({ text, timezone: TZ, mode })
      });

      if (!res.ok) {
        const msg = await res.text().catch(()=>String(res.status));
        throw new Error(`AI error: ${res.status} ${msg}`);
      }

      const obj = await res.json();

      const tx = {
        id: uuid(),
        date: obj.date || toISODate(new Date()),
        type: obj.type || 'expense',
        amount: Number(obj.amount||0),
        currency: obj.currency || 'IDR',
        category: obj.category || 'Lainnya',
        subcategory: '',
        account: obj.account || obj.payment_method || 'Cash',
        merchant: obj.merchant || '',
        payment_method: obj.payment_method || obj.account || 'Cash',
        notes: obj.notes || (text||'').trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        meta: { source:'quick', parsed:true, provider:'supabase_edge' }
      };

      if (!tx.amount) tx.amount = parseIDRAmount(text) || 0;
      return tx;
    }

    async function parseQuickText(text){
      if (STATE.settings.useGemini && (STATE.settings.geminiKey||'').trim()) {
        try {
          return await fetchAIParsedTransactionViaSupabase(text, 'text');
        } catch (e) {
          console.warn('AI parse failed, fallback', e);
          $('#parseStatus').textContent = 'AI gagal, memakai mode sederhana…';
          await sleep(120);
        }
      }
      return parseTransactionTextHeuristic(text, { source:'quick' });
    }

    // =========================
    // Aggregations
    // =========================
    function getActiveRange(){
      const start = new Date(STATE.period.start); start.setHours(0,0,0,0);
      const end = new Date(STATE.period.end); end.setHours(23,59,59,999);
      return { start, end };
    }

    function matchAggregateFilters(tx, filters){
      const { q, type, category, account } = filters;
      const qn = normalizeText(q);
      if (type && tx.type !== type) return false;
      if (category && tx.category !== category) return false;
      if (account && tx.account !== account) return false;
      if (qn) {
        const hay = normalizeText(`${tx.merchant||''} ${tx.notes||''} ${tx.category||''}`);
        if (!hay.includes(qn)) return false;
      }
      if (STATE.focusCategory && tx.category !== STATE.focusCategory) return false;
      return true;
    }

    function getFilteredTransactions(){
      const { start, end } = getActiveRange();
      const { q, type, category, account } = STATE.filters;
      const qn = normalizeText(q);

      return STATE.transactions
        .filter(tx => {
          const d = new Date(tx.date);
          if (d < start || d > end) return false;
          if (type && tx.type !== type) return false;
          if (category && tx.category !== category) return false;
          if (account && tx.account !== account) return false;
          if (qn) {
            const hay = normalizeText(`${tx.merchant||''} ${tx.notes||''} ${tx.category||''}`);
            if (!hay.includes(qn)) return false;
          }
          if (STATE.focusCategory && tx.category !== STATE.focusCategory) return false;
          return true;
        })
        .sort((a,b) => (b.date.localeCompare(a.date)) || ((b.created_at||'').localeCompare(a.created_at||'')));
    }

    function getTransactionsInPeriod(){
      const { start, end } = getActiveRange();
      return STATE.transactions.filter(tx => {
        const d = new Date(tx.date);
        return d >= start && d <= end;
      });
    }

    function sumByType(txs){
      let income=0, expense=0, transfer=0;
      for (const tx of txs) {
        const amt = Number(tx.amount||0);
        if (tx.type==='income') income += amt;
        else if (tx.type==='expense') expense += amt;
        else transfer += amt;
      }
      return { income, expense, transfer, net: income - expense };
    }

    function groupExpenseByCategory(txs){
      const map = new Map();
      for (const tx of txs) {
        if (tx.type !== 'expense') continue;
        const k = tx.category || 'Lainnya';
        map.set(k, (map.get(k) || 0) + Number(tx.amount||0));
      }
      const arr = [...map.entries()].map(([category, amount]) => ({ category, amount }));
      arr.sort((a,b)=>b.amount-a.amount);
      return arr;
    }

    function sumsByMonth(monthKeys, { filters = null } = {}){
      const out = monthKeys.map(mk => ({ month: mk, income:0, expense:0 }));
      const idx = new Map(out.map((o,i)=>[o.month,i]));
      for (const tx of STATE.transactions) {
        if (filters && !matchAggregateFilters(tx, filters)) continue;
        const mk = toMonthKey(tx.date);
        if (!idx.has(mk)) continue;
        const o = out[idx.get(mk)];
        const amt = Number(tx.amount||0);
        if (tx.type==='income') o.income += amt;
        if (tx.type==='expense') o.expense += amt;
      }
      return out;
    }

    function getWeekRangeISO(refISO){
      const dt = new Date(refISO);
      const day = (dt.getDay()+6)%7; // Mon=0
      const start = new Date(dt); start.setDate(dt.getDate()-day); start.setHours(0,0,0,0);
      const end = new Date(start); end.setDate(start.getDate()+6); end.setHours(23,59,59,999);
      return { start, end };
    }

    function expenseByWeekdayInWeek(refISO){
      const { start, end } = getWeekRangeISO(refISO);
      const weekdays = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
      const values = new Array(7).fill(0);
      for (const tx of STATE.transactions) {
        if (tx.type!=='expense') continue;
        const d = new Date(tx.date);
        if (d < start || d > end) continue;
        const dow = (d.getDay()+6)%7;
        values[dow] += Number(tx.amount||0);
      }
      return { weekdays, values, start, end };
    }

    function estimateSaldoUpToPeriodEnd(){
      const key = STATE.period.end;
      if (STATE.db.enabled && STATE.db.saldoCache.hasOwnProperty(key)) return STATE.db.saldoCache[key];
      const end = new Date(STATE.period.end); end.setHours(23,59,59,999);
      const txs = STATE.transactions.filter(tx => new Date(tx.date) <= end);
      const s = sumByType(txs);
      return s.net;
    }

    function computeAccountBalancesUpto(endISO){
      const end = new Date(endISO); end.setHours(23,59,59,999);
      const balances = new Map();

      // seed known accounts so they appear even if 0
      for (const a of (STATE.settings.accounts||[])) balances.set(a, 0);

      for (const tx of STATE.transactions) {
        const d = new Date(tx.date);
        if (d > end) continue;
        const amt = Number(tx.amount||0);
        const fromAcc = tx.account || 'Cash';
        balances.set(fromAcc, balances.get(fromAcc) ?? 0);

        if (tx.type === 'income') {
          balances.set(fromAcc, (balances.get(fromAcc) || 0) + amt);
        } else if (tx.type === 'expense') {
          balances.set(fromAcc, (balances.get(fromAcc) || 0) - amt);
        } else if (tx.type === 'transfer') {
          // transfer keluar dari account
          balances.set(fromAcc, (balances.get(fromAcc) || 0) - amt);
          const toAcc = tx.meta?.transfer_to;
          if (toAcc) {
            balances.set(toAcc, balances.get(toAcc) ?? 0);
            balances.set(toAcc, (balances.get(toAcc) || 0) + amt);
          }
        }
      }

      return [...balances.entries()]
        .map(([account, balance]) => ({ account, balance: Number(balance||0) }))
        .sort((a,b)=>b.balance-a.balance);
    }

    // =========================
    // Budgeting
    // =========================
    function normalizeCategoryName(s){
      return titleCase(normalizeText(s).replace(/\s+/g,' '));
    }

    function getBudgetMonth(mk){
      const b = STATE.budgetsByMonth?.[mk];
      if (!b) return null;
      const income = Number(b.income||0);
      const categories = (b.categories && typeof b.categories==='object') ? b.categories : {};
      return { income, categories };
    }

    function sumBudgetCategories(categoriesObj){
      return Object.values(categoriesObj||{}).reduce((a,b)=>a+Number(b||0),0);
    }

    function estimateIncomeForMonth(mk){
      const saved = getBudgetMonth(mk);
      if (saved?.income) return saved.income;

      const monthTxs = STATE.transactions.filter(tx => toMonthKey(tx.date)===mk);
      const s = sumByType(monthTxs);
      if (s.income > 0) return s.income;
      return 0;
    }

    function buildBudgetRecommendation(incomeMonth, expenseByCategory){
      const totalExpense = expenseByCategory.reduce((a,b)=>a+b.amount,0);
      const targetSpending = incomeMonth > 0 ? Math.round(incomeMonth * 0.80) : totalExpense;
      const targetSavings = incomeMonth > 0 ? Math.max(0, incomeMonth - targetSpending) : 0;
      const cats = expenseByCategory.length ? expenseByCategory : [{category:'Lainnya', amount: 1}];
      const base = cats.reduce((a,b)=>a+b.amount,0) || 1;
      const plan = cats.slice(0,10).map(c => {
        const share = (c.amount / base);
        const planned = Math.round(targetSpending * share);
        return { category: c.category, planned, rationale: share };
      });
      let sumPlan = plan.reduce((a,b)=>a+b.planned,0);
      if (sumPlan > 0 && sumPlan !== targetSpending) {
        const scale = targetSpending / sumPlan;
        for (const p of plan) p.planned = Math.round(p.planned * scale);
      }
      return { planned_spending: targetSpending, planned_savings: targetSavings, by_category: plan };
    }

    function computeAIBudgetRecommendationForMonth(mk){
      const history = lastNMonths(4, mk).slice(0,3);
      let incomeTotal = 0;
      let incomeCnt = 0;
      const catMap = new Map();
      for (const k of history) {
        const txs = STATE.transactions.filter(tx => toMonthKey(tx.date)===k);
        const s = sumByType(txs);
        if (s.income > 0) { incomeTotal += s.income; incomeCnt++; }
        for (const tx of txs) {
          if (tx.type !== 'expense') continue;
          const cat = tx.category || 'Lainnya';
          catMap.set(cat, (catMap.get(cat)||0) + Number(tx.amount||0));
        }
      }
      const incomeAvg = incomeCnt ? Math.round(incomeTotal/incomeCnt) : estimateIncomeForMonth(mk);
      const cats = [...catMap.entries()].map(([category, amount]) => ({ category, amount }))
        .sort((a,b)=>b.amount-a.amount);
      const reco = buildBudgetRecommendation(incomeAvg, cats);
      const recMap = {};
      for (const row of reco.by_category) recMap[row.category] = row.planned;
      return { income: incomeAvg, categories: recMap, planned_spending: reco.planned_spending, planned_savings: reco.planned_savings };
    }

    function validateAndNormalizeBudgetDraft(draft){
      const income = Number(draft?.income||0);
      const rows = Array.isArray(draft?.rows) ? draft.rows : [];
      const categories = {};
      for (const r of rows) {
        const name = normalizeCategoryName(r.name||'');
        const amt = Math.max(0, Number(r.amount||0));
        if (!name) continue;
        categories[name] = (categories[name]||0) + amt;
      }
      let total = sumBudgetCategories(categories);
      if (income > 0 && total > income) {
        const scale = income / (total || 1);
        for (const k of Object.keys(categories)) categories[k] = Math.floor(categories[k] * scale);
        total = sumBudgetCategories(categories);
      }
      return { income, categories, total };
    }

    function monthsBetween(startISO, endISO){
      const s = new Date(startISO);
      const e = new Date(endISO);
      const startMk = toMonthKey(s);
      const endMk = toMonthKey(e);
      if (startMk === endMk) return [startMk];
      const out = [];
      const cur = new Date(s.getFullYear(), s.getMonth(), 1);
      const last = new Date(e.getFullYear(), e.getMonth(), 1);
      while (cur <= last) {
        out.push(toMonthKey(cur));
        cur.setMonth(cur.getMonth()+1);
      }
      return out;
    }

    function budgetForPeriod(){
      const ms = monthsBetween(STATE.period.start, STATE.period.end);
      let planned = 0;
      for (const mk of ms) {
        const b = getBudgetMonth(mk);
        if (b) planned += sumBudgetCategories(b.categories);
      }
      return { planned, months: ms };
    }

    // =========================
    // Advisor (local insights)
    // =========================
    function detectRecurring(txsAll){
      const groups = new Map();
      for (const tx of txsAll) {
        if (tx.type !== 'expense') continue;
        const merchant = (tx.merchant||'').trim().toLowerCase();
        if (!merchant) continue;
        const amt = Number(tx.amount||0);
        if (amt <= 0) continue;
        const key = `${merchant}__${amt}`;
        if (!groups.has(key)) groups.set(key, { merchant: tx.merchant, amount: amt, months: new Set(), samples: [] });
        const g = groups.get(key);
        g.months.add(toMonthKey(tx.date));
        if (g.samples.length < 4) g.samples.push(tx);
      }
      return [...groups.values()]
        .filter(g => g.months.size >= 3)
        .sort((a,b)=>b.months.size-a.months.size || b.amount-a.amount)
        .map(g => ({ merchant: g.merchant, amount: g.amount, months: g.months.size }))
        .slice(0,5);
    }

    function detectAnomalies(txsPeriod){
      const ex = txsPeriod.filter(t=>t.type==='expense').map(t=>Number(t.amount||0)).filter(n=>n>0).sort((a,b)=>a-b);
      if (!ex.length) return [];
      const median = ex[Math.floor(ex.length/2)];
      const totalExpense = ex.reduce((a,b)=>a+b,0);
      return txsPeriod
        .filter(t=>t.type==='expense')
        .filter(t => Number(t.amount||0) >= Math.max(median*2.5, totalExpense*0.15))
        .sort((a,b)=>Number(b.amount||0)-Number(a.amount||0))
        .slice(0,5)
        .map(t => ({ id: t.id, date: t.date, merchant: t.merchant||'(tanpa merchant)', category: t.category||'Lainnya', amount: Number(t.amount||0) }));
    }

    function generateInsights(){
      const txs = getTransactionsInPeriod();
      const sNow = sumByType(txs);

      const cats = groupExpenseByCategory(txs);
      const topCat = cats[0];

      const mMap = new Map();
      for (const tx of txs) {
        if (tx.type !== 'expense') continue;
        const m = (tx.merchant || '(tanpa merchant)').trim();
        mMap.set(m, (mMap.get(m)||0) + Number(tx.amount||0));
      }
      const topMerchants = [...mMap.entries()].map(([merchant, amount])=>({merchant, amount}))
        .sort((a,b)=>b.amount-a.amount).slice(0,5);

      const recurring = detectRecurring(STATE.transactions);
      const anomalies = detectAnomalies(txs);

      const savingRate = sNow.income > 0 ? ((sNow.income - sNow.expense) / sNow.income) : null;
      const budget = buildBudgetRecommendation(sNow.income, cats);

      let summary = `Periode ${STATE.period.label}: pemasukan ${formatIDR(sNow.income)}, pengeluaran ${formatIDR(sNow.expense)}, net ${formatIDR(sNow.net)}.`;
      if (savingRate !== null) summary += ` Saving rate sekitar ${(savingRate*100).toFixed(0)}%.`;

      const tips = [];
      if (sNow.income > 0) {
        const now = new Date();
        const end = new Date(STATE.period.end);
        const isActiveRangeEndsThisMonth = (toMonthKey(now) === toMonthKey(end));
        if (isActiveRangeEndsThisMonth) {
          const daysLeft = Math.max(0, Math.ceil((endOfMonth(toMonthKey(end)) - now) / (24*3600*1000)));
          if (daysLeft > 0) {
            const safe = Math.max(0, sNow.net);
            const perDay = Math.floor(safe / daysLeft);
            tips.push(`Batas spending “aman” kira-kira ${formatIDR(perDay)} per hari sampai akhir bulan.`);
          }
        }
      }
      if (topCat && sNow.expense>0) tips.push(`Coba pasang limit ${topCat.category} minggu depan: turunkan 10–15% dari pola sekarang.`);
      if (recurring.length) tips.push(`Review langganan: cek ${recurring.slice(0,2).map(r=>r.merchant).join(' & ')} — masih kepakai semua?`);
      if (!tips.length) tips.push('Mulai dari yang simpel: catat semua pemasukan + pengeluaran 7 hari ke depan biar pola cepat kebaca.');

      return {
        summary,
        top_spending_categories: cats.slice(0,5).map(c => ({ category: c.category, amount: c.amount })),
        top_merchants: topMerchants,
        recurring,
        anomalies,
        metrics: {
          income: sNow.income,
          expense: sNow.expense,
          net: sNow.net,
          saving_rate: savingRate,
        },
        budget_recommendations: {
          planned_spending: budget.planned_spending,
          planned_savings: budget.planned_savings,
          by_category: budget.by_category,
        },
        tips: tips.slice(0,5),
      };
    }

    // =========================
    // Rendering
    // =========================
    let chartTrend = null;
    let chartCategory = null;
    let chartWeek = null;

    function escapeHtml(s){
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function escapeHtmlAttr(s){
      return escapeHtml(s).replace(/"/g,'&quot;');
    }

    function themeChartColors(){
      const light = document.body.classList.contains('theme-light');
      return {
        tick: light ? '#475569' : '#94a3b8',
        legend: light ? '#0f172a' : '#cbd5e1',
        grid: light ? 'rgba(15,23,42,.10)' : 'rgba(255,255,255,.06)'
      };
    }

    function destroyCharts(){
      if (chartTrend) { chartTrend.destroy(); chartTrend = null; }
      if (chartCategory) { chartCategory.destroy(); chartCategory = null; }
      if (chartWeek) { chartWeek.destroy(); chartWeek = null; }
    }

    function ensureSelectOptions(){
      const cats = [...new Set(STATE.transactions.map(t=>t.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
      const accounts = [...new Set([...STATE.settings.accounts, ...STATE.transactions.map(t=>t.account).filter(Boolean)])]
        .sort((a,b)=>a.localeCompare(b));

      const catSel = $('#fCategory');
      const accSel = $('#fAccount');

      const curCat = catSel.value;
      const curAcc = accSel.value;

      catSel.innerHTML = '<option value="">Semua kategori</option>' + cats.map(c=>`<option value="${escapeHtmlAttr(c)}">${escapeHtml(c)}</option>`).join('');
      accSel.innerHTML = '<option value="">Semua akun</option>' + accounts.map(a=>`<option value="${escapeHtmlAttr(a)}">${escapeHtml(a)}</option>`).join('');

      if (cats.includes(curCat)) catSel.value = curCat;
      if (accounts.includes(curAcc)) accSel.value = curAcc;
    }

    function renderAccountsSettings(){
      const wrap = $('#accountsList');
      wrap.innerHTML = '';
      for (const a of STATE.settings.accounts) {
        const btn = document.createElement('button');
        btn.className = 'tap rounded-full app-chip px-3 py-1 text-xs hover:opacity-90';
        btn.textContent = a;
        btn.title = 'Klik untuk detail akun';
        btn.onclick = () => openAccountDetail(a);
        wrap.appendChild(btn);
      }
      $('#accountsStatus').textContent = `Total akun: ${STATE.settings.accounts.length}`;
    }

    function renderAccountsBalances(){
      const show = !!STATE.ui.dashboardOpen;
      $('#accountsBalancesSection').classList.toggle('hidden', !show);
      if (!show) return;

      const endISO = STATE.period.end;
      const list = computeAccountBalancesUpto(endISO);
      const top = list.slice(0,3);

      const row = $('#accountsBalancesRow');
      row.innerHTML = '';

      if (!top.length) {
        $('#accountsBalancesHint').textContent = 'Belum ada akun.';
        return;
      }

      for (const it of top) {
        const card = document.createElement('button');
        card.className = 'tap rounded-2xl app-chip p-3 text-left hover:opacity-90';
        card.innerHTML = `
          <div class="text-xs app-muted truncate">${escapeHtml(it.account)}</div>
          <div class="mt-1 text-sm font-semibold truncate">${formatCompactIDR(it.balance)}</div>
        `;
        card.onclick = () => openAccountDetail(it.account);
        row.appendChild(card);
      }

      // toggle “lihat semua” if more than 3
      $('#btnMoreAccounts').style.display = (list.length > 3) ? '' : 'none';
      $('#accountsBalancesHint').textContent = 'Tap akun untuk lihat detail.';
    }

    function shortDateDMY(dt){
      // output: d/m/yy (contoh 7/9/25)
      const d = (dt instanceof Date) ? dt : new Date(dt);
      if (Number.isNaN(d.getTime())) return '';
      const dd = d.getDate();
      const mm = d.getMonth() + 1;
      const yy = String(d.getFullYear()).slice(-2);
      return `${dd}/${mm}/${yy}`;
    }

    function renderHeader(){
      // Update sidebar state
      $$('.sidebar-item').forEach(el => {
        el.classList.remove('active');
        const text = el.textContent.toLowerCase();
        if (STATE.ui.dashboardOpen && text.includes('dash')) el.classList.add('active');
        if (!STATE.ui.dashboardOpen && text.includes('transaksi')) el.classList.add('active');
      });

      // label utama header menggunakan bulan (contoh: Des 2025)
      const mk = toMonthKey(STATE.period.end);
      const mkLabel = monthLabel(mk);

      // periode di kartu saldo: kalau custom range, tetap tampil ringkas
const endISO = STATE.period.end;
const startISO = STATE.period.start;

const compact =
  (toMonthKey(startISO) === toMonthKey(endISO) &&
    startISO === toISODate(startOfMonth(mk)) &&
    endISO === toISODate(endOfMonth(mk)))
    ? mkLabel
    : (startISO === endISO ? startISO : `${startISO}–${endISO}`);

['#saldoMonth', '#saldoMonthDesktop'].forEach((sel) => {
  const el = $(sel);
  if (el) el.textContent = compact || mkLabel;
});

      // ensure language labels are applied (safe)
     try { applyLanguageToUI(); } catch {}

// aria-expanded untuk kedua tombol periode
['#btnPeriodToggle', '#btnPeriodToggleDesktop'].forEach((sel) => {
  const el = $(sel);
  if (el) el.setAttribute('aria-expanded', String(STATE.ui.monthPopoverOpen));
});

// ikon chevron (mobile + desktop)
['#periodChevron', '#periodChevronDesktop'].forEach((sel) => {
  const el = $(sel);
  if (el) el.textContent = STATE.ui.monthPopoverOpen ? '▴' : '▾';
});

      $('#userNameTop').textContent = STATE.user.name || 'User';
      $('#userBadge').textContent = (STATE.user.name||'U').trim().slice(0,1).toUpperCase();
      $('#uName').value = STATE.user.name || '';
      $('#uEmail').value = STATE.user.email || '';

      // Top badge next to user: admin / lifetime / exp: d/m/yy
      const badge = $('#userPlanBadge');
      if (badge) {
        const isAdm = isAdmin();
        const planType = String(STATE.subscription?.planType || STATE.db.profile?.plan_type || 'none');
        const exp = STATE.subscription?.planExpiresAt || (STATE.db.profile?.plan_expires_at ? new Date(STATE.db.profile.plan_expires_at) : null);

        let text = '';
        let bg = 'rgba(14,165,233,.14)';
        let color = 'rgba(186,230,253,.95)';
        let border = '1px solid rgba(56,189,248,.25)';

        if (isAdm) {
          text = 'admin';
          bg = 'rgba(14,165,233,.14)';
          color = 'rgba(186,230,253,.95)';
          border = '1px solid rgba(56,189,248,.25)';
        } else if (planType === 'lifetime') {
          text = 'lifetime';
          bg = 'rgba(16,185,129,.15)';
          color = 'rgba(167,243,208,.95)';
          border = '1px solid rgba(52,211,153,.25)';
        } else if (planType === 'monthly' && exp) {
          const dmy = shortDateDMY(exp);
          text = dmy ? `exp: ${dmy}` : 'monthly';
          bg = 'rgba(234,179,8,.14)';
          color = 'rgba(253,230,138,.95)';
          border = '1px solid rgba(250,204,21,.25)';
        } else {
          text = '';
        }

        if (!text) {
          badge.classList.add('hidden');
        } else {
          badge.textContent = text;
          badge.style.background = bg;
          badge.style.color = color;
          badge.style.border = border;
          badge.classList.remove('hidden');
        }
      }

      // Role display (admin/user)
      const role = String(STATE.db.profile?.role || 'user').toLowerCase() || 'user';
      const isAdm2 = isAdmin();
      if ($('#uRole')) $('#uRole').textContent = isAdm2 ? 'admin' : role;
      if ($('#uRoleHint')) {
        $('#uRoleHint').textContent = isAdm2
          ? 'Akun ini memiliki akses Admin Panel & Branding.'
          : 'Akun user biasa.';
      }

      $('#monthPopover').classList.toggle('hidden', !STATE.ui.monthPopoverOpen);
      $('#filtersWrap').classList.toggle('hidden', !STATE.ui.monthPopoverOpen);

      // preset UI state
      if ($('#presetSelect')) {
        // keep preset selection in sync
        $('#presetSelect').value = STATE.period.preset || 'this_month';
      }
      $('#rangeCard')?.classList.toggle('hidden', (STATE.period.preset || 'this_month') !== 'custom');

      $('#dashboardExpanded').classList.toggle('hidden', !STATE.ui.dashboardOpen);
      $('#dashboardState').textContent = STATE.ui.dashboardOpen ? t('dashboard.full') : t('dashboard.compact');
      // default hint; can be overridden by renderSaldo which shows period net info
      $('#kpiSaldoSub').textContent = STATE.ui.dashboardOpen ? t('saldo.tap_close') : t('saldo.tap_open');

      $('#toggleTheme').checked = (STATE.settings.theme === 'light');
      $('#toggleKPI').checked = !!STATE.settings.showKPI;
      $('#toggleBudget').checked = !!STATE.settings.showBudget;
      $('#toggleTrend').checked = !!STATE.settings.showTrend;
      $('#toggleCategory').checked = !!STATE.settings.showCategory;
      $('#toggleWeek').checked = !!STATE.settings.showWeek;

      $('#geminiKey').value = STATE.settings.geminiKey || '';
      $('#toggleGemini').checked = !!STATE.settings.useGemini;

      $('#kpiSection').classList.toggle('hidden', !(STATE.ui.dashboardOpen && STATE.settings.showKPI));
      $('#budgetSection').classList.toggle('hidden', !(STATE.ui.dashboardOpen && STATE.settings.showBudget));
      $('#chartsSection').classList.toggle('hidden', !STATE.ui.dashboardOpen);
      $('#cardTrend').classList.toggle('hidden', !STATE.settings.showTrend);
      $('#cardCategory').classList.toggle('hidden', !STATE.settings.showCategory);
      $('#cardWeek').classList.toggle('hidden', !STATE.settings.showWeek);

      // admin-only branding + admin panel UI
const isAdminUser = isAdmin();

// Branding (Admin)
$('#adminBrandingCard')?.classList.toggle('hidden', !isAdminUser);

// Admin Panel launcher (nebeng logika yang sama)
$('#adminPanelLauncher')?.classList.toggle('hidden', !isAdminUser);

// Auto-isi logo URL untuk admin
if (isAdminUser && $('#logoUrl')) {
  $('#logoUrl').value = STATE.appConfig?.logo_url || '';
}

renderAccountsSettings();
}

   function renderSaldo() {
  const key = STATE.period.end;
  const saldo = estimateSaldoUpToPeriodEnd();

  const isCalculating =
    STATE.db.enabled &&
    STATE.db.saldoLoading &&
    !Object.prototype.hasOwnProperty.call(STATE.db.saldoCache, key);

  const saldoText = isCalculating ? t('saldo.calculating') : formatIDR(saldo);

  // Update angka saldo (mobile + desktop)
  ['#kpiSaldo', '#kpiSaldoDesktop'].forEach((sel) => {
    const el = $(sel);
    if (!el) return;

    el.textContent = saldoText;
    el.className = 'mt-1 text-2xl font-semibold';

    if (!document.body.classList.contains('theme-light')) {
      el.style.color =
        saldo >= 0
          ? 'rgba(167,243,208,.95)'
          : 'rgba(254,202,202,.95)';
    } else {
      el.style.color = '';
    }
  });

  // Hitung net periode (income - expense) untuk subtext
  const txs = getTransactionsInPeriod();
  const s = sumByType(txs);
  const netStr = formatCompactIDR(s.net);

  const subText = STATE.ui.dashboardOpen
    ? t('saldo.period_net_close', { net: netStr })
    : t('saldo.period_net_open', { net: netStr });

  // Update subtext saldo (mobile + desktop)
  ['#kpiSaldoSub', '#kpiSaldoSubDesktop'].forEach((sel) => {
    const el = $(sel);
    if (!el) return;
    el.textContent = subText;
  });
}
    function renderKPIs(){
      const txs = getTransactionsInPeriod();
      const s = sumByType(txs);
      const savingRate = s.income>0 ? ((s.income - s.expense)/s.income) : null;

      $('#kpiIncome').textContent = formatIDR(s.income);
      $('#kpiExpense').textContent = formatIDR(s.expense);
      const net = s.net;
      $('#kpiNet').textContent = formatIDR(net);
      $('#kpiNet').className = `mt-1 text-xl font-semibold`;
      $('#kpiNet').style.color = net>=0 ? 'rgba(167,243,208,.95)' : 'rgba(254,202,202,.95)';
      $('#kpiSaving').textContent = (savingRate===null) ? '—' : `${(savingRate*100).toFixed(0)}%`;

      $('#kpiIncomeSub').textContent = t('kpi.period_sub', { label: STATE.period.label });
      $('#kpiExpenseSub').textContent = t('kpi.period_sub', { label: STATE.period.label });
      $('#kpiNetSub').textContent = t('kpi.period_sub', { label: STATE.period.label });
      $('#kpiSavingSub').textContent = savingRate===null ? t('kpi.need_income') : t('kpi.net_sub', { net: formatCompactIDR(net) });
    }

    function checkBudgetNotifications(pct, planned) {
      if (!planned || typeof Notification === 'undefined') return;
      
      const threshold = STATE.appConfig?.notif_threshold || 80;
      if (pct >= threshold && Notification.permission === 'granted') {
        const lastNotif = localStorage.getItem('last_budget_notif');
        const today = new Date().toDateString();
        
        if (lastNotif !== today) {
          new Notification("Monefyi Warning", {
            body: `Budget Anda sudah terpakai ${pct.toFixed(0)}%. Waktunya berhemat!`,
            icon: "/icons/icon-192.svg"
          });
          localStorage.setItem('last_budget_notif', today);
        }
      }
    }
// --- LOGIKA AI BUDGETING ---

function generateSmartBudgetRecommendation() {
  const txs = STATE.transactions || [];
  if (txs.length === 0) return [];

  // 1. Tentukan rentang waktu (3 bulan terakhir)
  const now = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  // 2. Filter transaksi (Hanya Expense & 3 bulan terakhir)
  const history = txs.filter(t => 
    t.type === 'expense' && 
    new Date(t.date) >= threeMonthsAgo
  );

  if (history.length === 0) return [];

  // 3. Grouping Data
  // Struktur Map: { "NamaKategori": { total: 0, notesMap: { "Kopi": 50000, "Bensin": 20000 } } }
  const catAnalysis = {};

  history.forEach(t => {
    const catRaw = t.category || 'Lainnya';
    const catName = normalizeCategoryName(catRaw); // Pastikan fungsi ini ada, atau gunakan catRaw.trim()
    const amount = Number(t.amount || 0);
    const note = (t.notes || 'Umum').trim(); // Ambil detail item dari catatan

    if (!catAnalysis[catName]) {
      catAnalysis[catName] = { total: 0, items: {} };
    }

    // Tambah Total
    catAnalysis[catName].total += amount;

    // Analisa Detail Item berdasarkan Notes
    // Kita simpelkan note agar grupnya rapi (misal: "Kopi Kenangan" -> "Kopi Kenangan")
    // Jika ingin lebih pintar, bisa ambil kata pertama saja, tapi full note lebih akurat untuk skrg.
    if (!catAnalysis[catName].items[note]) {
      catAnalysis[catName].items[note] = { count: 0, total: 0 };
    }
    catAnalysis[catName].items[note].count += 1;
    catAnalysis[catName].items[note].total += amount;
  });

  // 4. Susun Hasil Rekomendasi (Draft Rows)
  const recommendationRows = [];
  const divisor = 3; // Pembagi rata-rata (asumsi data 3 bulan)

  for (const [cat, data] of Object.entries(catAnalysis)) {
    // Rata-rata per bulan + Buffer 10% untuk aman
    const avgMonthly = Math.ceil((data.total / divisor) * 1.1); 

    // Susun Detail Items (Top 5 item paling boros di kategori ini)
    // Kita konversi items map ke array
    const sortedItems = Object.entries(data.items)
      .map(([name, stat]) => ({
        name: name,
        // Estimasi harga satuan rata-rata
        price: Math.ceil(stat.total / stat.count), 
        // Estimasi qty per bulan (rata-rata)
        qty: Math.max(1, Math.round(stat.count / divisor)) 
      }))
      .sort((a, b) => (b.qty * b.price) - (a.qty * a.price)) // Urutkan dari yg totalnya terbesar
      .slice(0, 5); // Ambil top 5 saja biar tidak kepanjangan

    // Jika item kosong (misal transaksi tanpa notes), buat item generic
    if (sortedItems.length === 0) {
      sortedItems.push({ name: 'Alokasi Umum', qty: 1, price: avgMonthly });
    }

    // Hitung ulang total berdasarkan item detail agar sinkron
    const totalFromItems = sortedItems.reduce((a, b) => a + (b.qty * b.price), 0);

    recommendationRows.push({
      id: uuid(), // Generate ID baru
      name: cat,
      amount: totalFromItems, // Gunakan total dari detail item
      items: sortedItems
    });
  }

  return recommendationRows;
}
    function renderBudget(){
      const { planned } = budgetForPeriod();

      const txs = getTransactionsInPeriod();
      const s = sumByType(txs);
      const actual = s.expense;

      $('#budgetPlanned').textContent = planned ? formatIDR(planned) : t('budget.not_set');
      $('#budgetActual').textContent = formatIDR(actual);

      if (!planned) {
        $('#budgetDiff').textContent = '—';
        $('#budgetDiff').style.color = '';
        $('#budgetPct').textContent = '—';
        $('#budgetBar').style.width = '0%';
        $('#budgetHint').textContent = t('budget.set_hint');
        return;
      }

      const diff = planned - actual;
      const pct = planned > 0 ? clamp((actual / planned) * 100, 0, 999) : 0;
      
      // Trigger notification check
      checkBudgetNotifications(pct, planned);

      $('#budgetPct').textContent = `${pct.toFixed(0)}% terpakai`;
      $('#budgetBar').style.width = `${Math.min(100, pct)}%`;
      $('#budgetBar').style.background = pct <= 80 ? 'rgba(34,197,94,.75)' : pct <= 100 ? 'rgba(234,179,8,.80)' : 'rgba(244,63,94,.75)';

      $('#budgetDiff').textContent = formatIDR(diff);
      $('#budgetDiff').style.color = diff >= 0 ? 'rgba(167,243,208,.95)' : 'rgba(254,202,202,.95)';

      $('#budgetHint').textContent = `Sisa budget: ${formatIDR(Math.max(0, planned-actual))}.`;
    }

    function renderCharts(){
      if (!STATE.ui.dashboardOpen) return;
      if (!STATE.settings.showTrend && !STATE.settings.showCategory && !STATE.settings.showWeek) return;

      const colors = themeChartColors();

      // Trend: if range <= 45 days => daily, else => 6 months
      if (STATE.settings.showTrend) {
        const start = new Date(STATE.period.start);
        const end = new Date(STATE.period.end);
        const days = Math.ceil((end - start) / (24*3600*1000)) + 1;

        let labels = [];
        let datasets = [];

        if (days <= 45) {
          // daily aggregation in range
          const map = new Map();
          for (let i=0;i<days;i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            map.set(toISODate(d), { income:0, expense:0 });
          }
          for (const tx of STATE.transactions) {
            if (!matchAggregateFilters(tx, STATE.filters)) continue;
            const iso = tx.date;
            if (!map.has(iso)) continue;
            const amt = Number(tx.amount||0);
            if (tx.type==='income') map.get(iso).income += amt;
            if (tx.type==='expense') map.get(iso).expense += amt;
          }
          labels = [...map.keys()];
          const inc = labels.map(k=>map.get(k).income);
          const exp = labels.map(k=>map.get(k).expense);

          const showIncome = !STATE.filters.type || STATE.filters.type === 'income';
          const showExpense = !STATE.filters.type || STATE.filters.type === 'expense';

          if (showIncome) datasets.push({
            label: 'Income',
            data: inc,
            backgroundColor: 'rgba(34, 197, 94, .18)',
            borderColor: 'rgba(34, 197, 94, .85)',
            borderWidth: 1,
            borderRadius: 8,
          });
          if (showExpense) datasets.push({
            label: 'Expense',
            data: exp,
            backgroundColor: 'rgba(244, 63, 94, .14)',
            borderColor: 'rgba(244, 63, 94, .85)',
            borderWidth: 1,
            borderRadius: 8,
          });
        } else {
          const anchor = toMonthKey(STATE.period.end);
          const months = lastNMonths(6, anchor);
          const sums = sumsByMonth(months, { filters: STATE.filters });
          labels = sums.map(s => {
            const [y,m]=s.month.split('-');
            const mn = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][Number(m)-1];
            return `${mn} '${y.slice(-2)}`;
          });

          const showIncome = !STATE.filters.type || STATE.filters.type === 'income';
          const showExpense = !STATE.filters.type || STATE.filters.type === 'expense';

          if (showIncome) datasets.push({
            label: 'Income',
            data: sums.map(s=>s.income),
            backgroundColor: 'rgba(34, 197, 94, .25)',
            borderColor: 'rgba(34, 197, 94, .85)',
            borderWidth: 1,
            borderRadius: 8,
          });
          if (showExpense) datasets.push({
            label: 'Expense',
            data: sums.map(s=>s.expense),
            backgroundColor: 'rgba(244, 63, 94, .20)',
            borderColor: 'rgba(244, 63, 94, .85)',
            borderWidth: 1,
            borderRadius: 8,
          });
        }

        const ctx = $('#chartTrend');
        if (!chartTrend) {
          chartTrend = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { labels: { color: colors.legend } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatIDR(ctx.parsed.y)}` } }
              },
              scales: {
                x: { ticks: { color: colors.tick }, grid: { color: colors.grid } },
                y: { ticks: { color: colors.tick, callback: (v)=>formatCompactIDR(v) }, grid: { color: colors.grid } }
              }
            }
          });
        } else {
          chartTrend.data.labels = labels;
          chartTrend.data.datasets = datasets;
          chartTrend.options.plugins.legend.labels.color = colors.legend;
          chartTrend.options.scales.x.ticks.color = colors.tick;
          chartTrend.options.scales.y.ticks.color = colors.tick;
          chartTrend.options.scales.x.grid.color = colors.grid;
          chartTrend.options.scales.y.grid.color = colors.grid;
          chartTrend.update();
        }
      }

      if (STATE.settings.showCategory) {
        const txs = getTransactionsInPeriod();
        const cats = groupExpenseByCategory(txs);
        const top = cats.slice(0,6);
        const other = cats.slice(6).reduce((a,b)=>a+b.amount,0);
        const donutLabels = top.map(c=>c.category).concat(other>0?['Lainnya (gabungan)']:[]);
        const donutData = top.map(c=>c.amount).concat(other>0?[other]:[]);

        const palette = [
          'rgba(99, 102, 241, .85)',
          'rgba(14, 165, 233, .85)',
          'rgba(34, 197, 94, .85)',
          'rgba(234, 179, 8, .85)',
          'rgba(244, 63, 94, .85)',
          'rgba(168, 85, 247, .85)',
          'rgba(148, 163, 184, .65)',
        ];

        const ctx2 = $('#chartCategory');
        if (!chartCategory) {
          chartCategory = new Chart(ctx2, {
            type: 'doughnut',
            data: {
              labels: donutLabels,
              datasets: [{ data: donutData, backgroundColor: donutLabels.map((_,i)=>palette[i%palette.length]), borderColor: 'rgba(255,255,255,.08)', borderWidth: 1 }]
            },
            options: {
              cutout: '65%',
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx)=> `${ctx.label}: ${formatIDR(ctx.parsed)}` } }
              }
            }
          });
        } else {
          chartCategory.data.labels = donutLabels;
          chartCategory.data.datasets[0].data = donutData;
          chartCategory.data.datasets[0].backgroundColor = donutLabels.map((_,i)=>palette[i%palette.length]);
          chartCategory.update();
        }

        const total = donutData.reduce((a,b)=>a+b,0) || 1;
        $('#catLegend').innerHTML = donutLabels.map((lab,i)=>{
          const amt = donutData[i] || 0;
          const pct = (amt/total)*100;
          const dot = `<span class="inline-block w-2.5 h-2.5 rounded-full" style="background:${palette[i%palette.length]}"></span>`;
          const focus = (STATE.focusCategory === lab) ? 'ring-1 ring-indigo-400/60' : '';
          return `<button class="tap w-full text-left flex items-center gap-2 rounded-xl px-2 py-1.5 hover:opacity-90 ${focus}" style="border: 1px solid var(--app-border); background: transparent" data-focus-cat="${escapeHtmlAttr(lab)}" title="Klik untuk filter kategori">${dot}<span class="flex-1 truncate">${escapeHtml(lab)}</span><span class="app-muted">${pct.toFixed(0)}%</span></button>`;
        }).join('');

        $$('[data-focus-cat]').forEach(btn => {
          btn.onclick = () => {
            const cat = btn.getAttribute('data-focus-cat');
            if (cat.includes('gabungan')) STATE.focusCategory = null;
            else STATE.focusCategory = (STATE.focusCategory===cat) ? null : cat;
            rerender();
          };
        });
      }

      if (STATE.settings.showWeek) {
        const wk = expenseByWeekdayInWeek(STATE.period.end);
        $('#weekRange').textContent = `${toISODate(wk.start)}–${toISODate(wk.end)}`;
        const ctx3 = $('#chartWeek');
        if (!chartWeek) {
          chartWeek = new Chart(ctx3, {
            type: 'bar',
            data: {
              labels: wk.weekdays,
              datasets: [{ label:'Expense', data: wk.values, backgroundColor: 'rgba(14,165,233,.28)', borderColor:'rgba(14,165,233,.85)', borderWidth:1, borderRadius: 8 }]
            },
            options: {
              plugins: {
                legend: { display:false },
                tooltip: { callbacks: { label: (ctx)=> formatIDR(ctx.parsed.y) } }
              },
              scales: {
                x: { ticks: { color: colors.tick }, grid: { display:false } },
                y: { ticks: { color: colors.tick, callback:(v)=>formatCompactIDR(v) }, grid: { color: colors.grid } },
              }
            }
          });
        } else {
          chartWeek.data.labels = wk.weekdays;
          chartWeek.data.datasets[0].data = wk.values;
          chartWeek.options.scales.x.ticks.color = colors.tick;
          chartWeek.options.scales.y.ticks.color = colors.tick;
          chartWeek.options.scales.y.grid.color = colors.grid;
          chartWeek.update();
        }
      }
    }

    function relativeDayLabel(iso){
      const d = new Date(iso);
      const now = new Date();
      const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diff = Math.round((a - b) / (24*3600*1000));
      if (diff === 0) return t('days.today');
      if (diff === -1) return t('days.yesterday');
      if (diff === 1) return t('days.tomorrow');

      const lang = STATE.settings?.lang || 'id';
      const wdId = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
      const wdEn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const wd = (lang === 'en' ? wdEn : wdId)[d.getDay()];
      return `${wd}, ${iso}`;
    }

    function renderTransactions(){
      const txs = getFilteredTransactions();
      $('#txCount').textContent = t('tx.count', { n: txs.length }) + (STATE.focusCategory ? t('tx.focus', { cat: STATE.focusCategory }) : '');

      const list = $('#txList');
      list.innerHTML = '';
      $('#txEmpty').classList.toggle('hidden', txs.length !== 0);

      const groups = new Map();
      for (const tx of txs) {
        if (!groups.has(tx.date)) groups.set(tx.date, []);
        groups.get(tx.date).push(tx);
      }
      const dates = [...groups.keys()].sort((a,b)=>b.localeCompare(a));

      for (const date of dates) {
        const chip = document.createElement('div');
        chip.className = 'flex items-center justify-between px-1';
        chip.innerHTML = `
          <div class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs app-chip" style="background: color-mix(in srgb, var(--app-surface2) 70%, transparent)">
            <span class="font-semibold">${escapeHtml(relativeDayLabel(date))}</span>
            <span class="app-muted">${t('common.net')}: ${formatCompactIDR(sumByType(groups.get(date)).net)}</span>
          </div>
        `;
        list.appendChild(chip);

        for (const tx of groups.get(date)) {
          const row = document.createElement('button');
          row.className = 'tap w-full text-left rounded-2xl app-card px-4 py-3 hover:opacity-95 focus:outline-none';

          const isInc = tx.type==='income';
          const isExp = tx.type==='expense';
          const amtColor = isInc ? 'rgba(167,243,208,.95)' : isExp ? 'rgba(254,202,202,.95)' : 'var(--app-text)';
          const sign = isInc ? '+' : isExp ? '−' : '';

          const subtitle = [tx.merchant, tx.notes].filter(Boolean).join(' • ');

          row.innerHTML = `
            <div class="flex items-start gap-3">
              <div class="mt-0.5 w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-semibold" style="border: 1px solid var(--app-border); background: color-mix(in srgb, var(--app-surface2) 85%, transparent)">
                ${escapeHtml((tx.category||'').split(' ')[0].slice(0,2).toUpperCase() || 'TX')}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="text-sm font-semibold truncate">${escapeHtml(tx.category || 'Lainnya')}</div>
                    <div class="mt-0.5 text-xs app-muted truncate">${escapeHtml(subtitle || '—')}</div>
                    <div class="mt-1 text-[11px] app-muted2 truncate">${escapeHtml(tx.account || '—')} • ${escapeHtml(tx.type)}</div>
                  </div>
                  <div class="text-right shrink-0">
                    <div class="text-sm font-semibold" style="color:${amtColor}">${sign}${formatIDR(Number(tx.amount||0))}</div>
                    <div class="mt-0.5 text-[11px] app-muted2">${escapeHtml(tx.payment_method || '')}</div>
                  </div>
                </div>
              </div>
            </div>
          `;
          row.addEventListener('click', () => openEdit(tx.id));
          list.appendChild(row);
        }
      }
    }

  function rerender(){
  // keep static UI labels synced with selected language
  try { applyLanguageToUI(); } catch {}

  ensureSelectOptions();
  renderHeader();
  renderAccountsBalances();
  renderSaldo();
  if (STATE.ui.dashboardOpen && STATE.settings.showKPI) renderKPIs();
  if (STATE.ui.dashboardOpen && STATE.settings.showBudget) renderBudget();

  if (!STATE.ui.dashboardOpen) destroyCharts();
  else requestAnimationFrame(() => renderCharts());

  renderTransactions();
}
    // =========================
    // UI: Sheet helpers
    // =========================
    function openSheet(backdropEl, sheetEl){
      backdropEl.classList.add('open');
      sheetEl.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeSheet(backdropEl, sheetEl){
      sheetEl.classList.remove('open');
      backdropEl.classList.remove('open');
      document.body.style.overflow = '';
    }

    // Add transaction sheet
    const sheetBackdrop = $('#sheetBackdrop');
    const sheet = $('#sheet');

function openAddSheet(tab = 'quick') {
  // 1. Isi Dropdown Kategori, Akun, Metode (Agar Manual selalu siap)
  const cats = getActiveBudgetCats();
  const mCat = document.getElementById('mCategory');
  if (mCat) setSelectOptions(mCat, cats, cats[0] || 'Lainnya');

  const accounts = [...new Set([...STATE.settings.accounts, ...STATE.transactions.map(t=>t.account).filter(Boolean)])].sort();
  const lastAcc = getLastUsedAccount();
  setSelectOptions($('#mAccount'), accounts, lastAcc || 'Cash');
  setSelectOptions($('#mPayment'), paymentMethodOptions(), lastAcc || 'Cash');

  // 2. Logic Pindah Tab (Tanpa showTab)
  document.querySelectorAll('.tabPanel').forEach(panel => {
    if (panel.dataset.tabPanel === tab) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
  });

  // 3. Buka Sheet
  const backdrop = document.getElementById('sheetBackdrop');
  const sheet = document.getElementById('sheet');
  if (backdrop && sheet) {
    openSheet(backdrop, sheet); // Memanggil fungsi asli aplikasi Anda
  }
}

    // Buka input AI (quick) sebagai popup di tengah
function openQuickAdd() {
  setSheetPosition('center');          // posisi tengah
  if (typeof openAddSheet === 'function') {
    openAddSheet('quick');            // pakai fungsi lama: aktifkan tab quick
  }
}

// Gunakan ID btnQuickGoManual sesuai HTML Anda
const btnQuickGoManual = document.getElementById('btnQuickGoManual');

if (btnQuickGoManual) {
    btnQuickGoManual.onclick = function(e) {
        e.preventDefault(); // Mencegah reload
        console.log("Berpindah ke form manual...");

        // 1. Refresh Kategori Budget lagi (agar 100% sinkron)
        const cats = getActiveBudgetCats();
        const mCat = document.getElementById('mCategory');
        if (mCat) setSelectOptions(mCat, cats, cats[0] || 'Lainnya');

        // 2. Tampilkan Panel Manual
        document.querySelectorAll('.tabPanel').forEach(p => p.classList.add('hidden'));
        const manualPanel = document.querySelector('[data-tab-panel="manual"]');
        if (manualPanel) {
            manualPanel.classList.remove('hidden');
        }

        // 3. Reset field input
        if($('#mAmount')) $('#mAmount').value = '';
        if($('#mMerchant')) $('#mMerchant').value = '';
    };
}

// Buka input manual sebagai bottom sheet
function openManualAdd() {
  setSheetPosition('bottom');
  if (typeof openAddSheet === 'function') {
    openAddSheet('manual');
  }
}

// Buka foto struk (receipt) sebagai bottom sheet
function openReceiptAdd() {
  setSheetPosition('bottom');
  if (typeof openAddSheet === 'function') {
    openAddSheet('receipt');
  }
}
function setSheetPosition(mode) {
  var sheet = document.getElementById('sheet');
  if (!sheet) return;

  if (mode === 'center') {
    // popup di tengah
    sheet.classList.remove('bottom-0');
    sheet.classList.add('top-1/2');
    sheet.classList.add('-translate-y-1/2');
  } else {
    // bottom sheet biasa
    sheet.classList.add('bottom-0');
    sheet.classList.remove('top-1/2');
    sheet.classList.remove('-translate-y-1/2');
  }
}
    function closeAddSheet(){ closeSheet(sheetBackdrop, sheet); }

    sheetBackdrop.addEventListener('click', (e)=>{
      if (e.target?.dataset?.close === 'true') closeAddSheet();
    });

    // Budget sheet
    const budgetBackdrop = $('#budgetBackdrop');
    const budgetSheet = $('#budgetSheet');

    // GANTI FUNGSI openBudget DENGAN INI:

function openBudget(){
  const mk = STATE.selectedMonth; // Pastikan variabel ini sesuai dengan navigasi bulan di app Anda
  
  // 1. Ambil Data Tersimpan dari Memory (STATE)
  // Kita coba ambil dari STATE.budgetsByMonth dulu agar real-time setelah save
  const saved = STATE.budgetsByMonth[mk] || getBudgetMonth(mk); 

  let rows = [];
  let income = 0;
  let status = 'new';

  if (saved && saved.categories && Array.isArray(saved.categories.rows)) {
    // === SKENARIO 1: DATA DITEMUKAN (FORMAT BARU/BENAR) ===
    // Kita copy datanya agar aman saat diedit (Deep Copy)
    rows = JSON.parse(JSON.stringify(saved.categories.rows));
    income = Number(saved.income || 0);
    status = 'saved';
  } 
  else if (saved && saved.categories && !Array.isArray(saved.categories.rows)) {
     // === SKENARIO 2: DATA LAMA (FORMAT JADUL) ===
     // Migrasi darurat jika ketemu format {'Makan': 5000}
     for (const [cat, amt] of Object.entries(saved.categories)) {
        rows.push({ id: uuid(), name: cat, amount: Number(amt), items: [] });
     }
     income = Number(saved.income || 0);
     status = 'migrated';
  }
  else {
    // === SKENARIO 3: BULAN BARU (BELUM ADA DATA) ===
    // Biarkan rows kosong agar bersih. 
    // User disarankan menekan tombol "Gunakan Rekomendasi" di UI.
    // Kita coba estimasi income saja biar user terbantu.
    const ai = computeAIBudgetRecommendationForMonth(mk); // Fungsi lama Anda (opsional)
    income = estimateIncomeForMonth(mk) || (ai ? ai.income : 0) || 0;
    rows = []; 
    status = 'new';
  }

  // Set ke Global Draft
  STATE.budgetDraft = {
    month: mk,
    income: income,
    rows: rows,
    ai: null, // Kita load AI nanti saja via tombol "Gunakan Rekomendasi"
    initialFrom: status
  };

  // Render & Buka Popup
  renderBudgetSheet();
  openSheet(budgetBackdrop, budgetSheet);
  
  // Auto focus ke income jika masih kosong
  if(income === 0) {
      setTimeout(()=>$('#bIncome')?.focus(), 120);
  }
}
    function closeBudget(){ closeSheet(budgetBackdrop, budgetSheet); }
    budgetBackdrop.addEventListener('click', (e)=>{
      if (e.target?.dataset?.closeBudget === 'true') closeBudget();
    });

    // Advisor sheet
    const advisorBackdrop = $('#advisorBackdrop');
    const advisorSheet = $('#advisorSheet');
    function openAdvisor(){ openSheet(advisorBackdrop, advisorSheet); }
    function closeAdvisor(){ closeSheet(advisorBackdrop, advisorSheet); }
    advisorBackdrop.addEventListener('click', (e)=>{
      if (e.target?.dataset?.closeAdvisor === 'true') closeAdvisor();
    });

    // Menu sheet
    const menuBackdrop = $('#menuBackdrop');
    const menuSheet = $('#menuSheet');
    function openMenu(){ openSheet(menuBackdrop, menuSheet); }
    function closeMenu(){ closeSheet(menuBackdrop, menuSheet); }
    menuBackdrop.addEventListener('click', (e)=>{
      if (e.target?.dataset?.closeMenu === 'true') closeMenu();
    });

    // === Tutorial sheet logic (versi accordion) ===
const tutorialBackdrop = $('#tutorialBackdrop');
const tutorialSheet = $('#tutorialSheet');

function openTutorial(){
  renderTutorialContent();
  openSheet(tutorialBackdrop, tutorialSheet);
}

function closeTutorial(){
  closeSheet(tutorialBackdrop, tutorialSheet);
}

// Klik area gelap dengan data-close-tutorial="true" akan menutup sheet
tutorialBackdrop.addEventListener('click', (e)=>{
  if (e.target?.dataset?.closeTutorial === 'true') closeTutorial();
});

// ---------- Data tutorial ----------

// Default topics jika belum ada di config database.
// Nanti bisa digantikan dengan STATE.appConfig.tutorial.topics.
const DEFAULT_TUTORIAL_TOPICS = [
  {
    id: 'pwa',
    title: 'Pasang Monefyi di Layar Utama (Mobile App View)',
    short: 'Cara menyimpan Monefyi seperti aplikasi di homescreen HP.',
    videoUrl: '',
    bodyHtml: `
      <ol class="list-decimal pl-4 space-y-1 text-sm app-muted">
        <li>Buka Monefyi dari browser di HP Anda (Chrome / Safari).</li>
        <li>Pastikan Anda sudah login dan halaman utama terbuka.</li>
        <li>Di Chrome (Android): tap ikon tiga titik › pilih <span class="font-semibold">"Tambahkan ke Layar Utama"</span>.</li>
        <li>Di Safari (iOS): tap ikon <span class="font-semibold">Share</span> › pilih <span class="font-semibold">"Add to Home Screen"</span>.</li>
        <li>Konfirmasi nama ikon (misalnya "Monefyi") lalu simpan. Kini Monefyi bisa dibuka seperti aplikasi biasa.</li>
      </ol>
    `
  },
  {
    id: 'gemini',
    title: 'Mengaktifkan AI dengan API Key Gemini',
    short: 'Menghubungkan akun Gemini agar fitur AI Monefyi aktif.',
    videoUrl: '',
    bodyHtml: `
      <ol class="list-decimal pl-4 space-y-1 text-sm app-muted">
        <li>Buka menu <span class="font-semibold">Set</span> di navbar bawah.</li>
        <li>Scroll ke bagian <span class="font-semibold">Pengaturan AI (Monefyi)</span>.</li>
        <li>Buat API key Gemini di akun Google AI Studio Anda.</li>
        <li>Salin API key (diawali huruf <code>AI...</code>) lalu tempel di kolom <span class="font-semibold">Gemini API Key</span>.</li>
        <li>Aktifkan toggle <span class="font-semibold">Aktifkan AI</span>, klik <span class="font-semibold">Simpan</span>, lalu uji dengan <span class="font-semibold">Tes Koneksi</span>.</li>
      </ol>
    `
  },
  {
    id: 'budgeting',
    title: 'Menyusun Budget per Kategori',
    short: 'Cara mengatur batas pengeluaran bulanan di Monefyi.',
    videoUrl: '',
    bodyHtml: `
      <ol class="list-decimal pl-4 space-y-1 text-sm app-muted">
        <li>Buka bagian <span class="font-semibold">Budgeting</span> (sidebar atau tombol Budget di navbar).</li>
        <li>Isi <span class="font-semibold">Income (bulan ini)</span> sebagai dasar total budget.</li>
        <li>Gunakan tombol <span class="font-semibold">Gunakan rekomendasi</span> untuk draft berdasarkan 3 bulan terakhir.</li>
        <li>Tambahkan <span class="font-semibold">Budget per kategori</span> seperti Belanja Pasar, Transportasi, Tagihan &amp; Utilitas, dll.</li>
        <li>Pastikan total budget tidak melebihi income, lalu klik <span class="font-semibold">Simpan Budget</span>.</li>
      </ol>
    `
  },
  {
    id: 'input-transaksi',
    title: 'Input Transaksi (Cepat AI, Manual, Foto Struk)',
    short: 'Tiga cara mencatat transaksi di Monefyi.',
    videoUrl: '',
    bodyHtml: `
      <ol class="list-decimal pl-4 space-y-1 text-sm app-muted">
        <li><span class="font-semibold">Cepat (AI)</span>: tekan tombol <span class="font-semibold">+</span> › ikon pensil › tulis beberapa transaksi seperti chat, lalu klik <span class="font-semibold">Proses teks</span>.</li>
        <li><span class="font-semibold">Manual</span>: buka form manual, isi tanggal, tipe, jumlah, kategori, akun, merchant, dan catatan, lalu klik <span class="font-semibold">Simpan</span>.</li>
        <li><span class="font-semibold">Foto Struk (OCR)</span>: tekan tombol <span class="font-semibold">+</span> › ikon kamera › pilih foto struk dari kamera/galeri/file, cek hasil OCR lalu klik <span class="font-semibold">Simpan transaksi</span>.</li>
        <li>Setiap transaksi yang disimpan akan otomatis masuk ke daftar "Semua Transaksi" dan memengaruhi saldo/budget.</li>
      </ol>
    `
  },
  {
    id: 'dashboard',
    title: 'Mengenal Tampilan Dashboard',
    short: 'Ringkasan saldo, income/expense, dan tren pengeluaran.',
    videoUrl: '',
    bodyHtml: `
      <ol class="list-decimal pl-4 space-y-1 text-sm app-muted">
        <li>Kartu <span class="font-semibold">Saldo (estimasi)</span> menunjukkan estimasi saldo semua akun untuk periode terpilih.</li>
        <li>Kartu <span class="font-semibold">Pemasukan</span>, <span class="font-semibold">Pengeluaran</span>, dan <span class="font-semibold">Surplus/Defisit</span> merangkum performa keuangan bulan berjalan.</li>
        <li>Grafik <span class="font-semibold">Tren</span> dan <span class="font-semibold">Kategori</span> membantu melihat pola dan pos pengeluaran terbesar.</li>
        <li>Gunakan tombol <span class="font-semibold">Periode</span> untuk mengubah rentang tanggal; semua komponen dashboard akan mengikuti filter tersebut.</li>
      </ol>
    `
  }
];

// Ambil topics dari STATE.appConfig.tutorial.topics jika ada, selain itu pakai default
function getTutorialTopics() {
  var cfg = STATE.appConfig && STATE.appConfig.tutorial;
  if (cfg && Array.isArray(cfg.topics) && cfg.topics.length > 0) {
    return cfg.topics
      .map(function (t) {
        return {
          id: t.id || t.slug || '',
          title: t.title || '',
          short: t.short || t.subtitle || '',
          videoUrl: t.videoUrl || t.video_url || '',
          bodyHtml: t.bodyHtml || t.body_html || ''
        };
      })
      .filter(function (t) { return t.id && t.title; });
  }
  return DEFAULT_TUTORIAL_TOPICS;
}

var CURRENT_TUTORIAL_ID = null;

// Render kartu tutorial (accordion)
function renderTutorialContent() {
  var container = $('#tutorialStepsContainer');
  if (!container) return;

  var topics = getTutorialTopics();
  container.innerHTML = '';

  if (!topics.length) {
    container.innerHTML = '<div class="rounded-2xl app-card p-3 text-xs app-muted">Belum ada data tutorial. Silakan tambahkan dari Admin Panel.</div>';
    return;
  }

  topics.forEach(function (tut) {
    var card = document.createElement('div');
    card.className = 'tutorial-card rounded-2xl app-card p-3 cursor-pointer transition border border-slate-800';
    card.setAttribute('data-id', tut.id);

    card.innerHTML =
      '<div class="flex items-center justify-between gap-3">' +
        '<div>' +
          '<div class="text-sm font-semibold">' + tut.title + '</div>' +
          '<div class="text-xs app-muted mt-0.5">' + (tut.short || '') + '</div>' +
        '</div>' +
        '<span class="text-xs app-muted">Tap untuk lihat</span>' +
      '</div>' +
      '<div class="tutorial-card-body mt-3 hidden"></div>';

    card.addEventListener('click', function () {
      openTutorialTopic(tut.id);
    });

    container.appendChild(card);
  });

  // Buka topik pertama
  openTutorialTopic(topics[0].id);
}

// Buka satu topik: tampilkan detail & video, redupkan kartu lain
function openTutorialTopic(id) {
  var topics = getTutorialTopics();
  var tut = topics.find(function (t) { return t.id === id; });
  if (!tut) return;

  CURRENT_TUTORIAL_ID = id;

  var container = $('#tutorialStepsContainer');
  if (!container) return;

  var cards = container.querySelectorAll('.tutorial-card');
  cards.forEach(function (card) {
    var cardId = card.getAttribute('data-id');
    var body = card.querySelector('.tutorial-card-body');

    if (cardId === id) {
      card.classList.remove('opacity-60');
      card.classList.add('border-emerald-500/70');
      if (body) {
        body.classList.remove('hidden');
        body.innerHTML = tut.bodyHtml || '';
      }
    } else {
      card.classList.add('opacity-60');
      card.classList.remove('border-emerald-500/70');
      if (body) {
        body.classList.add('hidden');
        body.innerHTML = '';
      }
    }
  });

  // Atur video di area atas
  var frame = $('#tutorialVideoFrame');
  var placeholder = $('#tutorialVideoPlaceholder');
  if (!frame || !placeholder) return;

  if (tut.videoUrl) {
    frame.src = tut.videoUrl;
    frame.classList.remove('hidden');
    placeholder.classList.add('hidden');
  } else {
    frame.src = '';
    frame.classList.add('hidden');
    placeholder.classList.remove('hidden');
  }
}

    // Admin panel sheet
    const adminBackdrop = $('#adminBackdrop');
    const adminSheet = $('#adminSheet');
    function openAdminPanel(){
      if (!isAdmin()) return;
      setAdminTab('users');
      $('#cfgMonthlyUrl').value = String(STATE.appConfig?.checkout_monthly_url || MONTHLY_CHECKOUT_URL || '');
      $('#cfgLifetimeUrl').value = String(STATE.appConfig?.checkout_lifetime_url || LIFETIME_CHECKOUT_URL);
      $('#cfgAffiliateCommission').value = String(STATE.appConfig?.affiliate_commission || 100000);
      $('#adminConfigStatus').textContent = '—';
      $('#adminUsersStatus').textContent = '—';
      $('#adminUsersList').innerHTML = '<div class="text-sm app-muted">Klik Refresh untuk memuat user (butuh Edge Function admin).</div>';
      openSheet(adminBackdrop, adminSheet);
    }
    function closeAdminPanel(){ closeSheet(adminBackdrop, adminSheet); }
    adminBackdrop.addEventListener('click', (e)=>{
      if (e.target?.dataset?.closeAdmin === 'true') closeAdminPanel();
    });

    function setAdminTab(tab){
      const isUsers = tab === 'users';
      $('#adminUsersPanel').classList.toggle('hidden', !isUsers);
      $('#adminConfigPanel').classList.toggle('hidden', isUsers);
      const btn1 = $('#adminTabUsers');
      const btn2 = $('#adminTabConfig');
      if (btn1 && btn2) {
        btn1.style.background = isUsers ? 'rgba(14,165,233,.14)' : '';
        btn1.style.borderColor = isUsers ? 'rgba(56,189,248,.25)' : '';
        btn1.style.color = isUsers ? 'rgba(186,230,253,.95)' : '';

        btn2.style.background = !isUsers ? 'rgba(14,165,233,.14)' : '';
        btn2.style.borderColor = !isUsers ? 'rgba(56,189,248,.25)' : '';
        btn2.style.color = !isUsers ? 'rgba(186,230,253,.95)' : '';
      }
    }

    $('#adminTabUsers')?.addEventListener('click', ()=>setAdminTab('users'));
    $('#adminTabConfig')?.addEventListener('click', ()=>setAdminTab('config'));

    $('#btnSaveAdminConfig')?.addEventListener('click', async ()=>{
      if (!isAdmin()) return;
      const monthlyUrl = ($('#cfgMonthlyUrl').value || '').trim();
      const lifetimeUrl = ($('#cfgLifetimeUrl').value || '').trim();
      const commission = parseNumberInput($('#cfgAffiliateCommission').value) || 0;
      const videoUrl = ($('#cfgVideoUrl').value || '').trim();
      const threshold = Number($('#cfgNotifThreshold').value) || 80;

      $('#adminConfigStatus').textContent = 'Menyimpan…';
      try {
        const payload = {
          id: 'global',
          checkout_monthly_url: monthlyUrl,
          checkout_lifetime_url: lifetimeUrl,
          affiliate_commission: commission,
          logo_url: STATE.appConfig?.logo_url || null,
          tutorial: { videoUrl, steps: STATE.appConfig?.tutorial?.steps || [] },
          notif_threshold: threshold,
          updated_at: new Date().toISOString(),
        };
        const { data, error } = await STATE.db.supa.from('app_config').upsert(payload).select('*').single();
        if (error) throw error;
        STATE.appConfig = data;
        $('#adminConfigStatus').textContent = 'Tersimpan.';
      } catch {
        $('#adminConfigStatus').textContent = 'Gagal (perlu policy/Edge Function).';
      }
    });

    async function adminFetchUsers(){
      const q = ($('#adminUserSearch').value || '').trim();
      const plan = ($('#adminPlanFilter').value || '').trim();
      const status = ($('#adminStatusFilter').value || '').trim();
      $('#adminUsersStatus').textContent = 'Memuat…';
      await sleep(200);
      $('#adminUsersList').innerHTML = `
        <div class="rounded-2xl app-card p-4 text-sm app-muted">
          Endpoint admin belum ada. Buat Edge Function <span class="font-semibold">monefyi-admin-users</span> untuk mengambil daftar user & plan.
          <div class="mt-2 text-xs app-muted2">Filter: q=${escapeHtml(q||'—')} • plan=${escapeHtml(plan||'—')} • status=${escapeHtml(status||'—')}</div>
        </div>
      `;
      $('#adminUsersStatus').textContent = '—';
    }

    $('#btnAdminRefreshUsers')?.addEventListener('click', adminFetchUsers);

    // Affiliate modal
    const affBackdrop = $('#affBackdrop');
    const affSheet = $('#affSheet');
    function openAffModal(){
      const plan = (STATE.subscription?.planType || 'none');
      const headline = $('#affHeadline');
      const body = $('#affBody');
      const hint = $('#affHint');
      const cta = $('#affCta');

      const promoText = 'Dapat potensi income Rp. 100.000/ penjualan dengan menyebarkan manfaat Monefyi.';

      if (plan === 'lifetime') {
        headline.textContent = '';
        body.textContent = promoText;
        cta.textContent = 'Mulai Sekarang';
        cta.href = 'https://affiliator.monefyi.com';
        cta.target = '_blank';
        cta.rel = 'noopener';
        hint.textContent = 'Akan membuka affiliator.monefyi.com.';
      } else {
        headline.textContent = 'Anda Belum Menjadi Member Lifetime Monefyi';
        body.textContent = promoText;
        cta.textContent = 'Order Lifetime';
        const lifeUrl = String(STATE.appConfig?.checkout_lifetime_url || LIFETIME_CHECKOUT_URL || 'https://monefyi.com#paket-lifetime');
        cta.href = lifeUrl;
        cta.target = '_blank';
        cta.rel = 'noopener';
        hint.textContent = 'Upgrade ke lifetime untuk membuka akses affiliate.';
      }

      openSheet(affBackdrop, affSheet);
    }
    function closeAffModal(){ closeSheet(affBackdrop, affSheet); }
    affBackdrop.addEventListener('click', (e)=>{
      if (e.target?.dataset?.closeAff === 'true') closeAffModal();
    });

    // Accounts sheet
    const accountsBackdrop = $('#accountsBackdrop');
    const accountsSheet = $('#accountsSheet');
    function openAccounts(){
      renderAccountsAllSheet();
      openSheet(accountsBackdrop, accountsSheet);
    }
    function closeAccounts(){ closeSheet(accountsBackdrop, accountsSheet); }
    accountsBackdrop.addEventListener('click', (e)=>{
      if (e.target?.dataset?.closeAccounts === 'true') closeAccounts();
    });

    function renderAccountsAllSheet(){
      const list = computeAccountBalancesUpto(STATE.period.end);
      const wrap = $('#accountsAllList');
      wrap.innerHTML = '';
      if (!list.length) {
        wrap.innerHTML = '<div class="rounded-2xl app-card p-4 text-sm app-muted">Belum ada akun.</div>';
        return;
      }

      for (const it of list) {
        const card = document.createElement('button');
        card.className = 'tap w-full rounded-2xl app-card p-4 text-left hover:opacity-95';
        card.innerHTML = `
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="text-sm font-semibold truncate">${escapeHtml(it.account)}</div>
              <div class="text-xs app-muted">Saldo estimasi sampai ${escapeHtml(STATE.period.end)}</div>
            </div>
            <div class="text-right">
              <div class="text-sm font-semibold">${formatIDR(it.balance)}</div>
            </div>
          </div>
        `;
        card.onclick = () => {
          closeAccounts();
          openAccountDetail(it.account);
        };
        wrap.appendChild(card);
      }
    }

    // Account detail sheet
    const accountDetailBackdrop = $('#accountDetailBackdrop');
    const accountDetailSheet = $('#accountDetailSheet');
    function openAccountDetail(accountName){
      STATE.accountDetail.account = accountName;
      renderAccountDetail();
      openSheet(accountDetailBackdrop, accountDetailSheet);
    }
    function closeAccountDetail(){
      closeSheet(accountDetailBackdrop, accountDetailSheet);
      STATE.accountDetail.account = null;
    }
    accountDetailBackdrop.addEventListener('click', (e)=>{
      if (e.target?.dataset?.closeAccountDetail === 'true') closeAccountDetail();
    });

    function sumsForAccountInPeriod(accountName){
      const txs = getTransactionsInPeriod().filter(tx => {
        if (tx.type === 'transfer') {
          // income/expense for account: transfer_in counts as income-like, transfer_out counts as expense-like
          return tx.account === accountName || tx.meta?.transfer_to === accountName;
        }
        return tx.account === accountName;
      });

      let income = 0;
      let expense = 0;
      for (const tx of txs) {
        const amt = Number(tx.amount||0);
        if (tx.type === 'income') income += amt;
        else if (tx.type === 'expense') expense += amt;
        else if (tx.type === 'transfer') {
          if (tx.meta?.transfer_to === accountName) income += amt;
          if (tx.account === accountName) expense += amt;
        }
      }
      return { income, expense, net: income - expense, txs };
    }

    function renderAccountDetail(){
      const acc = STATE.accountDetail.account;
      if (!acc) return;

      $('#accDetailTitle').textContent = acc;
      $('#accDetailStatus').textContent = STATE.period.label;
      $('#accRenameInput').value = acc;

      const balances = computeAccountBalancesUpto(STATE.period.end);
      const bal = balances.find(b => b.account === acc)?.balance ?? 0;
      $('#accSaldo').textContent = formatIDR(bal);

      const sums = sumsForAccountInPeriod(acc);
      $('#accIncome').textContent = formatIDR(sums.income);
      $('#accExpense').textContent = formatIDR(sums.expense);
      $('#accNet').textContent = formatIDR(sums.net);
      $('#accNet').style.color = sums.net >= 0 ? 'rgba(167,243,208,.95)' : 'rgba(254,202,202,.95)';

      $('#accTxHint').textContent = `Periode: ${STATE.period.label}`;

      const listEl = $('#accTxList');
      listEl.innerHTML = '';
      const txs = sums.txs
        .slice()
        .sort((a,b) => (b.date.localeCompare(a.date)) || ((b.created_at||'').localeCompare(a.created_at||'')));

      $('#accTxEmpty').classList.toggle('hidden', txs.length !== 0);

      for (const tx of txs.slice(0, 30)) {
        const isInc = (tx.type==='income') || (tx.type==='transfer' && tx.meta?.transfer_to===acc);
        const isExp = (tx.type==='expense') || (tx.type==='transfer' && tx.account===acc);
        const sign = isInc ? '+' : isExp ? '−' : '';
        const color = isInc ? 'rgba(167,243,208,.95)' : isExp ? 'rgba(254,202,202,.95)' : 'var(--app-text)';
        const subtitle = [tx.merchant, tx.notes].filter(Boolean).join(' • ');

        const row = document.createElement('button');
        row.className = 'tap w-full text-left px-3 py-3 hover:opacity-95';
        row.style.background = 'transparent';
        row.innerHTML = `
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="text-sm font-semibold truncate">${escapeHtml(tx.category||'Lainnya')}</div>
              <div class="text-xs app-muted truncate">${escapeHtml(tx.date)} • ${escapeHtml(subtitle||'—')}</div>
            </div>
            <div class="text-right">
              <div class="text-sm font-semibold" style="color:${color}">${sign}${formatIDR(Number(tx.amount||0))}</div>
              <div class="text-xs app-muted2">${escapeHtml(tx.type)}</div>
            </div>
          </div>
        `;
        row.onclick = () => {
          closeAccountDetail();
          openEdit(tx.id);
        };
        listEl.appendChild(row);
      }
    }

    async function renameAccountEverywhere(oldName, newName){
      const o = String(oldName||'').trim();
      const n = String(newName||'').trim();
      if (!o || !n || o===n) return;

      // update settings list
      STATE.settings.accounts = STATE.settings.accounts.map(a => a===o ? n : a);
      STATE.settings.accounts = [...new Set(STATE.settings.accounts.map(s=>String(s).trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));

      // update local tx state and DB
      const toUpdate = STATE.transactions.filter(tx => tx.account===o || tx.meta?.transfer_to===o);
      for (const tx of toUpdate) {
        if (tx.account === o) tx.account = n;
        if (tx.meta?.transfer_to === o) tx.meta.transfer_to = n;
        tx.updated_at = new Date().toISOString();
        await upsertTransaction(tx);
      }

      await saveSettings();
      ensureSelectOptions();
      renderAccountsSettings();
    }

    $('#btnSaveAccRename').addEventListener('click', async () => {
      const oldName = STATE.accountDetail.account;
      const newName = ($('#accRenameInput').value || '').trim();
      if (!oldName) return;
      if (!newName) { $('#accDetailStatus').textContent = 'Nama akun tidak boleh kosong.'; return; }

      try {
        await renameAccountEverywhere(oldName, newName);
        STATE.accountDetail.account = newName;
        $('#accDetailStatus').textContent = 'Tersimpan.';
        renderAccountDetail();
        rerender();
      } catch {
        $('#accDetailStatus').textContent = 'Gagal menyimpan.';
      }
    });

    function openTransferFromAccount(fromAcc){
      openAddSheet('manual');
      $('#mType').value = 'transfer';
      syncManualTransferUI();
      $('#mAccount').value = fromAcc;
      $('#mPayment').value = 'Transfer';
      $('#mCategory').value = 'Transfer';
      $('#mMerchant').value = 'Transfer';
      setTimeout(()=>$('#mToAccount')?.focus(), 120);
    }

    function openAddMoneyToAccount(toAcc){
      // model: transfer dari akun lain ke akun ini
      openAddSheet('manual');
      $('#mType').value = 'transfer';
      syncManualTransferUI();
      $('#mToAccount').value = toAcc;
      $('#mPayment').value = 'Transfer';
      $('#mCategory').value = 'Transfer';
      $('#mMerchant').value = 'Transfer';
      setTimeout(()=>$('#mAccount')?.focus(), 120);
    }

    function openAddTxForAccount(acc){
      openAddSheet('manual');
      $('#mAccount').value = acc;
      $('#mPayment').value = acc;
      setTimeout(()=>$('#mAmount')?.focus(), 120);
    }

    $('#btnAccAddMoney').addEventListener('click', () => {
      const acc = STATE.accountDetail.account;
      if (!acc) return;
      closeAccountDetail();
      openAddMoneyToAccount(acc);
    });
    $('#btnAccMoveMoney').addEventListener('click', () => {
      const acc = STATE.accountDetail.account;
      if (!acc) return;
      closeAccountDetail();
      openTransferFromAccount(acc);
    });
    $('#btnAccAddTx').addEventListener('click', () => {
      const acc = STATE.accountDetail.account;
      if (!acc) return;
      closeAccountDetail();
      openAddTxForAccount(acc);
    });

    // User sheet
    const userBackdrop = $('#userBackdrop');
    const userSheet = $('#userSheet');
    function openUser(){ openSheet(userBackdrop, userSheet); }
    function closeUser(){ closeSheet(userBackdrop, userSheet); }
    userBackdrop.addEventListener('click', (e)=>{
      if (e.target?.dataset?.closeUser === 'true') closeUser();
    });

    // Edit modal
    const editBackdrop = $('#editBackdrop');
    const editCard = $('#editCard');
    function openEditModal(){
      editBackdrop.classList.add('open');
      editCard.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeEditModal(){
      editCard.classList.remove('open');
      editBackdrop.classList.remove('open');
      document.body.style.overflow = '';
      STATE.editId = null;
    }
    editBackdrop.addEventListener('click', (e)=>{
      if (e.target?.dataset?.closeEdit === 'true') closeEditModal();
    });

    // Tabs
    function setTab(tab){
      $$('.tabBtn').forEach(b => {
        const active = b.dataset.tab === tab;
        b.style.background = active ? 'rgba(99,102,241,.15)' : '';
        b.style.borderColor = active ? 'rgba(99,102,241,.25)' : '';
        b.style.color = active ? 'rgba(199,210,254,.95)' : '';
      });
      $$('.tabPanel').forEach(p => p.classList.toggle('hidden', p.dataset.tabPanel !== tab));

      if (tab === 'receipt') {
        requestAnimationFrame(()=>{
          if (!STATE.ui.receiptPickerOpened) {
            STATE.ui.receiptPickerOpened = true;
            $('#rFile')?.click();
          }
        });
      }
    }
    $$('.tabBtn').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

    // =========================
    // Actions
    // =========================
    async function upsertTransaction(tx) {
  console.log("Upserting transaction:", tx);

  // 1. Pastikan STATE.transactions adalah array
  if (!Array.isArray(STATE.transactions)) STATE.transactions = [];

  // 2. Update Memori Lokal (STATE)
  const index = STATE.transactions.findIndex(t => t.id === tx.id);
  if (index >= 0) {
    // Jika edit, timpa data lama
    STATE.transactions[index] = { ...tx };
  } else {
    // Jika baru, tambahkan ke paling depan (paling atas)
    STATE.transactions.unshift({ ...tx });
  }

  // 3. Sortir Ulang (Terbaru di atas berdasarkan tanggal)
  STATE.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 4. JALANKAN RERENDER ASLI (PENTING!)
  // Kita beri jeda 50ms agar browser sempat memproses data di memori
  setTimeout(() => {
    if (typeof rerender === 'function') {
      rerender();
      console.log("UI Rerendered successfully.");
    }
  }, 50);

  // 5. Simpan ke Database di Background
  if (STATE.db.enabled && STATE.db.user) {
    try {
      await dbUpsertTransaction(tx);
      // Update saldo dashboard secara async
      if (typeof updateSaldoAsync === 'function') updateSaldoAsync();
    } catch (e) {
      console.error("DB Save failed:", e);
    }
  }
}

   async function deleteTransaction(id) {
  if (!confirm('Hapus transaksi ini?')) return;

  // 1. UPDATE MEMORI LOKAL (Hapus dari list)
  STATE.transactions = STATE.transactions.filter(t => t.id !== id);

  // 2. PANGGIL RERENDER SEGERA
  if (typeof rerender === 'function') {
    rerender();
  }

  // 3. HAPUS DI DATABASE
  if (STATE.db.enabled && STATE.db.user) {
    try {
      await dbDeleteTransaction(id);
    } catch (e) {
      console.error("Gagal hapus di database", e);
    }
  }
}

    function getLastUsedAccount(){
      const sorted = [...STATE.transactions].sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||''));
      return sorted[0]?.account || STATE.settings.accounts[0] || 'Cash';
    }

    function paymentMethodOptions(){
      const base = ['Cash','QRIS','Debit','Kartu Kredit','Transfer','GoPay','OVO','DANA','ShopeePay'];
      const fromTx = [...new Set(STATE.transactions.map(t => t.payment_method).filter(Boolean))];
      return [...new Set([...base, ...fromTx])].filter(Boolean);
    }

    function setSelectOptions(selectEl, options, currentValue){
      selectEl.innerHTML = options.map(o => `<option value="${escapeHtmlAttr(o)}">${escapeHtml(o)}</option>`).join('');
      if (options.includes(currentValue)) selectEl.value = currentValue;
    }

    function collectBudgetCategoriesForPeriod(){
      const ms = monthsBetween(STATE.period.start, STATE.period.end);
      const set = new Set();
      for (const mk of ms) {
        const b = getBudgetMonth(mk);
        for (const k of Object.keys(b?.categories || {})) set.add(String(k));
      }
      // fallback to categories from transactions in range
      for (const tx of getTransactionsInPeriod()) if (tx.category) set.add(String(tx.category));
      const list = [...set].map(normalizeCategoryName).filter(Boolean);
      list.sort((a,b)=>a.localeCompare(b));
      return list.length ? list : ['Lainnya'];
    }

    function openEdit(id){
  const tx = STATE.transactions.find(t=>t.id===id);
  if (!tx) return;
  STATE.editId = id;
  
  $('#editTitle').textContent = `${tx.category || 'Transaksi'} • ${tx.date}`;
  $('#eDate').value = tx.date;
  $('#eType').value = tx.type;
  $('#eAmount').value = String(tx.amount||0);

  // KATEGORI LIVE (SINKRON 100% DENGAN BUDGET)
  const cats = getLiveBudgetCategories();
  // Jika kategori transaksi lama tidak ada di budget baru, tambahkan ke list agar tidak hilang
  if (tx.category && !cats.includes(tx.category)) {
      cats.push(tx.category);
  }
  setSelectOptions($('#eCategory'), cats, tx.category || 'Lainnya');

  // Akun & Payment
  const accounts = [...new Set([...STATE.settings.accounts, ...STATE.transactions.map(t=>t.account).filter(Boolean)])].sort();
  setSelectOptions($('#eAccount'), accounts, tx.account || accounts[0] || 'Cash');
  setSelectOptions($('#ePayment'), paymentMethodOptions(), tx.payment_method || tx.account || 'Cash');

  $('#eMerchant').value = tx.merchant||'';
  $('#eNotes').value = tx.notes||'';
  $('#editStatus').textContent = '—';
  openEditModal();
}


    // ============================================================
// FUNGSI INPUT MANUAL - 100% SINKRON DENGAN BUDGET
// ============================================================

function openManualInput() {
  // 1. Tentukan Bulan Aktif
  const mk = STATE.selectedMonth || toMonthKey(new Date());
  
  // 2. Ambil data budget TERBARU dari STATE
  const b = STATE.budgetsByMonth[mk] || getBudgetMonth(mk);
  
  // 3. Ambil Nama Kategori (Masuk ke dalam .categories.rows)
  let liveCats = [];
  if (b && b.categories && Array.isArray(b.categories.rows)) {
    // Mengambil nama dari tiap baris budget
    liveCats = b.categories.rows.map(r => r.name).filter(Boolean).sort();
  }

  // 4. Jika budget kosong, ambil history transaksi sebagai cadangan
  if (liveCats.length === 0) {
    liveCats = [...new Set(STATE.transactions.map(t => t.category))].filter(Boolean).sort();
  }
  
  // 5. Jika benar-benar tidak ada data, gunakan 'Lainnya'
  if (liveCats.length === 0) liveCats = ['Lainnya'];

  // 6. ISI DROPDOWN (PENTING: Ini yang membuat dropdown terupdate)
  setSelectOptions($('#mCategory'), liveCats, liveCats[0]);

  // 7. ISI AKUN & METODE (Sinkron dengan transaksi terakhir)
  const accounts = [...new Set([...STATE.settings.accounts, ...STATE.transactions.map(t=>t.account).filter(Boolean)])].sort();
  const lastAcc = getLastUsedAccount();
  setSelectOptions($('#mAccount'), accounts, lastAcc || 'Cash');
  setSelectOptions($('#mPayment'), paymentMethodOptions(), lastAcc || 'Cash');

  // 8. RESET FIELD LAINNYA
  $('#mDate').value = toISODate(new Date());
  $('#mType').value = 'expense';
  $('#mAmount').value = '';
  $('#mMerchant').value = '';
  $('#mNotes').value = '';
  $('#manualStatus').textContent = '-';

  // 9. PINDAH TAB SECARA VISUAL
  document.querySelectorAll('.tabPanel').forEach(p => p.classList.add('hidden'));
  const manualPanel = document.querySelector('[data-tab-panel="manual"]');
  if (manualPanel) manualPanel.classList.remove('hidden');
  
  console.log("Form Manual dibuka dengan kategori:", liveCats);
}

// HUBUNGKAN KE TOMBOL
const btnGoManual = document.getElementById('btnQuickGoManual');
if (btnGoManual) {
    btnGoManual.onclick = () => {
        openManualInput(); // Memanggil fungsi yang sudah diperbaiki di atas
    };
}

// Helper untuk pindah tab ke manual
function showManualTab() {
  document.querySelectorAll('.tabPanel').forEach(p => p.classList.add('hidden'));
  const manualPanel = document.querySelector('[data-tab-panel="manual"]');
  if (manualPanel) manualPanel.classList.remove('hidden');
}





function getActiveBudgetCats() {
  const mk = STATE.selectedMonth || toMonthKey(new Date());
  const b = STATE.budgetsByMonth[mk] || getBudgetMonth(mk);
  
  if (b && b.categories && Array.isArray(b.categories.rows)) {
    return b.categories.rows.map(r => r.name).filter(Boolean).sort();
  }
  
  // Fallback jika budget kosong
  const fromTx = [...new Set(STATE.transactions.slice(0, 50).map(t => t.category))].filter(Boolean);
  return fromTx.length ? fromTx.sort() : ['Lainnya'];
}
// --- HELPER DATABASE ---

// 1. Fungsi Hapus ke Supabase
async function dbDeleteTransaction(id) {
  // ... (kode logic database Anda) ...
  const { error } = await STATE.db.supa.from('transactions').delete().eq('id', id);

  if (!error) {
    // Hapus dari memori lokal
    STATE.transactions = STATE.transactions.filter(t => t.id !== id);

    // OTOMATIS REFRESH
    refreshAllUI();
  }
}

// 2. Fungsi Update/Simpan ke Supabase - versi duplikat (di-rename untuk menghindari deklarasi ganda)
async function upsertTransaction_dbOnly(tx) {
  const payload = {
    id: tx.id,
    user_id: STATE.db.user.id,
    date: tx.date,
    type: tx.type,
    amount: tx.amount,
    category: tx.category,
    account: tx.account,
    payment_method: tx.payment_method || 'Cash', 
    merchant: tx.merchant,
    notes: tx.notes,
    updated_at: new Date().toISOString()
  };
  
  const { error } = await STATE.db.supa
    .from('transactions')
    .upsert(payload);
  if (error) throw error;
}
    // =========================
    // Budget sheet logic
    // =========================
    function budgetDraftTotals(){
      const d = STATE.budgetDraft;
      if (!d) return { income:0, total:0, remaining:0 };
      const income = Number(d.income||0);
      const total = (d.rows||[]).reduce((a,r)=>a+Math.max(0, Number(r.amount||0)),0);
      const remaining = income - total;
      return { income, total, remaining };
    }

    function renderBudgetRows(){
  const d = STATE.budgetDraft;
  const wrap = $('#bRows');
  wrap.innerHTML = '';
  
  if (!d || !d.rows || !d.rows.length) {
    if(wrap) wrap.innerHTML = '<div class="text-sm app-muted text-center py-4">Belum ada kategori.</div>';
    return;
  }

  const txs = getTransactionsInPeriod();

  for (const row of d.rows) {
    const catName = row.name || 'Lainnya';
    // Hitung Pengeluaran (Actual)
    const actual = txs.filter(t => t.type==='expense' && normalizeCategoryName(t.category) === normalizeCategoryName(catName))
                      .reduce((a,b)=>a+Number(b.amount||0), 0);
    
    const planned = Number(row.amount||0);
    const sisa = planned - actual;
    
    // Hitung Persen
    let pctRaw = planned > 0 ? (actual / planned) * 100 : 0;
    // Clamp visual 0-100%
    let pctVisual = Math.min(Math.max(pctRaw, 0), 100);

    // --- LOGIKA WARNA SOLID (Requirement No. 3) ---
    // Hijau (Aman), Kuning (Hampir Habis > 75%), Merah (Over >= 100%)
    let barColor = '#10b981'; // Emerald-500
    let dotColor = '#10b981';
    
    if (pctRaw >= 100) {
        barColor = '#f43f5e'; // Rose-500
        dotColor = '#f43f5e';
    } else if (pctRaw >= 75) {
        barColor = '#f59e0b'; // Amber-500
        dotColor = '#f59e0b';
    }

    const el = document.createElement('div');
    el.className = 'rounded-2xl app-chip p-4 cursor-pointer hover:bg-white/5 mb-3 transition-colors relative group';
    
    // Klik row untuk edit detail
    el.onclick = (e) => {
      if (e.target.closest('.bCatDel')) return;
      openBudgetCategoryDetail(row.id);
    };

    el.innerHTML = `
      <div class="relative pt-1 pb-4"> <!-- Padding bottom ditambah untuk label gantung -->
        
        <!-- HEADER: Sisa (Kiri) & Budget (Kanan) -->
        <div class="flex justify-between items-end mb-2 text-xs">
           <div class="font-medium ${sisa < 0 ? 'text-rose-400' : 'text-emerald-400'}">
             Sisa: ${formatCompactIDR(Math.max(0, sisa))} 
             ${sisa < 0 ? `<span class="text-rose-500 font-bold ml-1">(Over)</span>` : ''}
           </div>
           <div class="text-slate-400">
             Budget: <span class="text-white font-semibold">${formatCompactIDR(planned)}</span>
           </div>
        </div>

        <!-- TITLE KATEGORI (Absolute Center atau terserah, disini saya taruh di atas bar) -->
        <div class="absolute top-[-4px] left-0 w-full text-center pointer-events-none opacity-20 text-[10px] font-bold uppercase tracking-widest">
            ${escapeHtml(catName)}
        </div>

        <!-- PROGRESS BAR TRACK -->
        <div class="relative w-full h-2 bg-gray-700 rounded-full mt-1">
            
            <!-- FILL BAR (Solid Color) -->
            <div class="absolute top-0 left-0 h-2 rounded-full transition-all duration-500"
                 style="width: ${pctVisual}%; background-color: ${barColor};">
            </div>

            <!-- DOT & FLOATING LABEL (Requirement No. 2) -->
            <div class="absolute top-1/2 -translate-y-1/2" style="left: ${pctVisual}%; transition: left 0.5s ease-out;">
                
                <!-- Titik Putih -->
                <div class="w-4 h-4 bg-white rounded-full border-2 shadow-lg -translate-x-1/2" 
                     style="border-color: ${dotColor}"></div>
                
                <!-- Label Realisasi Menggantung Di Bawah -->
                <div class="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap flex flex-col items-center">
                    <div class="w-0.5 h-2 bg-slate-600 mb-0.5"></div> <!-- Garis penunjuk kecil -->
                    <div class="bg-slate-800 text-[10px] text-white px-2 py-0.5 rounded border border-slate-600 shadow-xl font-mono">
                        ${formatCompactIDR(actual)}
                    </div>
                </div>

            </div>
        </div>

      </div>
      
      <!-- Tombol Hapus (Pocok Kanan Atas absolute) -->
      <button class="bCatDel absolute top-1 right-1 text-slate-600 hover:text-rose-500 p-2 text-lg leading-none" data-id="${row.id}">×</button>
    `;
    wrap.appendChild(el);
  }

  // Event Listener Hapus (sama seperti sebelumnya)
  $$('.bCatDel', wrap).forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (confirm('Hapus kategori ini?')) {
        STATE.budgetDraft.rows = STATE.budgetDraft.rows.filter(x=>x.id!==id);
        renderBudgetRows();
      }
    };
  });
}

    function updateBudgetSheetDerived(){
      const d = STATE.budgetDraft;
      if (!d) return;
      const totals = budgetDraftTotals();

      $('#bTotalBudget').textContent = formatIDR(totals.total);
      const rem = totals.remaining;
      const remText = `Sisa: ${formatIDR(Math.max(0, rem))}` + (rem<0 ? ` (over ${formatIDR(Math.abs(rem))})` : '');
      $('#bRemaining').textContent = remText;
      $('#bRemaining').style.color = rem>=0 ? 'rgba(167,243,208,.95)' : 'rgba(254,202,202,.95)';

      for (const row of (d.rows||[])) {
        const cur = Number(row.amount||0);
        const tot = budgetDraftTotals();
        const max = Math.max(0, tot.remaining + cur);
        const hint = $(`[data-row-hint="${row.id}"]`);
        if (hint) hint.textContent = `Maks kategori ini: ${formatIDR(max)} (supaya total <= income)`;
      }

      if (totals.income <= 0) {
        $('#bFooterHint').textContent = 'Isi income dulu agar total budget bisa dibatasi.';
      } else {
        $('#bFooterHint').textContent = (rem>=0)
          ? `OK. Kamu masih punya sisa income ${formatIDR(rem)} yang belum dialokasikan.`
          : `Total budget melebihi income. Kurangi budget kategori (otomatis di-clamp).`;
      }
    }
// --- LOGIC AI ENGINE (SMART + FALLBACK) ---
// Taruh fungsi ini di file JS Anda (bisa ditaruh paling bawah)

function generateSmartBudgetRows(income) {
  const txs = STATE.transactions || [];
  
  // 1. Filter Data (3 Bulan Terakhir)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(new Date().getMonth() - 3);
  const history = txs.filter(t => t.type === 'expense' && new Date(t.date) >= threeMonthsAgo);

  let rows = [];
  let source = '';

  // === SKENARIO A: USER LAMA (Data Mining) ===
  if (history.length >= 5) { 
    source = 'Data Historis 3 Bulan';
    const analysis = {};
    
    // Grouping Data
    history.forEach(t => {
       const cat = normalizeCategoryName(t.category) || 'Lainnya';
       const note = (t.notes || 'Umum').trim(); 
       if(!analysis[cat]) analysis[cat] = { items: {} };
       if(!analysis[cat].items[note]) analysis[cat].items[note] = { count:0, sum:0 };
       
       analysis[cat].items[note].count++;
       analysis[cat].items[note].sum += Number(t.amount);
    });

    const divisor = 3; 

    for(const [cat, data] of Object.entries(analysis)) {
       // A. Susun Item Mentah
       let myItems = Object.entries(data.items)
           .map(([name, stat]) => ({
               name: name,
               price: Math.round(stat.sum / stat.count), // Harga rata-rata asli
               qty: Math.max(1, Math.round(stat.count / divisor)) // Frekuensi
           }))
           .sort((a,b) => (b.qty*b.price) - (a.qty*a.price))
           .slice(0, 5); // Ambil Top 5

       // B. Tambah Buffer 10% (Sebagai item terpisah agar transparan)
       const rawTotal = myItems.reduce((a,b) => a + (b.qty * b.price), 0);
       const buffer = Math.round(rawTotal * 0.10);
       if (buffer > 0) {
           myItems.push({ name: 'Dana Cadangan', qty: 1, price: buffer });
       }

       // C. Masukkan ke Rows (Amount dihitung nanti di langkah Final Scaling)
       rows.push({ id: uuid(), name: cat, amount: 0, items: myItems });
    }
  } 
  // === SKENARIO B: USER BARU ===
  else {
    source = 'Template Umum (50/30/20)';
    const needs = income * 0.5;
    const wants = income * 0.3;
    const save  = income * 0.2;

    rows = [
       { id: uuid(), name: 'Makan & Minum', amount: 0, items: [{name:'Makan Harian', qty:30, price: Math.floor((needs*0.4)/30)}] },
       { id: uuid(), name: 'Transportasi', amount: 0, items: [{name:'Bensin/Ojol', qty:1, price: Math.floor(needs*0.2)}] },
       { id: uuid(), name: 'Tagihan & Rumah', amount: 0, items: [{name:'Listrik/Air', qty:1, price: Math.floor(needs*0.4)}] },
       { id: uuid(), name: 'Belanja', amount: 0, items: [{name:'Kebutuhan', qty:1, price: Math.floor(wants)}] },
       { id: uuid(), name: 'Tabungan', amount: 0, items: [{name:'Target', qty:1, price: Math.floor(save)}] }
    ];
  }

  // ============================================================
  // FINAL SCALING LOGIC (SINKRONISASI TOTAL & ITEM)
  // ============================================================
  
  // 1. Hitung Total Kebutuhan Mentah (Sum semua item dari semua kategori)
  let grandTotalRaw = 0;
  rows.forEach(r => {
      const sub = r.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
      grandTotalRaw += sub;
  });

  // 2. Cek apakah melebihi Income?
  let ratio = 1.0;
  if (grandTotalRaw > income) {
      // Hitung rasio diskon (sisakan 2% space)
      ratio = (income * 0.98) / grandTotalRaw;
  }

  // 3. Terapkan Rasio ke SETIAP ITEM, lalu Hitung Total Kategori
  rows.forEach(row => {
      // A. Diskon Harga Item (Detail)
      row.items.forEach(item => {
          // Harga baru = Harga Lama * Rasio
          item.price = Math.floor(item.price * ratio);
      });

      // B. Hitung Total Kategori BERDASARKAN item yang sudah didiskon
      // Ini menjamin: Total Header == Penjumlahan Detail Item
      row.amount = row.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
  });

  // 4. Hapus kategori yang totalnya 0 (agar list bersih)
  rows = rows.filter(r => r.amount > 0);

  // 5. Urutkan dari terbesar
  rows.sort((a,b) => b.amount - a.amount);

  return { rows, source };
}
    function renderBudgetRecoPills(){
      const d = STATE.budgetDraft;
      const wrap = $('#bRecoList');
      wrap.innerHTML = '';
      if (!d?.ai) return;
      const cats = d.ai.categories || {};
      const entries = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,10);
      if (!entries.length) {
        wrap.innerHTML = '<span class="text-xs app-muted">Belum cukup data untuk rekomendasi.</span>';
        return;
      }
      for (const [cat, amt] of entries) {
        const pill = document.createElement('div');
        pill.className = 'rounded-full app-chip px-3 py-1 text-xs';
        pill.textContent = `${cat}: ${formatCompactIDR(amt)}`;
        wrap.appendChild(pill);
      }
    }

    function renderBudgetSheet(){
      const d = STATE.budgetDraft;
      if (!d) return;
      $('#bMonthLabel').textContent = monthLabel(d.month);
      $('#bIncome').value = d.income ? String(d.income) : '';
      $('#bStatus').textContent = d.initialFrom === 'saved' ? 'Budget tersimpan.' : 'Draft rekomendasi.';

      renderBudgetRecoPills();
      renderBudgetRows();
      updateBudgetSheetDerived();
    }

    // --- LOGIC DETAIL BUDGET BARU (POPUP TENGAH & SAVE DB) ---

// --- KODE BARU: AUTO-CREATE POPUP HTML & OPEN ---

function openBudgetCategoryDetail(rowId) {
  // 1. Cek dulu, apakah HTML Popup sudah ada? Jika belum, kita buat sekarang!
  if (!document.getElementById('budgetDetailBackdrop')) {
    const modalHTML = `
      <div id="budgetDetailBackdrop" class="fixed inset-0 z-[100]" style="display: none; background: rgba(0,0,0,0.8);">
        <div class="fixed inset-0 flex items-center justify-center p-4 z-[110]">
          <!-- Klik luar untuk tutup -->
          <div class="absolute inset-0" onclick="closeBudgetDetail()"></div>

          <!-- Kotak Modal -->
          <div id="budgetDetailSheet" class="relative w-full max-w-sm bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden z-[120]">
            
            <!-- Header -->
            <div class="px-4 py-3 border-b border-slate-700 bg-slate-800 flex justify-between items-center">
              <div class="flex-1 mr-2" id="bdCatName"></div>
              <button onclick="closeBudgetDetail()" class="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>

            <!-- Body List -->
            <div class="p-4 max-h-[50vh] overflow-y-auto bg-slate-900">
              <div class="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider mb-2 px-1">
                <span>Item</span>
                <span class="mr-8">Harga</span>
              </div>
              <div id="bdRows" class="space-y-3"></div>
              
              <button id="btnAddDetailItem" class="mt-4 w-full py-3 border border-dashed border-slate-600 rounded-xl text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition">
                + Tambah Item Belanja
              </button>
            </div>

            <!-- Footer Button -->
            <div class="p-4 border-t border-slate-700 bg-slate-800">
              <button id="btnSaveDetailDB" class="w-full py-3 rounded-xl font-bold text-sm text-white shadow-lg transition hover:brightness-110" style="background: #10b981;">
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    // Suntikkan HTML ke bagian paling bawah body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  // 2. Lanjut logika normal (Cari Data)
  const row = STATE.budgetDraft.rows.find(r => r.id === rowId);
  if (!row) return; // Jika data tidak ketemu, stop

  STATE.budgetDraft.activeRowId = rowId;
  if (!row.items) row.items = [];
  
  // 3. Render Isi Popup (Sekarang HTML-nya pasti sudah ada)
  renderBudgetDetailItems();
  
  // 4. Tampilkan Modal
  const backdrop = document.getElementById('budgetDetailBackdrop');
  if (backdrop) {
      backdrop.classList.remove('hidden'); 
      backdrop.style.display = 'block'; 
  }
}

// Pastikan fungsi tutup ini juga ada/terupdate
function closeBudgetDetail() {
  const backdrop = document.getElementById('budgetDetailBackdrop');
  if (backdrop) {
      backdrop.style.display = 'none';
  }
}

// 2. Render List Item & Logic Tombol Save
function renderBudgetDetailItems() {
  const rowId = STATE.budgetDraft.activeRowId;
  const row = STATE.budgetDraft.rows.find(r => r.id === rowId);
  if (!row) return;

  // A. Header: Edit Nama Kategori
  // Kita inject input field ke header popup
  const headerTitle = $('#bdCatName');
  if (headerTitle) {
    headerTitle.innerHTML = `
      <input id="inputCatNameDetail" 
             class="bg-transparent border-b border-slate-600 focus:border-emerald-500 outline-none w-full text-white text-sm font-semibold placeholder-slate-500" 
             value="${escapeHtmlAttr(row.name || '')}" 
             placeholder="Nama Kategori (mis: Belanja)" />
    `;
    // Update nama di memory saat diketik (belum save DB)
    $('#inputCatNameDetail').oninput = (e) => {
      row.name = e.target.value;
    };
  }

  // B. Body: Render Baris Item (Nama | Qty | Harga)
  const wrap = $('#bdRows');
  if (wrap) {
    wrap.innerHTML = ''; // Bersihkan lama
    
    row.items.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'grid grid-cols-12 gap-2 mb-3 items-end';
      
      // Hitung subtotal untuk display (opsional)
      const subtotal = (item.qty || 1) * (item.price || 0);
      
      el.innerHTML = `
        <!-- Input Nama Item -->
        <div class="col-span-5">
            <label class="text-[9px] text-slate-500 ml-1">Item</label>
            <input class="bdItemName w-full bg-slate-800 rounded-lg px-2 py-1.5 text-xs text-white border border-slate-700 focus:border-emerald-500 outline-none" 
                   value="${escapeHtmlAttr(item.name)}" placeholder="Nama" data-idx="${idx}" />
        </div>
        
        <!-- Input Qty -->
        <div class="col-span-2">
            <label class="text-[9px] text-slate-500 ml-1">Qty</label>
            <input class="bdItemQty w-full bg-slate-800 rounded-lg px-1 py-1.5 text-xs text-center text-white border border-slate-700 focus:border-emerald-500 outline-none" 
                   type="number" value="${item.qty||1}" data-idx="${idx}" />
        </div>
        
        <!-- Input Harga -->
        <div class="col-span-4">
            <label class="text-[9px] text-slate-500 ml-1">Harga Satuan</label>
            <input class="bdItemPrice w-full bg-slate-800 rounded-lg px-2 py-1.5 text-xs text-right text-white border border-slate-700 focus:border-emerald-500 outline-none" 
                   type="number" value="${item.price||0}" data-idx="${idx}" />
        </div>
        
        <!-- Tombol Hapus -->
        <div class="col-span-1 flex justify-center pb-1">
            <button class="bdItemDel text-rose-500 hover:bg-rose-500/10 rounded p-1" data-idx="${idx}">×</button>
        </div>
      `;
      wrap.appendChild(el);
    });

    // C. Event Listeners untuk Input (Update Memory Only)
    $$('.bdItemName', wrap).forEach(inp => {
        inp.oninput = () => { 
            row.items[inp.dataset.idx].name = inp.value; 
        };
    });
    $$('.bdItemQty', wrap).forEach(inp => {
        inp.oninput = () => { 
            row.items[inp.dataset.idx].qty = Number(inp.value); 
        };
    });
    $$('.bdItemPrice', wrap).forEach(inp => {
        inp.oninput = () => { 
            row.items[inp.dataset.idx].price = Number(inp.value); 
        };
    });
    $$('.bdItemDel', wrap).forEach(btn => {
        btn.onclick = () => {
            row.items.splice(btn.dataset.idx, 1);
            renderBudgetDetailItems(); // Re-render list
        };
    });
  }

  // D. Tombol Tambah Item (+ Item Belanja)
  const btnAdd = $('#btnAddDetailItem');
  if (btnAdd) {
      // Hapus event lama agar tidak double
      btnAdd.replaceWith(btnAdd.cloneNode(true));
      $('#btnAddDetailItem').onclick = () => {
          row.items.push({ name: '', qty: 1, price: 0 });
          renderBudgetDetailItems();
      };
  }

  // E. TOMBOL SIMPAN KE DATABASE (Action Utama)
  const btnSave = $('#btnSaveDetailDB');
  if (btnSave) {
      // Hapus event lama
      btnSave.replaceWith(btnSave.cloneNode(true));
      
      $('#btnSaveDetailDB').onclick = async function() {
          const thisBtn = this;
          
          // 1. Hitung Total Ulang
          // (Qty * Price) untuk semua item
          const newTotal = row.items.reduce((sum, item) => sum + ((item.qty||1) * (item.price||0)), 0);
          row.amount = newTotal; // Update nominal kategori utama

          // 2. UI Feedback Loading
          const originalText = thisBtn.innerText;
          thisBtn.innerText = 'Menyimpan...';
          thisBtn.disabled = true;
          thisBtn.style.opacity = '0.7';

          try {
              // 3. Persiapan Data untuk Supabase
              const d = STATE.budgetDraft;
              
              // Struktur data yang akan dikirim
              // Kita mengirim SELURUH data budget bulan ini, karena Supabase update by row
              // Pastikan fungsi 'validateAndNormalizeBudgetDraft' ada atau kita buat manual
              const cleanRows = d.rows.map(r => ({
                  id: r.id,
                  name: r.name,
                  amount: r.amount, // Total yang baru dihitung
                  items: r.items    // Detail items
              }));

              const finalCategories = { rows: cleanRows };

              // 4. Panggil Fungsi Save Supabase (Existing Function)
              await saveBudgetMonth(d.month, d.income, finalCategories);

              // 5. Sukses
              // Update Tampilan Utama di belakang
              renderBudgetRows(); 
              updateBudgetSheetDerived(); // Update sisa/total di header

              // Tutup Popup
              closeBudgetDetail();
              
              // Opsional: Toast notifikasi
              // alert("Berhasil disimpan!"); 

          } catch (e) {
              console.error("Gagal simpan:", e);
              alert("Gagal menyimpan ke database. Cek koneksi.");
          } finally {
              // Reset Tombol
              thisBtn.innerText = originalText;
              thisBtn.disabled = false;
              thisBtn.style.opacity = '1';
          }
      };
  }
}

// 3. Fungsi Tutup Popup
function closeBudgetDetail() {
  const backdrop = $('#budgetDetailBackdrop');
  if (backdrop) {
      backdrop.style.display = 'none';
      backdrop.classList.add('hidden');
  }
}

    $('#bIncome').addEventListener('input', () => {
      if (!STATE.budgetDraft) return;
      STATE.budgetDraft.income = parseNumberInput($('#bIncome').value);
      updateBudgetSheetDerived();
    });

    $('#btnAddBudgetCategory').addEventListener('click', () => {
      if (!STATE.budgetDraft) return;
      const newId = uuid();
      STATE.budgetDraft.rows.push({ id: newId, name: '', amount: 0, items: [] });
      renderBudgetRows();
      updateBudgetSheetDerived();
      // Langsung buka popup detail untuk kategori baru
      openBudgetCategoryDetail(newId);
    });

function getLiveBudgetCategories() {
  // Ambil bulan yang sedang aktif di aplikasi
  const mk = STATE.selectedMonth || toMonthKey(new Date());
  const b = STATE.budgetsByMonth[mk] || getBudgetMonth(mk);
  
  if (b && b.categories && Array.isArray(b.categories.rows)) {
    // Mengambil nama dari tiap baris budget, buang yang kosong
    const names = b.categories.rows.map(r => r.name).filter(Boolean);
    if (names.length > 0) return names.sort();
  }
  
  // Jika budget benar-benar kosong, ambil dari transaksi bulan ini sebagai cadangan
  const fallback = [...new Set(getTransactionsInPeriod().map(t => t.category))].filter(Boolean);
  return fallback.length ? fallback.sort() : ['Lainnya'];
}

    // ============================================================
// 1. LOGIC TOMBOL "GUNAKAN REKOMENDASI" (AI BARU)
// ============================================================
// --- 1. Helper Toggle Accordion (Wajib Global) ---
window.toggleAIPreviewDetail = function(idx) {
    const el = document.getElementById(`aiPreviewDetail-${idx}`);
    const arrow = document.getElementById(`aiArrow-${idx}`);
    if(el) {
        if(el.classList.contains('hidden')) {
            el.classList.remove('hidden');
            if(arrow) arrow.style.transform = 'rotate(180deg)';
        } else {
            el.classList.add('hidden');
            if(arrow) arrow.style.transform = 'rotate(0deg)';
        }
    }
};

// --- 2. Event Listener Utama ---
const btnApplyAI = document.getElementById('btnApplyAIBudget');

if (btnApplyAI) {
    // Gunakan onclick properti untuk memastikan tidak ada event ganda
    btnApplyAI.onclick = function() {
        console.log("Tombol Rekomendasi Diklik...");

        // A. CEK & BUAT HTML POPUP (JIKA BELUM ADA)
        if (!document.getElementById('aiRecoBackdrop')) {
            console.log("Membuat HTML Popup...");
            const popupHTML = `
            <div id="aiRecoBackdrop" class="fixed inset-0 z-[150]" style="display: none; background: rgba(0,0,0,0.85);">
                <div class="fixed inset-0 flex items-center justify-center p-4">
                    <div class="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
                        <!-- Header -->
                        <div class="px-5 py-4 border-b border-slate-800 bg-slate-900">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">✨</div>
                                <div>
                                    <h3 class="font-bold text-white text-lg">Analisa Budget AI</h3>
                                    <p id="aiRecoSubtitle" class="text-xs text-slate-400">Preview Detail Budget</p>
                                </div>
                            </div>
                        </div>

                        <!-- Body List -->
                        <div class="p-4 overflow-y-auto flex-1 bg-slate-900/50">
                            <div id="aiRecoPreviewList" class="space-y-2"></div>
                            
                            <!-- Summary Footer -->
                            <div class="mt-4 pt-4 border-t border-dashed border-slate-700 flex justify-between items-center">
                                <div class="text-xs text-slate-400">Total Rekomendasi</div>
                                <div id="aiRecoTotal" class="text-sm font-bold text-emerald-400">Rp 0</div>
                            </div>
                            <div class="flex justify-between items-center mt-1">
                                <div class="text-xs text-slate-400">Sisa dari Income</div>
                                <div id="aiRecoSisa" class="text-xs text-slate-500">Rp 0</div>
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="p-4 border-t border-slate-800 bg-slate-900 grid grid-cols-2 gap-3">
                            <button id="btnCloseAI" class="py-3 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-800 transition">Batal</button>
                            <button id="btnConfirmAI" class="py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition">Setuju & Terapkan</button>
                        </div>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', popupHTML);
            
            // Pasang event listener tombol Batal segera setelah HTML dibuat
            document.getElementById('btnCloseAI').onclick = () => {
                document.getElementById('aiRecoBackdrop').style.display = 'none';
            };
        }

        // B. LOGIKA GENERATE DATA
        const incInput = document.getElementById('bIncome');
        const income = parseNumberInput(incInput ? incInput.value : '0');

        if (!income || income <= 0) {
            alert("⚠️ Mohon isi Income (Pemasukan) bulan ini dulu.");
            if(incInput) setTimeout(() => incInput.focus(), 100);
            return;
        }

        // Pastikan fungsi logic AI ada
        if (typeof generateSmartBudgetRows !== 'function') {
            alert("Error: Fungsi generateSmartBudgetRows tidak ditemukan (Cek Langkah sebelumnya).");
            return;
        }

        const result = generateSmartBudgetRows(income);
        
        // Simpan data di global variable agar bisa diambil tombol confirm
        window.tempAIRrows = result.rows;

        // C. RENDER LIST ACCORDION
        const list = document.getElementById('aiRecoPreviewList');
        const subTitle = document.getElementById('aiRecoSubtitle');
        
        if (list) {
            list.innerHTML = '';
            if(subTitle) subTitle.innerText = `Sumber: ${result.source}`;

            result.rows.forEach((r, idx) => {
                // 1. Buat HTML untuk detail items
                const detailsHTML = r.items.map(i => `
                    <div class="flex justify-between items-center py-1.5 border-b border-slate-700/30 last:border-0">
                        <div class="text-[11px] text-slate-400 pl-4 flex-1">
                           ${i.qty}x ${escapeHtml(i.name)}
                        </div>
                        <div class="text-[11px] text-slate-300 font-mono">
                           ${formatCompactIDR(i.qty * i.price)}
                        </div>
                    </div>
                `).join('');

                // 2. Buat Elemen Utama
                const el = document.createElement('div');
                el.className = 'bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden transition-all';
                el.innerHTML = `
                    <!-- Header Baris (Klik untuk Expand) -->
                    <div class="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-700/50" onclick="toggleAIPreviewDetail(${idx})">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                ${(r.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div class="text-xs font-bold text-white">${escapeHtml(r.name)}</div>
                                <div class="text-[10px] text-indigo-400 flex items-center gap-1 mt-0.5">
                                   <span>${r.items.length} Detail Item</span>
                                   <svg id="aiArrow-${idx}" class="w-3 h-3 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                        <div class="text-xs font-mono font-semibold text-emerald-400">
                            ${formatCompactIDR(r.amount)}
                        </div>
                    </div>
                    
                    <!-- Area Detail (Hidden by default) -->
                    <div id="aiPreviewDetail-${idx}" class="hidden bg-slate-900/40 px-3 pb-2 pt-1 border-t border-slate-700/50">
                        ${detailsHTML}
                    </div>
                `;
                list.appendChild(el);
            });

            // Update Total
            const total = result.rows.reduce((a, b) => a + b.amount, 0);
            const sisa = income - total;
            document.getElementById('aiRecoTotal').innerText = formatIDR(total);
            const txtSisa = document.getElementById('aiRecoSisa');
            txtSisa.innerText = formatIDR(sisa);
            txtSisa.className = sisa >= 0 ? "text-xs text-emerald-400" : "text-xs text-rose-400 font-bold";
        }

        // D. TAMPILKAN POPUP
        const popup = document.getElementById('aiRecoBackdrop');
        if(popup) {
            popup.style.display = 'block';
            console.log("Popup ditampilkan.");
        }

        // E. TOMBOL SETUJU & TERAPKAN
        const btnConfirm = document.getElementById('btnConfirmAI');
        if(btnConfirm) {
            // Override onclick (replace event lama)
            btnConfirm.onclick = function() {
                if (window.tempAIRrows && STATE.budgetDraft) {
                    console.log("Menerapkan Budget AI...");
                    
                    // 1. REPLACE DATA DRAFT
                    STATE.budgetDraft.rows = window.tempAIRrows;
                    STATE.budgetDraft.income = income;
                    STATE.budgetDraft.initialFrom = 'ai';

                    // 2. UPDATE UI BELAKANG
                    if(typeof renderBudgetRows === 'function') renderBudgetRows();
                    if(typeof updateBudgetSheetDerived === 'function') updateBudgetSheetDerived();

                    // 3. Feedback
                    const stat = document.getElementById('bStatus');
                    if(stat) stat.innerHTML = '<span class="text-indigo-400">✨ Budget AI Diterapkan.</span>';
                }
                
                // Tutup Popup
                if(popup) popup.style.display = 'none';
            };
        }
        
        // Pastikan tombol batal juga jalan (safety double check)
        const btnClose = document.getElementById('btnCloseAI');
        if(btnClose) btnClose.onclick = () => { if(popup) popup.style.display = 'none'; };
    };
}

// --- LOGIC TOGGLE PANEL PERIODE ---

// 1. Tombol Buka (Jan 2026 ▾)
const btnPeriodToggle = document.getElementById('btnPeriodToggle');
if (btnPeriodToggle) {
  btnPeriodToggle.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Mencegah konflik klik dengan elemen induk
    
    const popover = document.getElementById('monthPopover');
    const filters = document.getElementById('filtersWrap');
    
    // Toggle (Buka/Tutup)
    const isHidden = popover.classList.contains('hidden');
    if (isHidden) {
      popover.classList.remove('hidden');
      filters.classList.remove('hidden');
      console.log("Panel Periode Dibuka");
    } else {
      popover.classList.add('hidden');
      filters.classList.add('hidden');
    }
  };
}

// 2. Tombol Tutup di dalam panel
const btnMonthClose = document.getElementById('btnMonthClose');
if (btnMonthClose) {
  btnMonthClose.onclick = () => {
    document.getElementById('monthPopover').classList.add('hidden');
    document.getElementById('filtersWrap').classList.add('hidden');
  };
}
// ============================================================
// 2. TOMBOL RESET (JANGAN DIHAPUS)
// ============================================================
$('#btnResetBudgetDraft').addEventListener('click', () => {
    if (!STATE.budgetDraft) return;
    closeBudget(); // Tutup sheet
    openBudget();  // Buka ulang (reset)
});

// ============================================================
// 3. TOMBOL SIMPAN / SAVE (JANGAN DIHAPUS)
// ============================================================
$('#btnSaveBudget').addEventListener('click', async () => {
    const d = STATE.budgetDraft;
    if (!d) return;

    // Validasi
    // Asumsi fungsi validateAndNormalizeBudgetDraft ada di file Anda
    // Jika tidak ada, bisa pakai validasi manual sederhana
    let normalized = { income: d.income, categories: {}, total: 0 };
    
    // Validasi Manual (Safe Mode)
    if (!d.income) { $('#bStatus').textContent = 'Income wajib diisi.'; return; }
    if (!d.rows || d.rows.length === 0) { $('#bStatus').textContent = 'Tambah minimal 1 kategori.'; return; }
    
    // Susun data untuk DB
    const cleanRows = d.rows.map(r => ({
        id: r.id, name: r.name, amount: r.amount, items: r.items || []
    }));
    normalized.categories = { rows: cleanRows };
    const total = cleanRows.reduce((a,b)=>a+Number(b.amount), 0);
    
    if (total > d.income) { $('#bStatus').textContent = 'Total budget melebihi income.'; return; }

    try {
        // Tampilkan loading text
        const btn = $('#btnSaveBudget');
        const oldText = btn.innerText;
        btn.innerText = 'Menyimpan...';
        
        await saveBudgetMonth(d.month, d.income, normalized.categories);
        
        $('#bStatus').textContent = 'Tersimpan.';
        
        // Refresh halaman utama jika ada fungsi rerender()
        if(typeof rerender === 'function') rerender();
        
        setTimeout(() => { 
            closeBudget(); 
            btn.innerText = oldText; 
        }, 500);
    } catch (e) {
        console.error(e);
        $('#bStatus').textContent = 'Gagal simpan. Coba lagi.';
        $('#btnSaveBudget').innerText = 'Simpan Budget';
    }
});

// ============================================================
// 4. TOMBOL TAMBAH TRANSAKSI (JANGAN DIHAPUS)
// ============================================================
    $('#btnBudgetGoToTx').onclick = () => {
    closeBudget();
    
    // Sebelum buka sheet, kita siapkan dulu data dropdown manualnya
    const cats = getLiveBudgetCategories();
    setSelectOptions($('#mCategory'), cats, cats[0] || 'Lainnya');
    
    // Buka sheet (default ke Quick AI dulu sesuai alur asli Anda)
    openAddSheet('quick'); 
};
    
        // =========================
        // Quick AI flow (multi-line => auto-save)
        // =========================
    function splitMultiTransactions(text){
      return (text||'')
        .split(/\n+/)
        .map(s => s.replace(/^\s*(?:\d+[\).]\s*)?/,'').trim())
        .filter(Boolean);
    }

    async function parseOneLineToTx(line){
      // Use AI if enabled (via Supabase Edge Function), else heuristic
      const tx = await parseQuickText(line);
      // Ensure required fields
      const finalTx = {
        ...tx,
        id: tx.id || uuid(),
        account: tx.account || getLastUsedAccount(),
        payment_method: tx.payment_method || tx.account || 'Cash',
        category: tx.category || 'Lainnya',
        updated_at: new Date().toISOString(),
        created_at: tx.created_at || new Date().toISOString()
      };
      return finalTx;
    }

    $('#btnParse').addEventListener('click', async () => {
      const raw = $('#quickText').value;
      const lines = splitMultiTransactions(raw);
      if (!lines.length) return;

      const btn = $('#btnParse');
      const status = $('#parseStatus');
      btn.disabled = true;
      status.textContent = '⏳...';

      try {
        // Sequential processing to ensure database stability and accurate progress
        for (let i = 0; i < lines.length; i++) {
          status.textContent = `⏳ ${i+1}/${lines.length}`;
          const tx = await parseOneLineToTx(lines[i]);
          if (tx && tx.amount > 0) {
            await upsertTransaction(tx);
          }
        }

        $('#quickText').value = '';
        rerender();
         // REFRESH SETELAH SEMUA BARIS SELESAI
  refreshAllUI();
  refreshAppSchedules();
        closeAddSheet();
      } catch (e) {
        console.error(e);
        status.textContent = 'Error.';
      } finally {
        btn.disabled = false;
      }
    });

    $('#btnQuickClear').addEventListener('click', () => {
      $('#quickText').value = '';
      $('#parseStatus').textContent = '';
      STATE.parsedDraft = null;
    });

    // =========================
    // Manual flow
    // =========================
    function syncManualTransferUI(){
      const isTransfer = ($('#mType').value === 'transfer');
      $('#mToWrap').classList.toggle('hidden', !isTransfer);
      if (isTransfer) {
        $('#mCategory').value = $('#mCategory').value || 'Transfer';
        $('#mMerchant').value = $('#mMerchant').value || 'Transfer';
      }
    }
    $('#mType').addEventListener('change', syncManualTransferUI);

  $('#btnSaveManual').onclick = async () => {
  const amt = parseNumberInput($('#mAmount').value);
  if (!amt) return alert("Isi jumlah uang!");

  const tx = {
    id: uuid(), // atau generate id baru
    date: $('#mDate').value || toISODate(new Date()),
    type: $('#mType').value,
    amount: amt,
    category: $('#mCategory').value,
    account: $('#mAccount').value,
    payment_method: $('#mPayment').value,
    merchant: $('#mMerchant').value,
    notes: $('#mNotes').value,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Panggil fungsi yang sudah kita perbaiki di atas
  await upsertTransaction(tx);

  // Berikan feedback visual
  $('#manualStatus').textContent = 'Berhasil disimpan!';
  
  // Tutup sheet
  setTimeout(() => {
    closeAddSheet();
    $('#mAmount').value = '';
    $('#mMerchant').value = '';
    $('#manualStatus').textContent = '';
  }, 300);
};

    // =========================
    // Receipt OCR flow
    // =========================
    function parseReceiptTextToTx(ocrText){
      const t = normalizeText(ocrText);
      const date = (() => {
        const m = t.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\b/);
        if (m) {
          let dd=Number(m[1]), mm=Number(m[2]), yy=Number(m[3]);
          if (yy<100) yy+=2000;
          return toISODate(new Date(yy, mm-1, dd));
        }
        return toISODate(new Date());
      })();

      let amount = null;
      const totalLine = (ocrText||'').split('\n').find(l => /\btotal\b/i.test(l));
      if (totalLine) amount = parseIDRAmount(totalLine);
      if (!amount) amount = parseIDRAmount(ocrText);

      const firstLine = (ocrText||'').split('\n').map(s=>s.trim()).find(Boolean) || '';
      const merchant = titleCase(firstLine.slice(0,32));

      const payment_method = guessPayment(ocrText);
      const account = guessAccount(ocrText, payment_method);
      const category = guessCategory(ocrText);

      return {
        id: uuid(),
        date,
        type: 'expense',
        amount: amount ?? 0,
        currency: 'IDR',
        category: category === 'Gaji' ? 'Belanja Harian' : category,
        subcategory: '',
        account,
        merchant: merchant || 'Merchant',
        payment_method,
        notes: 'Dari struk (OCR)',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        meta: { source:'receipt', ocr: true }
      };
    }

    function renderReceiptTransactions(){
      const txs = STATE.receiptDraft || [];
      const wrap = $('#receiptTxWrap');
      const list = $('#receiptTxList');
      list.innerHTML = '';
      wrap.classList.toggle('hidden', !txs.length);

      for (const tx of txs) {
        const card = document.createElement('div');
        card.className = 'rounded-2xl app-card-opaque p-3';
        card.innerHTML = `
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="text-sm font-semibold truncate">${escapeHtml(tx.merchant || 'Merchant')}</div>
              <div class="mt-0.5 text-xs app-muted truncate">${escapeHtml(tx.category || 'Lainnya')} • ${escapeHtml(tx.date)} • ${escapeHtml(tx.account || '—')}</div>
            </div>
            <div class="text-right">
              <div class="text-sm font-semibold" style="color: rgba(254,202,202,.95)">${formatIDR(tx.amount || 0)}</div>
              <div class="text-xs app-muted2">expense</div>
            </div>
          </div>
        `;
        list.appendChild(card);
      }

      $('#btnSaveReceiptAuto').disabled = !txs.length;
      $('#btnSaveReceiptAuto').style.opacity = txs.length ? '1' : '.6';
    }

    async function runReceiptBatchOCR(files){
      if (!files || !files.length) return;
      STATE.ui.receiptOcrRunning = true;
      STATE.receiptDraft = [];
      renderReceiptTransactions();

      try {
        for (let i=0;i<files.length;i++) {
          const f = files[i];
          $('#ocrStatus').textContent = `OCR ${i+1}/${files.length}…`;

          const result = await Tesseract.recognize(f, 'eng', {
            logger: m => {
              if (m.status === 'recognizing text') {
                const p = Math.round((m.progress||0)*100);
                $('#ocrStatus').textContent = `OCR ${i+1}/${files.length}: ${p}%`;
              }
            }
          });
          const text = (result.data?.text || '').trim();

          let tx = null;
          if (STATE.settings.useGemini && (STATE.settings.geminiKey||'').trim()) {
            try {
              tx = await fetchAIParsedTransactionViaSupabase(text, 'receipt');
              tx.type = 'expense';
              tx.meta = { source:'receipt', ocr:true, parsed:true, provider:'supabase_edge' };
            } catch {
              tx = null;
            }
          }
          if (!tx) tx = parseReceiptTextToTx(text);

          if (!tx.amount) continue;
          tx.account = tx.account || getLastUsedAccount();
          ensureAccountRegistered(tx.account);
          STATE.receiptDraft.push(tx);
          renderReceiptTransactions();
        }

        if (!STATE.receiptDraft.length) {
          $('#ocrStatus').textContent = 'Tidak menemukan transaksi dari foto. Coba foto lebih tajam.';
        } else {
          $('#ocrStatus').textContent = `Selesai. ${STATE.receiptDraft.length} transaksi siap disimpan.`;
        }
      } catch (e) {
        console.error(e);
        $('#ocrStatus').textContent = 'OCR gagal. Coba ulang.';
      } finally {
        STATE.ui.receiptOcrRunning = false;
      }
    }

    $('#btnPickReceipt').addEventListener('click', () => $('#rFile')?.click());

    $('#rFile').addEventListener('change', async () => {
      const files = Array.from($('#rFile').files || []);
      if (!files.length) return;
      await runReceiptBatchOCR(files);
    });

    $('#btnSaveReceiptAuto').addEventListener('click', async () => {
      const txs = STATE.receiptDraft || [];
      if (!txs.length) return;
      try {
        for (const tx of txs) {
          tx.updated_at = new Date().toISOString();
          await upsertTransaction(tx);
        }
        $('#ocrStatus').textContent = 'Tersimpan.';
        STATE.receiptDraft = null;
        $('#rFile').value = '';
        $('#receiptTxWrap').classList.add('hidden');
        rerender();
         // REFRESH SETELAH SEMUA STRUK TERSIMPAN
    refreshAppSchedules();
        setTimeout(() => closeAddSheet(), 250);
      } catch {
        $('#ocrStatus').textContent = 'Gagal simpan. Coba lagi.';
      }
    });

    $('#btnClearReceipt').addEventListener('click', () => {
      STATE.receiptDraft = null;
      $('#rFile').value = '';
      $('#receiptTxWrap').classList.add('hidden');
      $('#ocrStatus').textContent = '';
    });

    // =========================
    // Advisor UI (auto-generate with cache)
    // =========================
    function advisorCurrentFingerprint(){
      // if any transaction is added/updated/deleted, fingerprint changes
      let latest = '';
      for (const tx of STATE.transactions) {
        const u = tx.updated_at || tx.created_at || '';
        if (u > latest) latest = u;
      }
      const periodKey = `${STATE.period.start}|${STATE.period.end}`;
      return `${periodKey}|${STATE.transactions.length}|${latest}`;
    }

    function renderAdvisorData(ins){
      if (!ins) return;

      // ===== Make insights more "smart" with extra heuristics =====
      const txs = getTransactionsInPeriod();
      const s = sumByType(txs);
      const cats = groupExpenseByCategory(txs);

      // Detect likely monthly utilities by keyword + recurrence
      const utilKeywords = ['pln','listrik','pdam','air','wifi','indihome','biznet','first media','internet','tagihan'];
      const utilCandidates = new Map();
      for (const tx of STATE.transactions) {
        if (tx.type !== 'expense') continue;
        const m = normalizeText(`${tx.merchant||''} ${tx.notes||''} ${tx.category||''}`);
        if (!utilKeywords.some(k => m.includes(k))) continue;
        const key = (tx.merchant||tx.category||'util').toLowerCase();
        if (!utilCandidates.has(key)) utilCandidates.set(key, []);
        utilCandidates.get(key).push(tx);
      }
      const utilRecurring = [];
      for (const [k, arr] of utilCandidates.entries()) {
        const months = new Set(arr.map(x => toMonthKey(x.date)));
        if (months.size >= 2) {
          const avg = Math.round(arr.reduce((a,b)=>a+Number(b.amount||0),0)/(arr.length||1));
          utilRecurring.push({ label: arr[0]?.merchant || arr[0]?.category || 'Utilitas', avg, months: months.size });
        }
      }
      utilRecurring.sort((a,b)=>b.months-a.months || b.avg-a.avg);

      // Smarter budget reco: treat utilities as monthly fixed (1x/month) and cap frequency suggestions
      // We still show planned values, but add note in bullets if utilities detected.

      $('#advisorSummary').textContent = ins.summary;

      const bullets = [];
      bullets.push(...(ins.top_spending_categories?.[0] ? [`Kategori top: ${ins.top_spending_categories[0].category} (${formatIDR(ins.top_spending_categories[0].amount)})`] : []));
      bullets.push(...(ins.top_merchants?.[0] ? [`Merchant top: ${ins.top_merchants[0].merchant} (${formatIDR(ins.top_merchants[0].amount)})`] : []));

      if (utilRecurring.length) {
        bullets.push(`Utilitas terdeteksi (umumnya 1x/bulan): ${utilRecurring.slice(0,2).map(u=>`${u.label} ~${formatIDR(u.avg)}`).join(', ')}.`);
      }

      bullets.push(...(ins.recurring?.length ? [`Recurring: ${ins.recurring.slice(0,3).map(r => `${r.merchant} (${formatIDR(r.amount)})`).join(', ')}.`] : []));
      bullets.push(...(ins.anomalies?.length ? [`Anomali: ${ins.anomalies[0].merchant} ${formatIDR(ins.anomalies[0].amount)} pada ${ins.anomalies[0].date}.`] : []));
      bullets.push(...(ins.tips?.length ? ins.tips.slice(0,3).map(t=>`Tip: ${t}`) : []));

      // Add safe-to-spend tip if end of month range
      if (s.income > 0) {
        const end = new Date(STATE.period.end);
        const now = new Date();
        const sameMonth = toMonthKey(end) === toMonthKey(now);
        if (sameMonth) {
          const daysLeft = Math.max(1, Math.ceil((endOfMonth(toMonthKey(end)).getTime() - now.getTime())/(24*3600*1000)));
          const safe = Math.max(0, s.net);
          bullets.push(`Batas spending aman sampai akhir bulan kira-kira ${formatIDR(Math.floor(safe/daysLeft))}/hari.`);
        }
      }

      $('#advisorBullets').innerHTML = bullets.length
        ? bullets.map(b=>`<li>${escapeHtml(b)}</li>`).join('')
        : '<li class="app-muted">Belum cukup data untuk insight.</li>';

      const b = ins.budget_recommendations;
      const by = b?.by_category || [];
      $('#advisorBudget').innerHTML = by.length ? by.map(row => {
        const catNorm = normalizeText(row.category);
        const isUtil = utilKeywords.some(k => catNorm.includes(k));
        const note = isUtil ? 'utilitas (umumnya 1x/bulan)' : 'berdasarkan pola spending kamu';
        return `
          <div class="rounded-2xl app-card p-3">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="text-sm font-semibold truncate">${escapeHtml(row.category)}</div>
                <div class="text-xs app-muted">${escapeHtml(note)}</div>
              </div>
              <div class="text-right">
                <div class="text-sm font-semibold" style="color: rgba(199,210,254,.95)">${formatIDR(row.planned)}</div>
                <div class="text-xs app-muted2">planned</div>
              </div>
            </div>
          </div>
        `;
      }).join('') : '<div class="text-sm app-muted">Belum ada rekomendasi.</div>';
    }

    async function generateInsightsAndRender(){
      $('#advisorStatus').textContent = 'Mengolah…';
      $('#advisorSummary').innerHTML = '<div class="h-4 w-5/6 rounded skeleton"></div><div class="mt-2 h-4 w-4/6 rounded skeleton"></div>';
      $('#advisorBullets').innerHTML = '<li><div class="h-4 w-11/12 rounded skeleton"></div></li><li><div class="h-4 w-9/12 rounded skeleton"></div></li><li><div class="h-4 w-10/12 rounded skeleton"></div></li>';
      $('#advisorBudget').innerHTML = '<div class="h-10 rounded-2xl skeleton"></div>';
      await sleep(180);

      const ins = generateInsights();
      renderAdvisorData(ins);

      // reset coach chat (period-specific)
      initCoachChat({ reset: true });

      STATE.advisorCache.data = ins;
      STATE.advisorCache.fingerprint = advisorCurrentFingerprint();
      STATE.advisorCache.periodKey = `${STATE.period.start}|${STATE.period.end}`;
      STATE.advisorCache.generatedAt = new Date().toISOString();

      $('#advisorStatus').textContent = 'Selesai.';
    }

    async function openAdvisorAuto(){
      openAdvisor();
      const fp = advisorCurrentFingerprint();
      if (STATE.advisorCache.data && STATE.advisorCache.fingerprint === fp) {
        renderAdvisorData(STATE.advisorCache.data);
        initCoachChat({ reset: false });
        $('#advisorStatus').textContent = 'Selesai.';
        return;
      }
      await generateInsightsAndRender();
    }

    // tombol manual refresh (tetap ada)
    $('#btnGenerateInsights').addEventListener('click', async () => {
      await generateInsightsAndRender();
    });

    // =========================
    // AI Financial Coach (Chat) - Advisor tab
    // =========================
    const COACH = {
      messages: [],
      sending: false,
    };

    function formatCoachTime(){
      const d = new Date();
      return d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
    }

    function coachBubble(role, text){
      const mine = role === 'user';
      const wrap = document.createElement('div');
      wrap.className = mine ? 'flex justify-end' : 'flex justify-start';
      const b = document.createElement('div');
      b.className = 'max-w-[85%] rounded-2xl px-3 py-2 text-sm';
      b.style.border = '1px solid var(--app-border)';
      b.style.background = mine
        ? 'color-mix(in srgb, var(--brand-green) 22%, var(--app-sheet) 78%)'
        : 'color-mix(in srgb, var(--app-sheet) 92%, var(--app-bg) 8%)';
      b.textContent = text;
      wrap.appendChild(b);
      return wrap;
    }

    function renderCoachMessages(){
      const box = $('#coachMessages');
      if (!box) return;
      box.innerHTML = '';

      if (!COACH.messages.length) {
        const hint = document.createElement('div');
        hint.className = 'text-xs app-muted';
        hint.textContent = 'Tanya AI tentang pengeluaran, budget, atau saran hemat. (Contoh: “Aku bulan ini boros nggak?”)';
        box.appendChild(hint);
        return;
      }

      for (const m of COACH.messages) {
        box.appendChild(coachBubble(m.role, m.text));
      }
      // scroll bottom
      box.scrollTop = box.scrollHeight;
    }

    function initCoachChat({ reset=false }={}){
      if (reset) {
        COACH.messages = [];
        $('#coachInput') && ($('#coachInput').value = '');
        $('#coachStatus') && ($('#coachStatus').textContent = '');
      }
      renderCoachMessages();

      // Quota UI (stub for now)
      const q = $('#coachQuota');
      if (q) q.textContent = ' '; // will be filled when quota implemented
    }

    async function callCoachEdgeFunction(message){
      if (!STATE.db.enabled || !STATE.db.session?.access_token) throw new Error('Not authed');
      const url = `${SUPABASE_URL.replace(/\/+$/,'')}/functions/v1/${SUPABASE_FN_COACH}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${STATE.db.session.access_token}`
        },
        body: JSON.stringify({
          message,
          start: STATE.period.start,
          end: STATE.period.end,
          budgetMonth: toMonthKey(STATE.period.end),
        })
      });
      const txt = await res.text().catch(()=> '');
      if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);
      return JSON.parse(txt);
    }

    async function sendCoachMessage(){
      if (COACH.sending) return;
      const inp = $('#coachInput');
      const msg = (inp?.value || '').trim();
      if (!msg) return;

      COACH.sending = true;
      inp.value = '';
      
      // Update UI & State
      COACH.messages.push({ role:'user', text: msg, at: Date.now() });
      COACH.messages.push({ role:'assistant', text: 'AI sedang menganalisa…', at: Date.now(), pending: true });
      renderCoachMessages();
      $('#coachStatus').textContent = 'Menghubungi AI…';

      try {
        const out = await callCoachEdgeFunction(msg);
        const idx = COACH.messages.findIndex(m => m.pending);
        
        if (idx >= 0) {
          // Selalu prioritaskan field "reply" dari server jika ada
          const finalReply = (out && out.reply) ? String(out.reply).trim() : 'Maaf, respon tidak valid.';
          COACH.messages[idx] = { role:'assistant', text: finalReply, at: Date.now() };
        }
        $('#coachStatus').textContent = '';
      } catch (e) {
        console.error("Coach send failed:", e);
        const idx = COACH.messages.findIndex(m => m.pending);
        if (idx >= 0) {
          COACH.messages[idx] = { role:'assistant', text: 'Maaf, AI sedang bermasalah koneksi. Coba lagi ya.', at: Date.now() };
        }
        $('#coachStatus').textContent = 'Gagal memanggil AI.';
      } finally {
        COACH.sending = false;
        renderCoachMessages();
        // Simpan history ke localStorage
        localStorage.setItem(`coach_history_${STATE.user.email}`, JSON.stringify(COACH.messages.slice(-20)));
      }
    }

    $('#btnCoachSend')?.addEventListener('click', sendCoachMessage);
    $('#coachInput')?.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendCoachMessage();
      }
    });

    // =========================
    // AI Settings (Monevisor)
    // =========================
    $('#btnSaveGemini')?.addEventListener('click', async () => {
      STATE.settings.geminiKey = ($('#geminiKey').value || '').trim();
      STATE.settings.useGemini = !!$('#toggleGemini').checked;

      try {
        await saveSettings();
        $('#geminiStatus').textContent = 'Tersimpan.';
        $('#geminiStatus').style.color = 'var(--brand-green)';
        setTimeout(()=>{ 
          $('#geminiStatus').textContent = '—'; 
          $('#geminiStatus').style.color = '';
        }, 2000);
      } catch {
        $('#geminiStatus').textContent = 'Gagal menyimpan.';
        $('#geminiStatus').style.color = 'rgba(244,63,94,.95)';
      }
    });

    $('#btnTestAI')?.addEventListener('click', async () => {
      const key = ($('#geminiKey').value || '').trim();
      if (!key && !STATE.settings.useGemini) {
        $('#geminiStatus').textContent = 'Masukkan Key dulu atau aktifkan AI.';
        $('#geminiStatus').style.color = 'rgba(244,63,94,.95)';
        return;
      }
      
      $('#geminiStatus').textContent = 'Menguji koneksi...';
      $('#geminiStatus').style.color = '';
      
      if (typeof Notification !== 'undefined') {
        Notification.requestPermission();
      }

      try {
        // Test by trying to parse a simple dummy text
        const res = await fetchAIParsedTransactionViaSupabase('tes koneksi 10k', 'text');
        if (res && res.amount) {
          $('#geminiStatus').textContent = 'Terhubung! AI siap dipakai.';
          $('#geminiStatus').style.color = 'var(--brand-green)';
        } else {
          throw new Error('AI response invalid');
        }
      } catch (e) {
        let msg = String(e?.message || e);
        if (msg.includes('AI error')) msg = msg.replace('AI error:', '').trim();
        $('#geminiStatus').textContent = `Koneksi gagal: ${msg.slice(0, 40)}`;
        $('#geminiStatus').style.color = 'rgba(244,63,94,.95)';
      }
    });

    // =========================
    // Admin Branding: Upload logo to Supabase Storage + save to app_config
    // =========================
    async function uploadLogoToStorage(file){
      if (!STATE.db.enabled || !STATE.db.user) throw new Error('Not logged in');
      if (!isAdmin()) throw new Error('Not admin');
      const supa = STATE.db.supa;

      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const safeExt = ext.replace(/[^a-z0-9]/g,'') || 'png';
      const path = `logo_${Date.now()}_${Math.random().toString(16).slice(2)}.${safeExt}`;

      const { error: upErr } = await supa.storage
        .from('app-branding')
        .upload(path, file, { upsert: true, contentType: file.type || 'image/png' });
      if (upErr) throw upErr;

      const { data } = supa.storage.from('app-branding').getPublicUrl(path);
      const publicUrl = data?.publicUrl || '';
      if (!publicUrl) throw new Error('Failed to get public URL');
      return publicUrl;
    }

    async function uploadLogoViaEdgeFunction(file){
      if (!STATE.db.enabled || !STATE.db.session?.access_token) throw new Error('Not authed');
      if (!isAdmin()) throw new Error('Not admin');

      const url = `${SUPABASE_URL.replace(/\/+$/,'')}/functions/v1/monefyi-upload-logo`;
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STATE.db.session.access_token}`
        },
        body: fd,
      });

      if (!res.ok) {
        const txt = await res.text().catch(()=>String(res.status));
        throw new Error(txt || `HTTP ${res.status}`);
      }

      const obj = await res.json();
      const logoUrl = obj?.logoUrl;
      if (!logoUrl) throw new Error('No logoUrl returned');

      // Update local appConfig quickly
      if (obj?.appConfig) STATE.appConfig = obj.appConfig;
      else STATE.appConfig = { ...(STATE.appConfig||{}), logo_url: logoUrl };
      applyAppBranding();
      return logoUrl;
    }

    async function testLogoUploadEndpoint(){
      // Basic connectivity test: fetch function with OPTIONS or GET (GET may return 405 but still proves reachable)
      const base = `${SUPABASE_URL.replace(/\/+$/,'')}/functions/v1/monefyi-upload-logo`;
      try {
        const res = await fetch(base, { method: 'OPTIONS' });
        return { ok: true, status: res.status, via: 'OPTIONS' };
      } catch (e1) {
        try {
          const res2 = await fetch(base, { method: 'GET' });
          return { ok: true, status: res2.status, via: 'GET' };
        } catch (e2) {
          return { ok: false, error: String(e2?.message || e2) };
        }
      }
    }

    async function saveLogoUrlToConfig(logoUrl){
      if (!STATE.db.enabled || !STATE.db.user) throw new Error('Not logged in');
      if (!isAdmin()) throw new Error('Not admin');
      const supa = STATE.db.supa;

      const payload = {
        id: 'global',
        logo_url: logoUrl || null,
        checkout_monthly_url: STATE.appConfig?.checkout_monthly_url || null,
        checkout_lifetime_url: STATE.appConfig?.checkout_lifetime_url || null,
        affiliate_commission: STATE.appConfig?.affiliate_commission ?? 100000,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supa.from('app_config').upsert(payload).select('*').single();
      if (error) throw error;
      STATE.appConfig = data;
      applyAppBranding();
      return data;
    }

    $('#logoFile')?.addEventListener('change', async () => {
      const file = $('#logoFile').files?.[0];
      if (!file) return;
      $('#logoStatus').textContent = 'Uploading…';
      try {
        // 1) Try direct Storage upload (requires Storage policy)
        let url = '';
        try {
          url = await uploadLogoToStorage(file);
          await saveLogoUrlToConfig(url);
        } catch (e1) {
          // 2) Fallback: upload via Edge Function (admin-only)
          console.warn('direct upload failed, fallback edge function', e1);
          url = await uploadLogoViaEdgeFunction(file);
        }

        if (url) {
          $('#logoUrl').value = url;
          $('#logoStatus').textContent = 'Tersimpan.';
        } else {
          $('#logoStatus').textContent = 'Gagal upload.';
        }
      } catch (e) {
        console.warn(e);
        const rawMsg = String(e?.message || e || '');
        const msg = rawMsg.slice(0, 220);
        if (rawMsg.toLowerCase().includes('failed to fetch')) {
          $('#logoStatus').textContent = 'Gagal upload: Failed to fetch. Cek: (1) Edge Function monefyi-upload-logo sudah deploy, (2) Secrets function sudah di-set, (3) adblock/firewall memblok supabase.co, (4) buka via HTTPS.';
        } else {
          $('#logoStatus').textContent = msg ? `Gagal upload: ${msg}` : 'Gagal upload (cek bucket/policy/function).';
        }
      } finally {
        $('#logoFile').value = '';
      }
    });

    $('#btnTestLogoUpload')?.addEventListener('click', async () => {
      $('#logoStatus').textContent = 'Menguji koneksi…';
      const r = await testLogoUploadEndpoint();
      if (r.ok) {
        $('#logoStatus').textContent = `OK: endpoint terjangkau (${r.via} ${r.status}). Jika upload tetap gagal, cek role admin & secrets.`;
      } else {
        $('#logoStatus').textContent = `Gagal: ${String(r.error||'Failed to fetch')}. Cek adblock/jaringan, pastikan functions aktif.`;
      }
      setTimeout(()=>{ if ($('#logoStatus').textContent.startsWith('OK:')) $('#logoStatus').textContent = '—'; }, 3500);
    });

    $('#btnSaveLogo')?.addEventListener('click', async () => {
      if (!isAdmin()) return;
      const url = ($('#logoUrl').value || '').trim();
      $('#logoStatus').textContent = 'Menyimpan…';
      try {
        await saveLogoUrlToConfig(url);
        $('#logoStatus').textContent = 'Tersimpan.';
      } catch (e) {
        console.warn(e);
        const msg = String(e?.message || e || '').slice(0, 160);
        $('#logoStatus').textContent = msg ? `Gagal simpan: ${msg}` : 'Gagal (cek policy).';
      }
    });

    $('#toggleGemini').addEventListener('change', async () => {
      STATE.settings.useGemini = !!$('#toggleGemini').checked;
      await saveSettings();
    });

    $('#btnAddAccount').addEventListener('click', async () => {
      const name = ($('#newAccount').value || '').trim();
      if (!name) {
        $('#accountsStatus').textContent = 'Nama akun tidak boleh kosong.';
        return;
      }
      ensureAccountRegistered(name);
      $('#newAccount').value = '';
      ensureSelectOptions();
      renderAccountsSettings();
      $('#accountsStatus').textContent = 'Akun ditambahkan.';
      setTimeout(()=>{ $('#accountsStatus').textContent = `Total akun: ${STATE.settings.accounts.length}`; }, 1200);
    });

    // =========================
    // Print Report (PDF)
    // =========================
    function reportFilterSummary(){
      const parts = [];
      parts.push(`${STATE.period.start}–${STATE.period.end}`);
      if (STATE.filters.q) parts.push(`q="${STATE.filters.q}"`);
      if (STATE.filters.type) parts.push(`type=${STATE.filters.type}`);
      if (STATE.filters.category) parts.push(`category=${STATE.filters.category}`);
      if (STATE.filters.account) parts.push(`account=${STATE.filters.account}`);
      if (STATE.focusCategory) parts.push(`focus=${STATE.focusCategory}`);
      return parts.length ? parts.join(' • ') : '—';
    }

    function plannedBudgetForCurrentFilters(){
      const ms = monthsBetween(STATE.period.start, STATE.period.end);
      const cat = normalizeCategoryName(STATE.focusCategory || STATE.filters.category || '');
      let planned = 0;
      for (const mk of ms) {
        const b = getBudgetMonth(mk);
        if (!b) continue;
        if (cat) {
          // match by normalized key
          const entries = Object.entries(b.categories || {});
          for (const [k,v] of entries) {
            if (normalizeCategoryName(k) === cat) planned += Number(v||0);
          }
        } else {
          planned += sumBudgetCategories(b.categories);
        }
      }
      return planned;
    }

    function sumsForAccountInTxs(accountName, txs){
      let income=0, expense=0;
      for (const tx of txs) {
        const amt = Number(tx.amount||0);
        if (tx.type === 'income' && tx.account === accountName) income += amt;
        else if (tx.type === 'expense' && tx.account === accountName) expense += amt;
        else if (tx.type === 'transfer') {
          if (tx.meta?.transfer_to === accountName) income += amt;
          if (tx.account === accountName) expense += amt;
        }
      }
      return { income, expense, net: income-expense };
    }

    async function makeChartImage(config, {width=900, height=420}={}){
      const wrap = document.createElement('div');
      wrap.style.position = 'fixed';
      wrap.style.left = '-10000px';
      wrap.style.top = '0';
      wrap.style.width = `${width}px`;
      wrap.style.height = `${height}px`;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      wrap.appendChild(canvas);
      document.body.appendChild(wrap);

      let c;
      try {
        c = new Chart(canvas.getContext('2d'), {
          ...config,
          options: {
            responsive: false,
            maintainAspectRatio: false,
            animation: false,
            ...config.options,
          }
        });
        // allow chart to render
        await sleep(40);
        const dataUrl = canvas.toDataURL('image/png');
        c.destroy();
        wrap.remove();
        return dataUrl;
      } catch (e) {
        try { c?.destroy(); } catch {}
        try { wrap.remove(); } catch {}
        return '';
      }
    }

    function computeTrendSeriesForReport(){
      const start = new Date(STATE.period.start);
      const end = new Date(STATE.period.end);
      const days = Math.ceil((end - start) / (24*3600*1000)) + 1;

      let labels = [];
      let income = [];
      let expense = [];

      if (days <= 45) {
        const map = new Map();
        for (let i=0;i<days;i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          map.set(toISODate(d), { income:0, expense:0 });
        }
        for (const tx of STATE.transactions) {
          if (!matchAggregateFilters(tx, STATE.filters)) continue;
          const iso = tx.date;
          if (!map.has(iso)) continue;
          const amt = Number(tx.amount||0);
          if (tx.type==='income') map.get(iso).income += amt;
          if (tx.type==='expense') map.get(iso).expense += amt;
        }
        labels = [...map.keys()];
        income = labels.map(k=>map.get(k).income);
        expense = labels.map(k=>map.get(k).expense);
      } else {
        const anchor = toMonthKey(STATE.period.end);
        const months = lastNMonths(6, anchor);
        const sums = sumsByMonth(months, { filters: STATE.filters });
        labels = sums.map(s => monthLabel(s.month));
        income = sums.map(s=>s.income);
        expense = sums.map(s=>s.expense);
      }

      return { labels, income, expense };
    }

    function computeWeekSeriesForReport(){
      const { start, end } = getWeekRangeISO(STATE.period.end);
      const lang = STATE.settings?.lang || 'id';
      const weekdays = (lang === 'en') ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] : ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
      const values = new Array(7).fill(0);
      for (const tx of STATE.transactions) {
        if (tx.type !== 'expense') continue;
        if (!matchAggregateFilters(tx, STATE.filters)) continue;
        const d = new Date(tx.date);
        if (d < start || d > end) continue;
        const dow = (d.getDay()+6)%7;
        values[dow] += Number(tx.amount||0);
      }
      return { weekdays, values, startISO: toISODate(start), endISO: toISODate(end) };
    }

    async function buildReportChartImages(){
      const colors = themeChartColors();
      const { labels, income, expense } = computeTrendSeriesForReport();

      const showIncome = !STATE.filters.type || STATE.filters.type === 'income';
      const showExpense = !STATE.filters.type || STATE.filters.type === 'expense';

      const trendConfig = {
        type: 'bar',
        data: {
          labels,
          datasets: [
            ...(showIncome ? [{
              label: t('chart.label.income'),
              data: income,
              backgroundColor: 'rgba(34, 197, 94, .25)',
              borderColor: 'rgba(34, 197, 94, .85)',
              borderWidth: 1,
              borderRadius: 8,
            }] : []),
            ...(showExpense ? [{
              label: t('chart.label.expense'),
              data: expense,
              backgroundColor: 'rgba(244, 63, 94, .20)',
              borderColor: 'rgba(244, 63, 94, .85)',
              borderWidth: 1,
              borderRadius: 8,
            }] : []),
          ]
        },
        options: {
          plugins: { legend: { labels: { color: '#0f172a' } } },
          scales: {
            x: { ticks: { color: '#0f172a' }, grid: { color: 'rgba(15,23,42,.10)' } },
            y: { ticks: { color: '#0f172a', callback:(v)=>formatCompactIDR(v) }, grid: { color: 'rgba(15,23,42,.10)' } },
          }
        }
      };

      const txsFiltered = getFilteredTransactions();
      const cats = groupExpenseByCategory(txsFiltered);
      const top = cats.slice(0,6);
      const other = cats.slice(6).reduce((a,b)=>a+b.amount,0);
      const donutLabels = top.map(c=>c.category).concat(other>0?['Other']:[]);
      const donutData = top.map(c=>c.amount).concat(other>0?[other]:[]);
      const palette = [
        'rgba(99, 102, 241, .85)',
        'rgba(14, 165, 233, .85)',
        'rgba(34, 197, 94, .85)',
        'rgba(234, 179, 8, .85)',
        'rgba(244, 63, 94, .85)',
        'rgba(168, 85, 247, .85)',
        'rgba(148, 163, 184, .65)',
      ];

      const catConfig = {
        type: 'doughnut',
        data: {
          labels: donutLabels,
          datasets: [{ data: donutData, backgroundColor: donutLabels.map((_,i)=>palette[i%palette.length]), borderColor: 'rgba(15,23,42,.08)', borderWidth: 1 }]
        },
        options: {
          cutout: '65%',
          plugins: { legend: { display: false } }
        }
      };

      const wk = computeWeekSeriesForReport();
      const weekConfig = {
        type: 'bar',
        data: {
          labels: wk.weekdays,
          datasets: [{ label: t('chart.label.expense'), data: wk.values, backgroundColor: 'rgba(14,165,233,.28)', borderColor:'rgba(14,165,233,.85)', borderWidth:1, borderRadius:8 }]
        },
        options: {
          plugins: { legend: { display:false } },
          scales: {
            x: { ticks: { color: '#0f172a' }, grid: { display:false } },
            y: { ticks: { color: '#0f172a', callback:(v)=>formatCompactIDR(v) }, grid: { color: 'rgba(15,23,42,.10)' } },
          }
        }
      };

      // Use white theme for print charts
      const prevTheme = STATE.settings.theme;
      const hadLight = document.body.classList.contains('theme-light');
      if (!hadLight) {
        document.body.classList.add('theme-light');
      }

      const trendImg = await makeChartImage(trendConfig, {width: 980, height: 420});
      const catImg = await makeChartImage(catConfig, {width: 520, height: 420});
      const weekImg = await makeChartImage(weekConfig, {width: 520, height: 420});

      if (!hadLight) document.body.classList.remove('theme-light');
      STATE.settings.theme = prevTheme;

      return { trendImg, catImg, weekImg, weekRange: `${wk.startISO}–${wk.endISO}` };
    }

    function buildReportHtml({ kpi, budget, accountsTop, accountsAll, charts, txs }){
      const now = new Date();
      const genAt = now.toLocaleString(STATE.settings.lang === 'en' ? 'en-US' : 'id-ID');
      const filterSum = reportFilterSummary();

      const fmt = (n)=>formatIDR(n);
      const saving = kpi.income>0 ? ((kpi.income-kpi.expense)/kpi.income)*100 : null;
      const savingStr = saving===null ? '—' : `${saving.toFixed(0)}%`;

      const txRows = txs.map(tx => {
        const sign = tx.type==='income' ? '+' : tx.type==='expense' ? '−' : '';
        const amt = `${sign}${formatIDR(tx.amount)}`;
        return `
          <tr>
            <td>${escapeHtml(tx.date)}</td>
            <td>${escapeHtml(tx.type)}</td>
            <td>${escapeHtml(tx.category||'')}</td>
            <td>${escapeHtml(tx.merchant||'')}</td>
            <td>${escapeHtml(tx.account||'')}</td>
            <td style="text-align:right; font-variant-numeric: tabular-nums;">${escapeHtml(amt)}</td>
          </tr>
        `;
      }).join('');

      const accountsRows = accountsAll.slice(0,8).map(a => {
        return `
          <tr>
            <td>${escapeHtml(a.account)}</td>
            <td style="text-align:right">${escapeHtml(formatIDR(a.balance))}</td>
          </tr>
        `;
      }).join('');

      return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Monefyi Report</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"; color:#0f172a; background:#fff; min-height: 100%; margin: 0; padding: 12px; }
  .muted{ color:#475569; }
  .h1{ font-size: 18px; font-weight: 800; margin:0; }
  .h2{ font-size: 13px; font-weight: 800; margin: 18px 0 8px; }
  .grid{ display:grid; gap:10px; }
  .grid-4{ grid-template-columns: repeat(4, minmax(0,1fr)); }
  .grid-2{ grid-template-columns: repeat(2, minmax(0,1fr)); }
  @media (max-width: 640px) {
    .grid-4 { grid-template-columns: repeat(2, minmax(0,1fr)); }
    .grid-2 { grid-template-columns: 1fr; }
  }
  .card{ border:1px solid rgba(15,23,42,.12); border-radius: 14px; padding: 10px; }
  .kpiLabel{ font-size: 11px; color:#475569; }
  .kpiVal{ font-size: 16px; font-weight: 800; margin-top:4px; }
  .kpiSub{ font-size: 11px; color:#64748b; margin-top:4px; }
  table{ width:100%; border-collapse: collapse; }
  th, td{ border-bottom:1px solid rgba(15,23,42,.10); padding: 7px 6px; font-size: 11px; vertical-align: top; }
  th{ text-align:left; color:#475569; font-weight:700; }
  .img{ width:100%; max-width:100%; border:1px solid rgba(15,23,42,.10); border-radius: 14px; }
  .small{ font-size: 11px; }
</style>
</head>
<body>
  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
    <div>
      <div class="h1">Monefyi — ${escapeHtml(t('print.title'))}</div>
      <div class="small muted">${escapeHtml(STATE.user.name || '')} • ${escapeHtml(STATE.user.email || '')}</div>
      <div class="small muted">${escapeHtml(STATE.period.label)}</div>
      <div class="small muted">${escapeHtml(t('print.generated'))}: ${escapeHtml(genAt)}</div>
      <div class="small muted">${escapeHtml(t('print.filters'))}: ${escapeHtml(filterSum)}</div>
    </div>
    <div class="card" style="min-width: 180px;">
      <div class="kpiLabel">${escapeHtml(t('common.net'))}</div>
      <div class="kpiVal">${escapeHtml(fmt(kpi.net))}</div>
      <div class="kpiSub">${escapeHtml(t('common.currency_idr'))}</div>
    </div>
  </div>

  <div class="h2">${escapeHtml(t('print.section.kpi'))}</div>
  <div class="grid grid-4">
    <div class="card"><div class="kpiLabel">${escapeHtml(t('kpi.income'))}</div><div class="kpiVal">${escapeHtml(fmt(kpi.income))}</div><div class="kpiSub">${escapeHtml(t('kpi.period_sub', {label: STATE.period.label}))}</div></div>
    <div class="card"><div class="kpiLabel">${escapeHtml(t('kpi.expense'))}</div><div class="kpiVal">${escapeHtml(fmt(kpi.expense))}</div><div class="kpiSub">${escapeHtml(t('kpi.period_sub', {label: STATE.period.label}))}</div></div>
    <div class="card"><div class="kpiLabel">${escapeHtml(t('kpi.net'))}</div><div class="kpiVal">${escapeHtml(fmt(kpi.net))}</div><div class="kpiSub">${escapeHtml(t('kpi.net_sub', {net: formatCompactIDR(kpi.net)}))}</div></div>
    <div class="card"><div class="kpiLabel">${escapeHtml(t('kpi.saving'))}</div><div class="kpiVal">${escapeHtml(savingStr)}</div><div class="kpiSub">${escapeHtml(t('common.currency_idr'))}</div></div>
  </div>

  <div class="h2">${escapeHtml(t('print.section.accounts'))}</div>
  <div class="grid grid-2">
    <div class="card">
      <div class="kpiLabel">${escapeHtml(t('accounts.sheet_title'))}</div>
      <div class="kpiSub">${escapeHtml(t('accounts.balance_upto', {date: STATE.period.end}))}</div>
      <table style="margin-top:8px;">
        <thead><tr><th>${escapeHtml(t('accounts.title'))}</th><th style="text-align:right">${escapeHtml(t('saldo.title'))}</th></tr></thead>
        <tbody>${accountsRows || ''}</tbody>
      </table>
    </div>
    <div class="card">
      <div class="kpiLabel">${escapeHtml(t('print.section.budget'))}</div>
      <div class="kpiSub">${escapeHtml(STATE.period.label)}</div>
      <div style="margin-top:10px; display:grid; grid-template-columns: repeat(3,1fr); gap:10px;">
        <div class="card"><div class="kpiLabel">${escapeHtml(t('budget.planned'))}</div><div class="kpiVal">${escapeHtml(fmt(budget.planned))}</div></div>
        <div class="card"><div class="kpiLabel">${escapeHtml(t('budget.actual'))}</div><div class="kpiVal">${escapeHtml(fmt(budget.actual))}</div></div>
        <div class="card"><div class="kpiLabel">${escapeHtml(t('budget.diff'))}</div><div class="kpiVal">${escapeHtml(fmt(budget.diff))}</div></div>
      </div>
    </div>
  </div>

  <div class="h2">${escapeHtml(t('print.section.charts'))}</div>
  <div class="card">
    <div class="kpiLabel">${escapeHtml(t('chart.trend.title'))}</div>
    ${charts.trendImg ? `<img class="img" src="${charts.trendImg}" alt="trend" />` : `<div class="small muted">—</div>`}
  </div>
  <div class="grid grid-2" style="margin-top:10px;">
    <div class="card">
      <div class="kpiLabel">${escapeHtml(t('chart.category.title'))}</div>
      ${charts.catImg ? `<img class="img" src="${charts.catImg}" alt="category" />` : `<div class="small muted">—</div>`}
    </div>
    <div class="card">
      <div class="kpiLabel">${escapeHtml(t('chart.week.title'))}</div>
      <div class="small muted">${escapeHtml(charts.weekRange || '')}</div>
      ${charts.weekImg ? `<img class="img" src="${charts.weekImg}" alt="week" />` : `<div class="small muted">—</div>`}
    </div>
  </div>

  <div class="h2">${escapeHtml(t('print.section.txs'))}</div>
  <div class="card">
    <div class="small muted">${escapeHtml(t('tx.count', {n: txs.length}))}</div>
    <table style="margin-top:8px;">
      <thead>
        <tr>
          <th>Date</th><th>Type</th><th>Category</th><th>Merchant</th><th>Account</th><th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${txRows || ''}
      </tbody>
    </table>
  </div>

  <div class="small muted" style="margin-top:10px;">Monefyi</div>
</body>
</html>`;
    }

    async function printReport(){
      const btn = $('#btnPrintReport');
      const status = $('#printStatus');

      // IMPORTANT: open popup synchronously to avoid popup blockers.
      const w = window.open('', '_blank');
      if (!w) {
        if (status) status.textContent = t('print.popup_blocked');
        return;
      }
      try { w.document.title = 'Monefyi Report'; } catch {}

      if (btn) btn.disabled = true;
      if (status) status.textContent = t('print.preparing');

      try {
        // Build report data based on current filters
        const txs = getFilteredTransactions().slice();
        // For report table, show ascending date
        txs.sort((a,b) => (a.date.localeCompare(b.date)) || ((a.created_at||'').localeCompare(b.created_at||'')));

        const kpi = sumByType(txs);

        const planned = plannedBudgetForCurrentFilters();
        const actual = txs.filter(x=>x.type==='expense').reduce((a,b)=>a+Number(b.amount||0),0);
        const budget = { planned, actual, diff: planned - actual };

        const accountsAll = computeAccountBalancesUpto(STATE.period.end);
        const accountsTop = accountsAll.slice(0,3);

        // Render charts to images (async)
        const charts = await buildReportChartImages();

        const html = buildReportHtml({ kpi, budget, accountsTop, accountsAll, charts, txs });

        // Write report
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();

        // Wait a bit for images to load
        await sleep(500);
        w.print();
        setTimeout(()=>{ try { w.close(); } catch {} }, 1000);

        if (status) status.textContent = '';
      } catch (e) {
        console.warn(e);
        try {
          w.document.open();
          w.document.write(`<pre style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; padding:16px;">Gagal menyiapkan laporan.\n\n${String(e?.message||e)}\n</pre>`);
          w.document.close();
        } catch {}
        if (status) status.textContent = 'Gagal menyiapkan laporan.';
        try { w.close(); } catch {}
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    // =========================
    // Data: CSV
    // =========================
    function txToCSVRow(tx){
      const cols = ['id','date','type','amount','currency','category','subcategory','account','merchant','payment_method','notes','created_at','updated_at'];
      const values = cols.map(k => {
        const v = (tx[k] ?? '').toString();
        const escaped = v.replace(/"/g,'""');
        return `"${escaped}"`;
      });
      return values.join(',');
    }

    async function exportCSV(){
      const cols = ['id','date','type','amount','currency','category','subcategory','account','merchant','payment_method','notes','created_at','updated_at'];
      const header = cols.join(',');

      let rowsTx = STATE.transactions.slice();
      if (STATE.db.enabled && STATE.db.user) {
        const { data, error } = await STATE.db.supa
          .from('transactions')
          .select('*')
          .order('date', { ascending: true });
        if (!error && Array.isArray(data)) rowsTx = data.map(t => ({...t, amount:Number(t.amount||0)}));
      }

      const rows = rowsTx
        .slice()
        .sort((a,b) => (a.date.localeCompare(b.date)) || ((a.created_at||'').localeCompare(b.created_at||'')))
        .map(tx => txToCSVRow(tx));

      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monefyi_transactions_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 500);
    }

    function splitCSVLine(line){
      const out=[];
      let cur='';
      let inQ=false;
      for (let i=0;i<line.length;i++) {
        const ch=line[i];
        if (inQ) {
          if (ch==='"') {
            if (line[i+1]==='"') { cur+='"'; i++; }
            else inQ=false;
          } else cur+=ch;
        } else {
          if (ch==='"') inQ=true;
          else if (ch===',') { out.push(cur); cur=''; }
          else cur+=ch;
        }
      }
      out.push(cur);
      return out;
    }

    function parseCSV(text){
      const lines = text.split(/\r?\n/).filter(l => l.trim().length);
      if (!lines.length) return [];
      const header = splitCSVLine(lines[0]);
      const rows = [];
      for (let i=1;i<lines.length;i++) {
        const cols = splitCSVLine(lines[i]);
        const obj = {};
        for (let j=0;j<header.length;j++) obj[header[j]] = cols[j] ?? '';
        obj.amount = parseNumberInput(obj.amount) || 0;
        if (!obj.id) obj.id = uuid();
        if (!obj.date) obj.date = toISODate(new Date());
        if (!obj.type) obj.type = 'expense';
        if (!obj.currency) obj.currency = 'IDR';
        if (!obj.created_at) obj.created_at = new Date().toISOString();
        if (!obj.updated_at) obj.updated_at = new Date().toISOString();
        rows.push(obj);
      }
      return rows;
    }

    $('#btnExportCSV').addEventListener('click', exportCSV);
    $('#fileImportCSV').addEventListener('change', async () => {
      const f = $('#fileImportCSV').files?.[0];
      if (!f) return;
      if (!STATE.db.enabled || !STATE.db.user) {
        alert('Harus login untuk import CSV.');
        $('#fileImportCSV').value = '';
        return;
      }
      try {
        const text = await f.text();
        const rows = parseCSV(text);

        const payload = rows.map(r => ({
          ...r,
          user_id: STATE.db.user.id,
          amount: Number(r.amount||0),
          // meta is jsonb in DB; we keep it empty unless you export/import meta explicitly
          meta: (r.meta && typeof r.meta === 'object') ? r.meta : {}
        }));

        // upsert in chunks to avoid request size limits
        const CHUNK = 300;
        for (let i=0;i<payload.length;i+=CHUNK) {
          const slice = payload.slice(i, i+CHUNK);
          const { error } = await STATE.db.supa.from('transactions').upsert(slice, { onConflict: 'id' });
          if (error) throw error;
        }

        await refreshTransactionsRange();
        for (const t of STATE.transactions) ensureAccountRegistered(t.account);
        rerender();
        closeMenu();
      } catch (e) {
        console.warn(e);
        alert('Gagal import CSV. Pastikan format header sesuai dan file tidak rusak.');
      } finally {
        $('#fileImportCSV').value = '';
      }
    });

    // =========================
    // Edit actions
    // =========================
  // --- ACTION TOMBOL DI MODAL EDIT ---

// 1. TOMBOL UPDATE
const btnUpdate = document.getElementById('btnUpdateTx');
if (btnUpdate) {
  btnUpdate.addEventListener('click', async () => {
    if (!STATE.editId) return;

    // Ambil transaksi dari memory
    const tx = STATE.transactions.find(t => t.id === STATE.editId);
    if (!tx) return;

    // Update object memory dengan value dari input form
    tx.date = $('#eDate').value;
    tx.type = $('#eType').value;
    tx.amount = parseNumberInput($('#eAmount').value) || 0;
    tx.category = $('#eCategory').value || 'Lainnya';
    tx.account = $('#eAccount').value || 'Cash';
    tx.payment_method = $('#ePayment').value || 'Cash';
    tx.merchant = $('#eMerchant').value || '';
    tx.notes = $('#eNotes').value || '';

    // UI Loading
    const status = $('#editStatus');
    status.textContent = 'Menyimpan...';
    btnUpdate.disabled = true;

    try {
      // Simpan ke DB
      await upsertTransaction(tx);
      
      status.textContent = 'Berhasil update.';
      
      // REFRESH SEMUA TAMPILAN
      if(typeof renderTransactionList === 'function') renderTransactionList(); // List Transaksi
      if(typeof renderBudgetRows === 'function') renderBudgetRows();           // Budget Progress Bar
      if(typeof updateBudgetSheetDerived === 'function') updateBudgetSheetDerived(); // Sisa Budget
      if(typeof renderDashboardStats === 'function') renderDashboardStats();   // Card Saldo Dashboard
         // REFRESH DISINI
    refreshAllUI(); 
      setTimeout(() => {
        if(typeof closeEditModal === 'function') closeEditModal();
        else if ($('#editBackdrop')) $('#editBackdrop').style.display = 'none'; // Fallback close
        
        btnUpdate.disabled = false;
        status.textContent = '';
      }, 500);

    } catch (e) {
      console.error(e);
      status.textContent = 'Gagal update database.';
      btnUpdate.disabled = false;
    }
  });
}

// 2. TOMBOL HAPUS
const btnDelete = document.getElementById('btnDeleteTx');
if (btnDelete) {
  btnDelete.addEventListener('click', async () => {
    if (!STATE.editId) return;
    
    const idToDelete = STATE.editId;
    if (!confirm('Yakin hapus transaksi ini?')) return;

    const status = $('#editStatus');
    status.textContent = 'Menghapus...';
    btnDelete.disabled = true;

    try {
      // A. Hapus dari Database
      await dbDeleteTransaction(idToDelete);

      // B. Hapus dari Memory (State)
      STATE.transactions = STATE.transactions.filter(t => t.id !== idToDelete);

      // C. REFRESH SEMUA TAMPILAN (Penting agar budget terupdate)
      status.textContent = 'Terhapus.';
      
      if(typeof renderTransactionList === 'function') renderTransactionList(); // Hapus dari list UI
      if(typeof renderBudgetRows === 'function') renderBudgetRows();           // Update Progress Bar Budget!
      if(typeof updateBudgetSheetDerived === 'function') updateBudgetSheetDerived(); // Update Sisa
      if(typeof renderDashboardStats === 'function') renderDashboardStats();

      setTimeout(() => {
        if(typeof closeEditModal === 'function') closeEditModal();
        else if ($('#editBackdrop')) $('#editBackdrop').style.display = 'none';
        
        btnDelete.disabled = false;
        status.textContent = '';
      }, 500);

    } catch (err) {
      console.error(err);
      status.textContent = 'Gagal hapus data.';
      btnDelete.disabled = false;
    }
  });
}

    // =========================
    // Header interactions
    // =========================
    $('#fab')?.addEventListener('click', () => openAddSheet('quick'));
    // Advisor dibuka lewat logo (auto-generate jika ada perubahan transaksi/periode)
    $('#btnLogo')?.addEventListener('click', () => openAdvisorAuto());
    $('#btnMenu')?.addEventListener('click', () => openMenu());
    $('#btnUser')?.addEventListener('click', () => openUser());


function toggleNav_legacy(mode) {
  const dash = document.getElementById('dashboardExpanded');
  const tx   = document.getElementById('txSection');

  if (mode === 'dash') {
    dash.classList.remove('hidden');
    tx.classList.add('hidden');
  } else if (mode === 'list') {
    dash.classList.add('hidden');
    tx.classList.remove('hidden');
  }
}



    function toggleNav(view) {
      // Close all open sheets automatically
      closeAddSheet();
      closeAdvisor();
      closeMenu();
      closeUser();
      closeAccounts();
      closeAccountDetail();
      closeEditModal();
      closeBudget();

      const btn = event ? event.currentTarget : null;
      if (btn && btn.classList) {
        btn.classList.add('animate-bounce-soft');
        setTimeout(() => btn.classList.remove('animate-bounce-soft'), 300);
      }

      if (view === 'list') {
        STATE.ui.dashboardOpen = false;
      } else if (view === 'dash') {
        STATE.ui.dashboardOpen = true;
      }
      rerender();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    $('#btnMainAction')?.addEventListener('click', (e) => {
      const menu = $('#actionMenu');
      menu.classList.toggle('hidden');
      e.stopPropagation();
    });

    document.addEventListener('click', () => $('#actionMenu')?.classList.add('hidden'));

    function setMonthPopover(open){
      STATE.ui.monthPopoverOpen = open;
      rerender();
    }

    // Periode toggle (di samping saldo)
    ['#btnPeriodToggle', '#btnPeriodToggleDesktop'].forEach((sel) => {
  const el = $(sel);
  if (!el) return;

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMonthPopover();   // fungsi lama tetap dipakai
  });
});

    $('#btnMonthClose').addEventListener('click', () => setMonthPopover(false));

   document.addEventListener('click', (e) => {
  if (!STATE.ui.monthPopoverOpen) return;

  const pop = $('#monthPopover');
  const btnMobile = $('#btnPeriodToggle');
  const btnDesktop = $('#btnPeriodToggleDesktop');
  const filters = $('#filtersWrap');

  const target = e.target;

  // Kalau klik di dalam popover, tombol periode (mobile/deskop), atau area filter → jangan close
  if (
    (pop && pop.contains(target)) ||
    (btnMobile && btnMobile.contains(target)) ||
    (btnDesktop && btnDesktop.contains(target)) ||
    (filters && filters.contains(target))
  ) {
    return;
  }

  setMonthPopover(false);
});

    function applyPreset(preset){
      const now = new Date();
      if (preset === 'today') {
        const iso = toISODate(now);
        setPeriod({ preset, startISO: iso, endISO: iso, label: 'Hari ini' });
      } else if (preset === 'yesterday') {
        const d = new Date(now); d.setDate(d.getDate()-1);
        const iso = toISODate(d);
        setPeriod({ preset, startISO: iso, endISO: iso, label: 'Kemarin' });
      } else if (preset === 'this_week') {
        const day = (now.getDay()+6)%7;
        const s = new Date(now); s.setDate(now.getDate()-day);
        const e = new Date(s); e.setDate(s.getDate()+6);
        setPeriod({ preset, startISO: toISODate(s), endISO: toISODate(e), label: 'Minggu ini' });
      } else if (preset === 'this_month') {
        const mk = toMonthKey(now);
        setPeriod({ preset, startISO: toISODate(startOfMonth(mk)), endISO: toISODate(endOfMonth(mk)), label: monthLabel(mk) });
      } else if (preset === 'last_month') {
        const d = new Date(now); d.setMonth(d.getMonth()-1);
        const mk = toMonthKey(d);
        setPeriod({ preset, startISO: toISODate(startOfMonth(mk)), endISO: toISODate(endOfMonth(mk)), label: monthLabel(mk) });
      }
    }

    // preset dropdown (hemat space)
    $('#presetSelect').addEventListener('change', () => {
      const preset = $('#presetSelect').value;
      STATE.period.preset = preset;
      $('#rangeCard').classList.toggle('hidden', preset !== 'custom');

      if (preset === 'custom') {
        $('#presetHint').textContent = 'Pilih tanggal mulai & sampai.';
        return;
      }

      $('#presetHint').textContent = '—';
      applyPreset(preset);
      setMonthPopover(false);
    });

    $('#btnApplyRange').addEventListener('click', () => {
      const s = $('#rangeStart').value;
      const e = $('#rangeEnd').value;
      if (!s || !e) {
        $('#rangeHint').textContent = 'Isi tanggal mulai & sampai.';
        return;
      }
      setPeriod({ preset:'custom', startISO: s, endISO: e, label: dateLabelRange(s,e) });
      setMonthPopover(false);
    });

    $('#btnClearFilters').addEventListener('click', () => {
      STATE.filters = { q:'', type:'', category:'', account:'' };
      STATE.focusCategory = null;
      $('#qSearch').value = '';
      $('#fType').value = '';
      $('#fCategory').value = '';
      $('#fAccount').value = '';
      rerender();
    });

    $('#qSearch').addEventListener('input', () => { STATE.filters.q = $('#qSearch').value; rerender(); });
    $('#fType').addEventListener('change', () => { STATE.filters.type = $('#fType').value; rerender(); });
    $('#fCategory').addEventListener('change', () => {
      STATE.filters.category = $('#fCategory').value;
      if (STATE.filters.category) STATE.focusCategory = null;
      rerender();
    });
    $('#fAccount').addEventListener('change', () => { STATE.filters.account = $('#fAccount').value; rerender(); });

    $('#btnFocusCategory').addEventListener('click', () => { STATE.focusCategory = null; rerender(); });

    // Saldo toggle (mobile + desktop)
['#btnSaldoToggle', '#btnSaldoToggleDesktop'].forEach((sel) => {
  const el = $(sel);              // $ = document.querySelector
  if (!el) return;

  el.addEventListener('click', (e) => {
    // Kalau yang diklik adalah tombol periode (mobile atau desktop), jangan toggle dashboard
    if (
      e?.target &&
      (e.target.closest?.('#btnPeriodToggle') ||
       e.target.closest?.('#btnPeriodToggleDesktop'))
    ) {
      return;
    }

    STATE.ui.dashboardOpen = !STATE.ui.dashboardOpen;

    if (STATE.ui.dashboardOpen) {
      requestAnimationFrame(() =>
        $('#dashboardExpanded')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        }),
      );
    }

    rerender();
  });
});

    // Accessibility: Enter/Space on saldo card
    $('#btnSaldoToggle').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      STATE.ui.dashboardOpen = !STATE.ui.dashboardOpen;
      rerender();
    });

    // Menu shortcuts
    $('#btnOpenQuick').addEventListener('click', () => { closeMenu(); openAddSheet('quick'); });
    $('#btnOpenAdvisor').addEventListener('click', () => { closeMenu(); openAdvisor(); });
    $('#btnOpenBudget').addEventListener('click', () => { closeMenu(); openBudget(); });

    $('#btnMoreAccounts').addEventListener('click', () => openAccounts());

    // Budget button
    $('#btnEditBudget').addEventListener('click', openBudget);

    // Settings interactions
    $('#toggleTheme').addEventListener('change', async () => {
      STATE.settings.theme = $('#toggleTheme').checked ? 'light' : 'dark';
      try { await saveSettings(); } catch {}
      applyTheme();
      rerender();
    });

    // Language save (explicit)
    $('#btnSaveLang').addEventListener('click', async () => {
      const lang = ($('#langSelect').value || 'id');
      STATE.settings.lang = (lang === 'en') ? 'en' : 'id';
      $('#langStatus').textContent = 'Menyimpan…';
      try {
        await saveSettings();
        $('#langStatus').textContent = 'Tersimpan.';
        applyLanguageAndReload();
      } catch {
        $('#langStatus').textContent = 'Gagal.';
      }
    });

    function syncSettingsFromToggles(){
      STATE.settings.showKPI = $('#toggleKPI').checked;
      STATE.settings.showBudget = $('#toggleBudget').checked;
      STATE.settings.showTrend = $('#toggleTrend').checked;
      STATE.settings.showCategory = $('#toggleCategory').checked;
      STATE.settings.showWeek = $('#toggleWeek').checked;
    }

    ['toggleKPI','toggleBudget','toggleTrend','toggleCategory','toggleWeek'].forEach(id => {
      $(`#${id}`).addEventListener('change', async () => {
        syncSettingsFromToggles();
        try { await saveSettings(); } catch {}
        destroyCharts();
        rerender();
      });
    });

    // User interactions
    $('#btnSaveUser').addEventListener('click', async () => {
      const name = ($('#uName').value || '').trim();
      if (!name) { $('#userStatus').textContent = 'Nama wajib diisi.'; return; }

      try {
        await saveProfile({ name });
        await loadProfileAndSettings();
        $('#userStatus').textContent = 'Tersimpan.';
        rerender();
        setTimeout(()=>{ $('#userStatus').textContent = '—'; }, 1200);
      } catch {
        $('#userStatus').textContent = 'Gagal.';
      }
    });

    $('#btnUpdatePassword').addEventListener('click', async () => {
      const p1 = ($('#uNewPass').value||'').trim();
      const p2 = ($('#uNewPass2').value||'').trim();
      if (!p1 || p1.length < 8) { $('#userStatus').textContent = 'Password minimal 8 karakter.'; return; }
      if (p1 !== p2) { $('#userStatus').textContent = 'Password tidak sama.'; return; }
      try {
        const { error } = await STATE.db.supa.auth.updateUser({ password: p1 });
        if (error) throw error;
        $('#userStatus').textContent = 'Password diperbarui.';
        $('#uNewPass').value = '';
        $('#uNewPass2').value = '';
        setTimeout(()=>{ $('#userStatus').textContent = '—'; }, 1600);
      } catch {
        $('#userStatus').textContent = 'Gagal update password.';
      }
    });

    $('#btnSignOut').addEventListener('click', async () => {
      try {
        await STATE.db.supa.auth.signOut();
        $('#signOutStatus').textContent = 'Keluar.';
        resetToHome({ keepPeriod: true });
      } catch {
        $('#signOutStatus').textContent = 'Gagal keluar.';
      }
    });

    // =========================
    // Reset / Logo behavior
    // =========================
    function resetToHome({ keepPeriod = true } = {}){
      closeAddSheet();
      closeAdvisor();
      closeMenu();
      closeUser();
      closeAccounts();
      closeAccountDetail();
      closeEditModal();
      closeBudget();

      STATE.ui.monthPopoverOpen = false;
      STATE.ui.dashboardOpen = false;
      STATE.ui.receiptPickerOpened = false;
      STATE.focusCategory = null;

      STATE.filters = { q:'', type:'', category:'', account:'' };
      $('#qSearch').value = '';
      $('#fType').value = '';
      $('#fCategory').value = '';
      $('#fAccount').value = '';

      if (!keepPeriod) initDefaultPeriod();

      STATE.parsedDraft = null;
      STATE.receiptDraft = null;
      STATE.budgetDraft = null;

      $('#quickPreview').classList.add('hidden');
      $('#quickText').value = '';
      $('#parseStatus').textContent = '';

      $('#receiptTxWrap').classList.add('hidden');
      $('#rFile').value = '';
      $('#ocrStatus').textContent = '';

      window.scrollTo({ top: 0, behavior: 'smooth' });
      rerender();
    }

    // Logo sekarang membuka Advisor (lihat handler di bagian Header interactions)

    // Close buttons
    $$('[data-close="true"]').forEach(el => el.addEventListener('click', closeAddSheet));
    $$('[data-close-advisor="true"]').forEach(el => el.addEventListener('click', closeAdvisor));
    $$('[data-close-menu="true"]').forEach(el => el.addEventListener('click', closeMenu));
    $$('[data-close-user="true"]').forEach(el => el.addEventListener('click', closeUser));
    $$('[data-close-edit="true"]').forEach(el => el.addEventListener('click', closeEditModal));
    $$('[data-close-budget="true"]').forEach(el => el.addEventListener('click', closeBudget));
    $$('[data-close-bd="true"]').forEach(el => el.addEventListener('click', () => closeSheet($('#budgetDetailBackdrop'), $('#budgetDetailSheet'))));

    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      resetToHome({ keepPeriod: true });
    });

    // =========================
    // Init
    // =========================
    (async function init(){
      const bootStarted = Date.now();
      const MIN_LOADER_MS = 450;

      function hideLoadingOverlay() {
        const loader = $('#loadingOverlay');
        if (!loader) return;
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.visibility = 'hidden'; }, 500);
      }

      $('#appShell').classList.add('hidden');
      // show auth overlay while bootstrapping to avoid blank screen
      try { showAuth(); } catch {}

      initDefaultPeriod();
      setTab('quick');

      // initial UI language from defaults (will be replaced after profile loads)
      try { applyLanguageToUI(); } catch {}

      try {
        if (!window.supabase?.createClient) {
          $('#authOverlay')?.classList.remove('hidden');
          $('#authStatus').textContent = 'Gagal memuat Supabase SDK. Cek koneksi internet / adblock.';
        } else {
          await initSupabase();
        }
      } catch (e) {
        console.error('Init error', e);
        $('#authOverlay')?.classList.remove('hidden');
        $('#authStatus').textContent = 'Gagal inisialisasi. Coba refresh atau hubungi admin.';
      }

      const elapsed = Date.now() - bootStarted;
      await sleep(Math.max(0, MIN_LOADER_MS - elapsed));
      hideLoadingOverlay();

      // Print
      $('#btnPrintReport')?.addEventListener('click', () => printReport());

      // default date
      if ($('#mDate')) $('#mDate').value = toISODate(new Date());
      if ($('#mAccount')) $('#mAccount').value = getLastUsedAccount();

      rerender();
    })();

    // =========================
    // Refresh UI (satu pintu masuk)
    // =========================
    async function refreshAllUI(opts) {
      opts = opts || {};
      var syncRemote = opts.syncRemote !== false;
      if (syncRemote && typeof refreshTransactionsRange === 'function') {
        try { await refreshTransactionsRange(); } catch (e) { console.warn('refreshTransactionsRange', e); }
      }
      if (typeof renderTransactionList === 'function') renderTransactionList();
      if (typeof renderTransactions === 'function') renderTransactions();
      if (typeof renderTxList === 'function') renderTxList();
      if (typeof renderBudgetRows === 'function') renderBudgetRows();
      if (typeof updateBudgetSheetDerived === 'function') updateBudgetSheetDerived();
      if (typeof renderDashboardStats === 'function') renderDashboardStats();
      if (typeof updateSaldoAsync === 'function') {
        try { await updateSaldoAsync(); } catch (e) { console.warn('updateSaldoAsync', e); }
      }
      if (typeof rerender === 'function') rerender();
    }
    window.refreshAllUI = refreshAllUI;
    window.refreshAppSchedules = function () { return refreshAllUI({ syncRemote: false }); };
    window.forceRefreshUI = function () { return refreshAllUI({ syncRemote: false }); };

    (function setupBtnMenuTutorial() {
      function bind() {
        var btnMenu = document.getElementById('btnMenu');
        if (!btnMenu) return;
        btnMenu.addEventListener(
          'click',
          function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (typeof openTutorial === 'function') openTutorial();
          },
          true
        );
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
      } else {
        bind();
      }
    })();

    // PWA: Service worker registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker
          // Gunakan path relatif terhadap `index.html` agar kompatibel untuk deploy subfolder
          .register('./sw.js')
          .catch(function (err) {
            console.error('Service worker registration failed:', err);
          });
      });
    }
