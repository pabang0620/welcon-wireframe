/*
 * 내 업무 프로필 선택 위저드
 *
 * 의존: krds_modal(custom-ui-script.js), Chart.js 4.x(전역 Chart), window.WORK_PROFILE_DATA(work-profile-data.js)
 * 마크업: work-profile.html / 스타일: work-profile.css
 *
 * 단계: 1 활동 장르 -> 2 내가 하는 일(주/보조 포지션) -> 3 희망 파트너 -> 4 완료(요약, 그래프)
 *
 * 외부 API
 *   WorkProfile.getSelection()      현재 선택값 (이름과 서버 코드)
 *   WorkProfile.setSelection(obj)   저장된 값 불러오기 (getSelection 과 같은 형식)
 *   WorkProfile.isComplete()        4단계(완료)까지 진행했고 내가 하는 일이 1개 이상이면 true
 *   document 이벤트 "work-profile:change" (detail = 선택값), hidden input #work-profile-value (JSON)
 */
(function () {
"use strict";
function init() {
/* 데이터: 업무 단계 표시 순서와 장르별 항목 */
const STAGE_ORDER = window.WORK_PROFILE_DATA.stageOrder;
const DATA = window.WORK_PROFILE_DATA.data;
const CODES = window.WORK_PROFILE_DATA.codes || {};

const GENRES = Object.keys(DATA);

/* 단계별 모달 제목과 보조 설명 */
const MODAL_TITLES = ["", "장르를 선택해 주세요", "귀하가 하는 일을 선택해주세요", "귀하가 찾고 있는 파트너 유형을 선택해주세요", "완료"];

const MODAL_DESCS = ["", "해당하는 활동 분야를 모두 선택할 수 있습니다.", "가장 대표적인 역할 하나가 주포지션이 되며, 보조포지션 배지를 누르면 주포지션을 바꿀 수 있습니다.", "다른 장르의 포지션도 선택할 수 있습니다.", ""];
/* 선택 키는 "장르||항목" 문자열 */
const SEP = "||";

/* 위저드 상태. works = 내가 하는 일, wishes = 희망 파트너 */
const st = {
  step: 1,
  completed: false,
  genres: new Set(),
  works: new Set(),
  wishes: new Set(),
  worksStageFilter: new Set(),
  wishStageFilter: new Set(),
  worksQuery: "",
  wishQuery: "",
  worksOtherText: {},
  wishOtherText: {},
  worksOtherOpen: {},
  wishOtherOpen: {},
  worksCustomItems: {},
  wishCustomItems: {},
  mainKey: null,
  etcGenreName: "",
  etcGenreDraft: "",
  worksShownGenres: new Set(),
  wishShownGenres: new Set(),
  worksShownSeeded: new Set()
};

const key = (g, item) => g + SEP + item;
const parseKey = k => k.split(SEP);
const customItemsFor = (store, genre) => store[genre] || [];
const cleanCustomName = value => value.trim().replace(/\s+/g, " ").replaceAll(SEP, " / ");

/* 장르 "기타": 사용자가 이름을 직접 입력하며 1개만 만들 수 있다. 내부 키는 항상 "기타", 화면에는 입력한 이름을 보여준다 */
const ETC_GENRE = "기타";
const ETC_NAME_MAX = 20;

/* 화면 표시용 장르명 */
function gl(g) { return g === ETC_GENRE && st.etcGenreName ? st.etcGenreName : g; }

/* HTML 에 넣을 장르명 (escape) */
function glHtml(g) { return escAttr(gl(g)); }

/* "기타" 장르를 켰는데 이름을 확정하지 않았으면 다음 단계로 넘어갈 수 없다 */
function etcNameState() {
  if (!st.genres.has(ETC_GENRE)) return "ok";
  const n = st.etcGenreName;
  if (!n) return "empty";
  if (GENRES.some(g => g !== ETC_GENRE && g === n)) return "dup";
  return "ok";
}

/* 2, 3단계에 보여줄 장르. "기타"는 1단계에서 켠 경우에만 포함 */
function activeGenres() { return GENRES.filter(g => g !== ETC_GENRE || st.genres.has(ETC_GENRE)); }

/* "기타" 장르를 끄면 이름과 그 장르의 선택, 직접 입력 항목을 모두 지운다 */
function clearEtcGenre() {
  st.etcGenreName = "";
  st.etcGenreDraft = "";
  delete st.worksCustomItems[ETC_GENRE]; delete st.wishCustomItems[ETC_GENRE];
  delete st.worksOtherText[ETC_GENRE]; delete st.wishOtherText[ETC_GENRE];
  delete st.worksOtherOpen[ETC_GENRE]; delete st.wishOtherOpen[ETC_GENRE];
  [...st.works].forEach(k => { if (parseKey(k)[0] === ETC_GENRE) st.works.delete(k); });
  [...st.wishes].forEach(k => { if (parseKey(k)[0] === ETC_GENRE) st.wishes.delete(k); });
  st.worksShownGenres.delete(ETC_GENRE); st.wishShownGenres.delete(ETC_GENRE);
  st.worksShownSeeded.delete(ETC_GENRE);
}

function stagesOf(genre) {
  const d = DATA[genre];
  return STAGE_ORDER.filter(s => d[s]).concat(d["기타"] ? ["기타"] : []);
}

function dataItemExists(genre, item) {
  const d = DATA[genre];
  for (const stage in d) {
    if (d[stage].indexOf(item) > -1) return true;
  }
  return false;
}

function matchesQuery(text, q) {
  return !q || text.toLowerCase().includes(q.toLowerCase());
}

/* 서버 코드 조회. 매핑이 없으면 null */
function lookupCode(group, name) {
  const map = CODES[group] || {};
  return Object.prototype.hasOwnProperty.call(map, name) ? map[name] : null;
}

function genreEntry(g) {
  return { genre: gl(g), genreCode: lookupCode("genres", g) };
}

/* 선택 키 -> 외부 전달용 객체. custom 은 마스터 데이터에 없는 직접 입력 항목(itemCode 없음) */
function toItem(k) {
  const p = parseKey(k);
  const custom = !dataItemExists(p[0], p[1]);
  const stage = stageOfKey(k);
  return {
    genre: gl(p[0]), genreCode: lookupCode("genres", p[0]),
    stage: stage, stageCode: stage ? lookupCode("stages", stage) : null,
    item: p[1], itemCode: custom ? null : lookupCode("items", key(p[0], p[1])),
    custom: custom
  };
}

function getSelection() {
  const mk = getMainKey();
  const picked = [...st.works];
  return {
    completed: isComplete(),
    genres: [...st.genres].map(genreEntry),
    etcGenreName: st.etcGenreName,
    main: mk ? toItem(mk) : null,
    subs: picked.filter(k => k !== mk).map(toItem),
    wishes: [...st.wishes].map(toItem)
  };
}

function isComplete() {
  return st.completed && st.works.size > 0;
}

function publishSelection() {
  const selection = getSelection();
  const input = document.getElementById("work-profile-value");
  if (input) input.value = JSON.stringify(selection);
  document.dispatchEvent(new CustomEvent("work-profile:change", { detail: selection }));
}

/* getSelection() 형식의 값을 화면에 반영한다. 폼 영역 요약과 그래프까지 그리고, 모달은 1단계 상태로 둔다 */
function setSelection(selection) {
  resetAll();
  const sel = selection || {};
  st.etcGenreName = sel.etcGenreName || "";
  const byCode = group => {
    const out = {};
    Object.keys(CODES[group] || {}).forEach(name => { out[CODES[group][name]] = name; });
    return out;
  };
  const genreByCode = byCode("genres");
  const itemByCode = byCode("items");
  const resolveGenre = o => {
    const obj = typeof o === "string" ? { genre: o } : (o || {});
    if (st.etcGenreName && obj.genre === st.etcGenreName) return ETC_GENRE;
    if (obj.genre && DATA[obj.genre]) return obj.genre;
    return genreByCode[obj.genreCode] || null;
  };
  const resolveEntry = o => {
    if (!o) return null;
    if (o.itemCode && itemByCode[o.itemCode]) {
      const p = parseKey(itemByCode[o.itemCode]);
      return { g: p[0], item: p[1] };
    }
    const g = resolveGenre(o);
    return g && DATA[g] && o.item ? { g: g, item: o.item } : null;
  };
  const addItems = (list, set, store) => {
    (list || []).forEach(o => {
      const entry = resolveEntry(o);
      if (!entry) return;
      if (!dataItemExists(entry.g, entry.item)) {
        const custom = store[entry.g] || (store[entry.g] = []);
        if (custom.indexOf(entry.item) === -1) custom.push(entry.item);
      }
      set.add(key(entry.g, entry.item));
    });
  };
  (sel.genres || []).forEach(o => { const g = resolveGenre(o); if (g && DATA[g]) st.genres.add(g); });
  addItems(sel.main ? [sel.main] : [], st.works, st.worksCustomItems);
  addItems(sel.subs, st.works, st.worksCustomItems);
  addItems(sel.wishes, st.wishes, st.wishCustomItems);
  st.works.forEach(k => st.genres.add(parseKey(k)[0]));
  const mainEntry = resolveEntry(sel.main);
  if (mainEntry && st.works.has(key(mainEntry.g, mainEntry.item))) st.mainKey = key(mainEntry.g, mainEntry.item);
  if (st.genres.has(ETC_GENRE) && !st.etcGenreName) st.genres.delete(ETC_GENRE);
  if (!st.works.size) { render(); return; }
  st.step = 4;
  render();
  st.step = 1;
  st.completed = true;
  render();
}

window.WorkProfile = { getSelection: getSelection, setSelection: setSelection, isComplete: isComplete };

/* 현재 단계 화면과 버튼 상태를 그린다 */
function render() {
  document.querySelectorAll(".work-profile-screen").forEach(el => {
    el.classList.toggle("active", el.dataset.s === String(st.step));
  });
  document.getElementById("work-profile-modal-title").textContent = MODAL_TITLES[st.step];
  const descEl = document.getElementById("work-profile-modal-desc");
  const descText = MODAL_DESCS[st.step];
  descEl.textContent = descText;
  descEl.hidden = !descText;

  document.getElementById("work-profile-back").style.visibility = (st.step > 1 && st.step < 4) ? "visible" : "hidden";
  const nextBtn = document.getElementById("work-profile-next");
  nextBtn.textContent = st.step === 3 ? "등록 완료" : (st.step === 4 ? "처음부터 다시" : "다음");
  nextBtn.disabled = (st.step === 1 && (!st.genres.size || etcNameState() !== "ok")) || (st.step === 2 && !st.works.size);

  const confirmBtn = document.getElementById("work-profile-confirm");
  confirmBtn.style.display = st.step === 4 ? "" : "none";
  nextBtn.classList.toggle("primary", st.step !== 4);
  nextBtn.classList.toggle("secondary", st.step === 4);

  if (st.step === 1) drawGenreStep();
  if (st.step === 2) { drawWorksStep(); scrollToFirstSelectedGenre(); }
  if (st.step === 3) {
    st.wishShownGenres = new Set([...st.worksShownGenres, ...[...st.wishes].map(k => parseKey(k)[0])]);
    drawWishStep();
  }
  if (st.step === 4) { st.completed = true; drawSummaryStep(); }
  publishSelection();
}

function isMobileLayout() {
  return window.matchMedia("(max-width: 767px)").matches;
}

function scrollToFirstSelectedGenre() {
  if (isMobileLayout()) return;
  const target = GENRES.find(g => st.genres.has(g));
  if (!target) return;
  const el = document.querySelector('#work-profile-works-area .work-profile-group[data-genre="' + CSS.escape(target) + '"]');
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* 1단계: 장르 타일. "기타" 타일은 켜면 타일 자체가 입력란이 되고 엔터로 이름을 확정한다 */
function drawGenreStep() {
  const el = document.getElementById("work-profile-genre-grid");
  el.innerHTML = GENRES.map(g => {
    const on = st.genres.has(g);
    if (g === ETC_GENRE && on && !st.etcGenreName) {
      return '<div class="work-profile-genre-tile active editing" data-g="' + g + '">' +
        '<input type="text" id="work-profile-etc-input" class="work-profile-etc-input" maxlength="' + ETC_NAME_MAX + '" ' +
          'placeholder="입력 후 엔터를 눌러주세요" value="' + escAttr(st.etcGenreDraft) + '">' +
        '<span class="work-profile-etc-hint" id="work-profile-etc-hint"></span></div>';
    }
    return '<button type="button" class="work-profile-genre-tile ' + (on ? "active" : "") + '" data-g="' + g + '">' + glHtml(g) + '</button>';
  }).join("");
  el.querySelectorAll(".work-profile-genre-tile").forEach(btn => {
    btn.onclick = () => {
      const g = btn.dataset.g;
      if (st.genres.has(g)) {
        st.genres.delete(g);
        [...st.works].forEach(k => { if (parseKey(k)[0] === g) st.works.delete(k); });
        if (g === ETC_GENRE) clearEtcGenre();
      } else {
        st.genres.add(g);
      }
      st.worksStageFilter.clear();
      st.wishStageFilter.clear();
      render();
      const etcInput = document.getElementById("work-profile-etc-input");
      if (g === ETC_GENRE && etcInput) etcInput.focus();
    };
  });
  wireEtcGenreInput();
}

function wireEtcGenreInput() {
  const input = document.getElementById("work-profile-etc-input");
  if (!input) return;
  const hint = document.getElementById("work-profile-etc-hint");
  const isDup = name => GENRES.some(g => g !== ETC_GENRE && g === name);
  input.onclick = e => e.stopPropagation();
  input.oninput = () => {
    st.etcGenreDraft = cleanCustomName(input.value);
    hint.textContent = isDup(st.etcGenreDraft) ? "이미 있는 장르입니다" : "";
  };
  input.onkeydown = e => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const name = cleanCustomName(input.value);
    if (!name) { hint.textContent = "장르명을 입력해 주세요"; input.focus(); return; }
    if (isDup(name)) { hint.textContent = "이미 있는 장르입니다"; return; }
    st.etcGenreName = name;
    st.etcGenreDraft = "";
    render();
  };
}

/* 업무 단계 필터 칩 */
function drawChipRow(container, options, selectedSet, onToggle, badgeFn) {
  container.innerHTML = options.map(v => {
    const info = badgeFn ? badgeFn(v) : null;
    const badge = (info && info.count) ? '<span class="work-profile-stage-chip-badge ' + info.level + '">' + info.count + '</span>' : "";
    const cls = "work-profile-stage-chip" + (selectedSet.has(v) ? " active" : "");
    return '<button type="button" class="' + cls + '" data-v="' + v + '">' + v + badge + '</button>';
  }).join("");
  container.querySelectorAll(".work-profile-stage-chip").forEach(btn => {
    btn.onclick = () => {
      const v = btn.dataset.v;
      if (selectedSet.has(v)) selectedSet.delete(v); else selectedSet.add(v);
      onToggle();
    };
  });
}

function stageOfKey(k) {
  const p = parseKey(k);
  const g = p[0], item = p[1];
  const d = DATA[g];
  for (const s in d) { if (d[s].indexOf(item) > -1) return s; }
  if (customItemsFor(st.worksCustomItems, g).indexOf(item) > -1) return "기타";
  if (customItemsFor(st.wishCustomItems, g).indexOf(item) > -1) return "기타";
  return null;
}

/* 필터 칩의 선택 개수 배지. noMain 이면 주/보조 구분 없이 표시 */
function stageBadgeInfo(pickedSet, genresScope, stage, noMain) {
  let count = 0, hasMain = false;
  const mainKey = noMain ? null : getMainKey();
  pickedSet.forEach(k => {
    if (genresScope.indexOf(parseKey(k)[0]) === -1) return;
    if (stageOfKey(k) !== stage) return;
    count++;
    if (!noMain && k === mainKey) hasMain = true;
  });
  if (!count) return null;
  return { count: count, level: hasMain ? "main" : "sub" };
}

function stageOptionsFor(genresScope, includeOther) {
  const set = new Set();
  genresScope.forEach(g => stagesOf(g).forEach(s => {
    if (!includeOther && s === "기타") return;
    set.add(s);
  }));
  const ordered = STAGE_ORDER.filter(s => set.has(s));
  if (set.has("기타")) ordered.push("기타");
  return ordered;
}

/* 장르별 카드 데이터. referenceSet 에 있는 항목은 참고 표시(reference) */
function collectCards(genresScope, stageFilter, q, referenceSet, skipOther, customStore) {
  const cards = [];
  const customStores = Array.isArray(customStore) ? customStore : (customStore ? [customStore] : []);
  genresScope.forEach(g => {
    const items = [];
    stagesOf(g).forEach(stage => {
      if (skipOther && stage === "기타") return;
      if (stageFilter.size && !stageFilter.has(stage)) return;
      if (stage === "기타" && customStore) {
        const customItems = [];
        customStores.forEach(store => {
          customItemsFor(store, g).forEach(item => {
            if (customItems.indexOf(item) === -1) customItems.push(item);
          });
        });
        customItems.forEach(item => {
          const k = key(g, item);
          if (!matchesQuery(item, q)) return;
          items.push({ k: k, item: item, stage: stage, reference: !!(referenceSet && referenceSet.has(k)), custom: true });
        });
      }
      DATA[g][stage].forEach(item => {
        const k = key(g, item);
        if (!matchesQuery(item, q)) return;
        items.push({ k: k, item: item, stage: stage, reference: !!(referenceSet && referenceSet.has(k)) });
      });
    });
    if (items.length) cards.push({ genre: g, items: items });
  });
  return cards;
}

function escAttr(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* 장르 카드 1개. 항목은 role="checkbox" 이며 "기타" 항목은 입력란을 여는 버튼으로 동작한다 */
function cardHtml(card, pickedSet, allowMainToggle, otherText, otherOpen) {
  const picked = card.items.filter(o => pickedSet.has(o.k)).length;
  const badge = picked ? '<span class="work-profile-group-badge">' + picked + '</span>' : "";

  const tiles = card.items.map(o => {
    const isOn = pickedSet.has(o.k);
    const isOtherInput = o.stage === "기타" && o.item === "기타";
    const isOtherOpen = isOtherInput && !!(otherOpen && otherOpen[card.genre]);
    const isReference = !!o.reference;
    const posBadge = allowMainToggle ? positionLabel(o.k, !isReference && isOn) : "";
    const extra = isReference ? '<span class="work-profile-own-tag">하는 일</span>' + posBadge : posBadge;
    const otherVal = otherText ? (otherText[card.genre] || "") : "";
    const labelText = o.custom ? escAttr(o.item) : o.item;

    const showOther = isOtherInput && isOtherOpen;

    const labelHtml = showOther
      ? '<input type="text" class="work-profile-option-input" data-k="' + o.k +
        '" placeholder="입력 후 엔터를 눌러주세요" value="' + escAttr(otherVal) + '">'
      : labelText;

    const optionAria = showOther ? "" : (isOtherInput
      ? ' role="button" tabindex="0"'
      : ' role="checkbox" tabindex="0" aria-checked="' + (isOn ? "true" : "false") + '"');
    const subHtml = isOtherInput ? "" : '<span class="work-profile-option-stage">' + o.stage + '</span>';
    return '<div class="work-profile-option' + (isOn ? " active" : "") + (isOtherOpen ? " other-open" : "") + (isReference ? " reference" : "") + '" data-k="' + o.k + '"' + optionAria + '>' +
      '<div class="work-profile-option-box" aria-hidden="true"></div><div class="work-profile-option-label' + (showOther ? " has-input" : "") + '">' + labelHtml + '</div>' +
      '<div class="work-profile-option-meta">' + subHtml + extra + '</div>' +
    '</div>';
  }).join("");

  return '<section class="work-profile-group" id="work-profile-genre-section-' + escAttr(card.genre) + '" data-genre="' + escAttr(card.genre) + '">' +
    '<div class="work-profile-group-title"><span class="work-profile-group-title-text">' + glHtml(card.genre) + badge + '</span></div>' +
    '<div class="work-profile-group-body">' + tiles + '</div>' +
  '</section>';
}

function renderCards(container, cards, pickedSet, emptyMsg, allowMainToggle, otherText, otherOpen) {
  if (!cards.length) {
    container.innerHTML = '<div class="work-profile-empty">' + emptyMsg + '</div>';
    return;
  }
  container.innerHTML = cards.map(c => cardHtml(c, pickedSet, allowMainToggle, otherText, otherOpen)).join("");
}

function renderGenreSideNav(container, genres, pickedSet, preSelectedGenres, shownGenres) {
  container.innerHTML = genres.map(g => {
    let count = 0;
    pickedSet.forEach(k => { if (parseKey(k)[0] === g) count++; });
    const isShown = !!(shownGenres && shownGenres.has(g));
    const hasPicks = count > 0 || (preSelectedGenres && preSelectedGenres.has(g));
    const cls = "work-profile-nav-item" + (isShown ? " active" : "");
    return '<button type="button" class="' + cls + '" data-genre="' + escAttr(g) + '">' +
      '<span>' + glHtml(g) + '</span><span class="work-profile-nav-count' + (hasPicks ? " has" : "") + '">' + count + '</span>' +
    '</button>';
  }).join("");
}

const SCROLL_ALIGN_TOLERANCE_PX = 5;
/* 장르 카드가 이미 패널 맨 위에 맞춰 스크롤돼 있는지 */
function isSectionScrolledIntoView(target, contentEl) {
  if (!target || !contentEl) return false;
  if (target.classList.contains("filtered-out")) return false;
  const panel = contentEl.closest(".work-profile-main-panel") || contentEl;
  const panelTop = panel.getBoundingClientRect().top;
  const targetTop = target.getBoundingClientRect().top;

  const scrollMarginTop = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const desiredScrollTop = panel.scrollTop + (targetTop - panelTop) - scrollMarginTop;
  const maxScrollTop = Math.max(0, panel.scrollHeight - panel.clientHeight);
  const clampedDesiredScrollTop = Math.max(0, Math.min(desiredScrollTop, maxScrollTop));
  return Math.abs(panel.scrollTop - clampedDesiredScrollTop) <= SCROLL_ALIGN_TOLERANCE_PX;
}

/* 목차: 이미 그 위치를 보고 있으면 장르를 제외(선택 삭제), 아니면 표시하고 스크롤. 모바일 배치에서는 제외 없이 표시와 스크롤만 한다 */
function wireGenreSideNav(navEl, stateKey, redraw, contentAreaId, pickedSet) {
  navEl.onclick = e => {
    const btn = e.target.closest(".work-profile-nav-item");
    if (!btn) return;
    const g = btn.dataset.genre;
    const set = st[stateKey];
    const contentEl = contentAreaId ? document.getElementById(contentAreaId) : null;
    const currentTarget = contentEl && contentEl.querySelector('.work-profile-group[data-genre="' + CSS.escape(g) + '"]');
    if (!isMobileLayout() && isSectionScrolledIntoView(currentTarget, contentEl)) {
      set.delete(g);
      if (pickedSet) {
        [...pickedSet].forEach(k => { if (parseKey(k)[0] === g) pickedSet.delete(k); });
        if (pickedSet === st.works) syncGenreFromPicks(g);
      }
      redraw();
      return;
    }
    if (!set.has(g)) set.add(g);
    redraw();
    if (contentEl) {
      const target = contentEl.querySelector('.work-profile-group[data-genre="' + CSS.escape(g) + '"]');
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
}

function applyGenreFilter(cardAreaEl, shownGenres) {
  cardAreaEl.querySelectorAll(".work-profile-group").forEach(sec => {
    const isShown = !!(shownGenres && shownGenres.has(sec.dataset.genre));
    sec.classList.toggle("filtered-out", !isShown);
  });
}

function findEmptyShownGenre(shownGenres, pickedSet) {
  for (const g of shownGenres) {
    let count = 0;
    pickedSet.forEach(k => { if (parseKey(k)[0] === g) count++; });
    if (count === 0) return g;
  }
  return null;
}

/* 2단계 선택에 맞춰 1단계 장르 선택을 갱신 (항목이 하나도 없으면 장르도 해제) */
function syncGenreFromPicks(g) {

  if (g === ETC_GENRE) return;
  let hasAny = false;
  st.works.forEach(k => { if (parseKey(k)[0] === g) hasAny = true; });
  if (hasAny) st.genres.add(g); else st.genres.delete(g);
}

/* 항목 클릭, 스페이스/엔터 선택. 다시 그린 뒤에도 같은 항목에 포커스를 돌려준다 */
function wireOptions(container, pickedSet, otherOpen, onChange) {
  container.querySelectorAll(".work-profile-option").forEach(opt => {

    opt.onkeydown = e => {
      if (e.target !== opt || (e.key !== " " && e.key !== "Enter")) return;
      e.preventDefault();
      const key = opt.dataset.k;
      opt.click();
      const again = container.querySelector('[data-k="' + CSS.escape(key) + '"]');
      if (again) again.focus();
    };
    opt.onclick = () => {
      const k = opt.dataset.k;
      const p = parseKey(k);
      if (p[1] === "기타") {
        otherOpen[p[0]] = true;
        onChange();
        return;
      }

      for (const g in otherOpen) delete otherOpen[g];
      const wasSelected = pickedSet.has(k);
      wasSelected ? pickedSet.delete(k) : pickedSet.add(k);
      if (pickedSet === st.works) {
        syncGenreFromPicks(p[0]);
      }
      onChange();
    };
  });
}

/* "기타" 직접 입력: 엔터로 항목을 추가하고 선택한다 */
function wireOtherInputs(container, otherText, otherOpen, pickedSet, customStore, onCommit) {
  container.querySelectorAll(".work-profile-option-input").forEach(input => {
    input.onclick = e => e.stopPropagation();
    input.oninput = () => {
      const genre = parseKey(input.dataset.k)[0];
      otherText[genre] = input.value;
    };
    input.onkeydown = e => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const genre = parseKey(input.dataset.k)[0];
      const value = cleanCustomName(input.value);
      if (!value) {
        alert("기타 항목을 입력해 주세요.");
        input.focus();
        return;
      }
      const list = customStore[genre] || (customStore[genre] = []);
      if (!dataItemExists(genre, value) && list.indexOf(value) === -1) list.push(value);
      pickedSet.delete(key(genre, "기타"));
      pickedSet.add(key(genre, value));
      otherText[genre] = "";
      delete otherOpen[genre];
      if (pickedSet === st.works) {
        syncGenreFromPicks(genre);
      }
      if (onCommit) onCommit();
    };
  });
  const firstOpenInput = container.querySelector(".work-profile-option-input");
  if (firstOpenInput) firstOpenInput.focus();
}

function wireMainBadges(container) {
  container.querySelectorAll(".work-profile-position-badge-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      st.mainKey = btn.dataset.mk;
      drawWorksStep();
    };
  });
}

/* 주포지션: 지정한 항목, 없으면 가장 먼저 고른 항목 */
function getMainKey() {
  if (st.mainKey && st.works.has(st.mainKey)) return st.mainKey;
  return st.works.size ? [...st.works][0] : null;
}

function positionLabel(k, clickable) {
  if (!st.works.has(k)) return "";
  const isMain = k === getMainKey();

  const cls = "work-profile-position-badge " + (isMain ? "main" : "sub");
  const text = isMain ? "주포지션" : "보조포지션";
  if (!isMain && clickable) {
    return '<button type="button" class="' + cls + ' work-profile-position-badge-btn" data-mk="' + k + '" title="주포지션으로 지정">' + text + '</button>';
  }
  return '<span class="' + cls + '">' + text + '</span>';
}

/* 2단계: 내가 하는 일 */
function drawWorksStep() {

  const genreScope = activeGenres();

  st.genres.forEach(g => {
    if (!st.worksShownSeeded.has(g)) {
      st.worksShownSeeded.add(g);
      st.worksShownGenres.add(g);
    }
  });
  drawChipRow(document.getElementById("work-profile-works-stage-filter"), stageOptionsFor(genreScope, true), st.worksStageFilter, drawWorksStep,
    stage => stageBadgeInfo(st.works, genreScope, stage));

  const q = st.worksQuery.trim();
  const cards = collectCards(genreScope, st.worksStageFilter, q, null, false, st.worksCustomItems);
  const el = document.getElementById("work-profile-works-area");
  renderCards(el, cards, st.works, q ? '"' + q + '"에 해당하는 항목이 없습니다.' : '해당하는 항목이 없습니다.', true, st.worksOtherText, st.worksOtherOpen);
  applyGenreFilter(el, st.worksShownGenres);

  const navEl = document.getElementById("work-profile-works-nav");
  renderGenreSideNav(navEl, genreScope, st.works, st.genres, st.worksShownGenres);

  wireGenreSideNav(navEl, "worksShownGenres", () => {
    drawWorksStep();
    document.getElementById("work-profile-next").disabled = !st.works.size;
  }, "work-profile-works-area", st.works);

  wireOptions(el, st.works, st.worksOtherOpen, () => {
    drawWorksStep();
    document.getElementById("work-profile-next").disabled = !st.works.size;
  });
  wireMainBadges(el);
  wireOtherInputs(el, st.worksOtherText, st.worksOtherOpen, st.works, st.worksCustomItems, drawWorksStep);
}

/* 3단계: 희망 파트너. 2단계에서 고른 항목은 참고 표시 */
function drawWishStep() {
  const genreScope = activeGenres();
  drawChipRow(document.getElementById("work-profile-wish-stage-filter"), stageOptionsFor(genreScope, true), st.wishStageFilter, drawWishStep,
    stage => stageBadgeInfo(st.wishes, genreScope, stage, true));

  const q = st.wishQuery.trim();
  const cards = collectCards(genreScope, st.wishStageFilter, q, st.works, false, [st.worksCustomItems, st.wishCustomItems]);
  const el = document.getElementById("work-profile-wish-area");
  renderCards(el, cards, st.wishes, q ? '"' + q + '"에 해당하는 항목이 없습니다.' : '선택할 수 있는 파트너 유형이 없습니다.', false, st.wishOtherText, st.wishOtherOpen);
  applyGenreFilter(el, st.wishShownGenres);

  const navEl = document.getElementById("work-profile-wish-nav");
  renderGenreSideNav(navEl, genreScope, st.wishes, st.genres, st.wishShownGenres);
  wireGenreSideNav(navEl, "wishShownGenres", drawWishStep, "work-profile-wish-area", st.wishes);

  wireOptions(el, st.wishes, st.wishOtherOpen, () => {
    drawWishStep();
  });
  wireOtherInputs(el, st.wishOtherText, st.wishOtherOpen, st.wishes, st.wishCustomItems, drawWishStep);
}

/* 그래프 분모: 장르의 항목 수(기본 "기타" 제외, 직접 입력 항목 포함) */
function genreItemCount(genre) {
  const d = DATA[genre];
  let n = 0;
  for (const s in d) {
    n += d[s].filter(item => !(s === "기타" && item === "기타")).length;
  }
  n += [...new Set([
    ...customItemsFor(st.worksCustomItems, genre),
    ...customItemsFor(st.wishCustomItems, genre)
  ])].length;
  return n;
}

function computeGenreChartData() {
  const mk = getMainKey();
  const worksGenres = [...st.works].map(k => parseKey(k)[0]);
  const wishGenres = [...st.wishes].map(k => parseKey(k)[0]);
  const chartGenres = [...new Set([...st.genres, ...worksGenres, ...wishGenres])];
  return chartGenres.map(g => {
    let main = 0, sub = 0, wish = 0;
    st.works.forEach(k => {
      if (parseKey(k)[0] !== g) return;
      if (k === mk) main++; else sub++;
    });
    st.wishes.forEach(k => { if (parseKey(k)[0] === g) wish++; });
    return { genre: g, label: gl(g), main: main, sub: sub, wish: wish, denom: genreItemCount(g) };
  });
}

let chartInstance = null;
let mainChartInstance = null;

/* 그래프 색상. work-profile.css 의 --work-profile-chart-* 와 같은 값 */
const CHART_SEG_META = {
  main: { label: "주포지션", color: "#6d28d9", hlBg: "#4c1d95", hlText: "#fff" },
  sub: { label: "보조포지션", color: "#8b5cf6" },
  wish: { label: "희망 포지션", color: "#b6466a" }
};

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
}

function clearChartHighlight() {
  document.querySelectorAll(".work-profile-tag.highlight").forEach(el => {
    el.classList.remove("highlight");
    el.style.borderColor = "";
    el.style.color = "";
    el.style.background = "";
    const em = el.querySelector("em");
    if (em) em.style.color = "";
  });
}

/* 그래프 막대에 마우스를 올리면 요약의 해당 항목을 강조 */
function highlightSummaryFor(genre, type) {
  clearChartHighlight();
  const meta = CHART_SEG_META[type];
  const color = meta.color;
  const bg = meta.hlBg || hexToRgba(color, 0.12);
  const textColor = meta.hlText || color;
  document.querySelectorAll('.work-profile-tag[data-hl-type="' + type + '"]').forEach(el => {
    if (el.dataset.hlGenre !== genre) return;
    el.classList.add("highlight");
    el.style.borderColor = meta.hlBg || color;
    el.style.color = textColor;
    el.style.background = bg;
    const em = el.querySelector("em");
    if (em) em.style.color = textColor;
  });
}

const CHART_LABEL_FONT = "13px 'Pretendard', 'Malgun Gothic', sans-serif";
const CHART_LABEL_LINE_MAX = 7;
const CHART_LABEL_LINE_HEIGHT = 15;
/* 장르명이 7자를 넘으면 최대 2줄로 나누고 넘치면 말줄임 */
function chartLabelLines(text) {
  const chars = Array.from(String(text));
  if (chars.length <= CHART_LABEL_LINE_MAX) return [chars.join("")];
  let cut = CHART_LABEL_LINE_MAX;
  const sp = chars.slice(0, CHART_LABEL_LINE_MAX + 1).lastIndexOf(" ");
  if (sp > 2) cut = sp;
  const first = chars.slice(0, cut).join("").trim();
  const rest = Array.from(chars.slice(cut).join("").trim());
  return [first, rest.length > CHART_LABEL_LINE_MAX ? rest.slice(0, CHART_LABEL_LINE_MAX - 1).join("").trimEnd() + "…" : rest.join("")];
}

/* 막대 오른쪽에도 장르명을 그린다 */
const rightGenreLabelsPlugin = {
  id: "rightGenreLabels",
  afterDraw(chart) {
    const yScale = chart.scales.y;
    if (!yScale) return;
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.font = CHART_LABEL_FONT;
    ctx.fillStyle = "#464C53";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    chart.data.labels.forEach((label, i) => {
      const lines = Array.isArray(label) ? label : [label];
      const top = yScale.getPixelForTick(i) - (lines.length - 1) * CHART_LABEL_LINE_HEIGHT / 2;
      lines.forEach((line, n) => ctx.fillText(line, chartArea.right + 8, top + n * CHART_LABEL_LINE_HEIGHT));
    });
    ctx.restore();
  }
};

/* 스크린리더용: 그래프와 같은 수치의 표를 화면 밖에 둔다 */
function fillChartA11y(wrap, canvas, data) {
  const rows = data.map(d => '<tr><th scope="row">' + escAttr(d.label) + '</th><td>' + d.main + '</td><td>' + d.sub +
    '</td><td>' + d.wish + '</td><td>' + d.denom + '</td></tr>').join("");
  let table = wrap.querySelector(".work-profile-chart-table");
  if (!table) {
    table = document.createElement("table");
    table.className = "work-profile-chart-table sr-only";
    wrap.appendChild(table);
  }
  table.innerHTML = '<caption>장르별 포지션 분포</caption><thead><tr><th scope="col">장르</th><th scope="col">주포지션</th>' +
    '<th scope="col">보조포지션</th><th scope="col">희망 포지션</th><th scope="col">장르 전체 항목 수</th></tr></thead><tbody>' + rows + '</tbody>';
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "장르별 포지션 분포 그래프입니다. 자세한 수치는 이어지는 표를 참고하세요.");
}

/* 장르별 포지션 분포 막대 그래프. 분모는 장르의 전체 항목 수 */
function renderChartInto(wrapId, canvasId, getInstance, setInstance, cardId, enableHover) {
  const wrap = document.getElementById(wrapId);
  const canvas = document.getElementById(canvasId);
  const card = cardId ? document.getElementById(cardId) : null;
  if (!wrap || !canvas) return;

  const existing = getInstance();
  if (existing) {
    existing.destroy();
    setInstance(null);
  }

  const data = computeGenreChartData();
  if (!data.length) {
    canvas.style.display = "none";
    wrap.style.height = "0px";
    if (card) card.classList.remove("active");
    return;
  }
  if (card) card.classList.add("active");
  canvas.style.display = "";
  fillChartA11y(wrap, canvas, data);
  if (typeof Chart === "undefined") { canvas.style.display = "none"; return; }
  canvas.onmouseleave = clearChartHighlight;

  const chartLabels = data.map(d => chartLabelLines(d.label));

  const hasWrapped = chartLabels.some(l => l.length > 1);
  const neededHeight = chartLabels.reduce((sum, l) => sum + l.length * CHART_LABEL_LINE_HEIGHT + 8, 0) + 58;
  wrap.style.height = Math.max(100, data.length * 34, hasWrapped ? neededHeight : 0) + "px";

  const toPct = (val, denom) => (denom > 0 ? (val / denom) * 100 : 0);

  const mainSubMaxPct = data.reduce((max, d) => Math.max(max, toPct(d.main + d.sub, d.denom)), 0);
  const wishMaxPct = data.reduce((max, d) => Math.max(max, toPct(d.wish, d.denom)), 0);
  const chartMax = Math.max(100, Math.ceil(Math.max(mainSubMaxPct, wishMaxPct) / 10) * 10);

  const datasets = ["main", "sub", "wish"].map(key => {
    const meta = CHART_SEG_META[key];
    return {
      label: meta.label,
      backgroundColor: meta.color,
      data: data.map(d => toPct(d[key], d.denom)),

      rawCount: data.map(d => d[key]),
      rawDenom: data.map(d => d.denom),
      borderWidth: 0,

      stack: key === "wish" ? "wish" : "genre",
      xAxisID: key === "wish" ? "x2" : "x",

      grouped: false
    };
  });

  const measureCtx = canvas.getContext("2d");
  measureCtx.font = CHART_LABEL_FONT;
  const maxLabelWidth = chartLabels.reduce((max, lines) => lines.reduce((m, line) => {
    const tm = measureCtx.measureText(line);
    return Math.max(m, tm.width, tm.actualBoundingBoxRight || 0);
  }, max), 0);

  const rightPadding = Math.ceil(maxLabelWidth) + 14;

  setInstance(new Chart(canvas, {
    type: "bar",
    data: { labels: chartLabels, datasets: datasets },
    plugins: [rightGenreLabelsPlugin],
    options: {
      indexAxis: "y",
      layout: { padding: { right: rightPadding } },
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 200 },
      interaction: { mode: "nearest", intersect: true },
      onHover: enableHover ? (evt, elements) => {
        if (!elements.length) { clearChartHighlight(); return; }
        const el = elements[0];
        const type = ["main", "sub", "wish"][el.datasetIndex];
        const genre = data[el.index].genre;
        highlightSummaryFor(genre, type);
      } : undefined,
      scales: {
        x: {
          stacked: true, min: 0, max: chartMax, position: "bottom",
          grid: { color: "#f0f0f0" }, ticks: { callback: v => v + "%" }
        },

        x2: {
          stacked: true, min: 0, max: chartMax, reverse: true, position: "bottom",
          grid: { display: false }, ticks: { display: false }
        },
        y: { stacked: true, grid: { display: false }, ticks: { autoSkip: false, font: { size: 13, family: "'Pretendard', 'Malgun Gothic', sans-serif", lineHeight: CHART_LABEL_LINE_HEIGHT / 13 } } }
      },
      plugins: {

        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => data[items[0].dataIndex].label,
            label: ctx => {
              const ds = ctx.dataset;
              const count = ds.rawCount[ctx.dataIndex];
              const denom = ds.rawDenom[ctx.dataIndex];
              const pct = Math.round(ctx.parsed.x);
              return ds.label + " " + count + "개 / " + denom + "개 중 " + pct + "%";
            }
          }
        }
      }
    }
  }));
}

