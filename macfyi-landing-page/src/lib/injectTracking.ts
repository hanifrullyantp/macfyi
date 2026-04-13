/** Inject Meta Pixel + gtag once when IDs are set (admin-configured). */

let pixelInjected = "";
let gaInjected = "";

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
