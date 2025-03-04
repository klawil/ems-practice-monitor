import { MonitorState, WaveformGeneratorConfig, WaveformGeneratorState } from "@/types/monitor/reducer";

type WaveformStageConfigs<
  PossibleStages extends string,
  Config extends WaveformGeneratorConfig,
> = {
  [key in PossibleStages]: {
    nextStage: PossibleStages;
    duration: (config: Config, totalDuration: number) => number;
    startValue: (config: Config, maxValue: number) => number;
    formula?: (
      config: Config,
      startValue: number,
      endValue: number,
      numSamples: number,
      currentSample: number,
    ) => number;
  };
}

class WaveformGenerator<
  PossibleStages extends string,
  Config extends WaveformGeneratorConfig
> {
  private updateRate = 30; // Update rate in Hz
  private stages: WaveformStageConfigs<PossibleStages, Config>;

  constructor(
    stages: WaveformStageConfigs<PossibleStages, Config>,
    updateRate: number | null = null,
  ) {
    this.stages = stages;
    if (updateRate !== null) {
      this.updateRate = updateRate;
    }
  }

  getNextValue(
    rate: number,
    maxValue: number,
    config: Config,
    state: WaveformGeneratorState<PossibleStages>,
  ): [number, WaveformGeneratorState<PossibleStages>] {
    const newState = { ...state };
    if (typeof this.stages[newState.currentStage] === 'undefined') {
      throw new Error(`Invalid stage: ${newState.currentStage}`);
    }

    // Check to see if we are done with the current stage
    const totalDuration = 60 / rate; // total duration in s
    let currentStageDuration = this.stages[newState.currentStage].duration(config, totalDuration);
    let currentStageDurationSamples = Math.round(currentStageDuration * this.updateRate);
    if (newState.currentStageSamples >= currentStageDurationSamples) {
      newState.currentStage = this.stages[newState.currentStage].nextStage;
      newState.currentStageSamples = 0;
      currentStageDuration = this.stages[newState.currentStage].duration(config, totalDuration);
      currentStageDurationSamples = Math.round(currentStageDuration * this.updateRate);
    } else {
      newState.currentStageSamples++;
    }
    
    // Pull out the stage config for easier access
    const stageConfig = this.stages[newState.currentStage];
    const nextStageConfig = this.stages[this.stages[newState.currentStage].nextStage];

    // Get the start and end values
    const startValue = stageConfig.startValue(config, maxValue);
    const endValue = nextStageConfig.startValue(config, maxValue);

    // Calculate the ideal value
    let idealValue: number;
    if (typeof stageConfig.formula !== 'undefined') {
      idealValue = stageConfig.formula(
        config,
        startValue,
        endValue,
        currentStageDurationSamples,
        newState.currentStageSamples,
      );
    } else {
      // Default is a line from start to end
      idealValue = startValue +
        (endValue - startValue) * newState.currentStageSamples / currentStageDurationSamples;
    }

    // Introduce the noise
    const maxNoise = config.noiseLevel * maxValue;
    const noise = Math.random() * maxNoise * 2 - maxNoise;
    let newValue = idealValue + noise;
    if (
      newValue < 0 &&
      !config.permitBelow0
    ) newValue = 0;

    return [
      newValue,
      newState
    ];
  }
}

const co2EndDuration = 0.1; // Percent of the exhale that is to get the value back to baseline

export const CO2Generator: WaveformGenerator<
  MonitorState['co2GeneratorState']['currentStage'],
  MonitorState['co2GeneratorConfig']
> = new WaveformGenerator(
  {
    inhale: {
      nextStage: 'exhale-1',
      duration: (config, total) => total * (1 - config.exhaleRatio),
      startValue: () => 0,
    },
    'exhale-1': {
      nextStage: 'exhale-2',
      duration: (config, total) => config.exhaleRatio * total * config.startRounding,
      startValue: () => 0,
      formula: ( // @TODO - allow start value to be not 0
        config,
        startValue,
        endValue,
        numSamples,
        currentSample,
      ) => {
        const alpha = -1 * endValue / Math.pow(numSamples, 2);
        const idealValue = alpha * Math.pow(numSamples - currentSample, 2)
          + endValue;
        if (idealValue > endValue) return endValue;
        return idealValue;
      },
    },
    'exhale-2': {
      nextStage: 'exhale-3',
      duration: (config, total) => total * config.exhaleRatio
        * (1 - config.startRounding - co2EndDuration),
      startValue: (config, max) => max * (0.9 + 0.1 * config.startRounding),
    },
    'exhale-3': {
      nextStage: 'inhale',
      duration: (config, total) => total * config.exhaleRatio * co2EndDuration,
      startValue: (_, max) => max,
    },
  },
  15,
);

export const Spo2Generator: WaveformGenerator<
  MonitorState['spo2GeneratorState']['currentStage'],
  MonitorState['spo2GeneratorConfig']
> = new WaveformGenerator(
  {
    rise1: {
      nextStage: 'fall1',
      duration: (_, total) => total * 0.1,
      startValue: () => 0,
    },
    fall1: {
      nextStage: 'rise2',
      duration: (_, total) => total * 0.2,
      startValue: (_, max) => max,
    },
    rise2: {
      nextStage: 'fall2',
      duration: (_, total) => total * 0.1,
      startValue: (_, max) => max * 0.7,
    },
    fall2: {
      nextStage: 'rise1',
      duration: (_, total) => total * 0.6,
      startValue: (_, max) => max * 0.8,
    },
  },
);
