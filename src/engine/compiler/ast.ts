// 抽象语法树定义

// 令牌类型
export enum TokenType {
    // 关键字
    IMPORT = 'IMPORT',        // 导入
    FUNCTION = 'FUNCTION',    // 函数定义（涵义）
    PARAM = 'PARAM',          // 参数（需知）
    RETURN = 'RETURN',        // 返回（求）
    CALL = 'CALL',            // 函数调用
    KNOWN = 'KNOWN',          // 已知
    AS = 'AS',                // 为
    FROM = 'FROM',            // 从

    // 标识符和字面量
    IDENTIFIER = 'IDENTIFIER',  // 标识符
    STRING = 'STRING',          // 字符串字面量
    NUMBER = 'NUMBER',          // 数字字面量

    // 符号
    LEFT_BRACKET = 'LEFT_BRACKET',    // 【
    RIGHT_BRACKET = 'RIGHT_BRACKET',  // 】
    COLON = 'COLON',                  // ：
    PERIOD = 'PERIOD',                // 。
    COMMA = 'COMMA',                  // ，
    DOUBLE_QUOTE = 'DOUBLE_QUOTE',    // "
    IMPORT_SYMBOL = 'IMPORT_SYMBOL',  // 《》
}
export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
}
export enum NodeType {
    PROGRAM = 'PROGRAM',
    IMPORT_DECLARATION = 'IMPORT_DECLARATION',
    FUNCTION_DECLARATION = 'FUNCTION_DECLARATION',
    FUNCTION_CALL = 'FUNCTION_CALL',
    PARAMETER = 'PARAMETER',
    RETURN_STATEMENT = 'RETURN_STATEMENT',
    EXPRESSION = 'EXPRESSION',
    IDENTIFIER = 'IDENTIFIER',
    STRING_LITERAL = 'STRING_LITERAL',
    NUMBER_LITERAL = 'NUMBER_LITERAL',
}
export interface Node {
    type: NodeType;
    line: number;
    column: number;
}
export interface ProgramNode extends Node {
    type: NodeType.PROGRAM;
    body: Node[];
}
export interface ImportDeclarationNode extends Node {
    type: NodeType.IMPORT_DECLARATION;
    moduleName: string;
    symbols: string[];
}
export interface FunctionDeclarationNode extends Node {
    type: NodeType.FUNCTION_DECLARATION;
    name: string;
    parameters: ParameterNode[];
    body: Node[];
}
export interface ParameterNode extends Node {
    type: NodeType.PARAMETER;
    typeName: string;
    name: string;
}
export interface FunctionCallNode extends Node {
    type: NodeType.FUNCTION_CALL;
    name: string;
    arguments: { [key: string]: Node };
}
export interface ReturnStatementNode extends Node {
    type: NodeType.RETURN_STATEMENT;
    expression: Node;
}
export interface ExpressionNode extends Node {
    type: NodeType.EXPRESSION;
    left: Node;
    operator: string;
    right: Node;
}
export interface IdentifierNode extends Node {
    type: NodeType.IDENTIFIER;
    name: string;
}
export interface StringLiteralNode extends Node {
    type: NodeType.STRING_LITERAL;
    value: string;
}
export interface NumberLiteralNode extends Node {
    type: NodeType.NUMBER_LITERAL;
    value: number;
}