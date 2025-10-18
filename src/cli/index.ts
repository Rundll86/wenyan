import { program } from "commander";
import fs from "fs/promises";
import path from "path";
import { getAST, getTokens, run } from "./step";

program.helpCommand("助", "陈其辅佐之法");
program.helpOption("-助, --助也", "陈其辅佐之法");
program.description("析古国文言抽象之树，运转今夕阵列之卷。");
program.command("译 <文章之所在>")
    .option("-树, --抽象语法树 <文书之所在>", "抽象语法树阵 文书之所在")
    .option("-牌, --令牌 <文书之所在>", "令牌阵 文书之所在")
    .description("译文章")
    .action(async (文章之所在, options) => {
        const filename = path.basename(文章之所在, path.extname(文章之所在));
        const tokens = await getTokens(文章之所在);
        const ast = await getAST(文章之所在);
        await fs.mkdir(filename, { recursive: true });
        await fs.writeFile(options.抽象语法树 || `${filename}/ast.json`, JSON.stringify(ast, null, 4));
        await fs.writeFile(options.令牌 || `${filename}/tokens.json`, JSON.stringify(tokens, null, 4));
    });
program.command("运转 <文章之所在>")
    .description("运转文章")
    .action(run);
program.parse();
