import { WenyanError } from "../../common/exceptions";
import { Node, NodeType, ProgramNode, ImportDeclarationNode, FunctionDeclarationNode, ReturnStatementNode, FunctionCallNode, ExpressionNode, IdentifierNode, StringLiteralNode, NumberLiteralNode, VariableDeclarationNode, VariableAssignmentNode } from "../../compiler/ast";
import { Runtime } from "../index";

export interface ClassType {
    name: string;
    validate: (value: unknown) => boolean;
    create: (value: unknown) => unknown;
}

export interface Environment {
    variables: Record<string, unknown>;
    functions: Record<string, (args: Record<string, unknown>, vm?: VM) => unknown>;
    classes: Record<string, ClassType>;
    modules: Record<string, Record<string, unknown>>;
    parent?: Environment;
}
export class VM {
    private runtime: Runtime;
    private environment: Environment;
    constructor(runtime: Runtime, env?: Partial<Environment>) {
        this.runtime = runtime;
        this.environment = {
            variables: env?.variables || {},
            functions: env?.functions || {},
            classes: env?.classes || this.createBuiltinClasses(),
            modules: env?.modules || {},
        };
    }

    private createBuiltinClasses(): Record<string, ClassType> {
        return {
            '文言': {
                name: '文言',
                validate: (value): boolean => typeof value === 'string',
                create: (value): unknown => String(value)
            },
            '数': {
                name: '数',
                validate: (value): boolean => typeof value === 'number' && !isNaN(value),
                create: (value): unknown => {
                    const num = Number(value);
                    if (isNaN(num)) {
                        throw new WenyanError('不能转换为数字');
                    }
                    return num;
                }
            },
            '阴阳': {
                name: '阴阳',
                validate: (value): boolean => typeof value === 'boolean',
                create: (value): unknown => Boolean(value)
            }
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
            case NodeType.VARIABLE_DECLARATION:
                return this.executeVariableDeclaration(node as VariableDeclarationNode);
            case NodeType.VARIABLE_ASSIGNMENT:
                return this.executeVariableAssignment(node as VariableAssignmentNode);
            default:
                throw new WenyanError(`抽象语法树无效，未知节点之型「${node.type}」`);
        }
    }
    private executeVariableDeclaration(node: VariableDeclarationNode): unknown {
        const value = this.executeNode(node.value);
        const typeClass = this.environment.classes[node.typeName];
        if (!typeClass) {
            throw new WenyanError(`未明其类「${node.typeName}」`);
        }
        const processedValue = typeClass.create(value);
        if (!typeClass.validate(processedValue)) {
            throw new WenyanError(`值属「${processedValue}」，难化为「${node.typeName}」`);
        }
        this.environment.variables[node.name] = processedValue;
        return processedValue;
    }
    private executeVariableAssignment(node: VariableAssignmentNode): unknown {
        const value = this.executeNode(node.value);
        if (node.name in this.environment.variables) {
            this.environment.variables[node.name] = value;
        } else {
            let currentEnv = this.environment;
            while (currentEnv.parent && !(node.name in currentEnv.parent.variables)) {
                currentEnv = currentEnv.parent;
            }
            if (currentEnv.parent && node.name in currentEnv.parent.variables) {
                currentEnv.parent.variables[node.name] = value;
            } else {
                this.environment.variables[node.name] = value;
            }
        }
        return value;
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
        const func = this.environment.functions[name];
        if (!func) {
            throw new WenyanError(`尚未建「${name}」之涵义`);
        }
        const preparedArgs: Record<string, unknown> = {};
        for (const [key, valueNode] of Object.entries(args)) {
            preparedArgs[key] = this.executeNode(valueNode);
        }
        return func(preparedArgs, this);
    }
    private executeExpression(node: ExpressionNode): unknown {
        const { left, operator, right } = node;
        const leftValue = this.executeNode(left);
        const rightValue = this.executeNode(right);
        const operatorMap: Record<string, (a: number, b: number) => number> = {
            "加": (a, b) => a + b,
            "减": (a, b) => a - b,
            "乘": (a, b) => a * b,
            "除": (a, b) => a / b,
            "幂": Math.pow,
            "模": (a, b) => a % b
        };
        if (operator in operatorMap) {
            const leftNum = Number(leftValue);
            const rightNum = Number(rightValue);
            return operatorMap[operator](leftNum, rightNum);
        }
        const operatorFunction = this.environment.functions[operator];
        if (operatorFunction) {
            return operatorFunction({ "左": leftValue, "右": rightValue }, this);
        }
        throw new WenyanError(`未知算符「${operator}」且无对其涵义。`);
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
                classes: { ...vm.environment.classes },
                modules: { ...vm.environment.modules }
            };
            const functionVM = new VM(this.runtime, newEnv);

            for (const param of parameters) {
                const paramName = param.name;
                const paramTypeName = param.typeName;
                if (paramName in args) {
                    const argValue = args[paramName];
                    const typeClass = vm.environment.classes[paramTypeName];
                    if (!typeClass) {
                        throw new WenyanError(`未明其类「${paramTypeName}」`);
                    }
                    let processedValue = argValue;
                    if (typeof argValue === "string" && vm.environment.functions[argValue]) {
                        processedValue = vm.environment.functions[argValue];
                    } else {
                        processedValue = typeClass.create(argValue);
                        if (!typeClass.validate(processedValue)) {
                            throw new WenyanError(`参属「${processedValue}」，难化为「${paramTypeName}」`);
                        }
                    }
                    functionVM.setVariable(paramName, processedValue);
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