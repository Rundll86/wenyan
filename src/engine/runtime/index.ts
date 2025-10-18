import { Node, NodeType, ProgramNode } from "../compiler/ast";
import { VM, Environment } from "./vm";

// 模块注册表
type ModuleRegistry = Record<string, Record<string, any>>;

// 运行时类
export class Runtime {
    private vm: VM;
    private moduleRegistry: ModuleRegistry;
    private defaultEnvironment: Partial<Environment>;

    constructor() {
        this.moduleRegistry = {};
        this.defaultEnvironment = {};

        // 创建虚拟机实例
        this.vm = new VM(this, this.defaultEnvironment);

        // 注册内置模块
        this.registerBuiltinModules();
    }

    // 从AST执行代码
    public execute(ast: Node | Node[]): any {
        // 如果是节点数组，创建ProgramNode
        if (Array.isArray(ast)) {
            const program: ProgramNode = {
                type: NodeType.PROGRAM,
                body: ast,
                line: 1,
                column: 1
            };
            return this.vm.execute(program);
        }

        // 如果已经是ProgramNode，直接执行
        if (ast.type === NodeType.PROGRAM) {
            return this.vm.execute(ast as ProgramNode);
        }

        // 单个节点，创建包含它的ProgramNode
        const program: ProgramNode = {
            type: NodeType.PROGRAM,
            body: [ast],
            line: ast.line || 1,
            column: ast.column || 1
        };

        return this.vm.execute(program);
    }

    // 加载模块
    public loadModule(moduleName: string): Record<string, any> | null {
        return this.moduleRegistry[moduleName] || null;
    }

    // 注册模块
    public registerModule(name: string, module: Record<string, any>): void {
        this.moduleRegistry[name] = module;
    }

    // 注册内置模块
    private registerBuiltinModules(): void {
        // 只注册志者模块
        try {
            this.loadBuiltinModule("志者");
        } catch (error) {
            console.error("注册内置模块失败:", error);
        }
    }

    // 加载内置模块
    private loadBuiltinModule(moduleName: string): void {
        try {
            // 动态导入内置模块文件
            let module;

            // 根据模块名称导入对应的模块文件
            if (moduleName === "志者") {
                module = require("./builtins/志者");
            } else {
                console.warn(`未知的内置模块: ${moduleName}`);
                return;
            }

            // 确保模块被正确导入
            if (module && module.default) {
                this.registerModule(moduleName, module.default);
            } else if (module) {
                this.registerModule(moduleName, module);
            }

            console.log(`内置模块 ${moduleName} 已加载`);
        } catch (error) {
            console.error(`加载内置模块 ${moduleName} 失败:`, error);

            // 加载失败时提供回退实现
            this.provideFallbackModule(moduleName);
        }
    }

    // 提供回退模块实现（当动态导入失败时）
    private provideFallbackModule(moduleName: string): void {
        if (moduleName === "志者") {
            this.registerModule("志者", {
                "曰": (args: Record<string, any>) => {
                    const 内容 = args["内容"] || Object.values(args)[0];
                    console.log(内容);
                    return 内容;
                },
                "倾": () => {
                    const readline = require("readline-sync");
                    return readline.question("");
                }
            });
        }
    }

    // 获取虚拟机实例
    public getVM(): VM {
        return this.vm;
    }

    // 创建新的执行环境
    public createContext(env?: Partial<Environment>): VM {
        return new VM(this, {
            ...this.defaultEnvironment,
            ...env
        });
    }
}