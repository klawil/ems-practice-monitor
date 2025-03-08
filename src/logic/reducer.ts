import { ServerMonitorActions, SharedState } from "@/types/state";

export const defaultState: SharedState = {
  connected: false,
  sensors: {
    SpO2: false,
    ETCO2: false,
    '3-lead': false,
    '12-lead': false,
    BP: false,
  },
  HRGeneratorConfig: {
    targetValue: 90,
    targetRange: 3,
    maxChangePerS: 2,
    maxUpdateFreq: 1,
  },
  SpO2GeneratorConfig: {
    targetValue: 95,
    targetRange: 2,
    maxChangePerS: 2,
    maxUpdateFreq: 1,
  },
  RRGeneratorConfig: {
    targetValue: 16,
    targetRange: 3,
    maxChangePerS: 5,
    maxUpdateFreq: 5,
  },
  CO2GeneratorConfig: {
    targetValue: 40,
    targetRange: 3,
    maxChangePerS: 5,
    maxUpdateFreq: 5,
  },
  SBPGeneratorConfig: {
    targetValue: 120,
    targetRange: 0,
    maxChangePerS: 200,
    maxUpdateFreq: 1,
  },
  DBPGeneratorConfig: {
    targetValue: 80,
    targetRange: 0,
    maxChangePerS: 200,
    maxUpdateFreq: 1,
  },
  co2GeneratorConfig: {
    noiseLevel: 0.05,
    startRounding: 0.5,
    exhaleRatio: 0.5,
  },
  spo2GeneratorConfig: {
    noiseLevel: 0.05,
  },
  ekgGeneratorConfig: {
    noiseLevel: 0.05,
    permitBelow0: true,
  },
};

export function defaultReducer(state: SharedState, action: ServerMonitorActions): SharedState {
  switch (action.action) {
    case 'SetMonitorId': {
      return {
        ...state,
        monitorId: action.id,
      };
    }
    case 'SetConnected':
      return {
        ...state,
        connected: action.state,
      };
    case 'SetSensor': {
      return {
        ...state,
        sensors: {
          ...state.sensors,
          [action.sensor]: action.state,
        },
      };
    }
    case 'SetVitalGeneratorConfig': {
      const {
        action: _,
        vital,
        ...data
      } = action;
      return {
        ...state,
        [`${vital}GeneratorConfig`]: {
          ...state[`${vital}GeneratorConfig`],
          ...data,
        },
      };
    }
    case 'SetWaveformGeneratorConfig': {
      const {
        action: _,
        waveform,
        ...data
      } = action;
      return {
        ...state,
        [`${waveform}GeneratorConfig`]: {
          ...state[`${waveform}GeneratorConfig`],
          ...data,
        },
      };
    }
    default:
      return { ...state };
  }
}
