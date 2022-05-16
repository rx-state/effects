"use strict"

if (process.env.NODE_ENV === "production") {
  module.exports = require("./rx-state.effects.cjs.production.min.js")
} else {
  module.exports = require("./rx-state.effects.cjs.development.js")
}
