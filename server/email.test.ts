import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Resend SDK so we don't send real emails during tests
vi.mock("resend", () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi.fn().mockResolvedValue({ data: { id: "test-email-id" }, error: null }),
      },
    })),
  };
});

describe("Email helper", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "noreply@dalgest.sbs";
  });

  it("sendEmail should call Resend with correct parameters", async () => {
    const { sendEmail } = await import("./_core/email");
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test Subject",
      html: "<p>Test</p>",
    });
    expect(result).toBe(true);
  });

  it("sendPasswordResetEmail should send email with reset URL", async () => {
    const { sendPasswordResetEmail } = await import("./_core/email");
    const result = await sendPasswordResetEmail(
      "user@example.com",
      "João Silva",
      "https://dalgest.sbs/reset-password?token=abc123"
    );
    expect(result).toBe(true);
  });

  it("sendEmail should throw when Resend returns an error", async () => {
    // Re-mock Resend to simulate an error response
    const { Resend } = await import("resend");
    const ResendMock = Resend as unknown as ReturnType<typeof vi.fn>;
    const sendMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Invalid API key", name: "validation_error" },
    });
    ResendMock.mockImplementation(() => ({ emails: { send: sendMock } }));

    // Force re-import with the new mock
    vi.resetModules();
    const { sendEmail } = await import("./_core/email");
    await expect(
      sendEmail({ to: "test@example.com", subject: "Test", html: "<p>Test</p>" })
    ).rejects.toThrow("Email send failed");
  });
});
