# juxta

A library for writing composable comparison functions.

*juxta* has the following features:

* **Composable**. You can express "sort by X then by Y" and "sort X before Y" using a uniform API.
* **Type-safe**. *juxta* has complete TypeScript definitions. If it compiles, it (probably) works.
* **Readable**. Code that uses *juxta* is much easier to understand and audit than the equivalent written out in full.


## Example

```typescript
import compare, { Comparator } from 'juxta';
import * as _ from 'lodash';
import * as moment from 'moment';

interface SearchResult {
    name: string | null;
    rank: number;
    time: Moment;
}

const compareNames: Comparator<string | null> =
    compare<string>()
        .append<null>(_.isNull);

const compareSearchResults: Comparator<SearchResult> =
    compare.on((s: SearchResult) => s.rank)
        .then(compare.on((s: SearchResult) => s.time).reverse())
        .then(compareNames.from((s: SearchResult) => s.name));

let results: SearchResult[] = [
    {
        name: "Humanity Has Declined",
        rank: 2,
        time: moment('2012-07-02'),
    },
    {
        name: null,
        rank: 1,
        time: moment('1818-05-05'),
    },
    {
        name: "Ping Pong The Animation",
        rank: 0,
        time: moment('2014-04-11'),
    },
];

results.sort(compareSearchResults);
```


## Why *juxta*?

JavaScript provides a built-in method to sort arrays, called [`Array.prototype.sort`][Array.prototype.sort]. You can customize how it compares elements by passing a *comparison function* to the method.

[Array.prototype.sort]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort

Unfortunately, these comparison functions can be hard to write and understand. For example, here's a function that compares nullable strings, sorting `null` values last:

```typescript
function compareStringsNullLast(a: string | null, b: string | null): number {
    if (a === null && b === null) {
        return 0;
    } else if (a === null && b !== null) {
        return -1;
    } else if (a !== null && b === null) {
        return 1;
    } else {
        return a < b ? -1 : a > b ? 1 : 0;
    }
}
```

I'd hate to be the person reviewing that code.

**Fun fact!** There's a bug in that example! Can you find it?

With *juxta*, this function can be written as follows:

```typescript
const compareStringsNullLast = compare<string>().append<null>(_.isNull);
```

That's much less typing -- and more importantly, it is guaranteed correct.


## Creating comparison functions

*juxta* exposes its API through a default export. By convention we name it `compare`:

```typescript
import compare from 'juxta';
```

There are three main ways to create a comparison function:

* Use `compare<T>()` to compare values of type `T` using the built-in `<` and `>` operators. For example, `compare<number>()` compares values of type `number`.
* Use `compare(existingFunction)` to wrap an existing comparison function in a *juxta* object. This lets you use the helper methods detailed below. For example, `compare((s: string, t: string) => s.localeCompare(t))` compares strings case-insensitively using the current locale.
* Use `compare.on(...)` to transform the input before comparing it. For example, `compare.on((x: any[]) => x.length)` compares arrays by length.


## Using comparison functions

All *juxta* objects are functions, so you can pass them directly to `.sort()`:

```typescript
const compareNumbers = compare<number>();
console.log([3, 2, 1].sort(compareNumbers));  // [1, 2, 3]
```


## Ascending vs descending order

`compare()` and `compare.on()` use ascending order (smallest first) by default.

To sort by descending order (largest first) instead, use the `.reverse()` method: `compare<number>.reverse()`.

Calling `.reverse()` twice gives the same result as calling it zero times.


## Transforming the input

Each elf has a hat, and each hat has a [bauble]. We want to sort elves by the baubles on their hats. (The comparison of baubles is a solved problem and has been defined elsewhere.)

This can be written as follows:

```typescript
const compareElvesByBaubles = compareBaubles.from((e: Elf) => e.hat.bauble);
```

[bauble]: http://www.dictionary.com/browse/bauble

Note that since we're transforming *inputs*, not outputs, the method calls may look "backwards" to what you would expect. This is apparent when using more than one `.from()` call:

```typescript
const compareElvesByBaubles = compareBaubles
    .from((h: Hat) => h.bauble)
    .from((e: Elf) => e.hat);
```


## Sorting by multiple fields

On testing, it was found that there are elves with identical baubles. In this case, they can be distinguished by the colors of their socks.

To sort by more than one property, chain the comparison functions using `.then()`:

```typescript
const compareElvesByBaublesAndSockColor = compareElvesByBaubles
    .then(compare.on((e: Elf) => e.sock.color));
```


## Partitioning the input into groups

Oh no! Some elves have rebelled against the social order, and replaced the baubles on their hats with [trinkets]. Your assistant has provided you with two options: either punish the "trinketeers" by sorting them last, or cede to their demands and sort them first. Luckily, *juxta* allows for both:

[trinkets]: https://www.merriam-webster.com/dictionary/trinket

```typescript
// TODO: implement sock colors under the new regime

const compareTrinketsFirst = compareElvesByBaubles
    .prepend((e: Elf) => e.hasTrinket(), compareElvesByTrinkets);

const compareTrinketsLast = compareElvesByBaubles
    .append((e: Elf) => e.hasTrinket(), compareElvesByTrinkets);
```

In more peaceful times, `.prepend()` and `.append()` can be used for separating `null`, `undefined`, and `NaN` values as well:

```typescript
import * as _ from 'lodash';

const compareNumbers = compare<number>().append(isNaN);

const compareStrings = compare<string>()
    .prepend<null>(_.isNull);
    .append<undefined>(_.isUndefined);

const compareNumbersBeforeStrings = compareStrings
    .prepend<number>(_.isNumber, compareNumbers);
```

In the definition of `compareStrings`, the `.prepend()` and `.append()` calls together extend the input type from `string` to `string | null | undefined`. These type changes can confuse the TypeScript compiler; writing out the generic parameters explicitly (`<null>` and `<undefined>`) helps it along.


## Type annotations

*juxta* uses advanced TypeScript features to model its API. This means that you may need to write more type annotations than usual when using the library. Here are some general tips for using TypeScript with *juxta*:

* Enable `noImplicitAny`. This ensures that if TypeScript fails to infer a type, it will raise an error instead of defaulting to `any`.

* If a method takes a callback, give explicit types to each of the callback's arguments. If a method takes generic parameters, fill out each parameter. The examples in this documentation tend to follow these rules, so you're okay if you copy from them.

* If you use an IDE such as Visual Studio Code, you can inspect the inferred type of any expression by hovering over it. This can help debug confusing type errors.


## Case-insensitive string comparisons

Unlike some other comparison libraries, *juxta* does not provide a simple way to compare strings case-insensitively. This is because string comparison is a subtle topic that many people get wrong. I do not want to add foot-guns by presenting things as less complex than they really are.

*juxta* does provide `compare.locale()`, which wraps the built-in [`Intl.Collator`][Intl.Collator] object. For example, `compare.locale('en', { sensitivity: 'base' })` will compare case-insensitively according to English sorting rules.

[Intl.Collator]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Collator
