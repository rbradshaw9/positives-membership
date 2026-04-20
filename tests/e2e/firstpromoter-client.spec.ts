import { expect, test } from "@playwright/test";
import { ensureFpPromoter } from "@/lib/firstpromoter/client";

type MockRequest = {
  method: string;
  path: string;
  query: Record<string, string>;
  body: unknown;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test.describe("FirstPromoter client", () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.FIRSTPROMOTER_API_KEY;
  const originalAccountId = process.env.FIRSTPROMOTER_ACCOUNT_ID;

  test.beforeEach(() => {
    process.env.FIRSTPROMOTER_API_KEY = "test-fp-key";
    process.env.FIRSTPROMOTER_ACCOUNT_ID = "test-fp-account";
  });

  test.afterEach(() => {
    global.fetch = originalFetch;
    process.env.FIRSTPROMOTER_API_KEY = originalApiKey;
    process.env.FIRSTPROMOTER_ACCOUNT_ID = originalAccountId;
  });

  test("assigns a parent promoter when a referred member becomes an affiliate", async () => {
    const requests: MockRequest[] = [];

    global.fetch = (async (input, init) => {
      const url = new URL(typeof input === "string" ? input : input.url);
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : null;

      requests.push({
        method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams.entries()),
        body,
      });

      if (method === "GET" && url.pathname.endsWith("/company/promoter_campaigns")) {
        return jsonResponse([
          {
            id: 9001,
            campaign_id: 77,
            promoter_id: 0,
            campaign: { id: 77, name: "Positives Affiliate Program" },
          },
        ]);
      }

      if (
        method === "GET" &&
        url.pathname.endsWith("/company/promoters/child%40example.com") &&
        url.searchParams.get("find_by") === "email"
      ) {
        return jsonResponse({
          id: 101,
          email: "child@example.com",
          state: "accepted",
          created_at: "2026-04-20T00:00:00.000Z",
          promoter_campaigns: [
            {
              id: 5001,
              campaign_id: 77,
              promoter_id: 101,
              state: "accepted",
              ref_token: "child-ref",
              ref_link: "https://positives.life?fpr=child-ref",
            },
          ],
          parent_promoter: null,
        });
      }

      if (
        method === "GET" &&
        url.pathname.endsWith("/company/promoters/parent-ref") &&
        url.searchParams.get("find_by") === "ref_token"
      ) {
        return jsonResponse({
          id: 202,
          email: "parent@example.com",
          state: "accepted",
          created_at: "2026-04-20T00:00:00.000Z",
          promoter_campaigns: [
            {
              id: 5002,
              campaign_id: 77,
              promoter_id: 202,
              state: "accepted",
              ref_token: "parent-ref",
            },
          ],
          parent_promoter: null,
        });
      }

      if (method === "POST" && url.pathname.endsWith("/company/promoters/assign_parent")) {
        return jsonResponse({ ok: true });
      }

      if (method === "GET" && url.pathname.endsWith("/company/promoters/101")) {
        return jsonResponse({
          id: 101,
          email: "child@example.com",
          state: "accepted",
          created_at: "2026-04-20T00:00:00.000Z",
          promoter_campaigns: [
            {
              id: 5001,
              campaign_id: 77,
              promoter_id: 101,
              state: "accepted",
              ref_token: "child-ref",
              ref_link: "https://positives.life?fpr=child-ref",
            },
          ],
          parent_promoter: { id: 202, email: "parent@example.com" },
        });
      }

      return jsonResponse({ message: "Unexpected mock request" }, 500);
    }) as typeof fetch;

    const promoter = await ensureFpPromoter({
      email: "child@example.com",
      firstName: "Child",
      lastName: "Promoter",
      parentRefId: "parent-ref",
    });

    const assignParentRequest = requests.find((request) =>
      request.path.endsWith("/company/promoters/assign_parent")
    );

    expect(promoter.promoter?.id).toBe(202);
    expect(assignParentRequest).toMatchObject({
      method: "POST",
      body: {
        parent_promoter_id: 202,
        ids: [101],
      },
    });
  });
});
