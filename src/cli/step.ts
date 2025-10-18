import { Lexer, Parser, ProgramNode, Runtime } from "../engine";
import fs from "fs/promises";
import { WenyanError } from "../engine/common/exceptions";
export async function getTokens(filepath: string) {
    try {
        const code = await fs.readFile(filepath, "utf-8");
        const lexer = new Lexer(code);
        return lexer.tokenize();
    } catch (error) {
        if (error instanceof WenyanError) {
            console.error(`译毕，有误：${error.message}。`);
            process.exit(1);
        } else throw error;
    }
}
export async function getAST(filepath: string): Promise<ProgramNode> {
    try {
        const tokens = await getTokens(filepath);
        const parser = new Parser(tokens);
        return parser.parse();
    }
    catch (error) {
        if (error instanceof WenyanError) {
            console.error(`译毕，有误：${error.message}。`);
            process.exit(1);
        } else throw error;
    }
}
export async function run(filepath: string) {
    try {
        const ast = await getAST(filepath);
        const runtime = new Runtime();
        runtime.execute(ast);
    }
    catch (error) {
        if (error instanceof WenyanError) {
            console.error(`行毕，有误：${error.message}。`);
            process.exit(1);
        } else throw error;
    }
}