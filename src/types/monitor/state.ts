import { ServerMonitorActions, SharedState, VitalTypes, WaveformBoxTypes } from "../state";

interface VitalState {
  value: number;
  waveformVal: number;
}

export const waveformBoxNames = ['waveform0', 'waveform1', 'waveform2'] as const;
interface WaveformBoxState {
  data: (number | null)[];
  waveform: WaveformBoxTypes;
}

// Waveform stages
type Co2WaveformGeneratorStages = 'baseline' | 'exhale-1' | 'exhale-2' | 'exhale-3';
type Spo2WaveformGeneratorStages = 'rise1' | 'fall1' | 'rise2' | 'fall2' | 'baseline';
type LeadIIWaveformGeneratorStages = 'p' | 'p2' | 'pq' | 'q' | 'r' | 's' | 's2' | 'st' | 't' | 't2'
  | 'baseline';
export interface WaveformGeneratorState<PossibleStages extends string> {
  currentStage: PossibleStages;
  currentStageSamples: number;
};

// Overall state for the monitor
export type MonitorState = SharedState & {
  [key in VitalTypes]: VitalState;
} & {
  [key in typeof waveformBoxNames[number]]: WaveformBoxState;
} & {
  lastTick: number;
  lastTickTime: number;

  co2GeneratorState: WaveformGeneratorState<Co2WaveformGeneratorStages>;
  spo2GeneratorState: WaveformGeneratorState<Spo2WaveformGeneratorStages>;
  leadIIGeneratorState: WaveformGeneratorState<LeadIIWaveformGeneratorStages>;
}

/** Actions that should come from server communications **/

/** Actions that should come from the monitor UI **/
interface SetMonitorIdAction {
  action: 'SetMonitorId';
  id: string;
}
interface SetVitalAction extends Partial<VitalState> {
  action: 'SetVital';
  vital: VitalTypes;
}
interface SetWaveformAction extends Partial<WaveformBoxState> {
  action: 'SetWaveform';
  index: 0 | 1 | 2;
}
interface SetTickAction {
  action: 'SetTick';
  lastTick?: number;
  lastTickTime?: number;
}
interface SetWaveformGeneratorStateAction<PossibleStages extends string>
  extends Partial<WaveformGeneratorState<PossibleStages>> {
  action: 'SetWaveformGeneratorState';
  waveform: 'co2' | 'spo2' | 'leadII';
}

export type MonitorAction = SetVitalAction | SetWaveformAction | SetTickAction
  | SetWaveformGeneratorStateAction<Co2WaveformGeneratorStages>
  | SetWaveformGeneratorStateAction<Spo2WaveformGeneratorStages>
  | SetWaveformGeneratorStateAction<LeadIIWaveformGeneratorStages>
  | SetMonitorIdAction
  | ServerMonitorActions;
