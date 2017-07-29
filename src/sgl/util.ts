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
