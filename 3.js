// 将一个 html 字符串变成树的形式

// ```html
// <div id="main" data-x="hello">Hello<span id="sub" /></div>
// ```

// 这样的一串字符串变成如下的一棵树，考虑尽可能多的形式，比如自闭合标签等。

// ```
//      {
//       tag: "div",
//       selfClose: false,
//       attributes: {
//         "id": "main",
//         "data-x": "hello"
//       },
//       text: "Hello",
//       children: [
//         {
//           tag: "span",
//           selfClose: true,
//           attributes: {
//             "id": "sub"
//           }
//         }
//       ]
//     }
// ```

const isArrayEqual = (arr1, arr2) => {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
    throw new Error("args err");
  }

  if (arr1.length !== arr2.length) return false;

  let res = true;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      res = false;
      break;
    }
  }

  return res;
};

// 处理tag后面的attributes字符串
const getFormatAttributes = (str) => {
  if (typeof str !== "string") {
    throw new Error("args err");
  }
  const strArr = str.split(" ").slice(1);
  const res = {};
  strArr.forEach((n) => {
    const arr = n.split("=");
    res[arr[0]] = arr[1];
  });
  return res;
};

// 标签类型
const TAG_TYPES = {
  div: "div",
  span: "span",
  p: "p",
};

// token类型
const TAG_START = "TAG_START";
const TAG_END_WITH_TYPE = "TAG_END_WITH_TYPE";
const TAG_END_WITHOUT_TYPE = "TAG_END_WITHOUT_TYPE";
const TAG_END_WITHOUT_TYPE_AND_SLASH = "TAG_END_WITHOUT_TYPE_AND_SLASH";
const TEXT = "TEXT";

const TOKEN_TYPES = {
  "/>": { type: TAG_END_WITHOUT_TYPE, value: "/>" },
  ">": { type: TAG_END_WITHOUT_TYPE_AND_SLASH, value: ">" },
};
Object.values(TAG_TYPES).forEach((tagName) => {
  TOKEN_TYPES[`<${tagName}`] = { type: TAG_START, value: tagName };
  TOKEN_TYPES[`</${tagName}>`] = { type: TAG_END_WITH_TYPE, value: tagName };
});

// 用</, />, <, >, TAG_TYPES作为分隔符，生成token list
const splitHtmlStr = (str) => {
  let regStr = "(/>)|(>)";
  Object.values(TAG_TYPES).forEach((i) => {
    regStr += `|(</${i}>)|(<${i})`;
  });
  const reg = new RegExp(regStr);
  return str.split(reg).filter((i) => i);
};

// 根据结构匹配来处理对应的自闭合标签
const parserSelfCloseTag = (tokenList) => {
  tokenList = [...tokenList.filter((i) => i && i.type)];

  // 自闭合标签的token
  const structureWithProps = [TAG_START, TEXT, TAG_END_WITHOUT_TYPE];
  const structureWithoutProps = [TAG_START, TAG_END_WITHOUT_TYPE];

  for (let i = 0; i < tokenList.length; i++) {
    // 有attributes的自闭合标签
    if (i + 2 <= tokenList.length) {
      const templateTokenList = [
        tokenList[i],
        tokenList[i + 1],
        tokenList[i + 2],
      ].filter((i) => i);
      if (templateTokenList.length === 3) {
        const types = templateTokenList.map((i) => {
          return i ? i.type : null;
        });
        if (isArrayEqual(types, structureWithProps)) {
          const astNode = {
            tag: tokenList[i].value,
            selfClose: true,
            attributes: getFormatAttributes(tokenList[i + 1].value),
          };
          tokenList.splice(i, 3, astNode);
        }
      }
    }

    // 没有attributes的自闭合标签
    if (i + 1 <= tokenList.length) {
      const templateTokenList = [tokenList[i], tokenList[i + 1]].filter(
        (i) => i
      );
      if (templateTokenList.length === 2) {
        const types = templateTokenList.map((i) => i.type);
        if (isArrayEqual(types, structureWithoutProps)) {
          const astNode = {
            tag: tokenList[i].value,
            selfClose: true,
          };

          tokenList.splice(i, 2, astNode);
        }
      }
    }
  }

  return tokenList;
};

