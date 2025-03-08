import { ManagerState, ManagerAction } from "@/types/manager/state";
import { defaultReducer, defaultState } from "../reducer";

export const defaultManagerState: ManagerState = {
  ...defaultState,

  sensorsStaged: {},

  HRGeneratorConfigStaged: {},
  SpO2GeneratorConfigStaged: {},
  RRGeneratorConfigStaged: {},
  CO2GeneratorConfigStaged: {},
  SBPGeneratorConfigStaged: {},
  DBPGeneratorConfigStaged: {},

  co2GeneratorConfigStaged: {},
  spo2GeneratorConfigStaged: {},
  ekgGeneratorConfigStaged: {},
};

export function stateReducer(state: ManagerState, action: ManagerAction): ManagerState {
  switch (action.action) {
    case 'ClearSensorStaged':
      return {
        ...state,
        sensorsStaged: {},
      };
    case 'ClearWaveformGeneratorConfigStaged':
      return {
        ...state,
        [`${action.waveform}GeneratorConfigStaged`]: {},
      };
    case 'ClearVitalGeneratorConfigStaged':
      return {
        ...state,
        [`${action.vital}GeneratorConfigStaged`]: {},
      };
    case 'SetSensorStaged':
      return {
        ...state,
        sensorsStaged: {
          ...state.sensorsStaged,
          [action.sensor]: action.state,
        },
      };
    case 'SetVitalGeneratorConfigStaged': {
      const {
        action: _,
        vital,
        ...data
      } = action;
      return {
        ...state,
        [`${vital}GeneratorConfigStaged`]: {
          ...state[`${vital}GeneratorConfigStaged`],
          ...data,
        },
      };
    }
    case 'SetWaveformGeneratorConfigStaged': {
      const {
        action: _,
        waveform,
        ...data
      } = action;
      return {
        ...state,
        [`${waveform}GeneratorConfigStaged`]: {
          ...state[`${waveform}GeneratorConfigStaged`],
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
