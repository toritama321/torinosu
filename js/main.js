// === どこから読んでも /torinosu/ を基準にできる検出ロジック ===
const SITE_BASE = (() => {
  // <html data-base="/torinosu/"> と明示されてたらそれを使う
  const htmlBase = document.documentElement.dataset.base;
  const norm = s => (s.startsWith('/') ? s : '/' + s).replace(/\/?$/, '/');
  if (htmlBase) return norm(htmlBase);

  // それが無ければ location.pathname から /<repo>/ を推定（/torinosu/）
  const segs = location.pathname.split('/').filter(Boolean);
  return segs.length ? `/${segs[0]}/` : '/';
})();

function joinBase(path) {
  if (!path) return '';
  // すでに絶対URL or プロトコル相対ならそのまま
  if (/^(https?:)?\/\//i.test(path)) return path;
  // URLで安全に解決（"./", "../", "/torinosu/xxx" もOK）
  const abs = new URL(path, location.origin + SITE_BASE);
  return abs.href; // fetch/href/src どれでも使える
}


function currentPage() {
  const url = new URL(window.location.href);
  return (url.pathname.split("/").filter(Boolean).pop() || "index.html").toLowerCase();
}

function hydrateLinks(root) {
  root.querySelectorAll("[data-href]").forEach(a => {
    a.setAttribute("href", joinBase(a.getAttribute("data-href")));
  });
  // 画像（src）
  root.querySelectorAll("[data-src]").forEach(img=>{
    img.setAttribute("src", joinBase(img.getAttribute("data-src")));
  });
  // レスポンシブ画像（srcset）
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

// ヘッダー/フッター差し込み
async function loadFragment(targetSel, path) {
  const res = await fetch(joinBase(path));
  const html = await res.text();
  const el = document.querySelector(targetSel);
  el.innerHTML = html;

  // 差し込んだ中の <img data-src> を補正して src に流し込む
  el.querySelectorAll('img[data-src]').forEach(img => {
    img.src = joinBase(img.dataset.src);
  });

  // a[data-href] なども同様に
  el.querySelectorAll('a[data-href]').forEach(a => {
    a.href = joinBase(a.dataset.href);
  });
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


// スクロールボタンの表示・非表示###########################################################
const scrollTopBtn = document.getElementById("scrollTopBtn");

window.addEventListener("scroll", () => {
  if (document.documentElement.scrollTop > 200) {
    scrollTopBtn.style.display = "block"; // 200px以上スクロールで表示
  } else {
    scrollTopBtn.style.display = "none";  // それ以下なら隠す
  }
});

// ボタンを押したら上に戻る
scrollTopBtn.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth" // スムーズスクロール
  });
});



