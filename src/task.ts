import { nanoid } from 'nanoid';
import { concatAll, from, map, mergeAll, Observable } from 'rxjs';

import { InternalTask, InternalTaskArray, Task, TaskCallable, TaskEvent, TaskState } from './types';

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

export const createTask$ = (task: InternalTask): Observable<any> => {
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

export const createTask = (task: Task, parentId?: string): InternalTask => {
  const id = nanoid();

  return {
    ...task,
    id,
    parentId,
    task: Array.isArray(task.task) ? task.task.map(childTask => createTask(childTask, id)) : task.task,
    state: TaskState.PENDING
  };
};