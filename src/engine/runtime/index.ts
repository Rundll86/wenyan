import { Environment, ModuleLibrary, ValueDescriptor } from "../common/structs";
import { Node, NodeType, ProgramNode } from "../compiler/ast";
import { VM } from "./vm";
import * as builtinRaws from "./builtins/lib";

export const builtins = builtinRaws as Record<string, { default: ModuleLibrary }>;
export type ModuleRegistry = Record<string, ModuleLibrary>;
export class Runtime {
    private vm: VM;
    private moduleRegistry: ModuleRegistry;
    private defaultEnvironment: Partial<Environment>;
    constructor() {
        this.moduleRegistry = {};
        this.defaultEnvironment = this.initDefaultEnvironment();
        this.vm = new VM(this, this.defaultEnvironment);
        this.registerBuiltinModules();
    }

    private initDefaultEnvironment(): Partial<Environment> {
        return {
            classes: {
                '文言': {
                    asRawValue: {
                        validate: () => true,
                        cast: (value: ValueDescriptor) => String(value.value)
                    },
                    attributes: {},
                    methods: {}
                },
                '数': {
                    asRawValue: {
                        validate: (value: ValueDescriptor) => {
                            const num = Number(value.value);
                            return !isNaN(num) && isFinite(num);
                        },
                        cast: (value: ValueDescriptor) => Number(value.value)
                    },
                    attributes: {},
                    methods: {}
                },
                '阴阳': {
                    asRawValue: {
                        validate: () => true,
                        cast: (value: ValueDescriptor) => Boolean(value.value)
                    },
                    attributes: {},
                    methods: {}
                }
            }
        };
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
    public registerModule(name: string, module: any): void {
        this.moduleRegistry[name] = module;
    }
    private registerBuiltinModules(): void {
        this.loadBuiltinModule("志者");
    }
    private loadBuiltinModule(moduleName: string): void {
        const module = builtins[moduleName].default;
        if (module) {
            const actualModule = module;
            this.registerModule(moduleName, actualModule);
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
}
export { VM };
