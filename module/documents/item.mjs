/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class SMTXItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
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
    const itemData = this;
    const systemData = itemData.system;

    this.prepareFeature()
  }

  prepareFeature() {
    if (!this.type == 'feature') return
    if (this.type == 'armor') return // why
    if (this.type == 'weapon') return // why
    if (this.type == 'passive') return // why

    const itemData = this;
    const systemData = itemData.system;
    const rollData = this.getRollData();

    let weaponTN = 0;
    let weaponPower = 0;

    switch (systemData.wep) {
      case "a":
        weaponTN = !systemData.wepIgnoreTN ? this.actor.system.wepA.hit : 0
        weaponPower = !systemData.wepIgnorePower ? this.actor.system.wepA.power : 0
        break;
      case "b":
        weaponTN = !systemData.wepIgnoreTN ? this.actor.system.wepB.hit : 0
        weaponPower = !systemData.wepIgnorePower ? this.actor.system.wepB.power : 0
        break;
      default:
        break;
    }



    function evaluateMathEquation(equation) {
      try {
        return new Function(`return ${equation};`)();
      } catch (error) {
        console.error("Invalid equation:", error);
        return 0;
      }
    }

    const test = new Roll(systemData.power, rollData);
    const testFormula = test.formula.replace(/\b\d*d10[x]?/g, "0")
    const testResult = evaluateMathEquation(testFormula);
    systemData.calcPower = testResult + weaponPower;

    const calcTN = evaluateMathEquation(new Roll(systemData.power, rollData).formula.replace(/\b\d*d10[x]?/g, "0"));
    systemData.calcTN = calcTN + weaponTN;

    systemData.formula = systemData.power + " + " + weaponPower;
  }

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item
   * @override
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const rollData = { ...this.system };

    // Quit early if there's no parent actor
    if (!this.actor) return rollData;

    // If present, add the actor's roll data
    rollData.actor = this.actor.getRollData();

    return rollData;
  }

  rotateWeapon() {
    const systemData = this.system;

    let newWep;
    switch (systemData.wep) {
      case "a":
        newWep = "b";
        break;
      case "b":
        newWep = "x";
        break;
      case "x":
        newWep = "a";
        break;
    }

    // Update the item's data
    if (newWep) {
      this.update({ "system.wep": newWep });
    }
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll() {
    const item = this;

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${item.type}] ${item.name}`;

    // If there's no roll data, send a chat message.
    if (!this.system.formula) {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: item.system.description ?? '',
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.formula, rollData);
      // If you need to store the value first, uncomment the next line.
      // const result = await roll.evaluate();
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });
      return roll;
    }
  }

  /**
 * Handle clickable rolls.
 * @param {Event} event   The originating click event
 * @private
 */
  async rollSplitD100(skipDialog = false) {
    const systemData = this.system;
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
                console.log("yoooo")
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
    const baseTN = systemData.calcTN || 0;
    const modifiedTN = baseTN + modifier;
    const splitTN = Math.max(1, split);
    const tnParts = Array.from({ length: splitTN }, (_, i) => Math.floor(modifiedTN / splitTN));

    // Step 3: Perform the rolls and evaluate results
    const critRangeParts = (systemData.critRange || "1/10").split("/").map(Number);
    const critRate = critRangeParts.length === 2 ? critRangeParts[0] / critRangeParts[1] : 0.1;

    const rolls = await Promise.all(
      tnParts.map(async (tn) => {
        const roll = new Roll("1d100");
        await roll.evaluate();

        // Evaluate the roll result
        let result = "Fail";
        if (roll.total === 1) {
          result = "Critical"; // Natural 1 is always a critical
        } else if (roll.total === 100) {
          result = "Fumble"; // Natural 100 is always a fumble
        } else if (roll.total >= 96 && roll.total <= 99) {
          result = "Automatic Failure"; // Rolls 96-99 are automatic failures
        } else if (roll.total <= tn * critRate) {
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
      <h3>${this.name} Check</h3>
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
  async rollPower(skipDialog = false) {
    const systemData = this.system;
    const rollData = this.getRollData();

    let overrides = {
      affinity: systemData.affinity || "strike",
      ignoreDefense: systemData.ignoreDefense || false,
      pierce: systemData.pierce || false,
      critMult: systemData.critMult || 2,
      extraModifier: "0"
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
                        <label for="pierce">Pierce:</label>
                        <input type="checkbox" id="pierce" name="pierce" ${overrides.pierce ? "checked" : ""} />
                    </div>
                    <div class="form-group">
                        <label for="critMult">Critical Multiplier:</label>
                        <input type="number" id="critMult" name="critMult" value="${overrides.critMult}" />
                    </div>
                    <div class="form-group">
                        <label for="extraModifier">Additional Modifier:</label>
                        <input type="text" id="extraModifier" name="extraModifier" value="${overrides.extraModifier}" />
                    </div>
                </form>
                `,
          buttons: {
            roll: {
              label: "Roll",
              callback: (html) => {
                const affinity = html.find('select[name="affinity"]').val() || "strike";
                const ignoreDefense = html.find('input[name="ignoreDefense"]').is(":checked");
                const pierce = html.find('input[name="pierce"]').is(":checked");
                const critMult = parseFloat(html.find('input[name="critMult"]').val()) || 2;
                const extraModifier = html.find('input[name="extraModifier"]').val() || "0";
                resolve({ affinity, ignoreDefense, pierce, critMult, extraModifier });
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
    if (overrides.extraModifier.trim() !== "0") {
      systemData.formula += ` + (${overrides.extraModifier.trim()})`;
    }

    // Roll for regular damage
    const regularRoll = new Roll(systemData.formula, rollData);
    await regularRoll.evaluate();

    // Roll for sub-formula
    const hasBuffSubRoll = systemData.subBuffRoll !== "" ? true : false;
    const subBuffRoll = new Roll(hasBuffSubRoll ? systemData.subBuffRoll : "0", rollData);
    await subBuffRoll.evaluate();

    // Function to process the roll and populate buffArray
    function processRoll(roll) {
      const buffArray = [0, 0, 0, 0];

      // Extract all dice results from roll.dice
      const rolledDice = roll.dice.flatMap(die => die.results.map(result => result.result));

      // Populate buffArray with up to 4 dice results
      rolledDice.slice(0, 4).forEach((value, index) => {
        buffArray[index] = value;
      });

      // Add static modifier to the first index
      buffArray[0] += roll.total - buffArray.reduce((total, num) => total + num, 0);

      return buffArray;
    }

    const hasBuffs = Object.values(systemData.buffs).some(value => value);
    const buffArray = processRoll(hasBuffSubRoll ? subBuffRoll : regularRoll);

    const activeBuffs = Object.entries(systemData.buffs)
      .filter(([key, value]) => value === true) // Filter for `true` values
      .map(([key]) => key) // Extract the keys
      .join(", "); // Join keys with a comma and space

    // Filter non-zero values and join them with a comma
    const nonZeroValues = buffArray
      .filter(value => value !== 0) // Keep only non-zero values
      .join(", "); // Join the values into a string

    // Calculate critical damage
    const critDamage = regularRoll.total * overrides.critMult;

    // Determine button visibility based on affinity
    const hideDamage = (hasBuffs && hasBuffSubRoll);
    const showCrit = overrides.affinity !== "recovery" && overrides.affinity !== "none" && !systemData.hideCritDamage && !hideDamage;
    const showDamageButtons = overrides.affinity !== "recovery" && overrides.affinity !== "none" && !hideDamage;
    const showHealing = overrides.affinity !== "none";
    const showBuffButtons = hasBuffs || hasBuffSubRoll;

    let btnStyling = 'width: 32px; height:32px; font-size:14px;';

    // HTML with refined logic
    const content = `
    <div class="power-roll-card"
         data-affinity="${overrides.affinity}" 
         data-ignore-defense="${overrides.ignoreDefense}" 
         data-pierce="${overrides.pierce}" 
         data-affects-mp='${systemData.affectsMP}' 
         data-regular-damage="${regularRoll.total}" 
         data-critical-damage="${critDamage}" 
         data-buffs='${JSON.stringify(buffArray)}' 
         data-apply-buffs-to='${JSON.stringify(systemData.buffs)}'>
        <h3>${this.name} Effect Roll</h3>
        <section class="grid grid-2col">
        <div class="flexcol">
        ${!hideDamage ? `<p><strong>Affinity:</strong> ${game.i18n.localize("SMT_X.Affinity." + overrides.affinity)}</p>
          <p style="font-size:32px;margin:0;" class="align-center"><strong>${regularRoll.total}</strong></p>` : ""}
        <div class="damage-buttons flexrow">
            ${showDamageButtons ? `
                <button class='apply-full-damage' style="${btnStyling}"><i class="fas fa-user-minus" title="Click to apply full damage to selected token(s)."></i></i></button>
                <button class='apply-half-damage' style="${btnStyling}"><i class="fas fa-user-shield" title="Click to apply half damage to selected token(s)."></i></button>
                <button class='apply-double-damage' style="${btnStyling}"><i class="fas fa-user-injured" title="Click to apply double damage to selected token(s)."></i></button>
                <button class='apply-full-healing' style="${btnStyling}"><i class="fas fa-user-plus" title="Click to apply full healing to selected token(s)."></i></button>
            ` : ""}
            ${!showHealing ? `<button class='apply-full-healing'>Full Healing</button>` : ""}
        </div>
        </div>
        ${showCrit ? `
        <div class="flexcol">
        <p><strong>Critical:</strong></p>
        <p style="font-size:32px;margin:0;" class="align-center"><strong>${critDamage}</strong></p>
        <div class="damage-buttons flexrow">
            <button class='apply-full-crit-damage' style="${btnStyling}"><i class="fas fa-user-minus" title="Click to apply full damage to selected token(s)."></i></i></button>
                <button class='apply-half-crit-damage' style="${btnStyling}"><i class="fas fa-user-shield" title="Click to apply half damage to selected token(s)."></i></button>
                <button class='apply-double-crit-damage' style="${btnStyling}"><i class="fas fa-user-injured" title="Click to apply double damage to selected token(s)."></i></button>
                <button class='apply-full-crit-healing' style="${btnStyling}"><i class="fas fa-user-plus" title="Click to apply full healing to selected token(s)."></i></button>
        </div></div>
        ` : ""}
        </section>
        ${showBuffButtons ? `<p><strong>Results:</strong> ${nonZeroValues}</p>
          <p><strong>Apply to:</strong> ${activeBuffs}</p>
          <button class='apply-buffs'>Apply Buffs / Debuffs</button>` : ""}
    </div>
`;

    const message = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content
    });
  }
}

