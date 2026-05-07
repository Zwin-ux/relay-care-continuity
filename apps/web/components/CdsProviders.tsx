"use client";

import { useState } from "react";
import { MediaQueryProvider, ThemeProvider } from "@coinbase/cds-web/system";
import { defaultTheme } from "@coinbase/cds-web/themes/defaultTheme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function CdsProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <MediaQueryProvider>
        <ThemeProvider theme={defaultTheme} activeColorScheme="light">
          {children}
        </ThemeProvider>
      </MediaQueryProvider>
    </QueryClientProvider>
  );
}
