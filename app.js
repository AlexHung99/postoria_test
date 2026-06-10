const defaultApiBase = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "http://localhost:5073"
  : "https://api.postoria.net";
const API_BASE = localStorage.getItem("postoria-api-base") || defaultApiBase;
const defaultShareBase = "https://pikimin.postoria.net";
const savedShareBase = localStorage.getItem("postoria-share-base");
const SHARE_BASE = savedShareBase && !/api\.postoria\.net/i.test(savedShareBase)
  ? savedShareBase
  : defaultShareBase;
const SUPPORTED_LANGUAGES = ["zh-TW", "en", "ja"];
const LANGUAGE_LABELS = {
  "zh-TW": "蝜葉",
  en: "EN",
  ja: "?交隤?
};
const DATA_JSON_OVERRIDE_URL = localStorage.getItem("postoria-data-json-url") || "";
const AUTH_RETURN_STATE_KEY = "postoria-auth-return-state";

function normalizeLanguage(value) {
  const lang = String(value || "").trim();
  if (/^ja/i.test(lang)) return "ja";
  if (/^en/i.test(lang)) return "en";
  return "zh-TW";
}

function preferredLanguage() {
  const saved = localStorage.getItem("postoria-language");
  if (saved) return normalizeLanguage(saved);
  return normalizeLanguage(navigator.language || navigator.userLanguage || "zh-TW");
}

function dataJsonUrlForLanguage(lang) {
  if (DATA_JSON_OVERRIDE_URL) return DATA_JSON_OVERRIDE_URL;
  const normalized = normalizeLanguage(lang);
  if (["localhost", "127.0.0.1"].includes(location.hostname)) {
    return normalized === "zh-TW"
      ? `${API_BASE}/data.json`
      : `${API_BASE}/data.${normalized}.json`;
  }
  return normalized === "zh-TW"
    ? "https://assets.postoria.net/data/data.json"
    : `https://assets.postoria.net/data/data.${normalized}.json`;
}

function dataJsonFallbackUrlForLanguage(lang) {
  const normalized = normalizeLanguage(lang);
  return normalized === "zh-TW"
    ? `${API_BASE}/data.json`
    : `${API_BASE}/data.${normalized}.json`;
}

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
const mobileMenu = document.querySelector("[data-mobile-menu]");
const searchLightbox = document.querySelector("[data-search-lightbox]");
const headerAuthActions = document.querySelector("[data-header-auth]");
const mobileAuthActions = document.querySelector("[data-mobile-auth]");
const homeAnchors = new Set(["explore"]);
let pendingAnchorScroll = homeAnchors.has(getRoute()) ? getRoute() : "";

const state = {
  lang: preferredLanguage(),
  member: readJson("postoria-member"),
  token: localStorage.getItem("postoria-token") || "",
  slide: 0,
  search: "",
  favorites: readJson("postoria-favorites") || [],
  uploads: [],
  uploadResult: null,
  imageLightbox: null,
  loginPrompt: null,
  publicData: null,
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
    eyebrow: "靘銝????靽∠?",
    title: "?嗉?蝢末?嚗?鈭思???,
    copy: "?Ｙ揣?犖???塚??渡??芸楛???霈?撘菜?靽∠??賣?????,
    place: "Gangnam Library"
  },
  {
    image: "assets/banner-02.jpg",
    eyebrow: "??憸冽????畾?,
    title: "???對??園脖????,
    copy: "?冽?蝐扎?撣??振??嚗翰??唳???縑??,
    place: "Postcard Journey"
  },
  {
    image: "assets/banner-03.jpg",
    eyebrow: "?梢??嗉?瘥?湔",
    title: "頝??嗉?璁蝝ａ???,
    copy: "敺犖瘞??靽∠???嚗?曆?銝撘菜?嗉??◢?胯?,
    place: "Blooming City"
  },
  {
    image: "assets/banner-04.jpg",
    eyebrow: "??瘣餃? Banner 皜祈岫",
    title: "?刻??????唳???,
    copy: "?Ⅱ隤憚?剜?靘???鋆?嚗??踵?甇?? Postoria 銝餉?閬箝?,
    place: "Archive Banner"
  },
  {
    image: "assets/banner-05.jpg",
    eyebrow: "Postoria 擐?頛芣",
    title: "?游??嗉??亙?喳??乩?",
    copy: "擐??遣蝡?閬箄?撠汗嚗??郊銝脫鞈?摨怠摰嫘?,
    place: "Archive Banner"
  }
];

const countries = [
  ["?交", "JAPAN", "1,250 撘菜?靽∠?", "assets/kyoto.jpg"],
  ["撣?", "GREECE", "987 撘菜?靽∠?", "assets/hero-sunset.jpg"],
  ["蝢?", "UNITED STATES", "2,356 撘菜?靽∠?", "assets/california.jpg"],
  ["瘜?", "FRANCE", "1,102 撘菜?靽∠?", "assets/hongkong.jpg"],
  ["蝢拙之??, "ITALY", "1,675 撘菜?靽∠?", "assets/osaka.jpg"],
  ["?ㄚ", "SWITZERLAND", "743 撘菜?靽∠?", "assets/switzerland.jpg"]
];

const cards = [
  { id: "JP-0001", title: "鈭祇?餅?瘞游笑", meta: "?交?颱漪??, image: "assets/kyoto.jpg", likes: "2,845", views: "12,631", tags: ["?交", "鈭祇", "撖箏?"] },
  { id: "IT-0032", title: "Positano", meta: "蝢拙之??, image: "assets/osaka.jpg", likes: "2,320", views: "9,876", tags: ["蝢拙之??, "瘚琿?"] },
  { id: "US-0105", title: "California Coast", meta: "蝢??餃?撌?, image: "assets/california.jpg", likes: "2,105", views: "8,542", tags: ["蝢?", "瘚瑕硫"] },
  { id: "CH-0077", title: "Lauterbrunnen", meta: "?ㄚ", image: "assets/switzerland.jpg", likes: "1,987", views: "7,654", tags: ["?ㄚ", "撅望"] },
  { id: "NO-0012", title: "Aurora Night", meta: "?芸?", image: "assets/norway.jpg", likes: "1,832", views: "7,103", tags: ["?芸?", "璆萄?"] }
];

const latest = [
  { id: "JP-0201", title: "憭折???, meta: "?交?餃之??, image: "assets/osaka.jpg", likes: "128", tags: ["?交", "憭折"] },
  { id: "IT-0119", title: "Cinque Terre", meta: "蝢拙之??, image: "assets/austria.jpg", likes: "96", tags: ["蝢拙之??, "瘚琿?"] },
  { id: "AT-0077", title: "Hallstatt", meta: "憟批??, image: "assets/austria.jpg", likes: "87", tags: ["憟批??, "皝"] },
  { id: "IS-0012", title: "Iceland Aurora", meta: "?啣雀", image: "assets/norway.jpg", likes: "64", tags: ["?啣雀", "璆萄?"] }
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
  const languageSelect = event.target.closest("[data-language-select]");
  if (languageSelect) {
    changeLanguage(languageSelect.value);
    return;
  }

  const input = event.target.closest("input[type='file'][name='image']");
  if (!input) return;

  const label = input.closest(".file-field")?.querySelector("[data-file-label]");
  if (label) {
    label.textContent = input.files?.[0]?.name || "?豢??? JPG / PNG / WebP嚗?MB 隞亙";
  }
}

function changeLanguage(lang) {
  const nextLang = normalizeLanguage(lang);
  if (state.lang === nextLang) return;
  state.lang = nextLang;
  localStorage.setItem("postoria-language", nextLang);
  state.publicData = null;
  state.home = null;
  state.homeError = "";
  state.catalog.items = [];
  state.catalog.cities = [];
  state.catalog.total = 0;
  state.catalog.totalPages = 0;
  loadHomeData();
  renderAuthActions();
  render();
}

