(() => {
  const { SUPABASE_URL, SUPABASE_KEY, DISCORD_URL, RELEASE_DATE } = window.WF_CONFIG;
  const D = window.WF_DATA;
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
        `background-position:${(c.x / (rw - c.w)) * 100}% ${(c.y / (rh - c.h)) * 100}%`,
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
    name: '', faction: '', race: '', class: '', ruleset: 'Normal',
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
    `<option value="">Inget</option>` +
    D.professions.map((p) => `<option${p === selected ? ' selected' : ''}>${p}</option>`).join('');

  function raceButton(i, r, ch) {
    const on = ch.faction === r.faction && ch.race === r.race;
    return `<button type="button" class="pick race ${r.faction.toLowerCase()}${on ? ' on' : ''}"
      data-act="race" data-i="${i}" data-faction="${r.faction}" data-race="${esc(r.race)}" aria-pressed="${on}">
      ${sprite('race', D.raceKey(r.faction, r.race), 56)}<span>${esc(r.race)}</span></button>`;
  }

  function classButton(i, cls, ch) {
    const race = D.findRace(ch.faction, ch.race);
    const allowed = race ? race.classes.includes(cls) : false;
    const on = ch.class === cls;
    return `<div class="opt${allowed ? "" : " off"}"><span class="lbl">${cls}</span>
      <button type="button" class="pick cls${on ? " on" : ""}" data-act="class" data-i="${i}" data-class="${cls}"
      ${allowed ? "" : "disabled"} title="${cls}" aria-label="${cls}" aria-pressed="${on}">${sprite("class", cls, 200, "fluid")}</button></div>`;
  }

  function rulesetButton(i, rs, ch) {
    const off = D.unavailableRulesets.includes(rs);
    const on = ch.ruleset === rs && !off;
    const title = off ? `${D.rulesetInfo[rs]} Finns inte vid launch.` : D.rulesetInfo[rs];
    return `<div class="opt${off ? " off" : ""}" title="${esc(title)}"><span class="lbl">${rs}</span>
      <button type="button" class="pick rs${on ? " on" : ""}" data-act="ruleset" data-i="${i}" data-ruleset="${rs}"
      title="${esc(title)}" aria-label="${rs}" ${off ? "disabled" : ""} aria-pressed="${on}">${sprite("ruleset", rs, 200, "fluid")}</button></div>`;
  }

  function renderEditors() {
    const host = $('#charEditors');
    host.innerHTML = chars.map((ch, i) => {
      const allianceRaces = D.races.filter((r) => r.faction === 'Alliance');
      const hordeRaces = D.races.filter((r) => r.faction === 'Horde');
      return `<fieldset class="char" data-i="${i}">
        <legend>Karaktär ${i + 1}</legend>
        <label class="field">
          <span>Karaktärens namn</span>
          <input data-f="name" data-i="${i}" maxlength="24" value="${esc(ch.name)}" required>
        </label>

        <div class="group-label">Race</div>
        <div class="races">
          <div class="side alliance"><h4>Alliance</h4><div class="picks">${allianceRaces.map((r) => raceButton(i, r, ch)).join('')}</div></div>
          <div class="side horde"><h4>Horde</h4><div class="picks">${hordeRaces.map((r) => raceButton(i, r, ch)).join('')}</div></div>
        </div>

        <div class="group-label">Klass${ch.class ? `: <b class="picked">${ch.class}</b>` : ''} ${ch.race ? '' : '<em>(välj race först)</em>'}</div>
        <div class="picks classes">${D.classes.map((c) => classButton(i, c, ch)).join('')}</div>

        <div class="group-label">Servertyp</div>
        <div class="picks rulesets">${D.rulesets.map((rs) => rulesetButton(i, rs, ch)).join('')}</div>

        <div class="field-row">
          <label class="field"><span>Yrke 1</span><select data-f="prof1" data-i="${i}">${profOptions(ch.prof1)}</select></label>
          <label class="field"><span>Yrke 2</span><select data-f="prof2" data-i="${i}">${profOptions(ch.prof2)}</select></label>
        </div>

        <div class="group-label">Roller <em>(valfritt, välj flera)</em></div>
        <div class="secondary">${D.roles.map((r) =>
          `<label class="tick"><input type="checkbox" data-f="roles" data-i="${i}" value="${r}"${ch.roles.includes(r) ? ' checked' : ''}> ${r}</label>`).join('')}</div>

        <div class="group-label">Sekundära yrken</div>
        <div class="secondary">${D.secondaryProfessions.map((s) =>
          `<label class="tick"><input type="checkbox" data-f="secondary" data-i="${i}" value="${s}"${ch.secondary.includes(s) ? ' checked' : ''}> ${s}</label>`).join('')}</div>

        ${chars.length > 1 ? `<button type="button" class="btn small danger" data-act="remove" data-i="${i}">Ta bort karaktär ${i + 1}</button>` : ''}
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
    if (!$('#displayName').value.trim()) return 'Skriv ditt namn eller smeknamn.';
    for (const [i, ch] of chars.entries()) {
      const n = i + 1;
      if (!ch.name.trim()) return `Karaktär ${n}: skriv ett namn.`;
      if (!ch.race) return `Karaktär ${n}: välj race.`;
      if (!ch.class) return `Karaktär ${n}: välj klass.`;
      if (ch.prof1 && ch.prof1 === ch.prof2) return `Karaktär ${n}: yrke 1 och 2 är samma.`;
    }
    return '';
  }

  const payloadChars = () => chars.map((c) => ({
    name: c.name.trim(), faction: c.faction, race: c.race, class: c.class, ruleset: c.ruleset,
    prof1: c.prof1, prof2: c.prof2, secondary: c.secondary, roles: c.roles,
  }));

  const editLink = (token) => `${location.origin}${location.pathname}?edit=${token}`;

  function discordButton() {
    return DISCORD_URL
      ? `<a class="btn discord" href="${esc(DISCORD_URL)}" target="_blank" rel="noopener">Gå med på Discord</a>`
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
        $('#success').innerHTML = `<strong>Sparat!</strong> Dina ändringar syns i listan.`;
      } else {
        const token = await rpc('register', {
          p_display_name: displayName, p_contact: contact, p_characters: payloadChars(),
        });
        editToken = token;
        store.set(token);
        const link = editLink(token);
        $('#success').hidden = false;
        $('#success').innerHTML = `<strong>Välkommen med!</strong> Du syns nu i listan.
          <p>Spara den här privata länken om du vill ändra dina karaktärer senare. Den fungerar som ditt lösenord, dela den inte.</p>
          <div class="linkbox"><input readonly id="editLinkInput" value="${esc(link)}"><button type="button" class="btn small" id="copyLink">Kopiera</button></div>
          <div class="actions">${discordButton()}</div>`;
        setEditMode(true);
      }
      $('#success').scrollIntoView({ behavior: 'smooth', block: 'center' });
      await refreshRoster();
    } catch (ex) {
      console.error(ex);
      showError('Något gick fel. Försök igen om en stund.');
    } finally {
      btn.disabled = false;
    }
  }

  async function onDelete() {
    if (!editToken || !confirm('Ta bort hela din registrering, inklusive alla karaktärer?')) return;
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
      $('#success').textContent = 'Din registrering är borttagen.';
      await refreshRoster();
    } catch (ex) {
      console.error(ex);
      showError('Kunde inte ta bort. Försök igen.');
    }
  }

  function setEditMode(on) {
    $('#deleteBtn').hidden = !on;
    $('#submitBtn').textContent = on ? 'Spara ändringar' : 'Skicka in';
    $('#formTitle').textContent = on ? 'Din registrering' : 'Skriv upp dig';
    $('#editBanner').hidden = !on;
    if (on) {
      $('#editBanner').textContent = 'Du redigerar din egen registrering. Ändringar ersätter det du skickade in förut.';
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
      $('#displayName').value = mine.display_name || '';
      $('#contact').value = mine.contact || '';
      chars = (mine.characters || []).map((c) => ({ ...emptyChar(), ...c, prof1: c.prof1 || '', prof2: c.prof2 || '', roles: c.roles || [], secondary: c.secondary || [] }));
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
      $('#cards').innerHTML = '<p class="muted">Kunde inte hämta listan just nu.</p>';
      return;
    }
    renderRoster();
    renderSummary();
  }

  function renderRoster() {
    const f = {
      faction: $('#fFaction').value, cls: $('#fClass').value,
      prof: $('#fProf').value, rs: $('#fRuleset').value,
    };
    const rows = roster.filter((c) =>
      (!f.faction || c.faction === f.faction) &&
      (!f.cls || c.class === f.cls) &&
      (!f.prof || c.prof1 === f.prof || c.prof2 === f.prof) &&
      (!f.rs || c.ruleset === f.rs));

    $('#rosterEmpty').hidden = rows.length > 0;
    $('#rosterEmpty').textContent = roster.length ? 'Ingen matchar filtret.' : 'Ingen här än. Bli först!';
    $('#cards').innerHTML = rows.map((c) => {
      const profs = [c.prof1, c.prof2].filter(Boolean);
      return `<article class="card ${c.faction.toLowerCase()}">
        ${sprite('race', D.raceKey(c.faction, c.race), 64, 'portrait')}
        <div class="body">
          <h3>${esc(c.name)}</h3>
          <p class="sub">${sprite('class', c.class, 20, 'inline')} ${esc(c.race)} ${esc(c.class)}${(c.roles || []).length ? ` · ${c.roles.map(esc).join('/')}` : ''}</p>
          <p class="profs">${profs.map((p) => `<span class="tag">${esc(p)}</span>`).join('')}${(c.secondary || []).map((p) => `<span class="tag dim">${esc(p)}</span>`).join('')}</p>
          <p class="owner">Spelare: ${esc(c.player_name)}${c.ruleset !== 'Normal' ? ` · ${sprite('ruleset', c.ruleset, 16, 'inline')} ${esc(c.ruleset)}` : ''}</p>
        </div>
      </article>`;
    }).join('');
  }

  function renderSummary() {
    const box = $('#summary');
    if (!roster.length) {
      box.innerHTML = `<h2>Gruppen just nu</h2><p class="muted">Ingen har skrivit upp sig än. Här visas vilka klasser och yrken vi täcker.</p>`;
      return;
    }
    const players = new Set(roster.map((c) => c.player_name)).size;
    const byClass = Object.fromEntries(D.classes.map((c) => [c, 0]));
    const byRole = { Tank: 0, Healer: 0, DPS: 0 };
    const byProf = Object.fromEntries(D.professions.map((p) => [p, 0]));
    roster.forEach((c) => {
      byClass[c.class] = (byClass[c.class] || 0) + 1;
      (c.roles || []).forEach((r) => { byRole[r] += 1; });
      [c.prof1, c.prof2].filter(Boolean).forEach((p) => { byProf[p] = (byProf[p] || 0) + 1; });
    });
    const missingProfs = D.professions.filter((p) => !byProf[p]);
    box.innerHTML = `<h2>Gruppen just nu</h2>
      <p class="muted">${players} ${players === 1 ? 'spelare' : 'spelare'} och ${roster.length} ${roster.length === 1 ? 'karaktär' : 'karaktärer'}.</p>
      <div class="classcount">${D.classes.map((c) => `<div class="cc${byClass[c] ? '' : ' zero'}">${sprite('class', c, 32)}<b>${byClass[c]}</b><span>${c}</span></div>`).join('')}</div>
      <p class="roles">${Object.entries(byRole).map(([r, n]) => `<span class="tag${n ? '' : ' warn'}">${r}: ${n}</span>`).join('')}</p>
      ${missingProfs.length ? `<p class="muted small">Yrken ingen har än: ${missingProfs.join(', ')}.</p>` : `<p class="muted small">Alla huvudyrken är täckta.</p>`}`;
  }

  function fillFilters() {
    $('#fClass').insertAdjacentHTML('beforeend', D.classes.map((c) => `<option>${c}</option>`).join(''));
    $('#fProf').insertAdjacentHTML('beforeend', D.professions.map((p) => `<option>${p}</option>`).join(''));
    $('#fRuleset').insertAdjacentHTML('beforeend', D.rulesets.filter((r) => !D.unavailableRulesets.includes(r)).map((r) => `<option>${r}</option>`).join(''));
    ['#fFaction', '#fClass', '#fProf', '#fRuleset'].forEach((s) => $(s).addEventListener('change', renderRoster));
  }

  // ---------- Övrigt ----------
  function countdown() {
    const days = Math.ceil((new Date(`${RELEASE_DATE}T00:00:00`) - new Date()) / 86400000);
    const el = $('#countdown');
    if (days > 1) el.textContent = `${days} dagar kvar till 4 november`;
    else if (days === 1) el.textContent = 'Imorgon är det dags';
    else el.textContent = 'Det är igång';
  }

  async function init() {
    countdown();
    if (DISCORD_URL) {
      const b = $('#discordBtn');
      b.href = DISCORD_URL;
      b.hidden = false;
    }
    fillFilters();
    await loadSheets();
    renderEditors();
    bindEditors();
    $('#addChar').addEventListener('click', () => { chars.push(emptyChar()); renderEditors(); });
    $('#regForm').addEventListener('submit', onSubmit);
    $('#deleteBtn').addEventListener('click', onDelete);
    document.addEventListener('click', (e) => {
      if (e.target.id === 'copyLink') {
        const input = $('#editLinkInput');
        input.select();
        navigator.clipboard?.writeText(input.value);
        e.target.textContent = 'Kopierad';
      }
    });
    await Promise.all([loadOwn(), refreshRoster()]);
  }

  init();
})();
