(() => {
  const { SUPABASE_URL, SUPABASE_KEY, DISCORD_URL, RELEASE_DATE } = window.WF_CONFIG;
  const D = window.WF_DATA;
  const I = window.WF_I18N;
  const t = I.t;
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Supabase (REST, ingen klientbibliotek behövs) ----------
  async function rpc(fn, args) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Content-Profile': 'wowforever',
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`rpc ${fn}: ${res.status}`);
    return res.json();
  }

  async function fetchRoster() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/public_roster?select=*&order=created_at.desc`, {
      headers: { apikey: SUPABASE_KEY, 'Accept-Profile': 'wowforever' },
    });
    if (!res.ok) throw new Error(`roster: ${res.status}`);
    return res.json();
  }

  // ---------- Bildutsnitt (CSS-sprites ur de uppladdade bilderna) ----------
  const sheetDims = {};
  function loadSheets() {
    return Promise.all(Object.entries(D.sheets).map(([key, s]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { sheetDims[key] = [img.naturalWidth, img.naturalHeight]; resolve(); };
      img.onerror = () => resolve();
      img.src = s.src;
    })));
  }

  function sprite(kind, key, px, extraClass = '') {
    const c = D.crops[kind]?.[key];
    if (!c || !sheetDims[c.sheet]) return `<span class="sprite ph ${extraClass}" style="width:${px}px;height:${px}px"></span>`;
    const [nw, nh] = sheetDims[c.sheet];
    const [rw, rh] = D.sheets[c.sheet].ref;
    if (extraClass.includes('fluid')) {
      // Skalar med behållaren (upp till px), så bilden växer med knappen.
      const style = [
        'width:100%', `max-width:${px}px`, `aspect-ratio:${c.w}/${c.h}`,
        `background-image:url(${D.sheets[c.sheet].src})`,
        `background-size:${(rw / c.w) * 100}% ${(rh / c.h) * 100}%`,
        `background-position:${rw > c.w ? (c.x / (rw - c.w)) * 100 : 0}% ${rh > c.h ? (c.y / (rh - c.h)) * 100 : 0}%`,
      ].join(';');
      return `<span class="sprite ${extraClass}" style="${style}" role="img" aria-label="${esc(key)}"></span>`;
    }
    const sx = nw / rw, sy = nh / rh;
    const scale = px / (c.w * sx);
    const style = [
      `width:${px}px`, `height:${px}px`,
      `background-image:url(${D.sheets[c.sheet].src})`,
      `background-size:${nw * scale}px ${nh * scale}px`,
      `background-position:${-c.x * sx * scale}px ${-c.y * sy * scale}px`,
    ].join(';');
    return `<span class="sprite ${extraClass}" style="${style}" role="img" aria-label="${esc(key)}"></span>`;
  }

  // ---------- Formulärets tillstånd ----------
  const emptyChar = () => ({
    name: '', faction: '', race: '', class: '', gender: 'Male', ruleset: 'Normal',
    prof1: '', prof2: '', secondary: [], roles: [],
  });
  let chars = [emptyChar()];
  let editToken = null;

  const TOKEN_KEY = 'wf_edit_token';
  const store = {
    get() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
    set(v) { try { localStorage.setItem(TOKEN_KEY, v); } catch { /* ignoreras */ } },
    del() { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignoreras */ } },
  };

  const profOptions = (selected) =>
    `<option value="">${t('none')}</option>` +
    D.professions.map((p) => `<option${p === selected ? ' selected' : ''}>${p}</option>`).join('');

  const genderLabel = (g) => t(g === 'Female' ? 'female' : 'male');

  function genderButton(i, g, ch) {
    const on = ch.gender === g;
    return `<div class="opt"><span class="lbl">${genderLabel(g)}</span>
      <button type="button" class="pick gender ${g.toLowerCase()}${on ? ' on' : ''}" data-act="gender" data-i="${i}" data-gender="${g}"
      title="${genderLabel(g)}" aria-label="${genderLabel(g)}" aria-pressed="${on}">${sprite('gender', g, 200, 'fluid')}</button></div>`;
  }

  function raceButton(i, r, ch) {
    const on = ch.faction === r.faction && ch.race === r.race;
    return `<div class="opt"><span class="lbl">${esc(r.race)}</span>
      <button type="button" class="pick race${on ? ' on' : ''}" data-act="race" data-i="${i}" data-faction="${r.faction}" data-race="${esc(r.race)}"
      title="${esc(r.race)}" aria-label="${esc(r.race)}" aria-pressed="${on}">${sprite('race', D.raceKey(r.faction, r.race, ch.gender), 200, 'fluid')}</button></div>`;
  }

  function classButton(i, cls, ch) {
    const race = D.findRace(ch.faction, ch.race);
    const allowed = race ? race.classes.includes(cls) : false;
    const on = ch.class === cls;
    return `<div class="opt${allowed ? '' : ' off'}"><span class="lbl">${cls}</span>
      <button type="button" class="pick cls${on ? ' on' : ''}" data-act="class" data-i="${i}" data-class="${cls}"
      ${allowed ? '' : 'disabled'} title="${cls}" aria-label="${cls}" aria-pressed="${on}">${sprite('class', cls, 200, 'fluid')}</button></div>`;
  }

  function rulesetButton(i, rs, ch) {
    const off = D.unavailableRulesets.includes(rs);
    const on = ch.ruleset === rs && !off;
    const title = off ? `${t('rs_' + rs)} ${t('notAtLaunch')}` : t('rs_' + rs);
    return `<div class="opt${off ? ' off' : ''}" title="${esc(title)}"><span class="lbl">${rs}</span>
      <button type="button" class="pick rs${on ? ' on' : ''}" data-act="ruleset" data-i="${i}" data-ruleset="${rs}"
      title="${esc(title)}" aria-label="${rs}" ${off ? 'disabled' : ''} aria-pressed="${on}">${sprite('ruleset', rs, 200, 'fluid')}</button></div>`;
  }

  function renderEditors() {
    const host = $('#charEditors');
    host.innerHTML = chars.map((ch, i) => {
      const raceGroup = (faction) => `<div class="race-group ${faction.toLowerCase()}"><h4>${faction}</h4>
        <div class="picks races-row">${D.races.filter((r) => r.faction === faction).map((r) => raceButton(i, r, ch)).join('')}</div></div>`;
      return `<fieldset class="char" data-i="${i}">
        <legend>${t('character')} ${i + 1}</legend>
        <label class="field">
          <span>${t('charName')}</span>
          <input data-f="name" data-i="${i}" maxlength="24" value="${esc(ch.name)}" required>
        </label>

        <div class="group-label">${t('gender')}</div>
        <div class="picks genders">${D.genders.map((g) => genderButton(i, g, ch)).join('')}</div>

        <div class="group-label">${t('race')}</div>
        <div class="race-groups">${raceGroup('Alliance')}${raceGroup('Horde')}</div>

        <div class="group-label">${t('cls')}${ch.class ? `: <b class="picked">${ch.class}</b>` : ''} ${ch.race ? '' : `<em>${t('pickRaceFirst')}</em>`}</div>
        <div class="picks classes">${D.classes.map((c) => classButton(i, c, ch)).join('')}</div>

        <div class="group-label">${t('serverType')}</div>
        <div class="picks rulesets">${D.rulesets.map((rs) => rulesetButton(i, rs, ch)).join('')}</div>

        <div class="field-row">
          <label class="field"><span>${t('prof1')}</span><select data-f="prof1" data-i="${i}">${profOptions(ch.prof1)}</select></label>
          <label class="field"><span>${t('prof2')}</span><select data-f="prof2" data-i="${i}">${profOptions(ch.prof2)}</select></label>
        </div>

        <div class="group-label">${t('roles')} <em>${t('rolesNote')}</em></div>
        <div class="secondary">${D.roles.map((r) =>
          `<label class="tick"><input type="checkbox" data-f="roles" data-i="${i}" value="${r}"${ch.roles.includes(r) ? ' checked' : ''}> ${r}</label>`).join('')}</div>

        <div class="group-label">${t('secondary')}</div>
        <div class="secondary">${D.secondaryProfessions.map((s) =>
          `<label class="tick"><input type="checkbox" data-f="secondary" data-i="${i}" value="${s}"${ch.secondary.includes(s) ? ' checked' : ''}> ${s}</label>`).join('')}</div>

        ${chars.length > 1 ? `<button type="button" class="btn small danger" data-act="remove" data-i="${i}">${t('removeChar', { n: i + 1 })}</button>` : ''}
      </fieldset>`;
    }).join('');
  }

  function bindEditors() {
    const host = $('#charEditors');

    host.addEventListener('input', (e) => {
      const el = e.target;
      const i = Number(el.dataset.i);
      if (!chars[i] || !el.dataset.f) return;
      if (el.dataset.f === 'secondary' || el.dataset.f === 'roles') return;
      chars[i][el.dataset.f] = el.value;
    });

    host.addEventListener('change', (e) => {
      const el = e.target;
      const i = Number(el.dataset.i);
      if (!chars[i]) return;
      if (el.dataset.f === 'secondary' || el.dataset.f === 'roles') {
        const key = el.dataset.f;
        const set = new Set(chars[i][key]);
        if (el.checked) set.add(el.value); else set.delete(el.value);
        chars[i][key] = [...set];
      }
    });

    host.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const i = Number(btn.dataset.i);
      const ch = chars[i];
      if (!ch) return;
      switch (btn.dataset.act) {
        case 'gender': ch.gender = btn.dataset.gender; break;
        case 'race': {
          ch.faction = btn.dataset.faction;
          ch.race = btn.dataset.race;
          const race = D.findRace(ch.faction, ch.race);
          if (race && !race.classes.includes(ch.class)) ch.class = '';
          break;
        }
        case 'class': ch.class = btn.dataset.class; break;
        case 'ruleset': ch.ruleset = btn.dataset.ruleset; break;
        case 'remove': chars.splice(i, 1); break;
        default: return;
      }
      renderEditors();
    });
  }

  // ---------- Validering och skickande ----------
  function showError(msg) {
    const el = $('#formError');
    el.textContent = msg;
    el.hidden = !msg;
  }

  function validate() {
    if (!$('#displayName').value.trim()) return t('errName');
    for (const [i, ch] of chars.entries()) {
      const n = i + 1;
      if (!ch.name.trim()) return t('errCharName', { n });
      if (!ch.race) return t('errRace', { n });
      if (!ch.class) return t('errClass', { n });
      if (ch.prof1 && ch.prof1 === ch.prof2) return t('errProf', { n });
    }
    return '';
  }

  const payloadChars = () => chars.map((c) => ({
    id: c.id, name: c.name.trim(), faction: c.faction, race: c.race, class: c.class, gender: c.gender, ruleset: c.ruleset,
    prof1: c.prof1, prof2: c.prof2, secondary: c.secondary, roles: c.roles,
  }));

  const editLink = (token) => `${location.origin}${location.pathname}?edit=${token}`;

  function discordButton() {
    return DISCORD_URL
      ? `<a class="btn discord" href="${esc(DISCORD_URL)}" target="_blank" rel="noopener">${t('discord')}</a>`
      : '';
  }

  async function onSubmit(e) {
    e.preventDefault();
    if ($('#website').value) return; // honeypot
    const err = validate();
    showError(err);
    if (err) return;

    const btn = $('#submitBtn');
    btn.disabled = true;
    try {
      const displayName = $('#displayName').value.trim();
      const contact = $('#contact').value.trim();
      if (editToken) {
        const ok = await rpc('save_mine', {
          p_token: editToken, p_display_name: displayName, p_contact: contact, p_characters: payloadChars(),
        });
        if (!ok) throw new Error('Ogiltig länk');
        $('#success').hidden = false;
        $('#success').innerHTML = t('saved');
      } else {
        const token = await rpc('register', {
          p_display_name: displayName, p_contact: contact, p_characters: payloadChars(),
        });
        editToken = token;
        store.set(token);
        const link = editLink(token);
        $('#success').hidden = false;
        $('#success').innerHTML = `${t('welcome')}
          <p>${t('keepLink')}</p>
          <div class="linkbox"><input readonly id="editLinkInput" value="${esc(link)}"><button type="button" class="btn small" id="copyLink">${t('copy')}</button></div>
          <div class="actions">${discordButton()}</div>`;
        setEditMode(true);
      }
      await refreshOwnChars();
      $('#success').scrollIntoView({ behavior: 'smooth', block: 'center' });
      await refreshRoster();
    } catch (ex) {
      console.error(ex);
      showError(t('errGeneric'));
    } finally {
      btn.disabled = false;
    }
  }

  async function onDelete() {
    if (!editToken || !confirm(t('confirmDelete'))) return;
    try {
      await rpc('delete_mine', { p_token: editToken });
      editToken = null;
      store.del();
      chars = [emptyChar()];
      $('#displayName').value = '';
      $('#contact').value = '';
      setEditMode(false);
      renderEditors();
      $('#success').hidden = false;
      $('#success').textContent = t('deleted');
      await refreshRoster();
    } catch (ex) {
      console.error(ex);
      showError(t('errDelete'));
    }
  }

  function setEditMode(on) {
    $('#deleteBtn').hidden = !on;
    $('#submitBtn').textContent = t(on ? 'save' : 'submit');
    $('#formTitle').textContent = t(on ? 'formTitleEdit' : 'formTitle');
    $('#editBanner').hidden = !on;
    $('#formTitle').dataset.i18n = on ? 'formTitleEdit' : 'formTitle';
    $('#submitBtn').dataset.i18n = on ? 'save' : 'submit';
  }

  // Hämtar egna karaktärer igen så att de nya id:na finns med nästa gång man sparar.
  async function refreshOwnChars() {
    try {
      const mine = await rpc('get_mine', { p_token: editToken });
      if (!mine) return;
      chars = (mine.characters || []).map((c) => ({
        ...emptyChar(), ...c, gender: c.gender || 'Male', prof1: c.prof1 || '', prof2: c.prof2 || '',
        roles: c.roles || [], secondary: c.secondary || [],
      }));
      if (!chars.length) chars = [emptyChar()];
      renderEditors();
    } catch (ex) {
      console.error(ex);
    }
  }

  async function loadOwn() {
    const params = new URLSearchParams(location.search);
    const token = params.get('edit') || store.get();
    if (!token) return;
    try {
      const mine = await rpc('get_mine', { p_token: token });
      if (!mine) { if (!params.get('edit')) store.del(); return; }
      editToken = token;
      store.set(token);
      if (params.get('edit')) window.WF_TABS?.show('skriv-upp-dig', { scroll: false });
      $('#displayName').value = mine.display_name || '';
      $('#contact').value = mine.contact || '';
      chars = (mine.characters || []).map((c) => ({
        ...emptyChar(), ...c, gender: c.gender || 'Male', prof1: c.prof1 || '', prof2: c.prof2 || '',
        roles: c.roles || [], secondary: c.secondary || [],
      }));
      if (!chars.length) chars = [emptyChar()];
      setEditMode(true);
      renderEditors();
    } catch (ex) {
      console.error(ex);
    }
  }

  // ---------- Lista och sammanfattning ----------
  let roster = [];

  async function refreshRoster() {
    try {
      roster = await fetchRoster();
    } catch (ex) {
      console.error(ex);
      $('#cards').innerHTML = `<p class="muted">${t('rosterFail')}</p>`;
      return;
    }
    renderRoster();
    renderSummary();
  }

  const groupsFor = (c) => (window.WF_GROUPS ? window.WF_GROUPS.forChar(c) : []);

  function fillGroupFilter() {
    const sel = $('#fGroup');
    const keep = sel.value;
    sel.querySelectorAll('option:not([value=""])').forEach((o) => o.remove());
    const list = window.WF_GROUPS ? window.WF_GROUPS.list() : [];
    sel.insertAdjacentHTML('beforeend', `<option value="none">${esc(t('noGroup'))}</option>` + list.map((g) => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join(''));
    sel.value = [...sel.options].some((o) => o.value === keep) ? keep : '';
  }

  function renderRoster() {
    const f = {
      faction: $('#fFaction').value, cls: $('#fClass').value,
      prof: $('#fProf').value, rs: $('#fRuleset').value, group: $('#fGroup').value,
    };
    const active = Object.values(f).filter(Boolean).length;
    $('#rFilterCount').textContent = String(active);
    $('#rFilterCount').hidden = !active;
    const rows = roster.filter((c) =>
      (!f.faction || c.faction === f.faction) &&
      (!f.cls || c.class === f.cls) &&
      (!f.prof || c.prof1 === f.prof || c.prof2 === f.prof) &&
      (!f.rs || c.ruleset === f.rs) &&
      (!f.group || (f.group === 'none' ? !groupsFor(c).length : groupsFor(c).some((x) => x.id === f.group))));

    $('#rosterEmpty').hidden = rows.length > 0;
    $('#rosterEmpty').textContent = t(roster.length ? 'noMatch' : 'rosterEmpty');
    $('#cards').innerHTML = rows.map((c) => {
      const profs = [c.prof1, c.prof2].filter(Boolean);
      return `<article class="card ${c.faction.toLowerCase()}">
        ${sprite('race', D.raceKey(c.faction, c.race, c.gender), 64, 'portrait')}
        <div class="body">
          <h3>${esc(c.name)}</h3>
          <p class="sub">${sprite('class', c.class, 20, 'inline')} ${esc(c.race)} ${esc(c.class)}${(c.roles || []).length ? ` · ${c.roles.map(esc).join('/')}` : ''}</p>
          <p class="profs">${profs.map((p) => `<span class="tag">${sprite('prof', p, 16, 'inline')} ${esc(p)}</span>`).join('')}${(c.secondary || []).map((p) => `<span class="tag dim">${sprite('prof', p, 16, 'inline')} ${esc(p)}</span>`).join('')}</p>
          ${groupsFor(c).length ? `<p class="cgroups">${groupsFor(c).map((x) => `<span class="tag grp">${esc(x.name)}</span>`).join('')}</p>` : ''}
          <p class="owner">${t('player')}: ${esc(c.player_name)}${c.ruleset !== 'Normal' ? ` · ${sprite('ruleset', c.ruleset, 16, 'inline')} ${esc(c.ruleset)}` : ''}</p>
        </div>
      </article>`;
    }).join('');
  }

  function factionSummary(faction) {
    const rows = roster.filter((c) => c.faction === faction);
    const players = new Set(rows.map((c) => c.player_name)).size;
    const byClass = Object.fromEntries(D.classes.map((c) => [c, 0]));
    const byRole = { Tank: 0, Healer: 0, DPS: 0 };
    const byProf = Object.fromEntries(D.professions.map((p) => [p, 0]));
    const bySec = Object.fromEntries(D.secondaryProfessions.map((p) => [p, 0]));
    rows.forEach((c) => {
      byClass[c.class] = (byClass[c.class] || 0) + 1;
      (c.roles || []).forEach((r) => { byRole[r] += 1; });
      [c.prof1, c.prof2].filter(Boolean).forEach((p) => { byProf[p] = (byProf[p] || 0) + 1; });
      (c.secondary || []).forEach((p) => { bySec[p] = (bySec[p] || 0) + 1; });
    });
    const profTile = (name, n) => `<div class="pc${n ? '' : ' zero'}">${sprite('prof', name, 24)}<b>${n}</b><span>${name}</span></div>`;
    const counts = t('sumCounts', {
      p: players, pw: t(players === 1 ? 'playerOne' : 'playerMany'),
      c: rows.length, cw: t(rows.length === 1 ? 'charOne' : 'charMany'),
    });
    return `<div class="fsum ${faction.toLowerCase()}">
      <h3>${faction}</h3>
      <p class="muted">${counts}</p>
      <div class="classcount">${D.classes.map((c) => `<div class="cc${byClass[c] ? '' : ' zero'}">${sprite('class', c, 32)}<b>${byClass[c]}</b><span>${c}</span></div>`).join('')}</div>
      <p class="roles">${Object.entries(byRole).map(([r, n]) => `<span class="tag${n ? '' : ' warn'}">${r}: ${n}</span>`).join('')}</p>
      <div class="profcount">${D.professions.map((p) => profTile(p, byProf[p])).join('')}</div>
      <div class="profcount sec">${D.secondaryProfessions.map((p) => profTile(p, bySec[p])).join('')}</div>
    </div>`;
  }

  function renderSummary() {
    $('#summary').innerHTML = `<h2>${t('sumTitle')}</h2>
      <div class="factions">${factionSummary('Alliance')}${factionSummary('Horde')}</div>`;
  }

  function fillFilters() {
    const keep = ['#fClass', '#fProf', '#fRuleset'].map((s) => $(s).value);
    ['#fClass', '#fProf', '#fRuleset'].forEach((s) => { $(s).querySelectorAll('option:not([value=""])').forEach((o) => o.remove()); });
    $('#fClass').insertAdjacentHTML('beforeend', D.classes.map((c) => `<option>${c}</option>`).join(''));
    $('#fProf').insertAdjacentHTML('beforeend', D.professions.map((p) => `<option>${p}</option>`).join(''));
    $('#fRuleset').insertAdjacentHTML('beforeend', D.rulesets.filter((r) => !D.unavailableRulesets.includes(r)).map((r) => `<option>${r}</option>`).join(''));
    ['#fClass', '#fProf', '#fRuleset'].forEach((s, n) => { $(s).value = keep[n]; });
  }

  // ---------- Feedback ----------
  function bindFeedback() {
    const dlg = $('#fbDialog');
    const err = $('#fbError');
    const done = $('#fbDone');
    const open = () => {
      err.hidden = true; done.hidden = true;
      $('#fbFields').hidden = false;
      $('#fbSend').hidden = false;
      $('#fbMessage').value = '';
      $('#fbCancel').textContent = t('fbCancel');
      dlg.showModal();
      $('#fbMessage').focus();
    };
    $('#fbOpen').addEventListener('click', open);
    $('#fbCancel').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

    $('#fbForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      if ($('#fbWebsite').value) return;
      const message = $('#fbMessage').value.trim();
      if (!message) { err.textContent = t('fbEmpty'); err.hidden = false; return; }
      const btn = $('#fbSend');
      btn.disabled = true;
      try {
        await rpc('submit_feedback', { p_message: message, p_contact: $('#fbContactInput').value.trim(), p_lang: I.lang });
        err.hidden = true;
        loadFeedbackBadge();
        $('#fbFields').hidden = true;
        btn.hidden = true;
        done.textContent = t('fbThanks');
        done.hidden = false;
        $('#fbCancel').textContent = I.lang === 'sv' ? 'Stäng' : 'Close';
      } catch (ex) {
        console.error(ex);
        err.textContent = t('fbError');
        err.hidden = false;
      } finally {
        btn.disabled = false;
      }
    });
  }

  // ---------- Feedback-räknare (antal obehandlade, visas för alla) ----------
  async function loadFeedbackBadge() {
    try {
      const n = await rpc('feedback_unread_count', {});
      const badge = $('#fbBadge');
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.hidden = !n;
    } catch (ex) {
      console.error(ex);
    }
  }

  // ---------- Övrigt ----------
  function countdown() {
    const days = Math.ceil((new Date(`${RELEASE_DATE}T00:00:00`) - new Date()) / 86400000);
    const el = $('#countdown');
    if (days > 1) el.textContent = t('cdDays', { n: days });
    else if (days === 1) el.textContent = t('cdTomorrow');
    else el.textContent = t('cdLive');
  }

  function rerender() {
    countdown();
    fillFilters();
    fillGroupFilter();
    renderEditors();
    renderRoster();
    renderSummary();
    setEditMode(Boolean(editToken));
    $('#fbCancel').textContent = t('fbCancel');
    showError('');
  }

  // Delas med groups.js
  let markReady;
  const ready = new Promise((r) => { markReady = r; });
  window.WF_APP = {
    rpc, sprite, esc, ready, getRoster: () => roster,
    refreshRosterGroups: () => { fillGroupFilter(); renderRoster(); },
    getMine: () => (editToken ? { token: editToken, name: $('#displayName').value.trim(), contact: $('#contact').value.trim(), chars: chars.map((c) => ({ ...c })) } : null),
  };

  async function init() {
    I.applyStatic();
    countdown();
    if (DISCORD_URL) {
      const b = $('#discordBtn');
      b.href = DISCORD_URL;
      b.hidden = false;
    }
    fillFilters();
    await loadSheets();
    markReady();
    renderEditors();
    bindEditors();
    bindFeedback();
    ['#fFaction', '#fClass', '#fProf', '#fRuleset', '#fGroup'].forEach((s) => $(s).addEventListener('change', renderRoster));
    $('#rFilterToggle').addEventListener('click', () => {
      const box = $('#rFilters');
      box.hidden = !box.hidden;
      $('#rFilterToggle').setAttribute('aria-expanded', String(!box.hidden));
    });
    $('#addChar').addEventListener('click', () => { chars.push(emptyChar()); renderEditors(); });
    $('#regForm').addEventListener('submit', onSubmit);
    $('#deleteBtn').addEventListener('click', onDelete);
    document.addEventListener('click', (e) => {
      if (e.target.id === 'copyLink') {
        const input = $('#editLinkInput');
        input.select();
        navigator.clipboard?.writeText(input.value);
        e.target.textContent = t('copied');
      }
    });
    I.onChange(rerender);
    await Promise.all([loadOwn(), refreshRoster(), loadFeedbackBadge()]);
  }

  init();
})();
