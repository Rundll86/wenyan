import { WenyanError } from "../../common/exceptions";
import { Node, NodeType, ProgramNode, ImportDeclarationNode, FunctionDeclarationNode, ReturnStatementNode, FunctionCallNode, ExpressionNode, IdentifierNode, StringLiteralNode, NumberLiteralNode } from "../../compiler/ast";
import { Runtime } from "../index";

export interface Environment {
    variables: Record<string, unknown>;
    functions: Record<string, (args: Record<string, unknown>, vm?: VM) => unknown>;
    modules: Record<string, Record<string, unknown>>;
}
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
    public execute(program: ProgramNode): unknown {
        let result: unknown = null;
        for (const node of program.body) {
            result = this.executeNode(node);
        }
        return result;
    }
    public executeNode(node: Node): unknown {
        switch (node.type) {
            case NodeType.IMPORT_DECLARATION:
                return this.executeImportDeclaration(node as ImportDeclarationNode);
            case NodeType.FUNCTION_DECLARATION:
                return this.executeFunctionDeclaration(node as FunctionDeclarationNode);
            case NodeType.FUNCTION_CALL:
                return this.executeFunctionCall(node as FunctionCallNode);
            case NodeType.RETURN_STATEMENT:
                return this.executeReturnStatement(node as ReturnStatementNode);
            case NodeType.EXPRESSION:
                return this.executeExpression(node as ExpressionNode);
            case NodeType.IDENTIFIER:
                return this.resolveIdentifier(node as IdentifierNode);
            case NodeType.STRING_LITERAL:
                return (node as StringLiteralNode).value;
            case NodeType.NUMBER_LITERAL:
                return (node as NumberLiteralNode).value;
            default:
                throw new WenyanError(`未知节点类型「${node.type}」`);
        }
    }
    private executeImportDeclaration(node: ImportDeclarationNode): Record<string, unknown> {
        const { moduleName, symbols } = node;
        const module = this.runtime.loadModule(moduleName);
        if (!module) {
            throw new WenyanError(`构件「${moduleName}」加载无果`);
        }
        const importedSymbols: Record<string, unknown> = {};
        for (const symbol of symbols) {
            if (symbol in module) {
                const moduleFunc = module[symbol];
                if (typeof moduleFunc === "function") {
                    this.environment.functions[symbol] = moduleFunc as (args: Record<string, unknown>, vm?: VM) => unknown;
                }
                importedSymbols[symbol] = moduleFunc;
            } else {
                throw new WenyanError(`「${symbol}」未建于构件「${moduleName}」之内`);
            }
        }
        return importedSymbols;
    }
    private executeFunctionCall(node: FunctionCallNode): unknown {
        const { name, arguments: args } = node;
        
        // 获取函数
        const func = this.environment.functions[name];
        if (!func) {
            throw new WenyanError(`尚未建「${name}」之涵义`);
        }
        
        // 准备参数，确保正确处理嵌套的函数调用
        const preparedArgs: Record<string, unknown> = {};
        
        // 遍历所有参数，为每个参数执行对应的节点
        for (const [key, valueNode] of Object.entries(args)) {
            preparedArgs[key] = this.executeNode(valueNode);
        }
        
        // 执行函数并返回结果
        return func(preparedArgs, this);
    }
    private executeExpression(node: ExpressionNode): unknown {
        const { left, operator, right } = node;
        
        // 执行左右操作数
        const leftValue = this.executeNode(left);
        const rightValue = this.executeNode(right);
        
        // 优先处理基本运算符
        const operatorMap: Record<string, (a: number, b: number) => number> = {
            "加": (a, b) => a + b,
            "减": (a, b) => a - b,
            "乘": (a, b) => a * b,
            "除": (a, b) => a / b,
            "幂": Math.pow,
            "模": (a, b) => a % b
        };
        
        if (operator in operatorMap) {
            // 确保操作数是数字类型
            const leftNum = Number(leftValue);
            const rightNum = Number(rightValue);
            return operatorMap[operator](leftNum, rightNum);
        }
        
        // 然后再检查运算符是否是函数
        const operatorFunction = this.environment.functions[operator];
        if (operatorFunction) {
            return operatorFunction({ "左": leftValue, "右": rightValue }, this);
        }
        
        throw new WenyanError(`未知算符「${operator}」或无对应的操作函数`);
    }
    private resolveIdentifier(node: IdentifierNode): unknown {
        const { name } = node;
        if (this.environment.variables[name] !== undefined) {
            return this.environment.variables[name];
        }
        if (this.environment.functions[name] !== undefined) {
            return this.environment.functions[name];
        }
        throw new WenyanError(`尚未建量「${name}」`);
    }
    public setVariable(name: string, value: unknown): void {
        this.environment.variables[name] = value;
    }
    public getVariable(name: string): unknown {
        return this.environment.variables[name];
    }
    public registerFunction(name: string, func: (args: Record<string, unknown>, vm?: VM) => unknown): void {
        this.environment.functions[name] = func;
    }
    public getEnvironment(): Environment {
        return { ...this.environment };
    }
    private executeFunctionDeclaration(node: FunctionDeclarationNode): void {
        const { name, parameters, body } = node;
        const func = (args: Record<string, unknown>, vm: VM = this) => {
            const newEnv: Partial<Environment> = {
                variables: { ...vm.environment.variables },
                functions: { ...vm.environment.functions },
                modules: { ...vm.environment.modules }
            };
            const functionVM = new VM(this.runtime, newEnv);
            
            for (const param of parameters) {
                const paramName = param.name;
                if (paramName in args) {
                    const argValue = args[paramName];
                    // 如果参数值是字符串且是函数名，则直接保存函数引用
                    if (typeof argValue === "string" && vm.environment.functions[argValue]) {
                        functionVM.setVariable(paramName, vm.environment.functions[argValue]);
                    } else {
                        functionVM.setVariable(paramName, argValue);
                    }
                } else {
                    throw new WenyanError(`用以「${name}」而缺「${paramName}」之值`);
                }
            }
            let result: unknown = undefined;
            for (const statement of body) {
                result = functionVM.executeNode(statement);
                if (statement.type === NodeType.RETURN_STATEMENT) {
                    return result;
                }
            }
            return result;
        };
        this.registerFunction(name, func);
    }
    private executeReturnStatement(node: ReturnStatementNode): unknown {
        return this.executeNode(node.expression);
    }
}