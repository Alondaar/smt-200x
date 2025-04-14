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

  console.log('SMT 200X | Initializing socket listener for buff widget updates');
  game.socket.on("system.smt-200x", async (data) => {
    if (data.action === "updateBuffWidgets") {
      // Optionally, you could check data.effects if you want to update game settings directly.
      if (data.mode === "friendly" && game.friendlyEffectsWidget) {
        game.friendlyEffectsWidget.render();
      } else if (data.mode === "hostile" && game.hostileEffectsWidget) {
        game.hostileEffectsWidget.render();
      }
    }
  });



  // Overrides the statuses
  CONFIG.statusEffects = [
    {
      id: "DEAD",
      img: "icons/svg/skull.svg",
      name: "Dead",
      flags: { type: "BS" },
      changes: [{
        key: "system.badStatus",
        value: "DEAD",
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        priority: 65,
      }]
    },
    {
      id: "STONE",
      img: "icons/commodities/treasure/totem-wood-face-brown.webp",
      name: "Petrified",
      flags: { type: "BS" },
      changes: [{
        key: "system.badStatus",
        value: "STONE",
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        priority: 64,
      }]
    },
    {
      id: "FLY",
      img: "icons/creatures/invertebrates/bee-simple-green.webp",
      name: "Fly",
      flags: { type: "BS" },
      changes: [{
        key: "system.badStatus",
        value: "FLY",
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        priority: 63,
      }]
    },
    {
      id: "PARALYZE",
      img: "icons/skills/wounds/injury-pain-body-orange.webp",
      name: "Stunned",
      flags: { type: "BS" },
      changes: [{
        key: "system.badStatus",
        value: "PARALYZE",
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        priority: 62,
      }]
    },
    {
      id: "CHARM",
      img: "icons/magic/control/hypnosis-mesmerism-eye.webp",
      name: "Charmed",
      flags: { type: "BS" },
      changes: [{
        key: "system.badStatus",
        value: "CHARM",
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        priority: 61,
      }]
    },
    {
      id: "POISON",
      img: "icons/skills/toxins/cauldron-bubbles-overflow-green.webp",
      name: "Poisoned",
      flags: { type: "BS" },
      changes: [{
        key: "system.badStatus",
        value: "POISON",
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        priority: 60,
      }]
    },
    {
      id: "CLOSE",
      img: "icons/magic/unholy/strike-body-life-soul-purple.webp",
      name: "Muted",
      flags: { type: "BS" },
      changes: [{
        key: "system.badStatus",
        value: "CLOSE",
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        priority: 59,
      }]
    },
    {
      id: "BIND",
      img: "icons/magic/control/debuff-chains-shackle-movement-red.webp",
      name: "Restrained",
      flags: { type: "BS" },
      changes: [{
        key: "system.badStatus",
        value: "BIND",
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        priority: 58,
      }]
    },
    {
      id: "FREEZE",
      img: "icons/magic/water/barrier-ice-crystal-wall-faceted.webp",
      name: "Frozen",
      flags: { type: "BS" },
      changes: [{
        key: "system.badStatus",
        value: "FREEZE",
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        priority: 57,
      }]
    },
    {
      id: "SLEEP",
      img: "icons/magic/control/sleep-bubble-purple.webp",
      name: "Asleep",
      flags: { type: "BS" },
      changes: [{
        key: "system.badStatus",
        value: "SLEEP",
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        priority: 56,
      }]
    },
    {
      id: "PANIC",
      img: "icons/magic/control/fear-fright-white.webp",
      name: "Panicked",
      flags: { type: "BS" },
      changes: [{
        key: "system.badStatus",
        value: "PANIC",
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        priority: 55,
      }]
    },
    {
      id: "SHOCK",
      img: "icons/magic/lightning/bolts-forked-large-orange.webp",
      name: "Shocked",
      flags: { type: "BS" },
      changes: [{
        key: "system.badStatus",
        value: "SHOCK",
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        priority: 54,
      }]
    },
    {
      id: "HAPPY",
      img: "icons/skills/social/peace-luck-insult.webp",
      name: "Happy",
      flags: { type: "BS" },
      changes: [{
        key: "system.badStatus",
        value: "HAPPY",
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        priority: 53,
      }]
    },
    {
      id: "CURSE",
      img: "icons/magic/perception/eye-tendrils-web-purple.webp",
      name: "Cursed",
      changes: [{
        key: "system.isCursed",
        value: true,
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        priority: 50,
      }]
    }
  ];

  /*interface ActiveEffectData {
    _id: string;
    name: string;
    img: string;
    changes: EffectChangeData[];
    disabled: boolean;
    duration: EffectDurationData;
    description: string;
    origin: string;
    tint: string;
    transfer: boolean;
    statuses: Set<string>;
    flags: object;
  }*/

  /*interface EffectChangeData {
    key: string;
    value: string;
    mode: number;
    priority: number;
  }*/



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
    name: "Magical Defense Formula (Demon)",
    hint: "The default magical defense formula for actors.",
    scope: "world",
    config: true,
    type: String,
    default: "(@stats.vt.value + @attributes.level)"
  });

  game.settings.register("smt-200x", "magDefHuman", {
    name: "Magical Defense Formula (Human)",
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

  game.settings.register("smt-200x", "pierceResist", {
    name: "Pierce treats Resist/Strong as:",
    hint: "Tells the game how an attack with Pierce enabled treats certain Affinities.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      normal: "Normal",
      weak: "Weak",
      resist: "Resist",
      null: "Null",
      drain: "Drain",
      repel: "Repel"
    },
    default: "normal"
  });

  game.settings.register("smt-200x", "pierceNull", {
    name: "Pierce treats Null as:",
    hint: "Tells the game how an attack with Pierce enabled treats certain Affinities.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      normal: "Normal",
      weak: "Weak",
      resist: "Resist",
      null: "Null",
      drain: "Drain",
      repel: "Repel"
    },
    default: "resist"
  });

  game.settings.register("smt-200x", "pierceDrain", {
    name: "Pierce treats Drain as:",
    hint: "Tells the game how an attack with Pierce enabled treats certain Affinities.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      none: "None",
      normal: "Normal",
      weak: "Weak",
      resist: "Resist",
      null: "Null",
      drain: "Drain",
      repel: "Repel"
    },
    default: "drain"
  });

  game.settings.register("smt-200x", "pierceRepel", {
    name: "Pierce treats Repel as:",
    hint: "Tells the game how an attack with Pierce enabled treats certain Affinities.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      none: "None",
      normal: "Normal",
      weak: "Weak",
      resist: "Resist",
      null: "Null",
      drain: "Drain",
      repel: "Repel"
    },
    default: "repel"
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

Handlebars.registerHelper('ifOver', function (value, threshold, options) {
  if (value > threshold) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper("showTC", function () {
  return game.settings.get("smt-200x", "showTCheaders");
});


/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  //Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));

  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if (data.type == "Item") {
      createItemMacro(data, slot);
      return false;
    }
  });

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



  game.socket.on("system.smt-200x", async (data) => {
    console.log("[SMT-200x] Socket message received:", data);

    // Check if this is the message intended for this user.
    if (data.action === "openRecoveryDialog" && game.user.id === data.targetUserId) {
      console.log("[SMT-200x] Opening Recovery Dialog for user:", game.user.id);

      // Optional: Temporarily show a simple alert to verify execution.
      // ui.notifications.info("Recovery Dialog should open now.");

      // Create the dialog.
      let d = new Dialog({
        title: "Recovery Service",
        content: `
          <form>
            <div style="margin-bottom: 5px;"><strong>Recovery Service</strong></div>
            <div class="form-group">
              <label>HP Recovery (1 Macca per 1 HP):</label>
              <input type="number" id="hpInput" value="0" min="0" max="${data.missingHP}" />
              <button type="button" id="buyMaxHP">Fill to Max HP</button>
            </div>
            <div class="form-group">
              <label>MP Recovery (4 Macca per 1 MP):</label>
              <input type="number" id="mpInput" value="0" min="0" max="${data.missingMP}" />
              <button type="button" id="buyMaxMP">Fill to Max MP</button>
            </div>
            <div style="margin-top: 15px; border-top: 1px solid #ccc; padding-top: 10px; display: flex; justify-content: space-between;">
              <span>Held Macca: <strong>${data.currentMacca}</strong></span>
              <span>Total Cost: <strong><span id="totalCost">0</span> Macca</strong></span>
            </div>
          </form>
        `,
        buttons: {
          heal: {
            icon: '<i class="fas fa-heart"></i>',
            label: "Heal",
            callback: async (html) => {
              const hpVal = Number(html.find("#hpInput").val());
              const mpVal = Number(html.find("#mpInput").val());
              console.log("[SMT-200x] Sending processRecovery with hpVal:", hpVal, " mpVal:", mpVal);
              // Send results back to GM
              game.socket.emit("system.smt-200x", {
                action: "processRecovery",
                tokenId: data.tokenId,
                hpVal,
                mpVal,
                userId: game.user.id
              });
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel"
          }
        },
        default: "heal",
        render: (html) => {
          const updateCost = () => {
            const hpAmt = Number(html.find("#hpInput").val());
            const mpAmt = Number(html.find("#mpInput").val());
            const cost = hpAmt * 1 + mpAmt * 4;
            html.find("#totalCost").text(cost);
          };

          html.find("#hpInput").on("input", updateCost);
          html.find("#mpInput").on("input", updateCost);
          html.find("#buyMaxHP").on("click", (ev) => {
            ev.preventDefault();
            const maxHPRecovery = Math.min(data.missingHP, data.currentMacca);
            html.find("#hpInput").val(maxHPRecovery);
            updateCost();
          });
          html.find("#buyMaxMP").on("click", (ev) => {
            ev.preventDefault();
            const maxMPRecovery = Math.min(data.missingMP, Math.floor(data.currentMacca / 4));
            html.find("#mpInput").val(maxMPRecovery);
            updateCost();
          });
        }
      });

      // Render the dialog.
      d.render(true);
      console.log("[SMT-200x] Dialog rendered.");
    }
    // GM-Side: Process healing when response comes back.
    else if (data.action === "processRecovery" && game.user.isGM) {
      console.log("[SMT-200x] Processing recovery data on GM side:", data);
      let token = canvas.tokens.get(data.tokenId);
      if (!token) return ui.notifications.warn("Token not found.");
      let actor = token.actor;

      const currentHP = actor.system.hp.value;
      const maxHP = actor.system.hp.max;
      const currentMP = actor.system.mp.value;
      const maxMP = actor.system.mp.max;
      const currentMacca = actor.system.macca || 0;
      const cost = Number(data.hpVal) * 1 + Number(data.mpVal) * 4;

      if (cost > currentMacca) {
        return ui.notifications.warn("Not enough Macca!");
      }

      const newHP = Math.min(maxHP, currentHP + Number(data.hpVal));
      const newMP = Math.min(maxMP, currentMP + Number(data.mpVal));

      await actor.update({
        "system.hp.value": newHP,
        "system.mp.value": newMP,
        "system.macca": currentMacca - cost
      });

      let report = `<p><strong>Recovery Report</strong></p>`;
      report += `<p>Macca Spent: ${cost}</p>`;
      if (newHP - currentHP > 0) report += `<p>HP Recovered: ${newHP - currentHP}</p>`;
      if (newMP - currentMP > 0) report += `<p>MP Recovered: ${newMP - currentMP}</p>`;

      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        content: report
      });
    }
  });
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
  // First, determine if this is a valid owned Item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // Retrieve the Item from the drop data.
  const item = await Item.fromDropData(data);

  // Only allow macros for Items of type 'feature'
  if (item.type !== 'feature') {
    return ui.notifications.warn("Macros can only be created for Feature type items.");
  }

  // Create the macro command using the uuid.
  // The command will now launch our custom rollItemMacro function.
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
    // Ensure the item exists and is owned.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Create a dialog to choose which roll to execute.
    new Dialog({
      title: item.name,
      content: `<p>Choose an action:</p>`,
      buttons: {
        check: {
          icon: '<i class="fas fa-dice"></i>',
          label: "Roll Check",
          callback: () => {
            // For a check roll, you could invoke the method for a check.
            // Based on your sheet code, that might be something like rollSplitD100(true)
            item.rollSplitD100(true);
          }
        },
        power: {
          icon: '<i class="fas fa-bolt"></i>',
          label: "Roll Power",
          callback: () => {
            // For a power roll, invoke the power roll
            item.rollPower(true);
          }
        }
      },
      default: "check"
    }).render(true);
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
    this.options.title = this.mode === "friendly" ? "PC-side Effects" : "Hostile-side Effects";
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
    effects[category][field] = Math.abs(newValue);
    if (newValue == 0)
      effects[category].count = 0;

    // Save & update tokens
    await game.settings.set("smt-200x", settingKey, effects);
    await this._updateTokens(effects);

    // Re-render locally
    this.render();
  }



  async _dekaja() {
    const settingKey = (this.mode === "friendly") ? "friendlyEffects" : "hostileEffects";
    let effects = game.settings.get("smt-200x", settingKey) || {};

    if (effects.tarukaja.amount > 0) {
      effects.tarukaja.amount = 0;
      effects.tarukaja.count = 0;
    }
    if (effects.makakaja.amount > 0) {
      effects.makakaja.amount = 0;
      effects.makakaja.count = 0;
    }
    if (effects.rakukaja.amount > 0) {
      effects.rakukaja.amount = 0;
      effects.rakukaja.count = 0;
    }
    if (effects.sukukaja.amount > 0) {
      effects.sukukaja.amount = 0;
      effects.sukukaja.count = 0;
    }

    await game.settings.set("smt-200x", settingKey, effects);
    await this._updateTokens(effects);
    this.render();
  }



  async _dekunda() {
    const settingKey = (this.mode === "friendly") ? "friendlyEffects" : "hostileEffects";
    let effects = game.settings.get("smt-200x", settingKey) || {};

    if (effects.tarunda.amount > 0) {
      effects.tarunda.amount = 0;
      effects.tarunda.count = 0;
    }
    if (effects.makunda.amount > 0) {
      effects.makunda.amount = 0;
      effects.makunda.count = 0;
    }
    if (effects.rakunda.amount > 0) {
      effects.rakunda.amount = 0;
      effects.rakunda.count = 0;
    }
    if (effects.sukunda.amount > 0) {
      effects.sukunda.amount = 0;
      effects.sukunda.count = 0;
    }

    await game.settings.set("smt-200x", settingKey, effects);
    await this._updateTokens(effects);
    this.render();
  }



  async _updateTokens(effects) {
    const scene = game.scenes.current;
    if (!scene) return;

    // disposition 1 = Friendly | disposition -1 = hostile
    const disposition = (this.mode === "friendly") ? 1 : -1;
    const tokens = scene.tokens.filter(t => t.disposition === disposition);


    for (let token of tokens) {
      let updates = {};

      updates["system.buffs.taru"] = effects.tarukaja.amount;
      updates["system.buffs.maka"] = effects.makakaja.amount;
      updates["system.buffs.raku"] = effects.rakukaja.amount;
      updates["system.buffs.suku"] = effects.sukukaja.amount;

      updates["system.debuffs.taru"] = effects.tarunda.amount;
      updates["system.debuffs.maka"] = effects.makunda.amount;
      updates["system.debuffs.raku"] = effects.rakunda.amount;
      updates["system.debuffs.suku"] = effects.sukunda.amount;

      // Emit a socket event so other clients update their widget
      game.socket.emit("system.smt-200x", { action: "updateBuffWidgets", mode: this.mode });

      await token.actor.update(updates);
    }
  }



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

    updates["system.debuffs.taru"] = effects.tarunda.amount;
    updates["system.debuffs.maka"] = effects.makunda.amount;
    updates["system.debuffs.raku"] = effects.rakunda.amount;
    updates["system.debuffs.suku"] = effects.sukunda.amount;

    // Emit a socket event so other clients update their widget
    game.socket.emit("system.smt-200x", { action: "updateBuffWidgets", mode: this.mode });

    await token.actor.update(updates);
  }
}




