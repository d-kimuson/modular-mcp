import {
  type ControllablePromise,
  controllablePromise,
} from "../utils/controllablePromise.js";

const queue: ControllablePromise<void>[] = [];

export const lockAuthServer = async () => {
  const releasePromise = controllablePromise<void>();
  const release = () => {
    releasePromise.resolve();
    // 解決されたpromiseをキューから削除
    const index = queue.indexOf(releasePromise);
    if (index !== -1) {
      queue.splice(index, 1);
    }
  };

  const lastQueue = queue.at(-1);
  queue.push(releasePromise);

  if (lastQueue) {
    await lastQueue.promise;
  }

  return {
    release,
  } as const;
};