// 处理非自闭合标签
const parserNotSelfCloseTag = (tokenList) => {
  tokenList = [...tokenList];

  // 非自闭合标签的开始部分token组成
  const structureWithProps = [TAG_START, TEXT, TAG_END_WITHOUT_TYPE_AND_SLASH];
  const structureWithoutProps = [TAG_START, TAG_END_WITHOUT_TYPE_AND_SLASH];

  for (let i = 0; i < tokenList.length; i++) {
    // 有attributes的非自闭合标签
    if (i + 3 <= tokenList.length) {
      const tagStart = [tokenList[i], tokenList[i + 1], tokenList[i + 2]];
      const types = tagStart.map((i) => (i ? i.type : null));
      if (isArrayEqual(types, structureWithProps)) {
        const tagType = tokenList[i].value;

        let sameTypeTagStart = 0;
        let j = i + 1;
        const astNode = {
          tag: tagType,
          selfClose: false,
          attributes: getFormatAttributes(tokenList[i + 1].value),
          children: [],
        };

        // 处理文字节点
        if (
          tokenList[i] &&
          tokenList[i].type === "TEXT" &&
          tokenList[i - 1].type !== "TAG_START"
        ) {
          astNode.text = tokenList[i].value;
        }

        while (j < tokenList.length) {
          // 如果有tag_start而且type相等, sameTypeTagStart + 1
          if (
            tokenList[j] &&
            tokenList[j].type === TAG_START &&
            tokenList[j].value === tagType
          ) {
            sameTypeTagStart += 1;
          }

          // 如果找到tag_end_with_type而且type相等,如果sameTagStart === 0那么中间的都是children
          if (
            tokenList[j] &&
            tokenList[j].type === TAG_END_WITH_TYPE &&
            tokenList[j].value === tagType
          ) {
            if (sameTypeTagStart === 0) {
              // 将children赋值
              astNode.children = tokenList.slice(i + 3, j - i);
              // 将标签结束部分删除
              tokenList.splice(j, 1);
              // 如果这个标签处理完毕。退出循环
              break;
            } else {
              sameTypeTagStart -= 1;
            }
          }

          j++;
        }

        astNode.children = parserNotSelfCloseTag(astNode.children);
        // 改变tokenList，将这次的操作回填到tokenList中
        tokenList.splice(i, j, astNode);
      }
    }

    // 没有attributes的自闭合标签
    if (i + 2 <= tokenList.length) {
      const tagStart = [tokenList[i], tokenList[i + 1]];
      const types = tagStart.map((i) => (i ? i.type : null));
      if (isArrayEqual(types, structureWithoutProps)) {
        const tagType = tokenList[i].value;

        const astNode = {
          tag: tagType,
          selfClose: false,
          children: [],
        };

        // 处理文字节点
        if (
          tokenList[i] &&
          tokenList[i].type === "TEXT" &&
          tokenList[i - 1].type !== "TAG_START"
        ) {
          astNode.text = tokenList[i].value;
        }

        let sameTypeTagStart = 0;
        let j = i;
        // 找到非自闭合标签的children
        while (j < tokenList.length) {
          if (
            tokenList[j] &&
            tokenList[j].type === TAG_END_WITH_TYPE &&
            tokenList[j].value === tagType
          ) {
            if (sameTypeTagStart === 0) {
              astNode.children = tokenList.slice(i + 2, j - i);
              tokenList.splice(j, 1);
              break;
            } else {
              sameTypeTagStart -= 1;
            }
          }
          if (
            tokenList[j] &&
            tokenList[j].type === TAG_START &&
            tokenList[j].value === tagType
          ) {
            sameTypeTagStart += 1;
          }
          j++;
        }

        astNode.children = parserNotSelfCloseTag(astNode.children);
        tokenList.splice(i, j, astNode);
      }
    }
  }

  return tokenList;
};

const htmlParser = (str) => {
  const strArr = splitHtmlStr(str);

  const tokenList = strArr.map((n) => {
    if (TOKEN_TYPES[n]) return TOKEN_TYPES[n];
    return { type: "TEXT", value: n };
  });

  const ast = parserSelfCloseTag(tokenList);

  return parserNotSelfCloseTag(ast);
};
