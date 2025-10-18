import { Environment } from "../../../common/structs";

export default {
    functions: {
        曰: {
            builtin: {
                parameters: [{
                    type: "文言",
                    name: "文",
                }],
                executor(args, vm) {
                    console.log(args.文);
                    console.log(vm.getEnvironment());
                }
            }
        }
    }
} satisfies Partial<Environment>;