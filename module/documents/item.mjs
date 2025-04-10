/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class SMTXItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    super.prepareData();
    this.system.formula = ""
  }

  /**
   * Augment the actor source data with additional dynamic data.
   */
  prepareDerivedData() {
    if (!this.actor) return;

    const rollData = this.getRollData();
    const systemData = this.system;

    switch (this.type) {
      case "feature":
        this._prepareFeature(rollData);
        break;
      case "consumable":
        this._prepareConsumable(rollData);
        break;
      case "armor":
        for (let effect of this.effects.contents) {
          effect.update({ disabled: !this.system.equipped });
        }
        break;
    }
  }


  /**
   * Prepare feature items (weapons, spells, etc.).
   */
  _prepareFeature(rollData) {
    if (!this.actor) return;
    const systemData = this.system;
    const actorData = rollData;

    const isPoisoned = (actorData.badStatus == "POISON" && systemData.attackType != "none");

    // Fetch weapon stats from actor
    let weaponTN = 0, weaponPower = 0;
    if (systemData.wep) {
      const weaponSlot = systemData.wep === "a" ? "wepA" : systemData.wep === "b" ? "wepB" : null;
      if (weaponSlot) {
        weaponTN = !systemData.wepIgnoreTN ? actorData[weaponSlot]?.hit ?? 0 : 0;
        weaponPower = !systemData.wepIgnorePower ? actorData[weaponSlot]?.power ?? 0 : 0;
      }
    }


    let basePower = systemData.power;
    if (basePower == "") {
      basePower = 0;
      if (systemData.basePower == "melee")
        basePower = actorData.meleePower ?? "@meleePower";
      if (systemData.basePower == "ranged")
        basePower = actorData.rangedPower ?? "@rangedPower";
      if (systemData.basePower == "spell")
        basePower = actorData.spellPower ?? "@spellPower";
    }


    let baseDice = systemData.powerDice;
    let displayDice = "";
    if (baseDice == "") {
      const usedDice = systemData.basePowerDice == "match" ? systemData.basePower : systemData.basePowerDice;
      baseDice = actorData.powerDice[usedDice] ?? 0;
      baseDice += systemData.modPowerDice ? systemData.modPowerDice : 0;
      displayDice = baseDice > 0 ? `${baseDice}D` : ``;
    } else {
      const basePowerDiceRoll = new Roll(`${systemData.powerDice}` ?? "0", rollData).evaluateSync({ minimize: true });
      displayDice = basePowerDiceRoll.dice.reduce((sum, die) => sum + die.number, 0);
      displayDice = displayDice ? `${displayDice}D` : "";
    }

    // Condense Power modifier, set up template for X Booster effect
    const modPowerRoll = new Roll(`(${systemData.modPower}) + ${weaponPower}`, rollData).evaluateSync({ minimize: true });
    let booster = 1; // Flat multiplier (x2 per rules) to the Skill's Power Mod
    if (rollData.booster)
      if (rollData.booster[systemData.affinity])
        booster = rollData.booster[systemData.affinity];
    const modPower = Math.floor((modPowerRoll.total - (modPowerRoll.dice.reduce((sum, die) => sum + die.number, 0))) * booster);

    // Condense Power base, set up template for X Boost effect TODO
    const basePowerRoll = new Roll(`(${basePower}) + ${modPower}`, rollData).evaluateSync({ minimize: true });
    let boost = systemData.powerBoost; // Flat multiplier (x1.5 per rules) to the Skill's Final Power
    if (rollData.boost)
      if (rollData.boost[systemData.affinity])
        boost = rollData.boost[systemData.affinity];
    const staticPower = Math.floor((basePowerRoll.total - basePowerRoll.dice.reduce((sum, die) => sum + die.number, 0)) * boost);

    systemData.calcPower = displayDice + (displayDice && staticPower ? "+" : "") + (staticPower ? Math.floor(staticPower * (isPoisoned && systemData.attackType != "none" ? 0.5 : 1)) : "");
    systemData.calcPower = systemData.calcPower == "0" || systemData.calcPower == 0 ? "-" : systemData.calcPower;
    const formatDice = baseDice != systemData.powerDice ? `${baseDice}d10${systemData.explodeDice ? `x` : ``}` : baseDice;
    systemData.formula = `${formatDice ?? 0} + ${staticPower ?? 0}`;


    // Compute TN
    let baseTN = systemData.tn;
    if (baseTN == "") {
      switch (systemData.baseTN) {
        case "auto":
          baseTN = "Auto";
          break;
        case "dodge":
          baseTN = actorData.dodgetn;
          break;
        case "talk":
          baseTN = actorData.talktn;
          break;
        case "fifty":
          baseTN = 50;
          break;
        default:
          baseTN = actorData.stats[systemData.baseTN].tn;
          break;
      }
    }


    try {
      let quickTN = 0; // For non-derived stat TNs
      if (systemData.tn != "" && !systemData.tn.includes(".tn"))
        quickTN = actorData.quickModTN;

      const preCalcTN = new Roll(`(${baseTN}) + (${systemData.modTN}) + (${weaponTN}) + (${quickTN})`, rollData).evaluateSync();
      systemData.calcTN = isNaN(preCalcTN.total) ? baseTN : preCalcTN.total;
      if (actorData.badStatus == "PARALYZE" && systemData.attackType != "none")
        systemData.calcTN = Math.min(systemData.calcTN, 25)
    } catch (err) {
      systemData.calcTN = baseTN;
    }

    systemData.displayTN = isNaN(systemData.calcTN) ? systemData.calcTN : `${systemData.calcTN}%`;
  }

  /**
   * Prepare consumables (potions, etc.).
   */
  _prepareConsumable(rollData) {
    const systemData = this.system;

    // Compute Power Formula
    const preCalcPower = new Roll(systemData.power, rollData).evaluateSync({ minimize: true });
    systemData.formula = `(${systemData.powerDice || 0}) + (${preCalcPower.total})`;
  }


  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item
   * @override
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const rollData = foundry.utils.deepClone(this.system);

    // Quit early if there's no parent actor
    if (!this.actor) return rollData;

    // If present, add the actor's roll data
    const rollDataActor = this.actor.getRollData();
    rollDataActor.item = rollData

    return rollDataActor;
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

    // Retrieve the linked effect, if any.
    let effectDisplay = "";
    if (item.system.inflictedEffect) {
      // Retrieve the document using the stored UUID.
      const effectDoc = await fromUuid(item.system.inflictedEffect);
      if (effectDoc) {
        // Create a draggable HTML snippet that shows the effect's name.
        effectDisplay = `<div class="draggable-effect" draggable="true" data-uuid="${item.system.inflictedEffect}" style="border: 1px dashed #888; padding: 5px; margin-bottom: 5px; display:inline-block; cursor:move;">
        ${effectDoc.name}
      </div>`;
      }
    }

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const itemImg = item.img ? `<img src="${item.img}" style="width:32px; height:32px; vertical-align:middle; margin-right:5px;">` : '';
    const label = `<h2 style="display: flex; align-items: center;">${itemImg} ${item.name}</h2>`;

    let content = (item.system.shortEffect + `<hr>` + item.system.description) ?? '';

    // Optionally add extra info based on item type.
    switch (item.type) {
      case 'feature':
        const cost = item.system.cost ?? 'N/A';
        const target = item.system.target ?? 'N/A';
        const affinity = item.system.affinity ?? 'N/A';

        const featureInfo = `
        <div class="flexrow flex-center flex-between" style="display: flex; align-items: center;">
          <span><strong>Cost</strong></span>
          <span><strong>Target</strong></span>
          <span><strong>Affinity</strong></span>
        </div>
        <div class="flexrow flex-center flex-between" style="display: flex; align-items: center;">
          <span>${cost}</span>
          <span>${target}</span>
          <span>${game.i18n.localize("SMT_X.Affinity." + affinity)}</span>
        </div>
        <hr>
      `;

        content = featureInfo + content;
        break;
      default:
        break;
    }

    // Prepend the draggable effect display if present.
    if (effectDisplay) content = effectDisplay + "<br>" + content;

    ChatMessage.create({
      speaker: speaker,
      rollMode: rollMode,
      flavor: label,
      content: content,
    });
  }



  /**
 * Handle clickable rolls.
 * @param {Event} event   The originating click event
 * @private
 */
  async rollSplitD100(skipDialog = false, splits = 1) {
    const item = this;
    const systemData = item.system;
    let [modifier, split] = [0, splits];
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const itemImg = item.img ? `<img src="${item.img}" style="width:32px; height:32px; vertical-align:middle; margin-right:5px;">` : '';
    const label = `<div class="smtx-roll-header" style="display: flex; align-items: center;">${itemImg} ${item.name}</div>`;

    const cost = systemData.cost ?? 'N/A';
    const target = systemData.target ?? 'N/A';
    const affinity = systemData.affinity ?? 'N/A';
    const descriptionContent = `${item.system.shortEffect}`;

    let statusDisplay = ``;
    if (systemData.appliesBadStatus != "NONE") {
      // Create a draggable HTML snippet that shows the effect's name.
      statusDisplay = `<div class="draggable-status flex-center align-center" draggable="true" data-status="${systemData.appliesBadStatus}" style="border: 1px dashed #888; padding: 4px; margin: auto; cursor:move; background-color:PeachPuff; font-weight: bold;" title="Drag this onto an Actor or Token to apply the effect.">
        ${systemData.badStatusChance}% ${systemData.appliesBadStatus}
      </div>`;
    }


    let effectDisplay = ``;
    if (systemData.inflictedEffect) {
      // Retrieve the document using the stored UUID.
      const effectDoc = await fromUuid(systemData.inflictedEffect);
      if (effectDoc) {
        // Create a draggable HTML snippet that shows the effect's name.
        effectDisplay = `<div class="draggable-effect flex-center align-center" draggable="true" data-uuid="${systemData.inflictedEffect}" style="border: 1px dashed #888; padding: 4px; margin-bottom: auto; cursor:move; background-color:PeachPuff; font-weight: bold;">
        ${effectDoc.name}
      </div>`;
      }
    }


    // Step 1: Prompt the user for modifier and TN split
    if (!skipDialog) {
      const { dia_modifier, dia_split } = await new Promise((resolve) => {
        new Dialog({
          title: this.name + " Check Dialogue",
          content: `
        <form>
          <div class="form-group">
            <label for="modifier">TN Modifier:</label>
            <input type="number" id="modifier" name="modifier" value="0" />
          </div>
          <div class="form-group">
            <label for="split">Multi-action:</label>
            <select id="split" name="split">
              <option value="1">None</option>
              <option ${splits == 2 ? `selected` : ``} value="2">2-way</option>
              <option ${splits == 3 ? `selected` : ``} value="3">3-way</option>
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

    const featureInfoContent = `
      <div class="feature-info-container">
      <span class="feature-info-tag">Type: ${systemData.type}</span>
        <span class="feature-info-tag">Cost: ${cost}</span>
        ${systemData.uses.max > 0 ? `<span class="feature-info-tag">Used: ${systemData.uses.value}/${systemData.uses.max}</span>` : ``}
        <span class="feature-info-tag">Target: ${target}</span>
        ${affinity != "none" ? `<span class="feature-info-tag">Affinity: ${game.i18n.localize("SMT_X.Affinity." + affinity)}</span>` : ``}
        ${item.actor.system.badStatus != "NONE" ? `<span class="feature-info-tag">Status: ${game.i18n.localize("SMT_X.AffinityBS." + item.actor.system.badStatus)}</span>` : ``}
        ${split != 1 ? `<span class="feature-info-tag">Multi-action: ${split}</span>` : ``}
        ${item.actor.system.quickModTN != 0 ? `<span class="feature-info-tag">Sheet TN: ${item.actor.system.quickModTN}%</span>` : ``}
        ${modifier != 0 ? `<span class="feature-info-tag">Dialog TN: ${modifier}%</span>` : ``}
      </div>
    `;

    if (isNaN(systemData.calcTN)) {
      ChatMessage.create({
        speaker: speaker,
        rolMode: rollMode,
        flavor: label,
        content: `<div>${featureInfoContent}</div>
          <hr>
          ${descriptionContent}
          ${statusDisplay}
          ${effectDisplay}
          <hr>
          `,
      });

      return
    }

    // Step 2: Calculate modified TN and split values
    const baseTN = systemData.calcTN ?? 0;
    const modifiedTN = baseTN + modifier;
    const splitTN = Math.max(1, split);
    const tnParts = Array.from({ length: splitTN }, (_, i) => Math.floor(modifiedTN / splitTN));

    // Step 3: Perform the rolls and evaluate results
    const critRangeParts = (systemData.critRange ?? "1/10").split("/").map(Number);
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
        } else if (roll.total >= (this.actor.system.isCursed ? 86 : 96) && roll.total <= 99) {
          result = "Auto Fail"; // Rolls 96+ (Cursed 86+) are automatic failures
        } else if (roll.total <= (tn * critRate) + Number(systemData.flatCritChance)) {
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
        <span><strong>Mod</strong></span>
        <span><strong>Multi</strong></span>
    </div>
    <div class="flexrow flex-center flex-between" style="display: flex; align-items: center;">
        <span>${baseTN}%</span>
        <span>${modifier >= 0 ? "+" : ""}${modifier}%</span>
        <span>${splitTN}</span>
    </div>
`;

    // Step 4: Send results to chat
    const rollResults = `
  <div class="roll-results-container" 
       data-tnparts='${JSON.stringify(tnParts)}'
       data-crit-rate='${critRate}'
       data-flat-crit-chance='${systemData.flatCritChance}'
       data-is-cursed='${this.actor.system.isCursed}'>
    <div class="flexrow flex-group-center flex-between" style="font-size: 14px; font-weight: bold;">
      ${tnParts.map((tn, i) => `<span class="tn-display" data-split-index="${i}">TN ${tn}%</span>`).join("")}
    </div>
    <div class="flexrow flex-group-center flex-between" style="font-size: var(--font-size-20); font-weight: bold;">
      ${rolls.map(({ roll }, i) => `
        <span class="roll-result" data-split-index="${i}" data-tn="${tnParts[i]}"
              style="border: 2px solid #ccc; border-radius: 4px; padding: 4px; margin: 2px; cursor: pointer;"
              title="Click to re-roll; Shift-click to modify TN">
          ${roll.total}
        </span>`).join("")}
    </div>
    <div class="flexrow flex-group-center flex-between" style="font-size: 12px;">
      ${rolls.map(({ result }, i) => `
        <span class="roll-result-desc" data-split-index="${i}">
          <em>(${result})</em>
        </span>`).join("")}
    </div>
  </div>
`;


    // Retrieve the currently targeted tokens.
    const targets = Array.from(game.user.targets);
    let targetHtml = "";
    if (targets.length && tnParts.length) {
      targetHtml += `<hr>`;
      targetHtml += `<button class="roll-all-dodges smtx-roll-button">Roll Pending Dodges</button>`;
      targets.forEach(target => {
        const tokenName = target.document.name;
        targetHtml += `
      <div class="target-row" style="margin-bottom: 10px;">
        <div class="flexrow" style="justify-content: space-between; align-items: center;">
          <span class="target-name" data-token-id="${target.id}" style="font-weight: bold; cursor: pointer;">${tokenName}'s Dodge</span>
          <span class="target-bs" style="text-align: right;">
            ${target.actor.system.badStatus !== "NONE"
            ? game.i18n.localize((game.settings.get("smt-200x", "showTCheaders")
              ? "SMT_X.AffinityBS_TC."
              : "SMT_X.AffinityBS.") + target.actor.system.badStatus)
            : ""}
          </span>
        </div>
        <div class="flexrow dodge-buttons">
          ${tnParts.map((tn, i) => {
              if (["STONE", "BIND", "FREEZE", "SLEEP", "SHOCK", "DEAD"].includes(target.actor.system.badStatus)) {
                return `<button class="chat-dodge-split smtx-roll-button smtx-roll-button-disabled" data-target-id="${target.id}" data-split-index="${i}" disabled>Can't</button>`;
              } else if (["Fail", "Auto Fail", "Fumble"].includes(rolls[i].result)) {
                return `<button class="chat-dodge-split smtx-roll-button smtx-roll-button-disabled" data-target-id="${target.id}" data-split-index="${i}" disabled>Miss</button>`;
              } else {
                return `<button class="chat-dodge-split smtx-roll-button" data-target-id="${target.id}" data-split-index="${i}">Click</button>`;
              }
            }).join('')}
        </div>
      </div>`;
      });
      targetHtml += `<hr>`;
      if (tnParts.length > 0) {
        let effectButtonsHtml = `<div class="flexrow effect-buttons">` +
          tnParts.map((tn, i) => {
            const isDisabled = (rolls[i] && ["Fail", "Auto Fail", "Fumble"].includes(rolls[i].result));
            return `<button class="apply-effect smtx-roll-button ${isDisabled ? "smtx-roll-button-disabled" : ""}" 
                      data-split-index="${i}" 
                      data-item-id="${this.id}" 
                      data-actor-id="${this.actor.id}"
                      data-token-id="${this.actor.token ? this.actor.token.id : null}">
                Effect ${i + 1}
              </button>`;
          }).join('') +
          `</div>`;
        targetHtml += effectButtonsHtml;
      }
    }

    ChatMessage.create({
      speaker: speaker,
      rollMode: rollMode,
      flavor: label,
      content: `
      <div>${featureInfoContent}</div>
      <hr>
    ${rollResults}
    <hr>
    ${descriptionContent}
    ${statusDisplay}
    ${effectDisplay}
    <hr>
    <details>
      <summary style="cursor: pointer; font-weight: bold;">Details</summary>
      <div>
        ${tnInfoContent}
      </div>
    </details>
    ${targetHtml}`,
    });

    if (item.actor.system.resetModTN) {
      await item.actor.update({ "system.quickModTN": 0 });
    }
  }



  /**
  * Handle clickable rolls.
  * @param {Event} event   The originating click event
  * @private
  */
  async rollPower(skipDialog = false) {
    const item = this;
    const systemData = item.system;
    const rollData = item.getRollData();

    const speaker = ChatMessage.getSpeaker({ actor: item.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const itemImg = item.img ? `<img src="${item.img}" style="width:32px; height:32px; vertical-align:middle; margin-right:5px;">` : '';
    const label = `<h2 style="display: flex; align-items: center;">${itemImg} ${item.name} Power Roll</h2>`;

    const cost = item.system.cost ?? 'N/A';
    const target = item.system.target ?? 'N/A';
    const affinity = item.system.affinity ?? 'N/A';
    const featureInfoContent = `
          <div class="flexrow flex-center flex-between" style="display: flex; align-items: center;">
            <span><strong>Cost</strong></span>
            <span><strong>Target</strong></span>
            <span><strong>Affinity</strong></span>
          </div>
          <div class="flexrow flex-center flex-between" style="display: flex; align-items: center;">
            <span>${cost}</span>
            <span>${target}</span>
            <span>${game.i18n.localize("SMT_X.Affinity." + affinity)}</span>
          </div>
        `;
    const descriptionContent = `${item.system.shortEffect}<hr>${item.system.description}`;

    let overrides = {
      bonusFormula: "",
      affinity: systemData.affinity,
      ignoreDefense: systemData.ingoreDefense,
      halfDefense: systemData.halfDefense,
      pierce: systemData.pierce,
      critMult: systemData.critMult,
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
                        <label for="pierce">Pierce (unusued):</label>
                        <input type="checkbox" id="pierce" name="pierce" ${overrides.pierce ? "checked" : ""} />
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
                const halfDefense = html.find('input[name="halfDefense"]').is(":checked");
                const pierce = html.find('input[name="pierce"]').is(":checked");
                const critMult = parseFloat(html.find('input[name="critMult"]').val()) || 2;
                const extraModifier = html.find('input[name="extraModifier"]').val() || "0";
                const baseMult = html.find('input[name="baseMult"]').val() || "1";
                resolve({ affinity, ignoreDefense, halfDefense, pierce, critMult, extraModifier, baseMult });
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
    let rollFormula = systemData.formula;

    if (overrides.extraModifier.trim() !== "0") {
      rollFormula += ` + (${overrides.extraModifier.trim()})`;
    }

    if (item.actor.system?.chargeMod) {
      rollFormula = `(${rollFormula})*${item.actor.system.chargeMod}`;
    }

    // Roll for regular damage
    const regularRoll = new Roll(rollFormula, rollData);
    await regularRoll.evaluate();

    if (game.dice3d)
      await game.dice3d.showForRoll(regularRoll, game.user, true)

    const finalBaseDmg = Math.floor((regularRoll.total) * overrides.baseMult)

    // Roll for sub-formula
    const hasBuffSubRoll = systemData.subBuffRoll != "" ? true : false;
    const subBuffRoll = new Roll(hasBuffSubRoll ? systemData.subBuffRoll : "0", rollData);
    await subBuffRoll.evaluate();

    if (game.dice3d && hasBuffSubRoll)
      await game.dice3d.showForRoll(subBuffRoll, game.user, true)

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
    const critDamage = Math.floor(finalBaseDmg * overrides.critMult) + Number(systemData.flatCritDamage);

    // Determine button visibility based on affinity
    const hideDamage = (hasBuffs && !hasBuffSubRoll);
    const showCrit = overrides.affinity !== "recovery" && overrides.affinity !== "none" && !systemData.hideCritDamage && !hideDamage;
    const showDamageButtons = overrides.affinity !== "recovery" && overrides.affinity !== "none" && !hideDamage;
    const showHealing = overrides.affinity == "recovery";
    const showBuffButtons = hasBuffs || hasBuffSubRoll;

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
          data-affects-mp='${systemData.affectsMP}' 
          data-regular-damage="${finalBaseDmg}" 
          data-critical-damage="${critDamage}" 
          data-buffs='${JSON.stringify(buffArray)}' 
          data-apply-buffs-to='${JSON.stringify(systemData.buffs)}'>
        
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
        
        ${showBuffButtons ? `
          <hr>
          <p><strong>Buff / Debuff Results:</strong> ${nonZeroValues}</p>
          <button class='apply-buffs-friendly'>Apply to:</strong> Friendly ${activeBuffs}</button>
          <button class='apply-buffs-hostile'>Apply to:</strong> Hostile ${activeBuffs}</button>
        ` : ""}
        
        <hr>
        <div>${descriptionContent}</div>
      </div>
    `;


    const message = await ChatMessage.create({
      speaker: speaker,
      rollMode: rollMode,
      flavor: label,
      content
    });
  }




  async rollEffect(event) {
    event.preventDefault();
    const splitIndex = $(event.currentTarget).data("split-index");

    // Instead of scanning the entire DOM, narrow your search to the chat message container.
    const messageContainer = $(event.currentTarget).closest(".message-content");

    // --- 1. Determine Outcome for This Split ---
    const rollDescElem = messageContainer.find(`.roll-result-desc[data-split-index="${splitIndex}"]`);
    let outcome = "Success";
    if (rollDescElem) {
      console.log(rollDescElem[0].innerText)
      const text = rollDescElem[0].innerText.toLowerCase();
      if (text.includes("critical")) outcome = "Critical";
    }
    const baseEffect = (outcome === "Critical") ? 2 : 1;

    // --- 2. Gather Dodge Data for This Split ---
    let targetData = [];
    messageContainer.find(".target-row").each(function () {
      const tokenId = $(this).find(".target-name").data("token-id");
      const dodgeElem = $(this).find(`.chat-dodge-split[data-split-index="${splitIndex}"]`);
      const dodgeText = dodgeElem.length ? dodgeElem.text().trim() : "";
      targetData.push({ tokenId, dodgeText });
    });

    // --- 3. Compute Dodge-Based Multiplier for This Split ---
    const finalEffects = targetData.map(target => {
      let finalEffect = baseEffect;
      const txt = target.dodgeText;
      if (txt.startsWith("Crit")) {
        finalEffect = 0;
      } else if (txt.startsWith("Pass") || txt.startsWith("Miss")) {
        finalEffect = (baseEffect === 2) ? 1 : 0;
      } else if (txt.startsWith("Fumble")) {
        finalEffect = baseEffect * 2;
      } else if (txt.startsWith("Fail") || txt.startsWith("Can't")) {
        finalEffect = baseEffect;
      }
      return { tokenId: target.tokenId, finalEffect };
    });

    // --- 4. Roll Damage Once ---
    const item = this;
    const systemData = item.system;
    const rollData = item.getRollData();

    // Determine if any buff categories are active
    const hasBuffs = Object.values(systemData.buffs).some(value => value === true);

    // Check if a subBuffRoll is provided
    const hasBuffSubRoll = systemData.subBuffRoll && systemData.subBuffRoll.trim() !== "";
    let subBuffRoll;
    if (hasBuffSubRoll) {
      subBuffRoll = new Roll(systemData.subBuffRoll, rollData);
      await subBuffRoll.evaluate();
      if (game.dice3d) await game.dice3d.showForRoll(subBuffRoll, game.user, true);
    }

    let rollFormula = systemData.formula;

    if (item.actor.system?.chargeMod) {
      rollFormula = `(${rollFormula})*${item.actor.system.chargeMod}`;
    }

    const isPoisoned = (this.actor.system.badStatus === "POISON" && systemData.attackType !== "none");
    const damageRoll = new Roll(isPoisoned ? "floor(  (" + rollFormula + ") / 2  )" : rollFormula, rollData);
    await damageRoll.evaluate();
    if (game.dice3d) await game.dice3d.showForRoll(damageRoll, game.user, true);
    const baseDamage = Math.floor(damageRoll.total);
    const diceHtml = await damageRoll.render();

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

    const buffArray = processRoll(hasBuffSubRoll ? subBuffRoll : damageRoll);

    // For display, you might want to show the subBuffRoll result
    const subRollDisplay = hasBuffSubRoll ? await subBuffRoll.render() : "";
    // Decide whether to show buff buttons based on buffs flags or the presence of a sub roll.
    const showBuffButtons = hasBuffs || hasBuffSubRoll;

    const activeBuffs = Object.entries(systemData.buffs)
      .filter(([key, value]) => value === true)
      .map(([key]) => key)
      .join(", ");

    const buffContent = `${showBuffButtons ?
      `<p>Applies to: ${activeBuffs}</p> ${subRollDisplay} 
      <div class="flexrow buff-button-container" data-apply-buffs-to='${JSON.stringify(systemData.buffs)}' data-buffs='${JSON.stringify(buffArray)}'>
      <button class="apply-buffs-friendly smtx-roll-button">Apply to PCs</button>
      <button class="apply-buffs-hostile smtx-roll-button">Apply to Hostiles</button>
    </div>` : ""}`;

    // --- 5. Compute Damage per Target (Dodge Only) ---
    const damageResults = (await Promise.all(finalEffects
      .filter(target => target.finalEffect !== 0)
      .map(async target => {
        const token = canvas.tokens.get(target.tokenId);
        const tokenName = token ? token.document.name : target.tokenId;
        // Calculate damage based solely on the dodge multiplier.
        const effectiveDamage = baseDamage * target.finalEffect;
        // Retrieve the target's overall affinity toward the incoming attack.
        const affinityStrength = token && token.actor && token.actor.system.affinityFinal
          ? token.actor.system.affinityFinal[systemData.affinity]
          : "normal";
        const badStatus = token && token.actor ? token.actor.system.badStatus : "NONE";

        // Determine the basic affinity multiplier.
        let affinityMultiplier = 1;
        switch (affinityStrength.toLowerCase()) {
          case "weak":
            affinityMultiplier = 2;
            break;
          case "resist":
            affinityMultiplier = 0.5;
            break;
          case "null":
          case "repel":
            affinityMultiplier = 0;
            break;
          case "drain":
            affinityMultiplier = -1;
            break;
          default:
            affinityMultiplier = 1;
        }

        // TODO It seems that Magic doesn't stack with other aff
        // --- Compute Magic Multiplier ---
        let magicMultiplier = 1;
        const magicX = !["strike", "gun", "almighty"].includes(systemData.affinity.toLowerCase());
        const magicTC = ["fire", "ice", "elec", "force"].includes(systemData.affinity.toLowerCase());
        if (game.settings.get("smt-200x", "showTCheaders") ? magicTC : magicX) {
          const magicAffinity = token && token.actor && token.actor.system.affinityFinal && token.actor.system.affinityFinal.magic
            ? token.actor.system.affinityFinal.magic
            : "normal";
          switch (magicAffinity.toLowerCase()) {
            case "weak":
              magicMultiplier = 2;
              break;
            case "resist":
              magicMultiplier = 0.5;
              break;
            case "null":
            case "repel":
              magicMultiplier = 0;
              break;
            case "drain":
              magicMultiplier = -1;
              break;
            default:
              magicMultiplier = 1;
          }
        }

        // --- Compute Bad Status (BS) Affinity Multiplier ---
        let bsAffinityMultiplier = 1;
        let bsAffinityStr = "normal";
        if (token && token.actor && token.actor.system.affinityBSFinal) {
          if (token.actor.system.affinityBSFinal[systemData.appliesBadStatus]) {
            bsAffinityStr = token.actor.system.affinityBSFinal[systemData.appliesBadStatus];
          }
          switch (bsAffinityStr.toLowerCase()) {
            case "weak":
              bsAffinityMultiplier = 2;
              break;
            case "resist":
              bsAffinityMultiplier = 0.5;
              break;
            case "null":
            case "repel":
            case "drain":
              bsAffinityMultiplier = 0;
              break;
            default:
              bsAffinityMultiplier = 1;
          }
          if (token.actor.system.affinityBSFinal.BS) {
            bsAffinityStr = token.actor.system.affinityBSFinal.BS;
            switch (bsAffinityStr.toLowerCase()) {
              case "weak":
                bsAffinityMultiplier *= 2;
                break;
              case "resist":
                bsAffinityMultiplier *= 0.5;
                break;
              case "null":
              case "repel":
              case "drain":
                bsAffinityMultiplier *= 0;
                break;
              default:
                bsAffinityMultiplier *= 1;
            }
          }
        }

        // Compute the final damage.
        const finalDamage = effectiveDamage * affinityMultiplier * magicMultiplier;

        // --- Compute Ailment Chance ---
        let ailmentChance = 0;
        let ailmentRollResult = null;
        let rawChance = 0;
        if (systemData.appliesBadStatus && systemData.badStatusChance && ((1 * affinityMultiplier * bsAffinityMultiplier * magicMultiplier * target.finalEffect) > 0)) {
          rawChance = systemData.badStatusChance * affinityMultiplier * bsAffinityMultiplier * magicMultiplier * target.finalEffect;
          if (rawChance < 0) rawChance = 0;
          if (rawChance < 5) rawChance = 5;
          if (rawChance > 95) rawChance = 95;
          ailmentChance = rawChance;
          let rollForAilment = new Roll("1d100");
          await rollForAilment.evaluate();
          ailmentRollResult = rollForAilment.total;
        }
        return {
          tokenId: target.tokenId,
          tokenName,
          effectiveDamage,
          multiplier: target.finalEffect,
          affinityStrength,
          badStatus,
          affinityMultiplier,
          magicMultiplier,
          bsAffinityMultiplier,
          finalDamage,
          ailmentChance,
          ailmentRoll: ailmentRollResult,
          bsAffinity: bsAffinityStr,
          rawBSchance: rawChance
        };
      }))).filter(result => result.badStatus.toUpperCase() !== "DEAD");

    // --- 6. Log the Damage Roll Results ---
    let logMessage = `${baseDamage > 0 ? diceHtml : ``} ${buffContent}`;
    damageResults.forEach(result => {
      let currentToken = canvas.tokens.get(result.tokenId);
      logMessage += `<div class="flexcol target-row" data-token-id="${result.tokenId}" style="margin: 10px 0px">
        <div class="flexrow">
          <strong>${result.tokenName}:</strong>
          <span>(${game.i18n.localize((game.settings.get("smt-200x", "showTCheaders")
        ? "SMT_X.CharAffinity_TC."
        : "SMT_X.CharAffinity.") + result.affinityStrength)} 
           ${game.i18n.localize((game.settings.get("smt-200x", "showTCheaders")
          ? "SMT_X.Affinity_TC."
          : "SMT_X.Affinity.") + systemData.affinity)})</span>
          <span>${result.badStatus != "NONE"
          ? game.i18n.localize((game.settings.get("smt-200x", "showTCheaders")
            ? "SMT_X.AffinityBS_TC."
            : "SMT_X.AffinityBS.") + result.badStatus)
          : ""}</span>
         </div>
         ${baseDamage > 0 ? `
  <div class="flexrow"><span class="flex3"><strong>Inc. Dmg:</strong> ${result.finalDamage}</span>
    <button class="apply-damage-btn smtx-roll-button" title="Apply Damage" 
      data-token-id="${result.tokenId}"
      data-effective-damage="${result.effectiveDamage}"
      data-affinity="${systemData.affinity}"
      data-ignore-defense="${systemData.ingoreDefense}"
      data-half-defense="${systemData.halfDefense}"
      data-critical="${baseEffect === 2}"
      data-affects-mp="${systemData.affectsMP}"
      data-lifedrain="${systemData.lifeDrain}"
      data-manadrain="${systemData.manaDrain}"
    >DMG</button>
    </div>` : ``}
    ${(systemData.appliesBadStatus != "NONE" && result.rawBSchance > 0)
          ? `<div>${result.ailmentChance}% ${systemData.appliesBadStatus} (Roll: ${result.ailmentRoll})</div>`
          : ""}  
    ${(systemData.hpCut > 0)
          ? `<div class="flexrow"><span class="flex3">HP cut to ${Math.floor(systemData.hpCut * 100)}% ! (${currentToken.actor.system.hp.value} -> ${Math.floor(currentToken.actor.system.hp.value * systemData.hpCut)})</span>
            <button class="apply-damage-btn smtx-roll-button" title="Apply Damage" 
              data-token-id="${result.tokenId}"
              data-effective-damage="${currentToken.actor.system.hp.value - Math.floor(currentToken.actor.system.hp.value * systemData.hpCut)}"
              data-affinity="almighty"
              data-ignore-defense="true"
            >CUT</button>
          </div>`
          : ""}  
</div><hr>`;
    });


    const speaker = ChatMessage.getSpeaker({ actor: item.actor });
    await ChatMessage.create({
      speaker: speaker,
      flavor: `${item.name} Effect (${splitIndex + 1})`,
      content: logMessage
    });
  }
}













// Event listeners for buttons
Hooks.on('renderChatMessage', (message, html, data) => {
  html.find('.target-name').on('click', (event) => {
    const tokenId = $(event.currentTarget).data('token-id');
    const token = canvas.tokens.get(tokenId);
    if (token && token.actor) {
      token.actor.sheet.render(true);
    }
  });



  html.find('.apply-effect').on('click', async (event) => {
    event.preventDefault();
    const itemId = $(event.currentTarget).data('item-id');
    const actorId = $(event.currentTarget).data('actor-id');
    const tokenId = $(event.currentTarget).data('token-id');
    const actor = game.actors.get(actorId);
    const token = canvas.tokens.get(tokenId);
    const item = actor ? actor.items.get(itemId) : null;
    const itemToken = token ? token.actor.items.get(itemId) : null;

    if (item)
      await item.rollEffect(event);
    else if (itemToken)
      await itemToken.rollEffect(event);
  });



  html.find('.chat-dodge-split').on('click', async (event) => {
    event.preventDefault();
    const $button = $(event.currentTarget);
    const targetId = $button.data('target-id');
    const splitIndex = $button.data('split-index');
    const token = canvas.tokens.get(targetId);

    if (!game.user.isGM && !(message.author.id === game.user.id || (token && token.actor.isOwner))) {
      ui.notifications.warn("You do not have permission to click this button.");
      return;
    }

    // If ALT+click, cycle through choices without a roll.
    if (event.altKey) {
      if (!game.user.isGM) return;

      const cycleOrder = ["Crit", "Pass", "Fail", "Fumble"];
      let currentText = $button.text().trim();
      // Attempt to detect the current state from the button text.
      let currentResult = cycleOrder.find(choice => currentText.startsWith(choice)) || "Fail";
      let currentIndex = cycleOrder.indexOf(currentResult);
      let newIndex = (currentIndex + 1) % cycleOrder.length;
      let newResult = cycleOrder[newIndex];

      const newButtonHtml = `<button class="chat-dodge-split smtx-roll-button" data-target-id="${targetId}" data-split-index="${splitIndex}">
      ${newResult}
    </button>`;

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = message.content;
      const btnInContent = tempDiv.querySelector(`button.chat-dodge-split[data-target-id="${targetId}"][data-split-index="${splitIndex}"]`);
      btnInContent.outerHTML = newButtonHtml;

      await updateChatMessage(message, tempDiv.innerHTML);
      return;
    }

    // Normal dice roll logic for non-ALT clicks.
    const dodgeRoll = new Roll("1d100");
    await dodgeRoll.evaluate();
    if (game.dice3d) await game.dice3d.showForRoll(dodgeRoll, game.user, true);

    let result = "Fail";
    if (dodgeRoll.total === 1) result = "Crit";
    else if (dodgeRoll.total === 100) result = "Fumble";
    else if (dodgeRoll.total >= (token.actor.system.isCursed ? 86 : 96) && dodgeRoll.total <= 99) result = "Fail";
    else if (dodgeRoll.total <= Math.floor(token.actor.system.dodgetn / 10)) result = "Crit";
    else if (dodgeRoll.total <= token.actor.system.dodgetn) result = "Pass";

    const newButtonHtml = `<button class="chat-dodge-split smtx-roll-button" data-target-id="${targetId}" data-split-index="${splitIndex}">
    ${result} (${dodgeRoll.total})
  </button>`;

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = message.content;
    const btnInContent = tempDiv.querySelector(`button.chat-dodge-split[data-target-id="${targetId}"][data-split-index="${splitIndex}"]`);
    btnInContent.outerHTML = newButtonHtml;

    await updateChatMessage(message, tempDiv.innerHTML);
  });



  // ----- "Roll All Dodges" Button Handler -----
  html.find('.roll-all-dodges').on('click', async (event) => {
    event.preventDefault();
    const $pendingButtons = html.find('button.chat-dodge-split').filter(function () {
      return $(this).text().trim().startsWith("Click");
    });

    for (let i = 0; i < $pendingButtons.length; i++) {
      const $btn = $($pendingButtons[i]);
      const targetId = $btn.data('target-id');
      const splitIndex = $btn.data('split-index');
      const token = canvas.tokens.get(targetId);
      if (!token) continue;

      const dodgeRoll = new Roll("1d100");
      await dodgeRoll.evaluate();
      if (game.dice3d) await game.dice3d.showForRoll(dodgeRoll, game.user, true);

      let result = "Fail";
      if (dodgeRoll.total === 1) {
        result = "Crit";
      } else if (dodgeRoll.total === 100) {
        result = "Fumble";
      } else if (dodgeRoll.total >= (token.actor.system.isCursed ? 86 : 96) && dodgeRoll.total <= 99) {
        result = "Fail";
      } else if (dodgeRoll.total <= Math.floor(token.actor.system.dodgetn / 10)) {
        result = "Crit";
      } else if (dodgeRoll.total <= token.actor.system.dodgetn) {
        result = "Pass";
      }

      const newButtonHtml = `<button class="chat-dodge-split smtx-roll-button" data-target-id="${targetId}" data-split-index="${splitIndex}">
      ${result} (${dodgeRoll.total})
    </button>`;

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = message.content;
      const btnInContent = tempDiv.querySelector(`button.chat-dodge-split[data-target-id="${targetId}"][data-split-index="${splitIndex}"]`);
      if (btnInContent) {
        btnInContent.outerHTML = newButtonHtml;
        await updateChatMessage(message, tempDiv.innerHTML);
      }
    }
  });



  html.find('.roll-results-container').on('click', '.roll-result', async (event) => {
    event.preventDefault();
    if (!game.user.isGM && message.author.id !== game.user.id) return;

    const $el = $(event.currentTarget);
    const splitIndex = parseInt($el.data('split-index'), 10);

    // ALT+Click: Cycle through outcomes instead of rolling.
    if (event.altKey) {
      if (!game.user.isGM) return;
      // Define the cycle order.
      const cycleOrder = ["Success", "Critical", "Failure", "Fumble"];
      // Locate the current outcome from the roll result description.
      const currentDescHtml = $el.closest('.roll-results-container')
        .find(`span.roll-result-desc[data-split-index="${splitIndex}"]`).html() || "";
      // Remove any HTML tags and surrounding parentheses.
      const currentText = currentDescHtml.replace(/<[^>]+>/g, "").replace(/[()]/g, "").trim();
      // Find the current outcome (default to "Success" if no match).
      let currentOutcome = cycleOrder.find(choice => choice.toLowerCase() === currentText.toLowerCase()) || "Success";
      let currentIndex = cycleOrder.indexOf(currentOutcome);
      let newIndex = (currentIndex + 1) % cycleOrder.length;
      let newOutcome = cycleOrder[newIndex];

      // Create a temporary container from the current message content.
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = message.content;

      // Update the roll-result description with the new outcome.
      const rollResultDescEl = tempDiv.querySelector(`.roll-results-container span.roll-result-desc[data-split-index="${splitIndex}"]`);
      if (rollResultDescEl) {
        rollResultDescEl.innerHTML = `<em>(${newOutcome})</em>`;
      }

      // Determine appropriate dodge button label/state based on the new outcome.
      let dodgeLabel, disableDodge;
      if (newOutcome === "Failure" || newOutcome === "Fumble") {
        dodgeLabel = "Miss";
        disableDodge = true;
      } else {
        dodgeLabel = "Click";
        disableDodge = false;
      }
      // Update all corresponding dodge buttons in the tempDiv.
      tempDiv.querySelectorAll(`button.chat-dodge-split[data-split-index="${splitIndex}"]`).forEach(btn => {
        const tokenId = btn.getAttribute("data-target-id");
        const token = canvas.tokens.get(tokenId);
        const affectedStatuses = ["STONE", "BIND", "FREEZE", "SLEEP", "SHOCK", "DEAD"];
        if (token && affectedStatuses.includes(token.actor.system.badStatus)) {
          btn.disabled = true;
          btn.style.opacity = "0.5";
          btn.style.cursor = "not-allowed";
          btn.textContent = "Can't";
        } else {
          btn.disabled = disableDodge;
          btn.style.opacity = disableDodge ? "0.5" : "1";
          btn.style.cursor = disableDodge ? "not-allowed" : "pointer";
          btn.textContent = dodgeLabel;
        }
      });

      // Update the corresponding Effect button for this split.
      const effectButton = tempDiv.querySelector(`button.apply-effect[data-split-index="${splitIndex}"]`);
      if (effectButton) {
        if (["Failure", "Fumble"].includes(newOutcome)) {
          effectButton.classList.add("smtx-roll-button-disabled");
          effectButton.disabled = true;
        } else {
          effectButton.classList.remove("smtx-roll-button-disabled");
          effectButton.disabled = false;
        }
      }

      // Update the chat message with the modified HTML.
      await updateChatMessage(message, tempDiv.innerHTML);
      return;
    }

    // Otherwise, proceed with standard re-roll logic.

    // Retrieve stored values from the container.
    const $container = $el.closest('.roll-results-container');
    let tnParts = JSON.parse($container.attr('data-tnparts'));
    const critRate = parseFloat($container.attr('data-crit-rate'));
    const flatCritChance = parseFloat($container.attr('data-flat-crit-chance'));
    const isCursed = $container.attr('data-is-cursed') === "true";

    // Get the current TN value for this split.
    let currentTN = tnParts[splitIndex];
    let tnForRoll = currentTN;

    // If the user SHIFT-clicks, prompt for a TN modifier.
    if (event.shiftKey) {
      const tnModifier = await new Promise(resolve => {
        new Dialog({
          title: "TN Modifier",
          content: `<p>Enter a TN modifier:</p>
                  <input type="number" id="tn-modifier" name="tn-modifier" value="0"/>`,
          buttons: {
            ok: {
              label: "OK",
              callback: (dialogHtml) => resolve(parseInt(dialogHtml.find('#tn-modifier').val(), 10) || 0)
            },
            cancel: {
              label: "Cancel",
              callback: () => resolve(0)
            }
          },
          default: "ok"
        }).render(true);
      });
      tnForRoll = currentTN + tnModifier;
      // Update the stored TN for this split for future re-rolls.
      tnParts[splitIndex] = tnForRoll;
      $container.attr('data-tnparts', JSON.stringify(tnParts));
    }

    // Re-roll 1d100 for this split.
    const newRoll = new Roll("1d100");
    await newRoll.evaluate();
    if (game.dice3d) await game.dice3d.showForRoll(newRoll, game.user, true);

    // Calculate the new result using tnForRoll.
    let newResult = "Fail";
    if (newRoll.total === 1) {
      newResult = "Critical";
    } else if (newRoll.total === 100) {
      newResult = "Fumble";
    } else if (newRoll.total >= (isCursed ? 86 : 96) && newRoll.total <= 99) {
      newResult = "Auto Fail";
    } else if (newRoll.total <= (tnForRoll * critRate) + flatCritChance) {
      newResult = "Critical";
    } else if (newRoll.total <= tnForRoll) {
      newResult = "Success";
    }

    // Create a temporary container (copy) of the original message content.
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = message.content;

    // *** Update the tnparts attribute in tempDiv so that the new data persists ***
    const tempContainer = tempDiv.querySelector('.roll-results-container');
    if (tempContainer) {
      tempContainer.setAttribute('data-tnparts', JSON.stringify(tnParts));
    }

    // Update roll result, description, and TN display within the tempDiv.
    const rollResultEl = tempDiv.querySelector(`.roll-results-container span.roll-result[data-split-index="${splitIndex}"]`);
    if (rollResultEl) rollResultEl.textContent = newRoll.total;
    const rollResultDescEl = tempDiv.querySelector(`.roll-results-container span.roll-result-desc[data-split-index="${splitIndex}"]`);
    if (rollResultDescEl) rollResultDescEl.innerHTML = `<em>(${newResult})</em>`;
    const tnDisplayEl = tempDiv.querySelector(`.roll-results-container span.tn-display[data-split-index="${splitIndex}"]`);
    if (tnDisplayEl) tnDisplayEl.textContent = `TN ${tnForRoll}%`;

    // Determine the default dodge button label and state based on the re-roll result.
    let dodgeLabel, disableDodge;
    if (newResult === "Fail" || newResult === "Fumble" || newResult === "Auto Fail") {
      dodgeLabel = "Miss";
      disableDodge = true;
    } else {
      dodgeLabel = "Click";
      disableDodge = false;
    }

    // Update all corresponding dodge buttons using standard DOM methods on tempDiv.
    tempDiv.querySelectorAll(`button.chat-dodge-split[data-split-index="${splitIndex}"]`).forEach(btn => {
      const tokenId = btn.getAttribute("data-target-id");
      const token = canvas.tokens.get(tokenId);
      const affectedStatuses = ["STONE", "BIND", "FREEZE", "SLEEP", "SHOCK", "DEAD"];
      if (token && affectedStatuses.includes(token.actor.system.badStatus)) {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
        btn.textContent = "Can't";
      } else {
        btn.disabled = disableDodge;
        btn.style.opacity = disableDodge ? "0.5" : "1";
        btn.style.cursor = disableDodge ? "not-allowed" : "pointer";
        btn.textContent = dodgeLabel;
      }
    });

    // Update the corresponding Effect button for this split.
    const effectButton = tempDiv.querySelector(`button.apply-effect[data-split-index="${splitIndex}"]`);
    if (effectButton) {
      if (["Fail", "Auto Fail", "Fumble"].includes(newResult)) {
        effectButton.classList.add("smtx-roll-button-disabled");
        effectButton.disabled = true;
      } else {
        effectButton.classList.remove("smtx-roll-button-disabled");
        effectButton.disabled = false;
      }
    }

    // Update the chat message with the modified HTML from tempDiv.
    await updateChatMessage(message, tempDiv.innerHTML);
  });



  $(document).off("click", ".apply-damage-btn").on("click", ".apply-damage-btn", async function (event) {
    event.preventDefault();
    const button = $(this);
    const tokenId = button.data("token-id");
    const effectiveDamage = Number(button.data("effective-damage"));
    const affinity = button.data("affinity");
    const ignoreDefense = button.data("ignore-defense");
    const halfDefense = button.data("half-defense");
    const critical = button.data("critical") === "true" || button.data("critical") === true;
    const affectsMP = button.data("affects-mp");
    const lifedrain = button.data("lifedrain");
    const manadrain = button.data("manadrain");

    const token = canvas.tokens.get(tokenId);
    if (!token || !token.actor) return;
    await token.actor.applyDamage(
      effectiveDamage,
      1,
      affinity,
      ignoreDefense,
      halfDefense,
      critical,
      affectsMP,
      lifedrain,
      manadrain
    );
    // Disable the button after applying damage
    //button.prop("disabled", true).text("Damage Applied");
  });



  html.find('.apply-ailment-btn').on('click', function (event) {
    event.preventDefault();
    const status = $(this).data("status");
    const tokenId = $(this).closest(".target-row").data("token-id");
    const token = canvas.tokens.get(tokenId);

    if (token && token.actor)
      token.actor.applyBS(status);
  });



  // Define the function to apply buffs
  const applyBuffs = async function (buffsArray, applyBuffsTo, friendly = true) {
    if (!buffsArray || !applyBuffsTo) return;

    const sideAffected = friendly ? "friendlyEffects" : "hostileEffects"
    let effects = (game.settings.get("smt-200x", sideAffected)) || {};
    const useTugOfWar = game.settings.get("smt-200x", "tugOfWarBuffs");
    const tugOfWarMin = game.settings.get("smt-200x", "tugOfWarMin");
    const tugOfWarMax = game.settings.get("smt-200x", "tugOfWarMax");

    if (useTugOfWar) {
      // Tug of War Buffs
      for (const buffKey in applyBuffsTo) {
        if (!applyBuffsTo[buffKey]) continue;

        const isDebuff = buffKey.endsWith("nda");
        const kajaKey = isDebuff ? buffKey.replace("nda", "kaja") : buffKey;

        if (!effects[kajaKey]) effects[kajaKey] = { amount: 0, count: 0 };

        let totalApplied = 0;
        buffsArray.forEach(buffValue => {
          let adjustedValue = isDebuff ? -buffValue : buffValue; // Convert debuffs to negative values
          let newAmount = effects[kajaKey].amount + adjustedValue;

          // Ensure we do not exceed min/max
          if (newAmount < tugOfWarMin) newAmount = tugOfWarMin;
          if (newAmount > tugOfWarMax) newAmount = tugOfWarMax;

          totalApplied += newAmount - effects[kajaKey].amount;
          effects[kajaKey].amount = newAmount;
        });

        if (totalApplied !== 0) {
          ui.notifications.info(`Applied ${totalApplied} to ${kajaKey}.`);
        }
      }
    } else {
      // Default Rules
      const letBuffsRide = game.settings.get("smt-200x", "letBuffsRide");
      const MAX_BUFF_STACK = 4;

      for (const buffKey in applyBuffsTo) {
        if (!applyBuffsTo[buffKey]) continue;

        // Ensure the buff exists in global settings
        if (!effects[buffKey]) effects[buffKey] = { amount: 0, count: 0 };

        let currentCount = effects[buffKey].count;
        let appliedCount = 0;

        for (let i = 0; i < buffsArray.length; i++) {
          let buffValue = buffsArray[i];
          if (buffValue === 0) continue;

          if (currentCount < MAX_BUFF_STACK) {
            effects[buffKey].amount += buffValue;
            effects[buffKey].count += 1;
            currentCount++;
            appliedCount++;
          } else {
            if (!letBuffsRide) {
              ui.notifications.warn(`Cannot apply ${buffKey}, max stack of ${MAX_BUFF_STACK} reached.`);
              return;
            }
            break;
          }
        }

        if (appliedCount > 0) {
          ui.notifications.info(`Applied ${appliedCount} stack(s) to ${buffKey}.`);
        }
      }
    }

    await game.settings.set("smt-200x", sideAffected, effects);

    if (game.friendlyEffectsWidget && friendly) {
      game.friendlyEffectsWidget._updateTokens(effects);
      game.friendlyEffectsWidget.render();
    } else if (game.hostileEffectsWidget && !friendly) {
      game.hostileEffectsWidget._updateTokens(effects);
      game.hostileEffectsWidget.render();
    }
  };




  html.find('.apply-buffs-friendly').click(function () {
    const powerRollCard = html.find('.power-roll-card');
    const container = $(this).closest(".buff-button-container");
    const buffs = container.data("buffs");
    const applyBuffsTo = container.data("apply-buffs-to");
    applyBuffs(buffs || powerRollCard.data('buffs'), applyBuffsTo || powerRollCard.data('apply-buffs-to'));
  });

  html.find('.apply-buffs-hostile').click(function () {
    const powerRollCard = html.find('.power-roll-card');
    const container = $(this).closest(".buff-button-container");
    const buffs = container.data("buffs");
    const applyBuffsTo = container.data("apply-buffs-to");
    applyBuffs(buffs || powerRollCard.data('buffs'), applyBuffsTo || powerRollCard.data('apply-buffs-to'), false);
  });



  // Find the power-roll-card element
  const powerRollCard = html.find('.power-roll-card');
  if (!powerRollCard.length) return; // Exit if no power-roll-card is found

  // Extract data from the power-roll-card's attributes
  const regularDamage = parseFloat(powerRollCard.data('regular-damage'));
  const criticalDamage = parseFloat(powerRollCard.data('critical-damage'));
  const affinity = powerRollCard.data('affinity');
  const ignoreDefense = powerRollCard.data('ignore-defense');
  const halfDefense = powerRollCard.data('half-defense');
  const pierce = powerRollCard.data('pierce');
  const affectsMP = powerRollCard.data('affects-mp');

  // Define the function to apply damage
  const applyDamage = function (amount, mult = 1, crit = false, heals = false) {
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
        actor.applyDamage(amount, mult, affinity, ignoreDefense, halfDefense, crit, pierce, affectsMP);
    });
  };

  // Set up button click handlers
  html.find('.apply-full-damage').click(() => applyDamage(regularDamage));
  html.find('.apply-half-damage').click(() => applyDamage(regularDamage, 0.5));
  html.find('.apply-double-damage').click(() => applyDamage(regularDamage, 2));
  html.find('.apply-full-healing').click(() => applyDamage(regularDamage, 1, false, true));

  html.find('.apply-full-crit-damage').click(() => applyDamage(criticalDamage, 1, true));
  html.find('.apply-half-crit-damage').click(() => applyDamage(criticalDamage, 0.5, true));
  html.find('.apply-double-crit-damage').click(() => applyDamage(criticalDamage, 2, true));
  html.find('.apply-full-crit-healing').click(() => applyDamage(criticalDamage, 1, false, true));
});



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



Hooks.on("renderChatMessage", (message, html, data) => {
  // Hide the "Roll Pending Dodges" button for non-GM users.
  if (!game.user.isGM) {
    html.find(".roll-all-dodges").hide();
  }
});



function toggleTokenHighlight(token, shouldHighlight = true) {
  // Check if the token already has a highlight graphics object; if not, create one.
  if (shouldHighlight) {
    if (!token._highlight) {
      token._highlight = new PIXI.Graphics();
      token.addChild(token._highlight);
    }
    // Clear and redraw the highlight border.
    token._highlight.clear();
    // Customize these values to match PF2e’s style.
    token._highlight.lineStyle(4, 0xffff00, 1); // 4px yellow border
    token._highlight.drawRoundedRect(0, 0, token.w, token.h, 5);
  } else {
    if (token._highlight) {
      token._highlight.clear();
    }
  }
}


Hooks.on("renderChatMessage", (message, html, data) => {
  // Find elements with the "target-token" class
  html.find(".target-name").each((i, el) => {
    const tokenId = el.dataset.tokenId;
    if (!tokenId) return;

    // On mouseenter, highlight the token.
    $(el).on("mouseenter", () => {
      const token = canvas.tokens.get(tokenId);
      if (token) toggleTokenHighlight(token, true);
    });

    // On mouseleave, remove the highlight.
    $(el).on("mouseleave", () => {
      const token = canvas.tokens.get(tokenId);
      if (token) toggleTokenHighlight(token, false);
    });
  });
});