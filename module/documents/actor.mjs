/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class SMTXActor extends Actor {
  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.

    // Make modifications to data here. For example:
    const actorData = this;
    const systemData = actorData.system;

    const levelMultiplier = 1.0;
    systemData.attributes.level = Math.floor(Math.pow((systemData.attributes.exp + 1) / levelMultiplier, 1 / 3));
    systemData.attributes.expnext = Math.floor(Math.pow(systemData.attributes.level + 1, 3) * levelMultiplier);

    // Collect buff / debuff stacks
    const sumRaku = systemData.raku.buff.reduce((total, num) => total + num, 0) - Math.abs(systemData.raku.debuff.reduce((total, num) => total + num, 0));
    const sumTaru = systemData.taru.buff.reduce((total, num) => total + num, 0) - Math.abs(systemData.taru.debuff.reduce((total, num) => total + num, 0));
    const sumSuku = systemData.suku.buff.reduce((total, num) => total + num, 0) - Math.abs(systemData.suku.debuff.reduce((total, num) => total + num, 0));
    const sumMaka = systemData.maka.buff.reduce((total, num) => total + num, 0) - Math.abs(systemData.maka.debuff.reduce((total, num) => total + num, 0));

    // Calculate defense based on armor and if one is a demon
    // Humans = VT, Demons = VT+L
    // TC = AVERAGE(VT,L) for all characters
    systemData.phydef = systemData.stats.vt.value + sumRaku;
    systemData.magdef = systemData.stats.vt.value + sumRaku;

    // INITIATIVE
    systemData.init = Math.floor((systemData.attributes.level + systemData.stats.ag.value) / 2);

    // Calculate powers
    systemData.meleePower = { "value": 0, "roll": "1d10x" }
    systemData.meleePower.value = systemData.stats.st.value + systemData.attributes.level + sumTaru;

    systemData.spellPower = { "value": 0, "roll": "1d10x" }
    systemData.spellPower.value = systemData.stats.mg.value + systemData.attributes.level + sumTaru;

    systemData.rangedPower = { "value": 0, "roll": "1d10x" }
    systemData.rangedPower.value = systemData.stats.ag.value + sumMaka;

    // Loop through stats, and add their TNs to our sheet output.
    for (let [key, stat] of Object.entries(systemData.stats)) {
      systemData.stats[key].tn = (stat.value * 5) + systemData.attributes.level + sumSuku;
    }

    systemData.dodgetn = 10 + systemData.stats.ag.value + sumSuku;
    systemData.talktn = 20 + (systemData.stats.lk.value * 2) + sumSuku;

    // get hp/mp multipliers
    systemData.hp.max = (systemData.stats.vt.value + systemData.attributes.level) * systemData.hp.mult;
    systemData.mp.max = (systemData.stats.mg.value + systemData.attributes.level) * systemData.mp.mult;
    systemData.fate.max = 5 + Math.floor(systemData.stats.lk.value / 5);

    // clamp HP
    if (systemData.hp.value > systemData.hp.max) {
      systemData.hp.value = systemData.hp.max;
    } else if (systemData.hp.value < systemData.hp.min) {
      systemData.hp.value = systemData.hp.min;
    }
  }

  /**
   * @override
   * Augment the actor source data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.smt200x || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;
    const systemData = actorData.system;

    // Start with base values
    let physicalDefense = 0;
    let magicalDefense = 0;
    let meleePower = 0;
    let initiative = 0;

    // Add defense bonuses from equipped armor
    this.items.forEach((item) => {
      if (item.type === "armor" && item.system.equipped) {
        physicalDefense += item.system.phydef || 0;
        magicalDefense += item.system.magdef || 0;
        meleePower += item.system.meleePower || 0;
        initiative += item.system.init || 0;
      }
    });

    // Update the derived defense attribute
    this.system.phydef += physicalDefense;
    this.system.magdef += magicalDefense;
    this.system.meleePower.value += meleePower;
    this.system.init += initiative;

    systemData.meleePower.roll = systemData.powerDice.melee + "d10x + " + systemData.meleePower.value;
    systemData.spellPower.roll = systemData.powerDice.spell + "d10x + " + systemData.spellPower.value;
    systemData.rangedPower.roll = systemData.powerDice.ranged + "d10x + " + systemData.rangedPower.value;
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const data = { ...this.system };

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'character') return;

    // Copy the stats to the top level, so that rolls can use
    // formulas like `@st + 4`.
    if (data.stats) {
      for (let [k, v] of Object.entries(data.stats)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    // Add level for easier access, or fall back to 0.
    if (data.attributes.level) {
      data.lvl = data.attributes.level ?? 0;
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== 'npc') return;

    // Process additional NPC data here.
  }

  applyDamage(amount, affinity = "almighty", ignoreDefense = false, pierce = false, affectsMP = false) {
    const currentHP = this.system.hp.value;
    const currentMP = this.system.mp.value
    let defense = this.system.magdef;

    if (affinity === "strike" || affinity === "gun")
      defense = this.system.phydef;

    if (ignoreDefense) defense = 0

    if (affectsMP)
      this.update({ "system.mp.value": currentMP - Math.max((amount - defense), 0) });
    else
      this.update({ "system.hp.value": currentHP - Math.max((amount - defense), 0) });
    //ui.notifications.info(`Applied ${Math.max((amount - defense), 0)} damage to ${this.name}`);
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `Applied ${Math.max((amount - defense), 0)} damage`
    });
  }

  applyHeal(amount, affectsMP = false) {
    const currentHP = this.system.hp.value;
    const currentMP = this.system.mp.value

    if (affectsMP)
      this.update({ "system.mp.value": currentMP + amount });
    else
      this.update({ "system.hp.value": currentHP + amount });
    //ui.notifications.info(`Applied ${amount} healing to ${this.name}`);
  }

  dekaja() {
    this.update({
      "system.suku.buff": [0, 0, 0, 0],
      "system.taru.buff": [0, 0, 0, 0],
      "system.raku.buff": [0, 0, 0, 0],
      "system.maka.buff": [0, 0, 0, 0],
    });
  }

  dekunda() {
    this.update({
      "system.suku.debuff": [0, 0, 0, 0],
      "system.taru.debuff": [0, 0, 0, 0],
      "system.raku.debuff": [0, 0, 0, 0],
      "system.maka.debuff": [0, 0, 0, 0],
    });
  }

  clearAllBuffs() {
    this.dekaja();
    this.dekunda();
  }

  applyBuffs(buffsArray, applyTo) {
    const updateBuffs = (type, field) => {
      let currentValues = this.system[type][field];
      const buffsArrayCopy = [...buffsArray];
      for (let i = 0; i < 4; i++) {
        if (currentValues[i] === 0) {
          currentValues[i] = buffsArrayCopy.shift();
        } else {
          continue;
        }
      }
      this.update({
        [`system.${type}.${field}`]: currentValues,
      });
    };

    if (applyTo.sukukaja) {
      updateBuffs("suku", "buff");
    }
    if (applyTo.tarukaja) {
      updateBuffs("taru", "buff");
    }
    if (applyTo.rakukaja) {
      updateBuffs("raku", "buff");
    }
    if (applyTo.makakaja) {
      updateBuffs("maka", "buff");
    }
    if (applyTo.sukunda) {
      updateBuffs("suku", "debuff");
    }
    if (applyTo.tarunda) {
      updateBuffs("taru", "debuff");
    }
    if (applyTo.rakunda) {
      updateBuffs("raku", "debuff");
    }
    if (applyTo.makunda) {
      updateBuffs("maka", "debuff");
    }
  }
}
