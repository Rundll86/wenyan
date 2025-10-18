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

        // 根据Token类型进行通用的语句解析
        switch (token.type) {
            case TokenType.IMPORT_SYMBOL:
                return this.parseImportDeclaration();
            case TokenType.FUNCTION:
                return this.parseFunctionDeclaration();
            case TokenType.RETURN:
                return this.parseReturnStatement();
            case TokenType.IDENTIFIER: {
                // 首先检查是否是函数调用（通过判断后面是否有KNOWN标记）
                if ((this.lookAhead(1)?.type === TokenType.COMMA && this.lookAhead(2)?.type === TokenType.KNOWN) ||
                    this.lookAhead(1)?.type === TokenType.KNOWN) {
                    return this.parseFunctionCall();
                }

                // 其次，将所有标识符作为表达式处理
                // 这里不进行特定关键词判断，而是将所有标识符语句都视为可能的表达式语句
                const expr = this.parseExpression();

                // 如果表达式后面有句号，则表示一个完整的语句
                if (this.peek()?.type === TokenType.PERIOD) {
                    this.consume();
                }

                return expr;
            }
            default:
                // 对于其他类型的token，尝试解析为表达式
                try {
                    return this.parseExpression();
                } catch {
                    this.consume(); // 消费无法识别的token
                    return null;
                }
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
        
        // 记录函数声明的缩进级别（列号）
        const functionIndentation = functionToken.column;
        
        const body: Node[] = [];
        
        // 解析函数体，基于缩进级别
        while (this.peek()) {
            // 检查下一个token的缩进级别
            const nextToken = this.peek();
            
            // 如果遇到新的函数声明或者非缩进的语句，结束函数体解析
            if (nextToken && (nextToken.type === TokenType.FUNCTION || 
                nextToken.type === TokenType.KNOWN || 
                nextToken.column <= functionIndentation)) {
                break;
            }
            
            // 解析缩进的语句作为函数体的一部分
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

        // 跳过可选的逗号
        if (this.peek()?.type === TokenType.COMMA) {
            this.consume();
        }

        // 解析参数列表
        const args: { [key: string]: Node } = {};

        // 通用的参数解析逻辑
        while (this.peek()) {
            // 处理已知参数（"已知【参数名】为 值" 形式）
            if (this.peek()?.type === TokenType.KNOWN) {
                this.consume(); // 消费"已知"

                // 解析参数名（通常在括号中）
                if (this.peek()?.type === TokenType.LEFT_BRACKET) {
                    this.consume();
                    const paramNameToken = this.expect(TokenType.IDENTIFIER);
                    this.expect(TokenType.RIGHT_BRACKET, "】");
                    this.expect(TokenType.AS, "为");

                    // 解析参数值（可以是任何表达式）
                    const value = this.parseExpression();
                    args[paramNameToken.value] = value;

                    // 处理多个参数之间的逗号
                    if (this.peek()?.type === TokenType.COMMA) {
                        this.consume();
                    }
                }
            }
            // 处理简写参数（"【参数名】为 值" 形式）
            else if (this.peek()?.type === TokenType.LEFT_BRACKET) {
                this.consume();
                const paramNameToken = this.expect(TokenType.IDENTIFIER);
                this.expect(TokenType.RIGHT_BRACKET, "】");
                this.expect(TokenType.AS, "为");

                // 解析参数值
                const value = this.parseExpression();
                args[paramNameToken.value] = value;

                // 处理多个参数之间的逗号
                if (this.peek()?.type === TokenType.COMMA) {
                    this.consume();
                }
            }
            // 如果不是参数形式，跳出循环
            else {
                break;
            }
        }

        // 通用的上下文检测，不硬编码任何特定操作符
        const isInExpression = this.isInExpressionContext();

        // 处理可选的句号
        if (this.peek()?.type === TokenType.PERIOD) {
            this.consume();
        } else if (!isInExpression) {
            // 如果不是在表达式上下文中且没有句号，则抛出错误
            throw new WenyanError(`函数调用应以句号结束：${functionName}`);
        }

        return {
            type: NodeType.FUNCTION_CALL,
            name: functionName,
            arguments: args,
            line: functionNameToken.line,
            column: functionNameToken.column
        };
    }

    // 辅助方法：检测当前是否在表达式上下文中
    private isInExpressionContext(): boolean {
        const currentPosition = this.position;

        // 向前查找，检查是否在表达式上下文中
        let i = 1;
        while (currentPosition - i >= 0 && i <= 10) {
            const prevToken = this.tokens[currentPosition - i];

            // 如果前面有以下token，可能在表达式中
            if ([TokenType.AS, TokenType.LEFT_BRACKET, TokenType.RIGHT_BRACKET, TokenType.COMMA].includes(prevToken.type)) {
                return true;
            }

            i++;
        }

        // 检查下一个token是否表明这是表达式的一部分
        const nextToken = this.lookAhead(1);
        if (nextToken && nextToken.type === TokenType.IDENTIFIER) {
            // 如果下一个是标识符，可能是运算符
            return true;
        }

        return false;
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
        // 表达式解析器采用递归下降解析法，不硬编码任何特定操作符
        let left = this.parsePrimary();

        // 这里使用更通用的方法处理可能的运算符
        // 只要后面有标识符，就尝试将其作为运算符处理
        while (this.peek()?.type === TokenType.IDENTIFIER) {
            // 将标识符视为潜在的运算符
            const operatorToken = this.consume();
            const right = this.parsePrimary();

            // 创建一个表达式节点
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
        // 优先检查是否是函数调用
        if (this.peek()?.type === TokenType.IDENTIFIER &&
            (this.lookAhead(1)?.type === TokenType.KNOWN ||
                (this.lookAhead(1)?.type === TokenType.COMMA && this.lookAhead(2)?.type === TokenType.KNOWN))) {
            return this.parseFunctionCall();
        }

        // 然后处理其他基本表达式
        const token = this.consume();
        switch (token.type) {
            case TokenType.IDENTIFIER:
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
}