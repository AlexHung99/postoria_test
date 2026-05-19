const defaultApiBase = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "http://localhost:5073"
  : "https://api.postoria.net";
const API_BASE = localStorage.getItem("postoria-api-base") || defaultApiBase;

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
const mobileMenu = document.querySelector("[data-mobile-menu]");

const state = {
  member: readJson("postoria-member"),
  token: localStorage.getItem("postoria-token") || "",
  slide: 0,
  search: "",
  favorites: readJson("postoria-favorites") || [],
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

window.addEventListener("hashchange", render);
document.addEventListener("submit", handleSubmit);
document.addEventListener("click", handleClick);

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
}

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
    title: item.title,
    meta: [item.country, item.city].filter(Boolean).join("・"),
    country: item.country || "",
    city: item.city || "",
    image: item.imageUrl || "assets/hero-sunset.jpg",
    likes: Number(item.likeCount || 0).toLocaleString(),
    views: Number(item.viewCount || 0).toLocaleString(),
    tags: item.tags || [],
    legacyNumber: item.legacyNumber
  };
}

async function openCatalog(next = {}) {
  state.catalog = {
    ...state.catalog,
    ...next,
    active: true,
    loading: true,
    error: "",
    page: next.page || 1
  };
  render();

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
      fetchJson(`/api/postoria/postcards?${query}`)
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

  render();
  requestAnimationFrame(() => document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
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
  const home = state.home || {
    banners: heroSlides,
    countries,
    popular: cards,
    latest
  };
  const activeBanners = home.banners.length ? home.banners : heroSlides;
  state.slide = state.slide % activeBanners.length;

  return `
    <section class="home-shell">
      <div class="hero" id="hero">
        ${heroMarkup(activeBanners)}
      </div>
      ${state.homeError ? `<p class="api-note">${state.homeError}</p>` : ""}

      <section class="section-block" id="explore">
        <div class="section-heading">
          <div>
            <h2><span>◎</span>探索世界</h2>
            <p>依照國家與城市分類</p>
          </div>
          <button class="link-button" type="button" data-action="view-all" data-view-sort="latest" data-label="探索世界">查看全部 ›</button>
        </div>
        <div class="country-grid">
          ${home.countries.map(countryCard).join("")}
        </div>
        ${cityRail()}
      </section>

      ${catalogPanel()}

      <section class="section-block" id="popular">
        <div class="section-heading">
          <div>
            <h2><span>♨</span>熱門收藏</h2>
            <p>依收藏數排序</p>
          </div>
          <button class="link-button" type="button" data-action="view-all" data-view-sort="popular" data-label="熱門收藏">查看全部 ›</button>
        </div>
        <div class="postcard-row">
          ${home.popular.map((card, index) => postcardCard(card, index + 1)).join("")}
        </div>
      </section>

      <section class="section-block" id="latest">
        <div class="section-heading">
          <div>
            <h2><span>✦</span>最新上架</h2>
            <p>最新加入的明信片</p>
          </div>
          <button class="link-button" type="button" data-action="view-all" data-view-sort="latest" data-label="最新上架">查看全部 ›</button>
        </div>
        <div class="postcard-row compact">
          ${home.latest.map(newCard).join("")}
        </div>
      </section>

      <section class="search-panel" id="search">
        <div class="search-title">
          <span>⌕</span>
          <div>
            <h2>查詢明信片</h2>
            <p>可搜尋標題、編號或 #hashtag</p>
          </div>
        </div>
        <form data-search class="search-box">
          <input name="keyword" type="search" placeholder="搜尋標題、編號、#hashtag">
          <button class="solid-button" type="submit">搜尋</button>
        </form>
        <div class="tags" aria-label="熱門搜尋">
          <button type="button" data-keyword="日本">#日本</button>
          <button type="button" data-keyword="東京">#東京</button>
          <button type="button" data-keyword="巴黎">#巴黎</button>
          <button type="button" data-keyword="海邊">#海邊</button>
          <button type="button" data-keyword="日落">#日落</button>
        </div>
      </section>

      ${state.search ? searchResults() : ""}

      <section class="feature-strip">
        <article data-action="need-login" data-label="上傳明信片"><span>⇧</span><h3>上傳明信片</h3><p>登入會員後即可上傳你的明信片，讓更多人看見你的世界。</p></article>
        <article data-action="show-favorites"><span>♡</span><h3>收藏明信片</h3><p>收藏喜歡的明信片，建立屬於你的回憶收藏冊。</p></article>
        <article data-action="need-login" data-label="明信片評論"><span>▣</span><h3>明信片評論</h3><p>分享你的旅行故事與感受，與世界交流。</p></article>
        <aside>
          <h3>加入我們</h3>
          <p>登入或註冊會員，開始收藏與分享。</p>
          <a class="light-button" href="#register">立即登入 / 註冊 →</a>
        </aside>
      </section>

      ${siteFooter()}
    </section>
  `;
}

function heroMarkup(slides = (state.home?.banners || heroSlides)) {
  const slide = slides[state.slide] || slides[0];
  return `
    <img src="${slide.image}" alt="${slide.place}">
    <div class="hero-dots">
      ${slides.map((_, index) => `<button type="button" data-dot="${index}" class="${index === state.slide ? "active" : ""}" aria-label="切換到第 ${index + 1} 張"></button>`).join("")}
    </div>
  `;
}

function renderHeroOnly() {
  const hero = document.querySelector("#hero");
  if (hero) hero.innerHTML = heroMarkup();
}

function countryCard([name, english, count, image]) {
  const active = state.catalog.country === name;
  return `
    <article class="country-card ${active ? "active" : ""}" data-country="${escapeAttr(name)}">
      <img src="${image}" alt="${name}">
      <div><h3>${name}</h3><small>${english}</small><p>${count}</p></div>
    </article>
  `;
}

function postcardCard(card, rank) {
  const active = state.favorites.includes(card.id);
  return `
    <article class="postcard-card">
      <span class="rank">${rank}</span>
      <img src="${card.image}" alt="${card.title}">
      <div>
        <h3>${card.title}</h3>
        <p>${card.meta}</p>
        <footer>
          <button type="button" class="favorite-button ${active ? "active" : ""}" data-favorite="${card.id}" aria-label="收藏 ${card.title}">${active ? "♥" : "♡"} ${card.likes}</button>
          <span>◎ ${card.views}</span>
        </footer>
      </div>
    </article>
  `;
}

function newCard(card) {
  const active = state.favorites.includes(card.id);
  return `
    <article class="postcard-card new">
      <span class="new-badge">NEW</span>
      <img src="${card.image}" alt="${card.title}">
      <div>
        <h3>${card.title}</h3>
        <p>${card.meta}</p>
        <footer><button type="button" class="favorite-button ${active ? "active" : ""}" data-favorite="${card.id}" aria-label="收藏 ${card.title}">${active ? "♥" : "♡"} ${card.likes}</button></footer>
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
            <img src="${card.image}" alt="${card.title}">
            <div>
              <h3>${card.title}</h3>
              <p>編號：${card.id}</p>
              <small>${card.meta}　#${(card.tags || []).join(" #")}</small>
            </div>
            <button type="button" class="favorite-button ${state.favorites.includes(card.id) ? "active" : ""}" data-favorite="${card.id}">
              ${state.favorites.includes(card.id) ? "♥" : "♡"}
            </button>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function catalogPanel() {
  if (!state.catalog.active) return "";
  const title = state.catalog.keyword
    ? `搜尋：${state.catalog.keyword}`
    : state.catalog.city
      ? `${state.catalog.country}・${state.catalog.city}`
      : state.catalog.country || "全部明信片";

  return `
    <section class="section-block catalog-panel" id="catalog">
      <div class="section-heading">
        <div>
          <h2><span>▦</span>${title}</h2>
          <p>${state.catalog.loading ? "讀取中..." : `共 ${state.catalog.total.toLocaleString()} 張明信片`}</p>
        </div>
        <div class="catalog-tools">
          <button class="link-button ${state.catalog.sort === "latest" ? "active" : ""}" type="button" data-sort="latest">最新</button>
          <button class="link-button ${state.catalog.sort === "popular" ? "active" : ""}" type="button" data-sort="popular">熱門</button>
        </div>
      </div>
      ${state.catalog.error ? `<p class="api-note">${state.catalog.error}</p>` : ""}
      <div class="catalog-grid">
        ${state.catalog.items.map(catalogCard).join("")}
      </div>
      ${state.catalog.totalPages > 1 ? `
        <div class="pagination">
          <button type="button" data-page="${Math.max(1, state.catalog.page - 1)}" ${state.catalog.page <= 1 ? "disabled" : ""}>‹</button>
          <span>${state.catalog.page} / ${state.catalog.totalPages}</span>
          <button type="button" data-page="${Math.min(state.catalog.totalPages, state.catalog.page + 1)}" ${state.catalog.page >= state.catalog.totalPages ? "disabled" : ""}>›</button>
        </div>
      ` : ""}
    </section>
  `;
}

function cityRail() {
  if (!state.catalog.country) return "";
  if (state.catalog.loading && !state.catalog.cities.length) {
    return `<div class="city-rail"><p>地區讀取中...</p></div>`;
  }
  if (!state.catalog.cities.length) return "";

  return `
    <div class="city-rail">
      <div class="city-rail-title">
        <strong>${state.catalog.country}</strong>
        <span>選擇地區瀏覽明信片</span>
      </div>
      <div class="city-tabs">
        <button type="button" class="${!state.catalog.city ? "active" : ""}" data-city="">全部地區</button>
        ${state.catalog.cities.map(city => `
          <button type="button" class="${state.catalog.city === city.name ? "active" : ""}" data-city="${escapeAttr(city.name)}">
            ${city.name}<span>${city.count}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function catalogCard(card) {
  const active = state.favorites.includes(card.id);
  return `
    <article class="postcard-card">
      <img src="${card.image}" alt="${card.title}">
      <div>
        <h3>${card.title}</h3>
        <p>${card.meta}</p>
        <footer>
          <button type="button" class="favorite-button ${active ? "active" : ""}" data-favorite="${card.id}">${active ? "♥" : "♡"} ${card.likes}</button>
          <span>◎ ${card.views}</span>
        </footer>
      </div>
    </article>
  `;
}

function escapeAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function siteFooter() {
  return `
    <footer class="site-footer">
      <div class="footer-brand">
        <span class="brand-mark" aria-hidden="true"><span class="brand-star">✦</span><span class="brand-wave"></span></span>
        <div><strong>POSTORIA</strong><small>COLLECT MOMENTS, SHARE THE WORLD.</small></div>
      </div>
      <nav>
        <a href="#explore">探索世界</a>
        <a href="#popular">熱門收藏</a>
        <a href="#latest">我的收藏</a>
        <a href="#login">會員專區</a>
      </nav>
      <p>© 2026 Postoria. All rights reserved.</p>
    </footer>
  `;
}

function logo() {
  return `
    <span class="brand-mark auth-logo" aria-hidden="true">
      <span class="brand-star">✦</span>
      <span class="brand-wave"></span>
    </span>
    <p class="wordmark">POSTORIA</p>
  `;
}

function field({ icon, name, type = "text", placeholder, autocomplete = "", required = true }) {
  const password = type === "password";
  return `
    <label class="field">
      <span aria-hidden="true">${icon}</span>
      <input name="${name}" type="${type}" placeholder="${placeholder}" ${autocomplete ? `autocomplete="${autocomplete}"` : ""} ${required ? "required" : ""}>
      ${password ? `<button class="toggle-password" type="button" aria-label="顯示或隱藏密碼">◌</button>` : ""}
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
        ${field({ icon: "✉", name: "email", type: "email", placeholder: "電子郵件地址", autocomplete: "email" })}
        ${field({ icon: "▣", name: "password", type: "password", placeholder: "密碼", autocomplete: "current-password" })}
        <div class="form-row">
          <label class="check"><input name="remember" type="checkbox"> 記住我</label>
          <a class="text-link" href="#forgot">忘記密碼？</a>
        </div>
        <button class="primary-button" type="submit">登入</button>
        <p class="status"></p>
      </form>
      <p class="switch-line">測試階段請先使用電子郵件登入。</p>
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
        ${field({ icon: "○", name: "displayName", placeholder: "用戶名稱", autocomplete: "name" })}
        ${field({ icon: "✉", name: "email", type: "email", placeholder: "電子郵件", autocomplete: "email" })}
        ${field({ icon: "▣", name: "password", type: "password", placeholder: "密碼", autocomplete: "new-password" })}
        ${field({ icon: "▣", name: "confirmPassword", type: "password", placeholder: "確認密碼", autocomplete: "new-password" })}
        <label class="check terms">
          <input name="terms" type="checkbox" required>
          我已閱讀並同意 <a class="text-link" href="#register">服務條款</a> 與 <a class="text-link" href="#register">隱私政策</a>
        </label>
        <button class="primary-button" type="submit">註冊</button>
        <p class="status"></p>
      </form>
      <p class="switch-line">已經有帳號？ <a class="text-link" href="#login">立即登入</a></p>
    </article>
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
        ${field({ icon: "✉", name: "email", type: "email", placeholder: "電子郵件", autocomplete: "email" })}
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
    openCatalog({ keyword: state.search, country: "", city: "", sort: "latest", page: 1 });
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

function handleClick(event) {
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
    const target = document.querySelector(`#${scrollLink.dataset.scroll}`);
    if (target) {
      event.preventDefault();
      location.hash = scrollLink.dataset.scroll;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      mobileMenu.classList.remove("open");
      mobileMenu.setAttribute("aria-hidden", "true");
    }
  }

  const keyword = event.target.closest("[data-keyword]");
  if (keyword) {
    state.search = keyword.dataset.keyword;
    openCatalog({ keyword: state.search, country: "", city: "", sort: "latest", page: 1 });
    return;
  }

  const country = event.target.closest("[data-country]");
  if (country) {
    openCatalog({ country: country.dataset.country, city: "", keyword: "", sort: "latest", page: 1 });
    return;
  }

  const city = event.target.closest("[data-city]");
  if (city) {
    openCatalog({ city: city.dataset.city, keyword: "", page: 1 });
    return;
  }

  const sort = event.target.closest("[data-sort]");
  if (sort) {
    openCatalog({ sort: sort.dataset.sort, page: 1 });
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
    state.favorites = state.favorites.includes(id)
      ? state.favorites.filter(item => item !== id)
      : [...state.favorites, id];
    localStorage.setItem("postoria-favorites", JSON.stringify(state.favorites));
    render();
    showToast(state.favorites.includes(id) ? "已加入收藏" : "已移除收藏");
    return;
  }

  const action = event.target.closest("[data-action]");
  if (action?.dataset.action === "clear-search") {
    state.search = "";
    render();
    return;
  }

  if (action?.dataset.action === "view-all") {
    openCatalog({
      country: "",
      city: "",
      keyword: "",
      sort: action.dataset.viewSort || "latest",
      page: 1
    });
    return;
  }

  if (action?.dataset.action === "show-favorites") {
    const count = state.favorites.length;
    showToast(count ? `目前已收藏 ${count} 張明信片` : "你尚未收藏明信片");
    return;
  }

  if (action?.dataset.action === "need-login") {
    showToast(`${action.dataset.label}需登入會員後使用`);
    location.hash = "login";
  }
}

function render() {
  const route = location.hash.replace("#", "") || "home";
  if (route !== "forgot") {
    sessionStorage.removeItem("postoria-reset-sent");
  }

  if (route === "login") {
    app.innerHTML = authShell(loginCard());
  } else if (route === "register") {
    app.innerHTML = authShell(registerCard());
  } else if (route === "forgot") {
    app.innerHTML = authShell(forgotCard(sessionStorage.getItem("postoria-reset-sent") === "1"));
  } else if (route === "login-success") {
    app.innerHTML = renderLoginSuccess();
  } else {
    loadHomeData();
    app.innerHTML = renderHome();
    if (["explore", "popular", "latest"].includes(route)) {
      requestAnimationFrame(() => document.querySelector(`#${route}`)?.scrollIntoView({ block: "start" }));
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }
}

render();
