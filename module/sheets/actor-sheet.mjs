import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class SMTXActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['smt-200x', 'sheet', 'actor'],
      width: 950,
      height: 800,
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'features',
        },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/smt-200x/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }



  /* -------------------------------------------- */



  /** @override */
  async getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.document.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Adding a pointer to CONFIG.SMT_X
    context.config = CONFIG.SMT_X;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
    }

    // Enrich biography info for display
    // Enrichment turns text like `[[/r 1d20]]` into buttons
    context.enrichedBiography = await TextEditor.enrichHTML(
      this.actor.system.biography,
      {
        // Whether to show secret blocks in the finished html
        secrets: this.document.isOwner,
        // Necessary in v11, can be removed in v12
        async: true,
        // Data to fill in for inline rolls
        rollData: this.actor.getRollData(),
        // Relative UUID resolution
        relativeTo: this.actor,
      }
    );

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(
      // A generator that returns all effects stored on the actor
      // as well as any items
      this.actor.allApplicableEffects()
    );

    return context;
  }



  /**
   * Character-specific context modifications
   *
   * @param {object} context The context object to mutate
   */
  _prepareCharacterData(context) {
    // This is where you can enrich character-specific editor fields
    // or setup anything else that's specific to this type
  }



  /**
   * Organize and classify Items for Actor sheets.
   *
   * @param {object} context The context object to mutate
   */
  _prepareItems(context) {
    // Initialize containers.
    const armor = [];
    const weapons = [];
    const features = [];
    const passives = [];
    const consumables = [];

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || Item.DEFAULT_ICON;
      if (i.type === 'armor') {
        armor.push(i);
      }
      else if (i.type === 'feature') {
        features.push(i);
      }
      else if (i.type === 'weapon') {
        weapons.push(i);
      }
      else if (i.type === 'consumable') {
        consumables.push(i);
      }
      else if (i.type === 'passive') {
        passives.push(i);
      }
    }

    // Assign and return
    context.armor = armor;
    context.weapons = weapons;
    context.features = features;
    context.passives = passives;
    context.consumables = consumables;
  }



  /* -------------------------------------------- */



  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.on('click', '.item-edit', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.on('click', '.item-create', this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.on('click', '.item-delete', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.on('click', '.effect-control', (ev) => {
      const row = ev.currentTarget.closest('li');
      const document =
        row.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(row.dataset.parentId);
      onManageActiveEffect(ev, document);
    });

    // Rollable abilities.
    html.on('click', '.rollable', this._onRoll.bind(this));

    html.on('click', '.pay-cost', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      this.actor.payCost(li.data('itemId'));
    });


    html.on('click', '.clear-buffs', (ev) => {
      this.actor.dekaja();
    });

    html.on('click', '.clear-debuffs', (ev) => {
      this.actor.dekunda();
    });

    html.on('click', '.clear-buffs-and-debuffs', (ev) => {
      this.actor.clearAllBuffs();
    });



    // Ensure the expanded state container exists on the sheet instance
    if (!this.expandedFeatures) {
      this.expandedFeatures = {};
    }

    // Your other listeners...
    // Example listener for the toggle event:
    html.on('click', '.toggle-details', (ev) => {
      // Find the closest main feature row
      const $mainItem = $(ev.currentTarget).closest('li.item');
      // The details row is assumed to be immediately after the main row.
      const $details = $mainItem.next('li.item-details');
      // Get the item ID for later state management.
      const itemId = $mainItem.data('itemId');

      // Toggle the details with slide animation, and update state after animation completes.
      $details.slideToggle(200, () => {
        // Now update the expanded state based on the actual visibility
        this.expandedFeatures[itemId] = $details.is(':visible');
      });
    });

    // After all listeners are attached, restore any already expanded detail rows.
    html.find('li.item').each((i, li) => {
      const $li = $(li);
      const itemId = $li.data('itemId');
      // Check if this feature was previously expanded
      if (this.expandedFeatures[itemId]) {
        // Find the corresponding details row and show it
        const $details = $li.next('li.item-details');
        $details.show();
      }
    });



    // Handle pip clicks
    html.on('click', '.pip', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));

      const pip = ev.currentTarget;
      const row = pip.closest('.pip-row');
      const index = parseInt(pip.dataset.index, 10); // Get pip index

      // Update the item's uses.value to match the clicked pip
      let newValue = index;

      if (item.system.uses.value == 1 && index == 1)
        newValue = 0 // If its the last pip, toggle off

      item.update({ "system.uses.value": newValue });
    });


    html.on('change', '.buff-field', (ev) => {
      const input = ev.currentTarget;
      const path = input.name; // e.g., "system.suku.buff[0]"
      const value = parseInt(input.value) || 0;

      // Extract the array path (e.g., "system.suku.buff") and index (e.g., 0)
      const match = input.name.match(/^(.+)\[(\d+)\]$/);
      if (!match) {
        console.error("Invalid input name format:", input.name);
        return;
      }

      const arrayPath = match[1]; // "system.suku.buff"
      const index = parseInt(match[2], 10); // 0

      // Get the current array
      const currentArray = foundry.utils.getProperty(this.actor, arrayPath) || [];

      // Modify the array
      currentArray[index] = value;

      this.actor.update({ [arrayPath]: currentArray });
    });


    html.on('click', '.armor-equip', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));

      item.update({ "system.equipped": !item.system.equipped })
    });


    html.on('click', '.weapon-equip-a', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));

      item.update({ "system.slotA": !item.system.slotA })
      const weaponObj = {
        "name": item.name,
        "type": item.system.type,
        "hit": item.system.hit,
        "power": item.system.power,
        "ammo": item.system.maxAmmo, // set fully loaded
        "maxAmmo": item.system.maxAmmo
      };

      this.actor.update({ "system.wepA": weaponObj })
    });

    html.on('click', '.weapon-equip-b', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));

      item.update({ "system.slotB": !item.system.slotB })
      const weaponObj = {
        "name": item.name,
        "type": item.system.type,
        "hit": item.system.hit,
        "power": item.system.power,
        "ammo": item.system.maxAmmo, // set fully loaded
        "maxAmmo": item.system.maxAmmo
      };

      this.actor.update({ "system.wepB": weaponObj })
    });




    html.on('click', '.weapon-reload-a', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));

      const ammoReady = Math.min(item.system.quantity, this.actor.system.wepA.maxAmmo - this.actor.system.wepA.ammo);

      item.update({ "system.quantity": item.system.quantity - ammoReady })
      this.actor.update({ "system.wepA.ammo": this.actor.system.wepA.ammo + ammoReady })
    });

    html.on('click', '.weapon-reload-b', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));

      const ammoReady = Math.min(item.system.quantity, this.actor.system.wepB.maxAmmo - this.actor.system.wepB.ammo);

      item.update({ "system.quantity": item.system.quantity - ammoReady })
      this.actor.update({ "system.wepB.ammo": this.actor.system.wepB.ammo + ammoReady })
    });




    html.on('click', '.weapon-rotate', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.rotateWeapon()
    });


    html.on('mousedown', '.roll-tn', async (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      if (!item) return;
      if (ev.button === 2) {
        ev.preventDefault();
        await item.rollSplitD100();

      } else if (ev.button === 0) {
        await item.rollSplitD100(true);
      }
    });

    html.on('mousedown', '.roll-tn-2', async (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      if (!item) return;
      if (ev.button === 2) {
        ev.preventDefault();
        await item.rollSplitD100(false, 2);

      } else if (ev.button === 0) {
        await item.rollSplitD100(true, 2);
      }
    });

    html.on('mousedown', '.roll-tn-3', async (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      if (!item) return;
      if (ev.button === 2) {
        ev.preventDefault();
        await item.rollSplitD100(false, 3);

      } else if (ev.button === 0) {
        await item.rollSplitD100(true, 3);
      }
    });


    html.on('mousedown', '.roll-power', async (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      if (!item) return;
      if (ev.button === 2) {
        ev.preventDefault();
        await item.rollPower();

      } else if (ev.button === 0) {
        await item.rollPower(true);
      }
    });




    html.on('click', '.set-tc-formulas', (ev) => {
      ev.preventDefault();
      this.actor.update({
        "system.phydefFormula": "floor((@system.stats.vt.value + @system.attributes.level)/2)",
        "system.magdefFormula": "floor((@system.stats.mg.value + @system.attributes.level)/2)",
        "system.initFormula": "@system.stats.ag.value"
      })
    });

    html.on('click', '.set-x-human', (ev) => {
      ev.preventDefault();
      this.actor.update({
        "system.phydefFormula": "@system.stats.vt.value",
        "system.magdefFormula": "@system.stats.vt.value",
        "system.initFormula": "floor((@system.stats.ag.value + @system.attributes.level)/2)",
        "system.hp.mult": 4,
        "system.mp.mult": 2,
      })
    });

    html.on('click', '.set-x-demon', (ev) => {
      ev.preventDefault();
      this.actor.update({
        "system.phydefFormula": "@system.stats.vt.value + @system.attributes.level",
        "system.magdefFormula": "@system.stats.vt.value + @system.attributes.level",
        "system.initFormula": "floor((@system.stats.ag.value + @system.attributes.level)/2)",
        "system.hp.mult": 6,
        "system.mp.mult": 3,
      })
    });



    html.on('change', '.update-stat', (ev) => {
      const input = ev.currentTarget;
      const path = input.name.replace(".value", ".base");
      const value = parseInt(input.value) || 0;

      this.actor.update({
        [path]: value
      })
    });



    // For NPCs
    html.on('change', '.actionPattern', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));

      item.update({ "system.actionPattern": ev.currentTarget.value })
    });



    html.on('click', '.qty-up', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));

      item.update({ "system.quantity": item.system.quantity + 1 })
    });

    html.on('click', '.qty-down', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));

      item.update({ "system.quantity": item.system.quantity - 1 })
    });



    html.on('click', '.melee-power-roll', async (event) => {
      event.preventDefault();
      this.actor.rollPower("(@powerDice.melee)d10x + @meleePower", "strike", true)
    });

    html.on('contextmenu', '.melee-power-roll', async (event) => {
      event.preventDefault();
      this.actor.rollPower("(@powerDice.melee)d10x + @meleePower", "strike")
    });

    html.on('click', '.ranged-power-roll', async (event) => {
      event.preventDefault();
      this.actor.rollPower("(@powerDice.ranged)d10x + @rangedPower", "gun", true)
    });

    html.on('contextmenu', '.ranged-power-roll', async (event) => {
      event.preventDefault();
      this.actor.rollPower("(@powerDice.ranged)d10x + @rangedPower", "gun")
    });

    html.on('click', '.spell-power-roll', async (event) => {
      event.preventDefault();
      this.actor.rollPower("(@powerDice.spell)d10x + @spellPower", "almighty", true)
    });

    html.on('contextmenu', '.spell-power-roll', async (event) => {
      event.preventDefault();
      this.actor.rollPower("(@powerDice.spell)d10x + @spellPower")
    });

    html.on('click', '.dodge-roll', async (event) => {
      event.preventDefault();
      this.actor.rollSplitD100(this.actor.system.dodgetn, "Dodge", true)
    });

    html.on('contextmenu', '.dodge-roll', async (event) => {
      event.preventDefault();
      this.actor.rollSplitD100(this.actor.system.dodgetn, "Dodge")
    });

    html.on('click', '.talk-roll', async (event) => {
      event.preventDefault();
      this.actor.rollSplitD100(this.actor.system.talktn, "Talk", true)
    });

    html.on('contextmenu', '.talk-roll', async (event) => {
      event.preventDefault();
      this.actor.rollSplitD100(this.actor.system.talktn, "Talk")
    });

    html.on('click', '.st-roll', async (event) => {
      event.preventDefault();
      this.actor.rollSplitD100(this.actor.system.stats.st.tn, "Strength", true)
    });

    html.on('contextmenu', '.st-roll', async (event) => {
      event.preventDefault();
      this.actor.rollSplitD100(this.actor.system.stats.st.tn, "Strength")
    });

    html.on('click', '.mg-roll', async (event) => {
      event.preventDefault();
      this.actor.rollSplitD100(this.actor.system.stats.mg.tn, "Magic", true)
    });

    html.on('contextmenu', '.mg-roll', async (event) => {
      event.preventDefault();
      this.actor.rollSplitD100(this.actor.system.stats.mg.tn, "Magic")
    });

    html.on('click', '.vt-roll', async (event) => {
      event.preventDefault();
      this.actor.rollSplitD100(this.actor.system.stats.vt.tn, "Vitality", true)
    });

    html.on('contextmenu', '.vt-roll', async (event) => {
      event.preventDefault();
      this.actor.rollSplitD100(this.actor.system.stats.vt.tn, "Vitality")
    });

    html.on('click', '.ag-roll', async (event) => {
      event.preventDefault();
      this.actor.rollSplitD100(this.actor.system.stats.ag.tn, "Agility", true)
    });

    html.on('contextmenu', '.ag-roll', async (event) => {
      event.preventDefault();
      this.actor.rollSplitD100(this.actor.system.stats.ag.tn, "Agility")
    });

    html.on('click', '.lk-roll', async (event) => {
      event.preventDefault();
      this.actor.rollSplitD100(this.actor.system.stats.lk.tn, "Luck", true)
    });

    html.on('contextmenu', '.lk-roll', async (event) => {
      event.preventDefault();
      this.actor.rollSplitD100(this.actor.system.stats.lk.tn, "Luck")
    });


    html.on('click', '.increase-quickModTN', async (event) => {
      event.preventDefault();
      this.actor.update({ "system.quickModTN": this.actor.system.quickModTN + 20 })
    });

    html.on('click', '.decrease-quickModTN', async (event) => {
      event.preventDefault();
      this.actor.update({ "system.quickModTN": this.actor.system.quickModTN - 20 })
    });

    html.on('click', '.toggle-resetModTN', async (event) => {
      event.preventDefault();
      this.actor.update({ "system.resetModTN": !this.actor.system.resetModTN })
    });

    html.on('click', '.custom-power-roll', async (event) => {
      event.preventDefault();
      this.actor.rollPower();
    });




    // Listen for a drop event anywhere on the actor sheet.
    html.on("drop", async (event) => {
      event.preventDefault();
      // Get the raw data from the event.
      const rawData = event.originalEvent.dataTransfer.getData("text/plain").trim();
      if (!rawData) return //ui.notifications.warn("No effect data found on drop.");

      let data;
      try {
        data = JSON.parse(rawData);
      } catch (err) {
        data = rawData;
      }

      if (data.status) {
        this.actor.applyBS(data.status);
        return
      }

      if (data.type && data.type == "Item") {
        return //ui.notifications.warn("This is an item dragged from a compendium, not an effect dragged from a used skill")
      }

      const uuid = (typeof data === "object" && data.uuid) ? data.uuid : data;
      if (!uuid || !uuid.includes("Compendium") || uuid.split(".").length < 4) {
        return //ui.notifications.warn("Dropped item is not a valid effect.");
      }

      // Load the effect document.
      const effectDoc = await fromUuid(uuid);
      if (!effectDoc) return ui.notifications.warn("Failed to load the effect document.");

      if (effectDoc.effects.size < 1) {
        return ui.notifications.warn("No active effects found on this effect document.");
      }
      // Grab the first active effect document.
      const activeEffect = effectDoc.effects.contents[0];
      // Duplicate its data (and remove the _id so that a new one is generated).
      let effectData = foundry.utils.duplicate(activeEffect.toObject());
      delete effectData._id;

      await this.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
      ui.notifications.info(`Applied effect: ${effectDoc.name}`);
    });









    // Left-click: Roll initiative
    html.on('click', '.initiative-roll', async (event) => {
      event.preventDefault();
      const actor = this.actor;
      if (!actor) return;
      await addToCombatAndRollInitiative(actor);
    });

    // Right-click: Prompt for modifier
    html.on('contextmenu', '.initiative-roll', async (event) => {
      event.preventDefault();
      const actor = this.actor;
      if (!actor) return;

      // Open a dialog to get the modifier
      new Dialog({
        title: "Add Initiative Modifier",
        content: `
        <div class="initiative-modifier-dialog">
          <p>Enter an initiative modifier to apply to this roll:</p>
          <input id="modifier" name="modifier" value="0" />
          <label>
            <input type="checkbox" id="flat-roll" name="flat-roll" />
            No Roll (Ambushed, no dice rolled)
          </label>
        </div>
      `,
        buttons: {
          roll: {
            icon: '<i class="fas fa-check"></i>',
            label: "Roll",
            callback: async (html) => {
              const modifier = html.find('input[name="modifier"]').val();
              const flatRoll = html.find('input[name="flat-roll"]').is(':checked');
              await addToCombatAndRollInitiative(actor, modifier, flatRoll);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel"
          }
        },
        default: "roll"
      }).render(true);
    });



    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = (ev) => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains('inventory-header')) return;
        li.setAttribute('draggable', true);
        li.addEventListener('dragstart', handler, false);
      });
    }
  }



  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = foundry.utils.duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system['type'];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[ability] ${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }
}

