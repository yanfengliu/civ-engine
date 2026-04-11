export const COMMAND_RESULT_SCHEMA_VERSION = 1;
export const WORLD_DEBUG_SCHEMA_VERSION = 1;
export const WORLD_HISTORY_SCHEMA_VERSION = 1;
export const WORLD_HISTORY_RANGE_SUMMARY_SCHEMA_VERSION = 1;
export const SCENARIO_RESULT_SCHEMA_VERSION = 1;
export const CLIENT_PROTOCOL_VERSION = 1;

export interface AiContractVersions {
  commandResult: typeof COMMAND_RESULT_SCHEMA_VERSION;
  worldDebug: typeof WORLD_DEBUG_SCHEMA_VERSION;
  worldHistory: typeof WORLD_HISTORY_SCHEMA_VERSION;
  worldHistoryRangeSummary: typeof WORLD_HISTORY_RANGE_SUMMARY_SCHEMA_VERSION;
  scenarioResult: typeof SCENARIO_RESULT_SCHEMA_VERSION;
  clientProtocol: typeof CLIENT_PROTOCOL_VERSION;
}

export function getAiContractVersions(): AiContractVersions {
  return {
    commandResult: COMMAND_RESULT_SCHEMA_VERSION,
    worldDebug: WORLD_DEBUG_SCHEMA_VERSION,
    worldHistory: WORLD_HISTORY_SCHEMA_VERSION,
    worldHistoryRangeSummary: WORLD_HISTORY_RANGE_SUMMARY_SCHEMA_VERSION,
    scenarioResult: SCENARIO_RESULT_SCHEMA_VERSION,
    clientProtocol: CLIENT_PROTOCOL_VERSION,
  };
}
