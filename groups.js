// Spelgrupper (LFM): lista, skapa/hantera, ansökningar och rapporter.
// Bygger på app.js (WF_APP) för databasanrop och bildutsnitt.

(() => {
  const A = window.WF_APP;
  if (!A) return;
  const { SUPABASE_URL, SUPABASE_KEY } = window.WF_CONFIG;
  const D = window.WF_DATA;
  const I = window.WF_I18N;
  const t = I.t;
  const { rpc, sprite, esc } = A;
  const $ = (s) => document.querySelector(s);

  const OWNER_KEY = 'wf_group_token';
  const APPS_KEY = 'wf_apply_tokens';
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignoreras */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignoreras */ } },
  };
  const readApps = () => { try { const a = JSON.parse(ls.get(APPS_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };
  const writeApps = (a) => ls.set(APPS_KEY, JSON.stringify(a.slice(-20)));

  const FACTIONS = ['Any', 'Alliance', 'Horde'];
  const LANGS = ['sv', 'en', 'any'];
  const TONES = ['casual', 'medium', 'serious'];
  const CATS = { roles: 'looking_roles', classes: 'looking_classes', professions: 'looking_professions' };

  const factionLabel = (v) => (v === 'Any' ? t('factionAny') : v);
  const langLabel = (v) => t(v === 'sv' ? 'langSv' : v === 'en' ? 'langEn' : 'langAny');
  const toneLabel = (v) => t(v === 'casual' ? 'toneCasual' : v === 'medium' ? 'toneMedium' : 'toneSerious');

  const emptyGroup = () => ({
    name: '', description: '', faction: 'Any', ruleset: 'Normal', language: 'sv', tone: 'casual', play_times: '',
    members_now: 1, looking_any: true, looking_roles: [], looking_classes: [], looking_professions: [],
    contact: '', status: 'open',
  });

  let groups = [];
  let groupsLoaded = false;
  let ownerToken = null;
  let mine = null; // gruppen som ägs av den här webbläsaren
  let requests = [];
  let apps = [];
  let members = {}; // publika medlemmar per grupp-id
  let myMembers = []; // ägarens egen grupp
  let g = emptyGroup();
  let formOpen = false;
  let successHtml = '';
  let formError = '';

  // Delas med spelarlistan: vilka grupper en karaktär är medlem i.
  window.WF_GROUPS = {
    list: () => groups,
    forChar: (c) => groups.filter((grp) => (members[grp.id] || []).some((m) => m.characters.some((ch) => ch.id === c.id))),
  };

  // ---------- Hämta ----------
  async function fetchGroups() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/public_groups?select=*&order=updated_at.desc`, {
      headers: { apikey: SUPABASE_KEY, 'Accept-Profile': 'wowforever' },
    });
    if (!res.ok) throw new Error(`groups: ${res.status}`);
    return res.json();
  }

  async function fetchMembers() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/public_group_members?select=*&order=created_at.asc`, {
      headers: { apikey: SUPABASE_KEY, 'Accept-Profile': 'wowforever' },
    });
    if (!res.ok) throw new Error(`members: ${res.status}`);
    return res.json();
  }

  async function loadGroups() {
    try {
      const [gs, ms] = await Promise.all([fetchGroups(), fetchMembers()]);
      groups = gs;
      members = {};
      ms.forEach((m) => { (members[m.group_id] = members[m.group_id] || []).push(m); });
    } catch (ex) {
      console.error(ex);
      $('#groupCards').setAttribute('aria-busy', 'false');
      $('#groupCards').innerHTML = `<p class="muted">${t('grpLoadFail')}</p>`;
      return;
    }
    groupsLoaded = true;
    await A.ready;
    renderGroups();
    A.refreshRosterGroups();
  }

  async function loadMine() {
    if (!ownerToken) { mine = null; requests = []; myMembers = []; return; }
    try {
      mine = await rpc('get_my_group', { p_token: ownerToken });
      if (!mine) { ownerToken = null; ls.del(OWNER_KEY); requests = []; return; }
      requests = await rpc('group_requests', { p_token: ownerToken });
      myMembers = await rpc('my_group_members', { p_token: ownerToken });
    } catch (ex) {
      console.error(ex);
    }
  }

  async function loadApps() {
    const tokens = readApps();
    if (!tokens.length) { apps = []; renderApps(); return; }
    try {
      apps = await rpc('my_applications', { p_tokens: tokens });
      writeApps(apps.map((a) => a.token));
    } catch (ex) {
      console.error(ex);
    }
    await A.ready;
    renderApps();
  }

  // ---------- Lista och filter ----------
  const accepts = (grp, key, val) => grp.looking_any || !grp[key].length || grp[key].includes(val);

  function filteredGroups() {
    const f = {
      faction: $('#fgFaction').value, ruleset: $('#fgRuleset').value, lang: $('#fgLang').value,
      tone: $('#fgTone').value, role: $('#fgRole').value, cls: $('#fgClass').value, prof: $('#fgProf').value,
    };
    return groups.filter((x) =>
      (!f.faction || x.faction === 'Any' || x.faction === f.faction) &&
      (!f.ruleset || x.ruleset === f.ruleset) &&
      (!f.lang || x.language === 'any' || x.language === f.lang) &&
      (!f.tone || x.tone === f.tone) &&
      (!f.role || accepts(x, CATS.roles, f.role)) &&
      (!f.cls || accepts(x, CATS.classes, f.cls)) &&
      (!f.prof || accepts(x, CATS.professions, f.prof)));
  }

  function fillFilters() {
    const keep = ['#fgFaction', '#fgRuleset', '#fgLang', '#fgTone', '#fgRole', '#fgClass', '#fgProf'].map((s) => $(s).value);
    const opts = (sel, list) => {
      $(sel).querySelectorAll('option:not([value=""])').forEach((o) => o.remove());
      $(sel).insertAdjacentHTML('beforeend', list.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join(''));
    };
    opts('#fgFaction', [['Alliance', 'Alliance'], ['Horde', 'Horde']]);
    opts('#fgRuleset', D.rulesets.filter((r) => !D.unavailableRulesets.includes(r)).map((r) => [r, r]));
    opts('#fgLang', [['sv', t('langSv')], ['en', t('langEn')]]);
    opts('#fgTone', TONES.map((v) => [v, toneLabel(v)]));
    opts('#fgRole', D.roles.map((r) => [r, r]));
    opts('#fgClass', D.classes.map((c) => [c, c]));
    opts('#fgProf', D.professions.map((p) => [p, p]));
    ['#fgFaction', '#fgRuleset', '#fgLang', '#fgTone', '#fgRole', '#fgClass', '#fgProf'].forEach((s, n) => { $(s).value = keep[n]; });
  }

  function lookingHtml(grp) {
    const none = grp.looking_any || (!grp.looking_roles.length && !grp.looking_classes.length && !grp.looking_professions.length);
    if (none) return `<span class="tag">${t('lookAnyone')}</span>`;
    return [
      ...grp.looking_roles.map((r) => `<span class="tag">${esc(r)}</span>`),
      ...grp.looking_classes.map((c) => `<span class="lk" title="${esc(c)}">${sprite('class', c, 26, 'inline')}</span>`),
      ...grp.looking_professions.map((p) => `<span class="lk" title="${esc(p)}">${sprite('prof', p, 26, 'inline')}</span>`),
    ].join('');
  }

  const memberChars = (m) => m.characters.map((c) => `<span class="mchar" title="${esc(c.race)} ${esc(c.class)}">${sprite('race', D.raceKey(c.faction, c.race, c.gender), 22, 'inline')} ${esc(c.name)} ${sprite('class', c.class, 16, 'inline')}</span>`).join('');

  function membersHtml(id) {
    const list = members[id] || [];
    if (!list.length) return '';
    const items = list.map((m) => `<li><b>${esc(m.player_name)}</b> ${memberChars(m)}</li>`).join('');
    return `<details class="gmembers"${list.length <= 4 ? ' open' : ''}><summary>${t('grpMembersList', { n: list.length })}</summary><ul>${items}</ul></details>`;
  }

  function groupCard(grp) {
    const own = mine && mine.id === grp.id;
    const action = own
      ? `<span class="tag">${t('grpYours')}</span>`
      : `<button type="button" class="btn small primary" data-act="apply" data-id="${grp.id}">${t('grpApply')}</button>`;
    return `<article class="gcard ${grp.faction.toLowerCase()}">
      <header>
        <h3>${esc(grp.name)}</h3>
        <span class="fchip ${grp.faction.toLowerCase()}">${factionLabel(grp.faction)}</span>
      </header>
      <p class="gmeta">
        <span class="tag">${grp.ruleset}</span>
        <span class="tag">${langLabel(grp.language)}</span>
        <span class="tag">${toneLabel(grp.tone)}</span>
        <span class="tag">${t(grp.members_now === 1 ? 'grpMemberOne' : 'grpMemberMany', { a: grp.members_now })}</span>
      </p>
      ${grp.play_times ? `<p class="gplay">${esc(grp.play_times)}</p>` : ''}
      ${grp.description ? `<p class="gdesc">${esc(grp.description)}</p>` : ''}
      ${membersHtml(grp.id)}
      <div class="glooking"><b>${t('grpLooking')}</b> ${lookingHtml(grp)}</div>
      <footer>${action}<button type="button" class="linklike" data-act="report" data-id="${grp.id}">${t('grpReport')}</button></footer>
    </article>`;
  }

  const FILTER_IDS = ['#fgFaction', '#fgRuleset', '#fgLang', '#fgTone', '#fgRole', '#fgClass', '#fgProf'];

  function updateFilterCount() {
    const n = FILTER_IDS.filter((s) => $(s).value).length;
    $('#gFilterCount').textContent = String(n);
    $('#gFilterCount').hidden = !n;
  }

  function renderGroups() {
    if (!groupsLoaded) return;
    $('#groupCards').setAttribute('aria-busy', 'false');
    updateFilterCount();
    const rows = filteredGroups();
    $('#groupsEmpty').hidden = rows.length > 0;
    $('#groupsEmpty').textContent = t(groups.length ? 'grpNoMatch' : 'grpEmpty');
    $('#groupCards').innerHTML = rows.map(groupCard).join('');
  }

  // ---------- Skapa och hantera ----------
  const daysLeft = () => Math.ceil((new Date(mine.updated_at).getTime() + 30 * 86400000 - Date.now()) / 86400000);

  function seg(name, options, current) {
    return `<div class="seg" role="group">${options.map(([v, l]) =>
      `<button type="button" data-gs="${name}" data-v="${esc(v)}" aria-pressed="${v === current}">${esc(l)}</button>`).join('')}</div>`;
  }

  function toggleTile(cat, kind, value, extra = '') {
    const on = g[cat].includes(value);
    return `<div class="opt"><span class="lbl">${value}</span>
      <button type="button" class="pick ${kind}${on ? ' on' : ''}" data-gt="${cat}" data-v="${value}" title="${value}" aria-label="${value}" aria-pressed="${on}" ${extra}>${sprite(kind === 'cls' ? 'class' : 'prof', value, 200, 'fluid')}</button></div>`;
  }

  function rulesetTile(rs) {
    const off = D.unavailableRulesets.includes(rs);
    const on = g.ruleset === rs && !off;
    const title = off ? `${t('rs_' + rs)} ${t('notAtLaunch')}` : t('rs_' + rs);
    return `<div class="opt${off ? ' off' : ''}" title="${esc(title)}" data-tip="${esc(title)}"><span class="lbl">${rs}</span>
      <button type="button" class="pick rs${on ? ' on' : ''}" data-gs="ruleset" data-v="${rs}" ${off ? 'disabled' : ''} aria-label="${rs}" aria-pressed="${on}">${sprite('ruleset', rs, 200, 'fluid')}</button></div>`;
  }

  const reqChars = (r) => r.characters.map((c) => `<li>${sprite('race', D.raceKey(c.faction, c.race, c.gender), 34, 'inline')}
      <span><b>${esc(c.name)}</b> ${esc(c.race)} ${esc(c.class)}${(c.roles || []).length ? ` · ${c.roles.map(esc).join('/')}` : ''}${c.prof1 ? ` · ${esc(c.prof1)}` : ''}${c.prof2 ? `, ${esc(c.prof2)}` : ''}</span></li>`).join('');

  const reqLabel = (r) => t(r.status === 'pending' ? 'reqPending' : r.status === 'accepted' ? 'reqAccepted' : 'reqDeclined');

  // Behandlade ansökningar visas som en rad som fälls ut, så listan inte växer.
  function requestRow(r) {
    const names = r.characters.map((c) => esc(c.name)).join(', ');
    const flip = r.status === 'accepted'
      ? `<button type="button" class="btn small danger" data-act="decline" data-id="${r.id}">${t('reqDecline')}</button>`
      : `<button type="button" class="btn small primary" data-act="accept" data-id="${r.id}">${t('reqAccept')}</button>`;
    return `<details class="reqrow ${r.status}"><summary><b>${esc(r.applicant_name)}</b> <span class="tag">${reqLabel(r)}</span> <span class="muted small">${names}</span></summary>
      <div class="reqbody"><ul class="reqchars">${reqChars(r)}</ul>
      ${r.message ? `<p class="gdesc">${esc(r.message)}</p>` : ''}
      ${r.applicant_contact ? `<p class="reqcontact"><b>${t('reqContact')}</b> ${esc(r.applicant_contact)}</p>` : ''}
      <div class="actions">${flip}</div></div></details>`;
  }

  function requestCard(r) {
    const chars = reqChars(r);
    const label = reqLabel(r);
    const buttons = r.status === 'pending'
      ? `<button type="button" class="btn small primary" data-act="accept" data-id="${r.id}">${t('reqAccept')}</button>
         <button type="button" class="btn small danger" data-act="decline" data-id="${r.id}">${t('reqDecline')}</button>`
      : '';
    return `<article class="req ${r.status}">
      <header><b>${esc(r.applicant_name)}</b><span class="tag ${r.status === 'pending' ? 'warn' : ''}">${label}</span></header>
      <ul class="reqchars">${chars}</ul>
      ${r.message ? `<p class="gdesc">${esc(r.message)}</p>` : ''}
      ${r.applicant_contact ? `<p class="reqcontact"><b>${t('reqContact')}</b> ${esc(r.applicant_contact)}</p>` : ''}
      <div class="actions">${buttons}</div>
    </article>`;
  }

  function membersSection() {
    const rows = myMembers.map((m) => `<li class="mrow"><span><b>${esc(m.player_name)}</b> ${memberChars(m)}</span>
      ${m.is_owner ? `<span class="tag">${t('memOwner')}</span>` : `<button type="button" class="linklike" data-act="remove-member" data-id="${m.id}">${t('memRemove')}</button>`}</li>`).join('');
    return `<div class="reqs"><h3>${t('memTitle')}</h3>
      <p class="muted small">${t('memHint')}</p>
      ${rows ? `<ul class="mlist">${rows}</ul>` : `<p class="muted">${t('memEmpty')}</p>`}</div>`;
  }

  function ownerNote() {
    return A.getMine()
      ? `<p class="muted small">${t('gOwnerAuto')}</p>`
      : `<p class="notice">${t('gOwnerNeedReg')} <button type="button" class="btn small" data-tab-btn="skriv-upp-dig">${t('navSignup')}</button></p>`;
  }

  function requestsSection() {
    const pending = requests.filter((r) => r.status === 'pending');
    const done = requests.filter((r) => r.status !== 'pending');
    const pendingHtml = pending.length ? pending.map(requestCard).join('') : `<p class="muted">${t(requests.length ? 'reqNoPending' : 'reqEmpty')}</p>`;
    const doneHtml = done.length ? `<details class="req-history"><summary>${t('reqHistory', { n: done.length })}</summary>${done.map(requestRow).join('')}</details>` : '';
    return `<div class="reqs"><h3>${t('reqTitle')}</h3>${pendingHtml}${doneHtml}</div>`;
  }

  function renderForm() {
    const sec = $('#groupForm');
    sec.hidden = !formOpen;
    if (!formOpen) return;
    const editing = Boolean(mine);
    const anyOn = g.looking_any;
    const pending = requests.filter((r) => r.status === 'pending').length;
    const visibility = !editing ? '' : mine.status === 'closed' ? t('gVisibleClosed') : daysLeft() > 0 ? t('gVisible', { n: daysLeft() }) : t('gExpired');
    sec.innerHTML = `
      <h2>${t(editing ? 'gfTitleEdit' : 'gfTitleNew')}${pending ? ` <span class="badge-inline">${pending}</span>` : ''}</h2>
      <p class="muted">${t('gfIntro')}</p>
      ${editing ? '' : ownerNote()}
      ${editing ? `<p class="notice">${esc(visibility)} <button type="button" class="btn small" data-act="renew">${t('gRenew')}</button></p>` : ''}
      ${editing ? requestsSection() : ''}
      ${editing ? membersSection() : ''}
      ${successHtml ? `<div class="notice success">${successHtml}</div>` : ''}
      <form id="gForm" novalidate>
        <label class="field"><span>${t('gName')}</span><input data-gf="name" maxlength="40" value="${esc(g.name)}" required></label>
        <label class="field"><span>${t('gDesc')} <em>${t('gDescNote')}</em></span><textarea data-gf="description" rows="3" maxlength="600">${esc(g.description)}</textarea></label>

        <div class="group-label">${t('gFaction')}</div>
        ${seg('faction', FACTIONS.map((v) => [v, factionLabel(v)]), g.faction)}

        <div class="group-label">${t('serverType')}</div>
        <div class="picks rulesets">${D.rulesets.map(rulesetTile).join('')}</div>

        <div class="field-row">
          <div class="field"><span>${t('gLanguage')}</span>${seg('language', LANGS.map((v) => [v, langLabel(v)]), g.language)}</div>
          <div class="field"><span>${t('gTone')}</span>${seg('tone', TONES.map((v) => [v, toneLabel(v)]), g.tone)}</div>
        </div>

        <div class="field-row">
          <label class="field"><span>${t('gPlay')}</span><input data-gf="play_times" maxlength="120" placeholder="${esc(t('gPlayPh'))}" value="${esc(g.play_times)}"></label>
          <label class="field narrow"><span>${t('gMembersNow')}</span><input data-gf="members_now" type="number" min="1" max="10000" value="${g.members_now}"></label>
        </div>

        <div class="group-label">${t('grpLooking')}</div>
        <label class="tick"><input type="checkbox" data-gf="looking_any" ${anyOn ? 'checked' : ''}> ${t('gLookingAny')}</label>
        ${anyOn ? '' : `
          <p class="muted small">${t('gLookingHint')}</p>
          <div class="group-label">${t('roles')}</div>
          <div class="secondary">${D.roles.map((r) => `<button type="button" class="chipbtn" data-gt="looking_roles" data-v="${r}" aria-pressed="${g.looking_roles.includes(r)}">${r}</button>`).join('')}</div>
          <div class="group-label">${t('gLookClasses')}</div>
          <div class="picks classes">${D.classes.map((c) => toggleTile('looking_classes', 'cls', c)).join('')}</div>
          <div class="group-label">${t('gLookProfs')}</div>
          <div class="picks classes">${D.professions.map((p) => toggleTile('looking_professions', 'prof', p)).join('')}</div>`}

        <label class="field"><span>${t('gContact')} <em>${t('gContactNote')}</em></span><input data-gf="contact" maxlength="200" placeholder="${esc(t('gContactPh'))}" value="${esc(g.contact)}"></label>

        ${editing ? `<div class="group-label">${t('gStatus')}</div>${seg('status', [['open', t('gOpen')], ['closed', t('gClosed')]], g.status)}` : ''}

        <p class="muted small priv-note">${t('privNote')}</p>
        <p class="error" id="gError" role="alert" ${formError ? '' : 'hidden'}>${esc(formError)}</p>
        <div class="actions">
          <button type="submit" class="btn primary">${t(editing ? 'gSaveBtn' : 'gCreateBtn')}</button>
          ${editing ? `<button type="button" class="btn danger" data-act="delete">${t('gDelete')}</button>` : ''}
        </div>
      </form>`;
  }

  function fromMine(m) {
    return {
      ...emptyGroup(), name: m.name, description: m.description, faction: m.faction, ruleset: m.ruleset, language: m.language,
      tone: m.tone, play_times: m.play_times, members_now: m.members_now,
      looking_any: m.looking_any, looking_roles: m.looking_roles || [], looking_classes: m.looking_classes || [],
      looking_professions: m.looking_professions || [], contact: m.contact, status: m.status,
    };
  }

  function updateOwnerUi() {
    $('#tabMine').hidden = !(mine || formOpen);
    $('#tabMineLabel').textContent = t(mine ? 'navMyGroup' : 'grpCreate');
    const pending = requests.filter((r) => r.status === 'pending').length;
    const badge = $('#myGroupBadge');
    badge.textContent = String(pending);
    badge.hidden = !pending;
  }

  function openForm() {
    formOpen = true;
    if (mine) g = fromMine(mine);
    renderForm();
    updateOwnerUi();
    window.WF_TABS.show('din-grupp');
  }

  const manageLink = (token) => `${location.origin}${location.pathname}?group=${token}`;

  async function submitGroup() {
    formError = '';
    if (!g.name.trim()) { formError = t('gErrName'); renderForm(); return; }
    if (!g.contact.trim()) { formError = t('gErrContact'); renderForm(); return; }
    const anyPicked = g.looking_roles.length || g.looking_classes.length || g.looking_professions.length;
    const p = { ...g, looking_any: g.looking_any || !anyPicked };
    if (p.looking_any) { p.looking_roles = []; p.looking_classes = []; p.looking_professions = []; }
    try {
      if (ownerToken) {
        await rpc('save_group', { p_token: ownerToken, p });
        successHtml = t('gSaved');
      } else {
        const token = await rpc('create_group', { p, p_edit_token: (A.getMine() || {}).token || null });
        ownerToken = token;
        ls.set(OWNER_KEY, token);
        successHtml = `${t('gCreated')}<p>${t('gKeepLink')}</p>
          <div class="linkbox"><input readonly id="groupLinkInput" value="${esc(manageLink(token))}"><button type="button" class="btn small" data-act="copy-group-link">${t('copy')}</button></div>`;
      }
      await loadMine();
      if (mine) g = fromMine(mine);
      await loadGroups();
      updateOwnerUi();
      renderForm();
    } catch (ex) {
      console.error(ex);
      formError = A.errText(ex);
      renderForm();
    }
  }

  // ---------- Ansökningar ----------
  let applyGroup = null;
  let applyDone = false;

  function openApply(id) {
    applyGroup = groups.find((x) => x.id === id);
    if (!applyGroup) return;
    applyDone = false;
    renderApply();
    $('#applyDialog').showModal();
  }

  function renderApply() {
    const body = $('#applyBody');
    const mineReg = A.getMine();
    $('#applyTitle').textContent = t('applyTitle', { name: applyGroup.name });
    if (applyDone) {
      body.innerHTML = `<div class="notice success">${t('applyDone')}</div>
        <div class="actions"><button type="button" class="btn" data-act="close-apply">${t('close')}</button></div>`;
      return;
    }
    if (!mineReg) {
      body.innerHTML = `<div class="notice">${t('applyNeedReg')}</div>
        <div class="actions"><a class="btn primary" href="#skriv-upp-dig" data-act="close-apply">${t('applyGoReg')}</a>
        <button type="button" class="btn" data-act="close-apply">${t('close')}</button></div>`;
      return;
    }
    const chars = mineReg.chars.filter((c) => c.id && c.name && c.race && c.class);
    const fits = (c) => applyGroup.faction === 'Any' || c.faction === applyGroup.faction;
    body.innerHTML = `
      <label class="field"><span>${t('applyContact')} <em>${t('applyContactNote')}</em></span><input id="apContact" maxlength="200" value="${esc(mineReg.contact)}"></label>
      <div class="group-label">${t('applyChars')}</div>
      <div class="apchars">${chars.map((c, i) => `<label class="tick apchar ${fits(c) ? '' : 'off'}">
        <input type="checkbox" data-ci="${i}" ${fits(c) ? 'checked' : 'disabled'}>
        ${sprite('race', D.raceKey(c.faction, c.race, c.gender), 30, 'inline')}
        <span><b>${esc(c.name)}</b> ${esc(c.race)} ${esc(c.class)} ${fits(c) ? '' : `<em>${t('applyWrongFaction')}</em>`}</span></label>`).join('')}</div>
      <label class="field"><span>${t('applyMessage')} <em>${t('gDescNote')}</em></span><textarea id="apMessage" rows="3" maxlength="500"></textarea></label>
      <p class="muted small">${t('applyPublicNote')}</p>
      <p class="muted small priv-note">${t('privNote')}</p>
      <p class="error" id="apError" role="alert" hidden></p>
      <div class="actions">
        <button type="submit" class="btn primary" id="apSend">${t('applySend')}</button>
        <button type="button" class="btn" data-act="close-apply">${t('fbCancel')}</button>
      </div>`;
  }

  async function sendApplication(e) {
    e.preventDefault();
    if (!applyGroup || applyDone) return;
    const err = $('#apError');
    const mineReg = A.getMine();
    const chars = mineReg.chars.filter((c) => c.id && c.name && c.race && c.class);
    const picked = [...document.querySelectorAll('#applyBody [data-ci]:checked')].map((el) => chars[Number(el.dataset.ci)]);
    const contact = $('#apContact').value.trim();
    const show = (m) => { err.textContent = m; err.hidden = false; };
    if (!picked.length) { show(t('applyErrChars')); return; }
    if (!contact) { show(t('applyErrContact')); return; }
    const btn = $('#apSend');
    btn.disabled = true;
    try {
      const token = await rpc('apply_to_group', {
        p_group: applyGroup.id, p_edit_token: mineReg.token, p_contact: contact,
        p_character_ids: picked.slice(0, 5).map((c) => c.id),
        p_message: $('#apMessage').value.trim(),
      });
      writeApps([...readApps(), token]);
      applyDone = true;
      renderApply();
      await loadApps();
    } catch (ex) {
      console.error(ex);
      show(A.errText(ex, 'applyErr'));
      btn.disabled = false;
    }
  }

  function renderApps() {
    const sec = $('#myApps');
    sec.hidden = !apps.length;
    if (!apps.length) return;
    sec.innerHTML = `<h2>${t('appsTitle')}</h2>` + apps.map((a) => `<article class="req ${a.status}">
      <header><b>${esc(a.group_name)}</b><span class="tag ${a.status === 'pending' ? 'warn' : ''}">${t(a.status === 'pending' ? 'reqPending' : a.status === 'accepted' ? 'reqAccepted' : 'reqDeclined')}</span></header>
      ${a.group_contact ? `<p class="reqcontact"><b>${t('appContact')}</b> ${esc(a.group_contact)}</p>` : ''}
      <div class="actions"><button type="button" class="btn small danger" data-act="withdraw" data-token="${esc(a.token)}">${t('appWithdraw')}</button></div>
    </article>`).join('');
  }

  // ---------- Rapport ----------
  let reportId = null;
  function openReport(id) {
    reportId = id;
    $('#reportReason').value = '';
    $('#reportFields').hidden = false;
    $('#reportDone').hidden = true;
    $('#reportError').hidden = true;
    $('#reportSend').hidden = false;
    $('#reportDialog').showModal();
  }

  async function sendReport(e) {
    e.preventDefault();
    const btn = $('#reportSend');
    btn.disabled = true;
    try {
      await rpc('report_group', { p_group: reportId, p_reason: $('#reportReason').value.trim() });
      $('#reportFields').hidden = true;
      btn.hidden = true;
      $('#reportDone').textContent = t('reportDone');
      $('#reportDone').hidden = false;
      $('#reportError').hidden = true;
    } catch (ex) {
      console.error(ex);
      $('#reportError').textContent = A.errText(ex, 'reportErr');
      $('#reportError').hidden = false;
    } finally {
      btn.disabled = false;
    }
  }

  // ---------- Händelser ----------
  function bind() {
    $('#gFilterToggle').addEventListener('click', () => {
      const box = $('#gFilters');
      box.hidden = !box.hidden;
      $('#gFilterToggle').setAttribute('aria-expanded', String(!box.hidden));
    });
    ['#fgFaction', '#fgRuleset', '#fgLang', '#fgTone', '#fgRole', '#fgClass', '#fgProf'].forEach((s) => $(s).addEventListener('change', renderGroups));

    document.addEventListener('input', (e) => {
      const f = e.target.dataset && e.target.dataset.gf;
      if (!f || f === 'looking_any') return;
      g[f] = e.target.type === 'number' ? Math.max(1, Math.min(10000, parseInt(e.target.value, 10) || 1)) : e.target.value;
    });

    document.addEventListener('change', (e) => {
      if (e.target.dataset && e.target.dataset.gf === 'looking_any') {
        g.looking_any = e.target.checked;
        if (g.looking_any) { g.looking_roles = []; g.looking_classes = []; g.looking_professions = []; }
        renderForm();
      }
    });

    document.addEventListener('click', async (e) => {
      const seg = e.target.closest('[data-gs]');
      if (seg && !seg.disabled) { g[seg.dataset.gs] = seg.dataset.v; renderForm(); return; }
      const tog = e.target.closest('[data-gt]');
      if (tog) {
        const cat = tog.dataset.gt;
        const set = new Set(g[cat]);
        if (set.has(tog.dataset.v)) set.delete(tog.dataset.v); else set.add(tog.dataset.v);
        g[cat] = [...set];
        renderForm();
        return;
      }
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      switch (btn.dataset.act) {
        case 'apply': openApply(btn.dataset.id); break;
        case 'report': openReport(btn.dataset.id); break;
        case 'close-apply': $('#applyDialog').close(); break;
        case 'new-group': successHtml = ''; formError = ''; if (!mine) g = emptyGroup(); openForm(); break;
        case 'my-group': successHtml = ''; formError = ''; openForm(); break;
        case 'copy-group-link': {
          const input = $('#groupLinkInput');
          input.select();
          navigator.clipboard?.writeText(input.value);
          btn.textContent = t('copied');
          break;
        }
        case 'renew':
          await rpc('renew_group', { p_token: ownerToken });
          successHtml = t('gRenewed');
          await loadMine(); await loadGroups(); if (mine) g = fromMine(mine);
          renderForm();
          break;
        case 'delete':
          if (!confirm(t('gConfirmDelete'))) break;
          await rpc('delete_group', { p_token: ownerToken });
          ownerToken = null; mine = null; requests = []; ls.del(OWNER_KEY); g = emptyGroup(); formOpen = false; successHtml = '';
          updateOwnerUi(); renderForm(); await loadGroups();
          window.WF_TABS.show('grupper');
          break;
        case 'accept':
        case 'decline':
          await rpc('decide_request', { p_token: ownerToken, p_request: btn.dataset.id, p_accept: btn.dataset.act === 'accept' });
          await loadMine(); await loadGroups(); updateOwnerUi(); renderForm();
          break;
        case 'remove-member':
          if (!confirm(t('memConfirmRemove'))) break;
          await rpc('remove_group_member', { p_token: ownerToken, p_member: btn.dataset.id });
          await loadMine(); await loadGroups(); if (mine) g = { ...g, members_now: mine.members_now };
          renderForm();
          break;
        case 'withdraw':
          await rpc('withdraw_application', { p_token: btn.dataset.token });
          writeApps(readApps().filter((x) => x !== btn.dataset.token));
          await loadApps();
          break;
        default:
      }
    });

    document.addEventListener('submit', (e) => {
      if (e.target.id === 'gForm') { e.preventDefault(); submitGroup(); }
      if (e.target.id === 'applyForm') sendApplication(e);
      if (e.target.id === 'reportForm') sendReport(e);
    });

    $('#reportCancel').addEventListener('click', () => $('#reportDialog').close());
    ['#applyDialog', '#reportDialog'].forEach((s) => $(s).addEventListener('click', (e) => { if (e.target === $(s)) $(s).close(); }));

    document.addEventListener('wf:tab', (e) => {
      if (e.detail === 'din-grupp' && !formOpen) {
        formOpen = true;
        if (mine) g = fromMine(mine);
        renderForm();
        updateOwnerUi();
      }
    });

    I.onChange(() => {
      fillFilters(); renderGroups(); renderApps(); renderForm(); updateOwnerUi();
      if ($('#applyDialog').open && applyGroup) renderApply();
      $('#reportCancel').textContent = t('fbCancel');
    });
  }

  async function init() {
    // Hämtningen startar direkt och ritar först när bilderna är klara.
    const params = new URLSearchParams(location.search);
    ownerToken = params.get('group') || ls.get(OWNER_KEY);
    const dataP = Promise.all([loadGroups(), loadMine(), loadApps()]);
    await A.ready;
    fillFilters();
    bind();
    await dataP;
    if (ownerToken && mine) {
      ls.set(OWNER_KEY, ownerToken);
      updateOwnerUi();
      if (params.get('group')) {
        openForm();
        try { history.replaceState(null, '', location.pathname + location.hash); } catch { /* ignoreras */ }
      }
    }
    renderGroups();
  }

  init();
})();
