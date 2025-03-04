"use client";

import styles from "./waveform.module.css";
import { Line } from 'react-chartjs-2';
import { LinearScale, Chart, CategoryScale, PointElement, LineElement } from "chart.js";
import { MonitorState } from "@/types/monitor/reducer";

Chart.register(LinearScale, CategoryScale, PointElement, LineElement);

interface WaveformTypeProps {
  state: MonitorState['waveform0'];
}

const waveformWidth = 515;

export default function Waveform({
  state,
}: WaveformTypeProps) {
  const color = typeof window !== 'undefined'
    ? getComputedStyle(document.documentElement)
      .getPropertyValue(`--monitor-${state.waveform.toLowerCase()}-waveform-color`)
    : 'red';
  return (
    <div className={styles.waveform}>
      <Line
        updateMode="none"
        width={waveformWidth}
        height={153}
        data={{
          labels: state.data.map((_, i) => i),
          datasets: [
            {
              label: `${state.waveform}`,
              data: state.data,
            },
          ],
        }}
        options={{
          responsive: false,
          maintainAspectRatio: false,
          backgroundColor: 'rgba(0,0,0,0)',
          borderColor: 'rgba(0,0,0,0)',
          scales: {
            y: {
              display: false,
              min: state.chartMin,
              max: state.chartMax,
            },
            x: {
              display: false,
              min: 0,
              max: 30 * 5,
            },
          },
          elements:{
            point: {
              pointStyle: false,
            },
            line: {
              borderColor: color,
              borderWidth: 1.5,
            }
          },
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              enabled: false,
            }
          },
        }}
      />
      <span className={`${styles[`waveformLabel${state.waveform}`]} ${styles.waveformLabel}`}>{state.label}</span>
    </div>
  );
}
