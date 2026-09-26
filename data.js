// All spelregler och konfiguration på ett ställe. Rätta här om WoW Forever avviker.

window.WF_CONFIG = {
  SUPABASE_URL: 'https://kpaolyovfybxedgaigvp.supabase.co',
  SUPABASE_KEY: 'sb_publishable_9Oup-6p4XC7tYi428XUxTA_KcQbyDpT',
  DISCORD_URL: 'https://discord.gg/wAfSuvWcv',
  RELEASE_DATE: '2026-11-04',
};

window.WF_DATA = (() => {
  const ALLIANCE = 'Alliance';
  const HORDE = 'Horde';

  // Race -> tillåtna klasser, per fraktion (Skyborne finns på båda sidor).
  // Transkriberat från tabellen i race-classes.webp.
  const races = [
    { faction: ALLIANCE, race: 'Skyborne', classes: ['Druid', 'Hunter', 'Mage', 'Rogue', 'Warrior'] },
    { faction: ALLIANCE, race: 'Human', classes: ['Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Warlock', 'Warrior'] },
    { faction: ALLIANCE, race: 'Dwarf', classes: ['Hunter', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warrior'] },
    { faction: ALLIANCE, race: 'Night Elf', classes: ['Druid', 'Hunter', 'Priest', 'Rogue', 'Warrior'] },
    { faction: ALLIANCE, race: 'Gnome', classes: ['Mage', 'Priest', 'Rogue', 'Warlock', 'Warrior'] },
    { faction: HORDE, race: 'Skyborne', classes: ['Druid', 'Hunter', 'Rogue', 'Shaman', 'Warrior'] },
    { faction: HORDE, race: 'Orc', classes: ['Hunter', 'Mage', 'Rogue', 'Shaman', 'Warlock', 'Warrior'] },
    { faction: HORDE, race: 'Undead', classes: ['Mage', 'Paladin', 'Priest', 'Rogue', 'Warlock', 'Warrior'] },
    { faction: HORDE, race: 'Tauren', classes: ['Druid', 'Hunter', 'Shaman', 'Warrior'] },
    { faction: HORDE, race: 'Troll', classes: ['Hunter', 'Mage', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior'] },
  ];

  const classes = ['Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior'];
  const rulesets = ['Normal', 'PvP', 'Roleplay', 'Hardcore'];
  // Servertyper som inte finns vid launch. Tas bort härifrån när de öppnar.
  const unavailableRulesets = ['Hardcore'];
  const roles = ['Tank', 'Healer', 'DPS'];

  // Standardyrken. Kontrollera mot WoW Forever när det släpps.
  const professions = [
    'Alchemy', 'Blacksmithing', 'Enchanting', 'Engineering', 'Herbalism',
    'Leatherworking', 'Mining', 'Skinning', 'Tailoring',
  ];
  const secondaryProfessions = ['Cooking', 'First Aid', 'Fishing'];

  // Utsnitt ur bilderna. Koordinater är i bildens ursprungliga pixlar
  // (ref = storlek jag mätte i), skalas automatiskt om filen har annan storlek.
  const sheets = {
    rulesets: { src: 'assets/rulesets.webp', ref: [961, 451] },
    classes: { src: 'assets/race-classes.webp', ref: [878, 647] },
    races: { src: 'assets/races.webp', ref: [1080, 820] },
    racesF: { src: 'assets/races-female.webp', ref: [340, 480] },
    gender: { src: 'assets/gender.webp', ref: [190, 100] },
    profs: { src: 'assets/professions.webp', ref: [504, 320] },
  };

  const crops = {
    ruleset: {
      Normal: { sheet: 'rulesets', x: 94, y: 100, w: 56, h: 56 },
      PvP: { sheet: 'rulesets', x: 330, y: 100, w: 56, h: 56 },
      Roleplay: { sheet: 'rulesets', x: 564, y: 100, w: 56, h: 56 },
      Hardcore: { sheet: 'rulesets', x: 800, y: 100, w: 56, h: 56 },
    },
    // Exakta ikongränser (x-start, bredd) uppmätta i race-classes.webp. Ikonerna är kvadratiska.
    class: Object.fromEntries(
      Object.entries({
        Druid: [146, 41], Hunter: [222, 40], Mage: [297, 42], Paladin: [376, 41], Priest: [453, 40],
        Rogue: [525, 41], Shaman: [609, 42], Warlock: [700, 43], Warrior: [788, 41],
      }).map(([name, [x, w]]) => [name, { sheet: "classes", x, y: 72, w, h: w }])
    ),
    // Nyckel: "Faction:Race:Gender". Ordningen i bilderna är uppifrån och ned.
    race: (() => {
      const alliance = ["Human", "Dwarf", "Night Elf", "Gnome", "Skyborne"];
      const horde = ["Orc", "Undead", "Tauren", "Troll", "Skyborne"];
      const out = {};
      const maleTops = [155, 292, 430, 567, 704];
      alliance.forEach((r, i) => { out[`Alliance:${r}:Male`] = { sheet: "races", x: 353, y: maleTops[i] + 6, w: 104, h: 104 }; });
      horde.forEach((r, i) => { out[`Horde:${r}:Male`] = { sheet: "races", x: 617, y: maleTops[i] + 6, w: 104, h: 104 }; });
      const femTops = [22, 114, 206, 299, 391];
      alliance.forEach((r, i) => { out[`Alliance:${r}:Female`] = { sheet: "racesF", x: 53, y: femTops[i], w: 62, h: 62 }; });
      horde.forEach((r, i) => { out[`Horde:${r}:Female`] = { sheet: "racesF", x: 233, y: femTops[i], w: 62, h: 62 }; });
      return out;
    })(),
    // Yrkesikoner i raderna: Alchemy, Blacksmithing, Leatherworking, Engineering / Enchanting, Tailoring, Mining, Herbalism / Fishing, First Aid, Cooking, Skinning.
    prof: (() => {
      const grid = [
        ["Alchemy", "Blacksmithing", "Leatherworking", "Engineering"],
        ["Enchanting", "Tailoring", "Mining", "Herbalism"],
        ["Fishing", "First Aid", "Cooking", "Skinning"],
      ];
      const xs = [88, 173, 259, 344], ys = [38, 127, 216];
      const out = {};
      grid.forEach((row, r) => row.forEach((name, c) => { out[name] = { sheet: "profs", x: xs[c], y: ys[r], w: 62, h: 62 }; }));
      return out;
    })(),
    gender: {
      Male: { sheet: "gender", x: 31, y: 22, w: 44, h: 44 },
      Female: { sheet: "gender", x: 105, y: 22, w: 44, h: 44 },
    },
  };

  const genders = ["Male", "Female"];
  const raceKey = (faction, race, gender = "Male") => `${faction}:${race}:${gender}`;
  const findRace = (faction, race) => races.find((r) => r.faction === faction && r.race === race);

  return {
    races, classes, genders, rulesets, unavailableRulesets, roles, professions, secondaryProfessions,
    sheets, crops, raceKey, findRace,
  };
})();
