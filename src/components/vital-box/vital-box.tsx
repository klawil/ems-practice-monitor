import { MonitorState, vitalTypes } from "@/types/monitor/reducer";
import styles from "./vital-box.module.css";
import { BsBellSlashFill } from "react-icons/bs";

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

const vitalBoxesToAlwaysShow: VitalBoxTypes[] = [
  'HR',
  'SpO2',
];

export default function VitalBox({
  label,
  unit,
  vital1,
  vital2,
  state,
}: VitalBoxProps) {
  const colorClassName = state[vital1].hasWaveform ? styles[`monitorVitalBox${label}`] : '';
  const vital1Val: number | null =  state[vital1].hasData
    ? Math.round(state[vital1].value)
    : null;
  const vital2Val: number | null = vital2 && state[vital2].hasData
    ? Math.round(state[vital2].value)
    : null;
  const vital3Val: number | null = vital1Val !== null && vital2 && vital2 === 'DBP' && vital2Val !== null
    ? Math.round((2 * vital2Val + vital1Val) / 3)
    : null;
  const hasData = state[vital1].hasData;
  const showNoData = vitalBoxesToAlwaysShow.includes(label);

  const vital1Str: string = vital1Val === null ? '---' : vital1Val.toString();
  const vital2Str: string = vital2Val === null ? '---' : vital2Val.toString();
  const vital3Str: string = vital3Val === null ? '---' : vital3Val.toString();
  const vital1WaveformVal: number = vital1Val !== null ?
    state[vital1].waveformVal
    : 0;

  return (
    <div className={styles.monitorVitalBox}>
      {(hasData || showNoData) && <>
        <div className={`${styles.monitorVitalBoxTitle} ${colorClassName}`}>
          <span>{label}</span>
          {unit && <span className={styles.monitorVitalBoxUnit}>{unit}</span>}
        </div>
        <div className={`${styles.monitorVitalBoxVital} ${colorClassName}`}>
          <div className={styles.monitorVitalBoxAlarm}><BsBellSlashFill /></div>
          <div className={styles[`monitorVitalBox${label}1`]}>{vital1Str}</div>
          {vital2Val !== null && <div className={styles[`monitorVitalBox${label}2`]}>{vital2Str}</div>}
          {vital3Val !== null && <div className={styles[`monitorVitalBox${label}3`]}>{vital3Str}</div>}
          {label === 'SpO2' && <div className={styles.monitorVitalBoxSpO2Bar}>
            <div className={styles.monitorVitalBoxSpO2BarFill} style={{
              height: `${38 - Math.round(vital1WaveformVal / 100 * 38)}px`,
            }}></div>
          </div>}
        </div>
      </>}
    </div>
  )
}