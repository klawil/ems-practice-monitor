'use client';

import { Button, Col, Container, Form, InputGroup, Row } from "react-bootstrap";
import type { Metadata } from 'next'
import { useMessaging } from "@/logic/websocket";
import { ActionDispatch, useEffect, useReducer, useState} from "react";
import { stateReducer, defaultManagerState } from "@/logic/manager/reducer";
import { ServerWebsocketMessage } from "@/types/websocket";
import { ManagerAction, ManagerState } from "@/types/manager/state";
import { getSharedState, monitorSensors, ServerMonitorActions, vitalTypes, waveformConfigTypes } from "@/types/state";
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
      dispatch({
        action: 'SetMonitorIdInput',
        id: '',
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
  const [ shouldSendChanges, setShouldSendChanges ] = useState(false);
  const searchParams = useSearchParams();
  const [
    popMessage,
    sendMessage,
    isConnected,
  ] = useMessaging(
    () => `ws${window.location.protocol === 'https:' ? 's' : ''}://${window.location.host}/api`,
    'manager',
    state.monitorId,
  );

  useEffect(() => {
    const message = popMessage();
    if (typeof message !== 'undefined') {
      parseMessage(message, dispatch);
    }
  }, [popMessage]);

  useEffect(() => {
    if (!isConnected && state.connected) {
      dispatch({
        action: 'SetConnected',
        state: false,
      });
    }
  }, [isConnected, state.connected]);

  useEffect(() => {
    if (!shouldSendChanges) return;

    sendMessage({
      action: 'SyncState',
      ...getSharedState(state),
    });
    dispatch({
      action: 'ClearInstantChanges',
    });
    setShouldSendChanges(false);
  }, [shouldSendChanges, sendMessage]); // eslint-disable-line

  function connectToMonitor() {
    dispatch({
      action: 'SetMonitorId',
      id: state.monitorIdInput,
    });
  }

  function disconnectMonitor() {
    sendMessage({
      action: 'leave',
    });
    dispatch({
      action: 'DisconnectMonitor',
    });
  }

  const searchMonitorId = searchParams.get('monitorId');
  if (
    !state.monitorId &&
    searchMonitorId
  ) {
    dispatch({
      action: 'SetMonitorIdInput',
      id: searchMonitorId,
    });
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
      style={{
        paddingBottom: '80px',
      }}
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
              value={state.monitorIdInput || ''}
              placeholder="XXXXX"
              disabled={state.connected}
              onChange={e => dispatch({
                action: 'SetMonitorIdInput',
                id: e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''),
              })}
              onKeyUp={e => {
                if (e.key === 'Enter')
                  connectToMonitor();
              }}
            />
            {!state.connected && <Button
              variant="success"
              disabled={state.connected || state.monitorIdInput.length !== 5}
              onClick={connectToMonitor}
            >Connect</Button>}
            {state.connected && <Button
              variant="danger"
              onClick={disconnectMonitor}
            >Disconnect</Button>}
          </InputGroup>
        </Col>
      </Row>
      {state.connected && isConnected && <>
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

        <Row>
          {waveformConfigTypes.map(waveform => <ManagerWaveform
            state={state}
            waveform={waveform}
            dispatch={dispatch}
            key={waveform}
          />)}
        </Row>

        {hasStagedChanges && <Button
          variant="success"
          onClick={() => {
            // Send the sensors
            const sensorsStaged = getPrunedObj(state.sensorsStaged);
            if (Object.keys(sensorsStaged).length > 0) {
              const action: ServerMonitorActions = {
                action: 'SetSensor',
                ...sensorsStaged,
              };
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
              dispatch(action);
              dispatch({
                action: 'ClearWaveformGeneratorConfigStaged',
                waveform,
              });
            });

            setShouldSendChanges(true);
          }}
          className="container"
          style={{
            position: 'fixed',
            bottom: '10px',
            left: '50%',
            transform: 'translate(-50%, 0)',
          }}
        >Send to Monitor</Button>}
      </>}
    </Container>
  );
}
