/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return loadTemplates([
    // Actor partials.
    'systems/smt-200x/templates/actor/parts/actor-features.hbs',
    'systems/smt-200x/templates/actor/parts/npc-features.hbs',
    'systems/smt-200x/templates/actor/parts/actor-passives.hbs',
    'systems/smt-200x/templates/actor/parts/actor-armor.hbs',
    'systems/smt-200x/templates/actor/parts/actor-weapons.hbs',
    'systems/smt-200x/templates/actor/parts/actor-items.hbs',
    'systems/smt-200x/templates/actor/parts/actor-spells.hbs',
    'systems/smt-200x/templates/actor/parts/actor-buffs.hbs',
    'systems/smt-200x/templates/actor/parts/actor-effects.hbs',
    // Item partials
    'systems/smt-200x/templates/item/parts/item-effects.hbs',
  ]);
};
