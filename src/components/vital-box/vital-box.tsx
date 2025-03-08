import { MonitorState, waveformBoxNames } from "@/types/monitor/state";
import styles from "./vital-box.module.css";
import { BsBellSlashFill } from "react-icons/bs";
import { SensorTypes, VitalTypes, WaveformBoxTypes } from "@/types/state";

type VitalBoxTypes = 'HR' | 'SpO2' | 'CO2' | 'BP';

export interface VitalBoxPartialProps {
  label: VitalBoxTypes;
  unit?: string;

  vital1: VitalTypes;
  vital2?: VitalTypes;
}

interface VitalBoxProps extends VitalBoxPartialProps {
  state: MonitorState;
}

const vitalTypeRequiredSensor: {
  [key in VitalTypes]: {
    sensor?: SensorTypes;
    waveforms?: WaveformBoxTypes[];
    colorString?: string;
  }[];
} = {
  HR: [
    {
      sensor: '3-lead',
      waveforms: ['I', 'II', 'III'],
      colorString: 'Cardiac',
    },
    {
      sensor: '12-lead',
      waveforms: ['I', 'II', 'III'],
      colorString: 'Cardiac',
    },
    {
      sensor: 'SpO2',
      waveforms: ['SpO2'],
      colorString: 'SpO2',
    },
    {
      waveforms: ['I', 'II', 'III'],
      colorString: 'Cardiac',
    },
  ],
  SpO2: [
    {
      sensor: 'SpO2',
      waveforms: ['SpO2'],
      colorString: 'SpO2',
    },
  ],
  CO2: [
    {
      sensor: 'ETCO2',
      waveforms: ['CO2'],
      colorString: 'CO2',
    },
  ],
  RR: [
    {
      sensor: 'ETCO2',
      waveforms: ['CO2'],
      colorString: 'CO2',
    },
  ],
  SBP: [
    {
      sensor: 'BP',
    },
  ],
  DBP: [
    {
      sensor: 'BP',
    },
  ],
};

const vitalBoxesToAlwaysShow: VitalBoxTypes[] = [
  'HR',
  'SpO2',
];

interface VitalCurrentState {
  hasData: boolean;
  colorClass: string | null;
  value: number;
  valueStr: string;
}
function getVitalInformation(
  state: MonitorState,
  vital: VitalTypes,
  activeWaveforms: WaveformBoxTypes[],
): VitalCurrentState {
  const returnVal: VitalCurrentState = {
    hasData: false,
    colorClass: null,
    value: 0,
    valueStr: '---',
  };

  // Get the configuration for the vital
  for (let i = 0; i < vitalTypeRequiredSensor[vital].length; i++) {
    const sensorColorInfo = vitalTypeRequiredSensor[vital][i];
    if (
      typeof sensorColorInfo.sensor === 'undefined' ||
      state.sensors[sensorColorInfo.sensor]
    ) {
      returnVal.hasData = typeof sensorColorInfo.sensor !== 'undefined'
        && state.sensors[sensorColorInfo.sensor];
      
      // Determine if a required waveform is shown
      if (
        sensorColorInfo.waveforms &&
        sensorColorInfo.colorString
      ) {
        let isActiveWaveform = false;
        for (let i = 0; i < sensorColorInfo.waveforms.length; i++) {
          if (activeWaveforms.includes(sensorColorInfo.waveforms[i])) {
            isActiveWaveform = true;
            break;
          }
        }
        if (isActiveWaveform) {
          returnVal.colorClass = sensorColorInfo.colorString || null;
        }
      }
      break;
    }
  }

  // Get and format the data
  if (returnVal.hasData) {
    returnVal.value = Math.round(state[vital].value);
    returnVal.valueStr = returnVal.value.toString();
  }

  return returnVal;
}

export default function VitalBox({
  label,
  unit,
  vital1,
  vital2,
  state,
}: VitalBoxProps) {
  // Get the active waveform types
  const activeWaveforms = waveformBoxNames.map(wave => state[wave].waveform);

  // Get the vital information
  const vital1Info = getVitalInformation(state, vital1, activeWaveforms);
  const vital2Info = vital2
    ? getVitalInformation(state, vital2, activeWaveforms)
    : null;
  const vital3Val: number | null = vital2 === 'DBP' && vital1Info.hasData && vital2Info && vital2Info.hasData
    ? Math.round((2 * vital2Info.value + vital1Info.value) / 3)
    : null;
  const vital3Str: string | null = vital3Val !== null
    ? vital3Val.toString()
    : null;

  const colorClassName = vital1Info.colorClass !== null && typeof styles[`monitorVitalBox${vital1Info.colorClass}`] !== 'undefined'
    ? styles[`monitorVitalBox${vital1Info.colorClass}`]
    : '';
  const hasData = vital1Info.hasData;
  const showNoData = vitalBoxesToAlwaysShow.includes(label);
  const vital1WaveformVal: number = vital1Info.hasData
    ? state[vital1].waveformVal
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
          <div className={styles[`monitorVitalBox${label}1`]}>{vital1Info.valueStr}</div>
          {vital2Info !== null && <div className={styles[`monitorVitalBox${label}2`]}>{vital2Info.valueStr}</div>}
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