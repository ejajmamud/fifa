import { getPlaylist } from "@/lib/playlist-server";
import { MatchesClientPage } from "./matches-client";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const channels = await getPlaylist();
  return <MatchesClientPage channels={channels} />;
}
