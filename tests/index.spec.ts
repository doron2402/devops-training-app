import pkg from '../package.json'

describe('package.json', () => {
  describe('verify version', () => {
    it('should verify version', () => {
      expect(pkg.version).toEqual('1.0.0')
    })
  })
})
