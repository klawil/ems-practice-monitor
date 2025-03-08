import { ManagerAction, ManagerState } from "@/types/manager/state";
import { SensorTypes } from "@/types/state"
import { ActionDispatch } from "react";
import { Col, Form } from "react-bootstrap";

interface ManagerSwitchProps {
  sensor: SensorTypes;
  state: ManagerState;
  dispatch: ActionDispatch<[action: ManagerAction]>;
}

export default function ManagerSwitch({
  sensor,
  state,
  dispatch,
}: ManagerSwitchProps) {
  return (
    <Col>
      <Form.Check
        type="switch"
        className="text-start"
        label={sensor}
        isInvalid={typeof state.sensorsStaged[sensor] !== 'undefined'}
        checked={typeof state.sensorsStaged[sensor] !== 'undefined'
          ? state.sensorsStaged[sensor]
          : state.sensors[sensor]}
        onChange={(event) => {
          const newVal = event.target.checked;
          if (newVal === state.sensors[sensor]) {
            dispatch({
              action: 'SetSensorStaged',
              sensor,
            });
          } else {
            dispatch({
              action: 'SetSensorStaged',
              sensor,
              state: newVal,
            });
          }
        }}
      />
    </Col>
  )
}
