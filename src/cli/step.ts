import { Lexer, Parser, ProgramNode, Runtime, Token } from "../engine";
import { WenyanError } from "../engine/common/exceptions";

export function getTokens(code: string, errorQuit: boolean = true): Token[] {
    try {
        const lexer = new Lexer(code);
        return lexer.tokenize();
    } catch (error) {
        if (error instanceof WenyanError) {
            console.error(`译毕，有误：${error.message}。`);
            if (errorQuit) process.exit(1);
            else return [];
        } else throw error;
    }
}
export function getAST(code: string, errorQuit: boolean = true): ProgramNode | null {
    try {
        const tokens = getTokens(code, errorQuit);
        const parser = new Parser(tokens);
        return parser.parse();
    }
    catch (error) {
        if (error instanceof WenyanError) {
            console.error(`译毕，有误：${error.message}。`);
            if (errorQuit) process.exit(1);
            else return null;
        } else throw error;
    }
}
export function run(code: string, runtime?: Runtime, errorQuit: boolean = true) {
    try {
        const ast = getAST(code, errorQuit);
        if (ast === null) return null;
        runtime = runtime || new Runtime();
        runtime.execute(ast);
    }
    catch (error) {
        if (error instanceof WenyanError) {
            console.error(`行毕，有误：${error.message}。`);
            if (errorQuit) process.exit(1);
            else return null;
        } else throw error;
    }
}