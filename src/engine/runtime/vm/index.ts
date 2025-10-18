import { Node, NodeType, ProgramNode, ImportDeclarationNode, FunctionCallNode, ExpressionNode, IdentifierNode, StringLiteralNode, NumberLiteralNode } from "../../compiler/ast";
import { Runtime } from "../index";

// 执行环境接口
export interface Environment {
  variables: Record<string, unknown>;
  functions: Record<string, (args: Record<string, unknown>, vm?: VM) => unknown>;
  modules: Record<string, Record<string, unknown>>;
}

// 虚拟机类，负责执行AST
export class VM {
    private runtime: Runtime;
    private environment: Environment;

    constructor(runtime: Runtime, env?: Partial<Environment>) {
        this.runtime = runtime;
        this.environment = {
            variables: env?.variables || {},
            functions: env?.functions || {},
            modules: env?.modules || {},
        };
    }

    // 执行整个程序
    public execute(program: ProgramNode): unknown {
        let result: unknown = null;
    
        for (const node of program.body) {
            result = this.executeNode(node);
        }
    
        return result;
    }

    // 执行单个节点
    public executeNode(node: Node): unknown {
        switch (node.type) {
        case NodeType.IMPORT_DECLARATION:
            return this.executeImportDeclaration(node as ImportDeclarationNode);
        case NodeType.FUNCTION_CALL:
            return this.executeFunctionCall(node as FunctionCallNode);
        case NodeType.EXPRESSION:
            return this.executeExpression(node as ExpressionNode);
        case NodeType.IDENTIFIER:
            return this.resolveIdentifier(node as IdentifierNode);
        case NodeType.STRING_LITERAL:
            return (node as StringLiteralNode).value;
        case NodeType.NUMBER_LITERAL:
            return (node as NumberLiteralNode).value;
        default:
            console.warn(`未实现的节点类型: ${NodeType[node.type]}`);
            return null;
        }
    }

    // 执行导入声明
    private executeImportDeclaration(node: ImportDeclarationNode): Record<string, unknown> {
        const { moduleName, symbols } = node;
    
        // 加载模块
        const module = this.runtime.loadModule(moduleName);
        if (!module) {
            throw new Error(`无法加载模块: ${moduleName}`);
        }
    
        // 将符号导入到当前环境
        const importedSymbols: Record<string, unknown> = {};
    
        for (const symbol of symbols) {
            if (symbol in module) {
                const moduleFunc = module[symbol];
                // 检查是否为函数，如果是则注册
                if (typeof moduleFunc === "function") {
                    this.environment.functions[symbol] = moduleFunc as (args: Record<string, unknown>, vm?: VM) => unknown;
                }
                importedSymbols[symbol] = moduleFunc;
            } else {
                console.warn(`模块 ${moduleName} 中未找到符号: ${symbol}`);
            }
        }
    
        return importedSymbols;
    }

    // 执行函数调用
    private executeFunctionCall(node: FunctionCallNode): unknown {
        const { name, arguments: args } = node;
    
        // 查找函数
        const func = this.environment.functions[name];
        if (!func) {
            throw new Error(`未定义的函数: ${name}`);
        }
    
        // 准备参数
        const preparedArgs: Record<string, unknown> = {};
        for (const [key, valueNode] of Object.entries(args)) {
            preparedArgs[key] = this.executeNode(valueNode);
        }
    
        // 调用函数
        return func(preparedArgs, this);
    }

    // 执行表达式
    private executeExpression(node: ExpressionNode): number {
        const { left, operator, right } = node;
    
        const leftValue = this.executeNode(left);
        const rightValue = this.executeNode(right);
    
        // 添加类型断言确保值为数字
        const leftNum = Number(leftValue);
        const rightNum = Number(rightValue);
    
        switch (operator) {
        case "加":
            return leftNum + rightNum;
        case "减":
            return leftNum - rightNum;
        case "乘":
            return leftNum * rightNum;
        case "除":
            return leftNum / rightNum;
        default:
            throw new Error(`未实现的操作符: ${operator}`);
        }
    }

    // 解析标识符
    private resolveIdentifier(node: IdentifierNode): unknown {
        const { name } = node;
    
        // 优先查找变量
        if (this.environment.variables[name] !== undefined) {
            return this.environment.variables[name];
        }
    
        // 查找函数
        if (this.environment.functions[name] !== undefined) {
            return this.environment.functions[name];
        }
    
        throw new Error(`未定义的标识符: ${name}`);
    }

    // 设置变量
    public setVariable(name: string, value: unknown): void {
        this.environment.variables[name] = value;
    }

    // 获取变量
    public getVariable(name: string): unknown {
        return this.environment.variables[name];
    }

    // 注册函数
    public registerFunction(name: string, func: (args: Record<string, unknown>, vm?: VM) => unknown): void {
        this.environment.functions[name] = func;
    }

    // 获取环境（用于测试或调试）
    public getEnvironment(): Environment {
        return { ...this.environment };
    }
}