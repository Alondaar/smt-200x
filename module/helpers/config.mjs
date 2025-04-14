export const SMT_X = {};

/**
 * The set of Ability Scores used within the system.
 * @type {Object}
 */
SMT_X.stats = {
  st: 'SMT_X.Stat.st.long',
  mg: 'SMT_X.Stat.mg.long',
  vt: 'SMT_X.Stat.vt.long',
  ag: 'SMT_X.Stat.ag.long',
  lk: 'SMT_X.Stat.lk.long'
};

SMT_X.statAbbreviations = {
  st: 'SMT_X.Stat.st.abbr',
  mg: 'SMT_X.Stat.mg.abbr',
  vt: 'SMT_X.Stat.vt.abbr',
  ag: 'SMT_X.Stat.ag.abbr',
  lk: 'SMT_X.Stat.lk.abbr'
};

SMT_X.weaponChoices = {
  x: 'SMT_X.WeaponChoices.x',
  a: 'SMT_X.WeaponChoices.a',
  b: 'SMT_X.WeaponChoices.b'
}

SMT_X.attackTypes = {
  none: 'None',
  melee: 'Melee Attack',
  ranged: 'Ranged Attack',
  magic: 'Magic Attack'
}

SMT_X.tns = {
  auto: 'Auto',
  st: 'SMT_X.Stat.st.long',
  mg: 'SMT_X.Stat.mg.long',
  vt: 'SMT_X.Stat.vt.long',
  ag: 'SMT_X.Stat.ag.long',
  lk: 'SMT_X.Stat.lk.long',
  dodge: 'Dodge',
  talk: 'Talk',
  fifty: '50%'
};

SMT_X.powers = {
  none: 'None',
  melee: 'Melee',
  ranged: 'Ranged',
  spell: 'Spell'
};

SMT_X.powerDice = {
  none: 'Zero',
  match: 'Match',
  melee: 'Melee',
  ranged: 'Ranged',
  spell: 'Spell',
};

SMT_X.affinityIcons = {
  strike: "icons/skills/melee/blade-tip-orange.webp",
  gun: "icons/skills/ranged/cannon-barrel-firing-yellow.webp",
  fire: "icons/magic/fire/projectile-fireball-smoke-strong-orange.webp",
  ice: "icons/magic/water/barrier-ice-crystal-wall-faceted-light.webp",
  elec: "icons/magic/lightning/bolt-strike-streak-yellow.webp",
  force: "icons/magic/air/air-burst-spiral-teal-green.webp",
  expel: "icons/magic/light/explosion-star-glow-orange.webp",
  death: "icons/magic/death/skull-energy-light-purple.webp",
  mind: "icons/skills/wounds/anatomy-organ-brain-pink-red.webp",
  nerve: "icons/magic/control/debuff-chains-ropes-net-white.webp",
  curse: "icons/magic/unholy/energy-smoke-pink.webp",
  magic: "icons/magic/symbols/triangle-glowing-green.webp"
};

SMT_X.charAffinityIcons = {
  normal: "-",
  resist: "fa-shield-halved",
  weak: "fa-burst",
  null: `<i class="fa-solid fa-shield"></i>`,
  drain: "fa-shield-heart",
  repel: "fa-shield-virus"
};

SMT_X.charAffinityAbbr = {
  normal: "SMT_X.CharAffinityShort.normal",
  resist: "SMT_X.CharAffinityShort.resist",
  weak: "SMT_X.CharAffinityShort.weak",
  null: "SMT_X.CharAffinityShort.null",
  drain: "SMT_X.CharAffinityShort.drain",
  repel: "SMT_X.CharAffinityShort.repel"
};

SMT_X.affinities = {
  strike: 'SMT_X.Affinity.strike',
  gun: 'SMT_X.Affinity.gun',
  fire: 'SMT_X.Affinity.fire',
  ice: 'SMT_X.Affinity.ice',
  elec: 'SMT_X.Affinity.elec',
  force: 'SMT_X.Affinity.force',
  expel: 'SMT_X.Affinity.expel',
  death: 'SMT_X.Affinity.death',
  mind: 'SMT_X.Affinity.mind',
  nerve: 'SMT_X.Affinity.nerve',
  curse: 'SMT_X.Affinity.curse',
  almighty: 'SMT_X.Affinity.almighty',
  recovery: 'SMT_X.Affinity.recovery',
  none: 'SMT_X.Affinity.none',
  magic: 'SMT_X.Affinity.magic'
}

SMT_X.charAffinity = {
  none: 'SMT_X.CharAffinity.none',
  normal: 'SMT_X.CharAffinity.normal',
  weak: 'SMT_X.CharAffinity.weak',
  resist: 'SMT_X.CharAffinity.resist',
  null: 'SMT_X.CharAffinity.null',
  drain: 'SMT_X.CharAffinity.drain',
  repel: 'SMT_X.CharAffinity.repel'
}

