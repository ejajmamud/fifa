import { getPlaylist } from "@/lib/playlist-server";
import { EpgClientPage } from "./epg-client";

export const dynamic = "force-dynamic";

export default async function EpgPage() {
  const channels = await getPlaylist();
  return <EpgClientPage channels={channels} />;
}
