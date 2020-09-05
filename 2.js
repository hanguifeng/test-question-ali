// 2. XHR 请求缓存与合并

// 对于一个复杂的 web 应用来说，把多条同类型的异步请求合并成一条异步请求，是一个常见的提高性能的方式。
// 假设有接口 getUserById , getUserByIds ，在系统各处被使用。
// - getUserById 接受 用户 id 作为参数，发起 XHR 按 用户 id 查询对应的用户详情
// - getUserByIds 接受 用户 id数组 作为参数，发起 XHR 按 用户 id数组 查询对应的用户组详情

// ```js
// function getUserById(id) {
//   return fetch(`/api/user/${id}`).then(resp => resp.json());
// }
// function getUserByIds(ids) {
//   return fetch(`/api/users/${ids.join(",")}`).then(resp => resp.json());
// }
// ```

// 这时候我们希望能做如下优化:

// - 当同时调用多个 getUserById 函数时，自动把它们合并成一个新的请求 getUserByIds ，合并处理。一次返回所有结果。
// - 设计一个缓存，当再次调用之前调用过的 getUserById(1) 时，从缓存中取之前查到的结果。（不考虑服务端的数据更新问题）
// - 考虑请求失败时的情形。

let temp = [];
let cached = new Map();

const fetch = (path) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (path.indexOf("/api/user/1") !== -1) {
        resolve({
          json() {
            return {
              name: "user1",
            };
          },
        });
      } else {
        resolve({
          json() {
            return [
              {
                name: "user1",
              },
              {
                name: "user2",
              },
            ];
          },
        });
      }
    });
  });
};

const getUserById = (id) => {
  if (cached.has(id)) {
    return cached.get(id);
  }
  return new Promise((resolve, reject) => {
    temp.push({
      id,
      resolve,
      reject,
    });
    setTimeout(() => {
      if (temp.length === 1) {
        fetch(`/api/user/${id}`)
          .then((resp) => {
            const value = resp.json();
            cached.set(id, value);
            resolve(value);
          })
          .catch((error) => reject(error))
          .finally(() => {
            temp = [];
          });
      } else if (id === temp[temp.length - 1].id) {
        getUserByIds(temp.map(({ id }) => id));
      }
    }, 0);
  });
};

const getUserByIds = (ids) => {
  return fetch(`/api/users/${ids.join(",")}`)
    .then((resp) => {
      const value = resp.json();
      temp.forEach(({ resolve, id }, index) => {
        resolve(value[index]);
        cached.set(id, value[index]);
      });
      return value;
    })
    .catch((error) => {
      temp.forEach(({ reject }) => {
        reject(error);
      });
      return error;
    })
    .finally(() => {
      temp = [];
    });
};
