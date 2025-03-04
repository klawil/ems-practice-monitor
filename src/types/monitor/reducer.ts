// Types for the individual vital boxes
export type VitalBoxTypes = 'HR' | 'SpO2' | 'CO2' | 'BP';
interface VitalState {
  value1: number;
  value2: number;
  waveformVal: number;
  hasWaveform: boolean;
}

// Types for the waveform box states
export type WaveformBoxTypes = 'SpO2' | 'CO2' | 'II' | 'I' | 'III';
export type WaveformBoxNames = 'waveform0' | 'waveform1' | 'waveform2';
interface WaveformBoxState {
  data: (number | null)[];
  waveform: WaveformBoxTypes;
  label: string;
  chartMax: number;
  chartMin: number;
  hasData: boolean;
}

export interface WaveformGeneratorConfig {
  noiseLevel: number;
  permitBelow0?: boolean;
}
export interface WaveformGeneratorState<PossibleStages extends string> {
  currentStage: PossibleStages;
  currentStageSamples: number;
  // lastValue: number;
}

// Types for each waveform generator
type Co2WaveformGeneratorStages = 'inhale' | 'exhale-1' | 'exhale-2' | 'exhale-3';
interface Co2WaveformGeneratorConfig extends WaveformGeneratorConfig {
  startRounding: number;
  exhaleRatio: number;
}
type Spo2WaveformGeneratorStages = 'rise1' | 'fall1' | 'rise2' | 'fall2';
interface Spo2WaveformGeneratorConfig extends WaveformGeneratorConfig {
  a?: null;
}
interface EkgWaveformGeneratorConfig extends WaveformGeneratorConfig {
  a?: null;
}
type LeadIIWaveformGeneratorStages = 'p1' | 'p2' | 'pq' | 'q' | 'r' | 's' | 'st' | 't1' | 't2'
  | 'baseline';

// Overall state for the monitor
export type MonitorState = {
  [key in VitalBoxTypes]: VitalState;
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
  vital: VitalBoxTypes;
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
