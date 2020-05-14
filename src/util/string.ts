export function repeat(str: string, numRepeats: number): string {
    let result = '';
    for (let i = 0; i < numRepeats; ++i) {
        result += str;
    }
    return result;
}