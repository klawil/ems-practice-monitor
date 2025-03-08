'use client';

import { Button, Col, Container, Form, InputGroup, Row } from "react-bootstrap";
import type { Metadata } from 'next'
import { useMessaging } from "@/logic/websocket";
import { ActionDispatch, useEffect, useReducer} from "react";
import { stateReducer, defaultManagerState } from "@/logic/manager/reducer";
import { ServerWebsocketMessage } from "@/types/websocket";
import { ManagerAction, ManagerState } from "@/types/manager/state";
import { monitorSensors, ServerMonitorActions, vitalTypes, waveformConfigTypes } from "@/types/state";
import ManagerSwitch from "./managerSwitch";
import ManagerVital from "./managerVital";
import ManagerWaveform from "./managerWaveform";
 
export const metadata: Metadata = {
  title: 'Manager',
};

function parseMessage(
  message: ServerWebsocketMessage,
  dispatch: ActionDispatch<[action: ManagerAction]>,
) {
  console.log('Parsing message', message);
  switch (message.action) {
    case 'invalid':
    case 'invalid-id':
      dispatch({
        action: 'SetMonitorId',
      });
      break;
    default:
      dispatch(message);
      break;
  }
}

function getPrunedObj<T extends object>(v: T): T {
  const returnValue = { ...v };
  (Object.keys(v) as (keyof T)[]).forEach(k => {
    if (typeof v[k] === 'undefined') {
      delete returnValue[k];
    }
  });
  return returnValue;
}

export default function Manager() {
  const [ state, dispatch ] = useReducer(stateReducer, defaultManagerState);
  const [
    popMessage,
    sendMessage,
  ] = useMessaging(
    () => `ws://${window.location.host}/api`,
  );

  useEffect(() => {
    const message = popMessage();
    if (typeof message !== 'undefined') {
      parseMessage(message, dispatch);
    }
  }, [popMessage]);

  function connectToMonitor() {
    if (typeof state.monitorId !== 'undefined') {
      sendMessage({
        action: 'join',
        clientType: 'manager',
        id: state.monitorId
      });
    }
  }

  const hasStagedChanges = Object.keys(state)
    .filter(key => key.includes('Staged'))
    .reduce((agg: boolean, key) => {
      if (agg) return agg;

      return Object.keys(state[key as keyof ManagerState] || {}).length > 0;
    }, false);

  return (
    <Container
      className="text-center"
    >
      <h1>Control a Monitor</h1>
        <Row>
          <Form.Label className="text-end" column>Monitor ID</Form.Label>
          <Col>
            <InputGroup>
              <Form.Control
                type="text"
                value={state.monitorId || ''}
                placeholder="XXXXX"
                disabled={state.connected}
                onChange={e => dispatch({
                  action: 'SetMonitorId',
                  id: e.target.value,
                })}
              />
              <Button
                variant="success"
                disabled={state.connected || !state.monitorId || state.monitorId.length !== 5}
                onClick={connectToMonitor}
              >Connect</Button>
            </InputGroup>
          </Col>
        </Row>
        {state.connected && <Row className="mt-3">
          {monitorSensors.map(sensor => <ManagerSwitch
            state={state}
            sensor={sensor}
            dispatch={dispatch}
            key={sensor}
          />)}
        </Row>}
        {state.connected && <Row>
          {vitalTypes.map(vital => <ManagerVital
            state={state}
            vital={vital}
            dispatch={dispatch}
            key={vital}
          />)}
        </Row>}
        {state.connected && <Row>
          {waveformConfigTypes.map(waveform => <ManagerWaveform
            state={state}
            waveform={waveform}
            dispatch={dispatch}
            key={waveform}
          />)}
        </Row>}
        {hasStagedChanges && <Row className="mt-3">
          <Button
            variant="success"
            onClick={() => {
              // Send the sensors
              const sensorsStaged = getPrunedObj(state.sensorsStaged);
              if (Object.keys(sensorsStaged).length > 0) {
                (Object.keys(sensorsStaged) as (keyof typeof sensorsStaged)[])
                .forEach(sensor => {
                    const action: ServerMonitorActions = {
                      action: 'SetSensor',
                      sensor,
                      state: sensorsStaged[sensor] as boolean,
                    };
                    sendMessage(action);
                    dispatch(action);
                  });
              }
              dispatch({ action: 'ClearSensorStaged' });

              // Send the vital generator configs
              vitalTypes.forEach(vital => {
                const prunedObj = getPrunedObj(state[`${vital}GeneratorConfigStaged`]);
                if (Object.keys(prunedObj).length === 0) return;

                const action: ServerMonitorActions = {
                  action: 'SetVitalGeneratorConfig',
                  vital,
                  ...prunedObj,
                };
                sendMessage(action);
                dispatch(action);
                dispatch({
                  action: 'ClearVitalGeneratorConfigStaged',
                  vital,
                });
              });

              // Send the waveform generator configs
              waveformConfigTypes.forEach(waveform => {
                const prunedObj = getPrunedObj(state[`${waveform}GeneratorConfigStaged`]);
                if (Object.keys(prunedObj).length === 0) return;

                const action: ServerMonitorActions = {
                  action: 'SetWaveformGeneratorConfig',
                  waveform,
                  ...prunedObj,
                };
                sendMessage(action);
                dispatch(action);
                dispatch({
                  action: 'ClearWaveformGeneratorConfigStaged',
                  waveform,
                });
              });
            }}
          >Send to Monitor</Button>
        </Row>}
    </Container>
  );
}
