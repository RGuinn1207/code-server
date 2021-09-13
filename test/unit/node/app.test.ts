import { logger } from "@coder/logger"
import * as http from "http"
import { createApp, ensureAddress } from "../../../src/node/app"
import { setDefaults } from "../../../src/node/cli"
import { getAvailablePort } from "../../utils/helpers"

describe("createApp", () => {
  let spy: jest.SpyInstance

  beforeEach(() => {
    spy = jest.spyOn(logger, "error")
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })

  // TODO@jsjoeio refactor to use beforeEach and afterEach
  it("should return an Express app, a WebSockets Express app and an http server", async () => {
    const port = await getAvailablePort()
    const defaultArgs = await setDefaults({
      port,
      _: [],
    })
    const [app, wsApp, server] = await createApp(defaultArgs)

    // This doesn't check much, but it's a good sanity check
    // to ensure we actually get back values from createApp
    expect(app).not.toBeNull()
    expect(wsApp).not.toBeNull()
    expect(server).toBeInstanceOf(http.Server)

    // Cleanup
    server.close()
  })

  it("should handle error events on the server", async () => {
    const port = await getAvailablePort()
    const defaultArgs = await setDefaults({
      port,
      _: [],
    })

    // This looks funky, but that's because createApp
    // returns an array like [app, wsApp, server]
    // We only need server which is at index 2
    // we do it this way so ESLint is happy that we're
    // have no declared variables not being used
    const app = await createApp(defaultArgs)
    const server = app[2]

    const testError = new Error("Test error")
    // Emitting error events on servers
    // https://stackoverflow.com/a/33872506/3015595
    server.emit("error", testError)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(`http server error: ${testError.message} ${testError.stack}`)

    // Cleanup
    server.close()
  })
})

describe("ensureAddress", () => {
  let mockServer: http.Server

  beforeEach(() => {
    mockServer = http.createServer()
  })

  afterEach(() => {
    mockServer.close()
  })

  it("should throw and error if no address", () => {
    expect(() => ensureAddress(mockServer)).toThrow("server has no address")
  })
  it("should return the address if it exists and not a string", async () => {
    const port = await getAvailablePort()
    mockServer.listen(port)
    const address = ensureAddress(mockServer)
    expect(address).toBe(`http://:::${port}`)
  })
  it("should return the address if it exists", async () => {
    mockServer.address = () => "http://localhost:8080"
    const address = ensureAddress(mockServer)
    expect(address).toBe(`http://localhost:8080`)
  })
})
