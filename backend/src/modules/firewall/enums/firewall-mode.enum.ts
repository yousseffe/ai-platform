/**
 * Whether a {@link FirewallPolicy} only reports violations (MONITOR) or
 * actively rejects the offending request (ENFORCE).
 */
export enum FirewallMode {
  MONITOR = 'MONITOR',
  ENFORCE = 'ENFORCE',
}
