(function () {
  if (!document.body.classList.contains("page-form")) return;
  const cfg = window.FICHADA_CONFIG;
  const { verifyToken } = window.FichadaToken;

  const form = document.getElementById("fichada-form");
  const signinCard = document.getElementById("signin-card");
  const signinBtnHost = document.getElementById("google-signin-btn");
  const signinStatus = document.getElementById("signin-status");
  const userEmailLbl = document.getElementById("user-email");
  const changeAccountBtn = document.getElementById("change-account");
  const submitBtn = document.getElementById("submit-btn");
  const clearBtn = document.getElementById("clear-btn");
  const statusEl = document.getElementById("form-status");
  const eventoErr = document.getElementById("evento-error");
  const sink = document.getElementById("gforms_sink");

  const params = new URLSearchParams(location.search);
  const token = params.get("t");

  let verifiedEmail = null;

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
    wireUp();
    waitForGisAndInit();
  }

  function showInvalidToken() {
    signinCard.hidden = true;
    form.hidden = true;
    statusEl.dataset.state = "error";
    statusEl.classList.add("form-status--banner");
    statusEl.textContent = token
      ? "El codigo QR expiro. Volve a escanear el QR de la pantalla de fichada."
      : "Esta pagina solo es accesible escaneando el QR de fichada de la sede.";
  }

  function waitForGisAndInit(retries) {
    retries = retries == null ? 50 : retries;
    if (typeof google !== "undefined" && google.accounts && google.accounts.id) {
      try {
        google.accounts.id.initialize({
          client_id: cfg.googleClientId,
          callback: onCredential,
          auto_select: false,
          cancel_on_tap_outside: false,
        });
        google.accounts.id.renderButton(signinBtnHost, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
          locale: "es",
          width: 260,
        });
      } catch (err) {
        signinStatus.dataset.state = "error";
        signinStatus.textContent =
          "No se pudo inicializar Google Sign-In: " + err.message;
      }
      return;
    }
    if (retries <= 0) {
      signinStatus.dataset.state = "error";
      signinStatus.textContent =
        "No se pudo cargar Google Sign-In. Revisa la conexión.";
      return;
    }
    setTimeout(function () {
      waitForGisAndInit(retries - 1);
    }, 100);
  }

  function onCredential(response) {
    try {
      const payload = parseJwt(response.credential);
      if (!payload.email || payload.email_verified === false) {
        throw new Error("Cuenta sin correo verificado.");
      }
      verifiedEmail = payload.email;
      userEmailLbl.textContent = verifiedEmail;
      changeAccountBtn.hidden = false;
      signinCard.hidden = true;
      form.hidden = false;
      statusEl.textContent = "";
      statusEl.removeAttribute("data-state");
    } catch (err) {
      signinStatus.dataset.state = "error";
      signinStatus.textContent =
        "No se pudo procesar el inicio de sesión: " + err.message;
    }
  }

  function onChangeAccount() {
    try {
      if (typeof google !== "undefined" && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
      }
    } catch (_) {}
    verifiedEmail = null;
    userEmailLbl.textContent = "No iniciaste sesión";
    changeAccountBtn.hidden = true;
    form.hidden = true;
    signinCard.hidden = false;
    signinStatus.textContent = "";
    signinStatus.removeAttribute("data-state");
  }

  function wireUp() {
    form.addEventListener("submit", onSubmit);
    clearBtn.addEventListener("click", function () {
      form.reset();
      eventoErr.hidden = true;
      statusEl.textContent = "";
      statusEl.removeAttribute("data-state");
    });
    changeAccountBtn.addEventListener("click", onChangeAccount);
  }

  async function onSubmit(e) {
    e.preventDefault();
    eventoErr.hidden = true;

    if (!verifiedEmail) {
      statusEl.dataset.state = "error";
      statusEl.textContent =
        "Tenés que iniciar sesión con Google antes de fichar.";
      return;
    }

    const eventoEl = form.querySelector('input[name="evento"]:checked');
    const evento = eventoEl ? eventoEl.value : "";
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

    submitBtn.disabled = true;
    statusEl.removeAttribute("data-state");
    statusEl.textContent = "Enviando...";

    try {
      await submitToGoogleForm(verifiedEmail, evento);
      statusEl.dataset.state = "ok";
      statusEl.textContent = 'Fichaste "' + evento + '" correctamente.';
      form.reset();
    } catch (err) {
      statusEl.dataset.state = "error";
      statusEl.textContent =
        "No se pudo enviar la fichada. Reintenta en unos segundos.";
    } finally {
      submitBtn.disabled = false;
    }
  }

  function submitToGoogleForm(email, evento) {
    return new Promise(function (resolve, reject) {
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
      const onLoad = function () {
        if (settled) return;
        settled = true;
        sink.removeEventListener("load", onLoad);
        ghost.remove();
        resolve();
      };
      sink.addEventListener("load", onLoad);
      ghost.submit();

      setTimeout(function () {
        if (settled) return;
        settled = true;
        sink.removeEventListener("load", onLoad);
        ghost.remove();
        reject(new Error("timeout"));
      }, 8000);
    });
  }

  function addHidden(formEl, name, value) {
    const inp = document.createElement("input");
    inp.type = "hidden";
    inp.name = name;
    inp.value = value;
    formEl.appendChild(inp);
  }

  function parseJwt(t) {
    const base64Url = t.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(json);
  }
})();
