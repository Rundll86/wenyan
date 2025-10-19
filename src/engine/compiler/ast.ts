export enum TokenType {
    IMPORT = "IMPORT",
    FUNCTION = "FUNCTION",
    PARAM = "PARAM",
    RETURN = "RETURN",
    CALL = "CALL",
    KNOWN = "KNOWN",
    AS = "AS",
    FROM = "FROM",
    WITH = "WITH",
    IDENTIFIER = "IDENTIFIER",
    STRING = "STRING",
    NUMBER = "NUMBER",
    LEFT_BRACKET = "LEFT_BRACKET",
    RIGHT_BRACKET = "RIGHT_BRACKET",
    COLON = "COLON",
    PERIOD = "PERIOD",
    COMMA = "COMMA",
    DOUBLE_QUOTE = "DOUBLE_QUOTE",
    IMPORT_SYMBOL = "IMPORT_SYMBOL",
    LET = "LET",
    IF = "IF",
    ELSE_IF = "ELSE_IF",
    ELSE = "ELSE",
    WHILE = "WHILE",
    WHEN = "WHEN",
    REPEAT = "REPEAT",
    TIMES = "TIMES",
    IS = "IS",
    IS_NOT = "IS_NOT",
    GREATER_OR_EQUAL = "GREATER_OR_EQUAL",
    LESS_OR_EQUAL = "LESS_OR_EQUAL",
    AND = "AND",
    OR = "OR",
}
export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
}
export enum NodeType {
    PROGRAM = "PROGRAM",
    IMPORT_DECLARATION = "IMPORT_DECLARATION",
    FUNCTION_DECLARATION = "FUNCTION_DECLARATION",
    FUNCTION_CALL = "FUNCTION_CALL",
    PARAMETER = "PARAMETER",
    RETURN_STATEMENT = "RETURN_STATEMENT",
    EXPRESSION = "EXPRESSION",
    IDENTIFIER = "IDENTIFIER",
    STRING_LITERAL = "STRING_LITERAL",
    NUMBER_LITERAL = "NUMBER_LITERAL",
    VARIABLE_DECLARATION = "VARIABLE_DECLARATION",
    VARIABLE_ASSIGNMENT = "VARIABLE_ASSIGNMENT",
    IF_STATEMENT = "IF_STATEMENT",
    WHILE_STATEMENT = "WHILE_STATEMENT",
    REPEAT_STATEMENT = "REPEAT_STATEMENT",
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

export interface VariableDeclarationNode extends Node {
    type: NodeType.VARIABLE_DECLARATION;
    typeName: string;
    name: string;
    value: Node;
}

export interface VariableAssignmentNode extends Node {
    type: NodeType.VARIABLE_ASSIGNMENT;
    name: string;
    value: Node;
}

export interface IfStatementNode extends Node {
    type: NodeType.IF_STATEMENT;
    condition: Node;
    body: Node[];
    elseIfs?: { condition: Node; body: Node[] }[];
    elseBody?: Node[];
}

export interface WhileStatementNode extends Node {
    type: NodeType.WHILE_STATEMENT;
    condition: Node;
    body: Node[];
}

export interface RepeatStatementNode extends Node {
    type: NodeType.REPEAT_STATEMENT;
    counterName: string;
    times: Node;
    body: Node[];
}