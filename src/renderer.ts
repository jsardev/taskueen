import indentString from 'indent-string';
import { dots } from 'cli-spinners';
import logSymbols from 'log-symbols';
import logUpdate, { clear } from 'log-update';

import { InternalTask, InternalTaskRendererState, TaskState } from './types';

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
  [TaskState.COMPLETED]: logSymbols.success,
  [TaskState.FAILED_PARTIALLY]: logSymbols.warning,
  [TaskState.FAILED]: logSymbols.error
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
  }, dots.interval);


  return {
    onNext: (task: InternalTask) => {
      state[task.id] = { ...state[task.id], ...task };
    },
    onError: (e) => {
      console.log('onerror',e)
      clearInterval(interval);
    },
    onComplete: () => {
      console.log('oncomplete')
      clearInterval(interval);
    }
  };
};