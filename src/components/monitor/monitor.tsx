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
import { chartWaveformConfig, CO2Generator, LeadIIGenerator, Spo2Generator } from "@/logic/monitor/waveformGenerator";
import { MonitorAction, MonitorState, waveformBoxNames } from "@/types/monitor/state";
import { useMessaging } from "@/logic/websocket";
import { ServerWebsocketMessage } from "@/types/websocket";
import { vitalTypes, VitalTypes, WaveformBoxTypes } from "@/types/state";

const waveformSamples = 30 * 5; // 30Hz for 5s
const noDataWaveformBlips = 30;
const blipWidth = waveformSamples / noDataWaveformBlips;
const tickDefaultValue = (tickNum: number, baseline: number = 0) =>
  Math.floor((tickNum - Math.floor(blipWidth / 2)) / blipWidth) % 2 === 0
    ? null
    : baseline;

const waveformsToVitals: {
  [key in WaveformBoxTypes]?: VitalTypes;
} = {
  SpO2: 'SpO2',
  CO2: 'CO2',
};
const vitalWaveformRestrctions: {
  [key in VitalTypes]?: 'co2GeneratorState' | 'spo2GeneratorState' | 'leadIIGeneratorState';
} = {
  CO2: 'co2GeneratorState',
  RR: 'co2GeneratorState',
  HR: 'spo2GeneratorState',
  SpO2: 'spo2GeneratorState',
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
  [key in VitalTypes]: VitalGenerator;
} = {
  HR: new VitalGenerator(),
  SpO2: new VitalGenerator(),
  CO2: new VitalGenerator(),
  RR: new VitalGenerator(),
  SBP: new VitalGenerator(),
  DBP: new VitalGenerator(),
};

