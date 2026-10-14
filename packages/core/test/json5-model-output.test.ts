import { describe, expect, it } from "vitest";
import { normalizeImageDescription } from "../src/media/image-description-cache";
import {
	extractAndParseJSONObjectFromText,
	parseJSONObjectFromText,
} from "../src/utils/json5-model-output";

describe("parseJSONObjectFromText code fences", () => {
	it("reads a json5 fence instead of leaving the label's trailing 5 in the body", () => {
		expect(parseJSONObjectFromText("```json5\n{a: 1,}\n```")).toEqual({
			a: 1,
		});
		expect(parseJSONObjectFromText('```JSON5\n{"a": 1}\n```')).toEqual({
			a: 1,
		});
		expect(parseJSONObjectFromText('```json5{"a":1}```')).toEqual({ a: 1 });
		expect(
			parseJSONObjectFromText("prefix ```json5\n{ok: true}\n``` suffix"),
		).toEqual({ ok: true });
	});

	it("still reads json fences, unlabeled fences, and bare JSON5 objects", () => {
		expect(parseJSONObjectFromText('```json\n{"n": 5}\n```')).toEqual({
			n: 5,
		});
		expect(parseJSONObjectFromText("```json\n{a:1,}\n```")).toEqual({ a: 1 });
		expect(parseJSONObjectFromText("```\n{a:1}\n```")).toEqual({ a: 1 });
		expect(parseJSONObjectFromText("{a:1,}")).toEqual({ a: 1 });
		expect(parseJSONObjectFromText('```json\r\n{"a":1}\r\n```')).toEqual({
			a: 1,
		});
	});

	it("does not treat a longer label as json or json5", () => {
		expect(parseJSONObjectFromText("```json50\n{a:1}\n```")).toBeNull();
		expect(parseJSONObjectFromText('```jsonc\n{"a":1}\n```')).toBeNull();
		expect(parseJSONObjectFromText('```python\n{"a":1}\n```')).toBeNull();
	});

	it("returns an array from a json5 fence and null from the object parser", () => {
		expect(extractAndParseJSONObjectFromText("```json5\n[1,2,]\n```")).toEqual([
			1, 2,
		]);
		expect(parseJSONObjectFromText("```json5\n[1,2,]\n```")).toBeNull();
	});

	it("fails explicitly on unsupported fence labels instead of mis-parsing", () => {
		const unsupported = [
			'```jsonc\n{"a":1}\n```',
			'```json50\n{"a":1}\n```',
			'```json-x\n{"a":1}\n```',
			"```yaml\na: 1\n```",
			'```yaml\n{"a":1}\n```',
			"```ts\n{a: 1}\n```",
			"```true\n{a: 1}\n```",
			"```Infinity\n{a: 1}\n```",
			// Only the first fence is read; an unsupported first fence is not skipped.
			'```yaml\na: 1\n```\n```json\n{"a":1}\n```',
		];
		for (const text of unsupported) {
			expect(parseJSONObjectFromText(text)).toBeNull();
			expect(() => extractAndParseJSONObjectFromText(text)).toThrow(
				"Failed to parse invalid JSON",
			);
		}
	});

	it("parses no-fence prose only when it is whole JSON", () => {
		expect(parseJSONObjectFromText("sure: {a: 1}")).toBeNull();
		expect(parseJSONObjectFromText('{"code":"```json\\n{}\\n```"}')).toEqual({
			code: "```json\n{}\n```",
		});
	});

	it("keeps unsupported-label model output as raw text in image descriptions", () => {
		const yaml = '```yaml\ndescription: "a cat"\n```';
		expect(normalizeImageDescription(yaml)).toEqual({
			title: "Image",
			description: yaml,
			text: yaml,
		});
		expect(
			normalizeImageDescription(
				'```json5\n{title: "T", description: "d",}\n```',
			),
		).toEqual({ title: "T", description: "d", text: "d" });
	});
});
