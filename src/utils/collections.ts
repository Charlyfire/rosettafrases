export const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

export const rotate = <T,>(items: T[], amount: number) => {
  if (items.length === 0) return items
  const offset = amount % items.length
  return [...items.slice(offset), ...items.slice(0, offset)]
}

export const uniqueById = <T extends { id: string }>(items: T[]) =>
  [...new Map(items.map((item) => [item.id, item])).values()]