function drawChart() {
  renderChartInto("work-profile-chart-wrap", "work-profile-chart-canvas",
    () => chartInstance, v => { chartInstance = v; },
    null, true);
}

function drawMainChart() {
  renderChartInto("work-profile-main-chart-wrap", "work-profile-main-chart-canvas",
    () => mainChartInstance, v => { mainChartInstance = v; },
    "work-profile-main-chart-card", true);
}

function sumGroup(label, list, tagFn) {
  if (!list.length) return "";
  return '<div class="work-profile-sum-group"><div class="work-profile-sum-group-label">' + label + '</div><div class="work-profile-tag-row">' +
    list.map(tagFn).join("") + '</div></div>';
}

function summaryLabel(item) {
  const short = item.length > 18 ? item.slice(0, 18) + "..." : item;
  return escAttr(short);
}

function sumSubgroupsByGenre(keys, tagFn) {
  const byGenre = {};
  const order = [];
  keys.forEach(k => {
    const g = parseKey(k)[0];
    if (!byGenre[g]) { byGenre[g] = []; order.push(g); }
    byGenre[g].push(k);
  });
  return order.map(g =>
    '<div class="work-profile-sum-subgroup"><div class="work-profile-sum-subgroup-label">' + glHtml(g) + '</div><div class="work-profile-tag-row">' +
      byGenre[g].map(tagFn).join("") + '</div></div>'
  ).join("");
}

