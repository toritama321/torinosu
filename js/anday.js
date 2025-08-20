// ★ ページ読み込み直後の“生”ハッシュを確保（上書きされる前に！）
const RAW_HASH_AT_BOOT = location.hash;
console.log('[BOOT HASH]', RAW_HASH_AT_BOOT);

// ベースパス（リポ名に合わせる）
const BASE_PATH = '/torinosu/';

// 安全にくっつける関数
function withBase(path) {
  if (!path) return '';
  // すでに http:// や /torinosu/ で始まってたらそのまま
  if (/^(https?:|\/torinosu\/)/.test(path)) return path;
  // ../ を消して BASE_PATH にくっつける
  return BASE_PATH + path.replace(/^(\.\/|\.\.\/)+/, '');
}

// ===== Tabs: 世界設定 / キャラクター =======================================================
(function initTabs(){
  const root = document.querySelector('[data-tabs]');
  if (!root) return;

  const tabs = root.querySelectorAll('[role="tab"]');
  const panels = root.querySelectorAll('[role="tabpanel"]');

  function selectTab(nextId) {
    tabs.forEach(t => {
      const selected = (t.id === nextId);
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(p => {
      const show = (p.getAttribute('aria-labelledby') === nextId);
      p.toggleAttribute('hidden', !show);
    });
    // ハッシュ更新（戻る/進む対応）
    const short = nextId === 'tab-chars' ? 'chars' : 'world';
    history.replaceState(null, '', '#tab=' + short);
  }

  // 初期：ハッシュ or デフォルト
  const params = new URL(location.href).hash;
  if (params.includes('tab=chars')) selectTab('tab-chars');
  else selectTab('tab-world');

  // クリック
  tabs.forEach(t => t.addEventListener('click', () => selectTab(t.id)));

  // キーボード: ← → Home End
  root.addEventListener('keydown', (e) => {
    const order = Array.from(tabs);
    const current = order.findIndex(t => t.getAttribute('aria-selected') === 'true');
    let next = current;
    if (e.key === 'ArrowRight') next = (current + 1) % order.length;
    else if (e.key === 'ArrowLeft') next = (current - 1 + order.length) % order.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = order.length - 1;
    else return;
    e.preventDefault();
    order[next].focus();
    selectTab(order[next].id);
  });
})();

// === Characters: data-json で指定されたファイルを読む =========================================================
(async function renderCharactersByDataAttr(){
  const sections = document.querySelectorAll('[data-json]');
  if (!sections.length) return;

  // 小ヘルパー
  const esc = s => (s ?? '').toString()
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const jbase = (p) => (window.joinBase ? joinBase(p) : p);

  for (const root of sections) {
    const file = root.dataset.json;                // ← HTMLで指定したJSON
    try {
      const res = await fetch(jbase(file), { cache: 'no-cache' });
      const data = await res.json();

      // groups配列前提（前と同じ構造）
      const frag = document.createDocumentFragment();
      (data.groups || []).forEach(group => {
        const h2 = document.createElement('h2');
        h2.className = 'char-group';
        h2.textContent = group.title || '';
        frag.appendChild(h2);

        const grid = document.createElement('div');
        grid.className = 'char-grid';

        group.members.forEach(m => {
          const btn = createCharButton(m, jbase);
          btn.className = 'char';
          btn.type = 'button';

          // 画像だけは階層補正
          const fixed = { ...m, img: resolveFromDoc(m.img || '') };
          btn._data = fixed;

          btn.innerHTML = `
            <span class="char-img">
              <img loading="lazy" src="${esc(fixed.img)}" alt="${esc(m.name || '')}">
            </span>
            <span class="char-name">${esc(m.name || '')}</span>
          `;
          grid.appendChild(btn);

          if (m.crop) {
            const shell = btn.querySelector('.char-img');
            const c = m.crop;
            if (c.zoom   != null) shell.style.setProperty('--zoom',    String(c.zoom));
            if (c.x)             shell.style.setProperty('--focus-x',  c.x);
            if (c.y)             shell.style.setProperty('--focus-y',  c.y);
            if (c.shiftX)        shell.style.setProperty('--shift-x',  c.shiftX);
            if (c.shiftY)        shell.style.setProperty('--shift-y',  c.shiftY);
            if (c.anchorY)       shell.style.setProperty('--anchor-y', c.anchorY);
          }

        });

        frag.appendChild(grid);
      });

      root.innerHTML = '';
      root.appendChild(frag);

      // ハッシュ直リンク対応（#char=ID or #char=名前）
      const m = location.hash.match(/char=([^&]+)/);
      if (m) {
        const key = decodeURIComponent(m[1]);
        const hit = Array.from(root.querySelectorAll('.char')).find(el =>
          (el.dataset.id && el.dataset.id === key) || (el.dataset.name === key)
        );
        hit?.click();
      }
    } catch (e) {
      console.error('JSON読み込み失敗:', file, e);
      root.innerHTML = `<p style="color:#b00">キャラデータを読み込めませんでした (${esc(file)})</p>`;
    }
  }
})();

// キャラボタン
function createCharButton(m) {
  //console.log(m)
  const btn = document.createElement('button');
  btn.className = 'char';
  btn.type = 'button';
  btn.dataset.id = m.id || '';
  btn.dataset.name = m.name || '';

  // 画像
  const shell = document.createElement('span');
  shell.className = 'char-img';
  const img = new Image();
  img.loading = 'lazy';
  img.src = withBase(m.img);
  img.alt = m.name || '';
  shell.appendChild(img);
  //console.log('imgURL:',img.src);

  // ラベル2段
  const labels = document.createElement('span');
  labels.className = 'char-labels';

  const line1 = document.createElement('span'); // 1行目：α-27
  line1.className = 'char-label line1';
  line1.textContent = m.name || '';

  const line2 = document.createElement('span'); // 2行目：ニーナ
  line2.className = 'char-label line2';
  line2.textContent = m.nameEn || '';

  labels.append(line1, line2);

  // 並べる順番：画像 → ラベル
  btn.append(shell, labels);
  return btn;
}

// ===== キャラモーダル =====================================================================================
(function initCharModal(){
  const modal = document.getElementById('charModal');
  if (!modal) return;
  let lastFocus = null;

  function openModal(data = {}) {
    // モーダル要素を都度取得（スコープ問題を回避）
    const modal = document.getElementById('charModal');
    if (!modal) return;

    // 画像
    const img = document.getElementById('pImg');
    if (img) {
      img.src = withBase(data.img);
      img.alt = data.name || '';
    }

    // 名前
    const nameJ = document.getElementById('pNameJp');
    const nameE = document.getElementById('pNameEn');
    if (nameJ) nameJ.textContent = data.name || '';
    if (nameE) nameE.textContent = data.nameEn || '';

    // 基本情報
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || ''; };
    set('pSex',    data.sex);
    set('pAge',    data.age);
    set('pHeight', data.height);
    set('pFirst',  data.first);
    set('pSecond', data.second);

    // 個体情報（配列）
    const overviewBox = document.getElementById('pPersonal');
    if (overviewBox) {
      overviewBox.replaceChildren();
      data.personal.forEach(para => {
        const p = document.createElement('p');
        p.textContent = para;
        overviewBox.appendChild(p);
      });
    }

    // 取扱情報（配列）
    const voiceBox = document.getElementById('pInfo');
    if (voiceBox) {
      voiceBox.replaceChildren();
      data.info.forEach(para => {
        const p = document.createElement('p');
        p.textContent = para;
        voiceBox.appendChild(p);
      });
    }

    // MEMO（配列）
    const n1 = document.getElementById('pMemo');
    if (n1) {
      n1.replaceChildren();
      data.memo.forEach(para => {
        const p = document.createElement('p');
        p.textContent = para;
        n1.appendChild(p);
      });
    }
    // Tip（配列）
    const n2 = document.getElementById('pTip');
    if (n2) {
      n2.replaceChildren();
      data.tip.forEach(para => {
        const p = document.createElement('p');
        p.textContent = para;
        n2.appendChild(p);
      });
    }

    // 表示
    const closer = modal.querySelector('.modal__close');
    modal.hidden = false;
    
    // スクロール位置をリセット
    const modalContent = document.querySelector('.modal__content');
    modalContent.scrollTop = 0;

    document.body.classList.add('no-scroll');
    closer?.focus();
  }

  function closeModal(){
    modal.hidden = true;
    document.body.classList.remove('no-scroll');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  // クリックで開く
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.char');
    if (!btn) return;
    const payload = btn._data || { // _dataが無いならdatasetから作る
      name: btn.dataset.name,
      nameEn: btn.dataset.nameEn,
      sex: btn.dataset.sex,
      age: btn.dataset.age,
      height: btn.dataset.height,
      first: btn.dataset.first,
      second: btn.dataset.second,
      overview: btn.dataset.overview || btn.dataset.desc,
      img: btn.dataset.img
    };
    openModal(payload);
  });

  // オーバーレイ/×で閉じる
  modal.addEventListener('click', (e)=>{
    if (e.target.matches('[data-close], .modal__overlay')) closeModal();
  });

  // ESCで閉じる・Tabでフォーカストラップ（簡易）
  document.addEventListener('keydown', (e)=>{
    if (modal.hidden) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab'){
      // ダイアログ内のフォーカスをループ
      const focusables = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const list = Array.from(focusables).filter(el=>!el.hasAttribute('disabled'));
      if (list.length === 0) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first){ last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last){ first.focus(); e.preventDefault(); }
    }
  });
})();


