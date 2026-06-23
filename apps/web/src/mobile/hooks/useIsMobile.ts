import * as React from "react";

const MOBILE_QUERY = "(max-width: 767px)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  React.useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
