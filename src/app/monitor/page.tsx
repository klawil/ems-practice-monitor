"use client";

import { Container } from "react-bootstrap";
import { useEffect } from 'react';
import VitalBox, { VitalBoxPartialProps } from "@/components/vital-box/vital-box";
import styles from "./monitor.module.css";
import Waveform from "@/components/waveform/waveform";
import Clock from "@/components/clock/clock";
import { useReducer } from 'react';
import { defaultMonitorState, stateReducer } from "@/logic/monitor/reducer";
import { ActionDispatch } from "react";
import { VitalGenerator } from "@/logic/monitor/vitalGenerator";
import { CO2Generator, Spo2Generator } from "@/logic/monitor/waveformGenerator";
import { MonitorAction, MonitorState, vitalTypes, WaveformBoxNames, WaveformBoxTypes } from "@/types/monitor/reducer";

const waveformSamples = 30 * 5; // 30Hz for 5s
const noDataWaveformBlips = 30;
const blipWidth = waveformSamples / noDataWaveformBlips;
const tickDefaultValue = (tickNum: number) =>
  Math.floor((tickNum - Math.floor(blipWidth / 2)) / blipWidth) % 2 === 0
    ? null
    : 0;

const waveformSpeeds: {
  [key in WaveformBoxTypes]?: number;
} = {
  CO2: 0.5,
};
const waveformsToVitals: {
  [key in WaveformBoxTypes]?: typeof vitalTypes[number];
} = {
  SpO2: 'SpO2',
  CO2: 'CO2',
};

const vitalBoxConfigs: VitalBoxPartialProps[] = [
  {
    label: 'HR',
    vital1: 'HR',
  },
  {
    label: 'SpO2',
    vital1: 'SpO2',
    unit: '%',
  },
  {
    label: 'CO2',
    vital1: 'CO2',
    vital2: 'RR',
    unit: 'mmHg',
  },
  {
    label: 'BP',
    vital1: 'SBP',
    vital2: 'DBP',
    unit: 'mmHg',
  },
];

const tickTime = Math.round(1000 / 30); // 30Hz

const vitalGenerators: {
  [key in typeof vitalTypes[number]]: VitalGenerator;
} = {
  HR: new VitalGenerator(90),
  SpO2: new VitalGenerator(95),
  CO2: new VitalGenerator(40),
  RR: new VitalGenerator(16),
  SBP: new VitalGenerator(120),
  DBP: new VitalGenerator(80),
};

