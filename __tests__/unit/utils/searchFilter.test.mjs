import { filterItemsByText } from '../../../src/utils/searchFilter.mjs';

describe('Test filterItemsByText utility', () => {
    it('should return all items if query is empty or undefined', () => {
        const items = [{ text: 'item1' }, { text: 'item2' }];
        expect(filterItemsByText(items, '')).toEqual(items);
        expect(filterItemsByText(items, undefined)).toEqual(items);
    });

    it('should filter items by lowercase substring matching', () => {
        const items = [
            { text: 'apple juice' },
            { text: 'orange juice' },
            { text: 'apple pie' }
        ];
        
        expect(filterItemsByText(items, 'apple')).toEqual([
            { text: 'apple juice', context: '<em>apple</em> juice' },
            { text: 'apple pie', context: '<em>apple</em> pie' }
        ]);
    });

    it('should match case-insensitively when query is uppercase', () => {
        const items = [{ text: 'apple juice' }, { text: 'banana' }];
        expect(filterItemsByText(items, 'JUICE')).toEqual([{ text: 'apple juice', context: 'apple <em>juice</em>' }]);
    });

    it('should safely ignore items with missing or non-string text attributes', () => {
        const items = [
            { text: 'apple juice' },
            { text: null },
            { count: 123 },
            { text: 456 } // numeric instead of string
        ];
        expect(filterItemsByText(items, 'apple')).toEqual([{ text: 'apple juice', context: '<em>apple</em> juice' }]);
    });

    it('should ignore punctuation and mixed case in both query and text', () => {
        const items = [
            { text: 'The Christ has need of helpers!' },
            { text: '180100100.001' },
            { text: 'Hello, World.' }
        ];

        // Mixed case and punctuation in text, simple query
        expect(filterItemsByText(items, 'helpers')).toEqual([{ text: 'The Christ has need of helpers!', context: 'he Christ has need of <em>helpers</em>!' }]);
        
        // Punctuation in text, query without punctuation
        expect(filterItemsByText(items, '1801')).toEqual([{ text: '180100100.001', context: '<em>1801</em>00100.001' }]);

        // Punctuation in query, mixed case in text
        expect(filterItemsByText(items, 'Hello World?')).toEqual([{ text: 'Hello, World.', context: '<em>Hello, World</em>.' }]);
    });

    describe('with strict mode enabled', () => {
        it('should match exact whole words only', () => {
            const items = [
                { text: 'day is light' },
                { text: 'today is light' },
                { text: 'day is lightly' },
                { text: 'the day is light, indeed' }
            ];

            expect(filterItemsByText(items, 'day is light', true)).toEqual([
                { text: 'day is light', context: '<em>day is light</em>' },
                { text: 'the day is light, indeed', context: 'the <em>day is light</em>, indeed' }
            ]);
        });

        it('should handle case insensitivity and punctuation in strict mode', () => {
            const items = [
                { text: 'The Christ has need of helpers!' },
                { text: 'the christ has need of helper' }
            ];

            expect(filterItemsByText(items, 'need of helpers', true)).toEqual([
                { text: 'The Christ has need of helpers!', context: 'he Christ has <em>need of helpers</em>!' }
            ]);
        });
    });

    describe('context highlighting and width requirements', () => {
        it('should generate a context attribute with default width 30', () => {
            const items = [
                { text: 'This is a very long text string that contains our target query keyword in the middle of it.' }
            ];
            const results = filterItemsByText(items, 'target query');
            expect(results[0].context).toBeDefined();
            // Visible length of context should be 30 (excluding <em> and </em> tags)
            const cleanContext = results[0].context.replace(/<\/?em>/g, '');
            expect(cleanContext.length).toBe(30);
            expect(results[0].context).toContain('<em>target query</em>');
        });

        it('should generate a context attribute with a custom width', () => {
            const items = [
                { text: 'This is a very long text string that contains our target query keyword in the middle of it.' }
            ];
            const results = filterItemsByText(items, 'target query', false, 40);
            const cleanContext = results[0].context.replace(/<\/?em>/g, '');
            expect(cleanContext.length).toBe(40);
            expect(results[0].context).toContain('<em>target query</em>');
        });

        it('should expand width to query length if query is larger than width', () => {
            const items = [
                { text: 'This has supercalifragilisticexpialidocious query.' }
            ];
            const results = filterItemsByText(items, 'supercalifragilisticexpialidocious', false, 10);
            const cleanContext = results[0].context.replace(/<\/?em>/g, '');
            // Since query length is 34, width should be expanded to 34
            expect(cleanContext.length).toBe(34);
            expect(results[0].context).toBe('<em>supercalifragilisticexpialidocious</em>');
        });

        it('should handle matches at the start of the string with correct padding', () => {
            const items = [
                { text: 'First word of the sentence.' }
            ];
            const results = filterItemsByText(items, 'First', false, 15);
            const cleanContext = results[0].context.replace(/<\/?em>/g, '');
            expect(cleanContext.length).toBe(15);
            expect(results[0].context).toBe('<em>First</em> word of t');
        });

        it('should handle matches at the end of the string with correct padding', () => {
            const items = [
                { text: 'Sentence ending with last.' }
            ];
            const results = filterItemsByText(items, 'last', false, 15);
            const cleanContext = results[0].context.replace(/<\/?em>/g, '');
            expect(cleanContext.length).toBe(15);
            expect(results[0].context).toBe('ding with <em>last</em>.');
        });

        it('should correctly highlight when original text contains punctuation ignored during match', () => {
            const items = [
                { text: 'The Hello, World! text here.' }
            ];
            const results = filterItemsByText(items, 'Hello World', false, 20);
            const cleanContext = results[0].context.replace(/<\/?em>/g, '');
            expect(cleanContext.length).toBe(20);
            expect(results[0].context).toContain('<em>Hello, World</em>');
        });
    });
});
