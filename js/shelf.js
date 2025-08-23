(() => {
  const STORIES_JSON = joinBase('stories/stories.json');

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const fmtDate = iso => {
    try { return new Intl.DateTimeFormat('ja-JP',{dateStyle:'long'}).format(new Date(iso)); }
    catch { return iso; }
  };

  let ALL = [];

  function renderTabs(tags, current){
    const wrap = $('#tagTabs'); wrap.innerHTML = '';
    const mk = (label, value) => {
      const b = document.createElement('button');
      b.className = 'tab'; b.type = 'button';
      b.textContent = label || '全作品';
      b.setAttribute('aria-selected', (value||'') === (current||'') ? 'true' : 'false');
      b.addEventListener('click', () => {
        const u = new URL(location.href);
        if (value) u.searchParams.set('tag', value); else u.searchParams.delete('tag');
        history.pushState({}, '', u);
        applyFilter(value);
        $$('.tab').forEach(el => el.setAttribute('aria-selected', el.textContent === (value || '全作品') ? 'true' : 'false'));
      });
      return b;
    };
    wrap.append(mk('全作品', ''));
    tags.forEach(t => wrap.append(mk(t, t)));
  }

  function renderShelf(items){
    const shelf = $('#shelf'); shelf.innerHTML = '';
    const frag = document.createDocumentFragment();

    items.forEach(s => {
      const a = document.createElement('a');
      a.className = 'book' 
        + (s.world ? ` world-${s.world}` : '') 
        + (s.size ? ` size-${s.size}` : ' size-std');
      a.href = joinBase(s.path);

      const cover = document.createElement('div');
      cover.className = 'cover';

      const title = document.createElement('span');
      title.className = 'book-title';
      title.textContent = s.title;

      // 日付（yy-mm-dd形式に整形）
      const date = document.createElement('span');
      date.className = 'book-date';
      if (s.date) {
        const d = new Date(s.date);
        const yy = String(d.getFullYear()).slice(2);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        date.textContent = `${yy}-${mm}-${dd}`;
      }

      cover.append(title, date);
      a.appendChild(cover);
      frag.appendChild(a);

    });

    shelf.append(frag);
    $('#empty').hidden = items.length !== 0;
  }

  function applyFilter(tag){
    const filtered = !tag ? ALL : ALL.filter(s => (s.tags||[]).includes(tag));
    renderShelf(filtered);
  }

  (async function init(){
    try{
      const res = await fetch(STORIES_JSON, { cache:'no-cache' });
      if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const list = await res.json();

      // 新しい順
      ALL = list.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));

      // タグ一覧
      const tagSet = new Set();
      ALL.forEach(s => (s.tags||[]).forEach(t => tagSet.add(t)));
      const tags = [...tagSet].sort((a,b)=>a.localeCompare(b,'ja'));

      // 初期タグ（?tag=…）
      const initTag = new URL(location.href).searchParams.get('tag') || '';
      renderTabs(tags, initTag);
      applyFilter(initTag);

      window.addEventListener('popstate', () => {
        const t = new URL(location.href).searchParams.get('tag') || '';
        $$('.tab').forEach(el => el.setAttribute('aria-selected', el.textContent === (t || '全作品') ? 'true' : 'false'));
        applyFilter(t);
      });
    }catch(e){
      console.error(e);
      const em = $('#empty'); em.textContent = '作品一覧を取得できなかった…'; em.hidden = false;
    }
  })();
})();
