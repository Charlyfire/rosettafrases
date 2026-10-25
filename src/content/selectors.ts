import type { Pictogram } from '../domain/content'

export const selectInitialSoundPictograms = (
  pictograms: Pictogram[],
  sound: string,
  unit: number,
) =>
  pictograms.filter(
    (item) => item.initialSound === sound && item.availableFromUnit <= unit,
  )
