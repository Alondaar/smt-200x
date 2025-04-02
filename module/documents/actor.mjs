/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class SMTXActor extends Actor {
  /** @override */
  prepareData() {
    super.prepareData();
  }


  /** @override */
  prepareBaseData() {
    const systemData = this.system;
    systemData.aux.showTCheaders = game.settings.get("smt-200x", "showTCheaders");

    this._initializeBaseStats(systemData);

    if (this.type === 'character') {
      this._calculateCharacterLevel(systemData);
    }
  }


  /** @override */
  prepareEmbeddedDocuments() {
    super.prepareEmbeddedDocuments();

    this._applyEquippedItems();

    this._applyBadStatusEffects();
  }


  /** @override */
  prepareDerivedData() {
    const systemData = this.system;

    ["st", "mg", "vt", "ag", "lk"].forEach(stat => {
      systemData.stats[stat].value += systemData.stats[stat].temp ?? 0;
    });

    this._calculateBuffEffects(systemData);
    this._clampStats(systemData);

    const affinityPriority = {
      normal: 0,
      weak: 1,
      resist: 2,
      null: 3,
      drain: 4,
      repel: 5
    };

    Object.keys(systemData.affinityOverride).forEach(affinityType => {
      systemData.affinityFinal[affinityType] = systemData.affinityOverride[affinityType];
    });

    this._setDerivedBSAffinities(systemData);
    this._displayAffinity(systemData);
    this._displayAffinityBS(systemData);
    this._calculateCombatStats(systemData);
    this._calculateResources(systemData);
    this._clampValues(systemData);
    this._prepareNpcData(systemData)

    // Notify all items after final actor data is set
    this.items.forEach(item => {
      if (item.prepareDerivedData) {
        item.prepareDerivedData();
      }
    });
  }


  // =============================
  //  HELPER METHODS
  // =============================
  _initializeBaseStats(systemData) {
    for (let [key, stat] of Object.entries(systemData.stats)) {
      systemData.stats[key].temp = 0;
      systemData.stats[key].value = stat.base ?? 0;
      systemData.stats[key].tn = 0;
    }

    systemData.phydef = 0;
    systemData.magdef = 0;
    systemData.meleePower = 0;
    systemData.rangedPower = 0;
    systemData.spellPower = 0;
    systemData.init = 0;
    systemData.dodgetn = 0;
    systemData.talktn = 0;
    systemData.affinityFinal = foundry.utils.deepClone(systemData.affinity);
    systemData.affinityBSFinal = foundry.utils.deepClone(systemData.affinityBS);

    systemData.affinityOverride = {};
    systemData.affinityBSOverride = {};
  }


  _calculateCharacterLevel(systemData) {
    const tierMultipliers = { tierOne: 0.8, tierTwo: 1.0, tierThree: 1.3 };
    const totalExp = systemData.attributes.exp.tierOne + systemData.attributes.exp.tierTwo + systemData.attributes.exp.tierThree;

    let currentLevel = 1;
    let nextThreshold = 0;
    let currentMultiplier = tierMultipliers.tierOne;

    if (systemData.attributes.exp.tierTwo > 0) currentMultiplier = tierMultipliers.tierTwo;
    if (systemData.attributes.exp.tierThree > 0) currentMultiplier = tierMultipliers.tierThree;

    while (true) {
      const threshold = Math.floor(Math.pow(currentLevel + 1, 3) * currentMultiplier);
      if (totalExp < threshold) {
        nextThreshold = threshold;
        break;
      }
      currentLevel++;
    }

    systemData.attributes.level = currentLevel;
    systemData.attributes.totalexp = totalExp;
    systemData.attributes.expnext = nextThreshold - totalExp;
  }


  _applyEquippedItems() {
    const systemData = this.system;
    const affinityPriority = {
      normal: 0,
      weak: 1,
      resist: 2,
      null: 3,
      drain: 4,
      repel: 5
    };

    this.items.forEach(item => {
      if (item.type === "armor" && item.system.equipped) {

        ["st", "mg", "vt", "ag", "lk"].forEach(stat => {
          systemData.stats[stat].temp += item.system[stat] ?? 0;
        });

        systemData.phydef += item.system.phydef ?? 0;
        systemData.magdef += item.system.magdef ?? 0;
        systemData.meleePower += item.system.meleePower ?? 0;
        systemData.rangedPower += item.system.rangedPower ?? 0;
        systemData.spellPower += item.system.spellPower ?? 0;
        systemData.init += item.system.init ?? 0;

        if (!item.system.changeAffinity) return;

        Object.keys(systemData.affinity).forEach(affinityType => {
          if (item.system.affinity[affinityType] == "none") return;
          const itemAffinity = item.system.affinity[affinityType];
          const currentAffinity = systemData.affinityFinal[affinityType];
          if (affinityPriority[itemAffinity] > affinityPriority[currentAffinity]) {
            systemData.affinityFinal[affinityType] = itemAffinity;
          }
        });

        Object.keys(systemData.affinityBS).forEach(bsType => {
          if (item.system.affinityBS[bsType] == "none") return;
          const itemAffinityBS = item.system.affinityBS[bsType];
          const currentAffinityBS = systemData.affinityBSFinal[bsType];
          if (affinityPriority[itemAffinityBS] > affinityPriority[currentAffinityBS]) {
            systemData.affinityBSFinal[bsType] = itemAffinityBS;
          }
        });
      }
    });


    this.items.forEach(item => {
      if (item.type === "passive") {
        if (!item.system.changeAffinity) return;

        Object.keys(systemData.affinity).forEach(affinityType => {
          if (item.system.affinity[affinityType] == "none") return;
          const itemAffinity = item.system.affinity[affinityType];
          const currentAffinity = systemData.affinityFinal[affinityType];
          if (affinityPriority[itemAffinity] > affinityPriority[currentAffinity]) {
            systemData.affinityFinal[affinityType] = itemAffinity;
          }
        });

        Object.keys(systemData.affinityBS).forEach(bsType => {
          if (item.system.affinityBS[bsType] == "none") return;
          const itemAffinityBS = item.system.affinityBS[bsType];
          const currentAffinityBS = systemData.affinityBSFinal[bsType];
          if (affinityPriority[itemAffinityBS] > affinityPriority[currentAffinityBS]) {
            systemData.affinityBSFinal[bsType] = itemAffinityBS;
          }
        });
      }
    });
  }



  _applyBadStatusEffects() {
    const systemData = this.system;
    switch (systemData.badStatus) {
      case "FLY":
        for (let [key, stat] of Object.entries(systemData.stats)) {
          if (key === "ag") continue;
          systemData.stats[key].value = 1;
        }
        break;
      case "FREEZE":
        systemData.affinityFinal.strike = systemData.affinityFinal.strike === "weak" ? "weak" : "normal";
        systemData.affinityFinal.gun = systemData.affinityFinal.gun === "weak" ? "weak" : "normal";
        break;
      case "STONE":
        systemData.affinityFinal = {
          "strike": "normal",
          "gun": "normal",
          "fire": "resist",
          "ice": "resist",
          "elec": "resist",
          "force": "resist",
          "expel": "resist",
          "death": "resist",
          "mind": "resist",
          "nerve": "resist",
          "curse": "resist",
          "almighty": "normal",
          "magic": "normal"
        };
        break;
      default:
        break;
    }
  }



  _setDerivedBSAffinities(systemData) {
    // Define the mapping: each BS type is associated with a primary affinity type.
    const bsMapping = {
      "STONE": "death",
      "FLY": "death",
      "PARALYZE": "nerve",
      "BIND": "nerve",
      "CHARM": "mind",
      "SLEEP": "mind",
      "PANIC": "mind",
      "HAPPY": "mind",
      "POISON": "curse",
      "CLOSE": "curse",
      "FREEZE": "ice",
      "SHOCK": "elec"
    };

    // Loop over each BS type in the mapping.
    for (let bsType in bsMapping) {
      // Conditionally skip processing SHOCK if the setting is false.
      if (bsType === "SHOCK" && !game.settings.get("smt-200x", "showTCheaders"))
        continue;
      if (bsType === "FLY") // Turns out you can't be immune to it
        continue;

      const primaryType = bsMapping[bsType];
      const primaryAffinity = systemData.affinityFinal[primaryType] || "normal";
      // If the primary affinity is null, repel, or drain, set the BS affinity to "null".
      if (["null", "repel", "drain"].includes(primaryAffinity.toLowerCase())) {
        systemData.affinityBSFinal[bsType] = "null";
      }
    }
  }



  _displayAffinity(systemData) {
    // Define the group order (all in lowercase for consistency)
    const groupOrder = ["repel", "drain", "null", "resist", "weak"];
    // Object to hold arrays of affinity types keyed by their effect value
    const groups = {};

    // Iterate over each affinity type in the input object.
    for (let type in systemData.affinityFinal) {
      const value = systemData.affinityFinal[type];
      if (value === "normal") continue; // Skip normal values

      // Initialize the group if it doesn't exist
      if (!groups[value]) groups[value] = [];
      groups[value].push(type);
    }

    // Build the final output string in the desired group order.
    const outputGroups = groupOrder.reduce((acc, effectValue) => {
      if (groups[effectValue] && groups[effectValue].length) {
        // Capitalize the effect label (e.g., "resist" -> "Resist")
        const effectLabel = effectValue.charAt(0).toUpperCase() + effectValue.slice(1);
        // Capitalize each affinity type and join them with " / "
        const typesStr = groups[effectValue]
          .map(type => type.charAt(0).toUpperCase() + type.slice(1))
          .join(", ");
        acc.push(`${effectLabel} ${typesStr}`);
      }
      return acc;
    }, []);

    // Join groups with "; " to create the final condensed string.
    systemData.displayAffinity = outputGroups.join("; ");
  }



  _displayAffinityBS(systemData) {
    // Define the group order (all in lowercase for consistency)
    const groupOrder = ["null", "resist", "weak"];
    // Object to hold arrays of affinity types keyed by their effect value
    const groups = {};

    // Iterate over each affinity type in the input object.
    for (let type in systemData.affinityBSFinal) {
      const value = systemData.affinityBSFinal[type];
      if (value === "normal") continue; // Skip normal values

      // Initialize the group if it doesn't exist
      if (!groups[value]) groups[value] = [];
      groups[value].push(type);
    }

    // Build the final output string in the desired group order.
    const outputGroups = groupOrder.reduce((acc, effectValue) => {
      if (groups[effectValue] && groups[effectValue].length) {
        // Capitalize the effect label (e.g., "resist" -> "Resist")
        const effectLabel = effectValue.charAt(0).toUpperCase() + effectValue.slice(1);
        // Capitalize each affinity type and join them with " / "
        const typesStr = groups[effectValue]
          .map(type => type.charAt(0) + type.slice(1).toLowerCase())
          .join(", ");
        acc.push(`${effectLabel} ${typesStr}`);
      }
      return acc;
    }, []);

    // Join groups with "; " to create the final condensed string.
    systemData.displayAffinityBS = outputGroups.join("; ");
  }



  _calculateBuffEffects(systemData) {
    ["raku", "taru", "suku", "maka"].forEach(buff => {
      systemData[`sum${buff.charAt(0).toUpperCase() + buff.slice(1)}`] =
        systemData.buffs[buff] - Math.abs(systemData.debuffs[buff]);
    });
  }



  _calculateCombatStats(systemData) {
    // Compute final stats with buffs
    const phyDefFormula = this.parseFormula(systemData.human ? game.settings.get("smt-200x", "phyDefHuman") : game.settings.get("smt-200x", "phyDefDemon"), systemData);
    const magDefFormula = this.parseFormula(systemData.human ? game.settings.get("smt-200x", "magDefHuman") : game.settings.get("smt-200x", "magDefDemon"), systemData);
    const initFormula = this.parseFormula(game.settings.get("smt-200x", "initFormula"), systemData);

    systemData.phydef += phyDefFormula + systemData.sumRaku;
    systemData.magdef += magDefFormula + systemData.sumRaku;
    systemData.init += initFormula;

    // Compute Power stats
    systemData.meleePower += systemData.stats.st.value + systemData.attributes.level + systemData.sumTaru;
    systemData.rangedPower += systemData.stats.ag.value +
      (game.settings.get("smt-200x", "addLevelToRangedPower") ? systemData.attributes.level : 0) +
      systemData.sumTaru;
    systemData.spellPower += systemData.stats.mg.value + systemData.attributes.level +
      (game.settings.get("smt-200x", "taruOnly") ? systemData.sumTaru : systemData.sumMaka);

    // Compute TN values // TODO, split this into a tnmod field too for better chat-auditing
    for (let [key, stat] of Object.entries(systemData.stats)) {
      systemData.stats[key].tn += (stat.value * 5) + systemData.attributes.level + systemData.sumSuku + systemData.quickModTN;
    }

    systemData.dodgetn += 10 + systemData.stats.ag.value + systemData.sumSuku + systemData.quickModTN;
    systemData.talktn += 20 + (systemData.stats.lk.value * 2) + systemData.sumSuku + systemData.quickModTN;
  }



  _calculateResources(systemData) {
    const hpFormula = this.parseFormula(game.settings.get("smt-200x", "hpFormula"), systemData);
    const mpFormula = this.parseFormula(game.settings.get("smt-200x", "mpFormula"), systemData);
    const fateFormula = this.parseFormula(game.settings.get("smt-200x", "fateFormula"), systemData);

    systemData.hp.max = (hpFormula) * systemData.hp.mult;
    systemData.mp.max = (mpFormula) * systemData.mp.mult;
    systemData.fate.max = fateFormula + (systemData.fate?.maxMod ? systemData.fate.maxMod : 0);

    if (systemData.isBoss) {
      systemData.hp.max *= 5;
      systemData.mp.max *= 2;
    }
  }



  _clampStats(systemData) {
    const STAT_CAP = 40;
    for (let [key, stat] of Object.entries(systemData.stats)) {
      systemData.stats[key].value = Math.min(STAT_CAP, systemData.stats[key].value);
    }
  }



  _clampValues(systemData) {
    systemData.hp.value = Math.min(systemData.hp.value, systemData.hp.max);
    systemData.mp.value = Math.min(systemData.mp.value, systemData.mp.max);
    systemData.fate.value = Math.min(systemData.fate.value, systemData.fate.max);
  }



  _prepareCharacterData(systemData) {
    if (this.type !== 'character') return;
  }



  _prepareNpcData(systemData) {
    if (this.type !== 'npc') return;
    systemData.wepA.hit = systemData.stats.ag.value;
    systemData.wepA.power = systemData.meleePower;
    systemData.wepA.type = "Demon";
    systemData.wepA.name = "Innate Weapon";

    if (systemData.autoEXP) {
      const lvl = systemData.attributes.level;
      systemData.attributes.exp.tierOne = lvl * (3 + Math.floor(lvl / 10)) * (systemData.isBoss ? lvl : 1);
      systemData.macca = systemData.attributes.exp.tierOne;
    }
  }



  parseFormula(formula, systemData) {
    try {
      const result = new Roll(formula, systemData).evaluateSync({ minimize: true }).total;
      return result;
    } catch (error) {
      console.error("Error evaluating formula:", formula, error);
      return 0;
    }
  }



  getRollData() {
    // Copy the system data (core stats) into the roll data
    const data = foundry.utils.deepClone(this.system);

    // Copy stats to the top level for shorthand usage in rolls
    if (data.stats) {
      for (let [key, value] of Object.entries(data.stats)) {
        data[key] = value;
      }
    }

    // Add derived data (e.g., level) for easier access
    if (data.attributes.level) {
      data.lvl = data.attributes.level ?? 0;
    }

    return data;
  }



  async applyDamage(amount, mult, affinity = "almighty", ignoreDefense = false, halfDefense = false, crit = false, affectsMP = false, lifedrain = 0, manadrain = 0, attackerTokenID = null, attackerActorID = null) {
    // Save the actor's original HP
    const oldHP = this.system.hp.value;

    // 1. Determine base defense based on the incoming affinity.
    let defense = this.system.magdef;
    if (affinity === "strike" || affinity === "gun") {
      defense = this.system.phydef;
    }
    // 2. Prompt for Fate Points, an Affinity Override, and Additional Defense Modifier.
    let fatePoints = 0, defenseBonus = 0, affinityOverride = "";
    if (this.type === 'character' || game.settings.get("smt-200x", "fateForNPCs") || this.system.allowFate) {
      const dialogData = await new Promise((resolve) => {
        new Dialog({
          title: "Damage Adjustment",
          content: `
          <form>
            <div class="form-group">
              <label for="fate-points">Fate Points to spend:</label>
              <input type="number" id="fate-points" name="fate-points" value="0" min="0" style="width: 100%;" />
            </div>
            <div class="form-group">
              <label for="affinity-override">Affinity Override:</label>
              <select id="affinity-override" name="affinity-override" style="width: 100%;">
                <option value="${this.system.affinityFinal[affinity]}">-- Use Default (${this.system.affinityFinal[affinity]})--</option>
                <option value="normal">Normal</option>
                <option value="weak">Weak</option>
                <option value="resist">Resist</option>
                <option value="null">Null</option>
                <option value="drain">Drain</option>
                <option value="repel">Repel</option>
              </select>
            </div>
            <div class="form-group">
              <label for="defense-modifier">Additional Defense Modifier:</label>
              <input type="number" id="defense-modifier" name="defense-modifier" value="0" style="width: 100%;" />
            </div>
          </form>
        `,
          buttons: {
            apply: {
              icon: '<i class="fas fa-check"></i>',
              label: "Apply",
              callback: (html) => {
                const fp = parseInt(html.find('input[name="fate-points"]').val(), 10) || 0;
                const defMod = parseInt(html.find('input[name="defense-modifier"]').val(), 10) || 0;
                const affOverride = html.find('select[name="affinity-override"]').val();
                resolve({ fp, defMod, affOverride });
              }
            },
            cancel: {
              icon: '<i class="fas fa-times"></i>',
              label: "Cancel",
              callback: () => resolve(null)
            }
          },
          default: "apply"
        }).render(true);
      });

      if (!dialogData) return; // User cancelled.
      fatePoints = dialogData.fp;
      defenseBonus = dialogData.defMod;
      affinityOverride = dialogData.affOverride;
    }

    // 3. Apply additional defense bonus.
    defense += defenseBonus;
    if (ignoreDefense || crit) {
      defense = 0;
    }
    if (halfDefense) {
      defense = Math.floor(defense / 2);
    }

    // 4. Fate Adjustment: reduce incoming damage if fatePoints > 0.
    let damage = amount;
    let fateUsed = 0;
    if (fatePoints > 0) {
      damage = Math.floor(amount / (fatePoints * 2));
      fateUsed = fatePoints;
    }

    // 6. Determine effective affinity rating.
    // Use the override if provided; otherwise, use the actor's affinity rating from affinityFinal.
    const effectiveAffinity = affinityOverride !== "" ? affinityOverride : (this.system.affinityFinal[affinity] || "normal");
    const targetAffinity = effectiveAffinity.toLowerCase();

    // 7. Adjust damage based on the affinity modifier.
    let affinityMod = 1;
    let affinityNote = "Normal (x1)";
    switch (targetAffinity) {
      case "weak":
        affinityMod = 2;
        affinityNote = "Weak (x2)";
        break;
      case "resist":
        affinityMod = 0.5;
        affinityNote = "Resist (x0.5)";
        break;
      case "null":
        affinityMod = 0;
        affinityNote = "Null (0 damage)";
        break;
      case "drain":
        affinityMod = -1;
        affinityNote = "Drain (heals target)";
        break;
      case "repel":
        affinityMod = 0;
        affinityNote = "Repel (damage returned)";
        break;
      default:
        affinityMod = 1;
        affinityNote = "Normal (x1)";
        break;
    }

    let finalAmount = Math.max(Math.floor(damage * affinityMod) - defense, 0);
    if (game.settings.get("smt-200x", "resistAfterDefense") && affinityMod < 1) {
      finalAmount = Math.max(Math.floor((damage - defense) * affinityMod), 0);
    }

    if (affinityMod < 0) {
      // For drain, call applyHeal instead and exit.
      this.applyHeal(amount, affectsMP);
      return;
    }

    // 8. Update the actor's HP or MP.
    const currentHP = this.system.hp.value;
    const currentMP = this.system.mp.value;
    const newHP = affectsMP ? currentMP - finalAmount : Math.max(currentHP - finalAmount, 0);
    if (affectsMP) {
      this.update({ "system.mp.value": Math.max(currentMP - finalAmount, 0) });
    } else {
      this.update({ "system.hp.value": newHP });
    }

    // 9. Calculate damage applied and note if damage exceeded available HP.
    const damageApplied = currentHP - newHP;
    let extraNote = "";
    if (damageApplied < finalAmount) {
      extraNote = ` (${finalAmount - damageApplied} Overkill)`;
    }

    if (lifedrain > 0) {
      extraNote += `<br>${Math.floor(damageApplied * lifedrain)} Life Drained`;
    }

    if (manadrain > 0) {
      extraNote += `<br>${Math.floor(damageApplied * manadrain)} Mana Drained`;
    }

    // 10. Build chat feedback content and include an "Undo" button.
    let chatContent = `
    <div class="flexrow damage-line">
      <span class="damage-text">
        Received <strong>${damageApplied}</strong> ${game.i18n.localize("SMT_X.Affinity." + affinity)} damage${extraNote}
        ${fateUsed > 0 ? `<br><em>(Spent ${fateUsed} Fate Point${fateUsed > 1 ? 's' : ''}.)</em>` : ''}
        ${defenseBonus !== 0 ? `<br><em>Defense Bonus: ${defenseBonus}</em>` : ''}
      </span>
      <button class="flex0 undo-damage height: 32px; width: 32px;" 
              data-actor-id="${this.id}" 
              data-token-id="${this.token ? this.token.id : ''}" 
              data-damage="${damageApplied}" 
              data-old-hp="${currentHP}"
              style="margin-left: auto;">
        <i class="fas fa-undo"></i>
      </button>
    </div>
    `;

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: chatContent
    });

    // 11. Show floating numbers if enabled.
    if (game.settings.get("smt-200x", "showFloatingDamage")) {
      for (let t of this.getActiveTokens()) {
        const floatText = (damageApplied >= 0) ? `-${damageApplied}` : `+${-damageApplied}`;
        createFloatingNumber(t.document, floatText, { fillColor: (damageApplied >= 0) ? "#FF0000" : "#00FF00", crit: crit, mult: mult });
      }
    }
  }



  applyHeal(amount, affectsMP = false) {
    const currentHP = this.system.hp.value;
    const currentMP = this.system.mp.value

    if (affectsMP)
      this.update({ "system.mp.value": currentMP + Math.abs(amount) });
    else
      this.update({ "system.hp.value": currentHP + Math.abs(amount) });

    let chatContent = `
    <div class="flexrow damage-line">
      <span style="font-size: var(--font-size-16);">Received <strong>${amount}</strong> healing.</span>
      <button class="flex0 undo-damage height: 32px; width: 32px;" 
              data-actor-id="${this.id}" 
              data-token-id="${this.token ? this.token.id : ''}" 
              data-damage="${amount}" 
              data-old-hp="${currentHP}"
              style="margin-left: auto;">
        <i class="fas fa-undo"></i>
      </button>
    </div>
    `;

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: chatContent
    });

    if (game.settings.get("smt-200x", "showFloatingDamage")) {
      for (let t of this.getActiveTokens()) {
        createFloatingNumber(t.document, `+${amount}`, { fillColor: "#00FF00" });
      }
    }
  }



  applyBS(status) {
    const priority = {
      "DEAD": 0,
      "STONE": 1,
      "FLY": 2,
      "PARALYZE": 3,
      "CHARM": 4,
      "POISON": 5,
      "CLOSE": 6,
      "BIND": 7,
      "FREEZE": 8,
      "SLEEP": 9,
      "PANIC": 10,
      "SHOCK": 11,
      "HAPPY": 12,
      "NONE": 999
    };

    const currentPriorityBS = priority[this.system.badStatus];
    const incomingPriorityBS = priority[status];

    if (incomingPriorityBS < currentPriorityBS)
      this.toggleStatusEffect(status, { active: true })
    else if (incomingPriorityBS != currentPriorityBS)
      ui.notifications.info(`Current Status ${this.system.badStatus} > ${status} in priority.`);
  }



  applyEXP(amount) {
    if (this.system.attributes.exp.tierThree > 0) {
      this.update({
        "system.attributes.exp.tierThree": this.system.attributes.exp.tierThree + amount
      });
    }
    else if (this.system.attributes.exp.tierTwo > 0) {
      this.update({
        "system.attributes.exp.tierTwo": this.system.attributes.exp.tierTwo + amount
      });
    }
    else {
      this.update({
        "system.attributes.exp.tierOne": this.system.attributes.exp.tierOne + amount
      });
    }
  }



  applyMacca(amount) {
    this.update({
      "system.macca": this.system.macca + amount
    });
  }



  /**
* Handle clickable rolls.
* @param {Event} event   The originating click event
* @private
*/
  async rollSplitD100(tn = "0", rollName = "", skipDialog = false) {
    const rollData = this.getRollData();
    let [modifier, split] = [0, 1];

    // Step 1: Prompt the user for modifier and TN split
    if (!skipDialog) {
      const { dia_modifier, dia_split } = await new Promise((resolve) => {
        new Dialog({
          title: "Check Dialogue",
          content: `
        <form>
          <div class="form-group">
            <label for="modifier">Modifier to TN:</label>
            <input type="number" id="modifier" name="modifier" value="0" />
          </div>
          <div class="form-group">
            <label for="split">Split TN into:</label>
            <select id="split" name="split">
              <option value="1">1 Part</option>
              <option value="2">2 Parts</option>
              <option value="3">3 Parts</option>
            </select>
          </div>
        </form>
      `,
          buttons: {
            roll: {
              label: "Roll",
              callback: (html) => {
                const dia_modifier = parseInt(html.find('input[name="modifier"]').val(), 10) || 0;
                const dia_split = parseInt(html.find('select[name="split"]').val(), 10) || 1;
                resolve({ dia_modifier, dia_split });
              },
            },
            cancel: {
              label: "Cancel",
              callback: () => resolve({ dia_modifier: null, dia_split: null }),
            },
          },
          default: "roll",
        }).render(true);
      });

      // If the user canceled the dialog, terminate the function
      if (dia_modifier === null) return;

      modifier = dia_modifier
      split = dia_split
    }

    // Step 2: Calculate modified TN and split values
    const baseTN = tn ?? 0;
    const modifiedTN = baseTN + modifier;
    const splitTN = Math.max(1, split);
    const tnParts = Array.from({ length: splitTN }, (_, i) => Math.floor(modifiedTN / splitTN));

    // Step 3: Perform the rolls and evaluate results
    const critRangeParts = ("1/10").split("/").map(Number);
    const critRate = critRangeParts.length === 2 ? critRangeParts[0] / critRangeParts[1] : 0.1;

    const rolls = await Promise.all(
      tnParts.map(async (tn) => {
        const roll = new Roll("1d100");
        await roll.evaluate();

        if (game.dice3d)
          await game.dice3d.showForRoll(roll, game.user, true)

        // Evaluate the roll result
        let result = "Fail";
        if (roll.total === 1) {
          result = "Critical"; // Natural 1 is always a critical
        } else if (roll.total === 100) {
          result = "Fumble"; // Natural 100 is always a fumble
        } else if (roll.total >= (this.system.isCursed ? 86 : 96) && roll.total <= 99) {
          result = "Automatic Failure"; // Rolls 96+ (Cursed 86+) are automatic failures
        } else if (roll.total <= (tn * critRate)) {
          result = "Critical"; // Within the crit rate range
        } else if (roll.total <= tn) {
          result = "Success"; // Successful roll
        }

        return { roll, tn, result };
      })
    );

    const tnInfoContent = `
        <div class="flexrow flex-center flex-between" style="display: flex; align-items: center;">
            <span><strong>Base TN</strong></span>
            <span><strong>Modifier</strong></span>
            <span><strong>Splits</strong></span>
        </div>
        <div class="flexrow flex-center flex-between" style="display: flex; align-items: center;">
            <span>${baseTN}%</span>
            <span>${modifier >= 0 ? "+" : ""}${modifier}%</span>
            <span>${splitTN}</span>
        </div>
    `;

    // Step 4: Send results to chat
    const speaker = ChatMessage.getSpeaker({ actor: this });
    const rollMode = game.settings.get('core', 'rollMode');
    const rollResults = `
      <div class="flexrow flex-group-center flex-between" style="font-size: 32px; font-weight: bold;">
        ${rolls.map(({ roll }) => `<span>${roll.total}</span>`).join("")}
      </div>
      <div class="flexrow flex-group-center flex-between">
        ${rolls.map(({ result }) => `<span style="font-size: 12px;"><em>(${result})</em></span>`).join("")}
      </div>
    `;

    ChatMessage.create({
      speaker: speaker,
      rolMode: rollMode,
      flavor: `<h2>${rollName} Check</h2>`,
      content: `
      <div class="flexrow flex-group-center flex-between" style="font-weight: bold;">
        <span>TN ${tnParts[0]}%</span>
      </div>
      ${rollResults}
      <hr>
      <details>
        <summary style="cursor: pointer; font-weight: bold;">Details</summary>
          ${tnInfoContent}
          <hr>
      </details>
    `,
    });

    if (this.system.resetModTN) {
      await this.update({ "system.quickModTN": 0 });
    }
  }



  /**
* Handle clickable rolls.
* @param {Event} event   The originating click event
* @private
*/
  async rollPower(formula = "0", defAffinity = "almighty", skipDialog = false) {
    let rollName = ""
    if (event.target.classList.value.includes("melee-power-roll")) rollName = "Melee"
    if (event.target.classList.value.includes("ranged-power-roll")) rollName = "Ranged"
    if (event.target.classList.value.includes("spell-power-roll")) rollName = "Spell"

    const rollData = this.getRollData();

    let overrides = {
      affinity: defAffinity || "almighty",
      ignoreDefense: false,
      affectsMP: false,
      critMult: 2,
      extraModifier: "0",
      baseMult: 1
    };

    const affinityTemplateSource = `
    <select name="affinity">
    {{selectOptions affinities selected=affinity localize=true}}
    </select>
    `
    const affinityTemplate = Handlebars.compile(affinityTemplateSource);
    const affinityContent = affinityTemplate({
      affinities: {
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
      },
      affinity: overrides.affinity
    })

    // Step 1: Prompt the user for overrides and additional modifiers
    if (!skipDialog) {
      const userOverrides = await new Promise((resolve) => {
        new Dialog({
          title: "Roll Power",
          content: `
                <form>
                    <div class="form-group">
                        <label for="extraModifier">Power Modifier:</label>
                        <input type="text" id="extraModifier" name="extraModifier" value="${overrides.extraModifier}" />
                    </div>
                    <div class="form-group">
                        <label for="affinity">Affinity:</label>
                       ${affinityContent}
                    </div>
                    <div class="form-group">
                        <label for="ignoreDefense">Ignore Defense:</label>
                        <input type="checkbox" id="ignoreDefense" name="ignoreDefense" ${overrides.ignoreDefense ? "checked" : ""} />
                    </div>
                    <div class="form-group">
                        <label for="halfDefense">Half Defense:</label>
                        <input type="checkbox" id="halfDefense" name="halfDefense" ${overrides.halfDefense ? "checked" : ""} />
                    </div>
                    <div class="form-group">
                        <label for="critMult">Critical Multiplier:</label>
                        <input type="number" id="critMult" name="critMult" value="${overrides.critMult}" />
                    </div>
                    <div class="form-group">
                        <label for="baseMult">Base Multiplier (Charge/Focus):</label>
                        <input type="text" id="baseMult" name="baseMult" value="${overrides.baseMult}" />
                    </div>
                </form>
                `,
          buttons: {
            roll: {
              label: "Roll",
              callback: (html) => {
                const affinity = html.find('select[name="affinity"]').val() || "strike";
                const ignoreDefense = html.find('input[name="ignoreDefense"]').is(":checked");
                const affectsMP = html.find('input[name="affectsMP"]').is(":checked");
                const critMult = parseFloat(html.find('input[name="critMult"]').val()) || 2;
                const extraModifier = html.find('input[name="extraModifier"]').val() || "0";
                const baseMult = html.find('input[name="baseMult"]').val() || "1";
                resolve({ affinity, ignoreDefense, affectsMP, critMult, extraModifier, baseMult });
              },
            },
            cancel: {
              label: "Cancel",
              callback: () => resolve(null),
            },
          },
          default: "roll",
        }).render(true);
      });

      // If the user canceled the dialog, terminate the function
      if (!userOverrides) return;

      overrides = { ...overrides, ...userOverrides };
    }

    // Add extra modifier to the formula
    if (overrides.extraModifier.trim() !== "0")
      formula += ` + (${overrides.extraModifier.trim()})`;

    // Roll for regular damage
    const regularRoll = new Roll(formula, rollData);
    await regularRoll.evaluate();

    if (game.dice3d)
      await game.dice3d.showForRoll(regularRoll, game.user, true)

    const finalBaseDmg = Math.floor((regularRoll.total) * overrides.baseMult)
    const critDamage = Math.floor((finalBaseDmg) * overrides.critMult);

    // Determine button visibility based on affinity
    const hideDamage = false;
    const showCrit = overrides.affinity !== "recovery" && overrides.affinity !== "none" && !hideDamage;
    const showDamageButtons = overrides.affinity !== "recovery" && overrides.affinity !== "none" && !hideDamage;
    const showHealing = overrides.affinity == "recovery";

    let btnStyling = 'width: 22px; height: 28px; font-size: 14px; '; //margin: 1px;

    const damageButtonsContent = showDamageButtons ? `
      <div class="damage-buttons flexrow flex-group-center flex-between">
        <button class='apply-full-damage' style="${btnStyling}"><i class="fas fa-user-minus" title="Apply full damage"></i></button>
        <button class='apply-half-damage' style="${btnStyling}"><i class="fas fa-user-shield" title="Apply half damage"></i></button>
        <button class='apply-double-damage' style="${btnStyling}"><i class="fas fa-user-injured" title="Apply double damage"></i></button>
        <button class='apply-full-healing' style="${btnStyling}"><i class="fas fa-user-plus" title="Apply full healing"></i></button>
      </div>
    ` : "";

    const healingButtonContent = showHealing ? `
      <div class="healing-buttons flexrow flex-group-center flex-between">
        <button class='apply-full-healing' style="${btnStyling}"><i class="fas fa-user-plus" title="Apply full healing"></i></button>
      </div>
    ` : "";

    const critButtonsContent = showCrit ? `
      <div class="damage-buttons flexrow flex-group-center flex-between">
        <button class='apply-full-crit-damage' style="${btnStyling}"><i class="fas fa-user-minus" title="Apply full crit damage"></i></button>
        <button class='apply-half-crit-damage' style="${btnStyling}"><i class="fas fa-user-shield" title="Apply half crit damage"></i></button>
        <button class='apply-double-crit-damage' style="${btnStyling}"><i class="fas fa-user-injured" title="Apply double crit damage"></i></button>
        <button class='apply-full-crit-healing' style="${btnStyling}"><i class="fas fa-user-plus" title="Apply full crit healing"></i></button>
      </div>
    ` : "";

    // HTML with refined logic
    const content = `
      <div class="power-roll-card" 
          data-affinity="${overrides.affinity}" 
          data-ignore-defense="${overrides.ignoreDefense}" 
          data-half-defense="${overrides.halfDefense}" 
          data-pierce="${overrides.pierce}" 
          data-regular-damage="${finalBaseDmg}" 
          data-critical-damage="${critDamage}">
        
        <section class="flexrow">
          <div class="flexcol">
            ${!hideDamage ? `<p><strong>Affinity:</strong> ${game.i18n.localize("SMT_X.Affinity." + overrides.affinity)}</p>
            <p style="font-size: 32px; margin: 0;" class="align-center"><strong>${finalBaseDmg}</strong></p>` : ""}
            ${damageButtonsContent}
            ${healingButtonContent}
          </div>

          ${showCrit ? `
          <div class="flexcol" style="margin-left: 15px;">
            <p><strong>Critical:</strong></p>
            <p style="font-size: 32px; margin: 0;" class="align-center"><strong>${critDamage}</strong></p>
            ${critButtonsContent}
          </div>` : ""}
        </section>
      </div>
    `;

    const speaker = ChatMessage.getSpeaker({ actor: this });
    const rollMode = game.settings.get('core', 'rollMode');

    ChatMessage.create({
      speaker: speaker,
      rolMode: rollMode,
      flavor: `<h2>${rollName} Power Roll</h2>`,
      content: content
    });
  }
}










