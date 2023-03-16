import { nanoid } from 'nanoid';
import { concatAll, filter, from, map, mergeAll, Observable, tap } from 'rxjs';

import { InternalTask, InternalTaskArray, Task, TaskCallable, TaskState } from './types';

const createUpdatedTask = (task: InternalTask, taskUpdate: Partial<InternalTask>): InternalTask => ({
  ...task,
  ...taskUpdate
});

const createParentTask$ = (task: InternalTask<InternalTaskArray>): Observable<InternalTask> => {
  const childTasks$ = from(task.task)
    .pipe(
      map(createTask$),
      task.concurrent ? mergeAll() : concatAll()
    );

  return new Observable(subscriber => {
    let childTasksFinished = 0;
    let childTasksFailed = 0;

    subscriber.next(createUpdatedTask(task, { state: TaskState.IN_PROGRESS }));

    childTasks$
      .pipe(filter(ct => ct.parentId === task.id))
      .subscribe({
        next: (task) => subscriber.next(task),
        error: () => {
          console.log('err');
          childTasksFailed += 1;

          if (childTasksFailed === task.task.length) {
            console.log('running failure');
            subscriber.next(createUpdatedTask(task, { state: TaskState.FAILED }));
            subscriber.error();
          } else if (childTasksFailed >= 1) {
            subscriber.next(createUpdatedTask(task, { state: TaskState.FAILED_PARTIALLY }));
          }
        },
        complete: () => {
          subscriber.next(createUpdatedTask(task, { state: TaskState.COMPLETED }));
          subscriber.complete();
        }
      });
  });
};

export const createTask$ = (task: InternalTask): Observable<InternalTask> => {
  if (Array.isArray(task.task)) {
    return createParentTask$(task as InternalTask<InternalTaskArray>);
  }
  return new Observable<InternalTask>(subscriber => {
    subscriber.next(createUpdatedTask(task, { state: TaskState.IN_PROGRESS }));
    (task as Task<TaskCallable>).task().then(result => {
      subscriber.next(createUpdatedTask(task, { state: TaskState.COMPLETED, result }));
      subscriber.complete();
    }).catch(error => {
      subscriber.next(createUpdatedTask(task, { state: TaskState.FAILED, error }));
      subscriber.error(error);
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