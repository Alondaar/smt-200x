import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class SMTXItemSheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['smt-200x', 'sheet', 'item'],
      width: 520,
      height: 480,
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'description',
        },
      ],
    });
  }

  /** @override */
  get template() {
    const path = 'systems/smt-200x/templates/item';
    // Return a single sheet for all item types.
    // return `${path}/item-sheet.hbs`;

    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `weapon-sheet.hbs`.
    return `${path}/item-${this.item.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve base data structure.
    const context = super.getData();

    // Use a safe clone of the item data for further operations.
    const itemData = this.document.toObject(false);

    // Enrich description info for display
    // Enrichment turns text like `[[/r 1d20]]` into buttons
    context.enrichedDescription = await TextEditor.enrichHTML(
      this.item.system.description,
      {
        // Whether to show secret blocks in the finished html
        secrets: this.document.isOwner,
        // Necessary in v11, can be removed in v12
        async: true,
        // Data to fill in for inline rolls
        rollData: this.item.getRollData(),
        // Relative UUID resolution
        relativeTo: this.item,
      }
    );

    // Add the item's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    context.flags = itemData.flags;

    // Adding a pointer to CONFIG.SMT_X
    context.config = CONFIG.SMT_X;

    // Prepare active effects for easier access
    context.effects = prepareActiveEffectCategories(this.item.effects);

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Roll handlers, click handlers, etc. would go here.

    // Active Effect management
    html.on('click', '.effect-control', (ev) =>
      onManageActiveEffect(ev, this.item)
    );


    html.on('change', 'select.attack-type', (event) => {
      event.preventDefault();
      const selectedTN = $(event.currentTarget).val();

      switch (selectedTN) {
        case "melee":
          this.item.update({ "system.attackType": "melee" });
          break;
        case "ranged":
          this.item.update({ "system.attackType": "ranged" });
          break;
        case "magic":
          this.item.update({ "system.attackType": "magic" });
          break;
        default:
          this.item.update({ "system.attackType": "none" });
          break;
      }
    });


    html.on('click', '.remove-effect-link', (event) => {
      event.preventDefault();
      this.item.update({ "system.inflictedEffect": "" });
    });




    // Setup the drop zone for effects
    const dropZone = html.find(".effect-drop-zone");
    dropZone.on("dragover", (event) => {
      event.preventDefault();
      // Set the drop effect to copy so the user knows it’s a valid drop target
      event.originalEvent.dataTransfer.dropEffect = "copy";
      dropZone.addClass("dragover");
    });
    dropZone.on("dragleave", (event) => {
      event.preventDefault();
      dropZone.removeClass("dragover");
    });
    dropZone.on("drop", async (event) => {
      event.preventDefault();
      dropZone.removeClass("dragover");

      // Get the raw data from the event
      let rawData = event.originalEvent.dataTransfer.getData("text/plain").trim();
      let data;
      try {
        data = JSON.parse(rawData);
      } catch (e) {
        // If parsing fails, assume it's already a plain string.
        data = rawData;
      }

      // If the data is an object with a uuid property, extract it.
      const uuid = (typeof data === "object" && data.uuid) ? data.uuid : data;

      // Validate the UUID format (should have at least 3 dot-separated parts)
      if (!uuid || uuid.split(".").length < 3) {
        ui.notifications.warn("Dropped item does not have a valid UUID.");
        return;
      }

      // Load the effect document using Foundry's fromUuid helper.
      const effectDoc = await fromUuid(uuid);
      if (!effectDoc) {
        ui.notifications.warn("Failed to load the effect document.");
        return;
      }

      // Update the item with the linked effect UUID.
      await this.item.update({ "system.inflictedEffect": uuid });
      ui.notifications.info("Effect linked to this skill.");
      this.render();
    });
  }
}
