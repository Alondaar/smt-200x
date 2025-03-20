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




  // Register a boolean setting
  game.settings.register("smt-200x", "taruOnly", {
    name: "Taru- affects Spell Power",
    hint: "Makes Tarukaja/unda effects apply to Spell Power.",
    scope: "world", // World-level setting (shared by all players)
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("smt-200x", "showTCheaders", {
    name: "Show Tokyo Conception Headers",
    hint: "Exchanges X-specific labels and text with TC equivalents",
    scope: "world", // World-level setting (shared by all players)
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("smt-200x", "addLevelToRangedPower", {
    name: "Add Level to Ranged Power",
    hint: "A common homebrew that brings ranged power in line with other types.",
    scope: "world", // World-level setting (shared by all players)
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("smt-200x", "resistAfterDefense", {
    name: "Apply Resist/Strong After Defense",
    hint: "Changes how the Resist/Strong Affinity multiplier is handled. It will be factored in AFTER subtracting Defense, making it less powerful.",
    scope: "world", // World-level setting (shared by all players)
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("smt-200x", "showFloatingDamage", {
    name: "Show Floating Damage Text",
    hint: "Shows floating text for the damage or healing applied to a token.",
    scope: "world", // World-level setting (shared by all players)
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("smt-200x", "fateForNPCs", {
    name: "Allow NPCs to use Fate",
    hint: "Shows the Spend Fate dialogue when applying damage to all NPCs",
    scope: "world", // World-level setting (shared by all players)
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("smt-200x", "friendlyEffectsWidgetPosition", {
    name: "Friendly Effects Widget Position",
    scope: "client",  // Stores per-user, so each user has their own position
    config: false,    // Hidden from settings menu
    type: Object,
    default: {}
  });

  game.settings.register("smt-200x", "letBuffsRide", {
    name: "Let Buff Effects Ride",
    hint: "This allows imperfect numbers of in/decreases to stack up to 4. For example, 3 Sukundas (3d10) followed by a Fog Breath (2d10) this setting would allow the first Fog Breath dice to apply to Sukunda, but ignore other die results.",
    scope: "world", // World-level setting (shared by all players)
    config: true,
    type: Boolean,
    default: false
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


/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));

  // Create a single instance
  if (!game.friendlyEffectsWidget) {
    game.friendlyEffectsWidget = new FriendlyEffectsWidget();
  }
  // Render it immediately
  game.friendlyEffectsWidget.render(true);
});


Hooks.on("createToken", (tokenDocument, options, userId) => {
  if (game.user.id !== userId) return; // Only run for the current user
  FriendlyEffectsWidget.applyEffectsToToken(tokenDocument.id);
});

Hooks.on("updateToken", (tokenDocument, changeData, options, userId) => {
  if (game.user.id !== userId) return;
  FriendlyEffectsWidget.applyEffectsToToken(tokenDocument.id);
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


class FriendlyEffectsWidget extends Application {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = "friendly-effects-widget";
    options.title = "Friendly Effects";
    options.template = "systems/smt-200x/templates/friendly-effects.hbs";
    options.popOut = true;
    options.resizable = false;
    options.width = 300;
    options.height = "auto";
    options.minimizable = true;
    options.draggable = true;

    // Hide the close button visually
    options.classes = [...(options.classes || []), "hide-close-button"];

    return options;
  }

  /** @override */
  async render(force = false, options = {}) {
    await super.render(force, options);

    // Delay restoring position slightly to avoid timing issues
    setTimeout(() => this.restorePosition(), 200);
  }

  /** @override Prevent closing this window. */
  async close() {
    ui.notifications.warn("This window cannot be closed.");
    return;
  }

  /** Restore the last saved position */
  async restorePosition() {
    const savedPosition = game.settings.get("smt-200x", "friendlyEffectsWidgetPosition") || {};

    // Ensure the position data is valid before proceeding
    if (!savedPosition.left || !savedPosition.top) return;

    // Ensure the application has finished rendering before applying position
    await this._waitForRender();

    this.setPosition(savedPosition);
  }

  /** Helper function to wait for the widget to be fully rendered */
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

  /** Save the window's current position */
  async savePosition() {
    const pos = this.position;
    await game.settings.set("smt-200x", "friendlyEffectsWidgetPosition", {
      left: pos.left,
      top: pos.top,
      width: game.settings.get("smt-200x", "tugOfWarBuffs") ? 150 : 350,
      height: pos.height
    });
  }

  /** @override Prepare data for the template. */
  getData() {
    const data = super.getData();

    // Retrieve the existing settings
    data.effects = game.settings.get("smt-200x", "friendlyEffects") || {};

    data.effects.show = game.settings.get("smt-200x", "tugOfWarBuffs");
    data.effects.taruTotal = data.effects.tarukaja.amount - data.effects.tarunda.amount;
    data.effects.makaTotal = data.effects.makakaja.amount - data.effects.makunda.amount;
    data.effects.rakuTotal = data.effects.rakukaja.amount - data.effects.rakunda.amount;
    data.effects.sukuTotal = data.effects.sukukaja.amount - data.effects.sukunda.amount;

    return data;
  }

  /** @override Add event listeners on rendered HTML */
  activateListeners(html) {
    super.activateListeners(html);

    // Listen for window movement and save position when dragging stops
    this.element.on("mousedown", async () => {
      await this.savePosition();
    });

    // Reset all effects
    html.on('click', '.reset-button', async (ev) => {
      ev.preventDefault();
      const effects = {
        tarukaja: { amount: 0, count: 0 },
        makakaja: { amount: 0, count: 0 },
        rakukaja: { amount: 0, count: 0 },
        sukukaja: { amount: 0, count: 0 },
        tarunda: { amount: 0, count: 0 },
        makunda: { amount: 0, count: 0 },
        rakunda: { amount: 0, count: 0 },
        sukunda: { amount: 0, count: 0 }
      };

      await game.settings.set("smt-200x", "friendlyEffects", effects);
      await this.updateFriendlyTokens(effects);
      this.render();
    });

    // DEKAJA: Reset only positive buffs
    html.on('click', '.dekaja-button', async (ev) => {
      ev.preventDefault();

      let effects = game.settings.get("smt-200x", "friendlyEffects");
      const useTugOfWar = game.settings.get("smt-200x", "tugOfWarBuffs");

      if (useTugOfWar) {
        // When Tug of War is enabled, set only positive values to 0
        if (effects.tarukaja.amount > 0) effects.tarukaja.amount = 0;
        if (effects.makakaja.amount > 0) effects.makakaja.amount = 0;
        if (effects.rakukaja.amount > 0) effects.rakukaja.amount = 0;
        if (effects.sukukaja.amount > 0) effects.sukukaja.amount = 0;
      } else {
        // Normal mode: Reset all buffs
        effects.tarukaja = { amount: 0, count: 0 };
        effects.makakaja = { amount: 0, count: 0 };
        effects.rakukaja = { amount: 0, count: 0 };
        effects.sukukaja = { amount: 0, count: 0 };
      }

      await game.settings.set("smt-200x", "friendlyEffects", effects);
      await this.updateFriendlyTokens(effects);
      this.render();
    });

    // DEKUNDA: Reset only negative debuffs
    html.on('click', '.dekunda-button', async (ev) => {
      ev.preventDefault();

      let effects = game.settings.get("smt-200x", "friendlyEffects");
      const useTugOfWar = game.settings.get("smt-200x", "tugOfWarBuffs");

      if (useTugOfWar) {
        // When Tug of War is enabled, set only negative values to 0
        if (effects.tarukaja.amount < 0) effects.tarukaja.amount = 0;
        if (effects.makakaja.amount < 0) effects.makakaja.amount = 0;
        if (effects.rakukaja.amount < 0) effects.rakukaja.amount = 0;
        if (effects.sukukaja.amount < 0) effects.sukukaja.amount = 0;
      } else {
        // Normal mode: Reset all debuffs
        effects.tarunda = { amount: 0, count: 0 };
        effects.makunda = { amount: 0, count: 0 };
        effects.rakunda = { amount: 0, count: 0 };
        effects.sukunda = { amount: 0, count: 0 };
      }

      await game.settings.set("smt-200x", "friendlyEffects", effects);
      await this.updateFriendlyTokens(effects);
      this.render();
    });

    // Listen for changes to each numeric input
    html.find("input[data-category]").on("change", this._onInputChange.bind(this));
  }


  /**
   * Handle changes to the numeric fields and update settings.
   */
  async _onInputChange(event) {
    const input = event.currentTarget;
    const category = input.dataset.category;
    const field = input.dataset.field;
    const useTugOfWar = game.settings.get("smt-200x", "tugOfWarBuffs");
    const tugOfWarMin = game.settings.get("smt-200x", "tugOfWarMin");
    const tugOfWarMax = game.settings.get("smt-200x", "tugOfWarMax");
    const maxBuffCount = 4;


    let newValue = Number(input.value ?? 0);
    if (newValue == NaN)
      newValue = 0;


    // Get the current friendlyEffects object
    let effects = game.settings.get("smt-200x", "friendlyEffects") || {};
    if (!effects[category]) return; // safety check
    if (effects[category]["count"] >= maxBuffCount && input.value != 0) {
      this.getData()
      this.render();

      return ui.notifications.warn(
        `${category} is already at max effect count, aborting.`
      );
    }


    if (input.value.includes('+') || effects[category][field] == 0
      || (useTugOfWar && input.value.includes('-'))) {
      newValue += effects[category][field];
      effects[category]["count"] += 1;
    } else if (input.value == 0) {
      effects[category]["count"] = 0;
    }


    effects[category][field] = newValue;
    if (useTugOfWar)
      effects[category][field] = Math.max(tugOfWarMin,
        Math.min(tugOfWarMax, effects[category][field]));

    await game.settings.set("smt-200x", "friendlyEffects", effects);

    this.updateFriendlyTokens(effects);
    this.getData()
    this.render();
  }


  /**
   * Updates all friendly tokens in the current scene with the current friendly effects.
   */
  async updateFriendlyTokens(effects) {
    const scene = game.scenes.current;
    if (!scene) return;

    // Find all friendly tokens (disposition = 1)
    const friendlyTokens = scene.tokens.filter(t => t.disposition === 1);

    for (let token of friendlyTokens) {
      let updates = {};

      if (effects.tarukaja) {
        updates["system.buffs.taru"] = effects.tarukaja.amount;
      }
      if (effects.makakaja) {
        updates["system.buffs.maka"] = effects.makakaja.amount;
      }
      if (effects.rakukaja) {
        updates["system.buffs.raku"] = effects.rakukaja.amount;
      }
      if (effects.sukukaja) {
        updates["system.buffs.suku"] = effects.sukukaja.amount;
      }

      if (Object.keys(updates).length > 0) {
        await token.actor.update(updates);
      }
    }
  }


  static async applyEffectsToToken(tokenId) {
    const scene = game.scenes.current;
    if (!scene) return;

    const token = scene.tokens.get(tokenId);
    if (!token || token.disposition !== 1) return; // Only apply to friendly tokens

    // Get current global effects
    const effects = game.settings.get("smt-200x", "friendlyEffects") || {};
    let updates = {};

    if (effects.tarukaja) {
      updates["system.buffs.taru"] = effects.tarukaja.amount;
    }
    if (effects.makakaja) {
      updates["system.buffs.maka"] = effects.makakaja.amount;
    }
    if (effects.rakukaja) {
      updates["system.buffs.raku"] = effects.rakukaja.amount;
    }
    if (effects.sukukaja) {
      updates["system.buffs.suku"] = effects.sukukaja.amount;
    }

    await token.actor.update(updates);
  }
}