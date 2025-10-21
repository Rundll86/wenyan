import { ModuleLibrary } from "../../../common/structs";
import readlineSync from "readline-sync";

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
        },
        问: {
            builtin: {
                parameters: [{
                    type: "文言",
                    name: "题",
                }],
                executor(args) {
                    return readlineSync.question(args.题);
                }
            }
        }
    }
} satisfies ModuleLibrary;