Hooks.once("canvasReady", () => {
  const canvasEl = canvas.app.view;

  // Allow drops on the canvas.
  canvasEl.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  canvasEl.addEventListener("drop", async (event) => {
    event.preventDefault();

    // Get the canvas's bounding rectangle.
    const rect = canvas.app.view.getBoundingClientRect();
    // Get drop position in screen (client) coordinates.
    let dropX = event.clientX - rect.left;
    let dropY = event.clientY - rect.top;

    // Convert these screen coordinates into canvas (world) coordinates.
    const dropPoint = canvas.app.stage.toLocal(new PIXI.Point(dropX, dropY));

    // Loop through tokens to see if the drop point is over any token.
    for (let token of canvas.tokens.placeables) {
      if (
        dropPoint.x >= token.x &&
        dropPoint.x <= token.x + token.w &&
        dropPoint.y >= token.y &&
        dropPoint.y <= token.y + token.h
      ) {
        console.log("Drop detected on token:", token.name);

        const rawData = event.dataTransfer.getData("text/plain").trim();
        if (!rawData) return //ui.notifications.warn("No effect data found on drop.");

        let data;
        try {
          data = JSON.parse(rawData);
        } catch (err) {
          data = rawData;
        }

        if (data.status) {
          // TODO: Check actor's Null affinity for that BS?
          token.actor.applyBS(data.status);
          return
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

        await token.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
        ui.notifications.info(`Applied effect: ${effectDoc.name} to ${token.document.name}`);
        break;
      }
    }
  });
});




Hooks.on("renderChatMessage", (message, html, data) => {
  html.find(".draggable-effect").each((i, el) => {
    el.addEventListener("dragstart", (ev) => {
      const uuid = ev.currentTarget.dataset.uuid;
      // console.log("Drag started with UUID:", uuid);
      if (uuid) {
        ev.dataTransfer.setData("text/plain", JSON.stringify({ uuid: uuid }));
      }
    });
  });

  html.find(".draggable-status").each((i, el) => {
    el.addEventListener("dragstart", (ev) => {
      const effectID = ev.currentTarget.dataset.status;
      ev.dataTransfer.setData("text/plain", JSON.stringify({ status: effectID }));
    });
  });
});




Hooks.on("preCreateActiveEffect", async (effect, options, userId) => {
  // Check if the new effect has a BS flag
  if (effect.flags?.type === "BS") {
    const actor = effect.parent;
    // Find any other active effects on the actor with the BS flag (excluding the Curse effect)
    const conflictingEffects = actor.effects.filter(e =>
      e.id !== effect.id &&
      e.flags?.type === "BS"
    );
    // Remove any conflicting BS effects
    if (conflictingEffects.length > 0) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", conflictingEffects.map(e => e.id));
    }
  }
});




