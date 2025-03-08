import { ManagerAction, ManagerState } from "@/types/manager/state";
import { VitalTypes } from "@/types/state"
import { ActionDispatch, ChangeEvent } from "react";
import { Button, Col, Form, InputGroup } from "react-bootstrap";
import { BsArrowCounterclockwise } from "react-icons/bs";

interface ManagerVitalInputProps {
  vital: VitalTypes;
  state: ManagerState;
  dispatch: ActionDispatch<[action: ManagerAction]>;
}

export default function ManagerVital({
  vital,
  state,
  dispatch,
}: ManagerVitalInputProps) {
  const checkForChange = (key: 'targetValue' | 'targetRange') => (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = Math.round(Number(e.target.value));

    dispatch({
      action: 'SetVitalGeneratorConfigStaged',
      vital,
      [key]: state[`${vital}GeneratorConfig`][key] === newValue
        ? undefined
        : newValue,
    });
  }

  const hasStagedChanges = Object.keys(state[`${vital}GeneratorConfigStaged`])
    .filter(k => typeof state[`${vital}GeneratorConfigStaged`][k as keyof typeof state.HRGeneratorConfigStaged] !== 'undefined')
    .length > 0;

  return (
    <Col lg={6} className="mt-3">
      <InputGroup>
        <InputGroup.Text>{vital} Target</InputGroup.Text>
        <Form.Control
          type="number"
          isInvalid={typeof state[`${vital}GeneratorConfigStaged`].targetValue !== 'undefined'}
          value={state[`${vital}GeneratorConfigStaged`].targetValue ||
            state[`${vital}GeneratorConfig`].targetValue}
          onChange={checkForChange('targetValue')}
        />
        <InputGroup.Text>+/-</InputGroup.Text>
        <Form.Control
          type="number"
          isInvalid={typeof state[`${vital}GeneratorConfigStaged`].targetRange !== 'undefined'}
          value={state[`${vital}GeneratorConfigStaged`].targetRange ||
            state[`${vital}GeneratorConfig`].targetRange}
          onChange={checkForChange('targetRange')}
        />
        {hasStagedChanges && <Button
          variant="danger"
          onClick={() => dispatch({
            action: 'ClearVitalGeneratorConfigStaged',
            vital,
          })}
        ><BsArrowCounterclockwise /></Button>}
      </InputGroup>
    </Col>
  )
}
