// Import document classes.
import { SMTXActor } from './documents/actor.mjs';
import { SMTXItem } from './documents/item.mjs';
// Import sheet classes.
import { SMTXActorSheet } from './sheets/actor-sheet.mjs';
import { SMTXItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { SMT_X } from './helpers/config.mjs';

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', function () {
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.smt200x = {
    SMTXActor,
    SMTXItem,
    rollItemMacro,
  };

  // Add custom constants for configuration.
  CONFIG.SMT_X = SMT_X;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: '(@powerDice.init)d10x + @init',
    decimals: 2,
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = SMTXActor;
  CONFIG.Item.documentClass = SMTXItem;

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('smt-200x', SMTXActorSheet, {
    makeDefault: true,
    label: 'SMT_X.SheetLabels.Actor',
  });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('smt-200x', SMTXItemSheet, {
    makeDefault: true,
    label: 'SMT_X.SheetLabels.Item',
  });

  console.log('SMT 200X | Initializing socket listener');
  game.socket.on("system.smt-200x", async (data) => {
    if (!game.user.isGM) return; // Only the GM processes these requests.
    if (data.action === "updateChatMessage") {
      const msg = game.messages.get(data.messageId);
      if (msg) {
        await msg.update({ content: data.content });
      } else {
      }
    }
  });




  game.settings.register("smt-200x", "showTCheaders", {
    name: "Use Tokyo Conception Stuff",
    hint: "Exchanges X-specific labels and text with TC equivalents. Toggling this option will SET and OVERWRITE the defense/initiative formulas below when you 'Save Settings,' to TC formulas when TRUE and X formulas when FALSE.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      if (value) {
        game.settings.set("smt-200x", "phyDefDemon", "floor((@stats.vt.value + @attributes.level)/2)");
        game.settings.set("smt-200x", "phyDefHuman", "floor((@stats.vt.value + @attributes.level)/2)");
        game.settings.set("smt-200x", "magDefDemon", "floor((@stats.mg.value + @attributes.level)/2)");
        game.settings.set("smt-200x", "magDefHuman", "floor((@stats.mg.value + @attributes.level)/2)");
        game.settings.set("smt-200x", "initFormula", "@stats.ag.value");
      } else {
        game.settings.set("smt-200x", "phyDefDemon", "(@stats.vt.value + @attributes.level)");
        game.settings.set("smt-200x", "phyDefHuman", "(@stats.vt.value)");
        game.settings.set("smt-200x", "magDefDemon", "(@stats.vt.value + @attributes.level)");
        game.settings.set("smt-200x", "magDefHuman", "(@stats.vt.value)");
        game.settings.set("smt-200x", "initFormula", "floor((@stats.ag.value + @attributes.level)/2)");
      }
    }
  });

  game.settings.register("smt-200x", "phyDefDemon", {
    name: "Physical Defense Formula (Demon)",
    hint: "The default physical defense formula for demons.",
    scope: "world",
    config: true,
    type: String,
    default: "(@stats.vt.value + @attributes.level)"
  });

  game.settings.register("smt-200x", "phyDefHuman", {
    name: "Physical Defense Formula (Human))",
    hint: "The default physical defense formula for humans.",
    scope: "world",
    config: true,
    type: String,
    default: "(@stats.vt.value)"
  });

  game.settings.register("smt-200x", "magDefDemon", {
    name: "Physical Defense Formula (Demon)",
    hint: "The default magical defense formula for actors.",
    scope: "world",
    config: true,
    type: String,
    default: "(@stats.vt.value + @attributes.level)"
  });

  game.settings.register("smt-200x", "magDefHuman", {
    name: "Physical Defense Formula (Human)",
    hint: "The default physical defense formula for humans.",
    scope: "world",
    config: true,
    type: String,
    default: "(@stats.vt.value)"
  });

  game.settings.register("smt-200x", "initFormula", {
    name: "Initiative Formula",
    hint: "The default initiative formula.",
    scope: "world",
    config: true,
    type: String,
    default: "floor((@stats.ag.value + @attributes.level)/2)"
  });

  game.settings.register("smt-200x", "hpFormula", {
    name: "HP Formula",
    hint: "The default HP formula, not factoring multipliers.",
    scope: "world",
    config: true,
    type: String,
    default: "(@stats.vt.value + @attributes.level)"
  });

  game.settings.register("smt-200x", "mpFormula", {
    name: "MP Formula",
    hint: "The default MP formula, not factoring multipliers.",
    scope: "world",
    config: true,
    type: String,
    default: "(@stats.mg.value + @attributes.level)"
  });

  game.settings.register("smt-200x", "fateFormula", {
    name: "Fate Formula",
    hint: "The default Fate formula.",
    scope: "world",
    config: true,
    type: String,
    default: "5 + floor(@stats.lk.value/5)"
  });

  game.settings.register("smt-200x", "taruOnly", {
    name: "Taru- affects Spell Power",
    hint: "Makes Tarukaja/unda effects apply to Spell Power.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("smt-200x", "addLevelToRangedPower", {
    name: "Add Level to Ranged Power",
    hint: "A common homebrew that brings ranged power in line with other types.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("smt-200x", "resistAfterDefense", {
    name: "Apply Resist/Strong After Defense",
    hint: "Changes how the Resist/Strong Affinity multiplier is handled. It will be factored in AFTER subtracting Defense, making it less powerful.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("smt-200x", "showFloatingDamage", {
    name: "Show Floating Damage Text",
    hint: "Shows floating text for the damage or healing applied to a token.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("smt-200x", "fateForNPCs", {
    name: "Allow NPCs to use Fate",
    hint: "Shows the Spend Fate dialogue when applying damage to all NPCs",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("smt-200x", "letBuffsRide", {
    name: "Let Buff Effects Ride",
    hint: "This allows imperfect numbers of in/decreases to stack up to 4. For example, 3 Sukundas (3d10) followed by a Fog Breath (2d10) this setting would allow the first Fog Breath dice to apply to Sukunda, but ignore other die results.",
    scope: "world", // World-level setting (shared by all players)
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("smt-200x", "tugOfWarBuffs", {
    name: "Tug of War Buffs",
    hint: "Shows only a single buff/debuff field. Use +/- in the widget to affect it easily.",
    scope: "world", // Shared by all players
    config: true,
    type: Boolean,
    default: false,
    onChange: value => {
      game.settings.settings.get("smt-200x.tugOfWarMin").config = value;
      game.settings.settings.get("smt-200x.tugOfWarMax").config = value;
      game.settings.sheet.render(true); // Refresh settings UI
    }
  });

  game.settings.register("smt-200x", "tugOfWarMin", {
    name: "Minimum Tug of War Buff Value",
    hint: "The lowest possible value the Tug of War Buffs can go.",
    scope: "world",
    config: game.settings.get("smt-200x", "tugOfWarBuffs"), // Hide if Tug of War is off
    type: Number,
    default: -20,
  });

  game.settings.register("smt-200x", "tugOfWarMax", {
    name: "Maximum Tug of War Buff Value",
    hint: "The highest possible value the Tug of War Buffs can go.",
    scope: "world",
    config: game.settings.get("smt-200x", "tugOfWarBuffs"), // Hide if Tug of War is off
    type: Number,
    default: 20,
  });



  // Hidden window position saving settings
  game.settings.register("smt-200x", "friendlyEffectsWidgetPosition", {
    name: "Friendly Effects Widget Position",
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register("smt-200x", "hostileEffectsWidgetPosition", {
    name: "Hostile Effects Widget Position",
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register("smt-200x", "friendlyEffects", {
    name: "Global Friendly Effects",
    scope: "world",
    config: false,
    type: Object,
    default: {
      tarukaja: { amount: 0, count: 0 },
      makakaja: { amount: 0, count: 0 },
      rakukaja: { amount: 0, count: 0 },
      sukukaja: { amount: 0, count: 0 },
      tarunda: { amount: 0, count: 0 },
      makunda: { amount: 0, count: 0 },
      rakunda: { amount: 0, count: 0 },
      sukunda: { amount: 0, count: 0 }
    }
  });

  game.settings.register("smt-200x", "hostileEffects", {
    name: "Global Hostile Effects",
    scope: "world",
    config: false,
    type: Object,
    default: {
      tarukaja: { amount: 0, count: 0 },
      makakaja: { amount: 0, count: 0 },
      rakukaja: { amount: 0, count: 0 },
      sukukaja: { amount: 0, count: 0 },
      tarunda: { amount: 0, count: 0 },
      makunda: { amount: 0, count: 0 },
      rakunda: { amount: 0, count: 0 },
      sukunda: { amount: 0, count: 0 }
    }
  });



  /*// Register a number setting
  game.settings.register("my-system", "maxItems", {
    name: "Maximum Items",
    hint: "Set the maximum number of items allowed.",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 1, max: 100, step: 1 }, // Range input
    default: 50
  });

  // Register a string setting
  game.settings.register("my-system", "welcomeMessage", {
    name: "Welcome Message",
    hint: "Set the message displayed to players when they join.",
    scope: "world",
    config: true,
    type: String,
    default: "Welcome to the game!"
  });

  // Register a dropdown setting
  game.settings.register("my-system", "difficulty", {
    name: "Game Difficulty",
    hint: "Choose the game's difficulty level.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      easy: "Easy",
      normal: "Normal",
      hard: "Hard"
    },
    default: "normal"
  });*/

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});


/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

Handlebars.registerHelper('range', function (start, end, options) {
  let result = '';

  for (let i = start; i <= end; i++) {
    result += `
  <div class="pip${i <= options ? " filled" : ""}" data-index="${i}"></div>
  `;
  }

  return new Handlebars.SafeString(result);
});

Handlebars.registerHelper("ifEq", function (a, b, options) {
  return (a === b) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("ifNumber", function (value, options) {
  const isNumber = (typeof value === "number" && !isNaN(value))
    || (!isNaN(parseFloat(value)) && isFinite(value));

  return isNumber
    ? options.fn(this)
    : options.inverse(this);
});

Handlebars.registerHelper("showTC", function () {
  return game.settings.get("smt-200x", "showTCheaders");
});


/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));

  // FRIENDLY
  if (!game.friendlyEffectsWidget) {
    game.friendlyEffectsWidget = new BuffEffectsWidget({ mode: "friendly" });
  }
  game.friendlyEffectsWidget.render(true);

  // HOSTILE
  if (!game.hostileEffectsWidget) {
    game.hostileEffectsWidget = new BuffEffectsWidget({ mode: "hostile" });
  }
  game.hostileEffectsWidget.render(true);
});


Hooks.on("createToken", (tokenDocument, options, userId) => {
  if (game.user.id !== userId) return;
  BuffEffectsWidget.applyEffectsToToken(tokenDocument.id, "friendly");
  BuffEffectsWidget.applyEffectsToToken(tokenDocument.id, "hostile");
});

Hooks.on("updateToken", (tokenDocument, changeData, options, userId) => {
  if (game.user.id !== userId) return;
  BuffEffectsWidget.applyEffectsToToken(tokenDocument.id, "friendly");
  BuffEffectsWidget.applyEffectsToToken(tokenDocument.id, "hostile");
});


/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.smt200x.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'smt-200x.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}



/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}


class BuffEffectsWidget extends Application {
  constructor(options = {}) {
    super(options);

    this.mode = options.mode ?? "friendly";
    this._positionSettingKey = `${this.mode}EffectsWidgetPosition`;
  }


  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = "buff-effects-widget"; // Overridden later by mode in render()
    options.title = "Buff Effects";     // Overridden later by mode in render()
    options.template = "systems/smt-200x/templates/buff-effects.hbs";
    options.popOut = true;
    options.resizable = false;
    options.width = "auto";
    options.height = "auto";
    options.minimizable = true;
    options.draggable = true;
    return options;
  }


  async close() {
    if (this._minimized) return this.maximize();
    return this.minimize();
  }


  async render(force = false, options = {}) {
    // Update ID & Title based on mode
    this.options.id = `buff-effects-widget-${this.mode}`;
    this.options.title = this.mode === "friendly" ? "Friendly Effects" : "Hostile Effects";
    this.options.width = game.settings.get("smt-200x", "tugOfWarBuffs") ? 300 : 200;

    await super.render(force, options);

    // Delay restoring position slightly to ensure the window is fully rendered
    setTimeout(() => this.restorePosition(), 200);
  }


  async restorePosition() {
    const savedPosition = game.settings.get("smt-200x", this._positionSettingKey) || {};
    if (!savedPosition.left || !savedPosition.top) return;

    // Wait for the element to exist
    await this._waitForRender();

    this.setPosition(savedPosition);
  }


  async _waitForRender() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.element && this.element[0]) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
    });
  }


  async savePosition() {
    const pos = this.position;
    await game.settings.set("smt-200x", this._positionSettingKey, {
      left: pos.left,
      top: pos.top,
      width: "auto",
      height: "auto"
    });
  }


  /**
   * @override
   * Called after the Application HTML is rendered. Good place to set up listeners.
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Save position on mouse up (after user drags the window)
    this.element.on("mouseup", async () => {
      await this.savePosition();
    });

    // Example: reset button
    html.on("click", ".reset-button", async (ev) => {
      ev.preventDefault();
      await this._resetAllEffects();
    });

    // Example: Dekaja
    html.on("click", ".dekaja-button", async (ev) => {
      ev.preventDefault();
      await this._dekaja();
    });

    // Example: Dekunda
    html.on("click", ".dekunda-button", async (ev) => {
      ev.preventDefault();
      await this._dekunda();
    });

    // Example: numeric inputs
    html.find("input[data-category]").on("change", this._onInputChange.bind(this));
  }


  /**
   * Prepare data for the template.
   */
  getData() {
    const data = super.getData();

    // Decide which game setting key to use
    const settingKey = (this.mode === "friendly") ? "friendlyEffects" : "hostileEffects";

    // Retrieve the stored effects
    data.effects = game.settings.get("smt-200x", settingKey) || {};

    // Example: If you do Tug of War logic
    data.useTugOfWar = game.settings.get("smt-200x", "tugOfWarBuffs");

    // Example: Summaries
    data.effects.taruTotal = data.effects.tarukaja.amount - data.effects.tarunda.amount;
    data.effects.makaTotal = data.effects.makakaja.amount - data.effects.makunda.amount;
    data.effects.rakuTotal = data.effects.rakukaja.amount - data.effects.rakunda.amount;
    data.effects.sukuTotal = data.effects.sukukaja.amount - data.effects.sukunda.amount;

    return data;
  }


  async _onInputChange(event) {
    const input = event.currentTarget;
    const category = input.dataset.category;
    const field = input.dataset.field;
    let newValue = Number(input.value ?? 0);
    if (isNaN(newValue)) newValue = 0;

    const settingKey = (this.mode === "friendly") ? "friendlyEffects" : "hostileEffects";
    let effects = game.settings.get("smt-200x", settingKey) || {};
    if (!effects[category]) return;

    // Basic assignment
    effects[category][field] = newValue;

    // Save & update
    await game.settings.set("smt-200x", settingKey, effects);
    await this._updateTokens(effects);
    this.render();
  }


  async _dekaja() {
    const settingKey = (this.mode === "friendly") ? "friendlyEffects" : "hostileEffects";
    let effects = game.settings.get("smt-200x", settingKey) || {};

    // Example: Zero out positive buffs
    if (effects.tarukaja.amount > 0) effects.tarukaja.amount = 0;
    if (effects.makakaja.amount > 0) effects.makakaja.amount = 0;
    if (effects.rakukaja.amount > 0) effects.rakukaja.amount = 0;
    if (effects.sukukaja.amount > 0) effects.sukukaja.amount = 0;

    await game.settings.set("smt-200x", settingKey, effects);
    await this._updateTokens(effects);
    this.render();
  }


  async _dekunda() {
    const settingKey = (this.mode === "friendly") ? "friendlyEffects" : "hostileEffects";
    let effects = game.settings.get("smt-200x", settingKey) || {};

    // Example: Zero out negative buffs
    if (effects.tarukaja.amount < 0) effects.tarukaja.amount = 0;
    if (effects.makakaja.amount < 0) effects.makakaja.amount = 0;
    if (effects.rakukaja.amount < 0) effects.rakukaja.amount = 0;
    if (effects.sukukaja.amount < 0) effects.sukukaja.amount = 0;

    await game.settings.set("smt-200x", settingKey, effects);
    await this._updateTokens(effects);
    this.render();
  }

  /**
   * Update tokens in the scene, based on the mode.
   */
  async _updateTokens(effects) {
    const scene = game.scenes.current;
    if (!scene) return;

    // disposition 1 = Friendly | disposition -1 = hostile
    const disposition = (this.mode === "friendly") ? 1 : -1;
    const tokens = scene.tokens.filter(t => t.disposition === disposition);

    // Example: updates to actor data
    for (let token of tokens) {
      let updates = {};

      // e.g. tarukaja => taru
      updates["system.buffs.taru"] = effects.tarukaja.amount;
      updates["system.buffs.maka"] = effects.makakaja.amount;
      updates["system.buffs.raku"] = effects.rakukaja.amount;
      updates["system.buffs.suku"] = effects.sukukaja.amount;

      // ... if you handle tarunda differently, add them too
      // e.g. tarunda => negative taru, etc. (Tug of War, etc.)

      console.log(updates);
      await token.actor.update(updates);
    }
  }

  /**
   * (Optional) Static method to apply effects automatically on token creation/update
   */
  static async applyEffectsToToken(tokenId, mode = "friendly") {
    const scene = game.scenes.current;
    if (!scene) return;
    const token = scene.tokens.get(tokenId);
    if (!token) return;

    const desiredDisposition = (mode === "friendly") ? 1 : -1;
    if (token.disposition !== desiredDisposition) return;

    const settingKey = (mode === "friendly") ? "friendlyEffects" : "hostileEffects";
    const effects = game.settings.get("smt-200x", settingKey) || {};

    let updates = {};
    updates["system.buffs.taru"] = effects.tarukaja.amount;
    updates["system.buffs.maka"] = effects.makakaja.amount;
    updates["system.buffs.raku"] = effects.rakukaja.amount;
    updates["system.buffs.suku"] = effects.sukukaja.amount;
    // etc.

    await token.actor.update(updates);
  }
}