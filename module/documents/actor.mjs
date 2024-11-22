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
    // Data modifications in this step occur before processing embedded documents or derived data.
    // Make modifications to data here. For example:
    const actorData = this;
    const systemData = actorData.system;

    systemData.aux.showTCheaders = game.settings.get("smt-200x", "showTCheaders");

    if (actorData.type == 'character') {
      let levelMultiplier = 0.8;
      if (systemData.attributes.exp.tierTwo > 0)
        levelMultiplier = 1.0;
      if (systemData.attributes.exp.tierThree > 0)
        levelMultiplier = 1.3;

      systemData.attributes.totalexp = systemData.attributes.exp.tierOne + systemData.attributes.exp.tierTwo + systemData.attributes.exp.tierThree

      const levelsFromTierOne = Math.floor(Math.pow((systemData.attributes.exp.tierOne) / 0.8, 1 / 3));
      const levelsFromTierTwo = Math.floor(Math.pow((systemData.attributes.exp.tierTwo) / 1.0, 1 / 3));
      const levelsFromTierThree = Math.floor(Math.pow((systemData.attributes.exp.tierThree) / 1.3, 1 / 3));

      systemData.attributes.level = Math.max(levelsFromTierOne + levelsFromTierTwo + levelsFromTierThree, 1);
      systemData.attributes.expnext = Math.floor(Math.pow(systemData.attributes.level + 1, 3) * levelMultiplier);
    }


    // Loop through stats, and reset temp to 0
    for (let [key, stat] of Object.entries(systemData.stats)) {
      systemData.stats[key].temp = 0;
    }

    this.items.forEach((item) => {
      if (item.type === "armor" && item.system.equipped) {
        systemData.stats.st.temp += item.system.st || 0;
        systemData.stats.mg.temp += item.system.mg || 0;
        systemData.stats.vt.temp += item.system.vt || 0;
        systemData.stats.ag.temp += item.system.ag || 0;
        systemData.stats.lk.temp += item.system.lk || 0;
      }
    });

    // Loop through stats, and total up
    for (let [key, stat] of Object.entries(systemData.stats)) {
      systemData.stats[key].value = stat.base + stat.temp;
    }


    // Collect buff / debuff stacks
    systemData.sumRaku = systemData.raku.buff.reduce((total, num) => total + num, 0) - Math.abs(systemData.raku.debuff.reduce((total, num) => total + num, 0));
    systemData.sumTaru = systemData.taru.buff.reduce((total, num) => total + num, 0) - Math.abs(systemData.taru.debuff.reduce((total, num) => total + num, 0));
    systemData.sumSuku = systemData.suku.buff.reduce((total, num) => total + num, 0) - Math.abs(systemData.suku.debuff.reduce((total, num) => total + num, 0));
    systemData.sumMaka = systemData.maka.buff.reduce((total, num) => total + num, 0) - Math.abs(systemData.maka.debuff.reduce((total, num) => total + num, 0));

    // DEFENSES
    systemData.phydef = this.parseFormula(systemData.phydefFormula) + systemData.sumRaku;
    systemData.magdef = this.parseFormula(systemData.magdefFormula) + systemData.sumRaku;

    // INITIATIVE
    systemData.init = this.parseFormula(systemData.initFormula);

    // POWERS
    systemData.meleePower = systemData.stats.st.value + systemData.attributes.level + systemData.sumTaru;
    systemData.spellPower = systemData.stats.mg.value + systemData.attributes.level + (game.settings.get("smt-200x", "taruOnly") ? systemData.sumTaru : systemData.sumMaka);
    systemData.rangedPower = systemData.stats.ag.value + (game.settings.get("smt-200x", "addLevelToRangedPower") ? systemData.attributes.level : 0) + systemData.sumTaru;

    // Set Max HP / MP / Fate
    systemData.hp.max = (systemData.stats.vt.value + systemData.attributes.level) * systemData.hp.mult;
    systemData.mp.max = (systemData.stats.mg.value + systemData.attributes.level) * systemData.mp.mult;
    systemData.fate.max = 5 + Math.floor(systemData.stats.lk.value / 5);

    // clamp HP
    if (systemData.hp.value > systemData.hp.max) {
      systemData.hp.value = systemData.hp.max;
    } else if (systemData.hp.value < systemData.hp.min) {
      systemData.hp.value = systemData.hp.min;
    }

    // clamp MP
    if (systemData.mp.value > systemData.mp.max) {
      systemData.mp.value = systemData.mp.max;
    } else if (systemData.mp.value < systemData.mp.min) {
      systemData.mp.value = systemData.mp.min;
    }

    // clamp Fate
    if (systemData.fate.value > systemData.fate.max) {
      systemData.fate.value = systemData.fate.max;
    } else if (systemData.fate.value < systemData.fate.min) {
      systemData.fate.value = systemData.fate.min;
    }


    // Loop through stats, and add their TNs to sheet output
    for (let [key, stat] of Object.entries(systemData.stats)) {
      systemData.stats[key].tn = (stat.value * 5) + systemData.attributes.level + systemData.sumSuku;
    }

    systemData.dodgetn = 10 + systemData.stats.ag.value + systemData.sumSuku;
    systemData.talktn = 20 + (systemData.stats.lk.value * 2) + systemData.sumSuku;
  }


  prepareEmbeddedDocuments() {
    // Call the parent class to ensure other embedded documents are processed
    super.prepareEmbeddedDocuments();

    // Process non-"Skill" items first
    const nonSkills = this.items.filter(item => item.type !== "feature");
    nonSkills.forEach(item => item.prepareData());

    // Ensure the actor stats are fully prepared here
    this.prepareDerivedData(); // Ensure derived stats are finalized

    // Process "Skill" items last
    const skills = this.items.filter(item => item.type === "feature");
    skills.forEach(item => item.prepareData());
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
    systemData.phydef += physicalDefense;
    systemData.magdef += magicalDefense;
    systemData.meleePower += meleePower;
    systemData.init += initiative;
  }



  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;
    const systemData = actorData.system;

    systemData.wepA.hit = systemData.stats.ag.value;
    systemData.wepA.power = systemData.meleePower;
    systemData.wepA.type = "Demon";
    systemData.wepA.name = "Innate Weapon";

    if (systemData.autoEXP) {
      const lvl = systemData.attributes.level;
      systemData.attributes.exp.tierOne = lvl * (3 + Math.floor(lvl / 10)) * (systemData.isBoss ? lvl : 1);
      systemData.macca = systemData.attributes.exp.tierOne;
    }

    if (systemData.isBoss) {
      systemData.hp.max *= 5;
      systemData.mp.max *= 2;
    }
  }



  parseFormula(formula) {
    // Evaluate the mathematical expression
    try {
      // Use Function with an explicit Math object
      const result = new Roll(formula, this).evaluateSync().total;
      return result;
    } catch (error) {
      console.error("Error evaluating formula:", formula, error);
      return null;
    }
  }



  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    // Copy the system data (core stats) into the roll data
    const data = foundry.utils.deepClone(this.system);

    // Loop through stats, and add their TNs to sheet output
    for (let [key, stat] of Object.entries(data.stats)) {
      data.stats[key].tn = (stat.value * 5) + data.attributes.level + (data.sumSuku || 0);
    }

    // Copy stats to the top level for shorthand usage in rolls
    if (data.stats) {
      for (let [k, v] of Object.entries(data.stats)) {
        data[k] = v;
      }
    }

    // Add derived data (e.g., level) for easier access
    if (data.attributes.level) {
      data.lvl = data.attributes.level ?? 0;
    }

    return data;
  }



  applyDamage(amount, affinity = "almighty", ignoreDefense = false, pierce = false, affectsMP = false) {
    const currentHP = this.system.hp.value;
    const currentMP = this.system.mp.value
    let defense = this.system.magdef;

    if (affinity === "strike" || affinity === "gun")
      defense = this.system.phydef;

    if (ignoreDefense) defense = 0

    // Prompt for Fate points if available
    if (this.type == 'character') {
      new Dialog({
        title: "Fate Points Adjustment",
        content: `
      <p>Enter the number of Fate points to spend to reduce incoming damage:</p>
      <div class="form-group">
        <label for="fate-points">Fate Points:</label>
        <input type="number" id="fate-points" name="fate-points" value="0" min="0" />
      </div>
    `,
        buttons: {
          apply: {
            icon: '<i class="fas fa-check"></i>',
            label: "Apply",
            callback: (html) => {
              const fatePoints = parseInt(html.find('input[name="fate-points"]').val()) || 0;
              const adjustedAmount = fatePoints > 0 ? Math.floor(amount / (fatePoints + 1)) : amount;

              const finalAmount = Math.max((adjustedAmount - defense), 0);
              this._applyFinalDamage(finalAmount, affectsMP);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel"
          }
        },
        default: "apply"
      }).render(true);
    }
    else {
      const finalAmount = Math.max((amount - defense), 0);
      this._applyFinalDamage(finalAmount, affectsMP);
    }
  }

  // Helper function to apply the final damage
  _applyFinalDamage(amount, affectsMP) {
    const currentHP = this.system.hp.value;
    const currentMP = this.system.mp.value;

    if (affectsMP) {
      this.update({ "system.mp.value": currentMP - amount });
    } else {
      this.update({ "system.hp.value": currentHP - amount });
    }

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `Applied ${amount} damage to ${this.name}.`
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
