# Linkwarden Archive Upload API

Upload archived web pages (e.g., SingleFile captures) to Linkwarden.

## Quick Start

```ts
import { LinkwardenArchiveClient } from "@/lib/linkwarden";

const client = new LinkwardenArchiveClient({
  baseUrl: "https://linkwarden.example.com",
  bearerToken: process.env.LINKWARDEN_TOKEN!,
});

// Upload from a Blob
const result = await client.upload({
  file: new Blob(["<html>...</html>"], { type: "text/html" }),
  url: "https://example.com/article",
});

console.log(result.success); // true
console.log(result.id); // archive ID from Linkwarden
```

## API Reference

### `POST /api/v1/archives?format=4`

| Field    | Type                 | Required | Description                            |
| -------- | -------------------- | -------- | -------------------------------------- |
| `file`   | File / Blob / Buffer | ✅       | Archived web page content              |
| `url`    | string               | ✅       | Original URL of the archived page      |
| `format` | `4` (query param)    | ✅       | SingleFile archive format (auto-added) |

**Authentication:** Bearer token in `Authorization` header.

### Response

```json
{
  "response": {
    "id": 42
  }
}
```

### `LinkwardenArchiveResult`

| Field         | Type                      | Description                              |
| ------------- | ------------------------- | ---------------------------------------- |
| `success`     | `boolean`                 | Whether the upload succeeded             |
| `id`          | `number \| null`          | Archive ID (null if not returned by API) |
| `url`         | `string`                  | Original URL that was archived           |
| `rawResponse` | `Record<string, unknown>` | Full API response for debugging          |

## Usage Examples

### Upload from Buffer (Node.js)

```ts
import fs from "fs";

const buffer = fs.readFileSync("./saved-page.html");
const result = await client.upload({
  file: buffer,
  url: "https://example.com/page",
  filename: "saved-page.html",
});
```

### Upload from File input (Browser)

```ts
const fileInput = document.querySelector<HTMLInputElement>("#archive-file")!;
const file = fileInput.files![0];

const result = await client.upload({
  file,
  url: "https://example.com/page",
});
```

## Error Handling

| Error Class                        | When                            |
| ---------------------------------- | ------------------------------- |
| `LinkwardenArchiveValidationError` | Invalid file or URL before send |
| `LinkwardenArchiveError` (4xx)     | Server rejected the request     |
| `LinkwardenArchiveError` (5xx)     | Server internal error           |
| `LinkwardenArchiveError` (null)    | Network/DNS failure             |
| `LinkwardenArchiveResponseError`   | Response is not valid JSON      |
| `LinkwardenExpiredTokenError`      | 401 Unauthorized                |
| `LinkwardenForbiddenError`         | 403 Forbidden                   |

```ts
import {
  LinkwardenArchiveValidationError,
  LinkwardenArchiveError,
} from "@/lib/linkwarden";

try {
  await client.upload({ file, url });
} catch (err) {
  if (err instanceof LinkwardenArchiveValidationError) {
    console.error(`Invalid ${err.field}:`, err.message);
  } else if (err instanceof LinkwardenArchiveError) {
    console.error(`Upload failed (HTTP ${err.status}):`, err.message);
  }
}
```

## Validation Rules

Input validation runs **before** any network call:

- **file**: Must be a non-empty `File`, `Blob`, or `Buffer`
- **url**: Must be a valid `http://` or `https://` URL string
