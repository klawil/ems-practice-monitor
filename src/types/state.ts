// Sensors that can be connected
export const monitorSensors = [
  'SpO2',
  'ETCO2',
  '3-lead',
  '12-lead',
  'BP',
] as const;
export type SensorTypes = typeof monitorSensors[number];

// Types for the individual vital boxes
export const vitalTypes = [
  'HR',
  'SpO2',
  'CO2',
  'RR',
  'SBP',
  'DBP',
] as const;
export type VitalTypes = typeof vitalTypes[number];

// Types for the waveform box states
export type WaveformBoxTypes = 'SpO2' | 'CO2' | 'II' | 'I' | 'III';
export const waveformConfigTypes = [ 'co2' , 'spo2', 'ekg' ] as const;
export type WaveformConfigTypes = typeof waveformConfigTypes[number];

export interface VitalGeneratorConfig {
  targetValue: number;
  targetRange: number;
  maxUpdateFreq: number;
  maxChangePerS: number;
  instant?: boolean;
  absoluteMax?: number;
}

export interface WaveformGeneratorConfig {
  noiseLevel: number;
  permitBelow0?: boolean;
}

// Types for each waveform generator
export interface Co2WaveformGeneratorConfig extends WaveformGeneratorConfig {
  startRounding: number;
  exhaleRatio: number;
}
export interface Spo2WaveformGeneratorConfig extends WaveformGeneratorConfig {
  a?: null;
}
export interface EkgWaveformGeneratorConfig extends WaveformGeneratorConfig {
  a?: null;
}

export type SharedState = {
  [key in `${VitalTypes}GeneratorConfig`]: VitalGeneratorConfig;
} & {
  monitorId?: string;
  connected: boolean;

  sensors: {
    [key in SensorTypes]: boolean;
  };

  co2GeneratorConfig: Co2WaveformGeneratorConfig;
  spo2GeneratorConfig: Spo2WaveformGeneratorConfig;
  ekgGeneratorConfig: EkgWaveformGeneratorConfig;
}

export function getSharedState(state: SharedState): Omit<SharedState, 'connected'> {
  return {
    sensors: { ...state.sensors, },
    co2GeneratorConfig: { ...state.co2GeneratorConfig, },
    spo2GeneratorConfig: { ...state.spo2GeneratorConfig, },
    ekgGeneratorConfig: { ...state.ekgGeneratorConfig, },

    SpO2GeneratorConfig: { ...state.SpO2GeneratorConfig, },
    HRGeneratorConfig: { ...state.HRGeneratorConfig, },
    CO2GeneratorConfig: { ...state.CO2GeneratorConfig, },
    RRGeneratorConfig: { ...state.RRGeneratorConfig, },
    SBPGeneratorConfig: { ...state.SBPGeneratorConfig, },
    DBPGeneratorConfig: { ...state.DBPGeneratorConfig, },
  };
}

// Actions that can be shared via the server
interface SetMonitorIdAction {
  action: 'SetMonitorId';
  id?: string;
}
interface SetConnectedAction {
  action: 'SetConnected';
  state: boolean;
}
interface SyncStateAction extends Omit<SharedState, 'connected'> {
  action: 'SyncState';
}
export type SetSensorAction = {
  action: 'SetSensor';
} & {
  [key in SensorTypes]?: boolean;
};
export interface SetWaveformGeneratorConfigAction extends Partial<
  SharedState['co2GeneratorConfig'] & SharedState['spo2GeneratorConfig'] & SharedState['ekgGeneratorConfig']
> {
  action: 'SetWaveformGeneratorConfig';
  waveform: WaveformConfigTypes;
}
export interface SetVitalGeneratorConfigAction extends Partial<VitalGeneratorConfig> {
  action: 'SetVitalGeneratorConfig';
  vital: VitalTypes;
}
export type ServerMonitorActions = SetMonitorIdAction | SetConnectedAction | SetSensorAction
  | SetWaveformGeneratorConfigAction | SetVitalGeneratorConfigAction | SyncStateAction;
