import { expect } from 'chai';
import compare, { Comparator } from './index';

// tslint:disable:only-arrow-functions

describe('creating comparators', function () {
    describe('simple comparisons', function () {
        it('can compare numbers', function () {
            const f = compare();
            expect(f(10, 10)).to.equal(0);
            expect(f(20, 10)).to.equal(1);
            expect(f(10, 20)).to.equal(-1);
        });

        it('can compare strings', function () {
            const f = compare();
            expect(f('a', 'b')).to.equal(-1);
            expect(f('a', 'a')).to.equal(0);
            expect(f('b', 'a')).to.equal(1);
        });

        it('uses valueOf for custom objects', function () {
            class ValueOf {
                constructor(private value: number) { }
                public valueOf(): number {
                    return this.value;
                }
            }
            const f = compare();
            expect(f(new ValueOf(5), new ValueOf(-10))).to.equal(1);
        });
    });

    describe('custom comparator', function () {
        it('calls a custom comparator if given', function () {
            interface Named {
                name: string;
            }
            function compareName(a: Named, b: Named): number {
                return a.name.localeCompare(b.name);
            }
            const f = compare(compareName);
            expect(f({ name: 'Alice' }, { name: 'Bob' })).to.equal(-1);
        });
    });
});

describe('modifiers', function () {
    describe('#reverse', function () {
        it('works', function () {
            const f = compare().reverse();
            expect(f(10, 20)).to.equal(1);
            expect(f(10, 10)).to.equal(0);
            expect(f(20, 10)).to.equal(-1);
        });
    });

    describe('#from', function () {
        it('works', function () {
            const f: Comparator<number> = compare().from((x) => x.toString());
            expect(f(16, 9)).to.equal(-1);
        });
    });

    describe('#append', function () {
        describe('with type predicates', function () {
            const f: Comparator<number | string> = compare<number>().append(isString);

            it('uses the underlying comparator when the predicate matches neither', function () {
                expect(f(1, 1)).to.equal(0);
                expect(f(16, 9)).to.equal(1);
            });
            it('orders T before U', function () {
                expect(f(1, '1')).to.equal(-1);
                expect(f('1', 1)).to.equal(1);
            });
            it('uses the auxiliary comparator when the predicate matches both', function () {
                expect(f('1', '1')).to.equal(0);
                expect(f('16', '9')).to.equal(-1);
            });
        });

        describe('with normal predicates', function () {
            const f = compare<string>().append((x: string) => x.length === 1, compare().reverse());

            it('uses the underlying comparator when the predicate matches neither', function () {
                expect(f('aa', 'aa')).to.equal(0);
                expect(f('aa', 'bb')).to.equal(-1);
            });
            it('orders falsy before truthy', function () {
                expect(f('zzzzz', 'a')).to.equal(-1);
                expect(f('a', 'zzzzz')).to.equal(1);
            });
            it('uses the auxiliary comparator when the predicate matches both', function () {
                expect(f('z', 'a')).to.equal(-1);
            });
        });
    });

    describe('#prepend', function () {
        describe('with type predicates', function () {
            const f: Comparator<number | string> = compare<number>().prepend(isString);

            it('uses the underlying comparator when the predicate matches neither', function () {
                expect(f(1, 1)).to.equal(0);
                expect(f(16, 9)).to.equal(1);
            });
            it('orders T after U', function () {
                expect(f(1, '1')).to.equal(1);
                expect(f('1', 1)).to.equal(-1);
            });
            it('uses the auxiliary comparator when the predicate matches both', function () {
                expect(f('1', '1')).to.equal(0);
                expect(f('16', '9')).to.equal(-1);
            });
        });

        describe('with normal predicates', function () {
            const f = compare<string>().prepend((x: string) => x.length === 1, compare().reverse());

            it('uses the underlying comparator when the predicate matches neither', function () {
                expect(f('aa', 'aa')).to.equal(0);
                expect(f('aa', 'bb')).to.equal(-1);
            });
            it('orders truthy before falsy', function () {
                expect(f('z', 'aaaaa')).to.equal(-1);
                expect(f('aaaaa', 'z')).to.equal(1);
            });
            it('uses the auxiliary comparator when the predicate matches both', function () {
                expect(f('z', 'a')).to.equal(-1);
            });
        });
    });

    describe('#then', function () {
        interface Person {
            name: string;
            age: number;
        }

        const anna = { name: 'Anna', age: 32 };
        const khalid = { name: 'Khalid', age: 16 };
        const yuukoTheElder = { name: 'Yuuko', age: 64 };
        const yuukoTheYounger = { name: 'Yuuko', age: 8 };

        const f = compare<string>().from((x: Person) => x.name)
            .then(compare<number>().from((x: Person) => x.age).reverse());

        it('returns the first result if non-zero', function () {
            expect(f(anna, khalid)).to.equal(-1);
            expect(f(yuukoTheYounger, khalid)).to.equal(1);
        });

        it('uses the second comparator if the first compares equal', function () {
            expect(f(yuukoTheElder, yuukoTheYounger)).to.equal(-1);
            expect(f(yuukoTheYounger, yuukoTheElder)).to.equal(1);
        });

        it('returns zero if both comparators compare equal', function () {
            expect(f(khalid, khalid)).to.equal(0);
        });

        it('uses the default comparator if none given', function () {
            const g = compare<string>().from((s: string) => s[1]).then<string>();
            expect(g('za', 'yb')).to.equal(-1);
            expect(g('za', 'ya')).to.equal(1);
        });
    });
});

describe('prefabs', function () {
    describe('#on', function () {
        it('accepts callbacks', function () {
            const f: Comparator<string> = compare.on((s) => s.toLowerCase());
            expect(f('ZZZ', 'aaa')).to.equal(1);
        });
    });

    describe('#locale', function () {
        it('works', function () {
            const f = compare.locale('en', { sensitivity: 'base' });
            expect(f('AAA', 'aaa')).to.equal(0);
            expect(f('aaa', 'BBB')).to.equal(-1);
        });
    });
});

function isString<T>(value: T | string): value is string {
    return typeof value === 'string';
}
