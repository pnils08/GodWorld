/**
 * Cycle-based holiday flags and metadata. Year positions are 1-52.
 * Kept and held observances share this single source for engine and Node readers.
 */
var SIM_HOLIDAYS = {
  1:  { name: 'NewYear', label: 'New Year', priority: 'major', neighborhood: 'Downtown', type: 'celebration' },
  7:  { name: 'Valentine', label: "Valentine's", priority: 'minor', neighborhood: null, type: 'romance' },
  12: { name: 'SpringEquinox', label: 'Spring Equinox', priority: 'minor', neighborhood: null, type: 'seasonal' },
  15: { name: 'Easter', label: 'Easter', priority: 'major', neighborhood: null, type: 'religious' },
  19: { name: 'MothersDay', label: "Mother's Day", priority: 'minor', neighborhood: null, type: 'family' },
  25: { name: 'FathersDay', label: "Father's Day", priority: 'minor', neighborhood: null, type: 'family' },
  26: { name: 'SummerSolstice', label: 'Summer Solstice', priority: 'minor', neighborhood: 'Lake Merritt', type: 'seasonal' },
  33: { name: 'BackToSchool', label: 'Back to School', priority: 'minor', neighborhood: null, type: 'civic' },
  38: { name: 'FallEquinox', label: 'Fall Equinox', priority: 'minor', neighborhood: null, type: 'seasonal' },
  44: { name: 'Halloween', label: 'Halloween', priority: 'major', neighborhood: 'Temescal', type: 'celebration' },
  47: { name: 'Thanksgiving', label: 'Thanksgiving', priority: 'major', neighborhood: null, type: 'family' },
  48: { name: 'CreationDay', label: 'Creation Day', priority: 'major', neighborhood: 'Oakland', type: 'godworld' },
  51: { name: 'Holiday', label: 'Christmas', priority: 'major', neighborhood: null, type: 'celebration' },
  52: { name: 'NewYearsEve', label: "New Year's Eve", priority: 'major', neighborhood: 'Downtown', type: 'celebration' }
};

function getSimHoliday_(cycleOfYear) {
  return SIM_HOLIDAYS[cycleOfYear] ? SIM_HOLIDAYS[cycleOfYear].name : 'none';
}

function getSimHolidayDetails_(cycleOfYear) {
  var holiday = SIM_HOLIDAYS[cycleOfYear];
  if (!holiday) {
    return { name: 'none', label: 'none', priority: 'none', neighborhood: null, type: null };
  }
  return {
    name: holiday.name,
    label: holiday.label,
    priority: holiday.priority,
    neighborhood: holiday.neighborhood,
    type: holiday.type,
    cycle: cycleOfYear
  };
}

function isFirstFridayCycle_(cycleOfYear) {
  return cycleOfYear % 4 === 2;
}

function getCycleOfYear_(absoluteCycle) {
  return ((absoluteCycle - 1) % 52) + 1;
}

function getGodWorldYear_(absoluteCycle) {
  return Math.ceil(absoluteCycle / 52);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SIM_HOLIDAYS: SIM_HOLIDAYS,
    getSimHoliday_: getSimHoliday_,
    getSimHolidayDetails_: getSimHolidayDetails_,
    isFirstFridayCycle_: isFirstFridayCycle_
  };
}
