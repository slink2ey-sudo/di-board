/* 평가 설계 카드 — app logic */
(function () {
  'use strict';

  // ---------- storage ----------
  const LS_KEY = 'eval-card-designs-v1';
  const LS_CUR = 'eval-card-current-v1';
  function lsGet(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  const uid = () => Math.random().toString(36).slice(2, 9);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function blank() {
    return {
      id: uid(), title: '', grade: '3~4', units: [], std: [], areas: [],
      ideas: [], k: [], p: [], v: [],
      concept: [], fact: [], proc: [], val: [],
      big: [], q: [], step: 0, updated: Date.now()
    };
  }

  let designs = lsGet(LS_KEY, {});
  let S = designs[lsGet(LS_CUR, '')] || blank();

  let saveTimer = null;
  function save() {
    S.updated = Date.now();
    if (!S.title) {
      const u = UNITS.find((x) => x.grade === S.grade && S.units.includes(x.no));
      S.autoTitle = u ? `${S.grade}학년 ${u.title}` : '제목 없는 설계';
    }
    designs[S.id] = S;
    const ok = lsSet(LS_KEY, designs) && lsSet(LS_CUR, S.id);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const el = document.getElementById('saveState');
      if (el) el.textContent = ok ? '자동 저장됨 ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '이 브라우저에선 자동 저장이 안 돼요 — 파일로 저장하세요';
    }, 200);
  }

  // ---------- relevance ----------
  function grams(s) {
    const set = new Set();
    (s.match(/[가-힣]{2,}/g) || []).forEach((w) => {
      for (let i = 0; i < w.length - 1; i++) set.add(w.slice(i, i + 2));
    });
    return set;
  }
  const STOP = new Set(['하기', '이해', '태도', '관심', '대한', '하는', '있는', '우리', '다양', '양한', '에서', '사람', '람들', '탐색', '파악', '해결', '노력', '조사', '문제', '방안', '정보', '확인', '방식', '모습', '활용', '바탕', '통해', '생활', '한다', '이를', '으로']);
  let stdGrams = new Set();
  function refreshStdGrams() {
    const txt = selectedStd().map((d) => d.text + ' ' + d.exp).join(' ');
    stdGrams = grams(txt);
  }
  function rel(t) {
    let n = 0; grams(t).forEach((g) => { if (!STOP.has(g) && stdGrams.has(g)) n++; });
    return n;
  }

  function selectedStd() {
    const out = [];
    UNITS.filter((u) => u.grade === S.grade).forEach((u) => u.std.forEach((d) => { if (S.std.includes(d.code)) out.push(d); }));
    return out;
  }

  // ---------- steps ----------
  const STEPS = [
    { key: 'std', no: '①', name: '성취기준', ph: 'A' },
    { key: 'ideas', no: '②', name: '핵심 아이디어', ph: 'A' },
    { key: 'cs', no: '③', name: '내용 체계', ph: 'A' },
    { key: 'ku', no: '④', name: '단원의 지식·이해', ph: 'D' },
    { key: 'pv', no: '⑤', name: '과정·기능 / 가치·태도', ph: 'D' },
    { key: 'big', no: '⑥', name: '단원의 핵심 아이디어', ph: 'D' },
    { key: 'q', no: '⑦', name: '핵심/탐구 질문', ph: 'D' },
    { key: 'out', no: '✓', name: '완성된 평가 설계', ph: '' }
  ];

  const GUIDE = {
    std: {
      todo: '단원을 설계할 성취기준을 고릅니다. 한 단원의 성취기준을 모두 골라도 되고, 여러 단원에서 골라 묶어도 됩니다.',
      tips: ['성취기준 아래 ‘해설 보기’를 열면 이 성취기준을 왜 두었는지 알 수 있어요. ④~⑤에서 다시 쓰게 됩니다.', '한 번에 너무 많이 묶으면 ⑥ 핵심 아이디어가 흐려져요. 2~4개가 다루기 좋습니다.']
    },
    ideas: {
      todo: '성취기준이 속한 영역의 핵심 아이디어를 확인합니다. 교육과정 문서에 있는 문장을 그대로 가져옵니다.',
      tips: ['고른 단원에 맞는 영역을 미리 켜 두었어요(앱이 추천한 것). 필요하면 다른 영역도 켜세요.', '핵심 아이디어는 초·중학교를 관통하는 큰 문장이라 단원보다 넓습니다. ⑥에서 이걸 단원 크기로 좁힙니다.']
    },
    cs: {
      todo: '내용 체계에서 이 단원에 해당하는 내용 요소를 지식·이해, 과정·기능, 가치·태도별로 고릅니다.',
      tips: ['‘성취기준 관련’ 표시는 고른 성취기준과 겹치는 말이 많은 카드예요. 먼저 살펴보세요.', '지식·이해는 학년군별, 과정·기능과 가치·태도는 초등 3~6학년 공통으로 제시되어 있습니다.']
    },
    ku: {
      todo: '③에서 고른 지식·이해 요소를 성취기준·해설과 견주어, 학생이 배울 ‘개념’과 ‘사실/정보’로 나누어 씁니다.',
      tips: ['개념: 여러 사례에 두루 쓰이는 짧은 말(1~3단어). 예) 장소감, 상호의존, 문화유산', '사실/정보: 특정한 때·곳·사례에 묶인 내용. 예) 우리 동네 주요 장소의 위치', '내용 요소 카드를 그대로 두지 말고 눌러서 단원에 맞게 고쳐 쓰세요.']
    },
    pv: {
      todo: '단원을 배우는 데(또는 단원의 핵심 아이디어에 이르는 데) 필요한 과정·기능과, 기를 가치·태도를 정합니다.',
      tips: ['과정·기능은 ‘~하기’로 끝나는 탐구 행동으로 씁니다. 평가에서 학생이 실제로 해 보일 행동이 됩니다.', '가치·태도는 성취기준의 ‘~하는 태도를 기른다’, ‘~에 참여한다’ 부분과 연결해 보세요.']
    },
    big: {
      todo: '①④⑤를 묶어, 단원을 마친 뒤 학생에게 남을 큰 가르침을 한두 문장으로 씁니다. 이것이 평가의 초점이 됩니다.',
      tips: ['두 개 이상의 개념을 관계로 잇는 문장이 좋습니다. 예) “사람들은 장소에서의 경험에 따라 서로 다른 장소감을 갖는다.”', '특정 지역 이름·연도 같은 사실이 들어가면 일반화가 덜 된 것입니다.', '아래 문장 틀을 누르면 입력칸에 들어갑니다.']
    },
    q: {
      todo: '학생이 ⑥에 스스로 도달하게 이끄는 질문을 씁니다. ⑥이 답이라면, 어떤 질문을 던질지 생각해 보세요.',
      tips: ['사실적 질문으로 시작해 개념적 질문으로 넓히고, 논쟁적 질문으로 생각을 깊게 하는 흐름이 흔히 쓰입니다.', '개념적 질문은 ⑥의 개념이 들어가고, 정답이 하나로 정해지지 않으며, 다른 사례에도 던질 수 있어야 합니다.']
    },
    out: {
      todo: '워크시트 모양으로 정리된 평가 설계를 확인하고 저장·인쇄합니다.',
      tips: ['인쇄 버튼에서 ‘PDF로 저장’을 고르면 파일로 남길 수 있어요.', '설계 파일(.json)로 저장해 두면 다른 기기에서 불러와 이어서 고칠 수 있습니다.']
    }
  };

  const QUIZ = {
    cs: { q: '성취기준에 “…서로 존중하는 태도를 지닌다”가 있다면, 이 부분은 내용 체계의 어느 범주와 이어질까요?', o: ['지식·이해', '과정·기능', '가치·태도'], a: 2, e: '‘태도를 지닌다/기른다’는 가치·태도 범주와 연결됩니다. 이 카드는 ⑤ 옆 가치·태도 칸으로 이어져요.' },
    ku: { q: '다음 중 ‘개념’에 해당하는 것은?', o: ['장소감', '우리 동네 도서관의 위치', '우리 시의 올해 인구'], a: 0, e: '장소감은 어느 장소, 어느 사람에게나 적용되는 추상적인 말이라 개념입니다. 나머지 둘은 특정 사례에 묶인 사실/정보예요.' },
    pv: { q: '다음 중 과정·기능 진술로 알맞은 것은?', o: ['지도의 요소', '지도에서 우리 지역 위치와 정보 확인하기', '장소에 대한 감수성'], a: 1, e: '과정·기능은 학생이 해 보이는 탐구 행동(~하기)입니다. ①은 지식·이해, ③은 가치·태도예요.' },
    big: { q: '단원의 핵심 아이디어로 더 알맞은 것은?', o: ['우리 지역에는 오래된 시장과 박물관이 있다.', '문화유산은 과거와 현재를 이어 주며 지역의 정체성을 보여 준다.'], a: 1, e: '두 번째 문장은 개념(문화유산, 정체성)을 관계로 잇고 다른 지역에도 통합니다. 첫 번째는 특정 사실이에요.' },
    q: { q: '다음 중 개념적 질문은?', o: ['우리 지역 문화유산의 이름은 무엇인가?', '문화유산은 어떻게 과거와 현재를 이어 주는가?', '문화유산을 지키기 위해 개발을 막아야 하는가?'], a: 1, e: '첫째는 사실적, 셋째는 논쟁적 질문입니다. 개념적 질문은 개념 사이의 관계를 묻고 다른 사례에도 던질 수 있어요.' }
  };

  const FRAMES = [
    '○○은/는 ○○에 영향을 준다.',
    '○○이/가 달라지면 ○○도 달라진다.',
    '사람들은 ○○을/를 통해 ○○한다.',
    '○○은/는 ○○와/과 ○○ 사이의 관계를 보여 준다.',
    '○○을/를 위해서는 ○○이/가 필요하다.'
  ];

  const QTYPES = [
    { t: 'fact', name: '사실적 질문', color: 'var(--q1)', desc: '특정 사례의 사실을 확인합니다. 답이 정해져 있어요.', stems: ['○○은/는 무엇인가?', '○○에는 어떤 ○○이/가 있는가?', '○○은/는 언제/어디에서 ~했는가?'] },
    { t: 'concept', name: '개념적 질문', color: 'var(--q2)', desc: '개념 사이의 관계를 묻습니다. 다른 사례에도 던질 수 있어요.', stems: ['○○은/는 왜 ○○에 영향을 주는가?', '○○과/와 ○○은/는 어떤 관계인가?', '○○이/가 달라지면 무엇이 달라지는가?'] },
    { t: 'debate', name: '논쟁적 질문', color: 'var(--q3)', desc: '여러 입장이 가능한 질문입니다. 근거를 들어 판단해요.', stems: ['○○을/를 위해 ○○해야 하는가?', '○○과/와 ○○ 중 무엇이 더 중요한가?', '○○은/는 바람직한가?'] }
  ];

  // ---------- render ----------
  const $ = (s, r = document) => r.querySelector(s);
  const app = () => $('#main');

  function render() {
    refreshStdGrams();
    renderNav();
    const st = STEPS[S.step];
    const g = GUIDE[st.key];
    let html = `
      <section class="guide">
        <div class="guide-head">
          <span class="ph ph-${st.ph || 'X'}">${st.ph === 'A' ? 'A 분석' : st.ph === 'D' ? 'D 설계' : '정리'}</span>
          <h2><span class="no">${st.no}</span>${esc(st.name)}</h2>
        </div>
        <p class="todo"><b>이 단계에서 할 일</b> ${esc(g.todo)}</p>
        <ul class="tips">${g.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        ${QUIZ[st.key] ? quizHtml(st.key) : ''}
      </section>
      <section class="work" id="work">${STEP_RENDER[st.key]()}</section>
      <nav class="pager">
        ${S.step > 0 ? `<button class="btn ghost" data-act="prev">← ${esc(STEPS[S.step - 1].no + ' ' + STEPS[S.step - 1].name)}</button>` : '<span></span>'}
        ${S.step < STEPS.length - 1 ? `<button class="btn primary" data-act="next">${esc(STEPS[S.step + 1].no + ' ' + STEPS[S.step + 1].name)} →</button>` : ''}
      </nav>`;
    app().innerHTML = html;
    $('#designTitle').value = S.title || '';
    $('#designTitle').placeholder = S.autoTitle || '설계 이름 (예: 3학년 우리 지역의 문화유산)';
  }

  function renderNav() {
    $('#steps').innerHTML = STEPS.map((st, i) => {
      const done = stepDone(st.key);
      return `<button class="step ${i === S.step ? 'on' : ''} ${done ? 'done' : ''}" data-go="${i}">
        <span class="sno">${st.no}</span><span class="sname">${esc(st.name)}</span>${st.ph ? `<span class="sph">${st.ph}</span>` : ''}
      </button>`;
    }).join('');
  }

  function stepDone(k) {
    switch (k) {
      case 'std': return S.std.length > 0;
      case 'ideas': return S.ideas.length > 0;
      case 'cs': return S.k.length + S.p.length + S.v.length > 0;
      case 'ku': return S.concept.length > 0;
      case 'pv': return S.proc.length > 0;
      case 'big': return S.big.some((b) => b.t.trim());
      case 'q': return S.q.some((b) => b.t.trim());
      default: return false;
    }
  }

  function quizHtml(k) {
    const z = QUIZ[k];
    return `<details class="quiz"><summary>개념 점검 한 문제</summary>
      <p class="qq">${esc(z.q)}</p>
      <div class="qo">${z.o.map((o, i) => `<button class="qbtn" data-quiz="${k}" data-i="${i}">${esc(o)}</button>`).join('')}</div>
      <p class="qfb" id="qfb-${k}" hidden></p></details>`;
  }

  function card(kind, text, opts = {}) {
    // kind: std idea k p v concept fact q big
    const label = { std: '성취기준', idea: '핵심 아이디어', k: '지식·이해', p: '과정·기능', v: '가치·태도', concept: '개념', fact: '사실/정보', proc: '과정·기능', val: '가치·태도' }[kind] || '';
    return `<div class="card c-${kind} ${opts.cls || ''}" ${opts.attrs || ''}>
      <div class="card-band"><span>${esc(opts.label || label)}</span>${opts.badge ? `<em>${esc(opts.badge)}</em>` : ''}</div>
      <div class="card-body">${opts.html || esc(text)}</div>
      ${opts.foot ? `<div class="card-foot">${opts.foot}</div>` : ''}
    </div>`;
  }

  // editable placed card
  function placed(list, item, kind, extra = '') {
    return `<div class="card placed c-${kind}" data-list="${list}" data-id="${item.id}">
      <div class="card-band"><span>${esc({ ideas: '핵심 아이디어', k: '지식·이해', p: '과정·기능', v: '가치·태도', concept: '개념', fact: '사실/정보', proc: '과정·기능', val: '가치·태도' }[list])}</span>
        <button class="x" title="빼기" data-del="${list}" data-id="${item.id}">×</button></div>
      <div class="card-body" contenteditable="true" spellcheck="false" data-edit="${list}" data-id="${item.id}">${esc(item.t)}</div>
      ${extra}
    </div>`;
  }

  const has = (list, t) => S[list].some((x) => x.src === t || x.t === t);

  const STEP_RENDER = {
    std() {
      const units = UNITS.filter((u) => u.grade === S.grade);
      return `
        <div class="row-ctl">
          <div class="seg">${['3~4', '5~6'].map((g) => `<button class="${S.grade === g ? 'on' : ''}" data-grade="${g}">${g}학년군</button>`).join('')}</div>
          <span class="hint">교과: 사회 (2022 개정)</span>
        </div>
        <div class="units">
          ${units.map((u) => {
            const n = u.std.filter((d) => S.std.includes(d.code)).length;
            return `<details class="unit" ${n || S.units.includes(u.no) ? 'open' : ''}>
              <summary><span class="uno">(${u.no})</span> ${esc(u.title)} ${n ? `<span class="pill">${n}개 선택</span>` : ''}</summary>
              <div class="stdlist">
                ${u.std.map((d) => `
                  <label class="std ${S.std.includes(d.code) ? 'on' : ''}">
                    <input type="checkbox" data-std="${d.code}" data-unit="${u.no}" ${S.std.includes(d.code) ? 'checked' : ''}>
                    <span class="code">${d.code}</span>
                    <span class="stxt">${esc(d.text)}</span>
                  </label>
                  ${d.exp ? `<details class="exp"><summary>해설 보기</summary><p>${esc(d.exp)}</p></details>` : ''}`).join('')}
                ${u.notes.length ? `<details class="exp notes"><summary>성취기준 적용 시 고려 사항</summary><ul>${u.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></details>` : ''}
              </div>
            </details>`;
          }).join('')}
        </div>`;
    },

    ideas() {
      return areaToggles() + `
        <div class="two">
          <div class="zone">
            <h3>② 핵심 아이디어 <small>${S.ideas.length}장</small></h3>
            <div class="slot">${S.ideas.length ? S.ideas.map((it) => placed('ideas', it, 'idea')).join('') : empty('오른쪽 카드를 눌러 가져오세요')}</div>
          </div>
          <div class="deck">
            <h3>카드 더미</h3>
            ${S.areas.length ? S.areas.map((id) => {
              const a = AREAS[id];
              return `<div class="deck-group"><h4>${esc(a.name)}</h4><div class="deck-cards">
                ${a.ideas.map((t) => deckCard('idea', t, 'ideas', { area: a.name })).join('')}</div></div>`;
            }).join('') : empty('위에서 영역을 켜 주세요')}
          </div>
        </div>`;
    },

    cs() {
      const cats = [['k', '지식·이해'], ['p', '과정·기능'], ['v', '가치·태도']];
      return areaToggles() + `
        <div class="cs-wrap">
          ${cats.map(([c, name]) => {
            const pool = [];
            S.areas.forEach((id) => {
              const a = AREAS[id];
              if (c === 'k') a.k[S.grade].forEach((x) => pool.push({ t: x.t, sub: a.name + ' · ' + x.sub }));
              else a[c].forEach((t) => pool.push({ t, sub: a.name }));
            });
            pool.forEach((x) => (x.r = rel(x.t)));
            pool.sort((a, b) => b.r - a.r);
            return `<div class="cs-col">
              <div class="zone">
                <h3>${name} <small>${S[c].length}장</small></h3>
                <div class="slot">${S[c].length ? S[c].map((it) => placed(c, it, c)).join('') : empty('아래 카드를 눌러 가져오세요')}</div>
              </div>
              <div class="deck slim">
                <h4 class="dh">${name} 카드 ${c === 'k' ? `(${S.grade}학년군)` : '(초등 공통)'}</h4>
                <div class="deck-cards">${pool.length ? pool.map((x) => deckCard(c, x.t, c, { area: x.sub, rel: x.r })).join('') : empty('해당 영역에 이 학년군 카드가 없어요')}</div>
              </div>
            </div>`;
          }).join('')}
        </div>`;
    },

    ku() {
      const pool = S.k.filter((x) => !S.concept.some((c) => c.src === x.id) && !S.fact.some((c) => c.src === x.id));
      return stdRef() + `
        <div class="two">
          <div>
            <div class="ku">
              <div class="zone"><h3>개념 <small>${S.concept.length}</small></h3>
                <div class="slot">${S.concept.map((it) => placed('concept', it, 'concept', moveBtn('concept', it, 'fact', '사실/정보로 →'))).join('') || empty('짧은 개념어로 쓰세요')}</div>
                <button class="btn add" data-add="concept">+ 개념 직접 쓰기</button>
              </div>
              <div class="zone"><h3>사실/정보 <small>${S.fact.length}</small></h3>
                <div class="slot">${S.fact.map((it) => placed('fact', it, 'fact', moveBtn('fact', it, 'concept', '← 개념으로'))).join('') || empty('구체적인 사실·정보')}</div>
                <button class="btn add" data-add="fact">+ 사실/정보 직접 쓰기</button>
              </div>
            </div>
          </div>
          <div class="deck">
            <h3>③에서 고른 지식·이해 카드</h3>
            <p class="hint">카드를 개념 또는 사실/정보로 보내고, 보낸 뒤에 눌러서 단원에 맞게 고쳐 쓰세요.</p>
            <div class="deck-cards">${pool.length ? pool.map((x) => `
              ${card('k', x.t, { foot: `<button class="mini" data-split="concept" data-src="${x.id}">개념으로</button><button class="mini" data-split="fact" data-src="${x.id}">사실/정보로</button>` })}`).join('') : empty(S.k.length ? '모두 옮겼어요' : '③에서 지식·이해 카드를 먼저 고르세요')}</div>
          </div>
        </div>`;
    },

    pv() {
      const col = (list, src, name, kind) => {
        const pool = [];
        S[src].forEach((x) => { if (!S[list].some((y) => y.src === x.id)) pool.push({ t: x.t, id: x.id, from: '③에서 고름' }); });
        S.areas.forEach((id) => AREAS[id][src].forEach((t) => {
          if (!S[src].some((x) => x.t === t) && !S[list].some((y) => y.t === t || y.src === t)) pool.push({ t, id: t, from: AREAS[id].name, r: rel(t) });
        }));
        const mine = pool.filter((x) => x.from === '③에서 고름');
        const more = pool.filter((x) => x.from !== '③에서 고름').sort((a, b) => b.r - a.r);
        return `<div class="cs-col">
          <div class="zone"><h3>${name} <small>${S[list].length}</small></h3>
            <div class="slot">${S[list].map((it) => placed(list, it, kind)).join('') || empty('카드를 가져오거나 직접 쓰세요')}</div>
            <button class="btn add" data-add="${list}">+ 직접 쓰기</button>
          </div>
          <div class="deck slim">
            <h4 class="dh">③에서 고른 카드</h4>
            <div class="deck-cards">${mine.length ? mine.map((x) => card(kind, x.t, { foot: `<button class="mini" data-take="${list}" data-src="${esc(x.id)}" data-t="${esc(x.t)}">가져오기</button>` })).join('') : empty('남은 카드 없음')}</div>
            ${more.length ? `<details class="more"><summary>같은 영역의 다른 카드 ${more.length}장</summary><div class="deck-cards">${more.map((x) => card(kind, x.t, { badge: x.r >= 3 ? '성취기준 관련' : '', foot: `<span class="from">${esc(x.from)}</span><button class="mini" data-take="${list}" data-src="${esc(x.id)}" data-t="${esc(x.t)}">가져오기</button>` })).join('')}</div></details>` : ''}
          </div>
        </div>`;
      };
      return stdRef() + `<div class="cs-wrap two-col">
        ${col('proc', 'p', '⑤ 단원의 과정·기능', 'proc')}
        ${col('val', 'v', '⑤+ 단원의 가치·태도', 'val')}
      </div>`;
    },

    big() {
      if (!S.big.length) S.big.push({ id: uid(), t: '' });
      const concepts = S.concept.map((c) => c.t.trim()).filter(Boolean);
      return `<div class="two">
        <div>
          <div class="zone gold">
            <h3>⑥ 단원의 핵심 아이디어</h3>
            ${S.big.map((b, i) => {
              const hit = concepts.filter((c) => b.t.includes(c));
              return `<div class="bigrow">
                <textarea data-big="${b.id}" rows="3" placeholder="예) 사람들은 장소에서의 경험에 따라 서로 다른 장소감을 갖는다.">${esc(b.t)}</textarea>
                <div class="checks" id="chk-${b.id}">${bigChecks(b.t, concepts)}</div>
                ${S.big.length > 1 ? `<button class="mini" data-delbig="${b.id}">이 문장 지우기</button>` : ''}
              </div>`;
            }).join('')}
            <button class="btn add" data-addbig>+ 문장 하나 더</button>
          </div>
          <div class="frames"><h4>문장 틀 (누르면 마지막 칸에 들어가요)</h4>
            ${FRAMES.map((f) => `<button class="chip" data-frame="${esc(f)}">${esc(f)}</button>`).join('')}
          </div>
        </div>
        <div class="deck">
          <h3>재료: ① ④ ⑤</h3>
          ${summaryMaterials()}
        </div>
      </div>`;
    },

    q() {
      return `<div class="two">
        <div>
          <div class="zone red">
            <h3>⑦ 단원의 핵심/탐구 질문 <small>${S.q.length}</small></h3>
            ${S.big.some((b) => b.t.trim()) ? `<div class="target"><b>도달할 답 (⑥)</b> ${S.big.filter((b) => b.t.trim()).map((b) => esc(b.t)).join('<br>')}</div>` : `<div class="target warn">⑥ 단원의 핵심 아이디어를 먼저 쓰면 질문 만들기가 쉬워요.</div>`}
            <div class="qlist">${S.q.map((q) => {
              const ty = QTYPES.find((x) => x.t === q.type) || QTYPES[1];
              return `<div class="qrow" style="--qc:${ty.color}">
                <select data-qtype="${q.id}">${QTYPES.map((x) => `<option value="${x.t}" ${x.t === q.type ? 'selected' : ''}>${x.name}</option>`).join('')}</select>
                <textarea rows="2" data-q="${q.id}" placeholder="질문을 쓰세요">${esc(q.t)}</textarea>
                <button class="x" data-delq="${q.id}" title="지우기">×</button>
              </div>`;
            }).join('') || empty('오른쪽 질문 카드에서 틀을 골라 시작하세요')}</div>
            <div class="qbal">${qBalance()}</div>
          </div>
        </div>
        <div class="deck">
          <h3>질문 유형 카드</h3>
          ${QTYPES.map((ty) => `<div class="card c-qt" style="--qc:${ty.color}">
            <div class="card-band"><span>${ty.name}</span></div>
            <div class="card-body"><p class="qdesc">${ty.desc}</p>
              ${ty.stems.map((s) => `<button class="chip" data-stem="${esc(s)}" data-type="${ty.t}">${esc(s)}</button>`).join('')}
              <button class="mini" data-stem="" data-type="${ty.t}">+ 빈 질문</button>
            </div></div>`).join('')}
        </div>
      </div>`;
    },

    out() {
      return `<div class="out-actions">
          <button class="btn primary" data-act="print">인쇄 / PDF</button>
          <button class="btn" data-act="png">이미지로 저장</button>
          <button class="btn" data-act="copytext">텍스트 복사</button>
          <button class="btn" data-act="ai">AI 검토 요청문 복사</button>
        </div>
        <p class="hint">‘AI 검토 요청문’은 이 설계를 정리해 정렬(성취기준–핵심 아이디어–질문)이 맞는지 봐 달라는 질문으로 만들어 줍니다. 원하는 AI 도구에 붙여 넣으세요.</p>
        <div class="sheet-wrap"><div id="sheet">${sheetHtml()}</div></div>`;
    }
  };

  function empty(t) { return `<div class="empty">${esc(t)}</div>`; }
  function moveBtn(list, it, to, label) { return `<div class="card-foot"><button class="mini" data-move="${list}" data-id="${it.id}" data-to="${to}">${label}</button></div>`; }

  function deckCard(kind, t, list, o) {
    const used = has(list, t);
    return card(kind, t, {
      cls: used ? 'used' : '',
      badge: o.rel >= 3 ? '성취기준 관련' : '',
      foot: `<span class="from">${esc(o.area || '')}</span>${used ? '<span class="usedtag">가져옴</span>' : `<button class="mini" data-take="${list}" data-src="${esc(t)}" data-t="${esc(t)}">가져오기</button>`}`
    });
  }

  function areaToggles() {
    const rec = new Set();
    UNITS.filter((u) => u.grade === S.grade && S.units.includes(u.no)).forEach((u) => u.areas.forEach((a) => rec.add(a)));
    return `<div class="areas">
      <span class="lab">영역</span>
      ${AREAS.map((a) => `<button class="atog ${S.areas.includes(a.id) ? 'on' : ''}" data-area="${a.id}">${esc(a.name)}${rec.has(a.id) ? '<i>추천</i>' : ''}</button>`).join('')}
    </div>`;
  }

  function stdRef() {
    const ds = selectedStd();
    if (!ds.length) return '';
    return `<details class="stdref" open><summary>고른 성취기준과 해설 다시 보기</summary>
      ${ds.map((d) => `<div class="sr"><b>${d.code}</b> ${esc(d.text)}${d.exp ? `<details><summary>해설</summary><p>${esc(d.exp)}</p></details>` : ''}</div>`).join('')}
    </details>`;
  }

  function bigChecks(t, concepts) {
    const hit = concepts.filter((c) => c && t.includes(c));
    const hasDigit = /\d{2,}|[가-힣]+(시|군|구|동|읍|면)\s/.test(t);
    const long = t.length > 90;
    const items = [
      [hit.length >= 2, `④의 개념 2개 이상 연결 (${hit.length ? hit.join(', ') : '아직 없음'})`],
      [t.trim().length > 0 && !/\?$/.test(t.trim()), '질문이 아닌 진술문'],
      [t.trim().length > 0 && !hasDigit, '특정 연도·지명 없이 일반화'],
      [t.trim().length > 0 && !long, '한두 문장 길이']
    ];
    return items.map(([ok, l]) => `<span class="ck ${ok ? 'ok' : ''}">${ok ? '✓' : '·'} ${esc(l)}</span>`).join('');
  }

  function qBalance() {
    const c = { fact: 0, concept: 0, debate: 0 };
    S.q.forEach((q) => { if (q.t.trim()) c[q.type] = (c[q.type] || 0) + 1; });
    return QTYPES.map((ty) => `<span class="ck ${c[ty.t] ? 'ok' : ''}" style="--qc:${ty.color}">${c[ty.t] ? '✓' : '·'} ${ty.name} ${c[ty.t]}개</span>`).join('') +
      (c.concept ? '' : '<span class="warnline">개념적 질문이 하나는 있어야 ⑥에 도달하기 쉬워요.</span>');
  }

  function summaryMaterials() {
    const ds = selectedStd();
    const li = (arr) => arr.length ? `<ul>${arr.map((x) => `<li>${esc(x.t)}</li>`).join('')}</ul>` : '<p class="none">비어 있음</p>';
    return `<div class="mat"><h4>① 성취기준</h4>${ds.length ? `<ul>${ds.map((d) => `<li><b>${d.code}</b> ${esc(d.text)}</li>`).join('')}</ul>` : '<p class="none">비어 있음</p>'}</div>
      <div class="mat"><h4>④ 개념 <small>누르면 입력칸에 넣어요</small></h4>${S.concept.length ? S.concept.map((c) => `<button class="chip c-concept-chip" data-insert="${esc(c.t)}">${esc(c.t)}</button>`).join('') : '<p class="none">비어 있음</p>'}</div>
      <div class="mat"><h4>④ 사실/정보</h4>${li(S.fact)}</div>
      <div class="mat"><h4>⑤ 과정·기능</h4>${li(S.proc)}</div>
      <div class="mat"><h4>⑤+ 가치·태도</h4>${li(S.val)}</div>`;
  }

  function sheetHtml() {
    const ds = selectedStd();
    const ul = (arr, f = (x) => x.t) => arr.filter((x) => f(x).trim()).length ? `<ul>${arr.filter((x) => f(x).trim()).map((x) => `<li>${esc(f(x))}</li>`).join('')}</ul>` : '';
    const qName = (t) => (QTYPES.find((x) => x.t === t) || {}).name || '';
    const title = S.title || S.autoTitle || '';
    return `<table class="ws">
      <colgroup><col style="width:34%"><col style="width:18%"><col style="width:18%"><col style="width:15%"><col style="width:15%"></colgroup>
      <tr><td colspan="5" class="ws-title">평가 설계 — ${esc(title)} <span>사회 ${esc(S.grade)}학년군 · 2022 개정 교육과정</span></td></tr>
      <tr><th colspan="5" class="h1">① 성취기준</th></tr>
      <tr><td colspan="5" class="std-cell">${ds.map((d) => `<p><b>${d.code}</b> ${esc(d.text)}</p>`).join('') || '&nbsp;'}</td></tr>
      <tr><th class="h0">교육과정 분석</th><th colspan="4" class="h0">평가의 초점</th></tr>
      <tr><th class="h1">② 핵심 아이디어</th><th colspan="4" class="h1 gold">⑥ 단원의 핵심 아이디어</th></tr>
      <tr><td rowspan="3">${ul(S.ideas)}</td><td colspan="4" class="big-cell">${S.big.filter((b) => b.t.trim()).map((b) => `<p>${esc(b.t)}</p>`).join('') || '&nbsp;'}</td></tr>
      <tr><th colspan="4" class="h1 red">⑦ 단원의 핵심/탐구 질문</th></tr>
      <tr><td colspan="4">${S.q.filter((q) => q.t.trim()).length ? `<ul class="ql">${S.q.filter((q) => q.t.trim()).map((q) => `<li><span class="qt qt-${q.type}">${qName(q.type)}</span> ${esc(q.t)}</li>`).join('')}</ul>` : '&nbsp;'}</td></tr>
      <tr><th class="h1">③ 내용 체계</th><th colspan="4" class="h1">단원의 학습 내용 구분</th></tr>
      <tr><td class="cs-cell" rowspan="2">
          <div class="cs-part"><span class="cl">[지식·이해]</span>${ul(S.k)}</div>
          <div class="cs-part"><span class="cl">[과정·기능]</span>${ul(S.p)}</div>
          <div class="cs-part"><span class="cl">[가치·태도]</span>${ul(S.v)}</div></td>
        <th colspan="2" class="h2">④ 단원의 지식·이해<div class="sub2"><span>개념</span><span>사실/정보</span></div></th>
        <th class="h2" rowspan="1">⑤ 단원의 과정·기능</th><th class="h2 add">⑤+ 단원의 가치·태도</th></tr>
      <tr><td class="tall">${ul(S.concept)}</td><td class="tall">${ul(S.fact)}</td><td class="tall">${ul(S.proc)}</td><td class="tall">${ul(S.val)}</td></tr>
    </table>
    <p class="ws-src">내용 출처: 교육부 고시 제2022-33호 [별책 7] 사회과 교육과정 · 설계 순서: 평가 설계 워크시트(①~⑦)를 바탕으로 가치·태도 칸을 더함</p>`;
  }

  function plainText() {
    const ds = selectedStd();
    const L = (arr) => arr.filter((x) => x.t.trim()).map((x) => '  - ' + x.t).join('\n') || '  -';
    const qName = (t) => (QTYPES.find((x) => x.t === t) || {}).name || '';
    return `[평가 설계] ${S.title || S.autoTitle || ''} (사회 ${S.grade}학년군, 2022 개정)

① 성취기준
${ds.map((d) => '  ' + d.code + ' ' + d.text).join('\n') || '  -'}
② 핵심 아이디어
${L(S.ideas)}
③ 내용 체계
  [지식·이해]
${L(S.k)}
  [과정·기능]
${L(S.p)}
  [가치·태도]
${L(S.v)}
④ 단원의 지식·이해
  (개념)
${L(S.concept)}
  (사실/정보)
${L(S.fact)}
⑤ 단원의 과정·기능
${L(S.proc)}
⑤+ 단원의 가치·태도
${L(S.val)}
⑥ 단원의 핵심 아이디어
${L(S.big)}
⑦ 단원의 핵심/탐구 질문
${S.q.filter((q) => q.t.trim()).map((q) => '  - [' + qName(q.type) + '] ' + q.t).join('\n') || '  -'}`;
  }

  function aiPrompt() {
    return `나는 초등학교 교사이고, 아래와 같이 2022 개정 사회과 교육과정에 따라 단원의 평가를 설계하고 있어. 평가 설계 전문가로서 검토해 줘.

${plainText()}

검토해 줄 것:
1. ⑥ 단원의 핵심 아이디어가 ① 성취기준과 ④ 개념, ⑤ 과정·기능·가치·태도를 제대로 묶고 있는지. 개념 간 관계를 담은 일반화 문장인지.
2. ④에서 개념과 사실/정보가 알맞게 나뉘었는지.
3. ⑦ 질문들이 학생을 ⑥에 도달하게 이끄는지. 사실적·개념적·논쟁적 질문의 균형.
4. 이 평가의 초점에 맞는 평가 과제(서·논술형 또는 수행평가) 아이디어 2가지와 각 과제의 채점 기준 요소.
고칠 점은 구체적인 수정 문장으로 제안해 줘.`;
  }

  // ---------- actions ----------
  function findList(list, id) { return S[list].find((x) => x.id === id); }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, [data-go]');
    if (!t) return;
    const d = t.dataset;
    if (d.go !== undefined) { S.step = +d.go; save(); render(); window.scrollTo(0, 0); closeNav(); return; }
    if (d.act === 'next') { S.step++; save(); render(); window.scrollTo(0, 0); return; }
    if (d.act === 'prev') { S.step--; save(); render(); window.scrollTo(0, 0); return; }
    if (d.grade) {
      if (S.grade !== d.grade && S.std.length && !confirm('학년군을 바꾸면 고른 성취기준이 해제됩니다. 바꿀까요?')) return;
      S.grade = d.grade; S.std = []; S.units = []; S.areas = []; save(); render(); return;
    }
    if (d.area !== undefined) {
      const id = +d.area; S.areas = S.areas.includes(id) ? S.areas.filter((x) => x !== id) : [...S.areas, id].sort((a, b) => a - b);
      save(); render(); return;
    }
    if (d.take) {
      if (!S[d.take].some((x) => x.src === d.src)) S[d.take].push({ id: uid(), t: d.t, src: d.src });
      save(); render(); return;
    }
    if (d.del) { S[d.del] = S[d.del].filter((x) => x.id !== d.id); save(); render(); return; }
    if (d.split) {
      const src = S.k.find((x) => x.id === d.src);
      if (src) S[d.split].push({ id: uid(), t: src.t, src: src.id });
      save(); render(); return;
    }
    if (d.move) {
      const it = findList(d.move, d.id);
      if (it) { S[d.move] = S[d.move].filter((x) => x.id !== d.id); S[d.to].push(it); }
      save(); render(); return;
    }
    if (d.add) {
      const it = { id: uid(), t: '', src: 'mine' }; S[d.add].push(it); save(); render();
      const el = document.querySelector(`[data-edit="${d.add}"][data-id="${it.id}"]`); if (el) el.focus();
      return;
    }
    if (d.addbig !== undefined) { S.big.push({ id: uid(), t: '' }); save(); render(); return; }
    if (d.delbig) { S.big = S.big.filter((b) => b.id !== d.delbig); save(); render(); return; }
    if (d.frame !== undefined || d.insert !== undefined) {
      const txt = d.frame !== undefined ? d.frame : d.insert;
      const tas = document.querySelectorAll('textarea[data-big]');
      const ta = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.big ? document.activeElement : (lastBig && document.querySelector(`textarea[data-big="${lastBig}"]`)) || tas[tas.length - 1];
      if (ta) {
        const s = ta.selectionStart ?? ta.value.length, en = ta.selectionEnd ?? ta.value.length;
        if (d.frame !== undefined && ta.value.trim()) { ta.value = ta.value.trimEnd() + ' ' + txt; }
        else ta.value = ta.value.slice(0, s) + txt + ta.value.slice(en);
        ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus();
      }
      return;
    }
    if (d.stem !== undefined) { S.q.push({ id: uid(), type: d.type, t: d.stem }); save(); render(); const tas = document.querySelectorAll('textarea[data-q]'); if (tas.length) tas[tas.length - 1].focus(); return; }
    if (d.delq) { S.q = S.q.filter((q) => q.id !== d.delq); save(); render(); return; }
    if (d.quiz) {
      const z = QUIZ[d.quiz]; const ok = +d.i === z.a;
      t.parentElement.querySelectorAll('.qbtn').forEach((b, i) => { b.classList.toggle('right', i === z.a && ok); b.classList.toggle('wrong', b === t && !ok); });
      const fb = document.getElementById('qfb-' + d.quiz); fb.hidden = false; fb.className = 'qfb ' + (ok ? 'ok' : 'no');
      fb.textContent = (ok ? '맞아요! ' : '다시 생각해 볼까요? ') + (ok ? z.e : '');
      return;
    }
    if (d.act === 'print') { window.print(); return; }
    if (d.act === 'copytext') { copy(plainText(), '텍스트를 복사했어요'); return; }
    if (d.act === 'ai') { copy(aiPrompt(), 'AI 검토 요청문을 복사했어요'); return; }
    if (d.act === 'png') { exportPng(); return; }
    if (d.act === 'new') { if (confirm('새 설계를 시작할까요? 지금 설계는 목록에 저장되어 있어요.')) { S = blank(); save(); render(); closeList(); } return; }
    if (d.act === 'list') { openList(); return; }
    if (d.act === 'closelist') { closeList(); return; }
    if (d.open) { S = designs[d.open]; save(); render(); closeList(); return; }
    if (d.remove) { if (confirm('이 설계를 목록에서 지울까요? 되돌릴 수 없어요.')) { delete designs[d.remove]; lsSet(LS_KEY, designs); if (S.id === d.remove) S = blank(); save(); render(); openList(); } return; }
    if (d.act === 'export') { exportJson(); return; }
    if (d.act === 'import') { $('#fileIn').click(); return; }
    if (d.act === 'help') { $('#help').toggleAttribute('open'); return; }
    if (d.act === 'menu') { document.body.classList.toggle('navopen'); return; }
  });

  let lastBig = null;
  document.addEventListener('input', (e) => {
    const el = e.target;
    const d = el.dataset || {};
    if (d.edit) { const it = findList(d.edit, d.id); if (it) { it.t = el.innerText.replace(/\n+/g, ' ').trim(); save(); renderNav(); } return; }
    if (d.big) {
      lastBig = d.big;
      const b = S.big.find((x) => x.id === d.big); if (b) b.t = el.value;
      const c = document.getElementById('chk-' + d.big);
      if (c) c.innerHTML = bigChecks(el.value, S.concept.map((x) => x.t.trim()).filter(Boolean));
      save(); renderNav(); return;
    }
    if (d.q) { const q = S.q.find((x) => x.id === d.q); if (q) q.t = el.value; save(); const b = document.querySelector('.qbal'); if (b) b.innerHTML = qBalance(); renderNav(); return; }
    if (el.id === 'designTitle') { S.title = el.value; save(); return; }
  });
  document.addEventListener('focusin', (e) => { if (e.target.dataset && e.target.dataset.big) lastBig = e.target.dataset.big; });

  document.addEventListener('change', (e) => {
    const el = e.target; const d = el.dataset || {};
    if (d.std) {
      if (el.checked) { if (!S.std.includes(d.std)) S.std.push(d.std); }
      else S.std = S.std.filter((x) => x !== d.std);
      // units & recommended areas
      const unitsNow = new Set();
      UNITS.filter((u) => u.grade === S.grade).forEach((u) => { if (u.std.some((s) => S.std.includes(s.code))) unitsNow.add(u.no); });
      const before = new Set(S.units);
      S.units = [...unitsNow];
      // add recommended areas for newly-added units
      UNITS.filter((u) => u.grade === S.grade && unitsNow.has(u.no) && !before.has(u.no)).forEach((u) => u.areas.forEach((a) => { if (!S.areas.includes(a)) S.areas.push(a); }));
      S.areas.sort((a, b) => a - b);
      save(); render(); return;
    }
    if (d.qtype) { const q = S.q.find((x) => x.id === d.qtype); if (q) q.type = el.value; save(); render(); return; }
  });

  // paste as plain text into contenteditable
  document.addEventListener('paste', (e) => {
    if (e.target.isContentEditable) { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text')); }
  });
  document.addEventListener('keydown', (e) => { if (e.target.isContentEditable && e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });

  function copy(text, msg) {
    const done = () => toast(msg);
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('복사에 실패했어요'); } ta.remove(); }
  }
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2200); }

  function fname(ext) { return ((S.title || S.autoTitle || '평가설계').replace(/[\\/:*?"<>|]/g, '').trim() || '평가설계') + ext; }
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function exportJson() { download(new Blob([JSON.stringify({ app: 'eval-card', v: 1, design: S }, null, 1)], { type: 'application/json' }), fname('.json')); toast('설계 파일을 저장했어요 (다운로드 폴더)'); }
  $('#fileIn').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const j = JSON.parse(r.result); const dz = j.design || j;
        if (!dz || !Array.isArray(dz.std)) throw 0;
        const base = blank(); S = Object.assign(base, dz); if (designs[S.id] && designs[S.id] !== S) S.id = uid();
        save(); render(); closeList(); toast('설계를 불러왔어요');
      } catch (err) { alert('이 앱에서 저장한 설계 파일(.json)이 아니에요.'); }
    };
    r.readAsText(f); e.target.value = '';
  });
  function exportPng() {
    const el = document.getElementById('sheet');
    if (!window.html2canvas) { toast('이미지 기능을 불러오는 중이에요. 잠시 후 다시 눌러 주세요'); return; }
    el.classList.add('capturing');
    html2canvas(el, { scale: 2, backgroundColor: '#ffffff' }).then((c) => { el.classList.remove('capturing'); c.toBlob((b) => { download(b, fname('.png')); toast('이미지를 저장했어요 (다운로드 폴더)'); }); }).catch(() => { el.classList.remove('capturing'); toast('이미지 저장에 실패했어요'); });
  }

  function openList() {
    const arr = Object.values(designs).sort((a, b) => b.updated - a.updated);
    $('#listBody').innerHTML = arr.length ? arr.map((x) => `<div class="li ${x.id === S.id ? 'cur' : ''}">
      <button class="li-open" data-open="${x.id}"><b>${esc(x.title || x.autoTitle || '제목 없는 설계')}</b><span>${new Date(x.updated).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · ${STEPS[x.step || 0].no} 단계</span></button>
      <button class="mini danger" data-remove="${x.id}">지우기</button></div>`).join('') : '<p class="hint">아직 저장된 설계가 없어요.</p>';
    $('#list').hidden = false;
  }
  function closeList() { $('#list').hidden = true; }
  function closeNav() { document.body.classList.remove('navopen'); }

  render();
  save();
})();
