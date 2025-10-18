import { ModuleLibrary } from "../common/structs";
import { Node, NodeType, ProgramNode } from "../compiler/ast";
import { VM, Environment } from "./vm";
import * as builtinLibs from "../runtime/builtins/lib";

export const builtins = builtinLibs as Record<string, ModuleLibrary>;
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
        return new VM(this, {
            ...this.defaultEnvironment,
            ...env
        });
    }
}
export { VM };
