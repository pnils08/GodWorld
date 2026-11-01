'use strict';

// Offline civic.47 proposal. Nothing loads this into the normal civic route;
// only an explicit --civic47-pilot call may select it. Numeric delegated spend
// and duration bands were not specified in the plan and remain unavailable.
const POLICY = Object.freeze({
  version: 'CIVIC47-PILOT-PROPOSAL/1',
  activation: 'explicit-pilot-flag-only',
  duty: Object.freeze({
    regularTarget: 2,
    eventTarget: 2,
    chiefRegularTarget: 1,
    maxSeatsPerRun: 6,
    regularDaysUtc: Object.freeze([1, 2, 3, 4]),
    eventExceptionDaysUtc: Object.freeze([5, 6]),
  }),
  delegation: Object.freeze({
    version: 'CIVIC47-DELEGATION-PROPOSAL/1',
    enabled: false,
    localEventMaxCost: null,
    localServiceMaxCost: null,
    citywideMaxCost: null,
    localEventMaxCycles: null,
  }),
});

function pilotPolicy(flag) {
  return flag === true ? POLICY : null;
}

module.exports = { pilotPolicy };
