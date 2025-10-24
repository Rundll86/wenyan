import { FunctionDeclarationNode } from "../compiler/ast";
import { type VM } from "../runtime/vm";
export interface ReexportItem {
    moduleName: string;
    originalName?: string;
}
export type ReexportsMap = {
    [symbolName: string]: ReexportItem;
} | string[];
export type ModuleLibrary = Partial<Environment> & {
    reexports?: ReexportsMap;
};
export interface ClassType {
    asRawValue?: {
        validate: (value: ValueDescriptor) => boolean;
        cast: (value: ValueDescriptor) => unknown;//
    };
    attributes: Record<string, unknown>;
    methods: Record<string, FunctionDescriptor>;
}
export interface ValueDescriptor {
    type: string; // 对应ClassType
    value: unknown;
}
export interface TypedValueDeclaration {
    type: string; // 对应ClassType
    name: string;
}
export interface Environment {
    variables: Record<string, ValueDescriptor>;
    functions: Record<string, FunctionDescriptor>;
    classes: Record<string, ClassType>;
    modules: Record<string, Record<string, unknown>>;
    parent?: Environment;
}
export type FunctionExecutor = (args: Record<string, unknown>, vm: VM) => unknown
export interface FunctionDescriptor {
    builtin?: {
        executor: FunctionExecutor;
        parameters: TypedValueDeclaration[];
    };
    ast?: FunctionDeclarationNode;
}