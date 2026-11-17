export async function safeApiPost<T = any>(url: string, payload: unknown): Promise<T> {
  const maxAttempts = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        await new Promise((resolve) => setTimeout(resolve, 900));
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      let jsonResult: any = null;

      if (rawText && rawText.trim()) {
        try {
          jsonResult = JSON.parse(rawText);
        } catch {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              jsonResult = JSON.parse(match[0]);
            } catch {
              jsonResult = null;
            }
          }
        }
      }

      if (!response.ok) {
        if (jsonResult && jsonResult.error) {
          const err = new Error(jsonResult.error) as Error & { nonRetryable?: boolean };
          if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
            err.nonRetryable = true;
          }
          throw err;
        }
        if (
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504 ||
          rawText.includes("The page c") ||
          rawText.includes("Starting Server") ||
          rawText.includes("warmup")
        ) {
          throw new Error("The server is briefly reconnecting. Retrying...");
        }
        if (response.status === 413) {
          const err = new Error("Audio file exceeds the 24 MB upload limit. Please trim or use a shorter clip.") as Error & { nonRetryable?: boolean };
          err.nonRetryable = true;
          throw err;
        }
        throw new Error(`Request failed (${response.status}).`);
      }

      if (!jsonResult) {
        throw new Error("Server returned an unreadable response format.");
      }

      return jsonResult as T;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (
        err?.nonRetryable ||
        lastError.message.includes("must be provided") ||
        lastError.message.includes("exceeds the") ||
        lastError.message.includes("Invalid transformation")
      ) {
        throw lastError;
      }
    }
  }

  let cleanMessage = lastError?.message || "Could not complete request. Please try again.";
  if (
    cleanMessage.includes("Unexpected token") ||
    cleanMessage.includes("The page c") ||
    cleanMessage.includes("is not valid JSON") ||
    cleanMessage.includes("warmup")
  ) {
    cleanMessage = "The server was briefly reconnecting. Please try again.";
  }

  throw new Error(cleanMessage);
}
