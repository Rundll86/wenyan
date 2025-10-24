import { program } from "commander";
import { PROJECT_NAME, DESCRIPTIONS } from "../engine/common/constans";
import pack from "../../package.json";

program.name(PROJECT_NAME)
    .nameFromFilename(PROJECT_NAME)
    .version(pack.version, "-序, --刊序", "请示刊序")
    .description(DESCRIPTIONS[Math.floor(Math.random() * DESCRIPTIONS.length)])
    .usage("<指示>");

program.helpCommand("助 <指示>", "对指示陈其辅佐之法");
program.helpOption("-助, --助也", "陈以辅佐之法");

export { program };
