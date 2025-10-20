import { WenyanError } from "../common/exceptions";
import { Token, TokenType, Node, NodeType, ProgramNode, ImportDeclarationNode, FunctionDeclarationNode, FunctionCallNode, ParameterNode, ReturnStatementNode, ExpressionNode, IdentifierNode, StringLiteralNode, NumberLiteralNode, VariableDeclarationNode, VariableAssignmentNode, IfStatementNode, WhileStatementNode, RepeatStatementNode } from "./ast";
import { FALSY, TRUTHY } from "./defines/characters";

export class Parser {
    private tokens: Token[];
    private position: number = 0;
    private length: number;
    constructor(tokens: Token[]) {
        this.tokens = tokens;
        this.length = tokens.length;
    }
    public parse(): ProgramNode {
        const program: ProgramNode = {
            type: NodeType.PROGRAM,
            body: [],
            line: 1,
            column: 1
        };
        while (this.position < this.length) {
            const node = this.parseStatement();
            if (node) {
                program.body.push(node);
            }
        }
        return program;
    }
    private parseStatement(): Node | null {
        if (!this.peek()) {
            return null;
        }

        if (this.peek()?.type === TokenType.IMPORT_SYMBOL) {
            return this.parseImportDeclaration();
        } else if (this.peek()?.type === TokenType.FUNCTION) {
            return this.parseFunctionDeclaration();
        } else if (this.peek()?.type === TokenType.RETURN) {
            return this.parseReturnStatement();
        } else if (this.peek()?.type === TokenType.LET) {
            return this.parseVariableStatement();
        } else if (this.peek()?.type === TokenType.IF) {
            return this.parseIfStatement();
        } else if (this.peek()?.type === TokenType.WHEN) {
            return this.parseWhileStatement();
        } else if (this.peek()?.type === TokenType.REPEAT || this.peek()?.type === TokenType.WITH) {
            return this.parseRepeatStatement();
        } else if (this.peek()?.type === TokenType.IDENTIFIER) {
            const savedPosition = this.position;
            const nextToken = this.lookAhead(1);
            const nextNextToken = this.lookAhead(2);
            const isFunctionCallPattern =
                (nextToken?.type === TokenType.COMMA &&
                    (nextNextToken?.type === TokenType.KNOWN ||
                        nextNextToken?.type === TokenType.LEFT_BRACKET ||
                        nextNextToken?.type === TokenType.IDENTIFIER)) ||
                (nextToken?.type === TokenType.KNOWN ||
                    nextToken?.type === TokenType.LEFT_BRACKET);
            try {
                if (isFunctionCallPattern) {
                    return this.parseFunctionCall();
                } else {
                    const expr = this.parseExpression();
                    if (this.peek()?.type === TokenType.PERIOD) {
                        this.consume();
                    }
                    return expr;
                }
            } catch {
                this.position = savedPosition;
                try {
                    if (isFunctionCallPattern) {
                        const expr = this.parseExpression();
                        if (this.peek()?.type === TokenType.PERIOD) {
                            this.consume();
                        }
                        return expr;
                    } else {
                        return this.parseFunctionCall();
                    }
                } catch {
                    this.position = savedPosition;
                    try {
                        return this.parseExpression();
                    } catch {
                        this.consume();
                        return null;
                    }
                }
            }
        } else {
            try {
                return this.parseExpression();
            } catch {
                this.consume();
                return null;
            }
        }
    }
    private parseVariableStatement(): Node {
        const letToken = this.consume();
        if (this.peek()?.type === TokenType.IDENTIFIER && this.lookAhead(1)?.type === TokenType.LEFT_BRACKET) {
            const typeName = this.consume().value;
            this.consume();
            const name = this.consume().value;
            this.consume();
            this.consume();
            const value = this.parseExpression();
            if (this.peek()?.type === TokenType.PERIOD) {
                this.consume();
            }
            return {
                type: NodeType.VARIABLE_DECLARATION,
                typeName,
                name,
                value,
                line: letToken.line,
                column: letToken.column
            } as VariableDeclarationNode;
        } else {
            const name = this.consume().value;
            this.consume();
            const value = this.parseExpression();
            if (this.peek()?.type === TokenType.PERIOD) {
                this.consume();
            }
            return {
                type: NodeType.VARIABLE_ASSIGNMENT,
                name,
                value,
                line: letToken.line,
                column: letToken.column
            } as VariableAssignmentNode;
        }
    }
    private parseImportDeclaration(): ImportDeclarationNode {
        const importSymbol = this.consume();
        const moduleName = importSymbol.value;
        this.expect(TokenType.IDENTIFIER, "曰");
        this.expect(TokenType.COLON, "：");
        const symbols: string[] = [];
        while (this.peek()?.type === TokenType.IDENTIFIER) {
            const symbolToken = this.consume();
            symbols.push(symbolToken.value);
            if (this.peek()?.type === TokenType.COMMA) {
                this.consume();
            } else {
                break;
            }
        }
        this.expect(TokenType.PERIOD, "。");
        return {
            type: NodeType.IMPORT_DECLARATION,
            moduleName,
            symbols,
            line: importSymbol.line,
            column: importSymbol.column
        };
    }
    private parseFunctionDeclaration(): FunctionDeclarationNode {
        const functionToken = this.consume();
        this.expect(TokenType.LEFT_BRACKET, "【");
        const nameToken = this.expect(TokenType.IDENTIFIER);
        const functionName = nameToken.value;
        this.expect(TokenType.RIGHT_BRACKET, "】");
        this.expect(TokenType.COMMA, "，");
        this.expect(TokenType.PARAM, "需知");
        const parameters: ParameterNode[] = [];
        while (this.peek()?.type === TokenType.IDENTIFIER) {
            const typeNameToken = this.consume();
            this.expect(TokenType.LEFT_BRACKET, "【");
            const paramNameToken = this.expect(TokenType.IDENTIFIER);
            this.expect(TokenType.RIGHT_BRACKET, "】");
            parameters.push({
                type: NodeType.PARAMETER,
                typeName: typeNameToken.value,
                name: paramNameToken.value,
                line: typeNameToken.line,
                column: typeNameToken.column
            });
            if (this.peek()?.type === TokenType.COMMA) {
                this.consume();
            } else {
                break;
            }
        }
        this.expect(TokenType.COLON, "：");
        const functionIndentation = functionToken.column;
        const body: Node[] = [];
        while (this.position < this.length) {
            const nextToken = this.peek();
            if (!nextToken) break;
            const nextTokenIndent = nextToken.column;
            if (nextTokenIndent <= functionIndentation) {
                break;
            }
            const node = this.parseStatement();
            if (node) {
                body.push(node);
            }
        }
        return {
            type: NodeType.FUNCTION_DECLARATION,
            name: functionName,
            parameters,
            body,
            line: functionToken.line,
            column: functionToken.column
        };
    }
    private parseFunctionCall(): FunctionCallNode {
        const functionNameToken = this.consume();
        const functionName = functionNameToken.value;
        if (this.peek()?.type === TokenType.COMMA) {
            this.consume();
        }
        const args: Record<string, Node> = {};
        while (this.peek()) {
            if (this.peek()?.type === TokenType.KNOWN) {
                this.consume();
                if (this.peek()?.type === TokenType.LEFT_BRACKET) {
                    this.consume();
                    const paramNameToken = this.expect(TokenType.IDENTIFIER);
                    this.expect(TokenType.RIGHT_BRACKET, "】");
                    this.expect(TokenType.AS, "为");
                    const value = this.parseExpression();
                    args[paramNameToken.value] = value;
                    if (this.peek()?.type === TokenType.COMMA) {
                        this.consume();
                    }
                }
            }
            else if (this.peek()?.type === TokenType.LEFT_BRACKET) {
                this.consume();
                const paramNameToken = this.expect(TokenType.IDENTIFIER);
                this.expect(TokenType.RIGHT_BRACKET, "】");
                this.expect(TokenType.AS, "为");
                const value = this.parseExpression();
                args[paramNameToken.value] = value;
                if (this.peek()?.type === TokenType.COMMA) {
                    this.consume();
                }
            }
            else if (this.peek()?.type === TokenType.IDENTIFIER ||
                this.peek()?.type === TokenType.NUMBER ||
                this.peek()?.type === TokenType.STRING) {
                const paramName = `param_${Object.keys(args).length}`;
                const value = this.parseExpression();
                args[paramName] = value;
                if (this.peek()?.type === TokenType.COMMA) {
                    this.consume();
                }
            }
            else {
                break;
            }
        }
        if (this.peek()?.type === TokenType.PERIOD) {
            this.consume();
        }
        return {
            type: NodeType.FUNCTION_CALL,
            name: functionName,
            arguments: args,
            line: functionNameToken.line,
            column: functionNameToken.column
        };
    }
    private parseReturnStatement(): ReturnStatementNode {
        const returnToken = this.consume();
        const expression = this.parseExpression();
        this.expect(TokenType.PERIOD, "。");
        return {
            type: NodeType.RETURN_STATEMENT,
            expression,
            line: returnToken.line,
            column: returnToken.column
        };
    }
    private parseExpression(): Node {
        return this.parseLogicalOr();
    }

