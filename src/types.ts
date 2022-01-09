export enum TaskState {
  IDLE = 'IDLE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export type TaskCallable = () => Promise<any>;
export type TaskArray = Task[];
export type InternalTaskArray = InternalTask[];

export type Task<T = TaskCallable | TaskArray> = {
  title: string;
  task: T;
  concurrent?: boolean;
}

export type InternalTask<T = TaskCallable | InternalTaskArray> = Task<T> & {
  id: string;
  parentId?: string;
  state: TaskState;
  result?: any;
}

export type InternalTaskRendererState = Record<string, InternalTask & { depth: number }>

export type TaskEvent = {
  id: string;
  parentId?: string;
  state: TaskState;
  result: any;
}

