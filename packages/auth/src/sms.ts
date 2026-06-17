type SmsProvider = "console" | "http";

interface SmsConfig {
  apiKey?: string;
  apiUrl?: string;
  provider: SmsProvider;
  senderId?: string;
}

let smsConfig: SmsConfig = {
  provider: "console",
};

export function configureSms(config: SmsConfig): void {
  smsConfig = config;
}

export async function sendSms(phone: string, code: string): Promise<void> {
  switch (smsConfig.provider) {
    case "console": {
      console.log(`[DEV] OTP for ${phone}: ${code}`);
      return;
    }

    case "http": {
      if (!(smsConfig.apiUrl && smsConfig.apiKey)) {
        throw new Error(
          "SMS_API_URL and SMS_API_KEY are required for HTTP SMS provider"
        );
      }

      const response = await fetch(smsConfig.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${smsConfig.apiKey}`,
        },
        body: JSON.stringify({
          to: phone,
          message: `Your verification code is: ${code}`,
          sender_id: smsConfig.senderId,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `SMS provider returned ${response.status}: ${await response.text()}`
        );
      }

      return;
    }

    default: {
      throw new Error(`Unknown SMS provider: ${smsConfig.provider}`);
    }
  }
}
