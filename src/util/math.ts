export function factorial(n: number): number {
    if (n <= 2) {
        return n;
    } else {
        return n * factorial(n - 1);
    }
}