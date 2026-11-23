// Ajustá aquí la fecha y hora oficial del evento MOTO'S RANCH
const EVENT_TARGET_ISO = "2026-12-12T20:00:00-03:00";
const INTRO_PLAY_DURATION_MS = 6000;
const INTRO_FADE_OUT_START_MS = 4000;
const STATUS_DISPLAY_MS = 2000;
const DASHBOARD_STORAGE_KEY = "motos_ranch_dashboard_v1";

// Enlaces de redes sociales y punto futuro de conexión con PHP
const WHATSAPP_URL = "https://wa.me/";
const INSTAGRAM_URL = "https://instagram.com/";
const RAFFLE_PHP_ENDPOINT = null;

const dom = {
  body: document.body,
  bgVideoLayer: document.getElementById("bgVideoLayer"),
  bgLoopVideo: document.getElementById("bgLoopVideo"),
  introOverlay: document.getElementById("introOverlay"),
  introVideo: document.getElementById("introVideo"),
  introLaunchBar: document.getElementById("introLaunchBar"),
  openInviteBtn: document.getElementById("openInviteBtn"),
  skipIntroBtn: document.getElementById("skipIntroBtn"),
  inviteMain: document.getElementById("inviteMain"),
  eventDateDisplay: document.getElementById("eventDateDisplay"),
  countdownDisplay: document.getElementById("countdownDisplay"),
  btnDateInfo: document.getElementById("btnDateInfo"),
  btnCountdownInfo: document.getElementById("btnCountdownInfo"),
  quickFeedback: document.getElementById("quickFeedback"),
  formWrapper: document.getElementById("formWrapper"),
  rsvpForm: document.getElementById("rsvpForm"),
  guestName: document.getElementById("guestName"),
  raffleOptIn: document.getElementById("raffleOptIn"),
  confirmBtn: document.getElementById("confirmBtn"),
  formError: document.getElementById("formError"),
  forgotNumberBtn: document.getElementById("forgotNumberBtn"),
  forgotNumberPanel: document.getElementById("forgotNumberPanel"),
  lookupExactName: document.getElementById("lookupExactName"),
  lookupAcceptBtn: document.getElementById("lookupAcceptBtn"),
  lookupCloseBtn: document.getElementById("lookupCloseBtn"),
  lookupResultText: document.getElementById("lookupResultText"),
  statusMessageBox: document.getElementById("statusMessageBox"),
  statusMessageText: document.getElementById("statusMessageText"),
  whatsappLink: document.getElementById("whatsappLink"),
  instagramLink: document.getElementById("instagramLink")
};

if (dom.whatsappLink) dom.whatsappLink.href = WHATSAPP_URL;
if (dom.instagramLink) dom.instagramLink.href = INSTAGRAM_URL;

let introStarted = false;
let introFinished = false;
let introSixSecTimer = null;
let introAudioFadeInterval = null;
let statusTimeoutId = null;
let statusHideTimeoutId = null;

// 1. VIDEO INICIAL DETENIDO EN 0.00 -> 6 SEGUNDOS TRAS CLICK (FADE OUT DE AUDIO EN LOS ÚLTIMOS 2S)
function freezeIntroAtZero() {
  if (!dom.introVideo) return;
  dom.introVideo.pause();
  dom.introVideo.volume = 1;
  try {
    dom.introVideo.currentTime = 0;
  } catch {
    // Espera metadatos si el navegador aún no cargó el cuadro inicial
  }
}

if (dom.introVideo) {
  freezeIntroAtZero();
  dom.introVideo.addEventListener("loadedmetadata", freezeIntroAtZero);
  dom.introVideo.addEventListener("loadeddata", freezeIntroAtZero);
}

function clearIntroAudioFade() {
  if (introAudioFadeInterval) {
    clearInterval(introAudioFadeInterval);
    introAudioFadeInterval = null;
  }
}

function startTwoSecondAudioFadeOut() {
  if (!dom.introVideo || dom.introVideo.muted) return;
  clearIntroAudioFade();

  const fadeDurationMs = INTRO_PLAY_DURATION_MS - INTRO_FADE_OUT_START_MS;
  const tickMs = 50;
  const initialVolume = Math.max(0, Math.min(1, dom.introVideo.volume));
  const startedAt = Date.now();

  introAudioFadeInterval = setInterval(() => {
    if (!dom.introVideo) {
      clearIntroAudioFade();
      return;
    }

    const elapsed = Date.now() - startedAt;
    const progress = Math.min(1, elapsed / fadeDurationMs);
    const nextVolume = initialVolume * (1 - progress);
    dom.introVideo.volume = Math.max(0, Number(nextVolume.toFixed(4)));

    if (progress >= 1) {
      dom.introVideo.volume = 0;
      dom.introVideo.muted = true;
      clearIntroAudioFade();
    }
  }, tickMs);
}

