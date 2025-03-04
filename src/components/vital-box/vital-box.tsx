import { MonitorState, VitalBoxTypes } from "@/types/monitor/reducer";
import styles from "./vital-box.module.css";

interface VitalTypeProps {
  type: VitalBoxTypes;
  state: MonitorState['HR'];
}

type VitalTypeConfigs = {
  [key in VitalBoxTypes]: {
    numVals: number;
    unit?: string;
  };
}

const vitalTypesConfig: VitalTypeConfigs = {
  HR: {
    numVals: 1,
  },
  SpO2: {
    numVals: 1,
    unit: '%',
  },
  CO2: {
    numVals: 2,
    unit: 'mmHg',
  },
  BP: {
    numVals: 3,
    unit: 'mmHg',
  },
};

export default function VitalBox({
  type,
  state,
}: VitalTypeProps) {
  const config = vitalTypesConfig[type];
  const colorClassName = state.hasWaveform ? styles[`monitorVitalBox${type}`] : '';
  const value3 = Math.round((2 * state.value2 + state.value1) / 3);

  return (
    <div className={styles.monitorVitalBox}>
      <div className={`${styles.monitorVitalBoxTitle} ${colorClassName}`}>
        <span>{type}</span>
        {config.unit && <span className={styles.monitorVitalBoxUnit}>{config.unit}</span>}
      </div>
      <div className={`${styles.monitorVitalBoxVital} ${colorClassName}`}>
        <div className={styles.monitorVitalBoxAlarm}></div>
        <div className={styles[`monitorVitalBox${type}1`]}>{state.value1}</div>
        {config.numVals > 1 && <div className={styles[`monitorVitalBox${type}2`]}>{state.value2}</div>}
        {config.numVals > 2 && <div className={styles[`monitorVitalBox${type}3`]}>{value3}</div>}
        {type === 'SpO2' && <div className={styles.monitorVitalBoxSpO2Bar}>
          <div className={styles.monitorVitalBoxSpO2BarFill} style={{
            height: `${38 - Math.round(state.waveformVal / 38)}px`,
          }}></div>
        </div>}
      </div>
    </div>
  )
}