Hooks.on("renderChatMessage", (message, html, data) => {
  html.find(".undo-damage").on("click", async (event) => {
    event.preventDefault();
    const button = $(event.currentTarget);
    const actorId = button.data("actor-id");
    const actor = game.actors.get(actorId);
    const tokenId = button.data("token-id");
    const token = canvas.tokens.get(tokenId);
    const damageApplied = parseInt(button.data("damage"));
    const oldHP = parseInt(button.data("old-hp"));

    // Restore HP on the actor (or token's actor)
    if (token) {
      await token.actor.update({ "system.hp.value": oldHP });
    } else if (actor) {
      await actor.update({ "system.hp.value": oldHP });
    }

    // Find the parent container for the damage line.
    const damageLine = button.closest(".damage-line");

    // Option 1: Add a class that applies strike-through styling.
    damageLine.css("text-decoration", "line-through");

    // Option 2: Or update inline styles directly:
    // damageLine.find(".damage-text").css("text-decoration", "line-through");

    // Disable or replace the undo button.
    button.replaceWith(`<button class="flex0 undo-damage" disabled style="margin-left: auto; opacity: 0.5;"><i class="fas fa-undo"></i></button>`);

    // Get the updated HTML from the rendered message and update the chat message.
    await updateChatMessage(message, message.content);
  });
});
















