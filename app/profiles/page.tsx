import { ProfilesView } from "@/components/profiles-view";

export default async function Profiles({ searchParams }: { searchParams: Promise<{ advisor?: string; client?: string }> }) {
  const sp = await searchParams;
  return <ProfilesView advisor={sp.advisor} client={sp.client} />;
}
