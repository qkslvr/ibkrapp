import axios, { AxiosInstance } from "axios";
import { IBKRAccountSummary, IBKRPosition } from "@/types";

class IBKRClient {
  private client: AxiosInstance;
  private accountId: string;
  private accountIdResolved: boolean = false;
  private lastReauthAttempt: number = 0;
  private readonly REAUTH_COOLDOWN_MS = 20_000;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.IBKR_GATEWAY_URL || "https://localhost:5000/v1/api",
      timeout: 5000,
      httpsAgent: new (require("https").Agent)({
        rejectUnauthorized: false, // IBKR uses self-signed certs
      }),
    });
    this.accountId = process.env.IBKR_ACCOUNT_ID || "";
  }

  // Auto-discover account ID from the gateway if not configured
  private async resolveAccountId(): Promise<string> {
    if (this.accountId && this.accountIdResolved) return this.accountId;
    if (this.accountId) {
      this.accountIdResolved = true;
      return this.accountId;
    }
    try {
      const response = await this.client.get("/portfolio/accounts");
      const accounts = response.data;
      if (Array.isArray(accounts) && accounts.length > 0) {
        this.accountId = accounts[0].accountId || accounts[0].id;
        this.accountIdResolved = true;
        console.log(`[IBKR] Auto-discovered account ID: ${this.accountId}`);
      }
    } catch (error) {
      console.error("[IBKR] Failed to discover account ID:", error);
    }
    return this.accountId;
  }

  // Check authentication status. IBKR's SSO/2FA can succeed while the
  // separate brokerage (iserver) session never establishes behind it —
  // the gateway then just sits authenticated:false forever. Self-heal by
  // triggering reauthenticate when that happens, throttled so we don't
  // hammer IBKR on every 5s poll.
  async checkAuth(): Promise<boolean> {
    try {
      const status = await this.client.get("/iserver/auth/status");
      if (status.data.authenticated === true) return true;

      const now = Date.now();
      if (now - this.lastReauthAttempt < this.REAUTH_COOLDOWN_MS) return false;

      const sso = await this.client.get("/sso/validate");
      if (sso.data?.RESULT === true) {
        this.lastReauthAttempt = now;
        console.log("[IBKR] SSO valid but brokerage session not established — triggering reauthenticate");
        await this.client.post("/iserver/reauthenticate", "", {
          headers: { "Content-Length": "0" },
        });
      }
      return false;
    } catch {
      return false;
    }
  }

  // Parse the nested IBKR account summary format
  // IBKR returns: { "netliquidation": { "amount": 1234.56, ... }, ... }
  private parseAccountSummary(raw: Record<string, unknown>): IBKRAccountSummary {
    const getAmount = (key: string): number => {
      const entry = raw[key] as { amount?: number } | undefined;
      return entry?.amount ?? 0;
    };
    const accountId = (raw.accountcode as { value?: string })?.value ?? this.accountId;

    return {
      accountId,
      netLiquidation: getAmount("netliquidation"),
      totalCashValue: getAmount("totalcashvalue"),
      buyingPower: getAmount("buyingpower"),
      grossPositionValue: getAmount("grosspositionvalue"),
      maintMarginReq: getAmount("maintmarginreq"),
      excessLiquidity: getAmount("excessliquidity"),
      dailyPnl: getAmount("dailypnl"),
      unrealizedPnl: getAmount("unrealizedpnl"),
    };
  }

  // Get account summary
  async getAccountSummary(): Promise<IBKRAccountSummary | null> {
    try {
      const acctId = await this.resolveAccountId();
      if (!acctId) {
        console.error("[IBKR] No account ID available");
        return null;
      }
      const response = await this.client.get(
        `/portfolio/${acctId}/summary`
      );
      return this.parseAccountSummary(response.data);
    } catch (error) {
      console.error("Failed to fetch account summary:", error);
      return null;
    }
  }

  // Get all positions
  async getPositions(): Promise<IBKRPosition[]> {
    try {
      const acctId = await this.resolveAccountId();
      if (!acctId) {
        console.error("[IBKR] No account ID available");
        return [];
      }
      const response = await this.client.get(
        `/portfolio/${acctId}/positions/0`
      );
      return response.data || [];
    } catch (error) {
      console.error("Failed to fetch positions:", error);
      return [];
    }
  }

  // Get market data for a symbol
  async getMarketData(conid: number): Promise<Record<string, unknown> | null> {
    try {
      const response = await this.client.get(`/iserver/marketdata/snapshot`, {
        params: { conids: conid, fields: "31,84,86" },
      });
      return response.data[0] || null;
    } catch (error) {
      console.error("Failed to fetch market data:", error);
      return null;
    }
  }

  // Get historical data
  async getHistoricalData(
    conid: number,
    period: string = "1d",
    bar: string = "1min"
  ): Promise<unknown[]> {
    try {
      const response = await this.client.get("/iserver/marketdata/history", {
        params: { conid, period, bar },
      });
      return response.data?.data || [];
    } catch (error) {
      console.error("Failed to fetch historical data:", error);
      return [];
    }
  }

  // Search for contracts
  async searchContract(symbol: string): Promise<unknown[]> {
    try {
      const response = await this.client.get("/iserver/secdef/search", {
        params: { symbol },
      });
      return response.data || [];
    } catch (error) {
      console.error("Failed to search contract:", error);
      return [];
    }
  }

  // Get account trades/transactions
  async getTrades(days: number = 7): Promise<unknown[]> {
    try {
      const response = await this.client.get("/iserver/account/trades", {
        params: { days },
      });
      return response.data || [];
    } catch (error) {
      console.error("Failed to fetch trades:", error);
      return [];
    }
  }
}

export const ibkrClient = new IBKRClient();