function startBackgroundLoopVideo() {
  if (!dom.bgVideoLayer || !dom.bgLoopVideo) return;
  dom.bgVideoLayer.classList.remove("is-hidden");
  dom.bgLoopVideo.muted = true;
  dom.bgLoopVideo.loop = true;
  dom.bgLoopVideo.currentTime = 0;
  dom.bgLoopVideo.play().catch(() => {
    // Reintento silencioso garantizado por muted
  });
  requestAnimationFrame(() => {
    dom.bgVideoLayer.classList.add("is-visible");
  });
}

function transitionToInvitationCard() {
  if (introFinished) return;
  introFinished = true;

  if (introSixSecTimer) {
    clearTimeout(introSixSecTimer);
  }
  clearIntroAudioFade();

  if (dom.introVideo) {
    dom.introVideo.volume = 0;
    dom.introVideo.muted = true;
    dom.introVideo.pause();
  }

  startBackgroundLoopVideo();

  dom.inviteMain.classList.remove("is-hidden");
  dom.inviteMain.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    dom.inviteMain.classList.add("is-visible");
  });

  dom.introOverlay.classList.add("fade-out");
  dom.body.classList.remove("intro-active");
  document.body.style.backgroundColor = "transparent";

  setTimeout(() => {
    dom.introOverlay.remove();
  }, 650);
}

function startSixSecondIntro() {
  if (introStarted || introFinished) return;
  introStarted = true;

  if (dom.introLaunchBar) {
    dom.introLaunchBar.classList.add("is-hidden");
  }
  if (dom.skipIntroBtn) {
    dom.skipIntroBtn.classList.remove("is-hidden");
  }

  introSixSecTimer = setTimeout(transitionToInvitationCard, INTRO_PLAY_DURATION_MS);
  setTimeout(() => {
    if (!introFinished) {
      startTwoSecondAudioFadeOut();
    }
  }, INTRO_FADE_OUT_START_MS);

  if (dom.introVideo) {
    dom.introVideo.currentTime = 0;
    dom.introVideo.muted = false;
    dom.introVideo.volume = 1;
    dom.introVideo.play().catch(() => {
      dom.introVideo.muted = true;
      dom.introVideo.play().catch(() => {});
    });
  }
}

if (dom.openInviteBtn) {
  dom.openInviteBtn.addEventListener("click", startSixSecondIntro);
}

if (dom.skipIntroBtn) {
  dom.skipIntroBtn.addEventListener("click", transitionToInvitationCard);
}

// 2. FECHA Y TEMPORIZADOR
function formatEventDate(isoStr) {
  const dateObj = new Date(isoStr);
  if (Number.isNaN(dateObj.getTime())) return "A confirmar";
  return dateObj.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function updateEventClock() {
  dom.eventDateDisplay.textContent = formatEventDate(EVENT_TARGET_ISO);

  const targetMs = new Date(EVENT_TARGET_ISO).getTime();
  const diffMs = targetMs - Date.now();

  if (Number.isNaN(targetMs) || diffMs <= 0) {
    dom.countdownDisplay.textContent = "¡Ya comenzó!";
    return;
  }

  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  dom.countdownDisplay.textContent =
    `${String(days).padStart(2, "0")}d ` +
    `${String(hours).padStart(2, "0")}h ` +
    `${String(mins).padStart(2, "0")}m ` +
    `${String(secs).padStart(2, "0")}s`;
}

dom.btnDateInfo.addEventListener("click", () => {
  const fullDate = new Date(EVENT_TARGET_ISO).toLocaleString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  dom.quickFeedback.textContent = `Fecha programada: ${fullDate}.`;
});

dom.btnCountdownInfo.addEventListener("click", () => {
  dom.quickFeedback.textContent = `Falta ${dom.countdownDisplay.textContent} para MOTO'S RANCH.`;
});

// 3. ALMACENAMIENTO Y FUTURO ENGANCHE CON PHP
function getStoredState() {
  try {
    const raw = localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (!raw) {
      return { attendees: [] };
    }
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      attendees: Array.isArray(parsed.attendees) ? parsed.attendees : []
    };
  } catch {
    return { attendees: [] };
  }
}

function getNextLocalRaffleNumber(attendees) {
  const maxNum = attendees.reduce((max, item) => {
    return typeof item.raffleNumber === "number" && item.raffleNumber > max
      ? item.raffleNumber
      : max;
  }, 100);
  return maxNum + 1;
}

async function requestRaffleNumberFromBackend(name) {
  if (RAFFLE_PHP_ENDPOINT) {
    const response = await fetch(RAFFLE_PHP_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm_and_assign_raffle", name })
    });
    if (!response.ok) {
      throw new Error("Error al consultar número de sorteo en PHP");
    }
    const data = await response.json();
    return data.raffleNumber;
  }

  const currentState = getStoredState();
  return getNextLocalRaffleNumber(currentState.attendees);
}

