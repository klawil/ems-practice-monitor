"use client";

import { Container } from "react-bootstrap";
import { useEffect } from 'react';
import VitalBox from "@/components/vital-box/vital-box";
import styles from "./monitor.module.css";
import Waveform from "@/components/waveform/waveform";
import Clock from "@/components/clock/clock";
import { useReducer } from 'react';
import { defaultMonitorState, stateReducer } from "@/logic/monitor/reducer";
import { ActionDispatch } from "react";
import { VitalGenerator } from "@/logic/monitor/vitalGenerator";
import { CO2Generator, Spo2Generator } from "@/logic/monitor/waveformGenerator";
import { MonitorAction, MonitorState, VitalBoxTypes, WaveformBoxNames, WaveformBoxTypes } from "@/types/monitor/reducer";

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
  [key in WaveformBoxTypes]?: VitalBoxTypes;
} = {
  SpO2: 'SpO2',
  CO2: 'CO2',
};

const vitalBoxesToShow: VitalBoxTypes[] = [
  'HR',
  'SpO2',
  'CO2',
  'BP',
];

const tickTime = Math.round(1000 / 30); // 30Hz

const vitalGenerators: {
  [key in VitalBoxTypes]: {
    value1: VitalGenerator;
    value2?: VitalGenerator;
  }
} = {
  HR: {
    value1: new VitalGenerator(
      90,
      5,
      5,
      5,
    ),
  },
  SpO2: {
    value1: new VitalGenerator(
      95,
      3,
      5,
      1,
    ),
  },
  CO2: {
    value1: new VitalGenerator(
      40,
      3,
      5,
      2,
    ),
    value2: new VitalGenerator(
      16,
      3,
      5,
      2,
    ),
  },
  BP: {
    value1: new VitalGenerator(
      120,
      5,
      60,
      10,
    ),
    value2: new VitalGenerator(
      80,
      5,
      60,
      10,
    ),
  },
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
                vitalGenerators.CO2.value2?.get() || 100,
                vitalGenerators.CO2.value1.get(),
                state.co2GeneratorConfig,
                generatorState as MonitorState['co2GeneratorState'],
              );
              hasRealData = true;
              break;
            case 'SpO2':
              [nextValue, generatorState] = Spo2Generator.getNextValue(
                vitalGenerators.HR.value1.get(),
                vitalGenerators.SpO2.value1.get(),
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
    vitalBoxesToShow.forEach(vital => {
      const newState = {
        ...state[vital],
      };
      let wasChange = false;
      (Object.keys(vitalGenerators[vital]) as ('value1' | 'value2')[])
        .forEach(key => {
          vitalGenerators[vital][key]?.increment();
          newState[key] = vitalGenerators[vital][key]?.get() || newState[key];
          if (newState[key] !== state[vital][key]) {
            wasChange = true;
          }
        });
      if (wasChange) {
        dispatch({
          type: 'SetVital',
          vital,
          ...newState,
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

  const vitalBoxes = vitalBoxesToShow.map((type) => <VitalBox
    type={type}
    state={state[type]}
    key={type}
  />);
  const waveforms = Array.from(Array(numWaveforms), (_, i) => <Waveform
    state={state[`waveform${i}` as WaveformBoxNames]}
    key={i}
  />);

  return (
    <Container>
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
