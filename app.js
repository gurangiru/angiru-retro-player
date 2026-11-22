const translations = {
  pt: {
    ready:"PRONTO PARA JOGAR", eyebrow:"UMA EXPERIÊNCIA DE NOSTALGIA PIXEL", title:'Reviva os <span>clássicos.</span>', subtitle:"Seus jogos retrô favoritos, em um só lugar. Cole um link e aperte start!",
    player:"PLAYER DE JOGOS", "link-label":"LINK DO JOGO — RETROGAMES.CC", start:"START GAME", hint:"Cole um link de jogo do RetroGames.cc para começar.",
    "no-game":"NENHUM JOGO CARREGADO", "empty-title":"Seu próximo jogo começa aqui", "empty-desc":"Insira um link acima e prepare-se para viajar no tempo.", "start-hint":"iniciar", "select-hint":"escolher",
    "footer-note":"Dica: alguns jogos precisam de alguns segundos para carregar.", "how-title":"COMO JOGAR", "step1-title":"Encontre seu clássico", "step1-desc":"Escolha um jogo no RetroGames.cc.", "step2-title":"Copie o link", "step2-desc":"Use o endereço da página ou do embed do jogo.", "step3-title":"Aperte Start!", "step3-desc":"Cole o link aqui e jogue no player.", footer:"Uma experiência comunitária em desenvolvimento.", error:"Por favor, cole um link válido do RetroGames.cc.", loading:"CARREGANDO JOGO…", loaded:"JOGO CARREGADO", fullscreen:"Tela cheia"
  },
  en: {
    ready:"READY TO PLAY", eyebrow:"A PIXEL NOSTALGIA EXPERIENCE", title:'Relive the <span>classics.</span>', subtitle:"Your favorite retro games, all in one place. Paste a link and press start!",
    player:"GAME PLAYER", "link-label":"GAME LINK — RETROGAMES.CC", start:"START GAME", hint:"Paste a RetroGames.cc game link to begin.",
    "no-game":"NO GAME LOADED", "empty-title":"Your next game starts here", "empty-desc":"Enter a link above and get ready to travel back in time.", "start-hint":"start", "select-hint":"select",
    "footer-note":"Tip: some games may take a few seconds to load.", "how-title":"HOW TO PLAY", "step1-title":"Find your classic", "step1-desc":"Choose a game on RetroGames.cc.", "step2-title":"Copy the link", "step2-desc":"Use the game page URL or its embed link.", "step3-title":"Press Start!", "step3-desc":"Paste the link here and play.", footer:"A community experience in development.", error:"Please paste a valid RetroGames.cc link.", loading:"LOADING GAME…", loaded:"GAME LOADED", fullscreen:"Fullscreen"
  },
  es: {
    ready:"LISTO PARA JUGAR", eyebrow:"UNA EXPERIENCIA DE NOSTALGIA PIXEL", title:'Revive los <span>clásicos.</span>', subtitle:"Tus juegos retro favoritos, en un solo lugar. ¡Pega un enlace y pulsa start!",
    player:"REPRODUCTOR DE JUEGOS", "link-label":"ENLACE DEL JUEGO — RETROGAMES.CC", start:"START GAME", hint:"Pega un enlace de RetroGames.cc para comenzar.",
    "no-game":"NINGÚN JUEGO CARGADO", "empty-title":"Tu próximo juego comienza aquí", "empty-desc":"Introduce un enlace arriba y prepárate para viajar en el tiempo.", "start-hint":"iniciar", "select-hint":"elegir",
    "footer-note":"Consejo: algunos juegos tardan unos segundos en cargar.", "how-title":"CÓMO JUGAR", "step1-title":"Encuentra tu clásico", "step1-desc":"Elige un juego en RetroGames.cc.", "step2-title":"Copia el enlace", "step2-desc":"Usa la dirección de la página o del embed.", "step3-title":"¡Pulsa Start!", "step3-desc":"Pega el enlace aquí y juega.", footer:"Una experiencia comunitaria en desarrollo.", error:"Pega un enlace válido de RetroGames.cc.", loading:"CARGANDO JUEGO…", loaded:"JUEGO CARGADO", fullscreen:"Pantalla completa"
  }
};
const languageSelect = document.querySelector("#language");
const form = document.querySelector("#game-form");
const input = document.querySelector("#game-url");
const message = document.querySelector("#form-message");
const iframe = document.querySelector("#game-frame");
const emptyState = document.querySelector("#empty-state");
const gameName = document.querySelector("#game-name");
const gameArea = document.querySelector("#game-area");
const fullscreenButton = document.querySelector("#fullscreen");
const liveIndicator = document.querySelector(".live-indicator");

function setLanguage(language) {
  const dictionary = translations[language] || translations.pt;
  document.documentElement.lang = language === "pt" ? "pt-BR" : language;
  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    if (dictionary[key]) element.innerHTML = dictionary[key];
  });
  languageSelect.value = language;
  message.classList.remove("error");
}
languageSelect.addEventListener("change", event => setLanguage(event.target.value));

function getEmbedUrl(raw) {
  let url;
  try { url = new URL(raw.trim()); } catch { return null; }
  const host = url.hostname.toLowerCase();
  if (host !== "retrogames.cc" && host !== "www.retrogames.cc") return null;
  if (!/^https?:$/.test(url.protocol)) return null;
  // Accept both the site's regular game URL and its /embed/ URL.
  if (!url.pathname.endsWith(".html")) return null;
  if (!url.pathname.startsWith("/embed/")) url.pathname = "/embed" + url.pathname;
  url.protocol = "https:";
  url.search = "";
  url.hash = "";
  return url.href;
}
form.addEventListener("submit", event => {
  event.preventDefault();
  const embedUrl = getEmbedUrl(input.value);
  if (!embedUrl) {
    message.textContent = translations[languageSelect.value].error;
    message.classList.add("error");
    return;
  }
  const dictionary = translations[languageSelect.value];
  message.textContent = dictionary.loading;
  message.classList.remove("error");
  emptyState.hidden = true;
  iframe.hidden = false;
  iframe.src = embedUrl;
  gameName.textContent = new URL(embedUrl).pathname.split("/").pop().replace(/\.html$/,"").replace(/-/g," ").toUpperCase();
  liveIndicator.classList.add("active");
});
iframe.addEventListener("load", () => {
  if (iframe.src && iframe.src !== "about:blank") message.textContent = translations[languageSelect.value].loaded;
});
fullscreenButton.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      try { if (screen.orientation?.unlock) screen.orientation.unlock(); } catch {}
    } else {
      await gameArea.requestFullscreen();
      // On phones, request landscape when the browser supports orientation locking.
      try { await screen.orientation?.lock?.("landscape"); } catch {}
    }
  } catch { message.textContent = "Fullscreen is not available in this browser."; }
});
setLanguage("pt");
