// Affischsidan: ritar QR-koden lokalt och hanterar Skriv ut.
(() => {
  const I = window.WF_I18N;
  I.applyStatic();

  // Sidan ligger i samma mapp som qr.html.
  const url = new URL('./', location.href).href;

  function draw() {
    const box = document.getElementById('qr');
    document.getElementById('urlText').textContent = url;
    if (typeof qrcode === 'undefined') { box.innerHTML = ''; return; }
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    // Hex-färger i stället för namn, så inget läge kan tolka om dem.
    box.innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true })
      .replace(/fill="white"/g, 'fill="#ffffff"').replace(/fill="black"/g, 'fill="#000000"');
  }

  document.getElementById('print').addEventListener('click', () => window.print());
  draw();
})();
