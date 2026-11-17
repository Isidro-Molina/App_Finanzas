module.exports = function (api) {
  const isTest = api.env('test');
  api.cache(() => isTest);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      ...(!isTest ? ["nativewind/babel"] : []),
    ],
  };
};
