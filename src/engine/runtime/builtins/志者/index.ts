/**
 * 志者模块 - 控制台输入输出功能
 * 模拟古代"志者"（记录者）的角色，负责记录输出和倾听输入
 */

// 输出函数 - 模拟古代志者记录言行
export function 曰(args: Record<string, any>): any {
  // 支持多种参数名称形式，增强兼容性
  const 内容 = args["内容"] || args["值"] || args["参数"] || args["text"] || args["value"] || Object.values(args)[0];
  
  // 输出到控制台
  console.log(内容);
  
  // 返回内容，支持链式调用
  return 内容;
}

// 输入函数 - 模拟古代志者倾听他人言语
export function 倾(args: Record<string, any> = {}): any {
  try {
    // 尝试使用readline-sync模块实现同步输入
    try {
      const readline = require("readline-sync");
      const 提示 = args["提示"] || args["prompt"] || "";
      return readline.question(提示);
    } catch (e) {
      // 如果readline-sync不可用，提供简单的回退方案
      console.log("注意：需要安装 readline-sync 包以支持输入功能");
      return "";
    }
  } catch (error) {
    console.error("输入功能初始化失败:", error);
    return "";
  }
}

// 模块元信息
export const 元信息 = {
  名称: "志者",
  描述: "记录言行，倾听言语",
  版本: "1.0.0",
  函数列表: ["曰", "倾"]
};

// 默认导出所有函数
export default {
  曰,
  倾,
  元信息
};