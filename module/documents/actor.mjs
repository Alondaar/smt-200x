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

    if (actorData.type === 'character') {
      // Define multipliers for each tier
      const tierMultipliers = {
        tierOne: 0.8,
        tierTwo: 1.0,
        tierThree: 1.3
      };

      // Total EXP from all tiers
      const totalExp = systemData.attributes.exp.tierOne + systemData.attributes.exp.tierTwo + systemData.attributes.exp.tierThree;

      let currentLevel = 1; // Track the current level
      let nextThreshold = 0; // EXP required for the next level
      let currentMultiplier = tierMultipliers.tierOne; // Multiplier based on the active tier

      // Function to calculate the threshold for a given level and multiplier
      const calculateThreshold = (level, multiplier) => Math.floor(Math.pow(level, 3) * multiplier);

      // Determine the tier and calculate the level
      if (systemData.attributes.exp.tierTwo > 0)
        currentMultiplier = tierMultipliers.tierTwo;
      if (systemData.attributes.exp.tierThree > 0)
        currentMultiplier = tierMultipliers.tierThree;

      // Calculate the level dynamically
      while (true) {
        const threshold = calculateThreshold(currentLevel + 1, currentMultiplier);
        if (totalExp < threshold) {
          nextThreshold = threshold;
          break;
        }
        currentLevel++;
      }

      // Update actor's level and EXP requirement for the next level
      systemData.attributes.level = currentLevel;
      systemData.attributes.totalexp = totalExp;
      systemData.attributes.expnext = nextThreshold - totalExp;
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

    if (actorData.type === 'character') {
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

    if (systemData.isBoss) {
      systemData.hp.max *= 5;
      systemData.mp.max *= 2;
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
  }



  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;
    const systemData = actorData.system;
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
  }



  parseFormula(formula) {
    // Evaluate the mathematical expression
    try {
      // Use Function with an explicit Math object
      const result = new Roll(formula, this).evaluateSync({ minimize: true }).total;
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



  applyDamage(amount, mult, affinity = "almighty", ignoreDefense = false, affectsMP = false) {
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
              const adjustedAmount = fatePoints > 0 ? Math.floor(amount / (fatePoints * 2)) : amount;

              // Normal Resist Mult Order of Operations
              let finalAmount = Math.max(Math.floor(adjustedAmount * mult) - defense, 0);
              // Apply Resist/Strong AFTER subtracting defense
              if (game.settings.get("smt-200x", "resistAfterDefense") && mult < 1) {
                finalAmount = Math.max(Math.floor((adjustedAmount - defense) * mult), 0);
              }

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

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `Applied ${amount} healing to ${this.name}.`
    });
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
          title: this.name + " Check Dialogue",
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
    const baseTN = tn || 0;
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
        } else if (roll.total >= (this.isCursed ? 86 : 96) && roll.total <= 99) {
          result = "Automatic Failure"; // Rolls 96+ (Cursed 86+) are automatic failures
        } else if (roll.total <= (tn * critRate)) {
          result = "Critical"; // Within the crit rate range
        } else if (roll.total <= tn) {
          result = "Success"; // Successful roll
        }

        return { roll, tn, result };
      })
    );

    // Step 4: Send results to chat
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollResults = rolls.map(
      ({ roll, tn, result }, index) =>
        `<span style="font-size:18px;"><strong>Roll ${index + 1}:</strong> ${roll.total} vs. ${tn}% (${result})</span>`
    ).join("</br>");

    ChatMessage.create({
      speaker,
      content: `
      <h3>${this.name} ${rollName} Check</h3>
      <p>Base TN: ${baseTN}%, Modifier: ${modifier}%, Split: ${splitTN}</p>
      ${rollResults}
    `,
    });
  }



  /**
* Handle clickable rolls.
* @param {Event} event   The originating click event
* @private
*/
  async rollPower(formula = "0", defAffinity = "almighty", skipDialog = false) {
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
                        <label for="affectsMP">Affects MP:</label>
                        <input type="checkbox" id="affectsMP" name="affectsMP" ${overrides.affectsMP ? "checked" : ""} />
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

    const finalBaseDmg = (regularRoll.total) * overrides.baseMult
    const critDamage = (finalBaseDmg) * overrides.critMult;

    // Determine button visibility based on affinity
    const hideDamage = false;
    const showCrit = overrides.affinity !== "recovery" && overrides.affinity !== "none" && !hideDamage;
    const showDamageButtons = overrides.affinity !== "recovery" && overrides.affinity !== "none" && !hideDamage;
    const showHealing = overrides.affinity == "recovery";

    let btnStyling = 'width: 28px; height: 28px; font-size: 14px;';

    // HTML with refined logic
    const content = `
    <div class="power-roll-card"
         data-affinity="${overrides.affinity}" 
         data-ignore-defense="${overrides.ignoreDefense}" 
         data-affects-mp='${overrides.affectsMP}' 
         data-regular-damage="${finalBaseDmg}" 
         data-critical-damage="${critDamage}">
        <h3>${this.name} Power Roll</h3>
        <section class="flexrow">
          <div class="flexcol">
          ${!hideDamage ? `<p><strong>Affinity:</strong> ${game.i18n.localize("SMT_X.Affinity." + overrides.affinity)}</p>
            <p style="font-size:32px;margin:0;" class="align-center"><strong>${finalBaseDmg}</strong></p>` : ""}
          <div class="damage-buttons grid grid-4col">
              ${showDamageButtons ? `
                  <button class='apply-full-damage' style="${btnStyling}"><i class="fas fa-user-minus" title="Click to apply full damage to selected token(s)."></i></i></button>
                  <button class='apply-half-damage' style="${btnStyling}"><i class="fas fa-user-shield" title="Click to apply half damage to selected token(s)."></i></button>
                  <button class='apply-double-damage' style="${btnStyling}"><i class="fas fa-user-injured" title="Click to apply double damage to selected token(s)."></i></button>
                  <button class='apply-full-healing' style="${btnStyling}"><i class="fas fa-user-plus" title="Click to apply full healing to selected token(s)."></i></button>
              ` : ""}
              ${showHealing ? `<button class='apply-full-healing' style="${btnStyling}"><i class="fas fa-user-plus" title="Click to apply full healing to selected token(s)."></i></button>` : ""}
          </div>
        </div>
        ${showCrit ? `
          <div style="margin-left: 25px;" class="flex0"></div>
        <div class="flexcol">
        <p><strong>Critical:</strong></p>
        <p style="font-size:32px;margin:0;" class="align-center"><strong>${critDamage}</strong></p>
        <div class="damage-buttons grid grid-4col">
            <button class='apply-full-crit-damage' style="${btnStyling}"><i class="fas fa-user-minus" title="Click to apply full damage to selected token(s)."></i></i></button>
                <button class='apply-half-crit-damage' style="${btnStyling}"><i class="fas fa-user-shield" title="Click to apply half damage to selected token(s)."></i></button>
                <button class='apply-double-crit-damage' style="${btnStyling}"><i class="fas fa-user-injured" title="Click to apply double damage to selected token(s)."></i></button>
                <button class='apply-full-crit-healing' style="${btnStyling}"><i class="fas fa-user-plus" title="Click to apply full healing to selected token(s)."></i></button>
        </div></div>
        ` : ""}
        </section>
    </div>
    `;

    const message = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content
    });
  }
}
