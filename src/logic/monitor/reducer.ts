import { MonitorAction, MonitorState } from "@/types/monitor/state";
import { defaultReducer, defaultState } from "../reducer";

const waveformSamples = 150; // 5s at 30Hz or 10s at 15Hz

export const defaultMonitorState: MonitorState = {
  ...defaultState,
  lastTick: 0,
  lastTickTime: 0,
  HR: {
    value: 100,
    waveformVal: 0,
  },
  SpO2: {
    value: 95,
    waveformVal: 0,
  },
  RR: {
    value: 18,
    waveformVal: 0,
  },
  CO2: {
    value: 35,
    waveformVal: 0,
  },
  SBP: {
    value: 150,
    waveformVal: 0,
  },
  DBP: {
    value: 100,
    waveformVal: 0,
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
  co2GeneratorState: {
    currentStage: 'exhale-1',
    currentStageSamples: 0,
  },
  spo2GeneratorState: {
    currentStage: 'rise1',
    currentStageSamples: 0,
  },
  leadIIGeneratorState: {
    currentStage: 'p',
    currentStageSamples: 0,
  },
};

export function stateReducer(state: MonitorState, action: MonitorAction): MonitorState {
  switch (action.action) {
    case 'SetMonitorId': {
      return {
        ...state,
        monitorId: action.id,
      };
    }

    case 'SetVital': {
      const {
        action: _,
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
        action: _,
        index,
        ...data
      } = action;
      return {
        ...state,
        [`waveform${index}`]: {
          ...state[`waveform${index}`],
          ...data,
        },
      };
    }
    case 'SetTick': {
      const {
        action: _,
        ...data
      } = action;
      return {
        ...state,
        ...data,
      };
    }
    case 'SetWaveformGeneratorState': {
      const {
        action: _,
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
        ...state,
        ...defaultReducer(state, action),
      };
    }
  }
}
