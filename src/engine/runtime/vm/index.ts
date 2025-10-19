import { WenyanError } from "../../common/exceptions";
import { Environment, ValueDescriptor, FunctionDescriptor, FunctionExecutor, ModuleLibrary } from "../../common/structs";
import { Node, NodeType, ProgramNode, ImportDeclarationNode, FunctionDeclarationNode, ReturnStatementNode, FunctionCallNode, ExpressionNode, IdentifierNode, StringLiteralNode, NumberLiteralNode, VariableDeclarationNode, VariableAssignmentNode } from "../../compiler/ast";
import { FALSY, TRUTHY } from "../../compiler/defines/characters";
import { Runtime } from "../index";

export class VM {
    runtime: Runtime;
    environment: Environment;
    constructor(runtime: Runtime, env: Partial<Environment> = {}) {
        this.runtime = runtime;
        this.environment = {
            variables: env.variables || {},
            functions: env.functions || {},
            classes: env.classes || {},
            modules: env.modules || {},
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
    private executeVariableDeclaration(node: VariableDeclarationNode): ValueDescriptor {
        const rawValue = this.executeNode(node.value);
        const typeClass = this.environment.classes[node.typeName];
        if (!typeClass) {
            throw new WenyanError(`未明其类「${node.typeName}」`);
        }
        let processedValue = rawValue;
        const tempValueDescriptor: ValueDescriptor = {
            type: "未知",
            value: rawValue
        };
        if (typeClass.asRawValue) {
            if (!typeClass.asRawValue.validate(tempValueDescriptor)) {
                throw new WenyanError(`值属「${rawValue}」，难化为「${node.typeName}」`);
            }
            processedValue = typeClass.asRawValue.cast(tempValueDescriptor);
        }
        const valueDescriptor: ValueDescriptor = {
            type: node.typeName,
            value: processedValue
        };
        this.environment.variables[node.name] = valueDescriptor;
        return valueDescriptor;
    }
    private executeVariableAssignment(node: VariableAssignmentNode): ValueDescriptor {
        const rawValue = this.executeNode(node.value);
        let targetEnv = this.environment;
        let existingVar: ValueDescriptor | undefined = targetEnv.variables[node.name];
        if (!existingVar && targetEnv.parent) {
            while (targetEnv.parent && !(node.name in targetEnv.parent.variables)) {
                targetEnv = targetEnv.parent;
            }
            if (targetEnv.parent) {
                existingVar = targetEnv.parent.variables[node.name];
            }
        }
        let valueDescriptor: ValueDescriptor;
        if (existingVar) {
            let processedValue = rawValue;
            const targetTypeClass = this.environment.classes[existingVar.type];
            const tempValueDescriptor: ValueDescriptor = {
                type: "未知",
                value: rawValue
            };
            if (targetTypeClass?.asRawValue) {
                if (!targetTypeClass.asRawValue.validate(tempValueDescriptor)) {
                    throw new WenyanError(`值属「${rawValue}」，难化为「${existingVar.type}」`);
                }
                processedValue = targetTypeClass.asRawValue.cast(tempValueDescriptor);
            }
            valueDescriptor = {
                type: existingVar.type,
                value: processedValue
            };
        } else {
            let type = "数";
            if (typeof rawValue === "string") type = "文言";
            else if (typeof rawValue === "boolean" || rawValue === 1 || rawValue === 0) type = "阴阳";
            let value = rawValue;
            if (type === "阴阳" && typeof rawValue === "number") {
                value = Boolean(rawValue);
            }
            valueDescriptor = {
                type,
                value
            };
        }
        if (node.name in this.environment.variables) {
            this.environment.variables[node.name] = valueDescriptor;
        } else if (targetEnv.parent && node.name in targetEnv.parent.variables) {
            targetEnv.parent.variables[node.name] = valueDescriptor;
        } else {
            this.environment.variables[node.name] = valueDescriptor;
        }
        return valueDescriptor;
    }
    private executeImportDeclaration(node: ImportDeclarationNode): Record<string, unknown> {
        const { moduleName, symbols } = node;
        const currentModule = this.runtime.loadModule(moduleName);
        if (!currentModule) {
            throw new WenyanError(`构件「${moduleName}」加载无果`);
        }
        const allSymbols = this.getModuleAllSymbols(currentModule);
        symbols.forEach(symbol => {
            if (!allSymbols.includes(symbol)) {
                throw new WenyanError(`「${symbol}」未建于构件「${moduleName}」之内`);
            }
        });
        const importedSymbols: Record<string, unknown> = {};
        if (currentModule.functions) {
            for (const symbol of symbols) {
                if (symbol in currentModule.functions) {
                    const funcDescriptor = currentModule.functions[symbol];
                    this.environment.functions[symbol] = funcDescriptor;
                    importedSymbols[symbol] = funcDescriptor;
                }
            }
        }
        if (currentModule.variables) {
            for (const symbol of symbols) {
                if (symbol in currentModule.variables) {
                    this.environment.variables[symbol] = currentModule.variables[symbol];
                    importedSymbols[symbol] = currentModule.variables[symbol];
                }
            }
        }
        return importedSymbols;
    }
    private executeFunctionCall(node: FunctionCallNode): unknown {
        const { name, arguments: args } = node;
        const funcDescriptor = this.environment.functions[name];
        if (!funcDescriptor) {
            throw new WenyanError(`尚未建「${name}」之涵义`);
        }
        const preparedArgs: Record<string, unknown> = {};
        for (const [key, valueNode] of Object.entries(args)) {
            const value = this.executeNode(valueNode);
            preparedArgs[key] = value && typeof value === "object" && "value" in value ?
                (value as ValueDescriptor).value : value;
        }
        if (funcDescriptor.builtin) {
            const { executor, parameters } = funcDescriptor.builtin;
            for (const param of parameters) {
                if (param.name in preparedArgs) {
                    const argValue = preparedArgs[param.name];
                    const typeClass = this.environment.classes[param.type];
                    if (!typeClass) {
                        throw new WenyanError(`未明其类「${param.type}」`);
                    }
                    let processedValue = argValue;
                    if (param.type === "文言" && typeof argValue !== "string") {
                        processedValue = String(argValue);
                    } else if (param.type === "数" && typeof argValue !== "number") {
                        const num = Number(argValue);
                        if (isNaN(num)) {
                            throw new WenyanError(`参属「${argValue}」，难化为「${param.type}」`);
                        }
                        processedValue = num;
                    } else if (param.type === "阴阳" && typeof argValue !== "boolean") {
                        processedValue = Boolean(argValue);
                    }
                    preparedArgs[param.name] = processedValue;
                }
            }
            return executor(preparedArgs, this);
        }
        else if (funcDescriptor.ast) {
            const funcExecutor = (args: Record<string, unknown>, vm: VM = this) => {
                const newEnv: Partial<Environment> = {
                    variables: {},
                    functions: { ...vm.environment.functions },
                    classes: { ...vm.environment.classes },
                    modules: { ...vm.environment.modules },
                    parent: vm.environment
                };
                const functionVM = new VM(this.runtime, newEnv);
                if (funcDescriptor.ast) {
                    for (const param of funcDescriptor.ast.parameters) {
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
                                functionVM.environment.variables[paramName] = {
                                    type: "函数",
                                    value: processedValue
                                };
                            } else {
                                if (paramTypeName === "文言" && typeof argValue !== "string") {
                                    processedValue = String(argValue);
                                } else if (paramTypeName === "数" && typeof argValue !== "number") {
                                    const num = Number(argValue);
                                    if (isNaN(num)) {
                                        throw new WenyanError(`参属「${argValue}」，难化为「${paramTypeName}」`);
                                    }
                                    processedValue = num;
                                } else if (paramTypeName === "阴阳" && typeof argValue !== "boolean") {
                                    processedValue = Boolean(argValue);
                                }
                                functionVM.environment.variables[paramName] = {
                                    type: paramTypeName,
                                    value: processedValue
                                };
                            }
                        } else {
                            throw new WenyanError(`用以「${name}」而缺「${paramName}」之值`);
                        }
                    }
                }
                let result: unknown = undefined;
                if (funcDescriptor.ast) {
                    for (const statement of funcDescriptor.ast.body) {
                        result = functionVM.executeNode(statement);
                        if (statement.type === NodeType.RETURN_STATEMENT) {
                            if (result && typeof result === "object" && "value" in result) {
                                return (result as ValueDescriptor).value;
                            }
                            return result;
                        }
                    }
                }
                if (result && typeof result === "object" && "value" in result) {
                    return (result as ValueDescriptor).value;
                }
                return result;
            };

            return funcExecutor(preparedArgs, this);
        }

        throw new WenyanError(`函数「${name}」未实现执行逻辑`);
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
        const operatorFuncDescriptor = this.environment.functions[operator];
        if (operatorFuncDescriptor && operatorFuncDescriptor.builtin && operatorFuncDescriptor.builtin.executor) {
            return operatorFuncDescriptor.builtin.executor({ "左": leftValue, "右": rightValue }, this);
        }
        throw new WenyanError(`未知算符「${operator}」且无对其涵义。`);
    }
    private resolveIdentifier(node: IdentifierNode): unknown {
        const { name } = node;
        if (name === TRUTHY) {
            return true;
        } else if (name === FALSY) {
            return false;
        }
        if (this.environment.variables[name] !== undefined) {
            const valueDescriptor = this.environment.variables[name] as ValueDescriptor;
            return valueDescriptor.value;
        }
        let currentEnv = this.environment;
        while (currentEnv.parent) {
            currentEnv = currentEnv.parent;
            if (currentEnv.variables[name] !== undefined) {
                const valueDescriptor = currentEnv.variables[name] as ValueDescriptor;
                return valueDescriptor.value;
            }
        }
        if (this.environment.functions[name] !== undefined) {
            return this.environment.functions[name];
        }
        throw new WenyanError(`尚未建量「${name}」`);
    }
    public setVariable(name: string, value: unknown, type: string = "数"): void {
        if (!type) {
            if (typeof value === "string") type = "文言";
            else if (typeof value === "boolean") type = "阴阳";
        }
        this.environment.variables[name] = {
            type,
            value
        };
    }
    public getVariable(name: string): unknown {
        const descriptor = this.environment.variables[name];
        return descriptor ? (descriptor as ValueDescriptor).value : undefined;
    }
    public registerFunction(name: string, func: FunctionExecutor | FunctionDescriptor): void {
        if (typeof func === "function") {
            this.environment.functions[name] = {
                builtin: {
                    executor: func,
                    parameters: []
                }
            };
        } else {
            this.environment.functions[name] = func;
        }
    }
    public getEnvironment(): Environment {
        return { ...this.environment };
    }
    private executeFunctionDeclaration(node: FunctionDeclarationNode): void {
        const { name } = node;
        const funcDescriptor: FunctionDescriptor = {
            ast: node
        };
        this.environment.functions[name] = funcDescriptor;
    }
    private executeReturnStatement(node: ReturnStatementNode): unknown {
        return this.executeNode(node.expression);
    }
    private flattenModule(module: ModuleLibrary): ModuleLibrary {
        const result: Environment = {
            variables: {},
            functions: {},
            classes: {},
            modules: {}
        };
        if (module.parent) {
            const parentResult = this.flattenModule(module.parent);
            if (parentResult.variables) {
                Object.assign(result.variables, parentResult.variables);
            }
            if (parentResult.functions) {
                Object.assign(result.functions, parentResult.functions);
            }
            if (parentResult.classes) {
                Object.assign(result.classes, parentResult.classes);
            }
            if (parentResult.modules) {
                Object.assign(result.modules, parentResult.modules);
            }
        }
        if (module.variables) {
            Object.assign(result.variables, module.variables);
        }
        if (module.functions) {
            Object.assign(result.functions, module.functions);
        }
        if (module.classes) {
            Object.assign(result.classes, module.classes);
        }
        if (module.modules) {
            Object.assign(result.modules, module.modules);
        }
        return result;
    }
    private getModuleAllSymbols(module: ModuleLibrary, andParent: boolean = true): string[] {
        const result = [];
        const full = andParent ? this.flattenModule(module) : module;
        if (full.variables) {
            result.push(...Object.keys(full.variables));
        }
        if (full.functions) {
            result.push(...Object.keys(full.functions));
        }
        if (full.classes) {
            result.push(...Object.keys(full.classes));
        }
        if (full.modules) {
            result.push(...Object.keys(full.modules));
        }
        return result;
    }
}