/* 4단계: 요약 3카드와 그래프. 폼 영역의 요약과 그래프도 함께 채운다 */
function drawSummaryStep() {
  clearChartHighlight();
  drawChart();
  drawMainChart();

  const genreTag = g => '<span class="work-profile-tag">' + glHtml(g) + '</span>';
  const worksGenres = [...st.works].map(k => parseKey(k)[0]);
  const activityGenres = [...new Set([...st.genres, ...worksGenres])];
  const wishGenres = [...new Set([...st.wishes].map(k => parseKey(k)[0]))];
  const wishGenreBlock = wishGenres.length
    ? sumGroup("희망", wishGenres, genreTag)
    : '<div class="work-profile-sum-group"><div class="work-profile-sum-group-label">희망</div><span class="work-profile-sum-none">선택하지 않음</span></div>';
  const genreHtml = sumGroup("활동", activityGenres, genreTag) + wishGenreBlock;
  const sumGenreHtml = genreHtml ? '<div class="work-profile-sum-groups">' + genreHtml + '</div>' : '<span class="work-profile-sum-none">없음</span>';
  document.getElementById("work-profile-sum-genre").innerHTML = sumGenreHtml;

  const mainKey = getMainKey();
  const worksKeys = [...st.works];
  const mainKeys = worksKeys.filter(k => k === mainKey);
  const subKeys = worksKeys.filter(k => k !== mainKey);
  const posTag = (cls, withGenre) => k => {
    const p = parseKey(k);
    const hlType = cls === "pos-main" ? "main" : "sub";
    const label = summaryLabel(p[1]);
    const prefix = withGenre ? '<em>' + glHtml(p[0]) + ' · </em>' : "";
    return '<span class="work-profile-tag ' + cls + '" data-hl-genre="' + p[0] + '" data-hl-type="' + hlType + '">' + prefix + label + '</span>';
  };

  const subGroupHtml = subKeys.length
    ? '<div class="work-profile-sum-group"><div class="work-profile-sum-group-label">보조포지션</div>' + sumSubgroupsByGenre(subKeys, posTag("pos-sub", false)) + '</div>'
    : "";
  const catHtml = sumGroup("주포지션", mainKeys, posTag("pos-main", true)) + subGroupHtml;
  const sumWorksHtml = catHtml ? '<div class="work-profile-sum-groups">' + catHtml + '</div>' : '<span class="work-profile-sum-none">없음</span>';
  document.getElementById("work-profile-sum-works").innerHTML = sumWorksHtml;

  const wishKeys = [...st.wishes];
  const wishTag = k => {
    const p = parseKey(k);
    const label = summaryLabel(p[1]);
    return '<span class="work-profile-tag" data-hl-genre="' + p[0] + '" data-hl-type="wish">' + label + '</span>';
  };
  const wishHtml = sumSubgroupsByGenre(wishKeys, wishTag);
  const sumWishHtml = wishHtml ? '<div class="work-profile-sum-groups"><div class="work-profile-sum-group">' + wishHtml + '</div></div>' : '<span class="work-profile-sum-none">선택하지 않음</span>';
  document.getElementById("work-profile-sum-wish").innerHTML = sumWishHtml;

  const mainSumGenre = document.getElementById("work-profile-main-sum-genre");
  const mainSumWorks = document.getElementById("work-profile-main-sum-works");
  const mainSumWish = document.getElementById("work-profile-main-sum-wish");
  const mainSumGrid = document.getElementById("work-profile-main-sum-grid");
  if (mainSumGenre) mainSumGenre.innerHTML = sumGenreHtml;
  if (mainSumWorks) mainSumWorks.innerHTML = sumWorksHtml;
  if (mainSumWish) mainSumWish.innerHTML = sumWishHtml;
  if (mainSumGrid) mainSumGrid.classList.add("active");
}

