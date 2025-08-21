// ===== 設定 =====
const POSTS_JSON = joinBase('/torinosu/blog/posts.json'); // 記事メタ一覧の場所

// ===== 小道具 =====
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const fmtDate = (iso) => {
  try { return new Intl.DateTimeFormat('ja-JP', { dateStyle:'long' }).format(new Date(iso)); }
  catch { return iso; }
};

// ===== レンダリング =====
let ALL_POSTS = [];

function renderTabs(tags, current) {
  const wrap = $('#tagTabs'); wrap.innerHTML = '';
  const mk = (label, value) => {
    const b = document.createElement('button');
    b.className = 'tab';
    b.type = 'button';
    b.textContent = label || '全記事';
    b.setAttribute('aria-selected', (value||'') === (current||'') ? 'true' : 'false');
    b.addEventListener('click', () => {
      const u = new URL(location.href);
      if (value) u.searchParams.set('tag', value); else u.searchParams.delete('tag');
      history.pushState({}, '', u);
      applyFilter(value);
      // タブの選択表示更新
      $$('.tab').forEach(el => el.setAttribute('aria-selected', el.textContent === (value || '全記事') ? 'true' : 'false'));
    });
    return b;
  };
  wrap.append(mk('全記事', ''));
  tags.forEach(t => wrap.append(mk(t, t)));
}

function renderList(items) {
  const list = $('#list'); list.innerHTML = '';
  const frag = document.createDocumentFragment();

  items.forEach(p => {
    const a = document.createElement('a');
    a.href = p.path ? joinBase(p.path.replace(/^\/+/, '')) : joinBase(`posts/${encodeURIComponent(p.slug)}.html`);
    a.setAttribute('aria-label', p.title || '記事');

    const card = document.createElement('article');
    card.className = 'card';

    const time = document.createElement('time');
    time.dateTime = p.date; time.textContent = fmtDate(p.date);

    const h = document.createElement('h3');
    h.className = 'card-title'; h.textContent = p.title || '(無題)';

    const ex = document.createElement('p');
    ex.className = 'card-ex';
    ex.textContent = p.desc || p.excerpt || '';

    const hr = document.createElement('hr'); hr.className = 'card-hr';

    card.append(time, h, ex, hr);
    a.append(card);
    frag.append(a);
  });

  list.append(frag);
  $('#empty').hidden = items.length !== 0;
}

function applyFilter(tag) {
  const filtered = !tag ? ALL_POSTS : ALL_POSTS.filter(p => (p.tags || []).includes(tag));
  renderList(filtered);
}

// ===== 初期化 =====
(async function init(){
  try {
    const res = await fetch(POSTS_JSON, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const posts = await res.json();

    ALL_POSTS = posts.slice().sort((a,b) => String(b.date).localeCompare(String(a.date)));

    // タグ一覧作成
    const tagSet = new Set();
    ALL_POSTS.forEach(p => (p.tags || []).forEach(t => tagSet.add(t)));
    const tags = [...tagSet].sort((a,b)=>a.localeCompare(b,'ja'));

    // 初期タグ（?tag=...）を反映
    const initTag = new URL(location.href).searchParams.get('tag') || '';
    renderTabs(tags, initTag);
    applyFilter(initTag);

    // 戻る/進むで復元
    window.addEventListener('popstate', () => {
      const t = new URL(location.href).searchParams.get('tag') || '';
      $$('.tab').forEach(el => el.setAttribute('aria-selected', el.textContent === (t || '全記事') ? 'true' : 'false'));
      applyFilter(t);
    });
  } catch (e) {
    console.error(e);
    $('#list').innerHTML = '';
    const em = $('#empty'); em.textContent = '記事一覧を取得できなかった…'; em.hidden = false;
  }
})();



