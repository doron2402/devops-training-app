export class RedisMock {
  private cache = {} as { [key: string]: string }
  get(key: string) {
    return this.cache[key]
  }
  set(key: string, val: string, expires: string, expiry: number) {
    this.cache[key] = val
    return val
  }
}