/**
 * Creates a floating text that rises and fades above a token.
 *
 * @param {Token} token      The token (Document) above which the text appears
 * @param {string|number} textValue  The text to display (e.g. -10, +5)
 * @param {object} [options={}]      Optional styling/animation configs
 */
export function createFloatingNumber(token, textValue, options = {}) {
  // Example style; tweak to fit your theme
  const style = new PIXI.TextStyle({
    fontFamily: "Arial",
    fontSize: 48,
    fill: options.crit ? "FFCC00" : (options.fillColor || "#FF0000"),
    stroke: "#000000",
    strokeThickness: options.crit ? 6 : 4,
    dropShadow: true,
    dropShadowColor: "#000000",
    dropShadowBlur: 4,
    dropShadowAngle: Math.PI / 6,
    dropShadowDistance: 4,
    fontWeight: options.crit ? "bolder" : "normal"
  });

  // Create the text
  const floatingText = new PIXI.Text(String(textValue), style);
  floatingText.anchor.set(0.5); // Center the text

  // Position at the token’s center
  const gridSize = canvas.dimensions.size;
  const tokenWidthPx = token.width * gridSize;
  const tokenHeightPx = token.height * gridSize;
  const centerX = token.x + tokenWidthPx / 2;
  const centerY = token.y + tokenHeightPx / 4;

  floatingText.position.set(centerX, centerY);

  // Add to a container. 
  canvas.tokens.addChild(floatingText);

  // Simple manual animation
  const animDistance = options.animDistance ?? 50;
  const animDuration = options.animDuration ?? 1250; // in ms
  const initialScale = (options.crit ? 1.5 : 1.0) * ((options.mult == 0.5 ? 0.75 : options.mult == 2 ? 1.25 : 1) || 1); // Start bigger if crit
  floatingText.scale.set(initialScale);
  const startY = floatingText.y;
  const endY = floatingText.y - animDistance;
  const startTime = performance.now();

  function animate() {
    const now = performance.now();
    const elapsed = now - startTime;
    let progress = elapsed / animDuration;
    if (progress > 1) progress = 1;

    floatingText.y = startY - animDistance * progress;
    floatingText.alpha = 1 - progress;

    if (options.crit) {
      const scaleProgress = 1 - progress;
      floatingText.scale.set(1 + (initialScale - 1) * scaleProgress);
    }

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // Remove from the container and destroy it
      canvas.tokens.removeChild(floatingText);
      floatingText.destroy();
    }
  }

  requestAnimationFrame(animate);
}







async function updateChatMessage(message, updatedContent) {
  if (game.user.isGM) {
    return await message.update({ _id: message.id, content: updatedContent });
  } else {
    game.socket.emit("system.smt-200x", {
      action: "updateChatMessage",
      messageId: message.id,
      content: updatedContent
    });
  }
}