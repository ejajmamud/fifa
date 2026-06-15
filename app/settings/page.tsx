import { getPlaylist } from "@/lib/playlist-server";
import { SettingsClientPage } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const channels = await getPlaylist();
  return <SettingsClientPage channels={channels} />;
}
