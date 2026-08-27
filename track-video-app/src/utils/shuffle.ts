export function shuffled<T>(values: readonly T[]): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const replacementIndex = Math.floor(Math.random() * (index + 1))
    const currentValue = result[index]
    result[index] = result[replacementIndex]
    result[replacementIndex] = currentValue
  }

  return result
}
