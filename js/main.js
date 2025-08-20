// GitHub Pagesでは、ルートが「https://...github.io/」になる。
// ルート相対パスを書く場合は、/<リポジトリ名>/を先頭につける必要がある。


// html要素からdata-baseを取得
const SITE_BASE = document.documentElement.dataset.base || "";

// パス組立
function joinBase(path) {
  const b = SITE_BASE.endsWith("/") ? SITE_BASE.slice(0, -1) : SITE_BASE; // data-base末尾スラッシュを取り除く
  const p = path.startsWith("/") ? path.slice(1) : path;  // 引数先頭スラッシュを取り除く
  return b ? `${b}/${p}` : p; // 「<data-base>/<引数>」を返す
}

// 現在ページのURL取得
function currentPage() {
  const url = new URL(window.location.href);  // 現在ページのURL取得

  // split=指定区切り文字で新配列化　.fillter()=指定条件のもののみ取り出す　.pop=最後の要素を取り除く
  // toLowerCase=文字列小文字化
  return (url.pathname.split("/").filter(Boolean).pop() || "index.html").toLowerCase();
}

// 「data-」系のパスを設定
function hydrateLinks(root) {
  // querySelectorAll("[data-href]")で、data-href属性を持つa要素をすべて取得
  root.querySelectorAll("[data-href]").forEach(a => {
    // data-hrefを相対パスに組み立て、href属性に追加
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

// ヘッダー、フッター挿入　##################################################################
async function loadFragment(targetSel, path) {
  const res = await fetch(joinBase(path));        // header.html を /<data-set>/header.html に
  if (!res.ok) throw new Error(`fetch失敗: ${path}`);
  const html = await res.text();

  const el = document.querySelector(targetSel);
  el.innerHTML = html;                            // 共通パーツを素で挿入

  // ここから“中身の相対パス”を補正して実体化（hydrate）
  // 画像: <img data-src="img/foo.webp"> を <img src="/torinosu/img/foo.webp"> に変換
  el.querySelectorAll('img[data-src]').forEach(img => {
    img.src = joinBase(img.dataset.src);
  });

  // リンク: <a data-href="links.html"> → <a href="/torinosu/links.html">
  el.querySelectorAll('a[data-href]').forEach(a => {
    a.href = joinBase(a.dataset.href);
  });
}

// ヘッダー、フッター読み込み
document.addEventListener("DOMContentLoaded", async () => {
  const headerSlot = document.querySelector('[data-include="header.html"]');
  const footerSlot = document.querySelector('[data-include="footer.html"]');

  const jobs = [];
  if (headerSlot) jobs.push(loadFragment(headerSlot, "header.html"));
  if (footerSlot) jobs.push(loadFragment(footerSlot, "footer.html"));

  await Promise.all(jobs);
  highlightActiveNav();
});

// ヘッダーメニューの選択中ハイライト
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
