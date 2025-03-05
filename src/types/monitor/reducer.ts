// Types for the individual vital boxes
export const vitalTypes = [
  'HR',
  'SpO2',
  'CO2',
  'RR',
  'SBP',
  'DBP',
] as const;
interface VitalState {
  value: number;
  waveformVal: number;
  hasWaveform: boolean;
  hasData: boolean;
}

// Types for the waveform box states
export type WaveformBoxTypes = 'SpO2' | 'CO2' | 'II' | 'I' | 'III';
export type WaveformBoxNames = 'waveform0' | 'waveform1' | 'waveform2';
interface WaveformBoxState {
  data: (number | null)[];
  waveform: WaveformBoxTypes;
  hasData: boolean;
}

export interface VitalGeneratorConfig {
  targetValue: number;
  targetRange: number;
  maxUpdateFreq: number;
  maxChangePerS: number;
}

export interface WaveformGeneratorConfig {
  noiseLevel: number;
  permitBelow0?: boolean;
}
export interface WaveformGeneratorState<PossibleStages extends string> {
  currentStage: PossibleStages;
  currentStageSamples: number;
}

// Types for each waveform generator
type Co2WaveformGeneratorStages = 'baseline' | 'exhale-1' | 'exhale-2' | 'exhale-3';
interface Co2WaveformGeneratorConfig extends WaveformGeneratorConfig {
  startRounding: number;
  exhaleRatio: number;
}
type Spo2WaveformGeneratorStages = 'rise1' | 'fall1' | 'rise2' | 'fall2' | 'baseline';
interface Spo2WaveformGeneratorConfig extends WaveformGeneratorConfig {
  a?: null;
}
interface EkgWaveformGeneratorConfig extends WaveformGeneratorConfig {
  a?: null;
}
type LeadIIWaveformGeneratorStages = 'p' | 'p2' | 'pq' | 'q' | 'r' | 's' | 's2' | 'st' | 't' | 't2'
  | 'baseline';

// Overall state for the monitor
export type MonitorState = {
  [key in typeof vitalTypes[number]]: VitalState;
} & {
  [key in `${typeof vitalTypes[number]}GeneratorConfig`]: VitalGeneratorConfig;
} & {
  [key in WaveformBoxNames]: WaveformBoxState;
} & {
  lastTick: number;
  lastTickTime: number;

  co2GeneratorConfig: Co2WaveformGeneratorConfig;
  co2GeneratorState: WaveformGeneratorState<Co2WaveformGeneratorStages>;

  spo2GeneratorConfig: Spo2WaveformGeneratorConfig;
  spo2GeneratorState: WaveformGeneratorState<Spo2WaveformGeneratorStages>;

  ekgGeneratorConfig: EkgWaveformGeneratorConfig;
  leadIIGeneratorState: WaveformGeneratorState<LeadIIWaveformGeneratorStages>;
}

// Actions for the reducer
interface SetVitalAction extends Partial<VitalState> {
  type: 'SetVital';
  vital: typeof vitalTypes[number];
}
interface SetWaveformAction extends Partial<WaveformBoxState> {
  type: 'SetWaveform';
  index: 0 | 1 | 2;
}
interface SetTickAction {
  type: 'SetTick';
  lastTick?: number;
  lastTickTime?: number;
}
interface SetWaveformGeneratorStateAction<PossibleStages extends string>
  extends Partial<WaveformGeneratorState<PossibleStages>> {
  type: 'SetWaveformGeneratorState';
  waveform: 'co2' | 'spo2' | 'leadII';
}
interface SetWaveformGeneratorConfigAction extends Partial<
  Co2WaveformGeneratorConfig & Spo2WaveformGeneratorConfig & EkgWaveformGeneratorConfig
> {
  type: 'SetWaveformGeneratorConfig';
  waveform: 'co2' | 'spo2' | 'ekg';
}

export type MonitorAction = SetVitalAction | SetWaveformAction | SetTickAction
  | SetWaveformGeneratorStateAction<Co2WaveformGeneratorStages>
  | SetWaveformGeneratorStateAction<Spo2WaveformGeneratorStages>
  | SetWaveformGeneratorStateAction<LeadIIWaveformGeneratorStages>
  | SetWaveformGeneratorConfigAction;
