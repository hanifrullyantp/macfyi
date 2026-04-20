/** Inject Meta Pixel + gtag + TikTok once when IDs are set (admin-configured). */

let pixelInjected = "";
let gaInjected = "";
let tiktokInjected = "";

export function injectFacebookPixel(pixelId: string): void {
  const id = pixelId.trim();
  if (!id || id === pixelInjected) return;
  pixelInjected = id;

  const s = document.createElement("script");
  s.innerHTML = `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${id.replace(/[^0-9]/g, "")}');
fbq('track', 'PageView');
`;
  document.head.appendChild(s);

  const nos = document.createElement("noscript");
  const img = document.createElement("img");
  img.height = 1;
  img.width = 1;
  img.style.display = "none";
  img.alt = "";
  img.src = `https://www.facebook.com/tr?id=${encodeURIComponent(id)}&ev=PageView&noscript=1`;
  nos.appendChild(img);
  document.body.appendChild(nos);
}

export function injectGoogleAnalytics(measurementId: string): void {
  const id = measurementId.trim();
  if (!id || id === gaInjected) return;
  gaInjected = id;

  const gtagScript = document.createElement("script");
  gtagScript.async = true;
  gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(gtagScript);

  const inline = document.createElement("script");
  inline.innerHTML = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id.replace(/[^A-Z0-9_-]/gi, "")}');
`;
  document.head.appendChild(inline);
}

/** TikTok Pixel — snippet resmi ringkas; `ttq.page()` setelah load. */
export function injectTikTokPixel(pixelId: string): void {
  const id = pixelId.trim().replace(/[^A-Z0-9]/gi, "");
  if (!id || id === tiktokInjected) return;
  tiktokInjected = id;

  const s = document.createElement("script");
  s.innerHTML = `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var i=document.createElement("script");i.type="text/javascript",i.async=!0,i.src=r+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(i,a)};ttq.load("${id}");ttq.page();}(window,document,'ttq');`;
  document.head.appendChild(s);
}
