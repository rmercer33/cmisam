import { searchHandler } from '../../../src/handlers/search.mjs';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from "aws-sdk-client-mock";

describe('Test searchHandler', function () {
    const ddbMock = mockClient(DynamoDBDocumentClient);

    beforeEach(() => {
        ddbMock.reset();
    });

    it('should query the table and return filtered items matching the query', async () => {
        const item1 = { source: 'ftcm', parakey: '1801', text: 'this is matching 1801 text' };
        const item2 = { source: 'ftcm', parakey: '1802', text: 'this does not match' };
        const item3 = { source: 'ftcm', parakey: '1803' }; // missing text attribute

        ddbMock.on(QueryCommand).resolves({
            Items: [item1, item2, item3]
        });

        const event = {
            httpMethod: 'POST',
            body: '{"source": "ftcm", "query": "1801"}'
        };

        const result = await searchHandler(event);

        const expectedResult = {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results: [item1] })
        };

        expect(result).toEqual(expectedResult);
    });

    it('should query multiple pages and accumulate items when LastEvaluatedKey is present', async () => {
        const item1 = { source: 'ftcm', parakey: '1801', text: 'this is matching 1801 text' };
        const item2 = { source: 'ftcm', parakey: '1802', text: 'second page matching 1801' };

        // Mock two consecutive paginated query responses
        ddbMock.on(QueryCommand)
            .resolvesOnce({
                Items: [item1],
                LastEvaluatedKey: { source: 'ftcm', parakey: '1801' }
            })
            .resolvesOnce({
                Items: [item2],
                LastEvaluatedKey: undefined
            });

        const event = {
            httpMethod: 'POST',
            body: '{"source": "ftcm", "query": "1801"}'
        };

        const result = await searchHandler(event);

        const expectedResult = {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results: [item1, item2] })
        };

        expect(result).toEqual(expectedResult);
    });

    it('should match case-insensitively when user query contains uppercase characters', async () => {
        const item = { source: 'ftcm', parakey: '1801', text: 'this has matches' };

        ddbMock.on(QueryCommand).resolves({
            Items: [item]
        });

        const event = {
            httpMethod: 'POST',
            body: '{"source": "ftcm", "query": "MATCHES"}'
        };

        const result = await searchHandler(event);

        const expectedResult = {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results: [item] })
        };

        expect(result).toEqual(expectedResult);
    });

    it('should return 400 if source or query is missing', async () => {
        const event = {
            httpMethod: 'POST',
            body: '{"source": "ftcm"}' // missing query
        };

        const result = await searchHandler(event);

        expect(result.statusCode).toEqual(400);
        expect(JSON.parse(result.body).message).toEqual("Missing required 'source' or 'query'");
    });

    it('should return 500 on database error', async () => {
        ddbMock.on(QueryCommand).rejects(new Error('DynamoDB Error'));

        const event = {
            httpMethod: 'POST',
            body: '{"source": "ftcm", "query": "1801"}'
        };

        const result = await searchHandler(event);

        expect(result.statusCode).toEqual(500);
        expect(JSON.parse(result.body).error).toEqual('DynamoDB Error');
    });

    it('should support strict whole-word match when strict parameter is true', async () => {
        const item1 = { source: 'ftcm', parakey: '1', text: 'day is light' };
        const item2 = { source: 'ftcm', parakey: '2', text: 'today is light' };

        ddbMock.on(QueryCommand).resolves({
            Items: [item1, item2]
        });

        const event = {
            httpMethod: 'POST',
            body: '{"source": "ftcm", "query": "day is light", "strict": true}'
        };

        const result = await searchHandler(event);

        const expectedResult = {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results: [item1] })
        };

        expect(result).toEqual(expectedResult);
    });
});
