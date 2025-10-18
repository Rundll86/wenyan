import { ModuleLibrary } from "../common/structs";
import { Node, NodeType, ProgramNode } from "../compiler/ast";
import { VM, Environment } from "./vm";
import * as builtinRaws from "../runtime/builtins/lib";

export const builtins = builtinRaws as Record<string, ModuleLibrary>;
export type ModuleRegistry = Record<string, ModuleLibrary>;
export class Runtime {
    private vm: VM;
    private moduleRegistry: ModuleRegistry;
    private defaultEnvironment: Partial<Environment>;
    constructor() {
        this.moduleRegistry = {};
        this.defaultEnvironment = {};
        this.vm = new VM(this, this.defaultEnvironment);
        this.registerBuiltinModules();
        this.initializeDefaultEnvironment();
    }
    public execute(ast: Node | Node[]): unknown {
        if (Array.isArray(ast)) {
            const program: ProgramNode = {
                type: NodeType.PROGRAM,
                body: ast,
                line: 1,
                column: 1
            };
            return this.vm.execute(program);
        }
        if (ast.type === NodeType.PROGRAM) {
            return this.vm.execute(ast as ProgramNode);
        }
        const program: ProgramNode = {
            type: NodeType.PROGRAM,
            body: [ast],
            line: ast.line || 1,
            column: ast.column || 1
        };
        return this.vm.execute(program);
    }
    public loadModule(moduleName: string): ModuleLibrary | null {
        return this.moduleRegistry[moduleName] || null;
    }
    public registerModule(name: string, module: ModuleLibrary): void {
        this.moduleRegistry[name] = module;
    }
    private registerBuiltinModules(): void {
        this.loadBuiltinModule("志者");
    }
    private loadBuiltinModule(moduleName: string): void {
        const module = builtins[moduleName];
        if (module) {
            this.registerModule(moduleName, module);
        }
    }
    public getVM(): VM {
        return this.vm;
    }
    public createContext(env?: Partial<Environment>): VM {
        const newVM = new VM(this, {
            ...this.defaultEnvironment,
            ...env
        });
        return newVM;
    }

    private initializeDefaultEnvironment(): void {
        // 初始化基本的运算符函数
        const basicOperators = {
            "加": (args: Record<string, unknown>) => Number(args["左"]) + Number(args["右"]),
            "减": (args: Record<string, unknown>) => Number(args["左"]) - Number(args["右"]),
            "乘": (args: Record<string, unknown>) => Number(args["左"]) * Number(args["右"]),
            "除": (args: Record<string, unknown>) => Number(args["左"]) / Number(args["右"]),
            "幂": (args: Record<string, unknown>) => Math.pow(Number(args["左"]), Number(args["右"])),
            "模": (args: Record<string, unknown>) => Number(args["左"]) % Number(args["右"])
        };
        Object.entries(basicOperators).forEach(([name, func]) => {
            this.vm.registerFunction(name, func as (args: Record<string, unknown>) => unknown);
        });
    }
}
export { VM };
