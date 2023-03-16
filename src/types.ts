export enum TaskState {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED_PARTIALLY = 'FAILED_PARTIALLY',
  FAILED = 'FAILED',
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
  error?: any;
}

export type InternalTaskRendererState = Record<string, InternalTask & { depth: number }>