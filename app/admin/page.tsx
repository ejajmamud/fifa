import { getPlaylist } from "@/lib/playlist-server";
import { AdminClientPage } from "./admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const channels = await getPlaylist();
  return <AdminClientPage initialChannels={channels} />;
}
