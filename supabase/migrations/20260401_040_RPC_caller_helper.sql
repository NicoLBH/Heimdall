async function callRPC(supabase: any, name: string, params: any) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) return [];
  return data ?? [];
}
