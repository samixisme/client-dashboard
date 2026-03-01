// Global mock for node-fetch (v3 is ESM-only, incompatible with Jest's CJS transform)
const mockFetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
});

module.exports = mockFetch;
module.exports.default = mockFetch;
module.exports.__esModule = true;