Hooks.once("item-piles-ready", _onItemPilesReady);

// Based on Nekohime's Item Piles integration for her system;
async function _onItemPilesReady() {
  await game.itempiles.API.addSystemIntegration({
    VERSION: `${game.system.version}`,
    ACTOR_CLASS_TYPE: "character",
    ITEM_QUANTITY_ATTRIBUTE: "system.quantity",
    ITEM_PRICE_ATTRIBUTE: "system.buy",
    ITEM_FILTERS: [{ path: "type", filters: "feature" }, { path: "type", filters: "passive" }],
    UNSTACKABLE_ITEM_TYPES: ["weapon", "armor"],
    ITEM_SIMILARITIES: ["name", "type"],
    CURRENCY_DECIMAL_DIGITS: 1,
    CURRENCIES: [
      {
        name: "Macca",
        primary: true,
        type: "attribute",
        img: "icons/commodities/currency/coin-yingyang.webp",
        abbreviation: "{#}mc",
        data: { path: "system.macca" },
        exchangeRate: 1,
      },
    ],
    SECONDARY_CURRENCIES: [
      {
        name: "Diamond",
        type: "attribute",
        img: CONFIG.SMT_X.gemIcons.diamond,
        abbreviation: `{#} ${game.i18n.localize("SMT_X.gems.diamond")}`,
        data: {
          path: "system.gems.diamond"
        }
      },
      {
        name: "Pearl",
        type: "attribute",
        img: CONFIG.SMT_X.gemIcons.pearl,
        abbreviation: `{#} ${game.i18n.localize("SMT_X.gems.pearl")}`,
        data: {
          path: "system.gems.pearl"
        }
      },
      {
        name: "Sapphire",
        type: "attribute",
        img: CONFIG.SMT_X.gemIcons.sapphire,
        abbreviation: `{#} ${game.i18n.localize("SMT_X.gems.sapphire")}`,
        data: {
          path: "system.gems.sapphire"
        }
      },
      {
        name: "Emerald",
        type: "attribute",
        img: CONFIG.SMT_X.gemIcons.emerald,
        abbreviation: `{#} ${game.i18n.localize("SMT_X.gems.emerald")}`,
        data: {
          path: "system.gems.emerald"
        }
      },
      {
        name: "Ruby",
        type: "attribute",
        img: CONFIG.SMT_X.gemIcons.ruby,
        abbreviation: `{#} ${game.i18n.localize("SMT_X.gems.ruby")}`,
        data: {
          path: "system.gems.ruby"
        }
      },
      {
        name: "Jade",
        type: "attribute",
        img: CONFIG.SMT_X.gemIcons.jade,
        abbreviation: `{#} ${game.i18n.localize("SMT_X.gems.jade")}`,
        data: {
          path: "system.gems.jade"
        }
      },
      {
        name: "Opal",
        type: "attribute",
        img: CONFIG.SMT_X.gemIcons.opal,
        abbreviation: `{#} ${game.i18n.localize("SMT_X.gems.opal")}`,
        data: {
          path: "system.gems.opal"
        }
      },
      {
        name: "Amethyst",
        type: "attribute",
        img: CONFIG.SMT_X.gemIcons.amethyst,
        abbreviation: `{#} ${game.i18n.localize("SMT_X.gems.amethyst")}`,
        data: {
          path: "system.gems.amethyst"
        }
      },
      {
        name: "Agate",
        type: "attribute",
        img: CONFIG.SMT_X.gemIcons.agate,
        abbreviation: `{#} ${game.i18n.localize("SMT_X.gems.agate")}`,
        data: {
          path: "system.gems.agate"
        }
      },
      {
        name: "Turquoise",
        type: "attribute",
        img: CONFIG.SMT_X.gemIcons.turquoise,
        abbreviation: `{#} ${game.i18n.localize("SMT_X.gems.turquoise")}`,
        data: {
          path: "system.gems.turquoise"
        }
      },
      {
        name: "Garnet",
        type: "attribute",
        img: CONFIG.SMT_X.gemIcons.garnet,
        abbreviation: `{#} ${game.i18n.localize("SMT_X.gems.garnet")}`,
        data: {
          path: "system.gems.garnet"
        }
      },
      {
        name: "Onyx",
        type: "attribute",
        img: CONFIG.SMT_X.gemIcons.onyx,
        abbreviation: `{#} ${game.i18n.localize("SMT_X.gems.onyx")}`,
        data: {
          path: "system.gems.onyx"
        }
      },
      {
        name: "Coral",
        type: "attribute",
        img: CONFIG.SMT_X.gemIcons.coral,
        abbreviation: `{#} ${game.i18n.localize("SMT_X.gems.coral")}`,
        data: {
          path: "system.gems.coral"
        }
      },
      {
        name: "Aquamarine",
        type: "attribute",
        img: CONFIG.SMT_X.gemIcons.aquamarine,
        abbreviation: `{#} ${game.i18n.localize("SMT_X.gems.aquamarine")}`,
        data: {
          path: "system.gems.aquamarine"
        }
      }
    ],
  });
}