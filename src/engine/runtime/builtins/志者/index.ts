import { ModuleLibrary } from "../../../common/structs";

export default {
    functions: {
        曰: {
            builtin: {
                parameters: [{
                    type: "文言",
                    name: "文",
                }],
                executor(args) {
                    console.log(args.文);
                }
            }
        }
    }
} satisfies ModuleLibrary;