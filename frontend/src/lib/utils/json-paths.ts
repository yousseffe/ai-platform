/**
 * Recursively walks a parsed JSON value and emits every leaf path as a
 * dotted/bracketed string (e.g. `prediction[0]`, `probabilities[0][1]`).
 * Used to populate field-path suggestions in the mapper UI from a model
 * version's `examplePayload` or `expectedResult` sample.
 *
 * @param value - The parsed JSON value to walk.
 * @param prefix - The accumulated path so far (internal recursion use).
 * @returns A flat list of dotted/bracketed paths to every scalar leaf.
 */
export function flattenJsonPaths(value: unknown, prefix = ""): string[] {
  if (value === null || value === undefined) {
    return prefix ? [prefix] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, i) =>
      flattenJsonPaths(item, prefix ? `${prefix}[${i}]` : `[${i}]`),
    );
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj).flatMap((key) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      const child = obj[key];
      if (typeof child === "object" && child !== null) {
        return flattenJsonPaths(child, nextPrefix);
      }
      return [nextPrefix];
    });
  }
  return prefix ? [prefix] : [];
}

/**
 * Safely parses a JSON string and flattens it into leaf paths.
 * Returns an empty array if the string is missing or not valid JSON.
 *
 * @param json - The raw JSON string (typically `ModelVersion.examplePayload`
 *               or `ModelVersion.expectedResult`).
 * @returns A flat list of dotted/bracketed paths to every scalar leaf.
 */
export function pathsFromJsonSample(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    return flattenJsonPaths(JSON.parse(json));
  } catch {
    return [];
  }
}