    private parseLogicalOr(): Node {
        let left = this.parseLogicalAnd();
        while (this.peek()?.type === TokenType.OR) {
            const operatorToken = this.consume();
            const right = this.parseLogicalAnd();
            left = {
                type: NodeType.EXPRESSION,
                left,
                operator: operatorToken.value,
                right,
                line: left.line,
                column: left.column
            } as ExpressionNode;
        }
        return left;
    }

    private parseLogicalAnd(): Node {
        let left = this.parseComparison();
        while (this.peek()?.type === TokenType.AND) {
            const operatorToken = this.consume();
            const right = this.parseComparison();
            left = {
                type: NodeType.EXPRESSION,
                left,
                operator: operatorToken.value,
                right,
                line: left.line,
                column: left.column
            } as ExpressionNode;
        }
        return left;
    }

    private parseComparison(): Node {
        let left = this.parseAdditive();
        let operatorToken: Token | undefined;

        while ((operatorToken = this.peek()) &&
            [TokenType.IS, TokenType.IS_NOT, TokenType.GREATER_OR_EQUAL, TokenType.LESS_OR_EQUAL].includes(operatorToken.type)) {
            this.consume();
            const right = this.parseAdditive();
            left = {
                type: NodeType.EXPRESSION,
                left,
                operator: operatorToken.value,
                right,
                line: left.line,
                column: left.column
            } as ExpressionNode;
        }

        return left;
    }

