declare module '@otplib/preset-browser' {
  export const authenticator: {
    generate(secret: string): string;
    check(token: string, secret: string): boolean;
    verify(opts: { token: string; secret: string }): boolean;
    keyuri(user: string, service: string, secret: string): string;
    generateSecret(): string;
    options: Record<string, unknown>;
  };
}
