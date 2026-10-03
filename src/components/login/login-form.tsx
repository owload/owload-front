import { useState, FormEvent } from "react";
import { useLogin } from "@/auth-context-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const login = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid username or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary">
      <div className="w-full max-w-sm px-6">
        <img src="/logo-full.svg" alt="Owload" className="h-11 mx-auto block mb-10" />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="text"
            placeholder="Username or email"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            required
            className="bg-transparent border-black/25 placeholder:text-black/40 text-gray-900 h-10"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="bg-transparent border-black/25 placeholder:text-black/40 text-gray-900 h-10"
          />

          {error && (
            <p className="text-sm text-red-700 text-center">{error}</p>
          )}

          <Button type="submit" variant="black" disabled={loading} className="mt-1 w-full h-10">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