    private parseAdditive(): Node {
        let left = this.parseMultiplicative();
        while (this.peek()?.type === TokenType.IDENTIFIER && ["加", "减"].includes(this.peek()!.value)) {
            const operatorToken = this.consume();
            const right = this.parseMultiplicative();
            left = {
                type: NodeType.EXPRESSION,
                left,
                operator: operatorToken.value,
                right,
                line: left.line,
                column: left.column
            } as ExpressionNode;
        }
        return left;
    }

    private parseMultiplicative(): Node {
        let left = this.parseExponentiation();
        while (this.peek()?.type === TokenType.IDENTIFIER && ["乘", "除", "模"].includes(this.peek()!.value)) {
            const operatorToken = this.consume();
            const right = this.parseExponentiation();
            left = {
                type: NodeType.EXPRESSION,
                left,
                operator: operatorToken.value,
                right,
                line: left.line,
                column: left.column
            } as ExpressionNode;
        }
        return left;
    }

    private parseExponentiation(): Node {
        let left = this.parsePrimary();
        while (this.peek()?.type === TokenType.IDENTIFIER && ["幂"].includes(this.peek()!.value)) {
            const operatorToken = this.consume();
            const right = this.parseExponentiation();
            left = {
                type: NodeType.EXPRESSION,
                left,
                operator: operatorToken.value,
                right,
                line: left.line,
                column: left.column
            } as ExpressionNode;
        }
        return left;
    }
    private parsePrimary(): Node {
        if (this.peek()?.type === TokenType.IDENTIFIER &&
            (this.lookAhead(1)?.type === TokenType.KNOWN ||
                (this.lookAhead(1)?.type === TokenType.COMMA && this.lookAhead(2)?.type === TokenType.KNOWN))) {
            return this.parseFunctionCall();
        }
        const token = this.consume();
        switch (token.type) {
            case TokenType.IDENTIFIER:
                if (token.value === TRUTHY || token.value === FALSY) {
                    return {
                        type: NodeType.NUMBER_LITERAL,
                        value: token.value === TRUTHY ? 1 : 0,
                        line: token.line,
                        column: token.column
                    } as NumberLiteralNode;
                }
                return {
                    type: NodeType.IDENTIFIER,
                    name: token.value,
                    line: token.line,
                    column: token.column
                } as IdentifierNode;
            case TokenType.NUMBER: {
                const numericValue = parseInt(token.value.replace(/[^0-9]/g, ""));
                return {
                    type: NodeType.NUMBER_LITERAL,
                    value: numericValue,
                    line: token.line,
                    column: token.column
                } as NumberLiteralNode;
            }
            case TokenType.STRING:
                return {
                    type: NodeType.STRING_LITERAL,
                    value: token.value,
                    line: token.line,
                    column: token.column
                } as StringLiteralNode;
            default:
                throw new WenyanError(`于第${token.line}行、${token.column}列，遇非所欲之令牌「${token.value}」`);
        }
    }
    private consume(): Token {
        return this.tokens[this.position++];
    }
    private peek(): Token | undefined {
        return this.tokens[this.position];
    }
    private lookAhead(n: number): Token | undefined {
        return this.tokens[this.position + n];
    }
    private expect(type: TokenType, expectedValue?: string): Token {
        const token = this.peek();
        if (!token || token.type !== type) {
            throw new WenyanError(`欲得「${expectedValue || TokenType[type]}」，然见${token ? TokenType[token.type] : "文末"}`);
        }
        if (expectedValue && token.value !== expectedValue) {
            throw new WenyanError(`欲得「${expectedValue}」，然见${token.value}`);
        }
        return this.consume();
    }
    private parseIfStatement(): IfStatementNode {
        const ifToken = this.consume();
        const condition = this.parseExpression();
        if (this.peek()?.type === TokenType.COLON) {
            this.consume();
        }
        const ifIndentation = ifToken.column;
        const body: Node[] = [];
        while (this.position < this.length) {
            const nextToken = this.peek();
            if (!nextToken || nextToken.column <= ifIndentation) {
                break;
            }
            const node = this.parseStatement();
            if (node) {
                body.push(node);
            }
        }
        const elseIfs = [];
        while (this.peek()?.type === TokenType.ELSE_IF) {
            const elseIfToken = this.consume();
            if (this.peek()?.type === TokenType.COLON) {
                this.consume();
            }
            const elseIfCondition = this.parseExpression();
            const elseIfBody: Node[] = [];
            while (this.position < this.length) {
                const nextToken = this.peek();
                if (!nextToken || nextToken.column <= elseIfToken.column) {
                    break;
                }
                const node = this.parseStatement();
                if (node) {
                    elseIfBody.push(node);
                }
            }
            elseIfs.push({
                condition: elseIfCondition,
                body: elseIfBody
            });
        }
        const elseBody: Node[] = [];
        if (this.peek()?.type === TokenType.ELSE) {
            const elseToken = this.consume();
            while (this.position < this.length) {
                const nextToken = this.peek();
                if (!nextToken || nextToken.column <= elseToken.column) {
                    break;
                }
                const node = this.parseStatement();
                if (node) {
                    elseBody.push(node);
                }
            }
        }
        return {
            type: NodeType.IF_STATEMENT,
            condition,
            body,
            elseIfs,
            elseBody,
            line: ifToken.line,
            column: ifToken.column
        } as IfStatementNode;
    }
    private parseRepeatStatement(): RepeatStatementNode {
        let counterName: string | undefined;
        const firstToken = this.peek();
        if (firstToken?.type === TokenType.WITH) {
            this.consume();
            const counterToken = this.expect(TokenType.IDENTIFIER);
            counterName = counterToken.value;
        }
        const repeatToken = this.expect(TokenType.REPEAT, "复行");
        const times = this.parseExpression();
        this.expect(TokenType.TIMES, "次");
        if (this.peek()?.type === TokenType.COLON) {
            this.consume();
        }
        const repeatIndentation = firstToken?.column || repeatToken.column;
        const body: Node[] = [];
        while (this.position < this.length) {
            const nextToken = this.peek();
            if (!nextToken) {
                break;
            }
            const nextTokenIndent = nextToken.column;
            if (nextTokenIndent <= repeatIndentation) {
                break;
            }
            const node = this.parseStatement();
            if (node) {
                body.push(node);
            }
        }
        return {
            type: NodeType.REPEAT_STATEMENT,
            counterName,
            times,
            body,
            line: repeatToken.line,
            column: repeatToken.column
        } as RepeatStatementNode;
    }
    private parseWhileStatement(): WhileStatementNode {
        const whenToken = this.consume();
        const condition = this.parseExpression();
        this.expect(TokenType.WHILE, "时复行");
        if (this.peek()?.type === TokenType.COLON) {
            this.consume();
        }
        const whileIndentation = whenToken.column;
        const body: Node[] = [];
        while (this.position < this.length) {
            const nextToken = this.peek();
            if (!nextToken || nextToken.column <= whileIndentation) {
                break;
            }
            const node = this.parseStatement();
            if (node) {
                body.push(node);
            }
        }
        return {
            type: NodeType.WHILE_STATEMENT,
            condition,
            body,
            line: whenToken.line,
            column: whenToken.column
        } as WhileStatementNode;
    }
}