import { MonitorAction, MonitorState, VitalBoxTypes, WaveformBoxNames, WaveformBoxTypes } from "@/types/monitor/reducer";

const waveformSamples = 150; // 5s at 30Hz or 10s at 15Hz

const vitalTypeToWaveform: {
  [key in VitalBoxTypes]: WaveformBoxTypes[];
} = {
  HR: [ 'I', 'II', 'III', 'SpO2' ],
  SpO2: [ 'SpO2' ],
  CO2: [ 'CO2' ],
  BP: [],
};

function setWaveformColors(newState: MonitorState): MonitorState {
  const waveformTypes = Array.from(Array(3), (_, i) =>
    newState[`waveform${i}` as WaveformBoxNames].waveform);
  (Object.keys(vitalTypeToWaveform) as VitalBoxTypes[])
    .forEach(vital => {
      const hasWaveform = waveformTypes
        .reduce((prev, waveform) => {
          if (prev) return prev;

          return vitalTypeToWaveform[vital].includes(waveform);
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
  lastTick: 0,
  lastTickTime: 0,
  HR: {
    value1: 100,
    value2: 0,
    waveformVal: 0,
    hasWaveform: true,
  },
  SpO2: {
    value1: 95,
    value2: 0,
    waveformVal: 0,
    hasWaveform: true,
  },
  CO2: {
    value1: 35,
    value2: 14,
    waveformVal: 0,
    hasWaveform: true,
  },
  BP: {
    value1: 150,
    value2: 100,
    waveformVal: 0,
    hasWaveform: false,
  },
  waveform0: {
    data: Array.from(Array(waveformSamples), () => null),
    waveform: 'II',
    label: 'II x 1.0',
    chartMin: -50,
    chartMax: 50,
    hasData: false,
  },
  waveform1: {
    data: Array.from(Array(waveformSamples), () => null),
    waveform: 'SpO2',
    label: 'SpO2',
    chartMin: -20,
    chartMax: 130,
    hasData: true,
  },
  waveform2: {
    data: Array.from(Array(waveformSamples), () => null),
    waveform: 'CO2',
    label: 'CO2',
    chartMin: -5,
    chartMax: 70,
    hasData: true,
  },
  co2GeneratorConfig: {
    noiseLevel: 0.05,
    startRounding: 0.5,
    exhaleRatio: 0.5,
  },
  co2GeneratorState: {
    currentStage: 'inhale',
    currentStageSamples: 0,
    // lastValue: 0,
  },
  spo2GeneratorConfig: {
    noiseLevel: 0.05,
  },
  spo2GeneratorState: {
    currentStage: 'rise1',
    currentStageSamples: 0,
    // lastValue: 0,
  },
  ekgGeneratorConfig: {
    noiseLevel: 0.00,
    permitBelow0: true,
  },
  leadIIGeneratorState: {
    currentStage: 'baseline',
    currentStageSamples: 0,
  }
};

export function stateReducer(state: MonitorState, action: MonitorAction): MonitorState {
  switch (action.type) {
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
