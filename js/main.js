// main.js
const SITE_BASE = document.documentElement.dataset.base || "";

function joinBase(path) {
  const b = SITE_BASE.endsWith("/") ? SITE_BASE.slice(0, -1) : SITE_BASE;
  const p = path.startsWith("/") ? path.slice(1) : path;
  return b ? `${b}/${p}` : p;
}

function currentPage() {
  const url = new URL(window.location.href);
  return (url.pathname.split("/").filter(Boolean).pop() || "index.html").toLowerCase();
}

function hydrateLinks(root) {
  root.querySelectorAll("[data-href]").forEach(a => {
    a.setAttribute("href", joinBase(a.getAttribute("data-href")));
  });
  // 追加：画像（src）
  root.querySelectorAll("[data-src]").forEach(img=>{
    img.setAttribute("src", joinBase(img.getAttribute("data-src")));
  });
  // 追加（任意）：レスポンシブ画像（srcset）
  root.querySelectorAll("[data-srcset]").forEach(el=>{
    el.setAttribute("srcset",
      el.getAttribute("data-srcset")
        .split(",")
        .map(s=>s.trim())
        .map(entry=>{
          const [path, size] = entry.split(/\s+/);
          return joinBase(path) + (size? ` ${size}` : "");
        })
        .join(", ")
    );
  });
}

function highlightActiveNav() {
  const page = currentPage();
  document.querySelectorAll("nav a[href]").forEach(a => {
    const target = (a.getAttribute("href") || "").split("/").pop()?.toLowerCase();
    if (target === page) a.classList.add("is-active");
  });
}

function readySlot(el) {
  el.classList.add("is-ready");     // visibility: visible
  el.classList.remove("u-invis");   // 透明解除
}

async function loadFragment(slot, url, cacheKey) {
  // 1) 即時描画（キャッシュがあれば）
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    slot.innerHTML = cached;
    hydrateLinks(slot);
    readySlot(slot);
  }

  // 2) ネットワークで最新化
  try {
    const res = await fetch(joinBase(url), { cache: "no-cache" });
    const html = await res.text();

    // 初回 or 内容更新時のみ差し替え（ミクロな再ペイントに抑える）
    if (!cached || cached !== html) {
      slot.innerHTML = html;
      hydrateLinks(slot);
      if (!slot.classList.contains("is-ready")) readySlot(slot);
      sessionStorage.setItem(cacheKey, html);
    }
  } catch (e) {
    console.error("include失敗:", url, e);
    // キャッシュも無く、fetchも失敗 → 最低限のフォールバック
    if (!cached) {
      slot.innerHTML = `<div style="padding:12px;background:#fff;border-radius:8px">headerの読み込みに失敗しました</div>`;
      readySlot(slot);
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const headerSlot = document.querySelector('[data-include="header.html"]');
  const footerSlot = document.querySelector('[data-include="footer.html"]');

  const jobs = [];
  if (headerSlot) jobs.push(loadFragment(headerSlot, "header.html", "frag:header"));
  if (footerSlot) jobs.push(loadFragment(footerSlot, "footer.html", "frag:footer"));

  await Promise.all(jobs);
  highlightActiveNav();
});
