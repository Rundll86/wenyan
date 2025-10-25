import { WenyanError } from "../common/exceptions";
import { Token, TokenType } from "./ast";
import { FALSY, TRUTHY } from "./defines/characters";

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
    public tokenize(): Token[] {
        while (this.position < this.length) {
            const char = this.code[this.position];
            if (this.isWhitespace(char)) {
                this.skipWhitespace();
                continue;
            }
            if (char === "\n") {
                this.line++;
                this.column = 1;
                this.position++;
                continue;
            }
            if (char === "注：") {
                this.skipComment();
                continue;
            }
            if (char === "“") {
                this.tokenizeString();
                continue;
            }
            if (this.isDigit(char) || char === "十" || char === "百" || char === "千" || char === "万") {
                this.tokenizeNumber();
                continue;
            }
            if (char === "《") {
                this.tokenizeImport();
                continue;
            }
            if (char === "【") {
                this.addToken(TokenType.LEFT_BRACKET, char);
                continue;
            }
            if (char === "】") {
                this.addToken(TokenType.RIGHT_BRACKET, char);
                continue;
            }
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
            if (char === "是") {
                this.addToken(TokenType.IS, char);
                continue;
            }
            if (this.code.substring(this.position, this.position + 2) === "不是") {
                this.addToken(TokenType.IS_NOT, "不是");
                this.position++;
                this.column++;
                continue;
            }
            if (this.code.substring(this.position, this.position + 2) === "胜于") {
                this.addToken(TokenType.GREATER_OR_EQUAL, "胜于");
                this.position++;
                this.column++;
                continue;
            }
            if (this.code.substring(this.position, this.position + 2) === "不及") {
                this.addToken(TokenType.LESS_OR_EQUAL, "不及");
                this.position++;
                this.column++;
                continue;
            }
            if (char === "且" || this.code.substring(this.position, this.position + 2) === "并且") {
                this.addToken(TokenType.AND, char === "且" ? "且" : "并且");
                if (char !== "且") {
                    this.position++;
                    this.column++;
                }
                continue;
            }
            if (char === "或" || this.code.substring(this.position, this.position + 2) === "或者") {
                this.addToken(TokenType.OR, char === "或" ? "或" : "或者");
                if (char !== "或") {
                    this.position++;
                    this.column++;
                }
                continue;
            }
            if (this.isLetter(char)) {
                this.tokenizeIdentifier();
                continue;
            }
            const currentLine = this.line;
            const currentColumn = this.column;
            this.position++;
            this.column++;
            throw new WenyanError(`有未识之符「${char}」于第${currentLine}行，第${currentColumn}列`, currentLine, currentColumn);
        }
        return this.tokens;
    }
    private skipWhitespace(): void {
        while (this.position < this.length && this.isWhitespace(this.code[this.position])) {
            this.position++;
            this.column++;
        }
    }
    private skipComment(): void {
        while (this.position < this.length && this.code[this.position] !== "\n") {
            this.position++;
        }
    }
    private tokenizeString(): void {
        this.position++;
        this.column++;
        let value = "";
        while (this.position < this.length && this.code[this.position] !== "”") {
            value += this.code[this.position];
            this.position++;
            this.column++;
        }
        if (this.position < this.length && this.code[this.position] === "”") {
            this.position++;
            this.column++;
        } else {
            throw new WenyanError(`有未闭字符串于第${this.line}行，第${this.column}列`, this.line, this.column);
        }
        this.tokens.push({
            type: TokenType.STRING,
            value,
            line: this.line,
            column: this.column - value.length - 1
        });
    }
    private tokenizeNumber(): void {
        const start = this.position;
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
    private tokenizeImport(): void {
        this.position++;
        this.column++;
        let moduleName = "";
        while (this.position < this.length && this.code[this.position] !== "》") {
            moduleName += this.code[this.position];
            this.position++;
            this.column++;
        }
        if (this.position < this.length) {
            this.position++;
            this.column++;
        }
        this.tokens.push({
            type: TokenType.IMPORT_SYMBOL,
            value: moduleName,
            line: this.line,
            column: this.column - moduleName.length - 1
        });
    }
    private tokenizeIdentifier(): void {
        const start = this.position;
        while (this.position < this.length && this.isLetter(this.code[this.position])) {
            this.position++;
            this.column++;
        }
        const value = this.code.substring(start, this.position);
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
            case "令":
                this.tokens.push({
                    type: TokenType.LET,
                    value,
                    line: this.line,
                    column: this.column - value.length
                });
                break;
            case "倘若":
                this.tokens.push({
                    type: TokenType.IF,
                    value,
                    line: this.line,
                    column: this.column - value.length
                });
                break;
            case "再若":
            case "再则":
                this.tokens.push({
                    type: TokenType.ELSE_IF,
                    value,
                    line: this.line,
                    column: this.column - value.length
                });
                break;
            case "否则":
                this.tokens.push({
                    type: TokenType.ELSE,
                    value,
                    line: this.line,
                    column: this.column - value.length
                });
                break;
            case "当":
                this.tokens.push({
                    type: TokenType.WHEN,
                    value,
                    line: this.line,
                    column: this.column - value.length
                });
                break;
            case "时复行":
                this.tokens.push({
                    type: TokenType.WHILE,
                    value,
                    line: this.line,
                    column: this.column - value.length
                });
                break;//
            case "复行":
                this.tokens.push({
                    type: TokenType.REPEAT,
                    value,
                    line: this.line,
                    column: this.column - value.length
                });
                break;
            case "次":
                this.tokens.push({
                    type: TokenType.TIMES,
                    value,
                    line: this.line,
                    column: this.column - value.length
                });
                break;
            case "以":
                this.tokens.push({
                    type: TokenType.WITH,
                    value,
                    line: this.line,
                    column: this.column - value.length
                });
                break;
            case "曰":
                this.tokens.push({
                    type: TokenType.IDENTIFIER,
                    value,
                    line: this.line,
                    column: this.column - value.length
                });
                break;
            case TRUTHY:
            case FALSY:
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
    private isWhitespace(char: string): boolean {
        return char === " " || char === "\t" || char === "\r";
    }
    private isDigit(char: string): boolean {
        return /[0-9]/.test(char);
    }
    private isLetter(char: string): boolean {
        return /[a-zA-Z\u4e00-\u9fa5]/.test(char);
    }
}