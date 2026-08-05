const MAX_CONCURRENT = 2;
let activeCount = 0;
const waitQueue = [];

const runNext = () => {
  if (activeCount >= MAX_CONCURRENT || waitQueue.length === 0) return;

  const { fn, resolve, reject } = waitQueue.shift();
  activeCount += 1;

  Promise.resolve()
    .then(fn)
    .then(resolve, reject)
    .finally(() => {
      activeCount -= 1;
      runNext();
    });
};

export const runQueued = (fn) =>
  new Promise((resolve, reject) => {
    waitQueue.push({ fn, resolve, reject });
    runNext();
  });

export default runQueued;
