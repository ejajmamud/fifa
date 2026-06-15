import { getPlaylist } from "@/lib/playlist-server";
import { NewsClientPage } from "./news-client";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const channels = await getPlaylist();
  return <NewsClientPage channels={channels} />;
}
