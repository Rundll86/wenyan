import { WenyanError } from "../common/exceptions";
import { Token, TokenType, Node, NodeType, ProgramNode, ImportDeclarationNode, FunctionDeclarationNode, FunctionCallNode, ParameterNode, ReturnStatementNode, ExpressionNode, IdentifierNode, StringLiteralNode, NumberLiteralNode } from "./ast";

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
        const token = this.peek();
        if (!token) {
            return null;
        }
        if (token.type === TokenType.IMPORT_SYMBOL) {
            return this.parseImportDeclaration();
        }
        if (token.type === TokenType.FUNCTION) {
            return this.parseFunctionDeclaration();
        }
        if (token.type === TokenType.IDENTIFIER) {
            if (this.lookAhead(1)?.type === TokenType.COMMA && this.lookAhead(2)?.type === TokenType.KNOWN) {
                // 不要在这里消耗逗号，让parseFunctionCall处理所有的消费
                return this.parseFunctionCall();
            }
            if (this.lookAhead(1)?.type === TokenType.KNOWN) {
                return this.parseFunctionCall();
            }
        }
        if (token.type === TokenType.RETURN) {
            return this.parseReturnStatement();
        }
        this.consume();
        return null;
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
        const body: Node[] = [];
        while (this.peek() && !(this.peek()?.type === TokenType.RETURN)) {
            const node = this.parseStatement();
            if (node) {
                body.push(node);
            }
        }
        const returnStatement = this.parseReturnStatement();
        if (returnStatement) {
            body.push(returnStatement);
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
        this.expect(TokenType.KNOWN, "已知");
        const args: { [key: string]: Node } = {};
        while (this.peek()?.type === TokenType.LEFT_BRACKET) {
            this.consume();
            const paramNameToken = this.expect(TokenType.IDENTIFIER);
            this.expect(TokenType.RIGHT_BRACKET, "】");
            this.expect(TokenType.AS, "为");
            const value = this.parseExpression();
            args[paramNameToken.value] = value;
            if (this.peek()?.type === TokenType.COMMA) {
                this.consume();
            } else {
                break;
            }
        }
        this.expect(TokenType.PERIOD, "。");
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
        const left = this.parsePrimary();
        while (this.peek()?.type === TokenType.IDENTIFIER &&
            ["加", "减", "乘", "除"].includes(this.peek()?.value || "")) {
            const operatorToken = this.consume();
            const right = this.parsePrimary();
            return {
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
    private parsePrimary(): IdentifierNode | StringLiteralNode | NumberLiteralNode {
        const token = this.consume();
        switch (token.type) {
            case TokenType.IDENTIFIER:
                return {
                    type: NodeType.IDENTIFIER,
                    name: token.value,
                    line: token.line,
                    column: token.column
                };
            case TokenType.NUMBER: {
                const numericValue = parseInt(token.value.replace(/[^0-9]/g, ""));
                return {
                    type: NodeType.NUMBER_LITERAL,
                    value: numericValue,
                    line: token.line,
                    column: token.column
                };
            }
            case TokenType.STRING:
                return {
                    type: NodeType.STRING_LITERAL,
                    value: token.value,
                    line: token.line,
                    column: token.column
                };
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
            throw new WenyanError(`欲得「${expectedValue || TokenType[type]}」，然见${token ? TokenType[token.type] : '文末'}`);
        }
        if (expectedValue && token.value !== expectedValue) {
            throw new WenyanError(`欲得「${expectedValue}」，然见${token.value}`);
        }
        return this.consume();
    }
}