import { ManagerAction, ManagerState } from "@/types/manager/state";
import { WaveformConfigTypes } from "@/types/state";
import { ActionDispatch, ChangeEvent } from "react";
import { Button, Col, Form, InputGroup, Row } from "react-bootstrap";

interface ManagerWaveformInputProps {
  waveform: WaveformConfigTypes;
  state: ManagerState;
  dispatch: ActionDispatch<[action: ManagerAction]>;
}

const waveformConfig: {
  [key in WaveformConfigTypes]: {
    label: string;
    keys: {
      [key2 in keyof ManagerState[`${key}GeneratorConfig`]]?: string;
    };
  };
} = {
  co2: {
    label: 'ETCO2',
    keys: {
      exhaleRatio: 'Exhale Percent',
      noiseLevel: 'Noise Percent',
      startRounding: 'Rounding Percent',
    },
  },
  spo2: {
    label: 'SPO2',
    keys: {
      noiseLevel: 'Noise Percent',
    },
  },
  ekg: {
    label: 'EKG',
    keys: {
      noiseLevel: 'Noise Percent',
    },
  },
};

export default function ManagerWaveform({
  waveform,
  state,
  dispatch,
}: ManagerWaveformInputProps) {
  const config = waveformConfig[waveform];

  const checkForChange = (key: keyof typeof config.keys) => (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = Math.round(Number(e.target.value)) / 100;

    dispatch({
      action: 'SetWaveformGeneratorConfigStaged',
      waveform,
      [key]: state[`${waveform}GeneratorConfig`][key] === newValue
        ? undefined
        : newValue,
    });
  }

  const hasStagedChanges = Object.keys(state[`${waveform}GeneratorConfigStaged`])
    .filter(k => typeof state[`${waveform}GeneratorConfigStaged`][k as keyof typeof config.keys] !== 'undefined')
    .length > 0;

  return (
    <Col lg={6} className="mt-3">
      <h3>{config.label} Waveform</h3>
      {(Object.keys(config.keys) as (keyof typeof config.keys)[]).map(key => (
        <Row className="mt-1" key={key}>
          <InputGroup>
            <InputGroup.Text>{config.keys[key]}</InputGroup.Text>
            <Form.Control
              type="number"
              isInvalid={typeof state[`${waveform}GeneratorConfigStaged`][key] !== 'undefined'}
              value={Math.round(100 * (
                typeof state[`${waveform}GeneratorConfigStaged`][key] === 'number'
                  ? state[`${waveform}GeneratorConfigStaged`][key] as number
                  : state[`${waveform}GeneratorConfig`][key] as number
               ))}
              onChange={checkForChange(key)}
            />
            <InputGroup.Text>%</InputGroup.Text>
          </InputGroup>
        </Row>
      ))}
      {hasStagedChanges && <Button
        className="mt-1"
        variant="danger"
        onClick={() => dispatch({
          action: 'ClearWaveformGeneratorConfigStaged',
          waveform,
        })}
      >Reset</Button>}
    </Col>
  )
}
