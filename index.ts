import { nanoid } from 'nanoid';
import indentString from 'indent-string';
import logUpdate from 'log-update';
import {
  Observable,
  from,
  map,
  mergeAll,
  concatAll,
  tap
} from 'rxjs';

enum TaskState {
  IDLE = 'IDLE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

type TaskCallable = () => Promise<any>;

type TaskArray = Task[];
export type Task<T = TaskCallable | TaskArray> = {
  title: string;
  task: T;
  concurrent?: boolean;
}

type InternalTaskArray = InternalTask[];
type InternalTask<T = TaskCallable | InternalTaskArray> = Task<T> & {
  id: string;
  parentId?: string;
  state: TaskState;
  result?: any;
}

type TaskEvent = {
  id: string;
  parentId?: string;
  state: TaskState;
  result: any;
}

const createTaskEvent = (task: InternalTask, state: TaskState, result?: any): TaskEvent => ({
  ...task,
  state,
  result
});

const createParentTask$ = (task: InternalTask<InternalTaskArray>) => {
  const childTasks$ = from(task.task)
    .pipe(
      map(createTask$),
      task.concurrent ? mergeAll() : concatAll()
    );

  return new Observable(subscriber => {
    let childTasksFinished = 0;

    subscriber.next(createTaskEvent(task, TaskState.IN_PROGRESS));

    childTasks$
      .subscribe(childTaskResult => {
        const isChildOfTask = childTaskResult.parentId === task.id;
        const isChildTaskCompleted = childTaskResult.state === TaskState.COMPLETED;

        subscriber.next(childTaskResult);

        if (isChildOfTask && isChildTaskCompleted) {
          childTasksFinished += 1;
        }

        const isTaskCompleted = childTasksFinished === task.task.length;

        if (isTaskCompleted) {
          subscriber.next(createTaskEvent(task, TaskState.COMPLETED));
          subscriber.complete();
        }
      });
  });
};

const createTask$ = (task: InternalTask): Observable<any> => {
  if (Array.isArray(task.task)) {
    return createParentTask$(task as InternalTask<InternalTaskArray>);
  }
  return new Observable<any>(subscriber => {
    subscriber.next(createTaskEvent(task, TaskState.IN_PROGRESS));
    (task as Task<TaskCallable>).task().then(result => {
      subscriber.next(createTaskEvent(task, TaskState.COMPLETED, result));
      subscriber.complete();
    });
  });
};

const createTask = (task: Task, parentId?: string): InternalTask => {
  const id = nanoid();

  return {
    ...task,
    id,
    parentId,
    task: Array.isArray(task.task) ? task.task.map(childTask => createTask(childTask, id)) : task.task,
    state: TaskState.IDLE
  };
};

type InternalTaskRendererState = Record<string, InternalTask & { depth: number }>

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

const createRenderer = (tasks: InternalTask[]) => {
  const state = createRendererState(tasks);

  createRendererOutput(state);

  return (task: InternalTask) => {
    state[task.id] = { ...state[task.id], ...task };
    createRendererOutput(state);
  };
};

export const run = (tasks: Task[]) => {
  const internalTasks = tasks.map(task => createTask(task));
  const render = createRenderer(internalTasks);

  from(internalTasks)
    .pipe(
      tap(task => render(task)),
      map(task => createTask$(task)),
      concatAll()
    )
    .subscribe(render);
};