const defaultApiBase = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "http://localhost:5073"
  : "https://api.postoria.net";
const API_BASE = localStorage.getItem("postoria-api-base") || defaultApiBase;

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
const mobileMenu = document.querySelector("[data-mobile-menu]");
const searchLightbox = document.querySelector("[data-search-lightbox]");
const headerAuthActions = document.querySelector("[data-header-auth]");
const mobileAuthActions = document.querySelector("[data-mobile-auth]");
const homeAnchors = new Set(["explore"]);
let pendingAnchorScroll = homeAnchors.has(getRoute()) ? getRoute() : "";

const state = {
  member: readJson("postoria-member"),
  token: localStorage.getItem("postoria-token") || "",
  slide: 0,
  search: "",
  favorites: readJson("postoria-favorites") || [],
  uploads: [],
  home: null,
  homeLoading: false,
  homeError: "",
  catalog: {
    active: false,
    country: "",
    city: "",
    keyword: "",
    sort: "latest",
    page: 1,
    pageSize: 12,
    limitTop: false,
    title: "",
    cities: [],
    items: [],
    total: 0,
    totalPages: 0,
    loading: false,
    error: ""
  }
};

const heroSlides = [
  {
    image: "assets/banner-01.jpg",
    eyebrow: "來自世界各地的明信片",
    title: "收藏美好時刻，分享世界",
    copy: "探索旅人的回憶，整理自己的收藏，讓每張明信片都有故事。",
    place: "Gangnam Library"
  },
  {
    image: "assets/banner-02.jpg",
    eyebrow: "城市風景與旅途片段",
    title: "把遠方，收進你的收藏",
    copy: "用標籤、城市與國家分類，快速找到想看的明信片。",
    place: "Postcard Journey"
  },
  {
    image: "assets/banner-03.jpg",
    eyebrow: "熱門收藏每日更新",
    title: "跟著收藏榜探索靈感",
    copy: "從人氣明信片開始，發現下一張想收藏的風景。",
    place: "Blooming City"
  },
  {
    image: "assets/banner-04.jpg",
    eyebrow: "舊版活動 Banner 測試",
    title: "用舊版素材重新排版",
    copy: "先確認輪播比例與手機裁切，再替換正式 Postoria 主視覺。",
    place: "Archive Banner"
  },
  {
    image: "assets/banner-05.jpg",
    eyebrow: "Postoria 首頁輪播",
    title: "更多收藏入口即將接上",
    copy: "首頁先建立視覺與導覽，再逐步串接資料庫內容。",
    place: "Archive Banner"
  }
];

const countries = [
  ["日本", "JAPAN", "1,250 張明信片", "assets/kyoto.jpg"],
  ["希臘", "GREECE", "987 張明信片", "assets/hero-sunset.jpg"],
  ["美國", "UNITED STATES", "2,356 張明信片", "assets/california.jpg"],
  ["法國", "FRANCE", "1,102 張明信片", "assets/hongkong.jpg"],
  ["義大利", "ITALY", "1,675 張明信片", "assets/osaka.jpg"],
  ["瑞士", "SWITZERLAND", "743 張明信片", "assets/switzerland.jpg"]
];

const cards = [
  { id: "JP-0001", title: "京都・清水寺", meta: "日本・京都", image: "assets/kyoto.jpg", likes: "2,845", views: "12,631", tags: ["日本", "京都", "寺廟"] },
  { id: "IT-0032", title: "Positano", meta: "義大利", image: "assets/osaka.jpg", likes: "2,320", views: "9,876", tags: ["義大利", "海邊"] },
  { id: "US-0105", title: "California Coast", meta: "美國・加州", image: "assets/california.jpg", likes: "2,105", views: "8,542", tags: ["美國", "海岸"] },
  { id: "CH-0077", title: "Lauterbrunnen", meta: "瑞士", image: "assets/switzerland.jpg", likes: "1,987", views: "7,654", tags: ["瑞士", "山景"] },
  { id: "NO-0012", title: "Aurora Night", meta: "挪威", image: "assets/norway.jpg", likes: "1,832", views: "7,103", tags: ["挪威", "極光"] }
];

const latest = [
  { id: "JP-0201", title: "大阪城・春", meta: "日本・大阪", image: "assets/osaka.jpg", likes: "128", tags: ["日本", "大阪"] },
  { id: "IT-0119", title: "Cinque Terre", meta: "義大利", image: "assets/austria.jpg", likes: "96", tags: ["義大利", "海邊"] },
  { id: "AT-0077", title: "Hallstatt", meta: "奧地利", image: "assets/austria.jpg", likes: "87", tags: ["奧地利", "湖景"] },
  { id: "IS-0012", title: "Iceland Aurora", meta: "冰島", image: "assets/norway.jpg", likes: "64", tags: ["冰島", "極光"] }
];

function closeMobileMenu() {
  mobileMenu.classList.remove("open");
  mobileMenu.setAttribute("aria-hidden", "true");
}

window.addEventListener("hashchange", handleRouteChange);
window.addEventListener("popstate", handleRouteChange);
document.addEventListener("submit", handleSubmit);
document.addEventListener("click", handleClick);
document.addEventListener("change", handleChange);
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  closeSearchLightbox();
  closeCatalogModal();
});

function handleChange(event) {
  const input = event.target.closest("input[type='file'][name='image']");
  if (!input) return;

  const label = input.closest(".file-field")?.querySelector("[data-file-label]");
  if (label) {
    label.textContent = input.files?.[0]?.name || "選擇圖片 JPG / PNG / WebP，8MB 以內";
  }
}

function handleRouteChange() {
  const route = getRoute();
  if (route === "popular") {
    openPopularCatalog();
    return;
  }
  if (route === "latest") {
    openFavoriteCatalog();
    return;
  }
  pendingAnchorScroll = route === "explore" ? route : "";
  render();
}

setInterval(() => {
  if ((location.hash || "#home") !== "#home") return;
  const slideCount = (state.home?.banners || heroSlides).length;
  state.slide = (state.slide + 1) % slideCount;
  renderHeroOnly();
}, 5200);

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function setSession(member, token, expiresAt) {
  state.member = member;
  state.token = token;
  localStorage.setItem("postoria-member", JSON.stringify(member));
  localStorage.setItem("postoria-token", token);
  localStorage.setItem("postoria-token-expires-at", expiresAt || "");
  renderAuthActions();
  loadMemberFavorites();
}

function clearSession() {
  state.member = null;
  state.token = "";
  state.favorites = [];
  state.uploads = [];
  localStorage.removeItem("postoria-member");
  localStorage.removeItem("postoria-token");
  localStorage.removeItem("postoria-token-expires-at");
  localStorage.removeItem("postoria-favorites");
  renderAuthActions();
}

function tokenExpired() {
  if (!state.token) return false;
  const expiresAt = localStorage.getItem("postoria-token-expires-at");
  if (!expiresAt) return true;
  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs)) return true;
  return expiresAtMs <= Date.now();
}

function clearExpiredSession() {
  if (!tokenExpired()) return false;
  clearSession();
  return true;
}

clearExpiredSession();

