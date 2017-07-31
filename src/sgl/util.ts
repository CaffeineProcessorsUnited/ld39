export function ready(callback: () => any): void {
    window.addEventListener("load", callback)
}

export function log(...args: any[]): void {
    console.log.apply(undefined, args)
}

export function error(...args: any[]): void {
    console.error.apply(undefined, args)
}

export function trace(...args: any[]): void {
    console.trace.apply(undefined, args)
}

export function override(container: any, key: string) {
    let baseType = Object.getPrototypeOf(container)
    if (typeof baseType[key] !== "function") {
        throw new Error("Method " + key + " of " + container.constructor.name + " does not override any base class method")
    }
}

export function minmax(val: number, low: number, high: number) {
    return Math.min(Math.max(val, low), high)
}

export function nou(o: any) {
    return o === null || o === undefined
}

export function range(from: number, to: number): number[] {
    let r = []
    while (from < to) {
        r.push(from++)
    }
    return r
}

export function choose<T>(objs: T[]): T {
    return objs[Math.floor(objs.length * Math.random())]
}

export function random(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min)
}

export function randomInt(min: number, max: number) {
    return Math.floor(random(min, max))
}