function saveConfirmationToDashboard(name, participatesRaffle, raffleNumber) {
  try {
    const currentState = getStoredState();
    currentState.attendees.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      name,
      participatesRaffle,
      raffleNumber
    });
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(currentState));
  } catch {
    // Ignorar errores de almacenamiento si el navegador los restringe
  }
}

// 4. FLUJO DE CONFIRMACIÓN DE ASISTENCIA Y ENTREGA DE NÚMERO DE SORTEO
function showTemporaryConfirmation(message, isRaffle) {
  if (statusTimeoutId) clearTimeout(statusTimeoutId);
  if (statusHideTimeoutId) clearTimeout(statusHideTimeoutId);

  dom.formWrapper.classList.add("fade-out");
  dom.formWrapper.classList.add("is-hidden");

  dom.statusMessageText.textContent = message;
  dom.statusMessageBox.classList.remove("is-hidden", "is-raffle", "is-no-raffle");
  dom.statusMessageBox.classList.add(isRaffle ? "is-raffle" : "is-no-raffle");

  requestAnimationFrame(() => {
    dom.statusMessageBox.classList.add("is-visible");
  });

  statusTimeoutId = setTimeout(() => {
    dom.statusMessageBox.classList.remove("is-visible");

    statusHideTimeoutId = setTimeout(() => {
      dom.statusMessageBox.classList.add("is-hidden");
      dom.rsvpForm.reset();
      dom.raffleOptIn.checked = true;
      dom.formError.textContent = "";
      dom.formWrapper.classList.remove("is-hidden");
      requestAnimationFrame(() => {
        dom.formWrapper.classList.remove("fade-out");
      });
    }, 350);
  }, STATUS_DISPLAY_MS);
}

dom.rsvpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  dom.formError.textContent = "";

  const name = dom.guestName.value.trim();
  if (!name) {
    dom.formError.textContent = "Por favor, ingresá tu nombre para confirmar la asistencia.";
    dom.guestName.focus();
    return;
  }

  const wantsRaffle = dom.raffleOptIn.checked;

  if (!wantsRaffle) {
    const continueWithoutRaffle = window.confirm(
      "No estás participando del sorteo, ¿desea continuar?"
    );
    if (!continueWithoutRaffle) {
      return;
    }

    saveConfirmationToDashboard(name, false, null);
    showTemporaryConfirmation("Asistencia confirmada.", false);
    return;
  }

  dom.confirmBtn.disabled = true;
  try {
    const raffleNumber = await requestRaffleNumberFromBackend(name);
    saveConfirmationToDashboard(name, true, raffleNumber);
    showTemporaryConfirmation(
      `Asistencia confirmada. Tu número para el sorteo es el #${raffleNumber}.`,
      true
    );
  } catch {
    dom.formError.textContent = "No se pudo asignar el número de sorteo en este momento.";
  } finally {
    dom.confirmBtn.disabled = false;
  }
});

// 5. OLVIDÉ MI NÚMERO DE SORTEO (NOMBRE TAL CUAL FUE INGRESADO)
function handleForgotNumberLookup() {
  const exactName = dom.lookupExactName.value;
  if (!exactName || exactName.trim() === "") {
    dom.lookupResultText.textContent = "Ingresá tu nombre tal cual como fue registrado.";
    dom.lookupResultText.style.color = "#fda4af";
    return;
  }

  const currentState = getStoredState();
  const match = currentState.attendees.find((item) => item.name === exactName);

  if (!match) {
    dom.lookupResultText.textContent =
      "No se encontró ese nombre exacto. Revisá mayúsculas, minúsculas y espacios.";
    dom.lookupResultText.style.color = "#fda4af";
    return;
  }

  if (!match.participatesRaffle || !match.raffleNumber) {
    dom.lookupResultText.textContent = `"${match.name}" confirmó asistencia sin participar del sorteo.`;
    dom.lookupResultText.style.color = "#fde68a";
    return;
  }

  dom.lookupResultText.textContent = `Tu número de sorteo es el #${match.raffleNumber}.`;
  dom.lookupResultText.style.color = "#34d399";
}

dom.forgotNumberBtn.addEventListener("click", () => {
  dom.forgotNumberPanel.classList.toggle("is-hidden");
  dom.lookupResultText.textContent = "";
  if (!dom.forgotNumberPanel.classList.contains("is-hidden")) {
    dom.lookupExactName.focus();
  }
});

dom.lookupAcceptBtn.addEventListener("click", handleForgotNumberLookup);

dom.lookupExactName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleForgotNumberLookup();
  }
});

dom.lookupCloseBtn.addEventListener("click", () => {
  dom.forgotNumberPanel.classList.add("is-hidden");
  dom.lookupResultText.textContent = "";
});

updateEventClock();
setInterval(updateEventClock, 1000);