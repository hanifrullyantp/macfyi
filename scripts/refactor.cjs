/**
 * One-shot refactor: perbaiki template print, config, init, refresh, ekstrak CSS/JS, perbarui index.html
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const indexPath = path.join(root, "index.html");
const reportTplPath = path.join(__dirname, "print-report-template.txt");

let html = fs.readFileSync(indexPath, "utf8");

// --- 1. Print report template ---
const reportTpl = fs.readFileSync(reportTplPath, "utf8");
const reportRe = /return `<!doctype html>\s*<html>[\s\S]*?<\/html>`;/;
if (!reportRe.test(html)) {
  console.error("report template pattern not found");
  process.exit(1);
}
html = html.replace(reportRe, reportTpl.trim());

// --- 2. Supabase / checkout / admin → CFG ---
const oldCfg = `    // =========================
    // SUPABASE CONFIG
    // =========================
    const SUPABASE_URL = 'https://zzwqfmdyncxbolestkqp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6d3FmbWR5bmN4Ym9sZXN0a3FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDI3OTQsImV4cCI6MjA4MTkxODc5NH0.qtvqzDicRmIixFh3A46ExuitpAXDWaYHmB7NVBxsc7w';
    const SUPABASE_FN_PARSE = 'asfin-parse-transaction';
    const SUPABASE_FN_COACH = 'ai-user-coach';

    // Checkout links (fallback if app_config not set)
    const MONTHLY_CHECKOUT_URL = 'http://lynk.id/asfin-ai/9zexz9z5wom1/checkout';
    const LIFETIME_CHECKOUT_URL = 'http://lynk.id/asfin-ai/j3q0x5ke3g49/checkout';

    // =========================
    // PDF Export (Print report)
    // =========================
    // Uses native browser Print-to-PDF. For best result, use Chrome/Safari.

    // =========================
    // Admin & Global App Config
    // =========================
    // Ganti email admin di sini (atau kelola via table/claims di Supabase)
    const ADMIN_EMAILS = ['admin@asfin.app'];`;

const newCfg = `    // =========================
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
    const ADMIN_EMAILS = Array.isArray(CFG.adminEmails) && CFG.adminEmails.length ? CFG.adminEmails : ['admin@asfin.app'];`;

if (!html.includes(oldCfg.slice(0, 80))) {
  console.error("SUPABASE config block not found (maybe already patched?)");
  process.exit(1);
}
html = html.replace(oldCfg, newCfg);

// --- 3. Init: loader mengikuti boot, bukan timer 2.5s ---
const initOld = `    (async function init(){
      // Initial animation delay
      setTimeout(() => {
        const loader = $('#loadingOverlay');
        loader.style.opacity = '0';
        setTimeout(() => loader.style.visibility = 'hidden', 500);
      }, 2500);

      $('#appShell').classList.add('hidden');`;

const initNew = `    (async function init(){
      const bootStarted = Date.now();
      const MIN_LOADER_MS = 450;

      function hideLoadingOverlay() {
        const loader = $('#loadingOverlay');
        if (!loader) return;
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.visibility = 'hidden'; }, 500);
      }

      $('#appShell').classList.add('hidden');`;

html = html.replace(initOld, initNew);

const initTailOld = `      } catch (e) {
        console.error('Init error', e);
        $('#authOverlay')?.classList.remove('hidden');
        $('#authStatus').textContent = 'Gagal inisialisasi. Coba refresh atau hubungi admin.';
      }

      // Print`;

const initTailNew = `      } catch (e) {
        console.error('Init error', e);
        $('#authOverlay')?.classList.remove('hidden');
        $('#authStatus').textContent = 'Gagal inisialisasi. Coba refresh atau hubungi admin.';
      }

      const elapsed = Date.now() - bootStarted;
      await sleep(Math.max(0, MIN_LOADER_MS - elapsed));
      hideLoadingOverlay();

      // Print`;

html = html.replace(initTailOld, initTailNew);

// --- 4. Service worker path + basePath ---
html = html.replace(
  `.register('/sw.js')`,
  `.register((function(){ var b = String((window.MONEFYI_CONFIG && window.MONEFYI_CONFIG.basePath) || '').trim().replace(/\\/+$/, ''); var p = '/sw.js'; return b ? b + p : p; })())`
);

// --- 5. Refresh + btnMenu (gabung, hapus script kedua nanti) ---
const pwaMarker = `    // PWA: Service worker registration`;
const pwaInsert = `    // =========================
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
    window.refreshAppSchedules = function () { return refreshAllUI({ syncRemote: false }); };
    window.forceRefreshUI = function () { return refreshAllUI({ syncRemote: false }); };

    document.addEventListener('DOMContentLoaded', function () {
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
    });

    // PWA: Service worker registration`;

if (!html.includes(pwaMarker)) {
  console.error("PWA marker not found");
  process.exit(1);
}
html = html.replace(pwaMarker, pwaInsert);

// --- 6. Hapus script kedua (btnMenu lama + refresh duplikat) ---
const secondScriptRe = /\n  <script>\n\/\/ Override tombol btnMenu[\s\S]*?<\/script>(?=\n<\/body>)/;
html = html.replace(secondScriptRe, "\n");

// --- 7. Ekstrak CSS (blok <style> pertama) ---
const styleOpen = html.indexOf("<style>");
const styleClose = html.indexOf("</style>", styleOpen);
if (styleOpen === -1 || styleClose === -1) {
  console.error("style block not found");
  process.exit(1);
}
const cssInner = html
  .slice(styleOpen + "<style>".length, styleClose)
  .replace(/^\n/, "")
  .replace(/\n$/, "");
const cssDir = path.join(root, "css");
const jsDir = path.join(root, "js");
fs.mkdirSync(cssDir, { recursive: true });
fs.mkdirSync(jsDir, { recursive: true });
fs.writeFileSync(path.join(cssDir, "app.css"), cssInner + "\n", "utf8");

// --- 8. Ekstrak inline app script ---
const scriptStartNeedle = '  <script>\n    // =========================\n    // SUPABASE CONFIG';
const scriptStart = html.indexOf(scriptStartNeedle);
if (scriptStart === -1) {
  console.error("app script start not found");
  process.exit(1);
}
const subFromScript = html.slice(scriptStart);
const twoScripts = subFromScript.match(/\n  <\/script>\s*\n\s*<script/);
let scriptEnd;
if (twoScripts) {
  scriptEnd = scriptStart + twoScripts.index;
} else {
  const oneScript = subFromScript.match(/\n  <\/script>\s*\n\s*<\/body>/);
  if (!oneScript) {
    console.error("app script end not found");
    process.exit(1);
  }
  scriptEnd = scriptStart + oneScript.index;
}
const scriptInner = html.slice(scriptStart + "  <script>\n".length, scriptEnd);
fs.writeFileSync(path.join(jsDir, "app.js"), scriptInner + "\n", "utf8");

// --- 9. Ganti CDN + hapus <style>, ganti inline script → app.js defer ---
const cdnStart = html.indexOf('  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss');
if (cdnStart === -1) {
  console.error("tailwind cdn not found");
  process.exit(1);
}
const styleEnd = styleClose + "</style>".length;

const newHeadLibs = `  <script src="js/config.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.2.2" integrity="sha384-qKt1F1k7v69ebd7q6Na1d2FGVMI+43GgA5hpfz7i+zDfrz8rIjXYu7majL1fXSeS" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js" integrity="sha384-9nhczxUqK87bcKHh20fSQcTGD4qq5GhayNYSYWqwBkINBhOfQLg/P5HG5lF1urn4" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js" integrity="sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js" integrity="sha384-DvC+YdtlL7wvOOuSrDKDL78GehYjJ2hsSfAWUFv5Rz7YcdCjlLMADTYKYym7cZrB" crossorigin="anonymous"></script>
  <link rel="stylesheet" href="css/app.css" />
`;

html =
  html.slice(0, cdnStart) +
  newHeadLibs +
  "\n" +
  html.slice(styleEnd);

const ss = html.indexOf(scriptStartNeedle);
const subTail = ss === -1 ? "" : html.slice(ss);
const endMatch = subTail.match(/\n  <\/script>\s*\n\s*<\/body>/);
if (ss === -1 || !endMatch) {
  console.error("re-split script failed");
  process.exit(1);
}
const se = ss + endMatch.index;
html =
  html.slice(0, ss) +
  '  <script src="js/app.js" defer></script>' +
  html.slice(se + endMatch[0].indexOf("</script>") + "</script>".length);

fs.writeFileSync(indexPath, html, "utf8");
console.log("OK: index.html, css/app.css, js/app.js updated.");