// Event listeners for buttons
Hooks.on('renderChatMessage', (message, html, data) => {

  // Find the power-roll-card element
  const powerRollCard = html.find('.power-roll-card');
  if (!powerRollCard.length) return; // Exit if no power-roll-card is found

  // Extract data from the power-roll-card's attributes
  const regularDamage = parseFloat(powerRollCard.data('regular-damage'));
  const criticalDamage = parseFloat(powerRollCard.data('critical-damage'));
  const affinity = powerRollCard.data('affinity');
  const ignoreDefense = powerRollCard.data('ignore-defense');
  const pierce = powerRollCard.data('pierce');
  const affectsMP = powerRollCard.data('affects-mp');
  const buffsArray = powerRollCard.data('buffs');
  const applyBuffsTo = powerRollCard.data('apply-buffs-to');

  // Define the function to apply damage
  const applyDamage = function (amount, heals = false) {
    const tokens = canvas.tokens.controlled;
    if (!tokens.length) {
      ui.notifications.warn("No tokens selected.");
      return;
    }

    tokens.forEach(token => {
      const actor = token.actor;
      if (!actor) return;
      if (heals)
        actor.applyHeal(amount, affectsMP);
      else
        actor.applyDamage(amount, affinity, ignoreDefense, pierce, affectsMP);
    });
  };

  // Define the function to apply damage
  const applyBuffs = function (buffsArray, applyBuffsTo) {
    const tokens = canvas.tokens.controlled;
    if (!tokens.length) {
      ui.notifications.warn("No tokens selected.");
      return;
    }

    tokens.forEach(token => {
      const actor = token.actor;
      if (!actor) return;
      actor.applyBuffs(buffsArray, applyBuffsTo);
    });
  };

  // Set up button click handlers
  html.find('.apply-full-damage').click(() => applyDamage(regularDamage));
  html.find('.apply-half-damage').click(() => applyDamage(Math.floor(regularDamage / 2)));
  html.find('.apply-double-damage').click(() => applyDamage(regularDamage * 2));
  html.find('.apply-full-healing').click(() => applyDamage(regularDamage, true));

  html.find('.apply-full-crit-damage').click(() => applyDamage(criticalDamage));
  html.find('.apply-half-crit-damage').click(() => applyDamage(Math.floor(criticalDamage / 2)));
  html.find('.apply-double-crit-damage').click(() => applyDamage(criticalDamage * 2));
  html.find('.apply-full-crit-healing').click(() => applyDamage(criticalDamage, true));

  html.find('.apply-buffs').click(() => applyBuffs(buffsArray, applyBuffsTo));
});
