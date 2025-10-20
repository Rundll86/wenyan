import { ModuleLibrary } from "../../../common/structs";

export default {
    functions: {
        随缘: {
            builtin: {
                parameters: [
                    {
                        type: "数",
                        name: "始"
                    },
                    {
                        type: "数",
                        name: "终"
                    }
                ],
                executor(args) {
                    const min = Number(args.始);
                    const max = Number(args.终);
                    return Math.floor(Math.random() * (max - min + 1)) + min;
                }
            }
        },
        掷币: {
            builtin: {
                parameters: [
                    {
                        type: "数",
                        name: "势"
                    }
                ],
                executor(args) {
                    return Math.random() < Number(args.势) / 100;
                }
            }
        }
    }
} satisfies ModuleLibrary;