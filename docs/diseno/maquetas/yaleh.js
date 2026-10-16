/* YALEH · íconos, logo y selector de tema para las maquetas.
   Los íconos son trazos estilo Lucide (los mismos que usa la app). */
(function () {
  var I = {
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M4 2C2.8 3.7 2 5.7 2 8"/><path d="M22 8c0-2.3-.8-4.3-2-6"/>',
    extend: '<path d="M10 2h4"/><path d="M12 14v-4"/><path d="M4 13a8 8 0 0 1 8-7 8 8 0 1 1-5.3 14L4 17.6"/><path d="M9 17H4v5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    file: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    cards: '<rect x="2" y="6" width="14" height="14" rx="2"/><path d="M8 2h12a2 2 0 0 1 2 2v12"/>',
    quiz: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    report: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><path d="M8 18v-3M12 18v-6M16 18v-2"/>',
    mind: '<circle cx="12" cy="12" r="3"/><circle cx="4" cy="5" r="2"/><circle cx="20" cy="5" r="2"/><circle cx="4" cy="19" r="2"/><circle cx="20" cy="19" r="2"/><path d="m6 6.5 3.6 3.6M18 6.5l-3.6 3.6M6 17.5l3.6-3.6M18 17.5l-3.6-3.6"/>',
    table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    slides: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    note: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    wifiOff: '<path d="M12 20h.01M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.7M19 12.9a10 10 0 0 0-2.3-1.6M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8a15 15 0 0 0-11.3-3.8M2 2l20 20"/>',
    play: '<path d="m6 3 14 9-14 9z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>'
  };
  document.querySelectorAll('i[data-i]').forEach(function (el) {
    var svg = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (I[el.dataset.i] || '') + '</svg>';
    el.insertAdjacentHTML('afterend', svg);
    var made = el.nextElementSibling;
    if (el.className) made.setAttribute('class', 'ic ' + el.className);
    if (el.getAttribute('style')) made.setAttribute('style', el.getAttribute('style'));
    el.remove();
  });

  /* Logo: estudiante con birrete + destellos de IA en círculo negro, escudo naranja con candado. */
  var LOGO =
    '<svg viewBox="0 0 100 100" role="img" aria-label="YALEH">' +
    '<circle cx="46" cy="48" r="40" fill="var(--logo-disc)" stroke="var(--logo-ring)" stroke-width="1.5"/>' +
    '<g fill="#F7941D">' +
    '<path d="M22 17Q22 26 31 26Q22 26 22 35Q22 26 13 26Q22 26 22 17Z"/>' +
    '<path d="M31 12Q31 17 36 17Q31 17 31 22Q31 17 26 17Q31 17 31 12Z"/>' +
    '<path d="M31 78Q31 65 42 62L48 68L54 62Q65 65 65 78Q48 82 31 78Z"/>' +
    '<ellipse cx="48" cy="50" rx="9.5" ry="10.5"/>' +
    '</g>' +
    '<path d="M37 36H59V43L48 47L37 43Z" fill="#F7941D" stroke="var(--logo-disc)" stroke-width="1.6"/>' +
    '<path d="M28 33L48 25.5L68 33L48 40Z" fill="#F7941D" stroke="var(--logo-disc)" stroke-width="1.2"/>' +
    '<path d="M31 33.5V44" stroke="#F7941D" stroke-width="1.8" stroke-linecap="round"/>' +
    '<path d="M31 43.5l2.3 3.2L31 50l-2.3-3.3Z" fill="#F7941D"/>' +
    '<path d="M42 62L48 68L54 62" fill="none" stroke="var(--logo-disc)" stroke-width="1.6"/>' +
    '<path d="M38 70V79" stroke="var(--logo-disc)" stroke-width="1.6"/>' +
    '<path d="M67 53L82 47.5L97 53V67C97 79 89 87 82 91C75 87 67 79 67 67Z" fill="#F7941D" stroke="var(--logo-disc)" stroke-width="2"/>' +
    '<path d="M77 66V61.5a5 5 0 0 1 10 0V66" fill="none" stroke="#111010" stroke-width="2.8"/>' +
    '<rect x="74" y="65" width="16" height="13" rx="2.6" fill="#111010"/>' +
    '</svg>';
  document.querySelectorAll('[data-logo]').forEach(function (el) { el.innerHTML = LOGO; });

  /* Selector de tema (solo para revisar las maquetas en claro y oscuro). */
  var root = document.documentElement;
  var btns = document.querySelectorAll('.theme-btn');
  function current() {
    return root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function paint() { btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.set === current())); }); }
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      root.dataset.theme = b.dataset.set;
      try { localStorage.setItem('yaleh-theme', b.dataset.set); } catch (e) {}
      paint();
    });
  });
  try { var saved = localStorage.getItem('yaleh-theme'); if (saved) root.dataset.theme = saved; } catch (e) {}
  paint();
})();
