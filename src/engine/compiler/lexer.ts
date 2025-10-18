import { Token, TokenType } from "./ast";

export class Lexer {
    private code: string;
    private position: number = 0;
    private line: number = 1;
    private column: number = 1;
    private length: number;
    private tokens: Token[] = [];

    constructor(code: string) {
        this.code = code;
        this.length = code.length;
    }

    // 词法分析主函数
    public tokenize(): Token[] {
        while (this.position < this.length) {
            const char = this.code[this.position];

            // 跳过空白字符
            if (this.isWhitespace(char)) {
                this.skipWhitespace();
                continue;
            }

            // 处理换行
            if (char === "\n") {
                this.line++;
                this.column = 1;
                this.position++;
                continue;
            }

            // 处理注释（暂时简单处理为跳过行尾）
            if (char === "注：") {
                this.skipComment();
                continue;
            }

            // 处理字符串字面量
            if (char === "“") {
                this.tokenizeString();
                continue;
            }

            // 处理数字字面量
            if (this.isDigit(char) || char === "十" || char === "百" || char === "千" || char === "万") {
                this.tokenizeNumber();
                continue;
            }

            // 处理导入符号
            if (char === "《") {
                this.tokenizeImport();
                continue;
            }

            // 处理括号
            if (char === "【") {
                this.addToken(TokenType.LEFT_BRACKET, char);
                continue;
            }

            if (char === "】") {
                this.addToken(TokenType.RIGHT_BRACKET, char);
                continue;
            }

            // 处理标点符号
            if (char === "：") {
                this.addToken(TokenType.COLON, char);
                continue;
            }

            if (char === "。") {
                this.addToken(TokenType.PERIOD, char);
                continue;
            }

            if (char === "，") {
                this.addToken(TokenType.COMMA, char);
                continue;
            }

            // 处理关键字和标识符
            if (this.isLetter(char)) {
                this.tokenizeIdentifier();
                continue;
            }

            // 无法识别的字符，报错或跳过
            console.warn(`无法识别的字符: ${char} 在第 ${this.line} 行，第 ${this.column} 列`);
            this.position++;
            this.column++;
        }

        return this.tokens;
    }

    // 跳过空白字符
    private skipWhitespace(): void {
        while (this.position < this.length && this.isWhitespace(this.code[this.position])) {
            this.position++;
            this.column++;
        }
    }

    // 跳过注释
    private skipComment(): void {
        while (this.position < this.length && this.code[this.position] !== "\n") {
            this.position++;
        }
    }

    // 处理字符串字面量（中文引号）
    private tokenizeString(): void {
        // 确认已经看到前引号，跳过前引号
        this.position++;
        this.column++;

        let value = "";

        // 收集字符串内容，直到遇到后引号
        while (this.position < this.length && this.code[this.position] !== "”") {
            value += this.code[this.position];
            this.position++;
            this.column++;
        }

        // 确保字符串闭合，跳过后引号
        if (this.position < this.length && this.code[this.position] === "”") {
            this.position++;
            this.column++;
        } else {
            // 如果没有找到闭合的后引号，发出警告
            console.warn(`未闭合的字符串字面量在第 ${this.line} 行`);
        }

        this.tokens.push({
            type: TokenType.STRING,
            value,
            line: this.line,
            column: this.column - value.length - 1
        });
    }

    // 处理数字字面量
    private tokenizeNumber(): void {
        const start = this.position;

        // 简单处理：收集所有连续的数字或中文数字单位
        while (this.position < this.length &&
            (this.isDigit(this.code[this.position]) ||
                ["十", "百", "千", "万", "亿"].includes(this.code[this.position]))) {
            this.position++;
            this.column++;
        }

        const value = this.code.substring(start, this.position);

        this.tokens.push({
            type: TokenType.NUMBER,
            value,
            line: this.line,
            column: this.column - value.length
        });
    }

    // 处理导入语句
    private tokenizeImport(): void {
        this.position++;
        this.column++;

        let moduleName = "";

        while (this.position < this.length && this.code[this.position] !== "》") {
            moduleName += this.code[this.position];
            this.position++;
            this.column++;
        }

        // 确保导入符号闭合
        if (this.position < this.length) {
            this.position++;
            this.column++;
        }

        // 添加导入模块名
        this.tokens.push({
            type: TokenType.IMPORT_SYMBOL,
            value: moduleName,
            line: this.line,
            column: this.column - moduleName.length - 1
        });
    }

    // 处理标识符和关键字
    private tokenizeIdentifier(): void {
        const start = this.position;

        // 收集所有连续的字母字符
        while (this.position < this.length && this.isLetter(this.code[this.position])) {
            this.position++;
            this.column++;
        }

        const value = this.code.substring(start, this.position);

        // 检查是否是关键字
        switch (value) {
        case "涵义":
            this.tokens.push({
                type: TokenType.FUNCTION,
                value,
                line: this.line,
                column: this.column - value.length
            });
            break;
        case "需知":
            this.tokens.push({
                type: TokenType.PARAM,
                value,
                line: this.line,
                column: this.column - value.length
            });
            break;
        case "求":
            this.tokens.push({
                type: TokenType.RETURN,
                value,
                line: this.line,
                column: this.column - value.length
            });
            break;
        case "已知":
            this.tokens.push({
                type: TokenType.KNOWN,
                value,
                line: this.line,
                column: this.column - value.length
            });
            break;
        case "为":
            this.tokens.push({
                type: TokenType.AS,
                value,
                line: this.line,
                column: this.column - value.length
            });
            break;
        case "曰":
            // 需要根据上下文判断是导入还是函数调用
            // 这里简化处理，先作为标识符
            this.tokens.push({
                type: TokenType.IDENTIFIER,
                value,
                line: this.line,
                column: this.column - value.length
            });
            break;
        default:
            this.tokens.push({
                type: TokenType.IDENTIFIER,
                value,
                line: this.line,
                column: this.column - value.length
            });
        }
    }

    // 添加单个令牌
    private addToken(type: TokenType, value: string): void {
        this.tokens.push({
            type,
            value,
            line: this.line,
            column: this.column
        });

        this.position++;
        this.column++;
    }

    // 判断是否为空白字符
    private isWhitespace(char: string): boolean {
        return char === " " || char === "\t" || char === "\r";
    }

    // 判断是否为数字
    private isDigit(char: string): boolean {
        return /[0-9]/.test(char);
    }

    // 判断是否为字母（包括中文）
    private isLetter(char: string): boolean {
        return /[a-zA-Z\u4e00-\u9fa5]/.test(char);
    }
}