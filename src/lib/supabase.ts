/**
 * Stub do antigo cliente Supabase.
 * O sistema agora usa o backend próprio (src/lib/api.ts) e Prisma no servidor.
 * Este arquivo existe apenas para evitar quebrar imports legados;
 * todas as funções de acesso a dados foram reescritas em supabase-functions.ts
 * usando o cliente `api`.
 */

function notSupported(op: string): never {
  throw new Error(
    `Operação Supabase "${op}" não suportada. O sistema migrou para backend próprio. Use src/lib/api.ts.`
  );
}

const stubBuilder: any = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === "then") return undefined;
      return () => stubBuilder;
    },
    apply() {
      return Promise.resolve({ data: null, error: { message: "Supabase desativado" } });
    },
  }
);

export const supabase: any = {
  from: () => stubBuilder,
  rpc: () => stubBuilder,
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: () => notSupported("auth.signInWithPassword"),
    signOut: async () => ({ error: null }),
    updateUser: () => notSupported("auth.updateUser"),
    resetPasswordForEmail: () => notSupported("auth.resetPasswordForEmail"),
  },
  storage: {
    from: () => ({
      upload: () => notSupported("storage.upload"),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
  functions: {
    invoke: () => notSupported("functions.invoke"),
  },
};

export const supabaseAdmin: any = null;
