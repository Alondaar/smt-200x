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



/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));
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
