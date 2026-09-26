// Svenska och engelska texter. Speltermer (race, klass, yrken, roller) hålls på engelska i båda språken.

window.WF_I18N = (() => {
  const KEY = 'wf_lang';

  const dict = {
    sv: {
      docTitle: 'WoW Forever, spela med oss',
      langLabel: 'Språk',
      eyebrow: 'Spelargrupp av Emil & Cattis',
      lead: 'Vi startar 4 november och vill spela med folk vi känner. Nybörjare, rostiga veteraner och glesa speltider är välkomna.',
      chipServer: 'Servertyp: Normal',
      cdDays: '{n} dagar kvar till 4 november',
      cdTomorrow: 'Imorgon är det dags',
      cdLive: 'Det är igång',
      discord: 'Gå med på Discord',
      navSignup: 'Skriv upp dig',
      navRoster: 'Vilka är med',
      navShare: 'Dela eller skriv ut',
      feedbackBtn: 'Feedback',

      sumTitle: 'Gruppen just nu',
      playerOne: 'spelare',
      playerMany: 'spelare',
      charOne: 'karaktär',
      charMany: 'karaktärer',
      sumCounts: '{p} {pw} och {c} {cw}.',

      formTitle: 'Skriv upp dig',
      formTitleEdit: 'Din registrering',
      formIntro: 'Ingen inloggning. Fyll i dina karaktärer så syns du i listan. Efteråt får du en privat länk för att ändra dem.',
      editBanner: 'Du redigerar din egen registrering. Ändringar ersätter det du skickade in förut.',
      displayName: 'Ditt namn eller smeknamn',
      contact: 'Hur når vi dig?',
      contactNote: '(valfritt, syns bara för oss)',
      contactPh: 'Discord, telefon eller mail',
      character: 'Karaktär',
      charName: 'Karaktärens namn',
      gender: 'Kön',
      male: 'Man',
      female: 'Kvinna',
      race: 'Race',
      cls: 'Klass',
      pickRaceFirst: '(välj race först)',
      serverType: 'Servertyp',
      prof1: 'Yrke 1',
      prof2: 'Yrke 2',
      none: 'Inget',
      roles: 'Roller',
      rolesNote: '(valfritt, välj flera)',
      secondary: 'Sekundära yrken',
      addChar: '+ Lägg till en till karaktär',
      removeChar: 'Ta bort karaktär {n}',
      submit: 'Skicka in',
      save: 'Spara ändringar',
      deleteMine: 'Ta bort min registrering',
      errName: 'Skriv ditt namn eller smeknamn.',
      errCharName: 'Karaktär {n}: skriv ett namn.',
      errRace: 'Karaktär {n}: välj race.',
      errClass: 'Karaktär {n}: välj klass.',
      errProf: 'Karaktär {n}: yrke 1 och 2 är samma.',
      errGeneric: 'Något gick fel. Försök igen om en stund.',
      errDelete: 'Kunde inte ta bort. Försök igen.',
      saved: '<strong>Sparat!</strong> Dina ändringar syns i listan.',
      welcome: '<strong>Välkommen med!</strong> Du syns nu i listan.',
      keepLink: 'Spara den här privata länken om du vill ändra dina karaktärer senare. Den fungerar som ditt lösenord, dela den inte.',
      copy: 'Kopiera',
      copied: 'Kopierad',
      confirmDelete: 'Ta bort hela din registrering, inklusive alla karaktärer?',
      deleted: 'Din registrering är borttagen.',

      rosterTitle: 'Vilka är med',
      all: 'Alla',
      fFaction: 'Fraktion',
      fClass: 'Klass',
      fProf: 'Yrke',
      fServer: 'Servertyp',
      rosterEmpty: 'Ingen här än. Bli först!',
      noMatch: 'Ingen matchar filtret.',
      rosterFail: 'Kunde inte hämta listan just nu.',
      player: 'Spelare',

      rs_Normal: 'Äventyra och slåss mot monster, PvP när du själv vill.',
      rs_PvP: 'Nästan alltid i risk att bli attackerad av andra spelare.',
      rs_Roleplay: 'Strikta namn- och beteenderegler för inlevelse.',
      rs_Hardcore: 'Permanent död. Döda karaktärer kan flyttas till andra servertyper.',
      notAtLaunch: 'Finns inte vid launch.',

      footer: 'Inte affilierad med Blizzard Entertainment. Bilder tillhör deras respektive ägare.',

      fbTitle: 'Feedback',
      fbIntro: 'Något som är fel eller saknas? Skriv till oss.',
      fbMessage: 'Ditt meddelande',
      fbContact: 'Vill du ha svar? Lämna kontaktuppgift',
      fbContactNote: '(valfritt)',
      fbSend: 'Skicka',
      fbCancel: 'Avbryt',
      fbThanks: 'Tack! Vi har fått ditt meddelande.',
      fbEmpty: 'Skriv ett meddelande först.',
      fbError: 'Det gick inte att skicka just nu. Försök igen om en stund.',

      qrDocTitle: 'Dela WoW Forever-gruppen',
      qrPitch: 'Vi startar 4 november och vill spela med folk vi känner. Nybörjare och glesa speltider är välkomna.',
      qrCta: 'Skanna och skriv upp din karaktär',
      qrAddress: 'Adress som QR-koden pekar på',
      qrPrint: 'Skriv ut',
      qrCopy: 'Kopiera länk',
      qrShare: 'Dela',
      qrBack: '← Tillbaka till sidan',
    },

    en: {
      docTitle: 'WoW Forever, play with us',
      langLabel: 'Language',
      eyebrow: 'A player group by Emil & Cattis',
      lead: 'We start on 4 November and want to play with people we know. Beginners, rusty veterans and sparse play schedules are all welcome.',
      chipServer: 'Server type: Normal',
      cdDays: '{n} days until 4 November',
      cdTomorrow: 'Tomorrow is the day',
      cdLive: 'It is live',
      discord: 'Join our Discord',
      navSignup: 'Sign up',
      navRoster: "Who's in",
      navShare: 'Share or print',
      feedbackBtn: 'Feedback',

      sumTitle: 'The group right now',
      playerOne: 'player',
      playerMany: 'players',
      charOne: 'character',
      charMany: 'characters',
      sumCounts: '{p} {pw} and {c} {cw}.',

      formTitle: 'Sign up',
      formTitleEdit: 'Your registration',
      formIntro: 'No login. Fill in your characters and you show up in the list. Afterwards you get a private link to edit them.',
      editBanner: 'You are editing your own registration. Changes replace what you submitted before.',
      displayName: 'Your name or nickname',
      contact: 'How can we reach you?',
      contactNote: '(optional, only visible to us)',
      contactPh: 'Discord, phone or email',
      character: 'Character',
      charName: 'Character name',
      gender: 'Gender',
      male: 'Male',
      female: 'Female',
      race: 'Race',
      cls: 'Class',
      pickRaceFirst: '(pick a race first)',
      serverType: 'Server type',
      prof1: 'Profession 1',
      prof2: 'Profession 2',
      none: 'None',
      roles: 'Roles',
      rolesNote: '(optional, pick several)',
      secondary: 'Secondary professions',
      addChar: '+ Add another character',
      removeChar: 'Remove character {n}',
      submit: 'Submit',
      save: 'Save changes',
      deleteMine: 'Delete my registration',
      errName: 'Enter your name or nickname.',
      errCharName: 'Character {n}: enter a name.',
      errRace: 'Character {n}: pick a race.',
      errClass: 'Character {n}: pick a class.',
      errProf: 'Character {n}: profession 1 and 2 are the same.',
      errGeneric: 'Something went wrong. Please try again in a moment.',
      errDelete: 'Could not delete. Please try again.',
      saved: '<strong>Saved!</strong> Your changes show in the list.',
      welcome: "<strong>Welcome aboard!</strong> You're now in the list.",
      keepLink: 'Save this private link if you want to edit your characters later. It works like a password, so do not share it.',
      copy: 'Copy',
      copied: 'Copied',
      confirmDelete: 'Delete your whole registration, including all characters?',
      deleted: 'Your registration has been deleted.',

      rosterTitle: "Who's in",
      all: 'All',
      fFaction: 'Faction',
      fClass: 'Class',
      fProf: 'Profession',
      fServer: 'Server type',
      rosterEmpty: 'Nobody here yet. Be the first!',
      noMatch: 'No matches for the filter.',
      rosterFail: 'Could not load the list right now.',
      player: 'Player',

      rs_Normal: 'Adventure and fight monsters, PvP only when you choose.',
      rs_PvP: 'You are almost always at risk of being attacked by other players.',
      rs_Roleplay: 'Strict naming and behaviour rules for immersion.',
      rs_Hardcore: 'Permanent death. Dead characters can transfer to other server types.',
      notAtLaunch: 'Not available at launch.',

      footer: 'Not affiliated with Blizzard Entertainment. Images belong to their respective owners.',

      fbTitle: 'Feedback',
      fbIntro: 'Something wrong or missing? Let us know.',
      fbMessage: 'Your message',
      fbContact: 'Want a reply? Leave your contact details',
      fbContactNote: '(optional)',
      fbSend: 'Send',
      fbCancel: 'Cancel',
      fbThanks: 'Thanks! We got your message.',
      fbEmpty: 'Write a message first.',
      fbError: 'Could not send right now. Please try again in a moment.',

      qrDocTitle: 'Share the WoW Forever group',
      qrPitch: 'We start on 4 November and want to play with people we know. Beginners and sparse play schedules are welcome.',
      qrCta: 'Scan and sign up your character',
      qrAddress: 'Address the QR code points to',
      qrPrint: 'Print',
      qrCopy: 'Copy link',
      qrShare: 'Share',
      qrBack: '← Back to the page',
    },
  };

  const readStored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const writeStored = (v) => { try { localStorage.setItem(KEY, v); } catch { /* ignoreras */ } };

  const fromUrl = new URLSearchParams(location.search).get('lang');
  let lang = [fromUrl, readStored()].find((l) => l === 'sv' || l === 'en') || 'sv';
  const listeners = [];

  const t = (key, vars) => {
    let s = dict[lang][key] ?? dict.sv[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
    return s;
  };

  function applyStatic() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    const titleKey = document.documentElement.dataset.titleKey || 'docTitle';
    document.title = t(titleKey);
  }

  function setLang(next) {
    if (next !== 'sv' && next !== 'en') return;
    lang = next;
    writeStored(next);
    applyStatic();
    listeners.forEach((f) => f(next));
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]');
    if (b) setLang(b.dataset.lang);
  });

  return { t, setLang, applyStatic, onChange: (f) => listeners.push(f), get lang() { return lang; } };
})();
