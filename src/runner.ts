import { from, map, concatAll, tap } from 'rxjs';

import { createTask, createTask$ } from './task';
import { createRenderer } from './renderer';
import { Task } from './types';

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