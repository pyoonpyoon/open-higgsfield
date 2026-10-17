import { describe, expect, it } from "vitest";
import { JOB_ID, OUTPUT_ID } from "./guard";

describe("id validation", () => {
  it("accepts comfy-api-proxy output tokens (long, dotted, base64url)", () => {
    // Shape of a real token returned by comfy-api-proxy 0.1.6.
    const token = "eyJqIjogImNmNGEwNmQ0LTBkZmItNGRjNS05OWMwLTMwZmU2ZjY1Nzg1NyIsICJmIjogImFuZ2xlXzAwMDAxXy5wbmciLCAicyI6ICJvcGVuaGlnZ3MiLCAidCI6ICJvdXRwdXQifQ.WyGN2djYTZnqjujhwOnnD5f4qhbrt39DQpDdegWjVS4";
    expect(token.length).toBeGreaterThan(128);
    expect(OUTPUT_ID.test(token)).toBe(true);
  });

  it("rejects path tricks in ids", () => {
    for (const bad of ["../etc/passwd", "a/b", "a b", "", "x?y=1"]) {
      expect(JOB_ID.test(bad)).toBe(false);
      expect(OUTPUT_ID.test(bad)).toBe(false);
    }
  });
});

describe("publicUrl", () => {
  it("redirects only to public hosts", async () => {
    const { publicUrl } = await import("./guard");
    expect(publicUrl("https://storage.googleapis.com/x?sig=1")).toBe(true);
    for (const local of ["http://127.0.0.1:8189/api/v2/assets/x/content", "http://localhost:8188/view", "http://192.168.1.5/x", "http://10.0.0.2/x", "http://172.20.1.1/x", "http://[::1]:8189/x", "http://studio.local/x", "file:///etc/passwd", "not a url"]) {
      expect(publicUrl(local), local).toBe(false);
    }
  });
});
