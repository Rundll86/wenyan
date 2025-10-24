// export * as 志者 from "./志者";
// export * as 天命也 from "./天命也";
// export * as 春秋 from "./春秋";
// export * as 四书五经 from "./四书五经";
const load = require.context("./", true, /\.ts$/);
load.keys().forEach((key) => {
    const module = load(key);
    if (module.default) {
        Object.assign(exports, module.default);
    }
});