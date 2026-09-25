// All spelregler och konfiguration på ett ställe. Rätta här om WoW Forever avviker.

window.WF_CONFIG = {
  SUPABASE_URL: 'https://kpaolyovfybxedgaigvp.supabase.co',
  SUPABASE_KEY: 'sb_publishable_9Oup-6p4XC7tYi428XUxTA_KcQbyDpT',
  DISCORD_URL: '', // Klistra in Discord-invite här när servern finns.
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

  const rulesetInfo = {
    Normal: 'Äventyra och slåss mot monster, PvP när du själv vill.',
    PvP: 'Nästan alltid i risk att bli attackerad av andra spelare.',
    Roleplay: 'Strikta namn- och beteenderegler för inlevelse.',
    Hardcore: 'Permanent död. Döda karaktärer kan flyttas till andra servertyper.',
  };

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
  };

  const crops = {
    ruleset: {
      Normal: { sheet: 'rulesets', x: 94, y: 100, w: 56, h: 56 },
      PvP: { sheet: 'rulesets', x: 330, y: 100, w: 56, h: 56 },
      Roleplay: { sheet: 'rulesets', x: 564, y: 100, w: 56, h: 56 },
      Hardcore: { sheet: 'rulesets', x: 800, y: 100, w: 56, h: 56 },
    },
    class: Object.fromEntries(
      Object.entries({
        Druid: 167, Hunter: 242, Mage: 312, Paladin: 395, Priest: 472,
        Rogue: 546, Shaman: 629, Warlock: 721, Warrior: 809,
      }).map(([name, cx]) => [name, { sheet: 'classes', x: cx - 21, y: 72, w: 42, h: 42 }])
    ),
    // Nyckel: "Faction:Race". Ordningen i bilden är uppifrån och ned.
    race: (() => {
      const alliance = ['Human', 'Dwarf', 'Night Elf', 'Gnome', 'Skyborne'];
      const horde = ['Orc', 'Undead', 'Tauren', 'Troll', 'Skyborne'];
      const tops = [155, 292, 430, 567, 704];
      const out = {};
      alliance.forEach((r, i) => { out[`Alliance:${r}`] = { sheet: 'races', x: 353, y: tops[i] + 6, w: 104, h: 104 }; });
      horde.forEach((r, i) => { out[`Horde:${r}`] = { sheet: 'races', x: 617, y: tops[i] + 6, w: 104, h: 104 }; });
      return out;
    })(),
  };

  const raceKey = (faction, race) => `${faction}:${race}`;
  const findRace = (faction, race) => races.find((r) => r.faction === faction && r.race === race);

  return {
    races, classes, rulesets, unavailableRulesets, roles, rulesetInfo, professions, secondaryProfessions,
    sheets, crops, raceKey, findRace,
  };
})();