async function loadHomeData() {
  if (state.homeLoading || state.home) return;
  state.homeLoading = true;

  try {
    const [response, countriesResponse] = await Promise.all([
      fetch(`${API_BASE}/api/postoria/home`),
      fetch(`${API_BASE}/api/postoria/countries`)
    ]);
    if (!response.ok) {
      throw new Error(`home api ${response.status}`);
    }
    if (!countriesResponse.ok) {
      throw new Error(`countries api ${countriesResponse.status}`);
    }

    state.home = normalizeHomeData(await response.json(), await countriesResponse.json());
    state.homeError = "";
    render();
  } catch {
    state.homeError = "目前無法讀取 API，先顯示首頁預覽資料。";
  } finally {
    state.homeLoading = false;
  }
}

function normalizeHomeData(data, allCountries = null) {
  const banners = (data.banners || [])
    .filter(item => item.imageUrl)
    .map(item => ({
      image: item.imageUrl,
      place: item.title || "Postoria"
    }));

  return {
    banners: banners.length ? banners : heroSlides,
    countries: (allCountries || data.countries || []).map(item => [
      item.name,
      item.englishName || item.name,
      `${Number(item.count || 0).toLocaleString()} 張明信片`,
      item.imageUrl || "assets/hero-sunset.jpg"
    ]),
    popular: (data.popular || []).map(mapApiPostcard),
    latest: (data.latest || []).map(mapApiPostcard)
  };
}

function mapApiPostcard(item) {
  return {
    id: item.legacyId || item.id,
    uid: item.id,
    title: item.title,
    meta: [item.country, item.city].filter(Boolean).join("・"),
    country: item.country || "",
    city: item.city || "",
    image: item.imageUrl || "assets/hero-sunset.jpg",
    likes: Number(item.likeCount || 0).toLocaleString(),
    views: Number(item.viewCount || 0).toLocaleString(),
    tags: item.tags || [],
    legacyNumber: item.legacyNumber,
    latitude: item.latitude,
    longitude: item.longitude,
    postcardType: item.postcardType
  };
}

