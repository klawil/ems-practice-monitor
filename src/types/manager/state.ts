import { Co2WaveformGeneratorConfig, EkgWaveformGeneratorConfig, SensorTypes, ServerMonitorActions, SetVitalGeneratorConfigAction, SetWaveformGeneratorConfigAction, SharedState, Spo2WaveformGeneratorConfig, VitalGeneratorConfig, VitalTypes } from "../state";

interface SetSensorStagedAction {
  action: 'SetSensorStaged';
  sensor: SensorTypes;
  state?: boolean;
}
interface SetWaveformGeneratorConfigStagedAction extends Omit<SetWaveformGeneratorConfigAction, 'action'> {
  action: 'SetWaveformGeneratorConfigStaged';
}
interface SetVitalGeneratorConfigStagedAction extends Omit<SetVitalGeneratorConfigAction, 'action'> {
  action: 'SetVitalGeneratorConfigStaged';
}
interface ClearSensorStagedAction {
  action: 'ClearSensorStaged';
}
interface ClearWaveformGeneratorConfigStagedAction {
  action: 'ClearWaveformGeneratorConfigStaged';
  waveform: SetWaveformGeneratorConfigAction['waveform'];
}
interface ClearVitalGeneratorConfigStagedAction {
  action: 'ClearVitalGeneratorConfigStaged';
  vital: VitalTypes;
}

export type ManagerAction = ServerMonitorActions | SetSensorStagedAction
  | SetWaveformGeneratorConfigStagedAction | SetVitalGeneratorConfigStagedAction
  | ClearSensorStagedAction | ClearWaveformGeneratorConfigStagedAction
  | ClearVitalGeneratorConfigStagedAction;

export type ManagerState = SharedState & {
  [key in `${VitalTypes}GeneratorConfigStaged`]: Partial<VitalGeneratorConfig>;
} & {
  sensorsStaged: {
    [key in SensorTypes]?: boolean;
  }

  co2GeneratorConfigStaged: Partial<Co2WaveformGeneratorConfig>;
  spo2GeneratorConfigStaged: Partial<Spo2WaveformGeneratorConfig>;
  ekgGeneratorConfigStaged: Partial<EkgWaveformGeneratorConfig>;
}