function wireSearchBox(boxId, inputId, clearId, onChange) {
  const box = document.getElementById(boxId);
  const input = document.getElementById(inputId);
  const clearBtn = document.getElementById(clearId);
  input.oninput = () => {
    box.classList.toggle("has-val", !!input.value);
    onChange(input.value);
  };
  clearBtn.onclick = () => {
    input.value = "";
    box.classList.remove("has-val");
    onChange("");
    input.focus();
  };
}

/* 처음부터 다시 */
function resetAll() {
  st.step = 1;
  st.completed = false;
  st.genres.clear(); st.works.clear(); st.wishes.clear();
  st.worksStageFilter.clear(); st.wishStageFilter.clear();
  st.worksQuery = ""; st.wishQuery = "";
  st.worksOtherText = {}; st.wishOtherText = {};
  st.worksOtherOpen = {}; st.wishOtherOpen = {};
  st.worksCustomItems = {}; st.wishCustomItems = {};
  st.mainKey = null;
  st.etcGenreName = "";
  st.etcGenreDraft = "";
  st.worksShownGenres = new Set(); st.wishShownGenres = new Set(); st.worksShownSeeded = new Set();
  document.getElementById("work-profile-works-search").value = "";
  document.getElementById("work-profile-works-search-box").classList.remove("has-val");
  document.getElementById("work-profile-wish-search").value = "";
  document.getElementById("work-profile-wish-search-box").classList.remove("has-val");
}

