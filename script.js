(function () {
  const cfg = window.FICHADA_CONFIG;
  const { verifyToken } = window.FichadaToken;

  const form = document.getElementById("fichada-form");
  const emailInput = document.getElementById("email-input");
  const rememberCb = document.getElementById("remember-email");
  const userEmailLbl = document.getElementById("user-email");
  const changeAccountBtn = document.getElementById("change-account");
  const submitBtn = document.getElementById("submit-btn");
  const clearBtn = document.getElementById("clear-btn");
  const statusEl = document.getElementById("form-status");
  const emailErr = document.getElementById("email-error");
  const eventoErr = document.getElementById("evento-error");
  const sink = document.getElementById("gforms_sink");

  const params = new URLSearchParams(location.search);
  const token = params.get("t");

  init();

  async function init() {
    const ok =
      token &&
      (await verifyToken(
        token,
        cfg.hmacSecret,
        cfg.tokenPeriodSec,
        cfg.tokenTolerance
      ));
    if (!ok) {
      showInvalidToken();
      return;
    }
    setupEmailMemory();
    wireUp();
  }

  function showInvalidToken() {
    form.hidden = true;
    statusEl.dataset.state = "error";
    statusEl.classList.add("form-status--banner");
    statusEl.textContent = token
      ? "El codigo QR expiro. Volve a escanear el QR de la pantalla de fichada."
      : "Esta pagina solo es accesible escaneando el QR de fichada de la sede.";
  }

  function setupEmailMemory() {
    const saved = localStorage.getItem("fichada.email");
    if (saved) {
      emailInput.value = saved;
      userEmailLbl.textContent = saved;
      rememberCb.checked = true;
    } else {
      userEmailLbl.textContent = "(sin correo)";
    }
    emailInput.addEventListener("input", () => {
      const v = emailInput.value.trim();
      userEmailLbl.textContent = v || "(sin correo)";
    });
    changeAccountBtn.addEventListener("click", () => {
      localStorage.removeItem("fichada.email");
      emailInput.value = "";
      userEmailLbl.textContent = "(sin correo)";
      rememberCb.checked = false;
      emailInput.focus();
    });
  }

  function wireUp() {
    form.addEventListener("submit", onSubmit);
    clearBtn.addEventListener("click", () => {
      form.reset();
      emailErr.hidden = true;
      eventoErr.hidden = true;
      statusEl.textContent = "";
      statusEl.removeAttribute("data-state");
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    emailErr.hidden = true;
    eventoErr.hidden = true;

    const email = emailInput.value.trim();
    const eventoEl = form.querySelector('input[name="evento"]:checked');
    const evento = eventoEl ? eventoEl.value : "";

    if (!isEmail(email)) {
      emailErr.hidden = false;
      emailInput.focus();
      return;
    }
    if (!evento) {
      eventoErr.hidden = false;
      return;
    }

    const stillValid = await verifyToken(
      token,
      cfg.hmacSecret,
      cfg.tokenPeriodSec,
      cfg.tokenTolerance
    );
    if (!stillValid) {
      statusEl.dataset.state = "error";
      statusEl.textContent =
        "El codigo QR expiro mientras llenabas el formulario. Escanea uno nuevo.";
      return;
    }

    if (rememberCb.checked) {
      localStorage.setItem("fichada.email", email);
    } else {
      localStorage.removeItem("fichada.email");
    }

    submitBtn.disabled = true;
    statusEl.removeAttribute("data-state");
    statusEl.textContent = "Enviando...";

    try {
      await submitToGoogleForm(email, evento);
      statusEl.dataset.state = "ok";
      statusEl.textContent = 'Fichaste "' + evento + '" correctamente.';
      resetAfterSuccess();
    } catch (err) {
      statusEl.dataset.state = "error";
      statusEl.textContent =
        "No se pudo enviar la fichada. Reintenta en unos segundos.";
    } finally {
      submitBtn.disabled = false;
    }
  }

  function submitToGoogleForm(email, evento) {
    return new Promise((resolve, reject) => {
      if (
        !cfg.eventoEntryId ||
        cfg.eventoEntryId.indexOf("REEMPLAZAR") !== -1
      ) {
        reject(new Error("eventoEntryId no configurado"));
        return;
      }
      if (
        cfg.emailMode === "entry" &&
        (!cfg.emailEntryId || cfg.emailEntryId.indexOf("REEMPLAZAR") !== -1)
      ) {
        reject(new Error("emailEntryId no configurado"));
        return;
      }

      const ghost = document.createElement("form");
      ghost.action = cfg.formActionUrl;
      ghost.method = "POST";
      ghost.target = "gforms_sink";
      ghost.style.display = "none";

      addHidden(ghost, cfg.eventoEntryId, evento);
      if (cfg.emailMode === "entry") {
        addHidden(ghost, cfg.emailEntryId, email);
      } else {
        addHidden(ghost, "emailAddress", email);
      }
      addHidden(ghost, "fvv", "1");
      addHidden(ghost, "draftResponse", "[]");
      addHidden(ghost, "pageHistory", "0");

      document.body.appendChild(ghost);

      let settled = false;
      const onLoad = () => {
        if (settled) return;
        settled = true;
        sink.removeEventListener("load", onLoad);
        ghost.remove();
        resolve();
      };
      sink.addEventListener("load", onLoad);
      ghost.submit();

      setTimeout(() => {
        if (settled) return;
        settled = true;
        sink.removeEventListener("load", onLoad);
        ghost.remove();
        reject(new Error("timeout"));
      }, 8000);
    });
  }

  function resetAfterSuccess() {
    form.reset();
    const saved = localStorage.getItem("fichada.email");
    if (saved) {
      emailInput.value = saved;
      rememberCb.checked = true;
      userEmailLbl.textContent = saved;
    } else {
      userEmailLbl.textContent = "(sin correo)";
    }
  }

  function addHidden(formEl, name, value) {
    const inp = document.createElement("input");
    inp.type = "hidden";
    inp.name = name;
    inp.value = value;
    formEl.appendChild(inp);
  }

  function isEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }
})();
