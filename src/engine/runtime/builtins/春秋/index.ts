import { ModuleLibrary } from "../../../common/structs";

export default {
    functions: {
        为文言: {
            builtin: {
                parameters: [
                    {
                        type: "数",
                        name: "值"
                    }
                ],
                executor(args) {
                    return String(args.值);
                }
            }
        },
        为数: {
            builtin: {
                parameters: [
                    {
                        type: "文言",
                        name: "值"
                    }
                ],
                executor(args) {
                    return Number(args.值);
                }
            }
        },
        极化: {
            builtin: {
                parameters: [
                    {
                        type: "数",
                        name: "值"
                    }
                ],
                executor(args) {
                    return Boolean(args.值);
                }
            }
        }
    }
} satisfies ModuleLibrary;