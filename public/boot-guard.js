/*
 * Red de seguridad contra la «pantalla en blanco».
 * Si a los 4 segundos la aplicación no ha dibujado nada (un error al arrancar,
 * un archivo de recursos roto…), muestra un aviso legible en vez de dejar la
 * ventana vacía. Es un script clásico y externo para cumplir la política CSP.
 */
(function () {
  var lastError = '';
  function remember(msg) {
    if (msg) lastError = String(msg).slice(0, 600);
  }
  window.addEventListener('error', function (e) {
    remember(e && (e.message || (e.error && e.error.message)));
  });
  window.addEventListener('unhandledrejection', function (e) {
    remember(e && e.reason && (e.reason.message || e.reason));
  });

  setTimeout(function () {
    var app = document.getElementById('app');
    if (!app || app.children.length > 0) return;
    var box = document.createElement('div');
    box.style.cssText =
      'font:16px/1.5 system-ui,sans-serif;max-width:640px;margin:10vh auto;padding:24px;border:2px solid #d9480f;border-radius:10px;background:#fff7f0;color:#222';
    var h = document.createElement('h2');
    h.textContent = 'Comic Fast no pudo arrancar';
    h.style.margin = '0 0 8px';
    var p = document.createElement('p');
    p.textContent =
      'Si acabas de agregar fuentes o imágenes, lo más probable es que alguno de esos archivos esté dañado o mal escrito: quita lo último que agregaste y vuelve a abrir la aplicación. En el navegador, pulsa F12 y mira la pestaña «Consola» para ver el detalle.';
    box.appendChild(h);
    box.appendChild(p);
    if (lastError) {
      var pre = document.createElement('pre');
      pre.textContent = lastError;
      pre.style.cssText = 'white-space:pre-wrap;background:#fff;border:1px solid #ddd;padding:8px;border-radius:6px;font-size:13px';
      box.appendChild(pre);
    }
    document.body.appendChild(box);
  }, 4000);
})();