function handleRouteChange() {
  const route = getRoute();
  state.imageLightbox = null;
  state.loginPrompt = null;
  if (route === "search") {
    state.search = getHashParams().get("q") || "";
    state.catalog = {
      ...state.catalog,
      active: false,
      country: "",
      city: "",
      keyword: "",
      showPostcards: false
    };
    render();
    requestAnimationFrame(() => document.querySelector(".search-results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    return;
  }
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
  state.uploadResult = null;
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
    state.publicData = await fetchPublicDataJson();
    state.home = normalizeHomeData(state.publicData);
    state.homeError = "";
  } catch {
    state.homeError = "?桀??⊥?霈??API嚗?憿舐內擐??汗鞈???;
  } finally {
    state.homeLoading = false;
    render();
  }
}

async function fetchPublicDataJson() {
  const urls = [...new Set([
    dataJsonUrlForLanguage(state.lang),
    dataJsonFallbackUrlForLanguage(state.lang),
    dataJsonUrlForLanguage("zh-TW"),
    dataJsonFallbackUrlForLanguage("zh-TW")
  ])];
  let lastError = null;

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`data json ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("data json unavailable");
}

function normalizeHomeData(data) {
  const banners = (data.banners || [])
    .filter(item => item.imageUrl)
    .map(item => ({
      image: item.imageUrl,
      place: item.title || "Postoria"
    }));

  return {
    banners: banners.length ? banners : heroSlides,
    countries: (data.countries || []).map(item => [
      item.name,
      item.englishName || item.name,
      `${Number(item.count || 0).toLocaleString()} 撘菜?靽∠?`,
      item.imageUrl || "assets/hero-sunset.jpg"
    ]),
    popular: (data.popular || []).map(mapApiPostcard),
    latest: (data.latest || data.postcards || []).slice(0, 8).map(mapApiPostcard)
  };
}

function mapApiPostcard(item) {
  const typeTag = postcardTypeHashtag(item.postcardType);
  const tags = Array.from(new Set([
    ...(Array.isArray(item.tags) ? item.tags : []),
    typeTag
  ].filter(Boolean)));

  return {
    id: item.legacyId || item.id,
    uid: item.id,
    title: item.title,
    meta: [item.country, item.city].filter(Boolean).join("??),
    country: item.country || "",
    city: item.city || "",
    image: item.thumbnailUrl || item.imageUrl || "assets/hero-sunset.jpg",
    fullImage: item.imageUrl || item.mediumImageUrl || item.thumbnailUrl || "assets/hero-sunset.jpg",
    mediumImage: item.mediumImageUrl || item.imageUrl || item.thumbnailUrl || "assets/hero-sunset.jpg",
    likes: Number(item.likeCount || 0).toLocaleString(),
    views: Number(item.viewCount || 0).toLocaleString(),
    tags,
    legacyNumber: item.legacyNumber,
    latitude: item.latitude,
    longitude: item.longitude,
    postcardType: item.postcardType,
    shareText: item.shareText || ""
  };
}

async function openCatalog(next = {}) {
  if (!state.publicData && !state.homeLoading) {
    await loadHomeData();
  }

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
    const cities = state.catalog.country
      ? getLocalCities(state.catalog.country)
      : [];
    const postcards = showPostcards ? getLocalPostcards({
      country: state.catalog.country,
      city: state.catalog.city,
      keyword: state.catalog.keyword,
      sort: state.catalog.sort,
      page: state.catalog.page,
      pageSize: state.catalog.pageSize
    }) : {
      items: [],
      total: 0,
      totalPages: 0
    };

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
      error: "鞈?霈?仃??隢?敺?閰艾?
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

function getLocalCities(country) {
  return state.publicData?.citiesByCountry?.[country] || [];
}

function parseSearchTerms(keyword = "") {
  return String(keyword || "")
    .split(/[\s,嚗+/)
    .map(term => term.trim().replace(/^#+/, "").toLowerCase())
    .filter(Boolean);
}

function matchesSearchTerms(fields, terms) {
  const normalizedFields = fields
    .filter(value => value !== undefined && value !== null)
    .map(value => String(value).replace(/^#+/, "").toLowerCase());
  return terms.every(term => normalizedFields.some(value => value.includes(term)));
}

function getLocalPostcards({ country = "", city = "", keyword = "", sort = "latest", page = 1, pageSize = 20 } = {}) {
  const searchTerms = parseSearchTerms(keyword);
  let items = [...(state.publicData?.postcards || [])];

  if (country) {
    items = items.filter(item => item.country === country);
  }
  if (city) {
    items = items.filter(item => item.city === city);
  }
  if (searchTerms.length) {
    items = items.filter(item => {
      const fields = [
        item.title,
        item.country,
        item.city,
        item.legacyId,
        item.legacyNumber,
        ...(item.tags || [])
      ];
      return matchesSearchTerms(fields, searchTerms);
    });
  }

  if (sort === "popular") {
    items.sort((a, b) =>
      Number(b.likeCount || 0) - Number(a.likeCount || 0) ||
      Number(b.viewCount || 0) - Number(a.viewCount || 0) ||
      Number(a.legacyNumber || 0) - Number(b.legacyNumber || 0)
    );
  } else {
    items.sort((a, b) =>
      Number(b.legacyNumber || 0) - Number(a.legacyNumber || 0) ||
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }

  const total = items.length;
  const start = (Math.max(1, page) - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

function allPostcards() {
  return (state.publicData?.postcards || []).map(mapApiPostcard);
}

function postcardShareUrl(card) {
  const shortId = card?.legacyNumber ? String(card.legacyNumber).replace(/^pc_/i, "") : "";
  return `${SHARE_BASE.replace(/\/$/, "")}/p/${encodeURIComponent(shortId || favoriteKey(card))}`;
}

function isPostcardDetailRoute(route) {
  return route.startsWith("postcard/") || route.startsWith("pc/");
}

function postcardRouteId(route) {
  return route.replace(/^(postcard|pc)\//, "");
}

function findPostcardById(value) {
  const target = decodeURIComponent(value || "").trim();
  if (!target) return null;
  return allPostcards().find(card => {
    const keys = [
      card.uid,
      card.id,
      card.legacyNumber,
      card.legacyNumber ? `pc_${card.legacyNumber}` : ""
    ].map(item => String(item || ""));
    return keys.includes(target);
  }) || null;
}

function absoluteUrl(hash = location.hash || "#home") {
  return `${location.origin}${location.pathname}${location.search}${hash}`;
}

function setMeta(name, content, attr = "name") {
  if (!content) return;
  let element = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function updatePostcardMeta(card) {
  if (!card) {
    document.title = "Postoria";
    return;
  }
  const title = `Postoria嚚?{card.title}`;
  const description = [card.country, card.city, postcardTypeLabel(card.postcardType), `蝺刻? ${card.legacyNumber || card.id}`]
    .filter(Boolean)
    .join("??);
  document.title = title;
  setMeta("description", description);
  setMeta("og:title", title, "property");
  setMeta("og:description", description, "property");
  setMeta("og:image", card.fullImage || card.image, "property");
  setMeta("og:url", absoluteUrl(postcardDetailUrl(card)), "property");
  setMeta("twitter:card", "summary_large_image");
}

function updateDefaultMeta() {
  document.title = "Postoria";
  setMeta("description", "Postoria postcard collection");
  setMeta("og:title", "Postoria", "property");
  setMeta("og:description", "Postoria postcard collection", "property");
  setMeta("og:url", absoluteUrl("#home"), "property");
  setMeta("twitter:card", "summary_large_image");
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

function scrollCatalogPostcardsTop() {
  const scrollToGrid = () => {
    const grid = document.querySelector(".catalog-main .catalog-grid") || document.querySelector("#catalog .catalog-grid");
    if (!grid) return;

    const main = document.querySelector(".catalog-main");
    const modal = document.querySelector(".catalog-modal");
    const scrollTarget = [main, modal].find(container =>
      container &&
      container.contains(grid) &&
      container.scrollHeight > container.clientHeight + 1
    );

    if (scrollTarget) {
      const gridTop = grid.getBoundingClientRect().top;
      const targetTop = scrollTarget.getBoundingClientRect().top;
      scrollTarget.scrollTo({
        top: Math.max(0, scrollTarget.scrollTop + gridTop - targetTop - 16),
        behavior: "auto"
      });
      return;
    }

    grid.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  requestAnimationFrame(scrollToGrid);
  window.setTimeout(scrollToGrid, 120);
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
      ? "霈?葉..."
      : `??${state.catalog.total.toLocaleString()} 撘菜?靽∠?`;
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
    empty.textContent = "?桀?瘝?蝚血?璇辣??靽∠???;
    grid?.after(empty);
  }
  if (main && state.catalog.totalPages > 1) {
    const pagination = document.createElement("div");
    pagination.className = "pagination";
    pagination.dataset.catalogDynamic = "true";
    pagination.innerHTML = `
      <button type="button" data-page="${Math.max(1, state.catalog.page - 1)}" ${state.catalog.page <= 1 ? "disabled" : ""}>??/button>
      <span>${state.catalog.page} / ${state.catalog.totalPages}</span>
      <button type="button" data-page="${Math.min(state.catalog.totalPages, state.catalog.page + 1)}" ${state.catalog.page >= state.catalog.totalPages ? "disabled" : ""}>??/button>
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
    throw new Error("?餃撌脤???隢??啁??);
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
      throw new Error("?餃撌脤???隢??啁??);
    }
    throw new Error(apiErrorMessage(data, `API ${response.status}`));
  }
  return data;
}

function apiErrorMessage(data, fallback) {
  const errors = data?.errors;
  if (errors && typeof errors === "object") {
    const messages = Object.values(errors).flat().filter(Boolean);
    if (messages.length) {
      return messages.join(" ");
    }
  }

  return data?.message || data?.title || fallback;
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
    const label = isActive ? "蝘駁?嗉?" : "??嗉?";
    if (button.classList.contains("favorite-icon-button")) {
      button.title = isActive ? "蝘駁?嗉?" : "?嗉?";
      button.setAttribute("aria-label", label);
      return;
    }
    if (button.classList.contains("detail-favorite-button")) {
      button.textContent = isActive ? "撌脫?? : "?嗉?";
      return;
    }

    const text = button.textContent.trim();
    if (text) {
      button.textContent = text.replace(/^[?乒]/, isActive ? "?? : "??);
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

function getHashParams() {
  const [, query = ""] = (location.hash || "").replace(/^#+/, "").split("?");
  return new URLSearchParams(query);
}

function searchRouteUrl(keyword) {
  return `#search?q=${encodeURIComponent(keyword || "")}`;
}

function postcardDetailUrl(card, options = {}) {
  const shortId = card?.legacyNumber ? String(card.legacyNumber).replace(/^pc_/i, "") : "";
  const base = `#pc/${encodeURIComponent(shortId || favoriteKey(card))}`;
  if (options.from === "search" && options.query) {
    return `${base}?from=search&q=${encodeURIComponent(options.query)}`;
  }
  return base;
}

function postcardDetailBackUrl(route) {
  const params = getHashParams();
  if (params.get("from") === "search") {
    return searchRouteUrl(params.get("q") || state.search || "");
  }
  return "#home";
}

function rememberAuthReturnState() {
  const snapshot = {
    hash: location.hash || "#home",
    catalog: state.catalog?.active
      ? {
        active: state.catalog.active,
        country: state.catalog.country,
        city: state.catalog.city,
        keyword: state.catalog.keyword,
        sort: state.catalog.sort,
        page: state.catalog.page,
        pageSize: state.catalog.pageSize,
        limitTop: state.catalog.limitTop,
        title: state.catalog.title,
        showPostcards: state.catalog.showPostcards
      }
      : null
  };
  sessionStorage.setItem(AUTH_RETURN_STATE_KEY, JSON.stringify(snapshot));
}

function readAuthReturnState() {
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_RETURN_STATE_KEY) || "null");
  } catch {
    return null;
  } finally {
    sessionStorage.removeItem(AUTH_RETURN_STATE_KEY);
  }
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
    const returnState = readAuthReturnState();
    const returnHash = returnState?.hash && !/^#?(login|register|forgot|login-success)/.test(returnState.hash)
      ? returnState.hash
      : "#login-success";
    history.replaceState(null, "", `${location.pathname}${location.search}${returnHash}`);
    if (returnState?.catalog?.active) {
      openCatalog(returnState.catalog);
    } else {
      requestAnimationFrame(render);
    }
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
    throw new Error(apiErrorMessage(data, "API 隢?憭望?嚗?蝔??岫??));
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
            <h2 class="explore-title"><svg class="icon"><use href="#icon-globe"></use></svg>?Ｙ揣銝? <small>靘?振??撣?憿?/small></h2>
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
            <h2 class="explore-title"><svg class="icon"><use href="#icon-globe"></use></svg>?Ｙ揣銝? <small>靘?振??撣?憿?/small></h2>
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
      ${slides.map((_, index) => `<button type="button" data-dot="${index}" class="${index === state.slide ? "active" : ""}" aria-label="???啁洵 ${index + 1} 撘?></button>`).join("")}
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
    title: "?梢??嗉? TOP 50",
    showPostcards: true
  });
}

async function openFavoriteCatalog() {
  if (!state.token) {
    showToast("隢??餃?敺?????);
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
    title: "?嗉???",
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
      error: error.message || "?⊥?霈?????
    };
  }

  render();
  requestAnimationFrame(() => document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function renderHeroOnly() {
  const hero = document.querySelector("#hero");
  if (hero) hero.innerHTML = heroMarkup();
}

function renderPostcardDetail(route) {
  if (!state.publicData && !state.homeLoading && !state.homeError) {
    loadHomeData();
  }
  if (!state.publicData) {
    return `
      <section class="postcard-detail-page">
        <div class="postcard-detail-shell postcard-detail-loading">
          <div class="detail-image-skeleton skeleton-card"></div>
          <div class="detail-copy-skeleton">
            ${skeletonItems(5, "skeleton-line").join("")}
          </div>
        </div>
      </section>
    `;
  }

  const id = postcardRouteId(route);
  const card = findPostcardById(id);
  updatePostcardMeta(card);
  if (!card) {
    return `
      <section class="postcard-detail-page">
        <div class="postcard-detail-empty">
          <p>?曆??圈撐?縑???航撌脖??嗆????撌脣仃??/p>
          <a class="solid-button" href="#home">?擐?</a>
        </div>
      </section>
    `;
  }

  const active = isFavorite(card);
  const key = favoriteKey(card);
  const coordinates = formatCoordinates(card);
  const tags = card.tags || [];
  const backUrl = postcardDetailBackUrl(route);

  return `
    <section class="postcard-detail-page">
      <div class="postcard-detail-toolbar">
        <a class="back-link detail-back-link" href="${escapeAttr(backUrl)}">???游??桀???靽∠?</a>
        <div class="detail-actions detail-toolbar-actions">
          <button type="button" class="outline-button favorite-button detail-favorite-button ${active ? "active" : ""}" data-favorite="${escapeAttr(key)}">${active ? "撌脫?? : "?嗉?"}</button>
          <button type="button" class="outline-button" data-share-postcard="${escapeAttr(key)}">?澈</button>
          <button type="button" class="outline-button" data-copy-postcard-link="${escapeAttr(key)}">銴ˊ???</button>
        </div>
      </div>
      <article class="postcard-detail-shell">
        <div class="postcard-detail-media">
          <button class="postcard-detail-image-button" type="button" data-detail-image="${escapeAttr(card.fullImage || card.image)}" data-detail-title="${escapeAttr(card.title)}">
            <img src="${card.mediumImage || card.fullImage || card.image}" alt="${escapeAttr(card.title)}" ${imageFallbackAttr()}>
          </button>
        </div>
        <div class="postcard-detail-content">
          <div class="detail-kicker">${escapeHtml(card.country || "Postoria")}${card.city ? ` / ${escapeHtml(card.city)}` : ""}</div>
          <h1>${escapeHtml(card.title)}</h1>
          ${tags.length ? `<div class="postcard-tags detail-tags">${tags.map(tag => `<button type="button" data-keyword="${escapeAttr(tag)}">#${escapeHtml(tag)}</button>`).join("")}</div>` : ""}
          <dl class="detail-facts">
            <div><dt>蝺刻?</dt><dd>${escapeHtml(card.legacyNumber || card.id || "?芾身摰?)}</dd></div>
            <div><dt>???孵?</dt><dd>${escapeHtml(postcardTypeLabel(card.postcardType))}</dd></div>
            <div><dt>摨扳?</dt><dd>${coordinates || "?芣?靘?}${coordinates ? `<button type="button" class="copy-coordinate-button" data-copy-coordinates="${escapeAttr(coordinates)}" title="銴ˊ摨扳?"><svg class="icon"><use href="#icon-copy"></use></svg></button>` : ""}</dd></div>
            <div><dt>?嗉?</dt><dd><span data-favorite-count="${escapeAttr(key)}">${escapeHtml(card.likes)}</span></dd></div>
            <div><dt>?汗</dt><dd>${escapeHtml(card.views)}</dd></div>
          </dl>
          <div class="detail-actions detail-inline-actions">
            <button type="button" class="outline-button favorite-button detail-favorite-button ${active ? "active" : ""}" data-favorite="${escapeAttr(key)}">${active ? "撌脫?? : "?嗉?"}</button>
            <button type="button" class="outline-button" data-share-postcard="${escapeAttr(key)}">?澈</button>
            <button type="button" class="outline-button" data-copy-postcard-link="${escapeAttr(key)}">銴ˊ???</button>
          </div>
        </div>
      </article>
      ${imageLightbox()}
    </section>
  `;
}

function imageLightbox() {
  if (!state.imageLightbox) return "";
  return `
    <div class="postcard-image-lightbox open">
      <button class="postcard-image-backdrop" type="button" data-action="close-detail-image" aria-label="????"></button>
      <figure>
        <button class="postcard-image-close" type="button" data-action="close-detail-image" aria-label="????">?</button>
        <img src="${escapeAttr(state.imageLightbox.image)}" alt="${escapeAttr(state.imageLightbox.title || "Postoria postcard")}">
        ${state.imageLightbox.title ? `<figcaption>${escapeHtml(state.imageLightbox.title)}</figcaption>` : ""}
      </figure>
    </div>
  `;
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
      <a class="postcard-image-link" href="${postcardDetailUrl(card)}"><img src="${card.image}" alt="${card.title}" ${imageFallbackAttr()}></a>
      <div>
        <h3><a href="${postcardDetailUrl(card)}">${card.title}</a></h3>
        <p>${card.meta}</p>
        <footer>
          <button type="button" class="favorite-button ${active ? "active" : ""}" data-favorite="${key}" aria-label="?嗉? ${card.title}">${active ? "?? : "??} ${card.likes}</button>
          <span>??${card.views}</span>
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
      <a class="postcard-image-link" href="${postcardDetailUrl(card)}"><img src="${card.image}" alt="${card.title}" ${imageFallbackAttr()}></a>
      <div>
        <h3><a href="${postcardDetailUrl(card)}">${card.title}</a></h3>
        <p>${card.meta}</p>
        <footer><button type="button" class="favorite-button ${active ? "active" : ""}" data-favorite="${key}" aria-label="?嗉? ${card.title}">${active ? "?? : "??} ${card.likes}</button></footer>
      </div>
    </article>
  `;
}

function searchResults() {
  const searchTerms = parseSearchTerms(state.search);
  const allCards = [...(state.home?.popular || cards), ...(state.home?.latest || latest)];
  const results = allCards.filter(card => {
    const fields = [card.id, card.title, card.meta, card.country, card.city, postcardTypeLabel(card.postcardType), ...(card.tags || [])];
    return matchesSearchTerms(fields, searchTerms);
  });

  return `
    <section class="section-block search-results">
      <div class="section-heading">
        <div>
          <h2><span>??/span>??蝯?</h2>
          <p>??{state.search}? ${results.length} 撘菜?靽∠?</p>
        </div>
        <button class="link-button" type="button" data-action="clear-search">皜??</button>
      </div>
      <div class="result-list">
        ${(results.length ? results : allCards.slice(0, 3)).map((card, index) => {
          const detailUrl = postcardDetailUrl(card, { from: "search", query: state.search });
          return `
          <article class="result-card">
            <a class="result-image-link" href="${detailUrl}">
              <img src="${card.image}" alt="${card.title}" ${imageFallbackAttr()}>
            </a>
            <div>
              <h3><a href="${detailUrl}">${card.title}</a></h3>
              <small>${card.meta}?#${(card.tags || []).join(" #")}</small>
            </div>
            <button type="button" class="favorite-button ${isFavorite(card) ? "active" : ""}" data-favorite="${favoriteKey(card)}">
              ${isFavorite(card) ? "?? : "??}
            </button>
          </article>
        `;
        }).join("")}
      </div>
    </section>
  `;
}

function catalogPanel() {
  if (!state.catalog.active) return "";
  if (state.catalog.country && !state.catalog.showPostcards) return "";
  if (state.catalog.country && state.catalog.city) return cityCatalogPanel();

  const title = state.catalog.keyword
    ? `??嚗?{state.catalog.keyword}`
    : state.catalog.title || (state.catalog.city
      ? `${state.catalog.country}??{state.catalog.city}`
      : state.catalog.country || "?券?縑??);
  const summary = state.catalog.limitTop
    ? `??${state.catalog.items.length.toLocaleString()} ??靽∠?`
    : state.catalog.loading ? "霈?葉..." : `??${state.catalog.total.toLocaleString()} 撘菜?靽∠?`;
  const headingIcon = state.catalog.limitTop && state.catalog.sort === "popular"
    ? `<svg class="icon"><use href="#icon-briefcase"></use></svg>`
    : `<span>??/span>`;

  return `
    <section class="section-block catalog-panel" id="catalog">
      <div class="section-heading">
        <div>
          <h2>${headingIcon}${title}</h2>
          <p>${summary}</p>
        </div>
        ${state.catalog.limitTop ? "" : `<div class="catalog-tools">
          <button class="link-button ${state.catalog.sort === "latest" ? "active" : ""}" type="button" data-sort="latest">???/button>
          <button class="link-button ${state.catalog.sort === "popular" ? "active" : ""}" type="button" data-sort="popular">?梢?</button>
        </div>`}
      </div>
      ${state.catalog.error ? `<p class="api-note">${state.catalog.error}</p>` : ""}
      <div class="catalog-grid">
        ${state.catalog.loading ? catalogSkeletonCards(Math.min(state.catalog.pageSize || 6, 12)) : state.catalog.items.map(catalogCard).join("")}
      </div>
      ${!state.catalog.limitTop && state.catalog.totalPages > 1 ? `
        <div class="pagination">
          <button type="button" data-page="${Math.max(1, state.catalog.page - 1)}" ${state.catalog.page <= 1 ? "disabled" : ""}>??/button>
          <span>${state.catalog.page} / ${state.catalog.totalPages}</span>
          <button type="button" data-page="${Math.min(state.catalog.totalPages, state.catalog.page + 1)}" ${state.catalog.page >= state.catalog.totalPages ? "disabled" : ""}>??/button>
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
      <button class="catalog-lightbox-backdrop" type="button" data-action="close-catalog" aria-label="???縑????></button>
      <button class="mobile-catalog-close" type="button" data-action="close-catalog" aria-label="???縑????>
        <span aria-hidden="true">?</span>
      </button>
      <section class="catalog-panel catalog-modal" role="dialog" aria-modal="true" aria-label="${state.catalog.city} ?縑????>
      <aside class="catalog-sidebar">
        <div class="catalog-sidebar-heading">
          <strong>?Ｙ揣銝?</strong>
          <span>?豢????汗?縑??/span>
        </div>
        <div class="catalog-city-list">
          ${state.catalog.cities.map(city => `
            <button type="button" class="${state.catalog.city === city.name ? "active" : ""}" data-city="${escapeAttr(city.name)}" data-show-postcards="true">
              <img src="${city.imageUrl || "assets/hero-sunset.jpg"}" alt="${city.name}" ${imageFallbackAttr()}>
              <span><strong>${city.name}</strong><small>${city.count.toLocaleString()} 撘?/small></span>
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
            <button type="button" class="catalog-close" data-action="close-catalog" aria-label="???縑????>?</button>
          </div>
        </header>

        <div class="catalog-modal-tools">
          <form data-search data-search-scope="catalog" class="catalog-search">
            <input name="keyword" type="search" placeholder="???縑??憿?蝐?..">
            <button type="submit" aria-label="??">??/button>
          </form>
          <div class="catalog-tools">
            <button class="link-button ${state.catalog.sort === "latest" ? "active" : ""}" type="button" data-sort="latest">??唬???/button>
            <button class="link-button ${state.catalog.sort === "popular" ? "active" : ""}" type="button" data-sort="popular">?梢?</button>
          </div>
          <span class="catalog-count">${state.catalog.loading ? "霈?葉..." : `??${state.catalog.total.toLocaleString()} 撘菜?靽∠?`}</span>
        </div>

        ${state.catalog.error ? `<p class="api-note">${state.catalog.error}</p>` : ""}
        <div class="catalog-grid">
          ${state.catalog.loading ? catalogSkeletonCards(state.catalog.pageSize || 6) : state.catalog.items.map(catalogCard).join("")}
        </div>
        ${!state.catalog.loading && !state.catalog.items.length ? `<p class="api-note">??撣??瘝??縑??/p>` : ""}
        ${state.catalog.totalPages > 1 ? `
          <div class="pagination">
            <button type="button" data-page="${Math.max(1, state.catalog.page - 1)}" ${state.catalog.page <= 1 ? "disabled" : ""}>??/button>
            <span>${state.catalog.page} / ${state.catalog.totalPages}</span>
            <button type="button" data-page="${Math.min(state.catalog.totalPages, state.catalog.page + 1)}" ${state.catalog.page >= state.catalog.totalPages ? "disabled" : ""}>??/button>
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
    return `<div class="city-rail" id="city-list"><p>?啣?霈?葉...</p></div>`;
  }
  if (!state.catalog.cities.length) return "";

  return `
    <div class="city-rail" id="city-list">
      <div class="city-rail-title">
        <strong>${state.catalog.country}</strong>
        <span>?豢??啣??汗?縑??/span>
      </div>
      <div class="city-tabs">
        ${state.catalog.cities.map(city => `
          <article class="city-card ${state.catalog.city === city.name ? "active" : ""}" data-city="${escapeAttr(city.name)}" data-show-postcards="true" role="button" tabindex="0">
            <img src="${city.imageUrl || "assets/hero-sunset.jpg"}" alt="${city.name}" ${imageFallbackAttr()}>
            <div>
              <h3>${city.name}</h3>
              <p>${city.count.toLocaleString()} 撘菜?靽∠?</p>
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
      <a class="postcard-image-link" href="${postcardDetailUrl(card)}"><img src="${card.image}" alt="${card.title}" ${imageFallbackAttr()}></a>
      <button type="button" class="favorite-icon-button ${active ? "active" : ""}" data-favorite="${key}" aria-label="${active ? "蝘駁?嗉?" : "??嗉?"} ${card.title}" title="${active ? "蝘駁?嗉?" : "?嗉?"}">
        <svg class="icon"><use href="#icon-heart"></use></svg>
      </button>
      <div>
        <div class="postcard-title-row">
          <h3><a href="${postcardDetailUrl(card)}">${card.title}</a></h3>
        </div>
        ${tags.length ? `<div class="postcard-tags">${tags.map(tag => `<span>#${tag}</span>`).join("")}</div>` : ""}
        <div class="postcard-details">
          <div class="postcard-detail-row">
            <span>摨扳?</span>
            <strong>${coordinates || "?芣?靘?}</strong>
            ${coordinates ? `<button type="button" class="copy-coordinate-button" data-copy-coordinates="${escapeAttr(coordinates)}" aria-label="銴ˊ摨扳?" title="銴ˊ摨扳?"><svg class="icon"><use href="#icon-copy"></use></svg></button>` : ""}
          </div>
          <div class="postcard-detail-row">
            <span>??</span>
            <strong>${obtainLabel}</strong>
          </div>
        </div>
        <footer>
          <span class="favorite-count" data-favorite-count="${key}"><svg class="icon"><use href="#icon-heart"></use></svg>${card.likes}</span>
          <span class="postcard-number">蝺刻? ${cardNumber}</span>
        </footer>
      </div>
    </article>
  `;
}

function formatCoordinates(card, longitudeValue = undefined) {
  const latitude = Number(typeof card === "object" ? card.latitude : card);
  const longitude = Number(typeof card === "object" ? card.longitude : longitudeValue);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "";
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function parseCoordinatePair(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/[嚗s]+/g, ",")
    .replace(/,+/g, ",")
    .replace(/^,|,$/g, "");
  const parts = normalized.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  const [latitude, longitude] = parts;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }

  return {
    latitude: latitude.toFixed(7),
    longitude: longitude.toFixed(7)
  };
}

function postcardTypeLabel(type) {
  const labels = {
    "zh-TW": {
      MUSHROOM: "打菇",
      FLOWER: "種花",
      EXPLORATION: "探索",
      UNKNOWN: "未提供"
    },
    en: {
      MUSHROOM: "Mushroom",
      FLOWER: "Flower",
      EXPLORATION: "Exploration",
      UNKNOWN: "Unknown"
    },
    ja: {
      MUSHROOM: "キノコ",
      FLOWER: "花",
      EXPLORATION: "探索",
      UNKNOWN: "未提供"
    }
  };
  const langLabels = labels[state.lang] || labels["zh-TW"];
  return langLabels[String(type || "").toUpperCase()] || langLabels.UNKNOWN;
}

function postcardTypeHashtag(type) {
  const tags = {
    "zh-TW": {
      MUSHROOM: "打菇",
      FLOWER: "種花",
      EXPLORE: "探索",
      EXPLORATION: "探索"
    },
    en: {
      MUSHROOM: "mushroom",
      FLOWER: "flower",
      EXPLORE: "exploration",
      EXPLORATION: "exploration"
    },
    ja: {
      MUSHROOM: "キノコ",
      FLOWER: "花",
      EXPLORE: "探索",
      EXPLORATION: "探索"
    }
  };
  const langTags = tags[state.lang] || tags["zh-TW"];
  return langTags[String(type || "").toUpperCase()] || "";
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
        <img class="brand-logo footer-logo" src="assets/logo-header_w.png" alt="Postoria" ${logoImageAttr()}>
      </div>
      <nav>
        <a href="#popular" data-scroll="popular">?梢??嗉?</a>
        <a href="#latest" data-scroll="latest">???嗉?</a>
        <a href="#login">?撠?</a>
      </nav>
      <p>穢 2026 Postoria. All rights reserved.</p>
    </footer>
  `;
}

function memberName() {
  return state.member?.displayName || state.member?.email || "Postorian";
}

function renderAuthActions() {
  const signedIn = Boolean(state.member);
  const name = escapeHtml(memberName());
  const languageSelectorHtml = languageSelector();
  document.body.classList.toggle("is-signed-in", signedIn);
  if (headerAuthActions) {
    headerAuthActions.innerHTML = signedIn ? `
      ${languageSelectorHtml}
      <a class="solid-button upload-nav-button" href="#upload">
        <svg class="icon"><use href="#icon-upload"></use></svg>
        <span>銝?縑??/span>
      </a>
      <a class="member-chip" href="#login-success" title="${escapeAttr(memberName())}">
        <svg class="icon"><use href="#icon-user-round"></use></svg>
        <span>${name}</span>
      </a>
      <button class="ghost-button" type="button" data-action="logout">?餃</button>
    ` : `
      ${languageSelectorHtml}
      <a class="ghost-button" href="#login">?餃</a>
      <a class="solid-button" href="#register">閮餃??</a>
    `;
  }

  if (mobileAuthActions) {
    mobileAuthActions.innerHTML = signedIn ? `
      ${languageSelectorHtml}
      <a href="#upload"><svg class="icon"><use href="#icon-upload"></use></svg>銝?縑??/a>
      <a href="#login-success"><svg class="icon"><use href="#icon-user-round"></use></svg>${name}</a>
      <button class="mobile-logout" type="button" data-action="logout">?餃</button>
    ` : `
      ${languageSelectorHtml}
      <a href="#login"><svg class="icon"><use href="#icon-user-round"></use></svg>?餃</a>
      <a class="solid-button" href="#register">閮餃??</a>
    `;
  }
}

function languageSelector() {
  return `
    <label class="language-select-wrap" aria-label="Language">
      <select class="language-select" data-language-select>
        ${SUPPORTED_LANGUAGES.map(lang => `
          <option value="${lang}" ${state.lang === lang ? "selected" : ""}>${LANGUAGE_LABELS[lang]}</option>
        `).join("")}
      </select>
    </label>
  `;
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
      ${password ? `<button class="toggle-password" type="button" aria-label="憿舐內???蝣?><svg class="icon"><use href="#icon-eye"></use></svg></button>` : ""}
    </label>
  `;
}

function authShell(card, showNotice = true) {
  return `
    <section class="auth-layout">
      <aside class="welcome">
        <span class="sparkle">??/span>
        <h1>甇∟???嚗?/h1>
        <p>?餃隞亦匱蝥蝝Ｖ????縑???嗉?蝢末?嚗?鈭思???鈭?/p>
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
      <span>??/span>
      <div>
        <h3>鞎澆???</h3>
        <ul>
          <li>隢Ⅱ隤縑蝞勗?嗡縑嚗誑?嗅?身撖Ⅳ靽∩辣??/li>
          <li>?桀?蝚砌??寧?乩?敺?HTTPS 皜祈岫?啣?摰?敺????/li>
        </ul>
      </div>
    </aside>
  `;
}

function loginCard() {
  return `
    <article class="auth-card">
      <a class="back-link" href="#home">??????/a>
      ${logo()}
      <h2>?餃</h2>
      <p class="subtitle">???董?? <a href="#register">蝡閮餃?</a></p>
      <form class="auth-form" data-form="login">
        ${field({ icon: "icon-mail", name: "email", type: "email", placeholder: "?餃??萎辣?啣?", autocomplete: "email" })}
        ${field({ icon: "icon-lock-keyhole", name: "password", type: "password", placeholder: "撖Ⅳ", autocomplete: "current-password" })}
        <div class="form-row">
          <label class="check"><input name="remember" type="checkbox"> 閮???/label>
          <a class="text-link" href="#forgot">敹?撖Ⅳ嚗?/a>
        </div>
        <button class="primary-button" type="submit">?餃</button>
        <p class="status"></p>
      </form>
      ${externalAuthActions("login")}
      <p class="switch-line">撌脩???Google 撣唾?銋隞亦?亦?乓?/p>
    </article>
  `;
}

function registerCard() {
  return `
    <article class="auth-card">
      <a class="back-link" href="#home">??????/a>
      ${logo()}
      <h2>閮餃??</h2>
      <p class="subtitle">????嗉?蝢末?嚗?鈭思???</p>
      <form class="auth-form" data-form="register">
        ${field({ icon: "icon-user", name: "displayName", placeholder: "?冽?迂", autocomplete: "name" })}
        ${field({ icon: "icon-mail", name: "email", type: "email", placeholder: "?餃??萎辣", autocomplete: "email" })}
        ${field({ icon: "icon-lock-keyhole", name: "password", type: "password", placeholder: "撖Ⅳ", autocomplete: "new-password" })}
        ${field({ icon: "icon-lock-keyhole", name: "confirmPassword", type: "password", placeholder: "蝣箄?撖Ⅳ", autocomplete: "new-password" })}
        <label class="check terms">
          <input name="terms" type="checkbox" required>
          ?歇?梯?銝血???<a class="text-link" href="#register">??璇狡</a> ??<a class="text-link" href="#register">?梁??輻?</a>
        </label>
        <button class="primary-button" type="submit">閮餃?</button>
        <p class="status"></p>
      </form>
      ${externalAuthActions("register")}
      <p class="switch-line">撌脩??董?? <a class="text-link" href="#login">蝡?餃</a></p>
    </article>
  `;
}

function externalAuthActions(mode = "login") {
  const label = mode === "register" ? "雿輻 Google 閮餃?" : "雿輻 Google ?餃";
  return `
    <div class="auth-divider"><span>??/span></div>
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

function openLoginPrompt(feature = "雿輻????) {
  state.loginPrompt = { feature };
  render();
}

function closeLoginPrompt() {
  state.loginPrompt = null;
  render();
}

function loginPromptModal() {
  if (!state.loginPrompt) return "";
  const feature = state.loginPrompt.feature || "雿輻????;
  return `
    <div class="login-prompt-modal" role="dialog" aria-modal="true" aria-label="??餃?內">
      <button class="login-prompt-backdrop" type="button" data-action="close-login-prompt" aria-label="???餃?內"></button>
      <section class="login-prompt-card">
        <button class="login-prompt-close" type="button" data-action="close-login-prompt" aria-label="???餃?內">?</button>
        <span class="login-prompt-kicker">??</span>
        <h2>?餃?敺??{escapeHtml(feature)}</h2>
        <p>? Postoria ?嚗隞交??甇∠??縑??鋆賢漣璅?銋銝雿??桀???靽∠???/p>
        <div class="login-prompt-actions">
          <a class="login-prompt-google" href="${externalAuthUrl("google")}" data-preserve-auth-return="true">
            <svg class="google-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.3 3.1-7.4Z"></path>
              <path fill="#34A853" d="M12 22c2.7 0 5-0.9 6.7-2.4L15.5 17c-.9.6-2 .9-3.5.9-2.7 0-4.9-1.8-5.7-4.2H3v2.6A10 10 0 0 0 12 22Z"></path>
              <path fill="#FBBC05" d="M6.3 13.7a6 6 0 0 1 0-3.4V7.7H3a10 10 0 0 0 0 8.6l3.3-2.6Z"></path>
              <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.7l3.3 2.6C7.1 7.9 9.3 6.1 12 6.1Z"></path>
            </svg>
            雿輻 Google 敹恍??          </a>
          <div class="login-prompt-secondary">
            <a href="#login">Email ?餃</a>
            <a href="#register">閮餃??</a>
          </div>
          <button class="login-prompt-later" type="button" data-action="close-login-prompt">蝔??牧</button>
        </div>
      </section>
    </div>
  `;
}

function forgotCard(sent = false) {
  if (sent) {
    return `
      <article class="success-card">
        <span class="success-mark" aria-hidden="true">??/span>
        <div>
          <h2>?身???撌脩??</h2>
          <p>?歇撠?閮剖?蝣潛?????潮?函??餃??萎辣嚗?瑼Ｘ?函?靽∠拳??/p>
          <a class="outline-button" href="#login">餈??餃</a>
        </div>
      </article>
    `;
  }

  return `
    <article class="auth-card">
      <a class="back-link" href="#login">??餈??餃</a>
      ${logo()}
      <h2>敹?撖Ⅳ嚗?/h2>
      <p class="subtitle">隢撓?交?摮隞塚????潮?閮剖?蝣潛????蝯行??/p>
      <form class="auth-form" data-form="forgot">
        ${field({ icon: "icon-mail", name: "email", type: "email", placeholder: "?餃??萎辣", autocomplete: "email" })}
        <button class="primary-button" type="submit">?潮?閮剝??</button>
        <p class="status"></p>
      </form>
    </article>
  `;
}

function renderLoginSuccess() {
  return authShell(`
    <article class="success-card">
      <span class="success-mark" aria-hidden="true">??/span>
      <div>
        <h2>?餃??</h2>
        <p>${state.member?.displayName || state.member?.email || "Postorian"}嚗迭餈???Postoria??/p>
        <a class="outline-button" href="#home">?擐?</a>
      </div>
    </article>
  `, true);
}

function uploadCard() {
  if (!state.token) {
    return authShell(`
      <article class="success-card">
        <span class="success-mark warning-mark" aria-hidden="true">!</span>
        <div>
          <h2>隢??餃</h2>
          <p>銝?縑??閬??∟澈???餃敺?舫敺祟?貉???/p>
          <a class="primary-button" href="#login">?餃?</a>
        </div>
      </article>
    `, true);
  }

  return authShell(`
    <article class="auth-card upload-card">
      <a class="back-link" href="#login-success">餈??撠?</a>
      ${logo()}
      <h2>銝?縑??/h2>
      <p class="subtitle">?敺??摮敺祟?貉???撖拇??敺???曉蝬脩???/p>
      <form class="auth-form upload-form" data-form="postcard-upload">
        <label class="field file-field">
          <svg class="icon field-icon"><use href="#icon-upload"></use></svg>
          <span data-file-label>?豢??? JPG / PNG / WebP嚗?MB 隞亙</span>
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" required>
        </label>
        ${field({ icon: "icon-search", name: "coordinates", type: "text", placeholder: "蝬楝摨佗?靘? 45.5041130, -73.5442030", required: false })}
        ${field({ icon: "icon-heart", name: "tags", placeholder: "璅惜嚗?券???# ??", required: false })}
        <fieldset class="segmented-field">
          <legend>???孵?</legend>
          <label>
            <input type="radio" name="postcardType" value="MUSHROOM">
            <span>??</span>
          </label>
          <label>
            <input type="radio" name="postcardType" value="FLOWER" checked>
            <span>??/span>
          </label>
          <label>
            <input type="radio" name="postcardType" value="EXPLORATION">
            <span>?Ｙ揣</span>
          </label>
        </fieldset>
        <button class="primary-button" type="submit">?撖拇</button>
        <p class="status"></p>
      </form>
      <aside class="upload-note">
        <strong>鞈?閬?</strong>
        <p>?桀??神?亙?撖拇銵冽嚗???path 摮 pending ?桅??靘??啣祟?詨???嚗?頧甇???縑????/p>
      </aside>
      ${uploadResultDialog()}
    </article>
  `, true);
}

function uploadResultDialog() {
  if (!state.uploadResult) return "";

  const upload = state.uploadResult;
  const coordinates = formatCoordinates(upload.latitude, upload.longitude) || "?芣?靘?;
  const tags = Array.isArray(upload.tags) && upload.tags.length ? upload.tags.join("??) : "?芣?靘?;
  const method = postcardTypeLabel(upload.postcardType);
  const reviewStatus = upload.reviewStatus === "pending" ? "敺祟?? : upload.reviewStatus;
  const fileName = upload.originalFileName || upload.imagePath?.split("/").pop() || "撌脖??喳???;

  return `
    <div class="upload-result-overlay" role="dialog" aria-modal="true" aria-label="銝撌脤">
      <section class="upload-result-dialog">
        <span class="upload-result-mark" aria-hidden="true">??/span>
        <div>
          <h3>銝撌脤</h3>
          <p>敺垢撌脫?啣???鞈?嚗祟?賊?敺???曉蝬脩???/p>
        </div>
        <dl>
          <div><dt>??</dt><dd>${escapeHtml(fileName)}</dd></div>
          <div><dt>?怠?璅?</dt><dd>${escapeHtml(upload.title || fileName)}</dd></div>
          <div><dt>???孵?</dt><dd>${escapeHtml(method)}</dd></div>
          <div><dt>摨扳?</dt><dd>${escapeHtml(coordinates)}</dd></div>
          <div><dt>璅惜</dt><dd>${escapeHtml(tags)}</dd></div>
          <div><dt>???/dt><dd>${escapeHtml(reviewStatus)}</dd></div>
        </dl>
        <button class="primary-button" type="button" data-action="close-upload-result">?仿?鈭?/button>
      </section>
    </div>
  `;
}

async function handleSubmit(event) {
  const searchForm = event.target.closest("form[data-search]");
  if (searchForm) {
    event.preventDefault();
    const keyword = new FormData(searchForm).get("keyword")?.toString().trim();
    if (!keyword) {
      showToast("隢撓?交?撠??萄?");
      return;
    }
    state.search = keyword.replace(/^#/, "");
    if (searchForm.dataset.searchScope === "catalog") {
      openCatalog({ keyword: state.search, page: 1, pageSize: 12, limitTop: false, title: "", showPostcards: true });
    } else {
      history.pushState(null, "", searchRouteUrl(state.search));
      resetHomeState();
      state.search = keyword.replace(/^#/, "");
      render();
      requestAnimationFrame(() => document.querySelector(".search-results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
    closeSearchLightbox();
    showToast(`撌脫?撠?{keyword}?);
    return;
  }

  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();

  const formData = new FormData(form);
  const values = Object.fromEntries(formData.entries());
  setBusy(form, true);
  setStatus(form, "");

  try {
    if (form.dataset.form === "postcard-upload") {
      if (!state.token) {
        throw new Error("隢??餃???);
      }

      const coordinates = String(formData.get("coordinates") || "").trim();
      formData.delete("coordinates");
      if (coordinates) {
        const parsedCoordinates = parseCoordinatePair(coordinates);
        if (!parsedCoordinates) {
          throw new Error("摨扳??澆?隢撓?伐?蝺臬漲, 蝬漲嚗?憒?45.5041130, -73.5442030");
        }

        formData.set("latitude", parsedCoordinates.latitude);
        formData.set("longitude", parsedCoordinates.longitude);
      }

      for (const key of ["latitude", "longitude", "tags", "postcardType"]) {
        if (!String(formData.get(key) || "").trim()) {
          formData.delete(key);
        }
      }

      const upload = await fetchAuthorizedJson("/api/members/me/postcard-uploads", {
        method: "POST",
        body: formData
      });
      state.uploads = [upload, ...state.uploads];
      state.uploadResult = upload;
      form.reset();
      form.querySelector("[data-file-label]").textContent = "?豢??? JPG / PNG / WebP嚗?MB 隞亙";
      setStatus(form, "撌脤撖拇嚗????＊蝷箏蝬脩???);
      showToast("?縑?歇?撖拇");
      render();
      return;
    }

    if (form.dataset.form === "login") {
      const result = await apiPost("/api/members/login", {
        email: values.email,
        password: values.password
      });
      setSession(result.member, result.accessToken, result.expiresAt);
      showToast("?餃??");
      location.hash = "login-success";
    }

    if (form.dataset.form === "register") {
      if (values.password !== values.confirmPassword) {
        throw new Error("?拇活頛詨??蝣潔?銝?氬?);
      }
      await apiPost("/api/members/register", {
        email: values.email,
        password: values.password,
        displayName: values.displayName
      });
      showToast("閮餃???嚗??餃");
      location.hash = "login";
    }

    if (form.dataset.form === "forgot") {
      await apiPost("/api/members/forgot-password", { email: values.email });
      sessionStorage.setItem("postoria-reset-sent", "1");
      showToast("?身???撌脤");
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
  const preserveAuthReturn = event.target.closest("[data-preserve-auth-return]");
  if (preserveAuthReturn) {
    rememberAuthReturnState();
    return;
  }

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

  const mobileMenuLink = event.target.closest("[data-mobile-menu] a[href^='#']");
  if (mobileMenuLink) {
    closeMobileMenu();
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
    await openCatalog({ page: Number(page.dataset.page) });
    scrollCatalogPostcardsTop();
    return;
  }

  const favorite = event.target.closest("[data-favorite]");
  if (favorite) {
    const id = favorite.dataset.favorite;
    if (!state.token) {
      openLoginPrompt("?嗉??迭??靽∠?");
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
      showToast(isActive ? "撌脩宏?斗?? : "撌脣??交??);
    } catch (error) {
      showToast(error.message || "?嗉??湔憭望?");
    } finally {
      favorite.disabled = false;
    }
    return;
  }

  const copyCoordinates = event.target.closest("[data-copy-coordinates]");
  if (copyCoordinates) {
    if (!state.token) {
      openLoginPrompt("銴ˊ?縑?漣璅?);
      return;
    }

    const text = copyCoordinates.dataset.copyCoordinates;
    const copied = await copyText(text);
    showToast(copied ? "摨扳?撌脰?鋆? : "?⊥?銴ˊ摨扳?嚗????詨?");
    return;
  }

  const copyPostcardLinkButton = event.target.closest("[data-copy-postcard-link]");
  if (copyPostcardLinkButton) {
    const card = findPostcardById(copyPostcardLinkButton.dataset.copyPostcardLink);
    const link = card ? postcardShareUrl(card) : "";
    const copied = await copyText(link);
    showToast(copied ? "?縑???撌脰?鋆? : "?⊥?銴ˊ?縑???");
    return;
  }

  const sharePostcardButton = event.target.closest("[data-share-postcard]");
  if (sharePostcardButton) {
    await sharePostcard(sharePostcardButton.dataset.sharePostcard);
    return;
  }

  const detailImage = event.target.closest("[data-detail-image]");
  if (detailImage) {
    state.imageLightbox = {
      image: detailImage.dataset.detailImage,
      title: detailImage.dataset.detailTitle || ""
    };
    render();
    return;
  }

  const action = event.target.closest("[data-action]");
  if (action?.dataset.action === "clear-search") {
    state.search = "";
    history.pushState(null, "", "#home");
    render();
    return;
  }

  if (action?.dataset.action === "close-catalog") {
    closeCatalogModal();
    return;
  }

  if (action?.dataset.action === "close-login-prompt") {
    closeLoginPrompt();
    return;
  }

  if (action?.dataset.action === "close-upload-result") {
    state.uploadResult = null;
    render();
    return;
  }

  if (action?.dataset.action === "close-detail-image") {
    state.imageLightbox = null;
    render();
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
    showToast(count ? `?桀?撌脫??${count} 撘菜?靽∠?` : "雿??芣??靽∠?");
    return;
  }

  if (action?.dataset.action === "logout") {
    clearSession();
    closeCatalogModal();
    mobileMenu.classList.remove("open");
    mobileMenu.setAttribute("aria-hidden", "true");
    showToast("撌脩??);
    location.hash = "home";
    render();
    return;
  }

  if (action?.dataset.action === "need-login") {
    openLoginPrompt(action.dataset.label || "雿輻????);
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

function normalizeShareHashtags(card) {
  const fixedTags = ["pikimin", "?桀???, "?桀???靽∠?", "pikimin?縑??];
  const rawTags = [
    ...(Array.isArray(card.tags) ? card.tags : []),
    card.hashtag,
    card.hashtags
  ];
  const tagSet = new Set();
  rawTags
    .filter(Boolean)
    .flatMap(tag => String(tag).split(/[\s,嚗?]+/))
    .map(tag => tag.trim())
    .filter(Boolean)
    .forEach(tag => tagSet.add(tag));
  fixedTags.forEach(tag => tagSet.add(tag));
  return Array.from(tagSet).map(tag => `#${tag}`);
}

async function sharePostcard(id) {
  const card = findPostcardById(id);
  if (!card) {
    showToast("?曆??啗??澈??靽∠?");
    return;
  }
  const url = postcardShareUrl(card);
  const hashtagText = normalizeShareHashtags(card).join(" ");
  const customShareText = String(card.shareText || "").trim();
  const nativeText = [url, customShareText, hashtagText].filter(Boolean).join("\n");
  const nativePayload = {
    title: `Postoria嚚?{card.title}`,
    text: nativeText
  };
  const prefersNativeShare = window.matchMedia?.("(pointer: coarse)")?.matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  try {
    if (prefersNativeShare && navigator.share) {
      await navigator.share(nativePayload);
      return;
    }
  } catch {
    // If the native share sheet is cancelled, fall back to copying the link.
  }
  const copied = await copyText(nativeText);
  showToast(copied ? "?澈?批捆撌脰?鋆? : "?⊥?銴ˊ?澈?批捆");
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
  state.imageLightbox = null;
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
  if (route === "search") {
    state.search = getHashParams().get("q") || state.search || "";
  }
  if (route === "login-success") {
    if (consumeExternalAuthResult()) return;
  }
  renderAuthActions();
  document.body.classList.toggle("catalog-modal-open", false);
  if (route !== "forgot") {
    sessionStorage.removeItem("postoria-reset-sent");
  }
  if (!isPostcardDetailRoute(route)) {
    updateDefaultMeta();
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
  } else if (isPostcardDetailRoute(route)) {
    app.innerHTML = renderPostcardDetail(route);
  } else {
    if (!state.home && !state.homeLoading && !state.homeError) {
      loadHomeData();
    }
    app.innerHTML = renderHome();
    document.body.classList.toggle("catalog-modal-open", Boolean(state.catalog.country && state.catalog.city && state.catalog.showPostcards));
    if (pendingAnchorScroll) {
      const targetId = pendingAnchorScroll;
      pendingAnchorScroll = "";
      requestAnimationFrame(() => document.querySelector(`#${targetId}`)?.scrollIntoView({ block: "start" }));
    }
  }

  if (state.loginPrompt) {
    app.insertAdjacentHTML("beforeend", loginPromptModal());
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

