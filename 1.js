// 1. 实现一个Promise.race

Promise.race = function (promiseAry) {
  return new Promise((resolve, reject) => {
    for (let i = 0; i < promiseAry.length; i++) {
      Promise.resolve(promiseAry[i]).then(
        (value) => resolve(value),
        (err) => reject(err)
      );
    }
  });
};