function updateWaveformsOrSetTimeout(
  state: MonitorState,
  dispatch: ActionDispatch<[action: MonitorAction]>,
) {
  function updateWaveforms() {
    const nowTime = Date.now();
    const lastTickNum = state.lastTick;
    const numTicks = state.lastTickTime > 0 && Math.round((nowTime - state.lastTickTime) / tickTime) <= 30
      ? Math.round((nowTime - state.lastTickTime) / tickTime)
      : 1;

    // Generate the data for the vitals
    vitalTypes.forEach(vital => {
      // Don't change the vital if the waveform is not at baseline
      const waveformToCheck = vitalWaveformRestrctions[vital];
      if (
        waveformToCheck &&
        state[waveformToCheck].currentStage !== 'baseline'
      ) return;

      vitalGenerators[vital].increment(state[`${vital}GeneratorConfig`]);
      if (vitalGenerators[vital].get() !== state[vital].value) {
        dispatch({
          action: 'SetVital',
          vital,
          value: vitalGenerators[vital].get(),
        });
      }
    });

    for (let i = 0; i < 3; i++) {
      const waveformState = {
        ...state[`waveform${i}` as typeof waveformBoxNames[number]]
      };
      const waveformData = [ ...waveformState.data ];
      const waveformSpeedConfig = chartWaveformConfig[waveformState.waveform] || {};
      const waveformUpdatesPerTick = waveformSpeedConfig.updatesPerTick || 1;
      const waveformSamplesPerUpdate = waveformSpeedConfig.numSamplesMult;
      const maxWaveformTicks = 30 * 5;
      const maxWaveformSamples = waveformSamplesPerUpdate * maxWaveformTicks;

      // Expand the data if needed
      for (let v = waveformData.length; v < maxWaveformSamples; v++) {
        waveformData.push(null);
      }

      let generatorState = null;
      let nextValue: number | null = null;
      switch (waveformState.waveform) {
        case 'CO2':
          generatorState = state.co2GeneratorState;
          break;
        case 'SpO2':
          generatorState = state.spo2GeneratorState;
          break;
        case 'II':
          generatorState = state.leadIIGeneratorState;
          break;
      }

      for (let t = 0; t < numTicks; t++) {
        let tickNum = (lastTickNum + t) * waveformUpdatesPerTick;
        if (tickNum !== Math.round(tickNum)) continue;
        if (tickNum >= maxWaveformTicks) tickNum -= maxWaveformTicks;
        if (tickNum >= maxWaveformTicks) tickNum -= maxWaveformTicks;
        if (tickNum >= maxWaveformTicks) {
          console.error(`Bad tickNum (${waveformState.waveform}):`, tickNum, maxWaveformTicks);
          continue;
        };

        for (
          let dataIdx = tickNum * waveformSamplesPerUpdate;
          dataIdx < (tickNum + 1) * waveformSamplesPerUpdate;
          dataIdx++
        ) {
          // Check for real data generation
          nextValue = null;
          switch (waveformState.waveform) {
            case 'CO2':
              [nextValue, generatorState] = CO2Generator.getNextValue(
                vitalGenerators.RR.get(),
                vitalGenerators.CO2.get(),
                state.co2GeneratorConfig,
                generatorState as MonitorState['co2GeneratorState'],
              );
              break;
            case 'SpO2':
              [nextValue, generatorState] = Spo2Generator.getNextValue(
                vitalGenerators.HR.get(),
                vitalGenerators.SpO2.get(),
                state.spo2GeneratorConfig,
                generatorState as MonitorState['spo2GeneratorState'],
              );
              break;
            case 'II':
              [nextValue, generatorState] = LeadIIGenerator.getNextValue(
                vitalGenerators.HR.get(),
                40,
                state.ekgGeneratorConfig,
                generatorState as MonitorState['leadIIGeneratorState'],
              );
              break;
          }
          if (
            !waveformSpeedConfig.sensor.reduce((agg, sensor) => agg || state.sensors[sensor], false) ||
            nextValue === null
          ) {
            nextValue = tickDefaultValue(
              tickNum,
              Math.round((waveformSpeedConfig.chartMax + waveformSpeedConfig.chartMin) / 2)
            );
          }
          waveformData[dataIdx] = nextValue;
        }
      }

      // Save the new generator state and vital waveform value (if applicable)
      if (generatorState !== null) {
        switch (waveformState.waveform) {
          case 'CO2':
            dispatch({
              action: 'SetWaveformGeneratorState',
              waveform: 'co2',
              ...generatorState,
            });
            break;
          case 'SpO2':
            dispatch({
              action: 'SetWaveformGeneratorState',
              waveform: 'spo2',
              ...generatorState,
            });
            break;
          case 'II':
            dispatch({
              action: 'SetWaveformGeneratorState',
              waveform: 'leadII',
              ...generatorState,
            });
            break;
        }
      }

      // Null out the blip worth of ticks
      // Start at last dataIdx
      // End at dataIdx + blipWidth * samplesPerUpdate
      const blipStartIdx = Math.ceil((lastTickNum + numTicks) * waveformUpdatesPerTick) * waveformSamplesPerUpdate
      for (
        let dataIdx = blipStartIdx;
        dataIdx <= blipStartIdx + blipWidth * waveformSamplesPerUpdate;
        dataIdx++
      ) {
        let localIdx = dataIdx;
        if (localIdx >= maxWaveformSamples) localIdx -= maxWaveformSamples;
        if (localIdx >= maxWaveformSamples) localIdx -= maxWaveformSamples;

        waveformData[localIdx] = null;
      }

      // Set the data
      dispatch({
        action: 'SetWaveform',
        index: i as 0 | 1 | 2,
        data: waveformData,
      });
      const currentWaveformType = waveformState.waveform;
      if (typeof waveformsToVitals[currentWaveformType] !== 'undefined') {
        dispatch({
          action: 'SetVital',
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
      action: 'SetTick',
      lastTickTime: nowTime,
      lastTick: tickNum,
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

function generateMonitorId(): string {
  // No 0, O, I, or L
  const monitorIdChars = '123456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const monitorIdLen = 5;

  return Array.from(Array(monitorIdLen), () =>
    monitorIdChars[Math.floor(Math.random() * monitorIdChars.length)])
    .join('');
}

function parseMessage(
  message: ServerWebsocketMessage,
  dispatch: ActionDispatch<[action: MonitorAction]>,
) {
  console.log('Parsing message', message);
  switch (message.action) {
    case 'invalid':
    case 'invalid-id':
      dispatch({
        action: 'SetMonitorId',
        id: generateMonitorId(),
      });
      break;
    default:
      dispatch(message);
      break;
  }
}

export default function Monitor() {
  const [state, dispatch] = useReducer(stateReducer, defaultMonitorState);
  const [popMessage, sendMessage] = useMessaging(
    () => `ws://${window.location.host}/api`,
  );

  useEffect(() => {
    if (state.monitorId && !state.connected) {
      sendMessage({
        action: 'join',
        clientType: 'monitor',
        id: state.monitorId as string,
      });
    }
  }, [sendMessage, state.monitorId, state.connected]);

  useEffect(() => {
    const message = popMessage();
    if (typeof message !== 'undefined') {
      parseMessage(message, dispatch);
    }
  }, [popMessage]);

  useEffect(() => {
    if (state.connected) {
      updateWaveformsOrSetTimeout(state, dispatch);
    }
  }, [state]);

  if (typeof state.monitorId === 'undefined') {
    dispatch({
      action: 'SetMonitorId',
      id: generateMonitorId(),
    });
  }

  if (state.connected) {
    const vitalBoxes = vitalBoxConfigs.map((config, i) => <VitalBox
      {...config}
      state={state}
      key={i}
    />);
    const waveforms = Array.from(Array(numWaveforms), (_, i) => <Waveform
      state={state[`waveform${i}` as typeof waveformBoxNames[number]]}
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
            <div></div>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container
      fluid={true}
      className={`text-center ${styles.monitor} ${styles.monitorNoManager}`}
    >
      <h1>Connect a Manager</h1>
      <h2>Client ID: {state.monitorId || 'N/A'}</h2>
    </Container>
  )
}