async function openCatalog(next = {}) {
  const showPostcards = next.showPostcards ?? state.catalog.showPostcards ?? false;
  const isCountryBrowse = Boolean(next.country && !next.city && !showPostcards);
  const preserveViewport = Boolean(
    state.catalog.country &&
    state.catalog.city &&
    state.catalog.showPostcards &&
    showPostcards
  );
  const patchModal = preserveViewport && Boolean(document.querySelector(".catalog-modal"));
  const viewportSnapshot = preserveViewport ? getCatalogViewportSnapshot() : null;
  state.catalog = {
    ...state.catalog,
    ...next,
    active: true,
    loading: true,
    error: "",
    showPostcards,
    page: next.page || 1
  };
  if (patchModal && next.city) {
    setCatalogCityActive(next.city);
  } else if (!isCountryBrowse) {
    render();
    restoreCatalogViewport(viewportSnapshot);
  }

  try {
    const query = new URLSearchParams();
    if (state.catalog.country) query.set("country", state.catalog.country);
    if (state.catalog.city) query.set("city", state.catalog.city);
    if (state.catalog.keyword) query.set("keyword", state.catalog.keyword);
    if (state.catalog.sort) query.set("sort", state.catalog.sort);
    query.set("page", state.catalog.page);
    query.set("pageSize", state.catalog.pageSize);

    const [cities, postcards] = await Promise.all([
      state.catalog.country
        ? fetchJson(`/api/postoria/cities?country=${encodeURIComponent(state.catalog.country)}`)
        : Promise.resolve([]),
      showPostcards ? fetchJson(`/api/postoria/postcards?${query}`) : Promise.resolve({
        items: [],
        total: 0,
        totalPages: 0
      })
    ]);

    state.catalog = {
      ...state.catalog,
      cities,
      items: (postcards.items || []).map(mapApiPostcard),
      total: postcards.total || 0,
      totalPages: postcards.totalPages || 0,
      loading: false
    };
  } catch {
    state.catalog = {
      ...state.catalog,
      loading: false,
      error: "資料讀取失敗，請稍後再試。"
    };
  }

  if (patchModal) {
    updateCatalogModalInPlace();
    restoreCatalogViewport(viewportSnapshot);
  } else {
    render();
    restoreCatalogViewport(viewportSnapshot);
  }
  if (!(state.catalog.country && state.catalog.city && state.catalog.showPostcards)) {
    requestAnimationFrame(() => {
      const target = state.catalog.country && !state.catalog.city && !state.catalog.showPostcards
        ? document.querySelector("#city-list")
        : document.querySelector("#catalog");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

function getCatalogViewportSnapshot() {
  return {
    windowX: window.scrollX,
    windowY: window.scrollY,
    modalTop: document.querySelector(".catalog-modal")?.scrollTop || 0,
    mainTop: document.querySelector(".catalog-main")?.scrollTop || 0,
    cityListTop: document.querySelector(".catalog-city-list")?.scrollTop || 0,
    cityListLeft: document.querySelector(".catalog-city-list")?.scrollLeft || 0
  };
}

function restoreCatalogViewport(snapshot) {
  if (!snapshot) return;
  requestAnimationFrame(() => {
    window.scrollTo(snapshot.windowX, snapshot.windowY);
    const modal = document.querySelector(".catalog-modal");
    const main = document.querySelector(".catalog-main");
    const cityList = document.querySelector(".catalog-city-list");
    if (modal) modal.scrollTop = snapshot.modalTop;
    if (main) main.scrollTop = snapshot.mainTop;
    if (cityList) {
      cityList.scrollTop = snapshot.cityListTop;
      cityList.scrollLeft = snapshot.cityListLeft;
    }
  });
}

function setCatalogCityActive(cityName) {
  document.querySelectorAll(".catalog-city-list [data-city]").forEach(button => {
    button.classList.toggle("active", button.dataset.city === cityName);
  });
}

function updateCatalogModalInPlace() {
  const modal = document.querySelector(".catalog-modal");
  if (!modal) {
    render();
    return;
  }

  const activeCity = state.catalog.cities.find(city => city.name === state.catalog.city) || {};
  const cityImage = activeCity.imageUrl || state.catalog.items[0]?.image || "assets/hero-sunset.jpg";
  setCatalogCityActive(state.catalog.city);

  const placeImage = modal.querySelector(".catalog-place img");
  const placeTitle = modal.querySelector(".catalog-place h2");
  const placeCountry = modal.querySelector(".catalog-place p");
  const summary = modal.querySelector(".catalog-summary span");
  const grid = modal.querySelector(".catalog-grid");
  const main = modal.querySelector(".catalog-main");

  if (placeImage) {
    placeImage.src = cityImage;
    placeImage.alt = state.catalog.city;
  }
  if (placeTitle) placeTitle.textContent = state.catalog.city;
  if (placeCountry) placeCountry.textContent = state.catalog.country;
  if (summary) {
    summary.textContent = state.catalog.loading
      ? "讀取中..."
      : `共 ${state.catalog.total.toLocaleString()} 張明信片`;
  }
  if (grid) {
    grid.innerHTML = state.catalog.loading
      ? catalogSkeletonCards(state.catalog.pageSize || 6)
      : state.catalog.items.map(catalogCard).join("");
  }

  main?.querySelectorAll(":scope > .api-note, :scope > .pagination, [data-catalog-dynamic]").forEach(element => element.remove());
  if (main && state.catalog.error) {
    const note = document.createElement("p");
    note.className = "api-note";
    note.dataset.catalogDynamic = "true";
    note.textContent = state.catalog.error;
    grid?.before(note);
  }
  if (main && !state.catalog.loading && !state.catalog.items.length) {
    const empty = document.createElement("p");
    empty.className = "api-note";
    empty.dataset.catalogDynamic = "true";
    empty.textContent = "目前沒有符合條件的明信片。";
    grid?.after(empty);
  }
  if (main && state.catalog.totalPages > 1) {
    const pagination = document.createElement("div");
    pagination.className = "pagination";
    pagination.dataset.catalogDynamic = "true";
    pagination.innerHTML = `
      <button type="button" data-page="${Math.max(1, state.catalog.page - 1)}" ${state.catalog.page <= 1 ? "disabled" : ""}>‹</button>
      <span>${state.catalog.page} / ${state.catalog.totalPages}</span>
      <button type="button" data-page="${Math.min(state.catalog.totalPages, state.catalog.page + 1)}" ${state.catalog.page >= state.catalog.totalPages ? "disabled" : ""}>›</button>
    `;
    grid?.after(pagination);
  }
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
}

async function fetchAuthorizedJson(path, options = {}) {
  if (clearExpiredSession()) {
    render();
    throw new Error("登入已過期，請重新登入");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${state.token}`
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      render();
      throw new Error("登入已過期，請重新登入");
    }
    throw new Error(data?.message || data?.title || `API ${response.status}`);
  }
  return data;
}

async function loadMemberFavorites() {
  if (!state.token) return;
  try {
    const data = await fetchAuthorizedJson("/api/members/me/favorites");
    state.favorites = (data.postcardIds || []).map(String);
    localStorage.setItem("postoria-favorites", JSON.stringify(state.favorites));
    render();
  } catch {
    state.favorites = [];
    localStorage.removeItem("postoria-favorites");
  }
}

function favoriteKey(card) {
  return String(card.uid || card.id);
}

function isFavorite(card) {
  return state.favorites.includes(favoriteKey(card));
}

function syncFavoriteButtons(id, isActive, favoriteCount = null) {
  document.querySelectorAll(`[data-favorite="${CSS.escape(id)}"]`).forEach(button => {
    button.classList.toggle("active", isActive);
    const label = isActive ? "移除收藏" : "加入收藏";
    if (button.classList.contains("favorite-icon-button")) {
      button.title = isActive ? "移除收藏" : "收藏";
      button.setAttribute("aria-label", label);
      return;
    }

    const text = button.textContent.trim();
    if (text) {
      button.textContent = text.replace(/^[♥♡]/, isActive ? "♥" : "♡");
    }
  });

  if (favoriteCount !== null && favoriteCount !== undefined) {
    document.querySelectorAll(`[data-favorite-count="${CSS.escape(id)}"]`).forEach(element => {
      const icon = element.querySelector(".icon");
      element.textContent = Number(favoriteCount).toLocaleString();
      if (icon) {
        element.prepend(icon);
      }
    });
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function getRoute() {
  return (location.hash.replace(/^#+/, "").split("?")[0] || "home");
}

function externalAuthUrl(provider) {
  const returnUrl = `${location.origin}${location.pathname}${location.search}#login-success`;
  return `${API_BASE}/api/external-auth/${provider}/login?returnUrl=${encodeURIComponent(returnUrl)}`;
}

function consumeExternalAuthResult() {
  const hash = location.hash.replace(/^#+/, "");
  const [, query = ""] = hash.split("?");
  if (!query) return false;

  const params = new URLSearchParams(query);
  const memberPayload = params.get("member");
  const accessToken = params.get("accessToken");
  const expiresAt = params.get("expiresAt");
  if (!memberPayload || !accessToken) return false;

  try {
    setSession(JSON.parse(memberPayload), accessToken, expiresAt || "");
    history.replaceState(null, "", `${location.pathname}${location.search}#login-success`);
    return true;
  } catch {
    return false;
  }
}

function setStatus(form, message, isError = false) {
  const status = form.querySelector(".status");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function setBusy(form, busy) {
  form.querySelectorAll("button, input").forEach(element => {
    element.disabled = busy;
  });
}

async function apiPost(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.title || "API 請求失敗，請稍後再試。");
  }
  return data;
}

function renderHome() {
  if (state.homeLoading && !state.home) {
    return homeSkeleton();
  }

  const home = state.home || {
    banners: heroSlides,
    countries,
    popular: cards,
    latest
  };
  const activeBanners = home.banners.length ? home.banners : heroSlides;
  const searchMode = Boolean(state.search || state.catalog.keyword);
  const countryMode = Boolean(state.catalog.country);
  const catalogOnlyMode = Boolean(state.catalog.active && state.catalog.showPostcards && state.catalog.limitTop);
  const hideHero = countryMode || catalogOnlyMode;
  state.slide = state.slide % activeBanners.length;

  return `
    <section class="home-shell ${searchMode ? "search-mode" : ""} ${countryMode ? "country-mode" : ""} ${catalogOnlyMode ? "catalog-only-mode" : ""}">
      ${hideHero ? "" : `
        <div class="hero" id="hero">
          ${heroMarkup(activeBanners)}
        </div>
      `}
      ${state.homeError ? `<p class="api-note">${state.homeError}</p>` : ""}

      ${catalogOnlyMode ? "" : `<section class="section-block explore-section" id="explore">
        <div class="section-heading">
          <div>
            <h2 class="explore-title"><svg class="icon"><use href="#icon-globe"></use></svg>探索世界 <small>依照國家與城市分類</small></h2>
          </div>
        </div>
        <div class="country-grid">
          ${home.countries.map(countryCard).join("")}
        </div>
        ${cityRail()}
      </section>`}

      ${catalogPanel()}

      ${state.search ? searchResults() : ""}

      ${siteFooter()}
    </section>
  `;
}

function homeSkeleton() {
  return `
    <section class="home-shell is-loading">
      <div class="hero skeleton-box"></div>

      <section class="section-block explore-section" id="explore">
        <div class="section-heading">
          <div>
            <h2 class="explore-title"><svg class="icon"><use href="#icon-globe"></use></svg>探索世界 <small>依照國家與城市分類</small></h2>
          </div>
        </div>
        <div class="country-grid">
          ${skeletonItems(6, "country-card skeleton-card").join("")}
        </div>
      </section>

      <section class="section-block">
        <div class="section-heading">
          <div>
            <h2 class="skeleton-line wide"></h2>
            <p class="skeleton-line short"></p>
          </div>
        </div>
        <div class="catalog-grid">
          ${catalogSkeletonCards(6)}
        </div>
      </section>

      ${siteFooter()}
    </section>
  `;
}

function skeletonItems(count, className) {
  return Array.from({ length: count }, () => `<article class="${className}"></article>`);
}

function catalogSkeletonCards(count = 6) {
  return Array.from({ length: count }, () => `
    <article class="postcard-card skeleton-postcard" aria-hidden="true">
      <div class="skeleton-image"></div>
      <div>
        <span class="skeleton-line wide"></span>
        <span class="skeleton-line"></span>
        <span class="skeleton-line short"></span>
      </div>
    </article>
  `).join("");
}

function heroMarkup(slides = (state.home?.banners || heroSlides)) {
  const slide = slides[state.slide] || slides[0];
  return `
    <img src="${slide.image}" alt="${slide.place}" ${imageFallbackAttr()}>
    <div class="hero-dots">
      ${slides.map((_, index) => `<button type="button" data-dot="${index}" class="${index === state.slide ? "active" : ""}" aria-label="切換到第 ${index + 1} 張"></button>`).join("")}
    </div>
  `;
}

function openPopularCatalog() {
  state.search = "";
  openCatalog({
    country: "",
    city: "",
    keyword: "",
    sort: "popular",
    page: 1,
    pageSize: 50,
    limitTop: true,
    title: "熱門收藏 TOP 50",
    showPostcards: true
  });
}

async function openFavoriteCatalog() {
  if (!state.token) {
    showToast("請先登入會員後查看收藏喜愛");
    location.hash = "login";
    return;
  }

  state.search = "";
  state.catalog = {
    ...state.catalog,
    active: true,
    country: "",
    city: "",
    keyword: "",
    sort: "latest",
    page: 1,
    pageSize: 50,
    limitTop: true,
    title: "收藏喜愛",
    showPostcards: true,
    loading: true,
    error: "",
    items: [],
    total: 0,
    totalPages: 0
  };
  render();

  try {
    const items = await fetchAuthorizedJson("/api/members/me/favorites/postcards");
    state.catalog = {
      ...state.catalog,
      items: (items || []).map(mapApiPostcard),
      total: items?.length || 0,
      totalPages: 1,
      loading: false
    };
  } catch (error) {
    state.catalog = {
      ...state.catalog,
      loading: false,
      error: error.message || "無法讀取收藏清單"
    };
  }

  render();
  requestAnimationFrame(() => document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function renderHeroOnly() {
  const hero = document.querySelector("#hero");
  if (hero) hero.innerHTML = heroMarkup();
}

function countryCard([name, english, count, image]) {
  const active = state.catalog.country === name;
  return `
    <article class="country-card ${active ? "active" : ""}" data-country="${escapeAttr(name)}">
      <img src="${image}" alt="${name}" ${imageFallbackAttr()}>
      <div><h3>${name}</h3><small>${english}</small><p>${count}</p></div>
    </article>
  `;
}

function postcardCard(card, rank) {
  const active = isFavorite(card);
  const key = favoriteKey(card);
  return `
    <article class="postcard-card">
      <span class="rank">${rank}</span>
      <img src="${card.image}" alt="${card.title}" ${imageFallbackAttr()}>
      <div>
        <h3>${card.title}</h3>
        <p>${card.meta}</p>
        <footer>
          <button type="button" class="favorite-button ${active ? "active" : ""}" data-favorite="${key}" aria-label="收藏 ${card.title}">${active ? "♥" : "♡"} ${card.likes}</button>
          <span>◎ ${card.views}</span>
        </footer>
      </div>
    </article>
  `;
}

function newCard(card) {
  const active = isFavorite(card);
  const key = favoriteKey(card);
  return `
    <article class="postcard-card new">
      <span class="new-badge">NEW</span>
      <img src="${card.image}" alt="${card.title}" ${imageFallbackAttr()}>
      <div>
        <h3>${card.title}</h3>
        <p>${card.meta}</p>
        <footer><button type="button" class="favorite-button ${active ? "active" : ""}" data-favorite="${key}" aria-label="收藏 ${card.title}">${active ? "♥" : "♡"} ${card.likes}</button></footer>
      </div>
    </article>
  `;
}

function searchResults() {
  const keyword = state.search.toLowerCase();
  const allCards = [...(state.home?.popular || cards), ...(state.home?.latest || latest)];
  const results = allCards.filter(card => {
    const text = [card.id, card.title, card.meta, ...(card.tags || [])].join(" ").toLowerCase();
    return text.includes(keyword);
  });

  return `
    <section class="section-block search-results">
      <div class="section-heading">
        <div>
          <h2><span>⌕</span>搜尋結果</h2>
          <p>「${state.search}」共 ${results.length} 張明信片</p>
        </div>
        <button class="link-button" type="button" data-action="clear-search">清除搜尋</button>
      </div>
      <div class="result-list">
        ${(results.length ? results : allCards.slice(0, 3)).map((card, index) => `
          <article class="result-card">
            <img src="${card.image}" alt="${card.title}" ${imageFallbackAttr()}>
            <div>
              <h3>${card.title}</h3>
              <p>編號：${card.id}</p>
              <small>${card.meta}　#${(card.tags || []).join(" #")}</small>
            </div>
            <button type="button" class="favorite-button ${isFavorite(card) ? "active" : ""}" data-favorite="${favoriteKey(card)}">
              ${isFavorite(card) ? "♥" : "♡"}
            </button>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function catalogPanel() {
  if (!state.catalog.active) return "";
  if (state.catalog.country && !state.catalog.showPostcards) return "";
  if (state.catalog.country && state.catalog.city) return cityCatalogPanel();

  const title = state.catalog.keyword
    ? `搜尋：${state.catalog.keyword}`
    : state.catalog.title || (state.catalog.city
      ? `${state.catalog.country}・${state.catalog.city}`
      : state.catalog.country || "全部明信片");
  const summary = state.catalog.limitTop
    ? `前 ${state.catalog.items.length.toLocaleString()} 名明信片`
    : state.catalog.loading ? "讀取中..." : `共 ${state.catalog.total.toLocaleString()} 張明信片`;

  return `
    <section class="section-block catalog-panel" id="catalog">
      <div class="section-heading">
        <div>
          <h2><span>▦</span>${title}</h2>
          <p>${summary}</p>
        </div>
        ${state.catalog.limitTop ? "" : `<div class="catalog-tools">
          <button class="link-button ${state.catalog.sort === "latest" ? "active" : ""}" type="button" data-sort="latest">最新</button>
          <button class="link-button ${state.catalog.sort === "popular" ? "active" : ""}" type="button" data-sort="popular">熱門</button>
        </div>`}
      </div>
      ${state.catalog.error ? `<p class="api-note">${state.catalog.error}</p>` : ""}
      <div class="catalog-grid">
        ${state.catalog.loading ? catalogSkeletonCards(Math.min(state.catalog.pageSize || 6, 12)) : state.catalog.items.map(catalogCard).join("")}
      </div>
      ${!state.catalog.limitTop && state.catalog.totalPages > 1 ? `
        <div class="pagination">
          <button type="button" data-page="${Math.max(1, state.catalog.page - 1)}" ${state.catalog.page <= 1 ? "disabled" : ""}>‹</button>
          <span>${state.catalog.page} / ${state.catalog.totalPages}</span>
          <button type="button" data-page="${Math.min(state.catalog.totalPages, state.catalog.page + 1)}" ${state.catalog.page >= state.catalog.totalPages ? "disabled" : ""}>›</button>
        </div>
      ` : ""}
    </section>
  `;
}

function cityCatalogPanel() {
  const activeCity = state.catalog.cities.find(city => city.name === state.catalog.city) || {};
  const cityImage = activeCity.imageUrl || state.catalog.items[0]?.image || "assets/hero-sunset.jpg";

  return `
    <div class="catalog-lightbox open" id="catalog">
      <button class="catalog-lightbox-backdrop" type="button" data-action="close-catalog" aria-label="關閉明信片清單"></button>
      <section class="catalog-panel catalog-modal" role="dialog" aria-modal="true" aria-label="${state.catalog.city} 明信片清單">
      <aside class="catalog-sidebar">
        <div class="catalog-sidebar-heading">
          <strong>探索世界</strong>
          <span>選擇城市瀏覽明信片</span>
        </div>
        <div class="catalog-city-list">
          ${state.catalog.cities.map(city => `
            <button type="button" class="${state.catalog.city === city.name ? "active" : ""}" data-city="${escapeAttr(city.name)}" data-show-postcards="true">
              <img src="${city.imageUrl || "assets/hero-sunset.jpg"}" alt="${city.name}" ${imageFallbackAttr()}>
              <span><strong>${city.name}</strong><small>${city.count.toLocaleString()} 張</small></span>
            </button>
          `).join("")}
        </div>
      </aside>

      <div class="catalog-main">
        <header class="catalog-modal-header">
          <div class="catalog-place">
            <img src="${cityImage}" alt="${state.catalog.city}" ${imageFallbackAttr()}>
            <div>
              <h2>${state.catalog.city}</h2>
              <p>${state.catalog.country}</p>
            </div>
          </div>
          <div class="catalog-summary">
            <span>${state.catalog.loading ? "讀取中..." : `共 ${state.catalog.total.toLocaleString()} 張明信片`}</span>
            <button type="button" class="catalog-close" data-action="close-catalog" aria-label="關閉明信片清單">×</button>
          </div>
        </header>

        <div class="catalog-modal-tools">
          <form data-search data-search-scope="catalog" class="catalog-search">
            <input name="keyword" type="search" placeholder="搜尋明信片標題、標籤...">
            <button type="submit" aria-label="搜尋">⌕</button>
          </form>
          <div class="catalog-tools">
            <button class="link-button ${state.catalog.sort === "latest" ? "active" : ""}" type="button" data-sort="latest">最新上傳</button>
            <button class="link-button ${state.catalog.sort === "popular" ? "active" : ""}" type="button" data-sort="popular">熱門</button>
          </div>
        </div>

        ${state.catalog.error ? `<p class="api-note">${state.catalog.error}</p>` : ""}
        <div class="catalog-grid">
          ${state.catalog.loading ? catalogSkeletonCards(state.catalog.pageSize || 6) : state.catalog.items.map(catalogCard).join("")}
        </div>
        ${!state.catalog.loading && !state.catalog.items.length ? `<p class="api-note">這個城市目前還沒有明信片。</p>` : ""}
        ${state.catalog.totalPages > 1 ? `
          <div class="pagination">
            <button type="button" data-page="${Math.max(1, state.catalog.page - 1)}" ${state.catalog.page <= 1 ? "disabled" : ""}>‹</button>
            <span>${state.catalog.page} / ${state.catalog.totalPages}</span>
            <button type="button" data-page="${Math.min(state.catalog.totalPages, state.catalog.page + 1)}" ${state.catalog.page >= state.catalog.totalPages ? "disabled" : ""}>›</button>
          </div>
        ` : ""}
      </div>
      </section>
    </div>
  `;
}

function cityRail() {
  if (!state.catalog.country) return "";
  if (state.catalog.loading && !state.catalog.cities.length) {
    return `<div class="city-rail" id="city-list"><p>地區讀取中...</p></div>`;
  }
  if (!state.catalog.cities.length) return "";

  return `
    <div class="city-rail" id="city-list">
      <div class="city-rail-title">
        <strong>${state.catalog.country}</strong>
        <span>選擇地區瀏覽明信片</span>
      </div>
      <div class="city-tabs">
        ${state.catalog.cities.map(city => `
          <article class="city-card ${state.catalog.city === city.name ? "active" : ""}" data-city="${escapeAttr(city.name)}" data-show-postcards="true" role="button" tabindex="0">
            <img src="${city.imageUrl || "assets/hero-sunset.jpg"}" alt="${city.name}" ${imageFallbackAttr()}>
            <div>
              <h3>${city.name}</h3>
              <p>${city.count.toLocaleString()} 張明信片</p>
            </div>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function catalogCard(card) {
  const active = isFavorite(card);
  const key = favoriteKey(card);
  const tags = (card.tags || []).slice(0, 3);
  const cardNumber = card.legacyNumber || card.id;
  const coordinates = formatCoordinates(card);
  const obtainLabel = postcardTypeLabel(card.postcardType);
  return `
    <article class="postcard-card">
      <img src="${card.image}" alt="${card.title}" ${imageFallbackAttr()}>
      <button type="button" class="favorite-icon-button ${active ? "active" : ""}" data-favorite="${key}" aria-label="${active ? "移除收藏" : "加入收藏"} ${card.title}" title="${active ? "移除收藏" : "收藏"}">
        <svg class="icon"><use href="#icon-heart"></use></svg>
      </button>
      <div>
        <div class="postcard-title-row">
          <h3>${card.title}</h3>
        </div>
        ${tags.length ? `<div class="postcard-tags">${tags.map(tag => `<span>#${tag}</span>`).join("")}</div>` : ""}
        <div class="postcard-details">
          <div class="postcard-detail-row">
            <span>座標</span>
            <strong>${coordinates || "未提供"}</strong>
            ${coordinates ? `<button type="button" class="copy-coordinate-button" data-copy-coordinates="${escapeAttr(coordinates)}" aria-label="複製座標" title="複製座標"><svg class="icon"><use href="#icon-copy"></use></svg></button>` : ""}
          </div>
          <div class="postcard-detail-row">
            <span>取得</span>
            <strong>${obtainLabel}</strong>
          </div>
        </div>
        <footer>
          <span class="favorite-count" data-favorite-count="${key}"><svg class="icon"><use href="#icon-heart"></use></svg>${card.likes}</span>
          <span class="postcard-number">編號 ${cardNumber}</span>
        </footer>
      </div>
    </article>
  `;
}

function formatCoordinates(card) {
  const latitude = Number(card.latitude);
  const longitude = Number(card.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "";
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function postcardTypeLabel(type) {
  const labels = {
    MUSHROOM: "打菇",
    FLOWER: "花",
    EXPLORATION: "探索"
  };
  return labels[String(type || "").toUpperCase()] || "未提供";
}

function escapeAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function imageFallbackAttr() {
  return `loading="lazy" decoding="async" onerror="this.onerror=null;this.src='assets/hero-sunset.jpg';"`;
}

function logoImageAttr() {
  return `loading="lazy" decoding="async"`;
}

function siteFooter() {
  return `
    <footer class="site-footer">
      <div class="footer-brand">
        <img class="brand-logo footer-logo" src="assets/logo-header.png" alt="Postoria" ${logoImageAttr()}>
      </div>
      <nav>
        <a href="#explore" data-scroll="explore">探索世界</a>
        <a href="#popular" data-scroll="popular">熱門收藏</a>
        <a href="#latest" data-scroll="latest">我的收藏</a>
        <a href="#login">會員專區</a>
      </nav>
      <p>© 2026 Postoria. All rights reserved.</p>
    </footer>
  `;
}

function memberName() {
  return state.member?.displayName || state.member?.email || "Postorian";
}

function renderAuthActions() {
  const signedIn = Boolean(state.member);
  const name = escapeHtml(memberName());
  if (headerAuthActions) {
    headerAuthActions.innerHTML = signedIn ? `
      <a class="solid-button upload-nav-button" href="#upload">
        <svg class="icon"><use href="#icon-upload"></use></svg>
        <span>上傳明信片</span>
      </a>
      <a class="member-chip" href="#login-success" title="${escapeAttr(memberName())}">
        <svg class="icon"><use href="#icon-user-round"></use></svg>
        <span>${name}</span>
      </a>
      <button class="ghost-button" type="button" data-action="logout">登出</button>
    ` : `
      <a class="ghost-button" href="#login">登入</a>
      <a class="solid-button" href="#register">註冊會員</a>
    `;
  }

  if (mobileAuthActions) {
    mobileAuthActions.innerHTML = signedIn ? `
      <a href="#upload"><svg class="icon"><use href="#icon-upload"></use></svg>上傳明信片</a>
      <a href="#login-success"><svg class="icon"><use href="#icon-user-round"></use></svg>${name}</a>
      <button class="mobile-logout" type="button" data-action="logout">登出</button>
    ` : `
      <a href="#login"><svg class="icon"><use href="#icon-user-round"></use></svg>登入</a>
      <a class="solid-button" href="#register">註冊會員</a>
    `;
  }
}

function logo() {
  return `
    <img class="auth-logo" src="assets/logo-mark.png" alt="Postoria" ${logoImageAttr()}>
  `;
}

function field({ icon, name, type = "text", placeholder, autocomplete = "", required = true }) {
  const password = type === "password";
  const numberAttrs = type === "number" ? `step="any" inputmode="decimal"` : "";
  return `
    <label class="field">
      <svg class="icon field-icon" aria-hidden="true"><use href="#${icon}"></use></svg>
      <input name="${name}" type="${type}" placeholder="${placeholder}" ${numberAttrs} ${autocomplete ? `autocomplete="${autocomplete}"` : ""} ${required ? "required" : ""}>
      ${password ? `<button class="toggle-password" type="button" aria-label="顯示或隱藏密碼"><svg class="icon"><use href="#icon-eye"></use></svg></button>` : ""}
    </label>
  `;
}

function authShell(card, showNotice = true) {
  return `
    <section class="auth-layout">
      <aside class="welcome">
        <span class="sparkle">✦</span>
        <h1>歡迎回來！</h1>
        <p>登入以繼續探索世界的明信片，收藏美好時刻，分享你的故事。</p>
      </aside>
      <div class="auth-stack">
        ${card}
        ${showNotice ? notice() : ""}
      </div>
    </section>
  `;
}

function notice() {
  return `
    <aside class="notice">
      <span>♢</span>
      <div>
        <h3>貼心提醒</h3>
        <ul>
          <li>請確認信箱可收信，以收到重設密碼信件。</li>
          <li>目前第三方登入仍待 HTTPS 測試環境完成後再開放。</li>
        </ul>
      </div>
    </aside>
  `;
}

function loginCard() {
  return `
    <article class="auth-card">
      <a class="back-link" href="#home">← 回首頁</a>
      ${logo()}
      <h2>登入</h2>
      <p class="subtitle">還沒有帳號？ <a href="#register">立即註冊</a></p>
      <form class="auth-form" data-form="login">
        ${field({ icon: "icon-mail", name: "email", type: "email", placeholder: "電子郵件地址", autocomplete: "email" })}
        ${field({ icon: "icon-lock-keyhole", name: "password", type: "password", placeholder: "密碼", autocomplete: "current-password" })}
        <div class="form-row">
          <label class="check"><input name="remember" type="checkbox"> 記住我</label>
          <a class="text-link" href="#forgot">忘記密碼？</a>
        </div>
        <button class="primary-button" type="submit">登入</button>
        <p class="status"></p>
      </form>
      ${externalAuthActions("login")}
      <p class="switch-line">已經有 Google 帳號也可以直接登入。</p>
    </article>
  `;
}

function registerCard() {
  return `
    <article class="auth-card">
      <a class="back-link" href="#home">← 回首頁</a>
      ${logo()}
      <h2>註冊會員</h2>
      <p class="subtitle">加入我們，收藏美好時刻，分享世界！</p>
      <form class="auth-form" data-form="register">
        ${field({ icon: "icon-user", name: "displayName", placeholder: "用戶名稱", autocomplete: "name" })}
        ${field({ icon: "icon-mail", name: "email", type: "email", placeholder: "電子郵件", autocomplete: "email" })}
        ${field({ icon: "icon-lock-keyhole", name: "password", type: "password", placeholder: "密碼", autocomplete: "new-password" })}
        ${field({ icon: "icon-lock-keyhole", name: "confirmPassword", type: "password", placeholder: "確認密碼", autocomplete: "new-password" })}
        <label class="check terms">
          <input name="terms" type="checkbox" required>
          我已閱讀並同意 <a class="text-link" href="#register">服務條款</a> 與 <a class="text-link" href="#register">隱私政策</a>
        </label>
        <button class="primary-button" type="submit">註冊</button>
        <p class="status"></p>
      </form>
      ${externalAuthActions("register")}
      <p class="switch-line">已經有帳號？ <a class="text-link" href="#login">立即登入</a></p>
    </article>
  `;
}

function externalAuthActions(mode = "login") {
  const label = mode === "register" ? "使用 Google 註冊" : "使用 Google 登入";
  return `
    <div class="auth-divider"><span>或</span></div>
    <div class="social-auth-row">
      <a class="google-auth-circle" href="${externalAuthUrl("google")}" aria-label="${label}" title="${label}">
        <svg class="google-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.3 3.1-7.4Z"></path>
          <path fill="#34A853" d="M12 22c2.7 0 5-0.9 6.7-2.4L15.5 17c-.9.6-2 .9-3.5.9-2.7 0-4.9-1.8-5.7-4.2H3v2.6A10 10 0 0 0 12 22Z"></path>
          <path fill="#FBBC05" d="M6.3 13.7a6 6 0 0 1 0-3.4V7.7H3a10 10 0 0 0 0 8.6l3.3-2.6Z"></path>
          <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.7l3.3 2.6C7.1 7.9 9.3 6.1 12 6.1Z"></path>
        </svg>
      </a>
    </div>
  `;
}

function forgotCard(sent = false) {
  if (sent) {
    return `
      <article class="success-card">
        <span class="success-mark" aria-hidden="true">✓</span>
        <div>
          <h2>重設連結已發送！</h2>
          <p>我們已將重設密碼的連結發送至您的電子郵件，請檢查您的信箱。</p>
          <a class="outline-button" href="#login">返回登入</a>
        </div>
      </article>
    `;
  }

  return `
    <article class="auth-card">
      <a class="back-link" href="#login">← 返回登入</a>
      ${logo()}
      <h2>忘記密碼？</h2>
      <p class="subtitle">請輸入您的電子郵件，我們將發送重設密碼的連結給您。</p>
      <form class="auth-form" data-form="forgot">
        ${field({ icon: "icon-mail", name: "email", type: "email", placeholder: "電子郵件", autocomplete: "email" })}
        <button class="primary-button" type="submit">發送重設連結</button>
        <p class="status"></p>
      </form>
    </article>
  `;
}

function renderLoginSuccess() {
  return authShell(`
    <article class="success-card">
      <span class="success-mark" aria-hidden="true">✓</span>
      <div>
        <h2>登入成功</h2>
        <p>${state.member?.displayName || state.member?.email || "Postorian"}，歡迎回到 Postoria。</p>
        <a class="outline-button" href="#home">回到首頁</a>
      </div>
    </article>
  `, true);
}

function uploadCard() {
  if (!state.token) {
    return authShell(`
      <article class="success-card">
        <span class="success-mark" aria-hidden="true">!</span>
        <div>
          <h2>請先登入</h2>
          <p>上傳明信片需要會員身分，登入後即可送出待審核資料。</p>
          <a class="primary-button" href="#login">登入會員</a>
        </div>
      </article>
    `, true);
  }

  return authShell(`
    <article class="auth-card upload-card">
      <a class="back-link" href="#login-success">返回會員專區</a>
      ${logo()}
      <h2>上傳明信片</h2>
      <p class="subtitle">送出後會先暫存為待審核資料，審核通過後才會出現在網站。</p>
      <form class="auth-form upload-form" data-form="postcard-upload">
        <label class="field file-field">
          <svg class="field-icon"><use href="#icon-upload"></use></svg>
          <span data-file-label>選擇圖片 JPG / PNG / WebP，8MB 以內</span>
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" required>
        </label>
        ${field({ icon: "icon-mail", name: "title", placeholder: "明信片標題" })}
        <div class="upload-grid">
          ${field({ icon: "icon-globe", name: "country", placeholder: "國家" })}
          ${field({ icon: "icon-home", name: "city", placeholder: "城市 / 地區" })}
        </div>
        <div class="upload-grid">
          ${field({ icon: "icon-search", name: "latitude", type: "number", placeholder: "緯度，例如 25.0330", required: false })}
          ${field({ icon: "icon-search", name: "longitude", type: "number", placeholder: "經度，例如 121.5654", required: false })}
        </div>
        ${field({ icon: "icon-heart", name: "tags", placeholder: "標籤，可用逗號或 # 分隔", required: false })}
        <label class="field select-field">
          <svg class="field-icon"><use href="#icon-briefcase"></use></svg>
          <select name="postcardType" aria-label="取得方式">
            <option value="">取得方式</option>
            <option value="mushroom">打菇</option>
            <option value="flower">花</option>
            <option value="explore">探索</option>
          </select>
        </label>
        <button class="primary-button" type="submit">送出審核</button>
        <p class="status"></p>
      </form>
      <aside class="upload-note">
        <strong>資料規劃</strong>
        <p>目前會寫入待審核表格，圖片 path 存在 pending 目錄。未來後台審核同意後，再轉入正式明信片資料。</p>
      </aside>
    </article>
  `, true);
}

async function handleSubmit(event) {
  const searchForm = event.target.closest("form[data-search]");
  if (searchForm) {
    event.preventDefault();
    const keyword = new FormData(searchForm).get("keyword")?.toString().trim();
    if (!keyword) {
      showToast("請輸入搜尋關鍵字");
      return;
    }
    state.search = keyword.replace(/^#/, "");
    if (searchForm.dataset.searchScope === "catalog") {
      openCatalog({ keyword: state.search, page: 1, pageSize: 12, limitTop: false, title: "", showPostcards: true });
    } else {
      openCatalog({ keyword: state.search, country: "", city: "", sort: "latest", page: 1, pageSize: 12, limitTop: false, title: "", showPostcards: true });
    }
    closeSearchLightbox();
    showToast(`已搜尋「${keyword}」`);
    return;
  }

  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();

  const values = Object.fromEntries(new FormData(form).entries());
  setBusy(form, true);
  setStatus(form, "");

  try {
    if (form.dataset.form === "postcard-upload") {
      if (!state.token) {
        throw new Error("請先登入會員。");
      }

      const formData = new FormData(form);
      for (const key of ["latitude", "longitude", "country", "city", "tags", "postcardType"]) {
        if (!String(formData.get(key) || "").trim()) {
          formData.delete(key);
        }
      }

      const upload = await fetchAuthorizedJson("/api/members/me/postcard-uploads", {
        method: "POST",
        body: formData
      });
      state.uploads = [upload, ...state.uploads];
      form.reset();
      form.querySelector("[data-file-label]").textContent = "選擇圖片 JPG / PNG / WebP，8MB 以內";
      setStatus(form, "已送出審核，通過前不會顯示在網站。");
      showToast("明信片已送出審核");
      return;
    }

    if (form.dataset.form === "login") {
      const result = await apiPost("/api/members/login", {
        email: values.email,
        password: values.password
      });
      setSession(result.member, result.accessToken, result.expiresAt);
      showToast("登入成功");
      location.hash = "login-success";
    }

    if (form.dataset.form === "register") {
      if (values.password !== values.confirmPassword) {
        throw new Error("兩次輸入的密碼不一致。");
      }
      await apiPost("/api/members/register", {
        email: values.email,
        password: values.password,
        displayName: values.displayName
      });
      showToast("註冊成功，請登入");
      location.hash = "login";
    }

    if (form.dataset.form === "forgot") {
      await apiPost("/api/members/forgot-password", { email: values.email });
      sessionStorage.setItem("postoria-reset-sent", "1");
      showToast("重設連結已送出");
      render();
    }
  } catch (error) {
    setStatus(form, error.message, true);
    showToast(error.message);
  } finally {
    setBusy(form, false);
  }
}

async function handleClick(event) {
  const homeBrand = event.target.closest(".site-header .brand, .mobile-brand, .bottom-nav a[href='#home']");
  if (homeBrand) {
    event.preventDefault();
    resetHomeState();
    history.pushState(null, "", "#home");
    closeMobileMenu();
    render();
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    return;
  }

  const headerSearchButton = event.target.closest(".header-search button");
  if (headerSearchButton) {
    const form = headerSearchButton.closest(".header-search");
    const compactHeader = window.matchMedia("(max-width: 1050px)").matches;
    if (compactHeader) {
      event.preventDefault();
      openSearchLightbox(form.querySelector("input")?.value || "");
      return;
    }
  }

  if (event.target.closest("[data-search-close]")) {
    closeSearchLightbox();
    return;
  }

  const menuToggle = event.target.closest("[data-menu-toggle]");
  if (menuToggle) {
    const open = !mobileMenu.classList.contains("open");
    mobileMenu.classList.toggle("open", open);
    mobileMenu.setAttribute("aria-hidden", String(!open));
    return;
  }

  const dot = event.target.closest("[data-dot]");
  if (dot) {
    state.slide = Number(dot.dataset.dot);
    renderHeroOnly();
    return;
  }

  const toggle = event.target.closest(".toggle-password");
  if (toggle) {
    const input = toggle.closest(".field").querySelector("input");
    input.type = input.type === "password" ? "text" : "password";
    return;
  }

  const scrollLink = event.target.closest("[data-scroll]");
  if (scrollLink) {
    if (scrollLink.dataset.scroll === "popular") {
      event.preventDefault();
      history.pushState(null, "", "#popular");
      openPopularCatalog();
      closeMobileMenu();
      return;
    }

    if (scrollLink.dataset.scroll === "latest") {
      event.preventDefault();
      history.pushState(null, "", "#latest");
      openFavoriteCatalog();
      closeMobileMenu();
      return;
    }

    if (scrollLink.dataset.scroll === "explore") {
      event.preventDefault();
      resetHomeState();
      history.pushState(null, "", "#explore");
      closeMobileMenu();
      render();
      requestAnimationFrame(() => {
        document.querySelector("#explore")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }

    const target = document.querySelector(`#${scrollLink.dataset.scroll}`);
    if (target) {
      event.preventDefault();
      history.pushState(null, "", `#${scrollLink.dataset.scroll}`);
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      closeMobileMenu();
      return;
    }
  }

  const keyword = event.target.closest("[data-keyword]");
  if (keyword) {
    state.search = keyword.dataset.keyword;
    openCatalog({ keyword: state.search, country: "", city: "", sort: "latest", page: 1, pageSize: 12, limitTop: false, title: "", showPostcards: true });
    return;
  }

  const country = event.target.closest("[data-country]");
  if (country) {
    openCatalog({ country: country.dataset.country, city: "", keyword: "", sort: "latest", page: 1, pageSize: 12, limitTop: false, title: "", showPostcards: false });
    return;
  }

  const city = event.target.closest("[data-city]");
  if (city) {
    const showPostcards = city.dataset.showPostcards === "true";
    if (showPostcards && state.catalog.city === city.dataset.city && state.catalog.showPostcards) {
      return;
    }
    openCatalog({
      city: city.dataset.city,
      keyword: "",
      page: 1,
      pageSize: 12,
      limitTop: false,
      title: "",
      showPostcards
    });
    return;
  }

  const sort = event.target.closest("[data-sort]");
  if (sort) {
    openCatalog({ sort: sort.dataset.sort, page: 1, pageSize: 12, limitTop: false, title: "" });
    return;
  }

  const page = event.target.closest("[data-page]");
  if (page) {
    openCatalog({ page: Number(page.dataset.page) });
    return;
  }

  const favorite = event.target.closest("[data-favorite]");
  if (favorite) {
    const id = favorite.dataset.favorite;
    if (!state.token) {
      showToast("請先登入會員後再收藏");
      location.hash = "login";
      return;
    }

    const isActive = state.favorites.includes(id);
    favorite.disabled = true;
    try {
      const result = await fetchAuthorizedJson(`/api/members/me/favorites/${encodeURIComponent(id)}`, {
        method: isActive ? "DELETE" : "POST"
      });
      state.favorites = isActive
        ? state.favorites.filter(item => item !== id)
        : [...state.favorites, id];
      localStorage.setItem("postoria-favorites", JSON.stringify(state.favorites));
      syncFavoriteButtons(id, !isActive, result.favoriteCount);
      showToast(isActive ? "已移除收藏" : "已加入收藏");
    } catch (error) {
      showToast(error.message || "收藏更新失敗");
    } finally {
      favorite.disabled = false;
    }
    return;
  }

  const copyCoordinates = event.target.closest("[data-copy-coordinates]");
  if (copyCoordinates) {
    const text = copyCoordinates.dataset.copyCoordinates;
    const copied = await copyText(text);
    showToast(copied ? "座標已複製" : "無法複製座標，請手動選取");
    return;
  }

  const action = event.target.closest("[data-action]");
  if (action?.dataset.action === "clear-search") {
    state.search = "";
    render();
    return;
  }

  if (action?.dataset.action === "close-catalog") {
    closeCatalogModal();
    return;
  }

  if (action?.dataset.action === "view-all") {
    openCatalog({
      country: "",
      city: "",
      keyword: "",
      sort: action.dataset.viewSort || "latest",
      page: 1,
      pageSize: 12,
      limitTop: false,
      title: "",
      showPostcards: true
    });
    return;
  }

  if (action?.dataset.action === "show-favorites") {
    const count = state.favorites.length;
    showToast(count ? `目前已收藏 ${count} 張明信片` : "你尚未收藏明信片");
    return;
  }

  if (action?.dataset.action === "logout") {
    clearSession();
    closeCatalogModal();
    mobileMenu.classList.remove("open");
    mobileMenu.setAttribute("aria-hidden", "true");
    showToast("已登出");
    location.hash = "home";
    render();
    return;
  }

  if (action?.dataset.action === "need-login") {
    showToast(`${action.dataset.label}需登入會員後使用`);
    location.hash = "login";
  }
}

async function copyText(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to the legacy selection path below.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  textarea.remove();
  return copied;
}

function openSearchLightbox(value = "") {
  if (!searchLightbox) return;
  const input = searchLightbox.querySelector("input");
  searchLightbox.classList.add("open");
  searchLightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("search-modal-open");
  if (input) {
    input.value = value;
    requestAnimationFrame(() => input.focus());
  }
}

function closeSearchLightbox() {
  if (!searchLightbox) return;
  searchLightbox.classList.remove("open");
  searchLightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("search-modal-open");
}

function closeCatalogModal() {
  if (!(state.catalog.country && state.catalog.city && state.catalog.showPostcards)) return;
  state.catalog = {
    ...state.catalog,
    city: "",
    keyword: "",
    showPostcards: false,
    items: [],
    total: 0,
    totalPages: 0,
    error: ""
  };
  render();
}

function resetHomeState() {
  state.search = "";
  state.catalog = {
    ...state.catalog,
    active: false,
    country: "",
    city: "",
    keyword: "",
    sort: "latest",
    page: 1,
    pageSize: 12,
    limitTop: false,
    title: "",
    showPostcards: false,
    items: [],
    total: 0,
    totalPages: 0,
    loading: false,
    error: ""
  };
  document.body.classList.remove("catalog-modal-open", "search-modal-open");
  closeSearchLightbox();
}

function render() {
  const route = getRoute();
  if (route === "login-success") {
    consumeExternalAuthResult();
  }
  renderAuthActions();
  document.body.classList.toggle("catalog-modal-open", false);
  if (route !== "forgot") {
    sessionStorage.removeItem("postoria-reset-sent");
  }

  if (route === "login") {
    app.innerHTML = authShell(loginCard());
  } else if (route === "register") {
    app.innerHTML = authShell(registerCard());
  } else if (route === "forgot") {
    app.innerHTML = authShell(forgotCard(sessionStorage.getItem("postoria-reset-sent") === "1"));
  } else if (route === "upload") {
    app.innerHTML = uploadCard();
  } else if (route === "login-success") {
    app.innerHTML = renderLoginSuccess();
  } else {
    loadHomeData();
    app.innerHTML = renderHome();
    document.body.classList.toggle("catalog-modal-open", Boolean(state.catalog.country && state.catalog.city && state.catalog.showPostcards));
    if (pendingAnchorScroll) {
      const targetId = pendingAnchorScroll;
      pendingAnchorScroll = "";
      requestAnimationFrame(() => document.querySelector(`#${targetId}`)?.scrollIntoView({ block: "start" }));
    }
  }
}

if (state.token) {
  loadMemberFavorites();
}

const initialRoute = getRoute();
if (initialRoute === "popular") {
  openPopularCatalog();
} else if (initialRoute === "latest") {
  openFavoriteCatalog();
} else {
  render();
}
