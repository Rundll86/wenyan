import { program } from "commander";
import fs from "fs/promises";
import path from "path";
import { getAST, getTokens, run } from "./step";

program.helpCommand("助", "陈其辅佐之法");
program.helpOption("-助, --助也", "陈其辅佐之法");
program.description("析古国文言抽象之树，运转今夕阵列之卷。");
program.command("译 [文章之所在]")
    .option("-树, --抽象树 <文书之所在>", "抽象树阵 文书之所在")
    .option("-牌, --令牌 <文书之所在>", "令牌阵 文书之所在")
    .description("译文章，若不指明文章之所在，则从标准输入读之")
    .action(async (文章之所在, options: Record<"抽象树" | "令牌", string>) => {
        const filename = 文章之所在 ? path.basename(文章之所在, path.extname(文章之所在)) : "stdin";
        const tokens = await getTokens(文章之所在);
        const ast = await getAST(文章之所在);
        await fs.mkdir(filename, { recursive: true });
        if (options.令牌) {
            await fs.writeFile(options.令牌, JSON.stringify(tokens, null, 4));
        } else console.log("令牌 =", JSON.stringify(tokens, null, 4));
        if (options.抽象树) {
            await fs.writeFile(options.抽象树, JSON.stringify(ast, null, 4));
        } else console.log("抽象树 =", JSON.stringify(ast, null, 4));
    });
program.command("运转 [文章之所在]")
    .description("运转文章，若不指明文章之所在，则从标准输入读之")
    .action(run);
program.parse();
