/**
 * The one team a news story is about, for every surface that colours it.
 *
 * An explicit team wins. Otherwise a story is a team's only when every driver
 * it names drives for that team: "Mercedes may back Russell" names RUS and
 * ANT, both Mercedes. A story naming drivers from two teams belongs to
 * neither, and one naming nobody (tyres, the venue) has no team at all.
 *
 * One rule, shared, rather than one per page: the write-up used to colour a
 * card by its first driver while the landing page used this rule, so the same
 * tyre story was McLaren orange on one and neutral on the other.
 */
export function newsTeam(
  explicitTeam: string | null | undefined,
  drivers: readonly { team: string | null | undefined }[] | null | undefined,
): string | null {
  if (explicitTeam) {
    return explicitTeam;
  }
  const named = new Set((drivers ?? []).map((driver) => driver.team ?? null));
  const [only] = named;
  return named.size === 1 && only ? only : null;
}