function updateWaveformsOrSetTimeout(
  state: MonitorState,
  dispatch: ActionDispatch<[action: MonitorAction]>,
) {
  function updateWaveforms() {
    const nowTime = Date.now();
    const lastTickNum = state.lastTick;
    const numTicks = state.lastTickTime > 0
      ? Math.round((nowTime - state.lastTickTime) / tickTime)
      : 1;

    for (let i = 0; i < 3; i++) {
      const waveformState = {
        ...state[`waveform${i}` as WaveformBoxNames]
      };
      const waveformData = [ ...waveformState.data ];
      const waveformSpeed = waveformSpeeds[waveformState.waveform] || 1;

      let generatorState = null;
      let nextValue: number | null = null;
      switch (waveformState.waveform) {
        case 'CO2':
          generatorState = state.co2GeneratorState;
          break;
        case 'SpO2':
          generatorState = state.spo2GeneratorState;
          break;
      }

      for (let t = 0; t < numTicks; t++) {
        let tickNum = (lastTickNum + numTicks) * waveformSpeed;
        if (tickNum !== Math.round(tickNum)) continue;
        if (tickNum >= waveformData.length) tickNum -= waveformData.length;
        if (tickNum >= waveformData.length) tickNum -= waveformData.length;
        if (tickNum >= waveformData.length) {
          console.error(`Bad tickNum (${waveformState.waveform}):`, tickNum, waveformData);
          continue;
        };

        // Check for real data generation
        let hasRealData = false;
        nextValue = null;
        if (
          waveformState.hasData &&
          generatorState !== null
        ) {
          switch (waveformState.waveform) {
            case 'CO2':
              [nextValue, generatorState] = CO2Generator.getNextValue(
                vitalGenerators.RR.get(),
                vitalGenerators.CO2.get(),
                state.co2GeneratorConfig,
                generatorState as MonitorState['co2GeneratorState'],
              );
              hasRealData = true;
              break;
            case 'SpO2':
              [nextValue, generatorState] = Spo2Generator.getNextValue(
                vitalGenerators.HR.get(),
                vitalGenerators.SpO2.get(),
                state.spo2GeneratorConfig,
                generatorState as MonitorState['spo2GeneratorState'],
              );
              hasRealData = true;
              break;
          }
        }
        if (!hasRealData) {
          nextValue = tickDefaultValue(tickNum);
        }
        waveformData[tickNum] = nextValue;
      }

      // Save the new generator state and vital waveform value (if applicable)
      if (generatorState !== null) {
        switch (waveformState.waveform) {
          case 'CO2':
            dispatch({
              type: 'SetWaveformGeneratorState',
              waveform: 'co2',
              ...generatorState,
            });
            break;
          case 'SpO2':
            dispatch({
              type: 'SetWaveformGeneratorState',
              waveform: 'spo2',
              ...generatorState,
            });
            break;
        }
      }

      // Null out the blip worth of ticks
      for (let t = 0; t < blipWidth / waveformSpeed; t += 1) {
        let tickNum = (lastTickNum + numTicks + t + 1) * waveformSpeed;
        if (tickNum !== Math.round(tickNum)) continue;
        if (tickNum >= waveformData.length) tickNum -= waveformData.length;
        if (tickNum >= waveformData.length) tickNum -= waveformData.length;

        waveformData[tickNum] = null;
      }

      // Set the data
      dispatch({
        type: 'SetWaveform',
        index: i as 0 | 1 | 2,
        data: waveformData,
      });
      const currentWaveformType = waveformState.waveform;
      if (typeof waveformsToVitals[currentWaveformType] !== 'undefined') {
        dispatch({
          type: 'SetVital',
          vital: waveformsToVitals[currentWaveformType],
          waveformVal: nextValue || 0,
        });
      }
    }

    let tickNum = state.lastTick + numTicks;
    if (tickNum >= 2 * waveformSamples) {
      tickNum -= (2 * waveformSamples);
    }

    dispatch({
      type: 'SetTick',
      lastTickTime: nowTime,
      lastTick: tickNum,
    });

    // Generate the data for the vitals
    vitalTypes.forEach(vital => {
      vitalGenerators[vital].increment(state[`${vital}GeneratorConfig`]);
      if (vitalGenerators[vital].get() !== state[vital].value) {
        dispatch({
          type: 'SetVital',
          vital,
          value: vitalGenerators[vital].get(),
        });
      }
    });
  }

  const nowTime = Date.now();
  if (nowTime - state.lastTickTime < tickTime) {
    const timeout = setTimeout(updateWaveforms, tickTime - nowTime + state.lastTickTime);
    return () => clearTimeout(timeout);
  } else {
    updateWaveforms();
  }
}

const numWaveforms = 3;

export default function Monitor() {
  const [state, dispatch] = useReducer(stateReducer, defaultMonitorState);

  useEffect(() => updateWaveformsOrSetTimeout(state, dispatch), [
    state,
  ]);

  const vitalBoxes = vitalBoxConfigs.map((config, i) => <VitalBox
    {...config}
    state={state}
    key={i}
  />);
  const waveforms = Array.from(Array(numWaveforms), (_, i) => <Waveform
    state={state[`waveform${i}` as WaveformBoxNames]}
    key={i}
  />);

  return (
    <Container
      fluid={true}
    >
      <div className={styles.monitor}>
        <div className={styles.monitorVitalSide}>
          {vitalBoxes}
        </div>
        <div className={styles.monitorWaveformSide}>
          <div className={styles.monitorTimeBar}><Clock /></div>
          {waveforms}
        </div>
      </div>
    </Container>
  )
}
