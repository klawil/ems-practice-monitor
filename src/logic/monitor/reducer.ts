import { MonitorAction, MonitorState, vitalTypes, waveformBoxNames, WaveformBoxTypes } from "@/types/monitor/reducer";

const waveformSamples = 150; // 5s at 30Hz or 10s at 15Hz

const vitalTypeToWaveform: {
  [key in typeof vitalTypes[number]]?: WaveformBoxTypes[];
} = {
  HR: [ 'I', 'II', 'III', 'SpO2' ],
  SpO2: [ 'SpO2' ],
  CO2: [ 'CO2' ],
  RR: [ 'CO2' ],
};

function setWaveformColors(newState: MonitorState): MonitorState {
  const waveformTypes = Array.from(Array(3), (_, i) =>
    newState[`waveform${i}` as typeof waveformBoxNames[number]].waveform);
  (Object.keys(vitalTypeToWaveform) as (typeof vitalTypes[number])[])
    .forEach(vital => {
      const hasWaveform = waveformTypes
        .reduce((prev, waveform) => {
          if (prev) return prev;

          return (vitalTypeToWaveform[vital] || []).includes(waveform);
        }, false);
      if (hasWaveform !== newState[vital].hasWaveform) {
        newState[vital] = {
          ...newState[vital],
          hasWaveform,
        };
      }
    });
  return newState;
}

export const defaultMonitorState: MonitorState = {
  sensors: {
    SpO2: false,
    ETCO2: false,
    '3-lead': false,
    '12-lead': false,
    BP: false,
  },
  lastTick: 0,
  lastTickTime: 0,
  HR: {
    value: 100,
    waveformVal: 0,
    hasWaveform: false,
  },
  HRGeneratorConfig: {
    targetValue: 90,
    targetRange: 5,
    maxChangePerS: 5,
    maxUpdateFreq: 5,
  },
  SpO2: {
    value: 95,
    waveformVal: 0,
    hasWaveform: true,
  },
  SpO2GeneratorConfig: {
    targetValue: 95,
    targetRange: 3,
    maxChangePerS: 5,
    maxUpdateFreq: 1,
  },
  RR: {
    value: 18,
    waveformVal: 0,
    hasWaveform: true,
  },
  RRGeneratorConfig: {
    targetValue: 16,
    targetRange: 3,
    maxChangePerS: 5,
    maxUpdateFreq: 5,
  },
  CO2: {
    value: 35,
    waveformVal: 0,
    hasWaveform: true,
  },
  CO2GeneratorConfig: {
    targetValue: 40,
    targetRange: 3,
    maxChangePerS: 5,
    maxUpdateFreq: 5,
  },
  SBP: {
    value: 150,
    waveformVal: 0,
    hasWaveform: false,
  },
  SBPGeneratorConfig: {
    targetValue: 120,
    targetRange: 5,
    maxChangePerS: 60,
    maxUpdateFreq: 60 * 5,
  },
  DBP: {
    value: 100,
    waveformVal: 0,
    hasWaveform: false,
  },
  DBPGeneratorConfig: {
    targetValue: 80,
    targetRange: 5,
    maxChangePerS: 60,
    maxUpdateFreq: 60 * 5,
  },
  waveform0: {
    data: Array.from(Array(waveformSamples * 4), () => null),
    waveform: 'II',
  },
  waveform1: {
    data: Array.from(Array(waveformSamples), () => null),
    waveform: 'SpO2',
  },
  waveform2: {
    data: Array.from(Array(waveformSamples), () => null),
    waveform: 'CO2',
  },
  co2GeneratorConfig: {
    noiseLevel: 0.00,
    startRounding: 0.5,
    exhaleRatio: 0.5,
  },
  co2GeneratorState: {
    currentStage: 'exhale-1',
    currentStageSamples: 0,
  },
  spo2GeneratorConfig: {
    noiseLevel: 0.00,
  },
  spo2GeneratorState: {
    currentStage: 'rise1',
    currentStageSamples: 0,
  },
  ekgGeneratorConfig: {
    noiseLevel: 0.00,
    permitBelow0: true,
  },
  leadIIGeneratorState: {
    currentStage: 'p',
    currentStageSamples: 0,
  },
};

export function stateReducer(state: MonitorState, action: MonitorAction): MonitorState {
  switch (action.type) {
    case 'SetSensor': {
      const {
        type: _, // eslint-disable-line @typescript-eslint/no-unused-vars
        sensor,
        state: sensorState,
      } = action;
      return {
        ...state,
        sensors: {
          ...state.sensors,
          [sensor]: sensorState,
        },
      };
    }
    case 'SetVital': {
      const {
        type: _, // eslint-disable-line @typescript-eslint/no-unused-vars
        vital,
        ...data
      } = action;
      return {
        ...state,
        [vital]: {
          ...state[vital],
          ...data,
        },
      };
    }
    case 'SetWaveform': {
      const {
        type: _, // eslint-disable-line @typescript-eslint/no-unused-vars
        index,
        ...data
      } = action;
      const newState = {
        ...state,
        [`waveform${index}`]: {
          ...state[`waveform${index}`],
          ...data,
        },
      };
      return setWaveformColors(newState);
    }
    case 'SetTick': {
      const {
        type: _,  // eslint-disable-line @typescript-eslint/no-unused-vars
        ...data
      } = action;
      const newState = {
        ...state,
        ...data,
      };
      return setWaveformColors(newState);
    }
    case 'SetWaveformGeneratorConfig': {
      const {
        type: _, // eslint-disable-line @typescript-eslint/no-unused-vars
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
    case 'SetWaveformGeneratorState': {
      const {
        type: _, // eslint-disable-line @typescript-eslint/no-unused-vars
        waveform,
        ...data
      } = action;
      return {
        ...state,
        [`${waveform}GeneratorState`]: {
          ...state[`${waveform}GeneratorState`],
          ...data,
        },
      };
    }
    default: {
      return {
        ...state
      };
    }
  }
}
