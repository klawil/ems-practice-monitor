import { ManagerState, ManagerAction } from "@/types/manager/state";
import { defaultReducer, defaultState } from "../reducer";
import { vitalTypes } from "@/types/state";

export const defaultManagerState: ManagerState = {
  ...defaultState,
  monitorIdInput: '',

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
    case 'ClearInstantChanges': {
      const newState = {
        ...state,
      };
      vitalTypes.map(vital => {
        newState[`${vital}GeneratorConfig`] = {
          ...state[`${vital}GeneratorConfig`],
          instant: false,
        };
      });
      return newState;
    }
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
    case 'DisconnectMonitor': {
      return {
        ...defaultManagerState,
      };
    }
    case 'SetMonitorIdInput': {
      return {
        ...state,
        monitorIdInput: action.id,
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
