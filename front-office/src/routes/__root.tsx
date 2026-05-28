import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react"; // MỚI
import { supabase } from "@/integrations/supabase/client"; // MỚI
import { useStore } from "@/lib/store"; // MỚI

import appCss from "../styles.css?url";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Player } from "@/components/Player";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "melodise — Premium B2B Royalty Music" },
      { name: "description", content: "Nền tảng phân phối nhạc bản quyền B2B cao cấp — nơi mỗi giai điệu là một bức họa." },
      { name: "author", content: "melodise" },
      { property: "og:title", content: "melodise — Premium B2B Royalty Music" },
      { property: "og:description", content: "Nền tảng phân phối nhạc bản quyền B2B cao cấp — nơi mỗi giai điệu là một bức họa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "melodise — Premium B2B Royalty Music" },
      { name: "twitter:description", content: "Nền tảng phân phối nhạc bản quyền B2B cao cấp — nơi mỗi giai điệu là một bức họa." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f7a17fb0-2b35-4a2f-a226-2faca28fcd47/id-preview-e0c52e0e--be0b0930-8f17-44a2-aab1-2616bd9663d5.lovable.app-1778819148529.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f7a17fb0-2b35-4a2f-a226-2faca28fcd47/id-preview-e0c52e0e--be0b0930-8f17-44a2-aab1-2616bd9663d5.lovable.app-1778819148529.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const pathname = router.state.location.pathname;

  const user = useStore((s) => s.user);
  const setOrderTracks = useStore((s) => s.setOrderTracks);

  // =========================================================================
  // MỚI: Tự động chạy ẩn quét DB mỗi khi nhảy sang trang mới hoặc đăng nhập
  // =========================================================================
  useEffect(() => {
    async function syncGlobalStore() {
      if (!user) {
        if (setOrderTracks) setOrderTracks([], []);
        return;
      }
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        
        const { data: dbUser } = await (supabase as any).from("users").select("user_id").eq("auth_id", auth.user.id).single();
        if (!dbUser) return;

        // Lấy tất cả đơn hàng
        const { data: orders } = await (supabase as any).from("orders").select("order_id, status").eq("user_id", dbUser.user_id);
        if (!orders || orders.length === 0) {
          if (setOrderTracks) setOrderTracks([], []);
          return;
        }

        // Kéo chi tiết các bài hát trong đơn
        const orderIds = orders.map((o: any) => o.order_id);
        const { data: details } = await (supabase as any).from("order_details").select("track_id, order_id").in("order_id", orderIds);

        const owned: string[] = [];
        const pending: string[] = [];

        if (details) {
          details.forEach((d: any) => {
            const o = orders.find((x: any) => x.order_id === d.order_id);
            if (o?.status === "Đã duyệt") {
              owned.push(String(d.track_id));
            } else {
              pending.push(String(d.track_id));
            }
          });
        }
        
        // Đẩy 2 rổ dữ liệu lên Store tổng
        if (setOrderTracks) setOrderTracks(owned, pending);
      } catch (err) {
        console.error("Lỗi đồng bộ Global Store:", err);
      }
    }
    
    syncGlobalStore();
  }, [pathname, user, setOrderTracks]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 pb-32">
          <Outlet />
        </main>
        <Footer />
      </div>
      <Player />
      <Toaster 
        position="bottom-right" 
        toastOptions={{ 
          style: { 
            background: "rgba(28,40,65,0.95)", 
            border: "1px solid rgba(242,201,76,0.4)", 
            color: "#FDFBF7", 
            borderRadius: "16px" 
          },
          classNames: {
            description: "text-mist opacity-90",
          },
        }} 
      />
    </QueryClientProvider>
  );
}