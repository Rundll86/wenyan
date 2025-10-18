import { WenyanError } from "../../common/exceptions";
import { Environment, ClassType, ValueDescriptor, FunctionDescriptor, FunctionExecutor } from "../../common/structs";
import { Node, NodeType, ProgramNode, ImportDeclarationNode, FunctionDeclarationNode, ReturnStatementNode, FunctionCallNode, ExpressionNode, IdentifierNode, StringLiteralNode, NumberLiteralNode, VariableDeclarationNode, VariableAssignmentNode } from "../../compiler/ast";
import { Runtime } from "../index";

// 导出 Environment 以便其他模块使用
export { Environment };

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
                rawValue: true,
                attributes: {},
                methods: {
                    '转为数': {
                        builtin: {
                            executor: (args: Record<string, unknown>, vm?: VM) => {
                                const value = args['值'] as string;
                                const num = Number(value);
                                if (isNaN(num)) {
                                    throw new WenyanError('不能转换为数字');
                                }
                                return num;
                            },
                            parameters: []
                        }
                    }
                }
            },
            '数': {
                rawValue: true,
                attributes: {},
                methods: {
                    '转为文言': {
                        builtin: {
                            executor: (args: Record<string, unknown>, vm?: VM) => {
                                const value = args['值'] as number;
                                return String(value);
                            },
                            parameters: []
                        }
                    }
                }
            },
            '阴阳': {
                rawValue: true,
                attributes: {},
                methods: {}
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
    private executeVariableDeclaration(node: VariableDeclarationNode): ValueDescriptor {
        const rawValue = this.executeNode(node.value);
        const typeClass = this.environment.classes[node.typeName];
        if (!typeClass) {
            throw new WenyanError(`未明其类「${node.typeName}」`);
        }
        
        // 处理值，根据类型系统转换
        let processedValue = rawValue;
        if (node.typeName === '文言' && typeof rawValue !== 'string') {
            processedValue = String(rawValue);
        } else if (node.typeName === '数' && typeof rawValue !== 'number') {
            const num = Number(rawValue);
            if (isNaN(num)) {
                throw new WenyanError(`值属「${rawValue}」，难化为「${node.typeName}」`);
            }
            processedValue = num;
        } else if (node.typeName === '阴阳') {
            // 对于阴阳类型，确保转换为布尔值
            processedValue = Boolean(rawValue);
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
        
        // 查找变量并获取其类型
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
        
        // 创建新的ValueDescriptor
        let valueDescriptor: ValueDescriptor;
        if (existingVar) {
            // 保持原类型，转换值
            let processedValue = rawValue;
            if (existingVar.type === '文言' && typeof rawValue !== 'string') {
                processedValue = String(rawValue);
            } else if (existingVar.type === '数' && typeof rawValue !== 'number') {
                const num = Number(rawValue);
                if (isNaN(num)) {
                    throw new WenyanError(`值属「${rawValue}」，难化为「${existingVar.type}」`);
                }
                processedValue = num;
            } else if (existingVar.type === '阴阳') {
                // 对于阴阳类型，确保转换为布尔值
                processedValue = Boolean(rawValue);
            }
            
            valueDescriptor = {
                type: existingVar.type,
                value: processedValue
            };
        } else {
            // 推断类型
            let type = '数';
            if (typeof rawValue === 'string') type = '文言';
            else if (typeof rawValue === 'boolean' || rawValue === 1 || rawValue === 0) type = '阴阳';
            
            let value = rawValue;
            if (type === '阴阳' && typeof rawValue === 'number') {
                value = Boolean(rawValue);
            }
            
            valueDescriptor = {
                type,
                value
            };
        }
        
        // 赋值
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
        const module = this.runtime.loadModule(moduleName);
        if (!module) {
            throw new WenyanError(`构件「${moduleName}」加载无果`);
        }
        
        const importedSymbols: Record<string, unknown> = {};
        
        // 处理整个模块导入
        if (typeof module === 'object' && module !== null) {
            const typedModule = module as Partial<Environment>;
            // 导入模块中的函数
            if (typedModule.functions && typeof typedModule.functions === 'object' && typedModule.functions !== null) {
                for (const symbol of symbols) {
                    if (symbol in typedModule.functions) {
                        const funcDescriptor = typedModule.functions[symbol];
                        this.environment.functions[symbol] = funcDescriptor;
                        importedSymbols[symbol] = funcDescriptor;
                    } else {
                        throw new WenyanError(`「${symbol}」未建于构件「${moduleName}」之内`);
                    }
                }
            }
            // 导入模块中的变量
            if (typedModule.variables && typeof typedModule.variables === 'object' && typedModule.variables !== null && symbols.length > 0) {
                for (const symbol of symbols) {
                    const isInFunctions = typedModule.functions && symbol in typedModule.functions;
                    if (symbol in typedModule.variables && !isInFunctions) {
                        this.environment.variables[symbol] = typedModule.variables[symbol];
                        importedSymbols[symbol] = typedModule.variables[symbol];
                    }
                }
            }
        } else {
            // 向后兼容旧模块格式
            for (const symbol of symbols) {
                if (symbol in module) {
                    const moduleItem = module[symbol];
                    if (typeof moduleItem === "function") {
                        this.environment.functions[symbol] = {
                            builtin: {
                                executor: moduleItem as FunctionExecutor,
                                parameters: []
                            }
                        };
                    }
                    importedSymbols[symbol] = moduleItem;
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
        
        // 准备参数
        for (const [key, valueNode] of Object.entries(args)) {
            const value = this.executeNode(valueNode);
            // 如果是ValueDescriptor，使用其实际值
            preparedArgs[key] = value && typeof value === 'object' && 'value' in value ? 
                              (value as ValueDescriptor).value : value;
        }
        
        // 处理内置函数
        if (funcDescriptor.builtin) {
            const { executor, parameters } = funcDescriptor.builtin;
            
            // 参数类型检查
            for (const param of parameters) {
                if (param.name in preparedArgs) {
                    const argValue = preparedArgs[param.name];
                    const typeClass = this.environment.classes[param.type];
                    
                    if (!typeClass) {
                        throw new WenyanError(`未明其类「${param.type}」`);
                    }
                    
                    // 进行类型转换和验证
                    let processedValue = argValue;
                    if (param.type === '文言' && typeof argValue !== 'string') {
                        processedValue = String(argValue);
                    } else if (param.type === '数' && typeof argValue !== 'number') {
                        const num = Number(argValue);
                        if (isNaN(num)) {
                            throw new WenyanError(`参属「${argValue}」，难化为「${param.type}」`);
                        }
                        processedValue = num;
                    } else if (param.type === '阴阳' && typeof argValue !== 'boolean') {
                        processedValue = Boolean(argValue);
                    }
                    
                    preparedArgs[param.name] = processedValue;
                }
            }
            
            return executor(preparedArgs, this);
        }
        // 处理用户定义函数
        else if (funcDescriptor.ast) {
            // 复用executeFunctionDeclaration中的逻辑
            // 创建函数执行器并调用
            const funcExecutor = (args: Record<string, unknown>, vm: VM = this) => {
                // 创建新环境，继承父环境的变量、函数和类
                const newEnv: Partial<Environment> = {
                    variables: {}, // 函数内的变量应该是空的，在执行过程中定义
                    functions: { ...vm.environment.functions },
                    classes: { ...vm.environment.classes },
                    modules: { ...vm.environment.modules },
                    parent: vm.environment // 设置父环境引用，实现作用域链
                };
                const functionVM = new VM(this.runtime, newEnv);

                // 处理参数
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
                            
                            // 处理参数值
                            let processedValue = argValue;
                            if (typeof argValue === "string" && vm.environment.functions[argValue]) {
                                // 函数引用
                                processedValue = vm.environment.functions[argValue];
                                functionVM.environment.variables[paramName] = {
                                    type: '函数',
                                    value: processedValue
                                };
                            } else {
                                // 根据类型转换值
                                if (paramTypeName === '文言' && typeof argValue !== 'string') {
                                    processedValue = String(argValue);
                                } else if (paramTypeName === '数' && typeof argValue !== 'number') {
                                    const num = Number(argValue);
                                    if (isNaN(num)) {
                                        throw new WenyanError(`参属「${argValue}」，难化为「${paramTypeName}」`);
                                    }
                                    processedValue = num;
                                } else if (paramTypeName === '阴阳' && typeof argValue !== 'boolean') {
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
                
                // 执行函数体
                let result: unknown = undefined;
                if (funcDescriptor.ast) {
                    for (const statement of funcDescriptor.ast.body) {
                        result = functionVM.executeNode(statement);
                        if (statement.type === NodeType.RETURN_STATEMENT) {
                            // 处理返回值，确保是原始值
                            if (result && typeof result === 'object' && 'value' in result) {
                                return (result as ValueDescriptor).value;
                            }
                            return result;
                        }
                    }
                }
                
                // 处理返回值
                if (result && typeof result === 'object' && 'value' in result) {
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
        
        // 特殊处理阴阳类型字面量
        if (name === "是") {
            return true;
        } else if (name === "否") {
            return false;
        }
        
        // 先在当前环境查找
        if (this.environment.variables[name] !== undefined) {
            const valueDescriptor = this.environment.variables[name] as ValueDescriptor;
            // 返回值而不是描述符
            return valueDescriptor.value;
        }
        
        // 如果当前环境没有，在父环境中查找
        let currentEnv = this.environment;
        while (currentEnv.parent) {
            currentEnv = currentEnv.parent;
            if (currentEnv.variables[name] !== undefined) {
                const valueDescriptor = currentEnv.variables[name] as ValueDescriptor;
                return valueDescriptor.value;
            }
        }
        
        // 查找函数
        if (this.environment.functions[name] !== undefined) {
            return this.environment.functions[name];
        }
        
        throw new WenyanError(`尚未建量「${name}」`);
    }
    public setVariable(name: string, value: unknown, type: string = '数'): void {
        // 推断类型
        if (!type) {
            if (typeof value === 'string') type = '文言';
            else if (typeof value === 'boolean') type = '阴阳';
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
        if (typeof func === 'function') {
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
        const { name, parameters, body } = node;
        
        // 创建函数描述符，只需存储AST即可，执行器逻辑在调用时动态创建
        const funcDescriptor: FunctionDescriptor = {
            ast: node
        };
        
        this.environment.functions[name] = funcDescriptor;
    }
    private executeReturnStatement(node: ReturnStatementNode): unknown {
        return this.executeNode(node.expression);
    }
}