export function debounce(cb: (...args) => void, timeout?: number) {
    let timer: NodeJS.Timeout;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            cb.apply(this, args);
        }, timeout || 1000);
    };
}

export function nowInSeconds() {
    return Math.round(new Date().getTime() / 1000);
}
