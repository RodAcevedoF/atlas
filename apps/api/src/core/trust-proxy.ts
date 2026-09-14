export function trustIngressProxy(address: string, hop: number): boolean {
  const proxy = process.env.TRUSTED_PROXY_IP;
  if (!proxy || hop !== 0) return false;
  return address === proxy || address === `::ffff:${proxy}`;
}
