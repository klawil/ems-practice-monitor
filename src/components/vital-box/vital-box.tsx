import { MonitorState, vitalTypes } from "@/types/monitor/reducer";
import styles from "./vital-box.module.css";

type VitalBoxTypes = 'HR' | 'SpO2' | 'CO2' | 'BP';

export interface VitalBoxPartialProps {
  label: VitalBoxTypes;
  unit?: string;

  vital1: typeof vitalTypes[number];
  vital2?: typeof vitalTypes[number];
}

interface VitalBoxProps extends VitalBoxPartialProps {
  state: MonitorState;
}

export default function VitalBox({
  label,
  unit,
  vital1,
  vital2,
  state,
}: VitalBoxProps) {
  const colorClassName = state[vital1].hasWaveform ? styles[`monitorVitalBox${label}`] : '';
  const vital1Val: number = Math.round(state[vital1].value);
  const vital2Val: number | null = vital2
    ? Math.round(state[vital2].value)
    : null;
  const vital3Val: number | null = vital2 && vital2 === 'DBP' && vital2Val !== null
    ? Math.round((2 * vital2Val + vital1Val) / 3)
    : null;
  const vital1WaveformVal: number = state[vital1].waveformVal;

  return (
    <div className={styles.monitorVitalBox}>
      <div className={`${styles.monitorVitalBoxTitle} ${colorClassName}`}>
        <span>{label}</span>
        {unit && <span className={styles.monitorVitalBoxUnit}>{unit}</span>}
      </div>
      <div className={`${styles.monitorVitalBoxVital} ${colorClassName}`}>
        <div className={styles.monitorVitalBoxAlarm}></div>
        <div className={styles[`monitorVitalBox${label}1`]}>{vital1Val}</div>
        {vital2Val !== null && <div className={styles[`monitorVitalBox${label}2`]}>{vital2Val}</div>}
        {vital3Val !== null && <div className={styles[`monitorVitalBox${label}3`]}>{vital3Val}</div>}
        {label === 'SpO2' && <div className={styles.monitorVitalBoxSpO2Bar}>
          <div className={styles.monitorVitalBoxSpO2BarFill} style={{
            height: `${38 - Math.round(vital1WaveformVal / 38)}px`,
          }}></div>
        </div>}
      </div>
    </div>
  )
}