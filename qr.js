(function () {
  const cfg = window.FICHADA_CONFIG;
  const { buildToken, secondsUntilNextBucket } = window.FichadaToken;
  const canvas = document.getElementById("qr-canvas");
  const secsEl = document.getElementById("qr-secs");
  const barFill = document.getElementById("qr-bar-fill");
  const warn = document.getElementById("qr-warn");

  if (typeof QRCode === "undefined") {
    showWarn(
      "No se pudo cargar la libreria QR. Revisa la conexion a internet de esta pantalla."
    );
    return;
  }
  if (cfg.hmacSecret.indexOf("CAMBIAR") !== -1) {
    showWarn(
      "Configuracion incompleta: cambiar hmacSecret en config.js por uno propio antes de usar en produccion."
    );
  }

  let lastToken = null;

  async function tick() {
    try {
      const token = await buildToken(cfg.hmacSecret, cfg.tokenPeriodSec);
      if (token !== lastToken) {
        lastToken = token;
        const url = buildFichadaUrl(token);
        await renderQr(url);
      }
      const left = secondsUntilNextBucket(cfg.tokenPeriodSec);
      secsEl.textContent = String(Math.max(0, Math.ceil(left)));
      const pct = Math.max(0, Math.min(1, left / cfg.tokenPeriodSec));
      barFill.style.transform = "scaleX(" + pct + ")";
    } catch (err) {
      showWarn("Error generando token: " + err.message);
    }
  }

  function buildFichadaUrl(token) {
    const u = new URL("./", location.href);
    u.searchParams.set("t", token);
    return u.toString();
  }

  function renderQr(text) {
    return new Promise((resolve, reject) => {
      QRCode.toCanvas(
        canvas,
        text,
        {
          width: 320,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#202124", light: "#ffffff" },
        },
        (err) => (err ? reject(err) : resolve())
      );
    });
  }

  function showWarn(msg) {
    warn.hidden = false;
    warn.textContent = msg;
  }

  tick();
  setInterval(tick, 250);
})();