SMT_X.badStatusList = {
  NONE: "SMT_X.AffinityBS.NONE",
  DEAD: "SMT_X.AffinityBS.DEAD",
  STONE: "SMT_X.AffinityBS.STONE",
  FLY: "SMT_X.AffinityBS.FLY",
  PARALYZE: "SMT_X.AffinityBS.PARALYZE",
  CHARM: "SMT_X.AffinityBS.CHARM",
  POISON: "SMT_X.AffinityBS.POISON",
  CLOSE: "SMT_X.AffinityBS.CLOSE",
  BIND: "SMT_X.AffinityBS.BIND",
  FREEZE: "SMT_X.AffinityBS.FREEZE",
  SLEEP: "SMT_X.AffinityBS.SLEEP",
  PANIC: "SMT_X.AffinityBS.PANIC",
  SHOCK: "SMT_X.AffinityBS.SHOCK",
  HAPPY: "SMT_X.AffinityBS.HAPPY",
  BS: "SMT_X.AffinityBS.BS"
}

SMT_X.gems = {
  diamond: "SMT.gems.diamond",
  pearl: "SMT.gems.pearl",
  sapphire: "SMT.gems.sapphire",
  emerald: "SMT.gems.emerald",
  ruby: "SMT.gems.ruby",
  jade: "SMT.gems.jade",
  opal: "SMT.gems.opal",
  amethyst: "SMT.gems.amethyst",
  agate: "SMT.gems.agate",
  turquoise: "SMT.gems.turquoise",
  garnet: "SMT.gems.garnet",
  onyx: "SMT.gems.onyx",
  coral: "SMT.gems.coral",
  aquamarine: "SMT.gems.aquamarine",
}

SMT_X.gemIcons = {
  diamond: "icons/commodities/gems/gem-faceted-radiant-teal.webp",
  pearl: "icons/commodities/gems/pearl-white-oval.webp",
  sapphire: "icons/commodities/gems/gem-faceted-radiant-blue.webp",
  emerald: "icons/commodities/gems/gem-cut-table-green.webp",
  ruby: "icons/commodities/gems/gem-faceted-radiant-red.webp",
  jade: "icons/commodities/gems/gem-raw-rough-green-yellow.webp",
  opal: "icons/commodities/gems/pearl-natural.webp",
  amethyst: "icons/commodities/gems/gem-cut-faceted-square-purple.webp",
  agate: "icons/commodities/gems/gem-faceted-octagon-yellow.webp",
  turquoise: "icons/commodities/gems/pearl-turquoise.webp",
  garnet: "icons/commodities/gems/gem-rough-navette-red.webp",
  onyx: "icons/commodities/gems/gem-faceted-round-black.webp",
  coral: "icons/commodities/gems/pearl-purple-rough.webp",
  aquamarine: "icons/commodities/gems/gem-shattered-blue.webp",
}



// ======================================
//       Tokyo Conception Lists
// ======================================
SMT_X.affinities_TC = {
  strike: 'SMT_X.Affinity_TC.strike',
  gun: 'SMT_X.Affinity.gun',
  fire: 'SMT_X.Affinity.fire',
  ice: 'SMT_X.Affinity.ice',
  elec: 'SMT_X.Affinity.elec',
  force: 'SMT_X.Affinity.force',
  expel: 'SMT_X.Affinity_TC.expel',
  death: 'SMT_X.Affinity_TC.death',
  mind: 'SMT_X.Affinity.mind',
  nerve: 'SMT_X.Affinity.nerve',
  curse: 'SMT_X.Affinity_TC.curse',
  almighty: 'SMT_X.Affinity.almighty',
  recovery: 'SMT_X.Affinity.recovery',
  none: 'SMT_X.Affinity.none',
  magic: 'SMT_X.Affinity.magic'
}

SMT_X.charAffinity_TC = {
  none: 'SMT_X.CharAffinity.none',
  normal: 'SMT_X.CharAffinity.normal',
  weak: 'SMT_X.CharAffinity.weak',
  resist: 'SMT_X.CharAffinity_TC.resist',
  null: 'SMT_X.CharAffinity.null',
  drain: 'SMT_X.CharAffinity.drain',
  repel: 'SMT_X.CharAffinity.repel'
}

SMT_X.badStatusList_TC = {
  NONE: "SMT_X.AffinityBS_TC.NONE",
  DEAD: "SMT_X.AffinityBS_TC.DEAD",
  STONE: "SMT_X.AffinityBS_TC.STONE",
  FLY: "SMT_X.AffinityBS_TC.FLY",
  PARALYZE: "SMT_X.AffinityBS_TC.PARALYZE",
  CHARM: "SMT_X.AffinityBS_TC.CHARM",
  POISON: "SMT_X.AffinityBS_TC.POISON",
  CLOSE: "SMT_X.AffinityBS_TC.CLOSE",
  BIND: "SMT_X.AffinityBS_TC.BIND",
  FREEZE: "SMT_X.AffinityBS_TC.FREEZE",
  SLEEP: "SMT_X.AffinityBS_TC.SLEEP",
  PANIC: "SMT_X.AffinityBS_TC.PANIC",
  SHOCK: "SMT_X.AffinityBS_TC.SHOCK",
  HAPPY: "SMT_X.AffinityBS_TC.HAPPY",
  BS: "SMT_X.AffinityBS_TC.BS"
}