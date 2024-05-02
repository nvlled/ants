export function throttle(everyMillis: number, fn: Function) {
  let lastUpdate = 0;
  let timerID = null as Timer | null;
  const wrapper = function () {
    const now = Date.now();
    const elapsed = now - lastUpdate;
    if (elapsed < everyMillis) {
      if (!timerID) {
        timerID = setTimeout(wrapper, everyMillis - elapsed);
      }
    } else {
      fn();
      timerID = null;
      lastUpdate = now;
    }
  };
  return wrapper;
}