document.getElementById("work-profile-next").onclick = () => {
  if (st.step === 2) {
    const g = findEmptyShownGenre(st.worksShownGenres, st.works);
    if (g) { alert(gl(g) + " 장르에서 항목을 선택해 주세요."); return; }
  }
  if (st.step === 4) resetAll(); else st.step++;
  render();
};
document.getElementById("work-profile-back").onclick = () => { st.completed = false; st.step--; render(); };
document.querySelectorAll(".work-profile-sum-edit").forEach(el => {
  el.onclick = () => { st.completed = false; st.step = +el.dataset.go; render(); };
});

/* 확인 버튼: 선택을 유지한 채 모달만 닫는다 */
function closeModal() {
  if (typeof krds_modal !== "undefined") { krds_modal.closeModal("work-profile-modal"); return; }
  const modal = document.getElementById("work-profile-modal");
  modal.classList.remove("in", "shown");
}
document.getElementById("work-profile-confirm").onclick = closeModal;

wireSearchBox("work-profile-works-search-box", "work-profile-works-search", "work-profile-works-search-clear", v => { st.worksQuery = v; drawWorksStep(); });
wireSearchBox("work-profile-wish-search-box", "work-profile-wish-search", "work-profile-wish-search-clear", v => { st.wishQuery = v; drawWishStep(); });

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (st.step === 2) drawWorksStep();
    if (st.step === 3) drawWishStep();
  }, 150);
});

render();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
