import { from, map, concatAll, tap } from 'rxjs';

import { createTask, createTask$ } from './task';
import { createRenderer } from './renderer';
import { Task } from './types';

export const run = (tasks: Task[]) => {
  const internalTasks = tasks.map(task => createTask(task));
  const { onNext, onError, onComplete } = createRenderer(internalTasks);

  from(internalTasks)
    .pipe(
      tap(task => onNext(task)),
      map(task => createTask$(task)),
      concatAll()
    )
    .subscribe({
      next: onNext,
      error: onError,
      complete: onComplete
    });
};