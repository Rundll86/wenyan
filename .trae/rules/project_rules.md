# 文言

## 项目介绍

这是一个恶搞的编程语言项目，语法基于**中国文言文**。

## 文案编写

所有编译器和runtime内的报错或者其他的信息都必须用文言文写。例如，当你要写：

```plain
Unexcepted token ${token.value} at line ${token.line} column ${token.column}
```

时，你必须写成：

```plain
于第${token.line}行、${token.column}列，遇非所欲之令牌「${token.value}」
```

## 运行和编译

- 使用`yarn build`执行编译。
- 使用`yarn lint --fix`来检查eslint并自动修复。
- 使用`./文言`来运行项目cli。
- - `译`命令代表把输入的文件编译为AST & Tokens。
- - `运转`命令代表把输入的文件编译好，然后开始运行。
- - 使用`助`命令或`-助`或`--助也`来查看帮助。
- - - `./文言 --助也`
