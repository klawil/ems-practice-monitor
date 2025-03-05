import { monitorSensors, MonitorState, WaveformBoxTypes, WaveformGeneratorConfig, WaveformGeneratorState } from "@/types/monitor/reducer";

type WaveformStageConfigs<
  PossibleStages extends string,
  Config extends WaveformGeneratorConfig,
> = {
  [key in PossibleStages]: {
    nextStage: PossibleStages;
    duration: (config: Config, totalTime: number) => number;
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
  private updateRate; // Update rate in Hz
  private samplesPerUpdate; // Update rate in Hz
  private stages: WaveformStageConfigs<PossibleStages, Config>;
  private firstStage: PossibleStages;

  constructor(
    stages: WaveformStageConfigs<PossibleStages, Config>,
    firstStage: PossibleStages,
    updatesPerTick: number,
    samplesPerUpdate: number,
  ) {
    this.stages = stages;
    this.firstStage = firstStage;
    this.updateRate = updatesPerTick * 30;
    this.samplesPerUpdate = samplesPerUpdate;
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

    // Increment the sample counter
    newState.currentStageSamples++;

    // Calculate the duration of the whole item
    const totalDuration = 60 / rate; // total duration in s
    const totalDurationSamples = Math.round(totalDuration * this.updateRate * this.samplesPerUpdate);

    // Build the array of time for each stage
    const stageTimings: [
      PossibleStages,
      number,
    ][] = [];
    let currentTimingStage = this.firstStage;
    let currentCumulativeTime = 0;
    while (
      currentCumulativeTime === 0 ||
      currentTimingStage !== this.firstStage
    ) {
      currentCumulativeTime += this.stages[currentTimingStage].duration(config, totalDuration);
      stageTimings.push([
        currentTimingStage,
        currentCumulativeTime,
      ]);
      currentTimingStage = this.stages[currentTimingStage].nextStage;
    }

    // Loop over the stages, look for the current stage
    let currentStageIdx: number | null = null;
    let currentStageStart: number = 0;
    let currentStageEnd: number = totalDurationSamples;

    // See if we want to loop back to the starting stage
    if (newState.currentStageSamples >= totalDurationSamples) {
      newState.currentStage = this.firstStage;
      newState.currentStageSamples = 0;
      currentStageStart = 0;
      currentStageEnd = Math.ceil(stageTimings[0][1] * totalDurationSamples);
    } else {
      // Figure out which stage we are currently in by finding the stage that is >= the current stage
      // and the end idx > the current idx
      for (let i = 0; i < stageTimings.length; i++) {
        if (
          currentStageIdx === null &&
          stageTimings[i][0] !== newState.currentStage
        ) {
          // If we are looking at a stage prior to the current stage
          currentStageStart = Math.floor(stageTimings[i][1] * totalDurationSamples);
        } else if (stageTimings[i][0] === newState.currentStage) {
          // The current stage in the state
          currentStageIdx = i;
          currentStageEnd = Math.ceil(stageTimings[i][1] * totalDurationSamples);
        } else if (
          currentStageIdx !== null &&
          newState.currentStageSamples >= currentStageEnd
        ) {
          // After the current stage in the state
          currentStageStart = Math.floor(stageTimings[i - 1][1] * totalDurationSamples);
          currentStageEnd = Math.ceil(stageTimings[i][1] * totalDurationSamples);
          newState.currentStage = stageTimings[i][0];
        }
      }
    }

    // Pull out the stage config for easier access
    const stageConfig = this.stages[newState.currentStage];
    const nextStageConfig = this.stages[this.stages[newState.currentStage].nextStage];

    // Get the start and end values
    const startValue = stageConfig.startValue(config, maxValue);
    const endValue = nextStageConfig.startValue(config, maxValue);
    const stageSampleIdx = newState.currentStageSamples - currentStageStart;
    const stageSampleCount = currentStageEnd - currentStageStart;

    // Calculate the ideal value
    let idealValue: number;
    if (typeof stageConfig.formula !== 'undefined') {
      idealValue = stageConfig.formula(
        config,
        startValue,
        endValue,
        stageSampleCount,
        stageSampleIdx,
      );
    } else {
      // Default is a line from start to end
      idealValue = startValue +
        (endValue - startValue) * stageSampleIdx / stageSampleCount;
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

export const chartWaveformConfig: {
  [key in WaveformBoxTypes]: {
    chartMin: number;
    chartMax: number;
    numSamplesMult: number;
    updatesPerTick: number;
    label: string;
    sensor: typeof monitorSensors[number];
  };
} = {
  SpO2: {
    chartMin: -20,
    chartMax: 130,
    numSamplesMult: 1,
    label: 'SpO2',
    updatesPerTick: 1,
    sensor: 'SpO2',
  },
  CO2: {
    chartMin: -5,
    chartMax: 70,
    numSamplesMult: 1,
    label: 'CO2',
    updatesPerTick: 0.5,
    sensor: 'ETCO2',
  },
  I: {
    chartMin: -50,
    chartMax: 50,
    numSamplesMult: 5,
    label: 'I x 1.0',
    updatesPerTick: 1,
    sensor: '3-lead',
  },
  II: {
    chartMin: -50,
    chartMax: 50,
    numSamplesMult: 5,
    label: 'II x 1.0',
    updatesPerTick: 1,
    sensor: '3-lead',
  },
  III: {
    chartMin: -50,
    chartMax: 50,
    numSamplesMult: 5,
    label: 'III x 1.0',
    updatesPerTick: 1,
    sensor: '3-lead',
  },
};

export const CO2Generator: WaveformGenerator<
  MonitorState['co2GeneratorState']['currentStage'],
  MonitorState['co2GeneratorConfig']
> = new WaveformGenerator(
  {
    baseline: {
      nextStage: 'exhale-1',
      duration: (config) => 1 - config.exhaleRatio,
      startValue: () => 0,
    },
    'exhale-1': {
      nextStage: 'exhale-2',
      duration: (config) => config.exhaleRatio * config.startRounding,
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
      duration: (config) => config.exhaleRatio
        * (1 - config.startRounding - co2EndDuration),
      startValue: (config, max) => max * (0.9 + 0.1 * config.startRounding),
    },
    'exhale-3': {
      nextStage: 'baseline',
      duration: (config) => config.exhaleRatio * co2EndDuration,
      startValue: (_, max) => max,
    },
  },
  'exhale-1',
  chartWaveformConfig.CO2.updatesPerTick,
  chartWaveformConfig.CO2.numSamplesMult,
);

export const Spo2Generator: WaveformGenerator<
  MonitorState['spo2GeneratorState']['currentStage'],
  MonitorState['spo2GeneratorConfig']
> = new WaveformGenerator(
  {
    rise1: {
      nextStage: 'fall1',
      duration: () => 0.1,
      startValue: () => 0,
    },
    fall1: {
      nextStage: 'rise2',
      duration: () =>  0.2,
      startValue: (_, max) => max,
    },
    rise2: {
      nextStage: 'fall2',
      duration: () => 0.1,
      startValue: (_, max) => max * 0.7,
    },
    fall2: {
      nextStage: 'baseline',
      duration: () => 0.5,
      startValue: (_, max) => max * 0.8,
    },
    baseline: {
      nextStage: 'rise1',
      duration: () => 0.1,
      startValue: () => 0,
    },
  },
  'rise1',
  chartWaveformConfig.SpO2.updatesPerTick,
  chartWaveformConfig.SpO2.numSamplesMult,
);

const leadIIPartDurations = 0.18 + 0.1 + 0.3;
export const LeadIIGenerator: WaveformGenerator<
  MonitorState['leadIIGeneratorState']['currentStage'],
  MonitorState['ekgGeneratorConfig']
> = new WaveformGenerator(
  {
    p: {
      nextStage: 'p2',
      duration: (_, total) => 0.18 / 3 / total,
      startValue: () => 0,
    },
    p2: {
      nextStage: 'pq',
      duration: (_, total) => 0.18 / 3 / total,
      startValue: (_, max) => max * 0.05,
    },
    pq: {
      nextStage: 'q',
      duration: (_, total) => 0.18 / 3 / total,
      startValue: () => 0,
    },
    q: {
      nextStage: 'r',
      duration: (_, total) => 0.1 * 1 / 10 / total,
      startValue: () => 0,
    },
    r: {
      nextStage: 's',
      duration: (_, total) => 0.1 * 4 / 10 / total,
      startValue: (_, max) => max * -0.15,
    },
    s: {
      nextStage: 's2',
      duration: (_, total) => 0.1 * 4 / 10 / total,
      startValue: (_, max) => max * 0.9,
    },
    s2: {
      nextStage: 'st',
      duration: (_, total) => 0.1 * 1 / 10 / total,
      startValue: (_, max) => max * -0.1,
    },
    st: {
      nextStage: 't',
      duration: (_, total) => 0.3 / 2 / total,
      startValue: () => 0,
    },
    t: {
      nextStage: 't2',
      duration: (_, total) => 0.3 / 4 / total,
      startValue: () => 0,
    },
    t2: {
      nextStage: 'baseline',
      duration: (_, total) => 0.3 / 4 / total,
      startValue: (_, max) => max * 0.1,
    },
    baseline: {
      nextStage: 'p',
      duration: (_, total) =>  (total - leadIIPartDurations) / total,
      startValue: () => 0,
    },
  },
  'p',
  chartWaveformConfig.II.updatesPerTick,
  chartWaveformConfig.II.numSamplesMult,
);
