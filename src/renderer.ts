import logUpdate from 'log-update';
import indentString from 'indent-string';

import { InternalTask, InternalTaskRendererState } from './types';

const createRendererState = (tasks: InternalTask[], depth: number = 0): InternalTaskRendererState =>
  tasks.reduce((state, task) => {
    if (Array.isArray(task.task)) {
      return {
        ...state,
        [task.id]: { ...task, depth },
        ...createRendererState(task.task, depth + 1)
      };
    }
    return {
      ...state,
      [task.id]: { ...task, depth }
    };
  }, {});

const createRendererOutput = (state: InternalTaskRendererState) => {
  const output: string[] = [];
  Object.values(state).forEach((task) => {
    output.push(indentString(`${task.title} ${task.state}`, task.depth * 2));
  });
  logUpdate(output.join('\n'));
};

export const createRenderer = (tasks: InternalTask[]) => {
  const state = createRendererState(tasks);

  createRendererOutput(state);

  return (task: InternalTask) => {
    state[task.id] = { ...state[task.id], ...task };
    createRendererOutput(state);
  };
};