// キャラ一覧からジャンプしてきたときの処理######################################################
// ▼ パーサー（& と ? の両方をセパレータとして扱う）
function parseHashMulti(hash) {
  const s = String(hash || '').replace(/^#/, '');
  const out = {};
  for (const part of s.split(/[&?]/)) {
    if (!part) continue;
    const [k, v = ''] = part.split('=');
    out[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return out;
}

function activateCharsTabIfNeeded(params) {
  if (params.tab !== 'chars') return;
  const btn = document.querySelector('[data-tab="chars"]');
  if (btn) btn.click();
}

function tryOpenByChar(id) {
  if (!id) return false;
  const btn = document.querySelector(
    `.char[data-id="${CSS.escape(id)}"], .char[data-name="${CSS.escape(id)}"], .char[data-name-en="${CSS.escape(id)}"]`
  );
  if (!btn) return false;
  btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return true;
}

function openFromInitialHash() {
  const params = parseHashMulti(RAW_HASH_AT_BOOT);        // ← 初期ハッシュ優先！
  console.log('[PARSED]', params);

  // 先にタブ
  activateCharsTabIfNeeded(params);

  // すでにDOMがあれば即開く
  if (tryOpenByChar(params.char)) {
    // 任意：URL掃除（毎回自動オープンを防ぐ）
    history.replaceState(null, '', location.pathname + '#tab=chars');
    return;
  }

  // まだリスト未生成なら監視して開く（他コードがhashを上書きしても初期値を使う）
  const obs = new MutationObserver(() => {
    if (tryOpenByChar(params.char)) {
      obs.disconnect();
      history.replaceState(null, '', location.pathname + '#tab=chars');
    }
  });
  obs.observe(document, { childList: true, subtree: true });
  setTimeout(() => obs.disconnect(), 5000); // セーフティ
}

// 初期化の“かなり早い段階”で呼ぶ（リストを描画するコードの直後でもOK）
document.addEventListener('DOMContentLoaded', openFromInitialHash);







