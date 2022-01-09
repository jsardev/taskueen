import logUpdate from 'log-update';
import indentString from 'indent-string';
import { dots } from 'cli-spinners';

import { InternalTask, InternalTaskRendererState, TaskState } from './types';
import logSymbols from 'log-symbols';

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


const getSymbol = (taskState: TaskState, frameIndex: number) => ({
  [TaskState.PENDING]: '',
  [TaskState.IN_PROGRESS]: dots.frames[frameIndex],
  [TaskState.COMPLETED]: logSymbols.success
})[taskState];

export const createRenderer = (tasks: InternalTask[]) => {
  const state = createRendererState(tasks);
  let frameIndex = 0;

  const interval = setInterval(() => {
    const output: string[] = [];
    const isLastSpinnerFrame: boolean = frameIndex === dots.frames.length - 1;

    Object.values(state).forEach((task) => {
      const symbol = getSymbol(task.state, frameIndex);
      output.push(indentString(`${symbol} ${task.title}`, task.depth * 2));
    });
    logUpdate(output.join('\n'));

    frameIndex = isLastSpinnerFrame ? 0 : frameIndex + 1;

    if (Object.values(state).every(task => task.state === TaskState.COMPLETED)) {
      clearInterval(interval);
    }
  }, dots.interval);


  return (task: InternalTask) => {
    state[task.id] = { ...state[task.id], ...task };
  };
};