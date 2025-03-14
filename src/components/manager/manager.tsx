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
import { useSearchParams } from "next/navigation";
 
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
  const searchParams = useSearchParams();
  const [
    popMessage,
    sendMessage,
  ] = useMessaging(
    () => `ws${window.location.protocol === 'https:' ? 's' : ''}://${window.location.host}/api`,
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

  function disconnectMonitor() {
    sendMessage({
      action: 'leave',
    });
    dispatch({
      action: 'SetMonitorId',
    });
    dispatch({
      action: 'SetConnected',
      state: false,
    });
  }

  const searchMonitorId = searchParams.get('monitorId');
  if (
    !state.monitorId &&
    searchMonitorId
  ) {
    dispatch({
      action: 'SetMonitorId',
      id: searchMonitorId,
    });
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
          <Col
            xl={{span: 4, offset: 4}}
            lg={{span: 6, offset: 3}}
            md={{span: 8, offset: 2}}
          >
            <InputGroup>
              <InputGroup.Text>Monitor ID</InputGroup.Text>
              <Form.Control
                type="text"
                value={state.monitorId || ''}
                placeholder="XXXXX"
                disabled={state.connected}
                onChange={e => dispatch({
                  action: 'SetMonitorId',
                  id: e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''),
                })}
                onKeyUp={e => {
                  if (e.key === 'Enter')
                    connectToMonitor();
                }}
              />
              {!state.connected && <Button
                variant="success"
                disabled={state.connected || !state.monitorId || state.monitorId.length !== 5}
                onClick={connectToMonitor}
              >Connect</Button>}
              {state.connected && <Button
                variant="danger"
                onClick={disconnectMonitor}
              >Disconnect</Button>}
            </InputGroup>
          </Col>
        </Row>
        {state.connected && <>
          <Row className="mt-3">
            <h3>Sensors</h3>
          </Row>
          <Row className="mt-3">
            {monitorSensors.map(sensor => <ManagerSwitch
              state={state}
              sensor={sensor}
              dispatch={dispatch}
              key={sensor}
            />)}
          </Row>
        </>}
        {state.connected && <>
          <Row className="mt-3">
            <h3>Vitals</h3>
          </Row>
          <Row>
            {vitalTypes.map(vital => <ManagerVital
              state={state}
              vital={vital}
              dispatch={dispatch}
              key={vital}
            />)}
          </Row>
        </>}
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
                const action: ServerMonitorActions = {
                  action: 'SetSensor',
                  ...sensorsStaged,
                };
                sendMessage(action);
                dispatch(action);
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
