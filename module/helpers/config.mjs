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
  lk: 'SMT_X.Stat.lk.long',
};

SMT_X.statAbbreviations = {
  st: 'SMT_X.Stat.st.abbr',
  mg: 'SMT_X.Stat.mg.abbr',
  vt: 'SMT_X.Stat.vt.abbr',
  ag: 'SMT_X.Stat.ag.abbr',
  lk: 'SMT_X.Stat.lk.abbr',
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
  none: 'SMT_X.Affinity.none'
}

SMT_X.weaponChoices = {
  x: 'SMT_X.WeaponChoices.x',
  a: 'SMT_X.WeaponChoices.a',
  b: 'SMT_X.WeaponChoices.b'
}

SMT_X.charAffinity = {
  normal: 'SMT_X.CharAffinity.normal',
  resist: 'SMT_X.CharAffinity.resist',
  weak: 'SMT_X.CharAffinity.weak',
  null: 'SMT_X.CharAffinity.null',
  drain: 'SMT_X.CharAffinity.drain',
  repel: 'SMT_X.CharAffinity.repel'
}

SMT_X.badStatusList = {
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
  HAPPY: "SMT_X.AffinityBS.HAPPY"
}