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
  }


  /** @override */
  prepareDerivedData() {
    const systemData = this.system;

    this._calculateBuffEffects(systemData);
    this._clampStats(systemData);
    if (systemData.badStatus == "FLY")
      for (let [key, stat] of Object.entries(systemData.stats)) {
        if (key == "ag") continue;
        systemData.stats[key].value = 1;
      }
    this._calculateCombatStats(systemData);
    this._calculateResources(systemData);
    this._clampValues(systemData);

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


  _calculateBuffEffects(systemData) {
    ["raku", "taru", "suku", "maka"].forEach(buff => {
      systemData[`sum${buff.charAt(0).toUpperCase() + buff.slice(1)}`] =
        systemData.buffs[buff]; /*+
        systemData[buff].buff.reduce((total, num) => total + num, 0) -
        Math.abs(systemData[buff].debuff.reduce((total, num) => total + num, 0));*/
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

    // Compute TN values
    for (let [key, stat] of Object.entries(systemData.stats)) {
      systemData.stats[key].tn += (stat.value * 5) + systemData.attributes.level + systemData.sumSuku;
    }

    systemData.dodgetn += 10 + systemData.stats.ag.value + systemData.sumSuku;
    systemData.talktn += 20 + (systemData.stats.lk.value * 2) + systemData.sumSuku;
  }


  _calculateResources(systemData) {
    const hpFormula = this.parseFormula(game.settings.get("smt-200x", "hpFormula"), systemData);
    const mpFormula = this.parseFormula(game.settings.get("smt-200x", "mpFormula"), systemData);
    const fateFormula = this.parseFormula(game.settings.get("smt-200x", "fateFormula"), systemData);

    systemData.hp.max = (hpFormula) * systemData.hp.mult;
    systemData.mp.max = (mpFormula) * systemData.mp.mult;
    systemData.fate.max = fateFormula;

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


  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;
    const systemData = actorData.system;
  }


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

    // Loop through stats, and add their TNs to sheet output
    /*for (let [key, stat] of Object.entries(data.stats)) {
      data.stats[key].tn = (stat.value * 5) + data.attributes.level + (data.sumSuku || 0);
    }*/

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


  async applyDamage(amount, mult, affinity = "almighty", ignoreDefense = false, halfDefense = false, crit = false, affectsMP = false) {
    let defense = this.system.magdef;
    if (affinity === "strike" || affinity === "gun") defense = this.system.phydef;
    if (ignoreDefense || crit) defense = 0;
    if (halfDefense) defense = Math.floor(defense / 2);

    let damage = amount;
    let fateUsed = 0;

    // If character, ask for Fate points and adjust damage accordingly
    if (this.type === 'character' || game.settings.get("smt-200x", "fateForNPCs") || this.system.allowFate) {
      const fatePoints = await new Promise((resolve) => {
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
                const fatePointsInput = parseInt(html.find('input[name="fate-points"]').val(), 10);
                resolve(fatePointsInput);
              }
            },
            cancel: {
              icon: '<i class="fas fa-times"></i>',
              label: "Cancel",
              callback: () => resolve(-1) // Default to 0 if canceled
            }
          },
          default: "apply"
        }).render(true);
      });

      if (fatePoints == -1) return // Player clicked cancel, don't apply damage.

      if (fatePoints > 0) {
        damage = Math.floor(amount / (fatePoints * 2));
        fateUsed = fatePoints;
      }
    }

    let finalAmount = Math.max(Math.floor(damage * mult) - defense, 0);
    if (game.settings.get("smt-200x", "resistAfterDefense") && mult < 1) {
      finalAmount = Math.max(Math.floor((damage - defense) * mult), 0);
    }

    const currentHP = this.system.hp.value;
    const currentMP = this.system.mp.value;

    if (affectsMP) {
      this.update({ "system.mp.value": Math.max(currentMP - finalAmount, 0) });
    } else {
      this.update({ "system.hp.value": Math.max(currentHP - finalAmount, 0) });
    }

    let chatContent = `<span style="font-size: var(--font-size-16);">Received <strong>${finalAmount}</strong> <span title="Affinity Multiplier x${mult}">${game.i18n.localize("SMT_X.Affinity." + affinity)} damage.</span></span>`;
    if (fateUsed > 0) {
      chatContent += `<br><em>(spent ${fateUsed} Fate Point${fateUsed > 1 ? 's' : ''}.)</em>`;
    }

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: chatContent
    });

    if (game.settings.get("smt-200x", "showFloatingDamage")) {
      for (let t of this.getActiveTokens()) {
        createFloatingNumber(t.document, `-${finalAmount}`, { fillColor: "#FF0000", crit: crit, mult: mult });
      }
    }
  }

  applyHeal(amount, affectsMP = false) {
    const currentHP = this.system.hp.value;
    const currentMP = this.system.mp.value

    if (affectsMP)
      this.update({ "system.mp.value": currentMP + amount });
    else
      this.update({ "system.hp.value": currentHP + amount });

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<span style="font-size: var(--font-size-16);">Received <strong>${amount}</strong> healing.</span>`
    });

    if (game.settings.get("smt-200x", "showFloatingDamage")) {
      for (let t of this.getActiveTokens()) {
        createFloatingNumber(t.document, `+${amount}`, { fillColor: "#00FF00" });
      }
    }
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

    let taruPowerContent = "Melee & Ranged";
    if (game.settings.get("smt-200x", "taruOnly")) taruPowerContent = "All"

    if (applyTo.sukukaja) {
      updateBuffs("suku", "buff");

      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<span style="font-size: var(--font-size-16);">All TN Accuracy Up.</span>`
      });
    }
    if (applyTo.tarukaja) {
      updateBuffs("taru", "buff");

      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<span style="font-size: var(--font-size-16);">${taruPowerContent} Power Up.</span>`
      });
    }
    if (applyTo.rakukaja) {
      updateBuffs("raku", "buff");

      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<span style="font-size: var(--font-size-16);">Defense Up.</span>`
      });
    }
    if (applyTo.makakaja) {
      updateBuffs("maka", "buff");

      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<span style="font-size: var(--font-size-16);">Spell Power Up.</span>`
      });
    }
    if (applyTo.sukunda) {
      updateBuffs("suku", "debuff");

      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<span style="font-size: var(--font-size-16);">All TN Accuracy Down.</span>`
      });
    }
    if (applyTo.tarunda) {
      updateBuffs("taru", "debuff");

      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<span style="font-size: var(--font-size-16);">${taruPowerContent} Power Down.</span>`
      });
    }
    if (applyTo.rakunda) {
      updateBuffs("raku", "debuff");

      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<span style="font-size: var(--font-size-16);">Defense Down.</span>`
      });
    }
    if (applyTo.makunda) {
      updateBuffs("maka", "debuff");

      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<span style="font-size: var(--font-size-16);">Spell Power Down.</span>`
      });
    }
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
  }



  /**
* Handle clickable rolls.
* @param {Event} event   The originating click event
* @private
*/
  async rollPower(formula = "0", defAffinity = "almighty", skipDialog = false) {
    let rollName = "Melee"
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
                        <label for="extraModifier">Additional Modifier:</label>
                        <input type="text" id="extraModifier" name="extraModifier" value="${overrides.extraModifier}" />
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

