import { Token, TokenType, Node, NodeType, ProgramNode, ImportDeclarationNode, FunctionDeclarationNode, FunctionCallNode, ParameterNode, ReturnStatementNode, ExpressionNode, IdentifierNode, StringLiteralNode, NumberLiteralNode } from "./ast";

export class Parser {
    private tokens: Token[];
    private position: number = 0;
    private length: number;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
        this.length = tokens.length;
    }

    // 解析主函数
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

    // 解析语句
    private parseStatement(): Node | null {
        const token = this.peek();

        if (!token) {
            return null;
        }

        // 处理导入声明
        if (token.type === TokenType.IMPORT_SYMBOL) {
            return this.parseImportDeclaration();
        }

        // 处理函数声明
        if (token.type === TokenType.FUNCTION) {
            return this.parseFunctionDeclaration();
        }

        // 处理函数调用
        if (token.type === TokenType.IDENTIFIER) {
            // 检查是否有逗号在KNOWN前面
            if (this.lookAhead(1)?.type === TokenType.COMMA && this.lookAhead(2)?.type === TokenType.KNOWN) {
                // 不要在这里消耗逗号，让parseFunctionCall处理所有的消费
                return this.parseFunctionCall();
            }
            // 处理没有逗号的情况
            if (this.lookAhead(1)?.type === TokenType.KNOWN) {
                return this.parseFunctionCall();
            }
        }

        // 处理返回语句
        if (token.type === TokenType.RETURN) {
            return this.parseReturnStatement();
        }

        // 跳过未知的令牌
        this.consume();
        return null;
    }

    // 解析导入声明
    private parseImportDeclaration(): ImportDeclarationNode {
        const importSymbol = this.consume(); // 消耗导入符号《模块名》
        const moduleName = importSymbol.value;

        // 期望下一个令牌是'曰'
        this.expect(TokenType.IDENTIFIER, "曰");

        // 期望下一个令牌是':'
        this.expect(TokenType.COLON, "：");

        const symbols: string[] = [];

        // 解析导入的符号列表
        while (this.peek()?.type === TokenType.IDENTIFIER) {
            const symbolToken = this.consume();
            symbols.push(symbolToken.value);

            // 如果下一个是逗号，消耗它
            if (this.peek()?.type === TokenType.COMMA) {
                this.consume();
            } else {
                break;
            }
        }

        // 期望语句以句号结束
        this.expect(TokenType.PERIOD, "。");

        return {
            type: NodeType.IMPORT_DECLARATION,
            moduleName,
            symbols,
            line: importSymbol.line,
            column: importSymbol.column
        };
    }

    // 解析函数声明
    private parseFunctionDeclaration(): FunctionDeclarationNode {
        const functionToken = this.consume(); // 消耗'涵义'

        // 期望下一个令牌是'【'
        this.expect(TokenType.LEFT_BRACKET, "【");

        // 解析函数名
        const nameToken = this.expect(TokenType.IDENTIFIER);
        const functionName = nameToken.value;

        // 期望下一个令牌是'】'
        this.expect(TokenType.RIGHT_BRACKET, "】");

        // 期望下一个令牌是'，'
        this.expect(TokenType.COMMA, "，");

        // 期望下一个令牌是'需知'
        this.expect(TokenType.PARAM, "需知");

        const parameters: ParameterNode[] = [];

        // 解析参数列表
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

            // 如果下一个是逗号，消耗它
            if (this.peek()?.type === TokenType.COMMA) {
                this.consume();
            } else {
                break;
            }
        }

        // 期望下一个令牌是'：'
        this.expect(TokenType.COLON, "：");

        const body: Node[] = [];

        // 解析函数体
        while (this.peek() && !(this.peek()?.type === TokenType.RETURN)) {
            const node = this.parseStatement();
            if (node) {
                body.push(node);
            }
        }

        // 解析返回语句
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

    // 解析函数调用
    private parseFunctionCall(): FunctionCallNode {
        // 当前位置已经是函数名的标识符
        const functionNameToken = this.consume();
        const functionName = functionNameToken.value;

        // 检查是否有逗号在KNOWN前面
        if (this.peek()?.type === TokenType.COMMA) {
            this.consume(); // 消耗逗号
        }

        // 期望下一个令牌是'已知'
        this.expect(TokenType.KNOWN, "已知");

        const args: { [key: string]: Node } = {};

        // 解析参数列表
        while (this.peek()?.type === TokenType.LEFT_BRACKET) {
            this.consume(); // 消耗'【'
            const paramNameToken = this.expect(TokenType.IDENTIFIER);
            this.expect(TokenType.RIGHT_BRACKET, "】");

            // 期望下一个令牌是'为'
            this.expect(TokenType.AS, "为");

            // 解析参数值
            const value = this.parseExpression();
            args[paramNameToken.value] = value;

            // 如果下一个是逗号，消耗它
            if (this.peek()?.type === TokenType.COMMA) {
                this.consume();
            } else {
                break;
            }
        }

        // 期望语句以句号结束
        this.expect(TokenType.PERIOD, "。");

        return {
            type: NodeType.FUNCTION_CALL,
            name: functionName,
            arguments: args,
            line: functionNameToken.line,
            column: functionNameToken.column
        };
    }

    // 解析返回语句
    private parseReturnStatement(): ReturnStatementNode {
        const returnToken = this.consume(); // 消耗'求'

        const expression = this.parseExpression();

        // 期望语句以句号结束
        this.expect(TokenType.PERIOD, "。");

        return {
            type: NodeType.RETURN_STATEMENT,
            expression,
            line: returnToken.line,
            column: returnToken.column
        };
    }

    // 解析表达式
    private parseExpression(): Node {
        // 简单实现：支持标识符、数字、字符串和简单的二元表达式
        const left = this.parsePrimary();

        // 检查是否有操作符
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

    // 解析基本表达式
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
                throw new Error(`于第${token.line}行、${token.column}列，遇非所期之令牌「${token.value}」`);
        }
    }

    // 消耗当前令牌并返回它
    private consume(): Token {
        return this.tokens[this.position++];
    }

    // 查看当前令牌但不消耗它
    private peek(): Token | undefined {
        return this.tokens[this.position];
    }

    // 向前看n个令牌
    private lookAhead(n: number): Token | undefined {
        return this.tokens[this.position + n];
    }

    // 期望下一个令牌是指定类型
    private expect(type: TokenType, expectedValue?: string): Token {
        const token = this.peek();
        if (!token || token.type !== type) {
            throw new Error(`期得${TokenType[type]}之令牌，然见${token ? TokenType[token.type] : '文末'}`);
        }
        if (expectedValue && token.value !== expectedValue) {
            throw new Error(`期得${expectedValue}之值，然见${token.value}`);
        }
        return this.consume();
    }
}