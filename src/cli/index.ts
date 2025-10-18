import { program } from "commander";
import fs from "fs/promises";
import path from "path";
import { Runtime, Lexer, Parser, ProgramNode } from "../engine";
import { WenyanError } from "../engine/common/exceptions";

program.helpCommand("助", "陈其辅佐之法");
program.helpOption("-助, --助也", "陈其辅佐之法");
program.description("析古国文言抽象之树，运转今夕阵列之卷。");
program.command("译 <文章之所在>")
    .option("-树, --抽象语法树 <文书之所在>", "抽象语法树阵 文书之所在")
    .option("-牌, --令牌 <文书之所在>", "令牌阵 文书之所在")
    .description("译文言文章")
    .action(async (文章之所在, options) => {
        const filename = path.basename(文章之所在, path.extname(文章之所在));
        const tokens = new Lexer(await fs.readFile(文章之所在, "utf-8")).tokenize();
        const ast = new Parser(tokens).parse();
        await fs.mkdir(filename, { recursive: true });
        await fs.writeFile(options.抽象语法树 || `${filename}/ast.json`, JSON.stringify(ast, null, 4));
        await fs.writeFile(options.令牌 || `${filename}/tokens.json`, JSON.stringify(tokens, null, 4));
    });
program.command("运转 <文章之所在>")
    .description("运转文言文章")
    .action(async (文章之所在) => {
        let ast: ProgramNode | null = null;
        try {
            const code = await fs.readFile(文章之所在, "utf-8");
            const lexer = new Lexer(code);
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens);
            ast = parser.parse();
        } catch (error) {
            if (error instanceof WenyanError) {
                console.error(`译毕，有误：${error.message}。`);
                process.exit(1);
            }
        }
        try {
            if (ast) {
                const runtime = new Runtime();
                runtime.execute(ast);
            }
        } catch (error) {
            if (error instanceof WenyanError) {
                console.error(`行毕，有误：${error.message}。`);
                process.exit(1);
            }
        }
    });
program.parse();
