export class WenyanError extends Error {
    public line?: number;
    public column?: number;
    
    constructor(message: string, line?: number, column?: number) {
        super(message);
        this.name = 'WenyanError';
        this.line = line;
        this.column = column;
    }
}