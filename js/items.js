// Items & Toolbox Definitions for Short Circuit

const ITEM_TYPES = {
  MULTIMETER: 'multimeter',
  WIRE_CUTTERS: 'wire_cutters',
  VOLTAGE_BOOSTER: 'voltage_booster',
  INSULATED_GLOVE: 'insulated_glove'
};

const ITEMS = {
  [ITEM_TYPES.MULTIMETER]: {
    id: ITEM_TYPES.MULTIMETER,
    name: 'Multimeter',
    shortName: 'SCANNER',
    icon: '📟',
    description: 'Secretly scans the current chamber wire. Only YOU see if it is Live or Dud.',
    flavor: 'Calibrated probe. Never guess when you can measure.'
  },
  [ITEM_TYPES.WIRE_CUTTERS]: {
    id: ITEM_TYPES.WIRE_CUTTERS,
    name: 'Wire Cutters',
    shortName: 'CUTTERS',
    icon: '✂️',
    description: 'Safely snips out the active wire without triggering discharge.',
    flavor: 'Snip the feed. Clean cut, zero consequences.'
  },
  [ITEM_TYPES.VOLTAGE_BOOSTER]: {
    id: ITEM_TYPES.VOLTAGE_BOOSTER,
    name: 'Voltage Booster',
    shortName: 'BOOSTER',
    icon: '⚡',
    description: 'Overdrives capacitor. Next Live wire inflicts 2 HP damage instead of 1.',
    flavor: 'Surge protector removed. Maximum lethal output.'
  },
  [ITEM_TYPES.INSULATED_GLOVE]: {
    id: ITEM_TYPES.INSULATED_GLOVE,
    name: 'Insulated Glove',
    shortName: 'GLOVE',
    icon: '🧤',
    description: 'Stuns rival terminals. Skips opponent\'s next turn.',
    flavor: 'Grounds electrical backlash. Lock them in place.'
  }
};

const ALL_ITEM_IDS = [
  ITEM_TYPES.MULTIMETER,
  ITEM_TYPES.WIRE_CUTTERS,
  ITEM_TYPES.VOLTAGE_BOOSTER,
  ITEM_TYPES.INSULATED_GLOVE
];

function getRandomItem() {
  const idx = Math.floor(Math.random() * ALL_ITEM_IDS.length);
  return ALL_ITEM_IDS[idx];
}

window.ITEM_TYPES = ITEM_TYPES;
window.ITEMS = ITEMS;
window.getRandomItem = getRandomItem;