// Function to add actor's token to combat and roll initiative
async function addToCombatAndRollInitiative(actor, modifier = 0, flatRoll = false) {
  // Ensure an active combat instance exists
  let combat = game.combat;
  if (!combat) {
    combat = await Combat.create({ scene: game.scenes.active.id });
  }

  // Retrieve the actor's active token in the current scene
  const token = actor.getActiveTokens()[0];
  if (!token) {
    ui.notifications.warn(`${actor.name} has no active token in the scene.`);
    return;
  }

  // Check if the token is already in the combat tracker
  let combatant = combat.combatants.find(c => c.tokenId === token.id);
  if (!combatant) {
    // Add the token to the combat tracker if not already present
    const combatantData = {
      tokenId: token.id,
      sceneId: token.scene.id,
      actorId: actor.id
    };
    await combat.createEmbeddedDocuments("Combatant", [combatantData]);
    combatant = combat.combatants.find(c => c.tokenId === token.id);
  }

  // Retrieve the new combatant
  if (!combatant) {
    ui.notifications.error(`Failed to add ${actor.name} to the combat tracker.`);
    return;
  }

  // Roll initiative for the new combatant
  let newFormula = CONFIG.Combat.initiative.formula + " + " + (modifier || 0);

  let flatRollFormula = 0;
  if (flatRoll) {
    flatRollFormula = new Roll(newFormula, actor.getRollData()).evaluateSync({ minimize: true });

    let totalDice = 0;
    flatRollFormula.dice.forEach(die => {
      totalDice += die.number;
    });

    newFormula = "(" + flatRollFormula.result + ")-" + totalDice;
  }

  await combat.rollInitiative([combatant.id], { formula: newFormula });
  ui.notifications.info(`${actor.name} has been added to the combat tracker and initiative rolled.`);
}