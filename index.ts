export interface Compare {
    <T>(func?: BaseComparator<T>): Comparator<T>;
    on<T>(transform: (a: T) => any): Comparator<T>;
    locale(locales?: string | string[], options?: Intl.CollatorOptions): LocaleComparator;
}

export type BaseComparator<T> = (a: T, b: T) => number;

export interface Comparator<T> extends BaseComparator<T> {
    reverse(): Comparator<T>;
    from<U>(transform: (a: U) => T): Comparator<U>;
    append<U>(predicate: (a: T | U) => a is U, handler?: BaseComparator<U>): Comparator<T | U>;
    append(predicate: (a: T) => boolean, handler?: BaseComparator<T>): Comparator<T>;
    prepend<U>(predicate: (a: U | T) => a is U, handler?: BaseComparator<U>): Comparator<U | T>;
    prepend(predicate: (a: T) => boolean, handler?: BaseComparator<T>): Comparator<T>;
    then<U>(handler?: BaseComparator<U>): Comparator<T & U>;
}

export interface LocaleComparator extends Comparator<string> {
    readonly collator: Intl.Collator;
}

function defaultComparator<T>(a: T, b: T): number {
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    return 0;
}

function reverse<T>(this: BaseComparator<T>): Comparator<T> {
    return compare((a, b) => this(b, a));
}

function from<T, U>(this: BaseComparator<T>, transform: (a: U) => T): Comparator<U> {
    return compare((a, b) => this(transform(a), transform(b)));
}

function append<T, U>(
    this: BaseComparator<T>,
    predicate: (a: T | U) => a is U,
    handler: BaseComparator<U> = defaultComparator,
): Comparator<T | U> {
    return compare((a, b) => {
        if (predicate(a)) {
            if (predicate(b)) {
                return handler(a, b);
            } else {
                return 1;
            }
        } else {
            if (predicate(b)) {
                return -1;
            } else {
                return this(a, b);
            }
        }
    });
}

function prepend<T, U>(
    this: BaseComparator<T>,
    predicate: (a: U | T) => a is U,
    handler: BaseComparator<U> = defaultComparator,
): Comparator<T> {
    return compare((a, b) => {
        if (predicate(a)) {
            if (predicate(b)) {
                return handler(a, b);
            } else {
                return -1;
            }
        } else {
            if (predicate(b)) {
                return 1;
            } else {
                return this(a, b);
            }
        }
    });
}

function then<T, U>(
    this: BaseComparator<T>,
    handler: BaseComparator<U> = defaultComparator,
): Comparator<T & U> {
    return compare((a, b) => {
        return this(a, b) || handler(a, b);
    });
}

const compare: Compare = (<T> (func: BaseComparator<T> = defaultComparator): Comparator<T> => {
    const result = func as any;
    result.reverse = reverse;
    result.from = from;
    result.append = append;
    result.prepend = prepend;
    result.then = then;
    return result;
}) as Compare;

compare.on = function on<T>(transform: (a: T) => any): Comparator<T> {
    return this<any>().from(transform);
};

compare.locale = function locale(locales?: string | string[], options?: Intl.CollatorOptions): LocaleComparator {
    const collator = new Intl.Collator(locales, options);
    const result = this(collator.compare) as LocaleComparator;
    Object.defineProperty(result, 'collator', {
        value: collator,
        writable: false,
    });
    return result;
};

export default compare;
